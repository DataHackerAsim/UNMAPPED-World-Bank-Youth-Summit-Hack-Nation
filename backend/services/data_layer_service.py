"""
Data Layer Service — Stage 3 (deterministic joins & lookups)

Loads reference CSVs on import. All lookups are O(1) dict access.
No LLM, no ML — pure data joins.

Join chain:
  ESCO occupation URI → iscoGroup → ISCO-08 code + title
  ISCO-08 code → SOC code(s) via crosswalk
  SOC code(s) → Frey-Osborne automation probability (averaged if one-to-many)
  country_code → HCI score → portability weight
"""

import logging
from pathlib import Path

import pandas as pd
import pycountry

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"

# ── Load reference data on import ────────────────────────────────

logger.info("Loading reference datasets into memory...")

# 1. ESCO occupations — maps conceptUri → iscoGroup
_esco_df = pd.read_csv(DATA_DIR / "esco_occupations.csv", encoding="utf-8")
ESCO_TO_ISCO_GROUP: dict[str, int] = dict(
    zip(_esco_df["conceptUri"], _esco_df["iscoGroup"].astype(int))
)
ESCO_LABELS: dict[str, str] = dict(
    zip(_esco_df["conceptUri"], _esco_df["preferredLabel"])
)

# 2. ISCO-08 classification — maps unit code → {code, title, major, ...}
_isco_df = pd.read_csv(DATA_DIR / "isco08_classification.csv", encoding="latin-1")
_isco_numeric = _isco_df[_isco_df["unit"].astype(str).str.match(r"^\d{4}$")].copy()
ISCO_LOOKUP: dict[int, dict] = {
    int(row["unit"]): {
        "code": str(int(row["unit"])),
        "title": str(row["description"]),
        "major": int(row["major"]),
        "major_label": str(row["major_label"]),
    }
    for _, row in _isco_numeric.iterrows()
}
VALID_ISCO_CODES: set[int] = set(ISCO_LOOKUP.keys())

# 3. ISCO → SOC crosswalk (one-to-many)
_xwalk_df = pd.read_csv(
    DATA_DIR / "crosswalks" / "isco_soc_crosswalk.csv", skiprows=6, encoding="latin-1"
)
_xwalk_df["2010 SOC Code"] = _xwalk_df["2010 SOC Code"].str.strip()
ISCO_TO_SOC: dict[int, list[str]] = {
    int(isco_code): group["2010 SOC Code"].tolist()
    for isco_code, group in _xwalk_df.groupby("ISCO-08 Code")
}

# 4. Frey-Osborne automation scores — maps SOC code → probability (0-1)
_frey_df = pd.read_csv(DATA_DIR / "frey_osborne_automation_scores.csv")
FREY_OSBORNE: dict[str, float] = dict(zip(_frey_df["SOC_Code"], _frey_df["Probability"]))

# 5. Human Capital Index — maps WB country code → HCI score
_hci_df = pd.read_csv(DATA_DIR / "human_capital_index_2020.csv", encoding="utf-8-sig")
HCI_INDEX: dict[str, dict] = {
    str(row["WB Code"]).strip(): {"hci_score": float(row["HUMAN CAPITAL INDEX 2020"])}
    for _, row in _hci_df.iterrows()
    if pd.notna(row.get("HUMAN CAPITAL INDEX 2020"))
}

logger.info(
    "Data layer loaded: %d ESCO, %d ISCO, %d ISCO→SOC, %d Frey-Osborne, %d HCI",
    len(ESCO_TO_ISCO_GROUP), len(VALID_ISCO_CODES),
    len(ISCO_TO_SOC), len(FREY_OSBORNE), len(HCI_INDEX),
)


# ── Public API ────────────────────────────────────────────────────

def resolve_occupation(esco_uri: str, country_code: str | None = None) -> dict:
    """
    Deterministic join: ESCO URI → ISCO code + title + automation risk.

    Returns:
        {"isco_code": str | None, "isco_title": str | None, "automation_risk": float | None}
    """
    isco_group = ESCO_TO_ISCO_GROUP.get(esco_uri)
    if isco_group is None:
        logger.warning("ESCO URI not found in lookup: %s", esco_uri)
        return {"isco_code": None, "isco_title": None, "automation_risk": None}

    isco_info = ISCO_LOOKUP.get(isco_group)
    if isco_info is None:
        logger.warning("ISCO group %d not found in classification", isco_group)
        return {"isco_code": None, "isco_title": None, "automation_risk": None}

    isco_code = isco_info["code"]
    isco_title = isco_info["title"]

    soc_codes = ISCO_TO_SOC.get(isco_group, [])
    if not soc_codes:
        logger.info("No SOC crosswalk for ISCO %s — automation risk will be null", isco_code)
        return {"isco_code": isco_code, "isco_title": isco_title, "automation_risk": None}

    scores = [FREY_OSBORNE[soc] for soc in soc_codes if soc in FREY_OSBORNE]
    automation_risk = round(sum(scores) / len(scores), 4) if scores else None

    return {"isco_code": isco_code, "isco_title": isco_title, "automation_risk": automation_risk}


def get_hci_weight(country_code: str | None) -> float:
    """HCI-based portability weight for a country. Defaults to 1.0."""
    norm = _normalize_country_code(country_code)
    if not norm:
        return 1.0
    hci_data = HCI_INDEX.get(norm)
    return min(hci_data["hci_score"] * 1.2, 1.0) if hci_data else 1.0


def compute_portability(
    raw: int | None,
    country_code: str | None,
    duration_years: float | None,
) -> int | None:
    """
    Hybrid portability score: LLM raw × HCI country weight × duration factor.

    Returns adjusted score 0-100, or None if raw is None.
    """
    if raw is None:
        return None
    country_weight = get_hci_weight(country_code)
    duration_factor = min(duration_years / 10.0, 1.0) if duration_years else 0.5
    adjusted = raw * country_weight * duration_factor
    return max(0, min(100, round(adjusted)))


def validate_isco_code(code: str | None) -> bool:
    """Check if an ISCO code exists in the official classification."""
    if not code:
        return False
    try:
        return int(code) in VALID_ISCO_CODES
    except (ValueError, TypeError):
        return False


# ── Internal helpers ──────────────────────────────────────────────

def _normalize_country_code(code: str | None) -> str | None:
    """Normalize to ISO alpha-3 (HCI uses WB/alpha-3 codes)."""
    if not code:
        return None
    code = code.strip().upper()
    if len(code) == 3:
        return code
    if len(code) == 2:
        try:
            country = pycountry.countries.get(alpha_2=code)
            return country.alpha_3 if country else code
        except Exception:
            return code
    return code
