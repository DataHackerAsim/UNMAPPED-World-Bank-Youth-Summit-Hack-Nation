"""
Smoke tests — full request/response cycle via ASGI transport.

These sit alongside the unit tests in tests/ and share conftest.py fixtures
(mock_llm, mock_minio, client, auth_headers).

Run with the rest of the suite:
    python -m pytest tests/ -v

Or on their own:
    python -m pytest tests/test_smoke.py -v
"""

import pytest
import pytest_asyncio
from tests.conftest import VALID_PROFILE


# Re-use the VALID_PROFILE and mock fixtures from conftest.py automatically.
# Additional mock payloads duplicated here for assertion clarity.
_MOCK_SKILLS = ["mobile repair", "circuit diagnosis", "soldering", "customer service", "training"]
_MOCK_RESILIENCE = ["IoT device repair", "PCB micro-soldering", "digital inventory"]
_MOCK_TIMELINE = "5-10 years for basic repair tasks"


# ── Health ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_db_and_indexes(client):
    r = await client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["details"]["db"] is True
    assert data["details"]["retrieval_indexes"] is True


# ── Auth ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_returns_token(client):
    r = await client.post("/token", data={"username": "admin", "password": "admin"})
    assert r.status_code == 200
    assert "access_token" in r.json()
    assert r.json()["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_bad_password_401(client):
    r = await client.post("/token", data={"username": "admin", "password": "wrong"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_requires_token(client):
    r = await client.get("/profiles")
    assert r.status_code == 401


# ── Profile creation ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_profile_full_pipeline(client, auth_headers):
    """
    End-to-end: LLM mocked, retrieval + data layer run for real.
    Asserts every stage produced output and persisted it.
    """
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    assert r.status_code == 201, r.text
    data = r.json()

    # Identity
    assert data["id"] > 0
    assert data["country_code"] == "GH"
    assert data["consent_given"] is True

    # Stage 1 — LLM extraction (mocked via conftest mock_llm)
    assert data["skill_tags"] == _MOCK_SKILLS

    # Stage 2+3 — Retrieval + data layer (real CSVs)
    assert data["isco_code"] is not None, "ISCO code should be resolved from real data"
    assert data["isco_title"] is not None
    assert isinstance(data["automation_risk_score"], float)
    assert 0.0 <= data["automation_risk_score"] <= 1.0
    assert data["portability_score"] is not None
    assert data["esco_occupation_uri"] is not None
    assert isinstance(data["matched_onet_tasks"], list)

    # Stage 4 — LLM reasoning (mocked via conftest mock_llm)
    assert data["resilience_skills"] == _MOCK_RESILIENCE
    assert data["displacement_timeline"] == _MOCK_TIMELINE

    # Quality gate passed → not flagged for review
    assert data["needs_review"] is False


@pytest.mark.asyncio
async def test_create_profile_no_consent_422(client, auth_headers):
    r = await client.post("/profiles", json={**VALID_PROFILE, "consent_given": False}, headers=auth_headers)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_create_profile_too_sparse_422(client, auth_headers):
    r = await client.post("/profiles", json={
        "consent_given": True,
        "skill_description": "hi",
        "task_log": "ok",
    }, headers=auth_headers)
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert "current_score" in detail
    assert "min_score" in detail
    assert detail["current_score"] < detail["min_score"]


@pytest.mark.asyncio
async def test_ai_fields_stripped_on_create(client, auth_headers):
    """Client must not be able to inject AI-computed fields."""
    injected = {
        **VALID_PROFILE,
        "isco_code": "9999",
        "automation_risk_score": 0.99,
        "needs_review": False,
        "portability_score": 999,
    }
    r = await client.post("/profiles", json=injected, headers=auth_headers)
    assert r.status_code == 201
    data = r.json()
    assert data.get("isco_code") != "9999", "Injected isco_code was not stripped"
    assert data.get("automation_risk_score") != 0.99, "Injected risk score was not stripped"
    assert data.get("portability_score") != 999, "Injected portability was not stripped"


# ── Profile retrieval & listing ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_profile_by_id(client, auth_headers):
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    pid = r.json()["id"]
    r2 = await client.get(f"/profiles/{pid}", headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["id"] == pid


@pytest.mark.asyncio
async def test_get_profile_not_found_404(client, auth_headers):
    r = await client.get("/profiles/99999", headers=auth_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_list_profiles_returns_list(client, auth_headers):
    await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    r = await client.get("/profiles", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1


@pytest.mark.asyncio
async def test_list_filter_country_code(client, auth_headers):
    """Filter must not leak profiles from other countries."""
    await client.post("/profiles", json={**VALID_PROFILE, "country_code": "NG"}, headers=auth_headers)
    await client.post("/profiles", json={**VALID_PROFILE, "country_code": "ZM"}, headers=auth_headers)
    r = await client.get("/profiles?country_code=NG", headers=auth_headers)
    assert r.status_code == 200
    assert all(p["country_code"] == "NG" for p in r.json())


@pytest.mark.asyncio
async def test_list_pagination_limit(client, auth_headers):
    # Create several profiles
    for _ in range(3):
        await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    r = await client.get("/profiles?skip=0&limit=2", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) <= 2


# ── Admin operations ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_profile(client, auth_headers):
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    pid = r.json()["id"]
    rd = await client.delete(f"/profiles/{pid}", headers=auth_headers)
    assert rd.status_code == 204
    # Confirm it's gone
    rg = await client.get(f"/profiles/{pid}", headers=auth_headers)
    assert rg.status_code == 404


@pytest.mark.asyncio
async def test_mark_review_complete(client, auth_headers):
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    pid = r.json()["id"]
    rr = await client.patch(f"/profiles/{pid}/review", headers=auth_headers)
    assert rr.status_code == 200
    assert rr.json()["needs_review"] is False


# ── Risk assessment ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_risk_assess_shape_and_values(client, auth_headers):
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    pid = r.json()["id"]
    rr = await client.post("/risk/assess", json={"profile_id": pid}, headers=auth_headers)
    assert rr.status_code == 200
    data = rr.json()

    assert "automation_score_global" in data
    assert "automation_score_lmic_calibrated" in data
    assert "calibration_note" in data
    assert isinstance(data["at_risk_tasks"], list)
    assert isinstance(data["durable_skills"], list)
    assert isinstance(data["adjacent_skills"], list)
    assert isinstance(data["wittgenstein_trend"], list)
    assert len(data["wittgenstein_trend"]) > 0

    # GH HCI weight is < 1 so LMIC score should be lower than global
    assert data["automation_score_lmic_calibrated"] <= data["automation_score_global"]


@pytest.mark.asyncio
async def test_risk_assess_missing_id_422(client, auth_headers):
    r = await client.post("/risk/assess", json={}, headers=auth_headers)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_risk_assess_unknown_profile_404(client, auth_headers):
    r = await client.post("/risk/assess", json={"profile_id": 99999}, headers=auth_headers)
    assert r.status_code == 404


# ── Opportunity matching ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_opportunities_returns_valid_structure(client, auth_headers):
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    pid = r.json()["id"]
    ro = await client.post("/opportunities/match", json={"profile_id": pid}, headers=auth_headers)
    assert ro.status_code == 200
    opps = ro.json()
    assert isinstance(opps, list)
    assert len(opps) > 0
    for o in opps:
        assert "title" in o
        assert "sector" in o
        assert o["pathway"] in ("immediate", "with_training", "career_change")
        assert isinstance(o["wage_floor_usd_month"], int)
        assert isinstance(o["sector_growth_pct"], float)
        assert "match_reason" in o
        assert "source" in o


@pytest.mark.asyncio
async def test_opportunities_sorted_immediate_first(client, auth_headers):
    """immediate → with_training → career_change sort order must hold."""
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    pid = r.json()["id"]
    ro = await client.post("/opportunities/match", json={"profile_id": pid}, headers=auth_headers)
    opps = ro.json()
    order = {"immediate": 0, "with_training": 1, "career_change": 2}
    for i in range(len(opps) - 1):
        assert order[opps[i]["pathway"]] <= order[opps[i + 1]["pathway"]], \
            f"Pathway sort broken: {opps[i]['pathway']} before {opps[i+1]['pathway']}"


@pytest.mark.asyncio
async def test_opportunities_unknown_profile_404(client, auth_headers):
    r = await client.post("/opportunities/match", json={"profile_id": 99999}, headers=auth_headers)
    assert r.status_code == 404


# ── Policy dashboard ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_policy_empty_country_zero_totals(client, auth_headers):
    r = await client.get("/policy/ZZ", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total_profiles"] == 0
    assert data["avg_automation_risk_pct"] == 0
    assert data["skills_distribution"] == []
    assert data["sector_gap"] == []


@pytest.mark.asyncio
async def test_policy_aggregates_real_profiles(client, auth_headers):
    await client.post("/profiles", json={**VALID_PROFILE, "country_code": "KE"}, headers=auth_headers)
    await client.post("/profiles", json={**VALID_PROFILE, "country_code": "KE"}, headers=auth_headers)
    r = await client.get("/policy/KE", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total_profiles"] >= 2
    assert data["avg_automation_risk_pct"] >= 0
    assert isinstance(data["skills_distribution"], list)
    for entry in data["sector_gap"]:
        assert {"sector", "demand", "supply"} <= entry.keys()
