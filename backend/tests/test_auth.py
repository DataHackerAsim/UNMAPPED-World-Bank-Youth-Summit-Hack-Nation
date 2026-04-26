import pytest


@pytest.mark.asyncio
async def test_login_success(client):
    r = await client.post("/token", data={"username": "admin", "password": "admin"})
    assert r.status_code == 200
    assert "access_token" in r.json()
    assert r.json()["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    r = await client.post("/token", data={"username": "admin", "password": "wrong"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_user(client):
    r = await client.post("/token", data={"username": "nobody", "password": "x"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_create_user(client, auth_headers):
    r = await client.post(
        "/users",
        json={"username": "newuser", "password": "pass123", "is_admin": False},
        headers=auth_headers,
    )
    assert r.status_code == 201
    assert r.json()["username"] == "newuser"
    assert r.json()["is_admin"] is False


@pytest.mark.asyncio
async def test_create_duplicate_user(client, auth_headers):
    payload = {"username": "dupuser", "password": "pass", "is_admin": False}
    await client.post("/users", json=payload, headers=auth_headers)
    r = await client.post("/users", json=payload, headers=auth_headers)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_create_user_requires_admin(client):
    # No auth headers → should fail
    r = await client.post(
        "/users",
        json={"username": "x", "password": "y", "is_admin": False},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_no_token(client):
    r = await client.get("/profiles")
    assert r.status_code == 401
