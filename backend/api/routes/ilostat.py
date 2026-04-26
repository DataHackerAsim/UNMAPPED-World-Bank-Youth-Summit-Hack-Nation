"""
ILOSTAT Router — exposes ILOSTAT live API helpers as HTTP endpoints.

Underlying service: services.ilostat_service
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from core.security import get_current_user
from services import ilostat_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ilostat", tags=["ilostat"])


@router.get("/employment")
async def employment_by_occupation(
    request: Request,
    isco_code: str,
    country_code: str,
    user=Depends(get_current_user),
):
    """
    Return ILOSTAT employment data for a (country, ISCO-08 4-digit) pair.

    The underlying SDMX dataset reports total employment in **thousands of
    workers** for a 2-digit ISCO group, not a percentage share. The response
    surfaces the raw count plus the 2-digit ISCO group it was derived from
    so the frontend can render it honestly.

    Returns:
      {
        "isco_code":            <input>,
        "country_code":         <input>,
        "employment_thousands": float | null,
        "isco_2digit":          str | null,
        "country":              str | null   # ISO alpha-3 used in the query
      }
    """
    if not isco_code or not country_code:
        raise HTTPException(422, detail="isco_code and country_code are required")

    result = await ilostat_service.get_employment_by_occupation(isco_code, country_code)
    if result is None:
        return {
            "isco_code":            isco_code,
            "country_code":         country_code,
            "employment_thousands": None,
            "isco_2digit":          None,
            "country":              None,
        }

    return {
        "isco_code":            isco_code,
        "country_code":         country_code,
        "employment_thousands": result.get("employment_thousands"),
        "isco_2digit":          result.get("isco_2digit"),
        "country":              result.get("country"),
    }
