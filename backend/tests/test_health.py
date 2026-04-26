import pytest


@pytest.mark.asyncio
async def test_health_ok(client):
    r = await client.get("/health")
    # Status can be 200 (ok) or 503 (degraded) — we just want a valid response
    assert r.status_code in (200, 503)
    data = r.json()
    assert "status" in data
    assert "details" in data
    assert "db" in data["details"]
    assert "retrieval_indexes" in data["details"]
