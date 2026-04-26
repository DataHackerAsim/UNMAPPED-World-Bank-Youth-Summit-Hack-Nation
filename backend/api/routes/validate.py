"""
Validate Router — lightweight reference-data validation endpoints.

Wraps deterministic helpers in services.data_layer_service so the frontend
can sanity-check codes returned by the pipeline before displaying them.
"""

import logging

from fastapi import APIRouter, Depends, Request

from core.security import get_current_user
from services import data_layer_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/validate", tags=["validate"])


@router.get("/isco")
async def validate_isco(
    request: Request,
    code: str,
    user=Depends(get_current_user),
):
    """
    Return whether a given ISCO-08 4-digit code exists in the official
    classification loaded by data_layer_service.
    """
    return {"code": code, "valid": data_layer_service.validate_isco_code(code)}
