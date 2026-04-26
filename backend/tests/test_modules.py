"""Tests for the three Module 2/3 endpoints: risk, opportunities, policy."""

import pytest
from tests.conftest import VALID_PROFILE


@pytest.mark.asyncio
async def test_risk_assess(client, auth_headers):
    # Create a profile first
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    assert r.status_code == 201
    profile_id = r.json()["id"]

    # Assess risk
    r = await client.post(
        "/risk/assess",
        json={"profile_id": profile_id},
        headers=auth_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert "automation_score_global" in data
    assert "automation_score_lmic_calibrated" in data
    assert "at_risk_tasks" in data
    assert "durable_skills" in data
    assert "adjacent_skills" in data
    assert "wittgenstein_trend" in data
    assert isinstance(data["wittgenstein_trend"], list)
    assert 0 <= data["automation_score_global"] <= 1


@pytest.mark.asyncio
async def test_risk_assess_not_found(client, auth_headers):
    r = await client.post(
        "/risk/assess",
        json={"profile_id": 99999},
        headers=auth_headers,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_opportunities_match(client, auth_headers):
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    profile_id = r.json()["id"]

    r = await client.post(
        "/opportunities/match",
        json={"profile_id": profile_id},
        headers=auth_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if len(data) > 0:
        opp = data[0]
        assert "title" in opp
        assert "sector" in opp
        assert "wage_floor_usd_month" in opp
        assert "pathway" in opp
        assert "match_reason" in opp
        assert opp["pathway"] in ("immediate", "with_training", "career_change")


@pytest.mark.asyncio
async def test_opportunities_not_found(client, auth_headers):
    r = await client.post(
        "/opportunities/match",
        json={"profile_id": 99999},
        headers=auth_headers,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_policy_dashboard(client, auth_headers):
    # Create profiles first
    for code in ["GH", "GH", "KE"]:
        body = {**VALID_PROFILE, "country_code": code}
        await client.post("/profiles", json=body, headers=auth_headers)

    r = await client.get("/policy/GH", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total_profiles"] >= 2
    assert "top_at_risk_occupation" in data
    assert "biggest_skills_gap" in data
    assert "avg_automation_risk_pct" in data
    assert isinstance(data["skills_distribution"], list)
    assert isinstance(data["sector_gap"], list)


@pytest.mark.asyncio
async def test_policy_empty_country(client, auth_headers):
    r = await client.get("/policy/XX", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total_profiles"] == 0
