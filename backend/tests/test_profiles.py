import pytest

from tests.conftest import VALID_PROFILE


@pytest.mark.asyncio
async def test_profile_no_consent(client, auth_headers):
    body = {**VALID_PROFILE, "consent_given": False}
    r = await client.post("/profiles", json=body, headers=auth_headers)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_profile_too_sparse(client, auth_headers):
    body = {"consent_given": True, "skill_description": "short"}  # < 20 chars
    r = await client.post("/profiles", json=body, headers=auth_headers)
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert "current_score" in detail or "too sparse" in str(detail).lower()


@pytest.mark.asyncio
async def test_profile_valid(client, auth_headers):
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    assert r.status_code == 201
    data = r.json()

    assert data["name"] == "Amina Okafor"
    assert data["country_code"] == "GH"
    assert data["consent_given"] is True

    assert data["isco_code"] is not None or data["needs_review"] is True
    assert isinstance(data["skill_tags"], list)
    assert isinstance(data["matched_onet_tasks"], list)
    assert data["retrieval_confidence"] is not None
    assert data["profile_completeness_score"] is not None
    assert data["profile_completeness_score"] >= 0.4


@pytest.mark.asyncio
async def test_profile_ai_fields_stripped(client, auth_headers):
    """Client-submitted AI fields must be silently stripped."""
    body = {
        **VALID_PROFILE,
        "isco_code": "9999",
        "automation_risk_score": 0.99,
        "skill_tags": ["INJECTED"],
    }
    r = await client.post("/profiles", json=body, headers=auth_headers)
    assert r.status_code == 201
    data = r.json()
    assert data["isco_code"] != "9999" or data["isco_code"] is None
    if data["skill_tags"]:
        assert "INJECTED" not in data["skill_tags"]


@pytest.mark.asyncio
async def test_profile_get(client, auth_headers):
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    profile_id = r.json()["id"]

    r = await client.get(f"/profiles/{profile_id}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["id"] == profile_id
    assert r.json()["name"] == "Amina Okafor"


@pytest.mark.asyncio
async def test_profile_get_not_found(client, auth_headers):
    r = await client.get("/profiles/99999", headers=auth_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_profile_list_filter(client, auth_headers):
    for code in ["NG", "NG", "KE"]:
        body = {**VALID_PROFILE, "country_code": code, "name": f"Worker {code}"}
        await client.post("/profiles", json=body, headers=auth_headers)

    r = await client.get("/profiles?country_code=NG", headers=auth_headers)
    assert r.status_code == 200
    assert all(p["country_code"] == "NG" for p in r.json())


@pytest.mark.asyncio
async def test_profile_list_pagination(client, auth_headers):
    r = await client.get("/profiles?skip=0&limit=2", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) <= 2


@pytest.mark.asyncio
async def test_delete_profile(client, auth_headers):
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    profile_id = r.json()["id"]

    r = await client.delete(f"/profiles/{profile_id}", headers=auth_headers)
    assert r.status_code == 204

    r = await client.get(f"/profiles/{profile_id}", headers=auth_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_forbidden_for_non_admin(client, auth_headers):
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    profile_id = r.json()["id"]

    await client.post(
        "/users",
        json={"username": "nonadmin_del", "password": "test123", "is_admin": False},
        headers=auth_headers,
    )
    r = await client.post("/token", data={"username": "nonadmin_del", "password": "test123"})
    nonadmin_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = await client.delete(f"/profiles/{profile_id}", headers=nonadmin_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_review_profile(client, auth_headers):
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    profile_id = r.json()["id"]

    r = await client.patch(f"/profiles/{profile_id}/review", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["needs_review"] is False
