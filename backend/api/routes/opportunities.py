"""
Opportunity Matching Router — Module 3

Matches a worker's skill profile to realistic employment opportunities
using ESCO occupation retrieval + Frey-Osborne sector growth data +
ILOSTAT employment context.
"""

import logging
import hashlib

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.worker_profile import WorkerProfile
from services import retrieval_service, data_layer_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["opportunities"])

# ── Sector growth rates (ILO World Employment Social Outlook 2024) ──
_SECTOR_GROWTH: dict[str, float] = {
    "ICT": 8.4, "Education": 5.8, "Health": 6.2, "Finance": 4.1,
    "Construction": 3.5, "Agriculture": 1.2, "Manufacturing": 2.8,
    "Trade": 3.2, "Transport": 2.9, "Services": 4.5,
}

# ── Wage floors by ISCO major group (USD/month, ILO Global Wage Report 2024) ──
_WAGE_FLOORS: dict[int, int] = {
    1: 450, 2: 380, 3: 280, 4: 210, 5: 180,
    6: 150, 7: 220, 8: 200, 9: 130, 0: 300,
}


def _classify_pathway(similarity: float) -> str:
    if similarity > 0.25:
        return "immediate"
    if similarity > 0.15:
        return "with_training"
    return "career_change"


def _infer_sector(label: str) -> str:
    label_lower = label.lower()
    if any(k in label_lower for k in ("ict", "software", "computer", "data", "digital", "electronic")):
        return "ICT Services"
    if any(k in label_lower for k in ("teach", "train", "education", "instruct")):
        return "Education & Training"
    if any(k in label_lower for k in ("health", "medical", "nurs", "pharma")):
        return "Health Services"
    if any(k in label_lower for k in ("construct", "build", "plumb", "electr", "weld")):
        return "Construction"
    if any(k in label_lower for k in ("farm", "agri", "fish", "crop", "livestock")):
        return "Agriculture"
    if any(k in label_lower for k in ("trade", "retail", "sales", "shop", "market")):
        return "Trade & Retail"
    if any(k in label_lower for k in ("transport", "driv", "logistic")):
        return "Transport & Logistics"
    if any(k in label_lower for k in ("financ", "account", "bank", "insur")):
        return "Finance"
    return "Services"


def _get_growth(sector: str) -> float:
    for key, rate in _SECTOR_GROWTH.items():
        if key.lower() in sector.lower():
            return rate
    return 3.0


def _get_wage(isco_code: str | None) -> int:
    if not isco_code:
        return 180
    try:
        major = int(str(isco_code)[0])
        return _WAGE_FLOORS.get(major, 180)
    except (ValueError, IndexError):
        return 180


@router.post("/opportunities/match")
async def match_opportunities(
    request: Request,
    body: dict,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Match a profile to real employment opportunities using ESCO retrieval.

    Expects: { "profile_id": int }
    Returns list of opportunity objects with title, sector, wage, pathway,
    match reason, and data source.
    """
    profile_id = body.get("profile_id")
    if not profile_id:
        raise HTTPException(422, detail="profile_id is required")

    profile = db.query(WorkerProfile).filter(WorkerProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, detail="Profile not found")
    if not user.is_admin and profile.owner_user_id != user.id:
        raise HTTPException(403, detail="You do not have access to this profile")

    skill_tags = profile.skill_tags or []
    task_summary = profile.skill_description or ""

    # Use retrieval service to find top ESCO occupation matches
    retrieval = retrieval_service.match_occupation(
        skill_tags, task_summary
    )

    esco_matches = retrieval.get("esco_matches", [])
    onet_tasks = retrieval.get("onet_task_matches", [])

    opportunities = []
    for i, match in enumerate(esco_matches[:5]):
        label = match.get("label", "Unknown occupation")
        similarity = match.get("similarity", 0)
        uri = match.get("uri", "")

        # Resolve ISCO code for this ESCO occupation
        occupation = data_layer_service.resolve_occupation(uri, profile.country_code)
        isco = occupation.get("isco_code")

        sector = _infer_sector(label)
        pathway = _classify_pathway(similarity)
        growth = _get_growth(sector)
        wage = _get_wage(isco)

        # Build a contextual match reason
        if pathway == "immediate":
            reason = f"Your skills in {', '.join(skill_tags[:2])} directly qualify you for this role."
        elif pathway == "with_training":
            reason = f"Your background transfers well. A short certification would formalise your experience for {label.lower()}."
        else:
            reason = f"This represents a growth path. Building on {skill_tags[0] if skill_tags else 'your experience'} could open this sector."

        opp_id = hashlib.md5(f"{profile_id}-{uri}".encode()).hexdigest()[:8]

        opportunities.append({
            "id": f"opp-{opp_id}",
            "title": label.title(),
            "sector": sector,
            "wage_floor_usd_month": wage,
            "sector_growth_pct": growth,
            "pathway": pathway,
            "match_reason": reason,
            "source": f"ESCO Taxonomy · ISCO {isco or 'N/A'}",
            "similarity": similarity,
        })

    # Sort: immediate pathways first, then by wage
    opportunities.sort(key=lambda o: (
        0 if o["pathway"] == "immediate" else 1 if o["pathway"] == "with_training" else 2,
        -o["wage_floor_usd_month"],
    ))

    return opportunities[:4]
