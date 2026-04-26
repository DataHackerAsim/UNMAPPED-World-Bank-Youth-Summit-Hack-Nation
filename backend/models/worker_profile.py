from sqlalchemy import Boolean, Column, DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.sql import func

from core.database import Base


class WorkerProfile(Base):
    __tablename__ = "worker_profiles"

    # ── Core identity ─────────────────────────────────────────────
    id                          = Column(Integer, primary_key=True, index=True)
    name                        = Column(String, nullable=True)
    age                         = Column(Integer, nullable=True)
    location_city               = Column(String, nullable=True)
    country_code                = Column(String, nullable=True, index=True)
    consent_given               = Column(Boolean, default=False, nullable=False)
    data_collection_date        = Column(DateTime(timezone=True), server_default=func.now())
    needs_review                = Column(Boolean, default=False)

    # ── Skills input ──────────────────────────────────────────────
    skill_description           = Column(Text, nullable=True)
    duration_years              = Column(Float, nullable=True)
    frequency                   = Column(String, nullable=True)
    tools_used                  = Column(JSON, default=list)
    task_log                    = Column(Text, nullable=True)
    income_range                = Column(String, nullable=True)
    certifications              = Column(JSON, default=list)
    languages                   = Column(JSON, default=list)
    profile_completeness_score  = Column(Float, nullable=True)

    # ── Photos ────────────────────────────────────────────────────
    photo_paths                 = Column(JSON, default=list)
    photo_descriptions          = Column(JSON, default=list)

    # ── Stage 1: LLM extraction ───────────────────────────────────
    skill_tags                  = Column(JSON, default=list)

    # ── Stage 2: Retrieval ────────────────────────────────────────
    esco_occupation_uri         = Column(String, nullable=True)
    matched_onet_tasks          = Column(JSON, default=list)
    retrieval_confidence        = Column(Float, nullable=True)

    # ── Stage 3: Data layer ───────────────────────────────────────
    isco_code                   = Column(String, nullable=True, index=True)
    isco_title                  = Column(String, nullable=True)
    automation_risk_score       = Column(Float, nullable=True)
    portability_score           = Column(Integer, nullable=True)

    # ── Stage 4: LLM reasoning ────────────────────────────────────
    resilience_skills           = Column(JSON, default=list)
    displacement_timeline       = Column(String, nullable=True)
