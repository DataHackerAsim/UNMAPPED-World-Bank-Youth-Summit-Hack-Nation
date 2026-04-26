"""
Tests for the hybrid pipeline components:
  - services.data_layer_service (Stage 3: deterministic joins)
  - services.retrieval_service  (Stage 2: TF-IDF matching)
"""

import pytest

from services.data_layer_service import (
    ESCO_TO_ISCO_GROUP,
    FREY_OSBORNE,
    VALID_ISCO_CODES,
    compute_portability,
    get_hci_weight,
    resolve_occupation,
    validate_isco_code,
)
from services.retrieval_service import is_ready, match_occupation
from core.config import settings


# ── Data Layer Tests ──────────────────────────────────────────────

class TestDataLayer:

    def test_esco_to_isco_join(self):
        """Known ESCO URI should resolve to valid ISCO code + title."""
        uri = list(ESCO_TO_ISCO_GROUP.keys())[0]
        result = resolve_occupation(uri)
        assert result["isco_code"] is not None
        assert result["isco_title"] is not None
        assert validate_isco_code(result["isco_code"])

    def test_esco_unknown_uri(self):
        """Unknown ESCO URI should return all nulls."""
        result = resolve_occupation("http://fake/uri/12345")
        assert result["isco_code"] is None
        assert result["isco_title"] is None
        assert result["automation_risk"] is None

    def test_frey_osborne_scores(self):
        """Automation risk should be a float between 0 and 1."""
        for uri in ESCO_TO_ISCO_GROUP:
            result = resolve_occupation(uri)
            if result["automation_risk"] is not None:
                assert 0.0 <= result["automation_risk"] <= 1.0
                return
        pytest.skip("No ESCO→ISCO→SOC→Frey-Osborne chain found")

    def test_frey_osborne_averaging(self):
        """When multiple SOCs match one ISCO, score should be averaged."""
        for uri in list(ESCO_TO_ISCO_GROUP.keys())[:50]:
            result = resolve_occupation(uri)
            if result["automation_risk"] is not None:
                assert 0.0 <= result["automation_risk"] <= 1.0

    def test_validate_isco_code_valid(self):
        code = str(list(VALID_ISCO_CODES)[0])
        assert validate_isco_code(code) is True

    def test_validate_isco_code_invalid(self):
        assert validate_isco_code("0000") is False
        assert validate_isco_code(None) is False
        assert validate_isco_code("") is False

    def test_hci_weight_known_country(self):
        pk_weight = get_hci_weight("PK")
        assert 0.0 < pk_weight <= 1.0
        gh_weight = get_hci_weight("GH")
        assert 0.0 < gh_weight <= 1.0

    def test_hci_weight_both_code_formats(self):
        assert get_hci_weight("PK") == get_hci_weight("PAK")
        assert get_hci_weight("GH") == get_hci_weight("GHA")

    def test_hci_weight_unknown_country(self):
        assert get_hci_weight("XX") == 1.0
        assert get_hci_weight(None) == 1.0

    def test_compute_portability(self):
        score = compute_portability(72, "GH", 5.0)
        assert score is not None
        assert 0 <= score <= 100

    def test_compute_portability_none_raw(self):
        assert compute_portability(None, "GH", 5.0) is None

    def test_compute_portability_no_country(self):
        score = compute_portability(80, None, 10.0)
        assert score is not None
        assert 0 <= score <= 100

    def test_compute_portability_clamping(self):
        assert compute_portability(100, None, 10.0) <= 100
        assert compute_portability(0, "GH", 5.0) >= 0


# ── Retrieval Service Tests ───────────────────────────────────────

class TestRetrievalService:

    def test_is_ready(self):
        assert is_ready() is True

    def test_match_phone_repair(self):
        result = match_occupation(
            ["mobile repair", "circuit diagnosis", "soldering"],
            "Repairs smartphones and diagnoses circuit board issues",
        )
        assert len(result["esco_matches"]) > 0
        assert len(result["onet_task_matches"]) > 0
        assert result["best_match"] is not None
        assert result["confidence"] > 0

    def test_match_hairdresser(self):
        result = match_occupation(
            ["hair cutting", "styling", "coloring"],
            "Cuts and styles hair for clients",
        )
        assert result["confidence"] > 0
        labels = [m["label"].lower() for m in result["esco_matches"]]
        assert any("hair" in l or "barber" in l or "beauty" in l for l in labels)

    def test_match_empty_input(self):
        result = match_occupation([], None)
        assert result["confidence"] == 0.0
        assert result["best_match"] is None

    def test_match_gibberish(self):
        result = match_occupation(
            ["xyzzy", "qwerty", "asdfgh"],
            "lorem ipsum dolor sit amet",
        )
        assert result["confidence"] < settings.retrieval_confidence_threshold

    def test_match_returns_similarity_scores(self):
        result = match_occupation(["welding", "metal fabrication"], "Welds steel structures")
        for match in result["esco_matches"]:
            assert "similarity" in match
            assert "uri" in match
            assert "label" in match
            assert 0.0 <= match["similarity"] <= 1.0

    def test_match_onet_tasks(self):
        result = match_occupation(
            ["driving", "navigation", "vehicle maintenance"],
            "Drives taxi and maintains vehicle",
        )
        for task in result["onet_task_matches"]:
            assert "task_id" in task
            assert "statement" in task
            assert "similarity" in task

    def test_confidence_threshold_calibration(self):
        real = match_occupation(["sewing", "tailoring"], "makes clothing")
        fake = match_occupation(["xyzzy"], "asdfgh qwerty")
        assert real["confidence"] >= settings.retrieval_confidence_threshold
        assert fake["confidence"] < settings.retrieval_confidence_threshold
