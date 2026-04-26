from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

# Fields that the client must NEVER set — stripped silently before validation
_AI_FIELDS = {
    "isco_code", "isco_title", "skill_tags", "portability_score",
    "automation_risk_score", "resilience_skills", "photo_descriptions",
    "esco_occupation_uri", "matched_onet_tasks", "retrieval_confidence",
    "displacement_timeline", "needs_review", "profile_completeness_score",
    "photo_paths", "data_collection_date",
}


class ProfileIn(BaseModel):
    name:              Optional[str] = None
    age:               Optional[int] = Field(None, ge=10, le=99)
    location_city:     Optional[str] = None
    country_code:      Optional[str] = None
    consent_given:     bool
    skill_description: Optional[str] = Field(None, max_length=500)
    duration_years:    Optional[float] = Field(None, ge=0.5, le=30)
    frequency:         Optional[str] = Field(None, pattern=r"^(daily|weekly|occasionally)$")
    tools_used:        Optional[List[str]] = []
    task_log:          Optional[str] = None
    income_range:      Optional[str] = Field(None, pattern=r"^(under_50|50_200|200_500|above_500)$")
    certifications:    Optional[List[str]] = []
    languages:         Optional[List[dict]] = []

    @model_validator(mode="before")
    @classmethod
    def strip_ai_fields(cls, values):
        if isinstance(values, dict):
            for field in _AI_FIELDS:
                values.pop(field, None)
        return values


class ProfileOut(BaseModel):
    id:                         int
    owner_user_id:              Optional[int] = None
    name:                       Optional[str]
    age:                        Optional[int]
    location_city:              Optional[str]
    country_code:               Optional[str]
    consent_given:              bool
    data_collection_date:       datetime
    needs_review:               bool
    review_notes:               Optional[str] = None
    # Skills input
    skill_description:          Optional[str]
    duration_years:             Optional[float]
    frequency:                  Optional[str]
    tools_used:                 List[str]
    task_log:                   Optional[str]
    income_range:               Optional[str]
    certifications:             List[str]
    languages:                  List[dict]
    profile_completeness_score: Optional[float]
    # Photos
    photo_paths:                List[str]
    photo_descriptions:         List[str]
    # Stage 1 — LLM extraction
    skill_tags:                 List[str]
    # Stage 2 — Retrieval
    esco_occupation_uri:        Optional[str]
    matched_onet_tasks:         List[dict]
    retrieval_confidence:       Optional[float]
    # Stage 3 — Data layer
    isco_code:                  Optional[str]
    isco_title:                 Optional[str]
    automation_risk_score:      Optional[float]
    portability_score:          Optional[int]
    # Stage 4 — LLM reasoning
    resilience_skills:          List[str]
    displacement_timeline:      Optional[str]

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str
    password: str
    is_admin: bool = False


class ReviewIn(BaseModel):
    """Optional body for PATCH /profiles/{id}/review.

    `reviewed=True` (default) clears the needs_review flag; pass False to
    re-flag a profile. `review_notes` is persisted alongside the profile.
    """
    reviewed:     bool = True
    review_notes: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type:   str = "bearer"
