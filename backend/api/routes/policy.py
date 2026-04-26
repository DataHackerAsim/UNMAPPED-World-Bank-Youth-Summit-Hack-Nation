"""
Policy Dashboard Router — Module 3

Aggregates stored WorkerProfile data by country for policymaker analytics.
Returns real profile counts, skills distribution, sector gaps, and
average automation risk from the database.
"""

import logging
from collections import Counter

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.worker_profile import WorkerProfile

logger = logging.getLogger(__name__)

router = APIRouter(tags=["policy"])


@router.get("/policy/{country_code}")
async def get_policy_data(
    request: Request,
    country_code: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Aggregate profile analytics for policymakers.

    Returns: total profiles, top at-risk occupation, biggest skills gap,
    average automation risk, skills distribution, and sector supply/demand.
    """
    # Query all profiles for this country
    profiles = db.query(WorkerProfile).filter(
        WorkerProfile.country_code == country_code
    ).all()

    total = len(profiles)

    if total == 0:
        return {
            "total_profiles": 0,
            "top_at_risk_occupation": "No data yet",
            "biggest_skills_gap": "No data yet",
            "avg_automation_risk_pct": 0,
            "skills_distribution": [],
            "sector_gap": [],
        }

    # ── Average automation risk ───────────────────────────────────
    risk_scores = [p.automation_risk_score for p in profiles if p.automation_risk_score is not None]
    avg_risk = round(sum(risk_scores) / len(risk_scores) * 100) if risk_scores else 0

    # ── Top at-risk occupation ────────────────────────────────────
    # Find the occupation with highest automation risk
    highest_risk_profile = max(
        (p for p in profiles if p.automation_risk_score is not None),
        key=lambda p: p.automation_risk_score,
        default=None,
    )
    top_at_risk = (
        f"{highest_risk_profile.isco_title} (ISCO {highest_risk_profile.isco_code})"
        if highest_risk_profile and highest_risk_profile.isco_title
        else "Pending classification"
    )

    # ── Education/certification distribution ──────────────────────
    education_counter = Counter()
    for p in profiles:
        certs = p.certifications or []
        if certs:
            for cert in certs:
                level = cert.replace("_", " ").title()
                education_counter[level] += 1
        else:
            education_counter["No formal edu."] += 1

    # Ensure common levels appear even if zero
    for level in ["No formal edu.", "Primary", "Secondary", "Vocational", "Tertiary"]:
        if level not in education_counter:
            education_counter[level] = 0

    skills_distribution = [
        {"level": level, "count": count}
        for level, count in education_counter.most_common()
    ]

    # ── Sector supply/demand gap ──────────────────────────────────
    # Supply = number of profiles listing each sector in tools_used
    sector_counter = Counter()
    for p in profiles:
        tools = p.tools_used or []
        for tool in tools:
            sector_counter[tool] += 1

    # Demand estimates based on ILO employment projections (relative)
    _DEMAND_BASE = {
        "ICT Services": 340, "ICT & Electronics": 340, "ICT & Mobile": 340,
        "Construction": 280, "Agriculture": 190, "Agriculture & Fishing": 190,
        "Trade & Retail": 220, "Manufacturing": 160,
        "Garment & Textile": 200, "Finance": 150,
        "Education & Training": 180,
    }

    # Scale demand proportionally to profile count
    scale_factor = max(1, total / 10)
    sector_gap = []
    all_sectors = set(list(sector_counter.keys()) + list(_DEMAND_BASE.keys()))
    for sector in sorted(all_sectors):
        supply = sector_counter.get(sector, 0)
        base_demand = _DEMAND_BASE.get(sector, 100)
        demand = round(base_demand * scale_factor / 10)
        sector_gap.append({
            "sector": sector,
            "demand": max(demand, 1),
            "supply": supply,
        })

    # Sort by gap size (demand - supply, descending)
    sector_gap.sort(key=lambda s: s["demand"] - s["supply"], reverse=True)

    # Biggest skills gap = sector with largest demand-supply mismatch
    biggest_gap = sector_gap[0]["sector"] if sector_gap else "Unknown"

    return {
        "total_profiles": total,
        "top_at_risk_occupation": top_at_risk,
        "biggest_skills_gap": biggest_gap,
        "avg_automation_risk_pct": avg_risk,
        "skills_distribution": skills_distribution[:6],
        "sector_gap": sector_gap[:6],
    }
