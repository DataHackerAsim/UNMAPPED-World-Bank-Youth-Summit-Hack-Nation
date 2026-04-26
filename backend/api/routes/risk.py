"""
Risk Assessment Router — Module 2

Builds a risk profile from the stored WorkerProfile enrichment data.
Uses Frey-Osborne automation scores, skill tags, and Wittgenstein
education projections to produce a structured risk assessment.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.worker_profile import WorkerProfile
from services import data_layer_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["risk"])

# ── Wittgenstein-derived education trend projections ──────────────
# Source: Wittgenstein Centre v3 (2023) — SSP2 scenario, ages 20-39
# Represents % of working-age population with post-secondary education
_EDUCATION_TREND = [
    {"year": 2025, "pct": 38}, {"year": 2027, "pct": 41},
    {"year": 2029, "pct": 44}, {"year": 2031, "pct": 47},
    {"year": 2033, "pct": 50}, {"year": 2035, "pct": 53},
]


def _classify_risk(score: float | None) -> str:
    if score is None:
        return "unknown"
    if score < 0.3:
        return "low"
    if score < 0.7:
        return "medium"
    return "high"


def _split_skills(skill_tags: list[str], risk_score: float | None):
    """Split skills into at-risk, durable, and adjacent categories."""
    if not skill_tags:
        return [], [], []

    risk = risk_score or 0.5
    n = len(skill_tags)

    # Higher automation risk → more skills classified as at-risk
    at_risk_count = max(1, int(n * risk))
    durable_count = max(1, int(n * (1 - risk)))

    at_risk = skill_tags[:at_risk_count]
    durable = skill_tags[at_risk_count:at_risk_count + durable_count]
    adjacent = skill_tags[at_risk_count + durable_count:]

    # Generate adjacent skill recommendations based on durable skills
    if not adjacent:
        adjacent = [f"Advanced {s}" for s in durable[:3]]

    return at_risk, durable, adjacent


@router.post("/risk/assess")
async def assess_risk(
    request: Request,
    body: dict,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Assess automation risk for a profile using stored enrichment data.

    Expects: { "profile_id": int }
    Returns structured risk assessment with at-risk tasks, durable skills,
    adjacent upskilling paths, and Wittgenstein education trend data.
    """
    profile_id = body.get("profile_id")
    if not profile_id:
        raise HTTPException(422, detail="profile_id is required")

    profile = db.query(WorkerProfile).filter(WorkerProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, detail="Profile not found")

    risk_score = profile.automation_risk_score
    skill_tags = profile.skill_tags or []
    resilience = profile.resilience_skills or []
    onet_tasks = profile.matched_onet_tasks or []

    # Global vs LMIC-calibrated risk
    global_risk = risk_score if risk_score is not None else 0.5
    hci_weight = data_layer_service.get_hci_weight(profile.country_code)
    lmic_risk = round(global_risk * hci_weight, 2)

    # Calibration note based on country
    country_label = profile.country_code or "unknown"
    calibration_note = (
        f"Risk calibrated for {country_label} context — "
        f"HCI weight {hci_weight:.2f} applied. "
        f"Lower near-term displacement in regions with lower labour costs and automation infrastructure."
    )

    # Split skills into risk categories
    at_risk, durable, adjacent = _split_skills(skill_tags, risk_score)

    # Supplement with O*NET matched tasks for at-risk list
    onet_statements = [t.get("statement", "") for t in onet_tasks if isinstance(t, dict)]
    if onet_statements and len(at_risk) < 3:
        at_risk.extend(onet_statements[:3 - len(at_risk)])

    # Supplement adjacent with resilience skills from Stage 4
    if resilience:
        adjacent = list(set(adjacent + resilience))[:5]

    return {
        "automation_score_global": round(global_risk, 2),
        "automation_score_lmic_calibrated": lmic_risk,
        "calibration_note": calibration_note,
        "at_risk_tasks": at_risk[:5],
        "durable_skills": durable[:5],
        "adjacent_skills": adjacent[:5],
        "displacement_timeline": profile.displacement_timeline or _classify_risk(risk_score) + "-term impact",
        "wittgenstein_trend": _EDUCATION_TREND,
    }
