"""
Profiles Router

Houses the 4-stage hybrid pipeline:
  Stage 1: LLM extraction      (llm_service.extract_skills)
  Stage 2: Retrieval matching  (retrieval_service.match_occupation)
  Stage 3: Data joins          (data_layer_service.resolve_occupation)
  Stage 4: LLM reasoning       (llm_service.generate_reasoning)

"LLM understands and explains — data decides."
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.security import get_current_user, require_admin
from models.schemas import ProfileIn, ProfileOut
from models.worker_profile import WorkerProfile
from services import data_layer_service, ilostat_service, llm_service, retrieval_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profiles", tags=["profiles"])


# ── Helpers ───────────────────────────────────────────────────────

def _compute_completeness(profile: ProfileIn) -> float:
    score = 0.0
    if profile.skill_description and len(profile.skill_description) > 20:
        score += 0.35
    if profile.task_log and len(profile.task_log) > 10:
        score += 0.25
    if profile.duration_years:
        score += 0.15
    if profile.tools_used and len(profile.tools_used) > 0:
        score += 0.10
    if profile.income_range:
        score += 0.10
    if profile.frequency:
        score += 0.05
    return score


# ── Routes ────────────────────────────────────────────────────────

@router.post("", response_model=ProfileOut, status_code=201)
async def create_profile(
    request: Request,
    body: ProfileIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not body.consent_given:
        raise HTTPException(422, detail="consent_given must be true")

    completeness = _compute_completeness(body)
    if completeness < settings.min_completeness_score:
        raise HTTPException(
            422,
            detail={
                "message": "Profile too sparse",
                "min_score": settings.min_completeness_score,
                "current_score": completeness,
                "tip": "Add skill_description (>20 chars) and task_log to pass threshold",
            },
        )

    profile_text = " ".join(filter(None, [body.skill_description, body.task_log]))

    # ── Stage 1: LLM Extraction ───────────────────────────────────
    extraction = await llm_service.extract_skills(profile_text)
    skill_tags = extraction.get("skill_tags", [])
    task_summary = extraction.get("task_summary")
    portability_raw = extraction.get("portability_raw")

    # ── Stage 2: Retrieval ────────────────────────────────────────
    retrieval = retrieval_service.match_occupation(skill_tags, task_summary)
    confidence = retrieval.get("confidence", 0.0)
    best_match = retrieval.get("best_match")

    # Low-confidence gate → flag for admin review
    if confidence < settings.retrieval_confidence_threshold or best_match is None:
        logger.info(
            "Low retrieval confidence (%.4f < %.2f) — flagging for review",
            confidence, settings.retrieval_confidence_threshold,
        )
        db_profile = WorkerProfile(
            **body.model_dump(),
            profile_completeness_score=completeness,
            skill_tags=[],
            esco_occupation_uri=None,
            matched_onet_tasks=[],
            retrieval_confidence=confidence,
            isco_code=None,
            isco_title=None,
            automation_risk_score=None,
            portability_score=None,
            resilience_skills=[],
            displacement_timeline=None,
            needs_review=True,
        )
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)
        return db_profile

    # ── Stage 3: Data Joins ───────────────────────────────────────
    esco_uri = best_match["uri"]
    occupation = data_layer_service.resolve_occupation(esco_uri, body.country_code)
    isco_code = occupation.get("isco_code")
    isco_title = occupation.get("isco_title")
    automation_risk = occupation.get("automation_risk")

    # ILOSTAT fallback if Frey-Osborne has no match
    if automation_risk is None and isco_code:
        automation_risk = await ilostat_service.get_automation_risk(isco_code)

    portability = data_layer_service.compute_portability(
        portability_raw, body.country_code, body.duration_years
    )

    # ── Stage 4: LLM Reasoning ────────────────────────────────────
    reasoning = llm_service.REASONING_FALLBACK.copy()
    if isco_code:
        reasoning = await llm_service.generate_reasoning(
            isco_code=isco_code,
            isco_title=isco_title,
            automation_risk=automation_risk,
            skill_tags=skill_tags,
            country_code=body.country_code,
            skill_description=body.skill_description,
            task_log=body.task_log,
        )

    # ── Persist ───────────────────────────────────────────────────
    db_profile = WorkerProfile(
        **body.model_dump(),
        profile_completeness_score=completeness,
        skill_tags=skill_tags,
        esco_occupation_uri=esco_uri,
        matched_onet_tasks=retrieval.get("onet_task_matches", []),
        retrieval_confidence=confidence,
        isco_code=isco_code,
        isco_title=isco_title,
        automation_risk_score=automation_risk,
        portability_score=portability,
        resilience_skills=reasoning.get("resilience_skills", []),
        displacement_timeline=reasoning.get("displacement_timeline"),
        needs_review=(isco_code is None),
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


@router.get("", response_model=list[ProfileOut])
async def list_profiles(
    request: Request,
    country_code: Optional[str] = None,
    isco_code: Optional[str] = None,
    needs_review: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(WorkerProfile)
    if country_code:
        q = q.filter(WorkerProfile.country_code == country_code)
    if isco_code:
        q = q.filter(WorkerProfile.isco_code == isco_code)
    if needs_review is not None:
        q = q.filter(WorkerProfile.needs_review == needs_review)
    if date_from:
        q = q.filter(WorkerProfile.data_collection_date >= date_from)
    if date_to:
        q = q.filter(WorkerProfile.data_collection_date <= date_to)
    return q.offset(skip).limit(limit).all()


@router.get("/{profile_id}", response_model=ProfileOut)
async def get_profile(
    request: Request,
    profile_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    profile = db.query(WorkerProfile).filter(WorkerProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, detail="Profile not found")
    return profile


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    profile = db.query(WorkerProfile).filter(WorkerProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, detail="Profile not found")

    from services import photo_service
    photo_service.delete_photos(profile.photo_paths or [])

    db.delete(profile)
    db.commit()
    return None


@router.patch("/{profile_id}/review")
async def review_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    profile = db.query(WorkerProfile).filter(WorkerProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, detail="Profile not found")

    profile.needs_review = False
    db.commit()
    db.refresh(profile)
    return {"id": profile_id, "needs_review": False}
