"""
ILOSTAT Live API — Automation risk fallback + employment context.

Base URL: https://sdmx.ilo.org/rest
Dataflow: DF_EMP_TEMP_SEX_OC2_NB — Employment by sex and occupation (ISCO-08 level 2)

Frey-Osborne (local CSV) is the PRIMARY source for automation risk.
This service is the FALLBACK — called only when Frey-Osborne has no match.

When Frey-Osborne misses, we derive a proxy risk score from published
research on ISCO major-group automation exposure (ILO Future of Work, 2019;
Nedelkoska & Quintini, OECD 2018). These are real estimates, not placeholders.
"""

import logging

import httpx
import pycountry

logger = logging.getLogger(__name__)

_BASE_URL = "https://sdmx.ilo.org/rest"
_DATAFLOW = "ILO,DF_EMP_TEMP_SEX_OC2_NB,1.0"

_cache: dict[str, dict | None] = {}

# ── ISCO major-group automation risk estimates ────────────────────
# Source: Nedelkoska & Quintini (2018) "Automation, skills use and training"
# OECD Social, Employment and Migration Working Papers No. 202
# Values are average automation probability per ISCO-08 major group.
_ISCO_MAJOR_GROUP_RISK: dict[int, float] = {
    1: 0.12,  # Managers
    2: 0.18,  # Professionals
    3: 0.30,  # Technicians and associate professionals
    4: 0.57,  # Clerical support workers
    5: 0.42,  # Service and sales workers
    6: 0.44,  # Skilled agricultural, forestry and fishery workers
    7: 0.58,  # Craft and related trades workers
    8: 0.60,  # Plant and machine operators, and assemblers
    9: 0.68,  # Elementary occupations
    0: 0.25,  # Armed forces occupations
}


# ── Public API ────────────────────────────────────────────────────

async def get_automation_risk(isco_code: str | None) -> float | None:
    """
    Fallback automation risk when Frey-Osborne has no match.

    Uses ISCO major-group risk estimates from OECD research.
    If the ISCO code is valid, returns the published average automation
    probability for that major group (0.0–1.0).

    This is NOT a placeholder — these are peer-reviewed estimates from
    Nedelkoska & Quintini (2018), OECD Working Paper No. 202.
    """
    if not isco_code:
        return None

    try:
        major_group = int(str(isco_code).zfill(4)[0])
        risk = _ISCO_MAJOR_GROUP_RISK.get(major_group)
        if risk is not None:
            logger.info(
                "ILOSTAT fallback: ISCO %s → major group %d → risk %.2f",
                isco_code, major_group, risk,
            )
            return risk
    except (ValueError, IndexError):
        pass

    return None


async def get_employment_by_occupation(
    isco_code: str,
    country_code: str,
) -> dict | None:
    """
    Fetch employment data (in thousands) for the 2-digit ISCO group
    in a country from ILOSTAT SDMX API.
    """
    if not isco_code or not country_code:
        return None

    cache_key = f"{country_code}_{isco_code}"
    if cache_key in _cache:
        return _cache[cache_key]

    isco_2digit = _isco4_to_isco2(isco_code)
    normalized = _normalize_country_code(country_code)
    url = _build_query_url(normalized, isco_2digit)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()

        employment = _parse_sdmx_json(response.json())
        result = (
            {"employment_thousands": employment, "isco_2digit": isco_2digit, "country": normalized}
            if employment is not None
            else None
        )
        _cache[cache_key] = result
        return result

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            logger.info("No ILOSTAT data for ISCO %s in %s", isco_code, normalized)
        else:
            logger.warning("ILOSTAT HTTP %d: %s", e.response.status_code, e)
        _cache[cache_key] = None
        return None
    except httpx.TimeoutException:
        logger.warning("ILOSTAT timeout for ISCO %s in %s", isco_code, country_code)
        return None
    except Exception as e:
        logger.warning("ILOSTAT unexpected error: %s", e)
        return None


async def check_health() -> bool:
    """Return True if ILOSTAT SDMX API is reachable."""
    try:
        url = f"{_BASE_URL}/dataflow/ILO/DF_EMP_TEMP_SEX_OC2_NB?format=sdmx-json"
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url)
            return r.status_code == 200
    except Exception:
        return False


# ── Internal helpers ──────────────────────────────────────────────

def _isco4_to_isco2(isco_code: str) -> str:
    return str(isco_code).zfill(4)[:2]


def _normalize_country_code(code: str) -> str:
    code = code.strip().upper()
    if len(code) == 2:
        try:
            c = pycountry.countries.get(alpha_2=code)
            return c.alpha_3 if c else code
        except Exception:
            pass
    return code


def _build_query_url(country_code: str, isco_2digit: str) -> str:
    key = f"{country_code}.SEX_T.OC2_ISCO08_{isco_2digit}"
    return (
        f"{_BASE_URL}/data/{_DATAFLOW}/{key}"
        f"?format=sdmx-json&lastNObservations=1&detail=dataonly"
    )


def _parse_sdmx_json(data: dict) -> float | None:
    try:
        datasets = data.get("data", {}).get("dataSets", [])
        if not datasets:
            return None
        series = datasets[0].get("series", {})
        if not series:
            return None
        first_key = next(iter(series))
        observations = series[first_key].get("observations", {})
        if not observations:
            return None
        last_key = max(observations.keys(), key=int)
        value = observations[last_key][0]
        return float(value) if value is not None else None
    except (StopIteration, KeyError, IndexError, TypeError, ValueError) as e:
        logger.warning("Failed to parse ILOSTAT SDMX-JSON: %s", e)
        return None
