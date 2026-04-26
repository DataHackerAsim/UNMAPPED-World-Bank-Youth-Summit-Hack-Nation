import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import AsyncMock, patch

from core.database import Base, get_db
import models  # noqa: F401 — ensure all models register with Base

TEST_DB = "sqlite:///./test_worldbank.db"
engine_test = create_engine(TEST_DB, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


# ── Mock payloads ─────────────────────────────────────────────────

MOCK_EXTRACTION = {
    "skill_tags": ["mobile repair", "circuit diagnosis", "soldering", "customer service", "training"],
    "experience_level": "intermediate",
    "task_summary": "Repairs smartphones and trains apprentices",
    "portability_raw": 72,
    "reasoning": "Transferable electronics repair skills",
}

MOCK_REASONING = {
    "risk_level": "medium",
    "displacement_timeline": "5-10 years for basic repair tasks",
    "resilience_skills": ["IoT device repair", "PCB micro-soldering", "digital inventory"],
    "explanation": "Basic phone repair faces automation pressure but diagnostics remain durable",
}


# ── DB fixtures ───────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(engine_test)
    from core.security import seed_admin
    db = TestSession()
    seed_admin(db)
    db.close()
    yield
    Base.metadata.drop_all(engine_test)
    if os.path.exists("test_worldbank.db"):
        os.remove("test_worldbank.db")


def override_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


# ── Service mocks ─────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def mock_llm():
    with (
        patch("services.llm_service.extract_skills", new_callable=AsyncMock) as mock_extract,
        patch("services.llm_service.generate_reasoning", new_callable=AsyncMock) as mock_reason,
        patch("services.llm_service.check_health", new_callable=AsyncMock) as mock_health,
    ):
        mock_extract.return_value = MOCK_EXTRACTION.copy()
        mock_reason.return_value = MOCK_REASONING.copy()
        mock_health.return_value = True
        yield {
            "extract_skills": mock_extract,
            "generate_reasoning": mock_reason,
            "check_health": mock_health,
        }


@pytest.fixture(autouse=True)
def mock_minio():
    with (
        patch("services.photo_service.check_health", new_callable=AsyncMock) as mock_h,
        patch("services.photo_service.ensure_bucket") as mock_b,
    ):
        mock_h.return_value = True
        mock_b.return_value = None
        yield


# ── HTTP client ───────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client():
    from main import app, limiter
    app.dependency_overrides[get_db] = override_db
    limiter.enabled = False

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_token(client):
    r = await client.post("/token", data={"username": "admin", "password": "admin"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


@pytest_asyncio.fixture
async def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ── Reusable profile body ─────────────────────────────────────────

VALID_PROFILE = {
    "name": "Amina Okafor",
    "age": 28,
    "location_city": "Accra",
    "country_code": "GH",
    "consent_given": True,
    "skill_description": "I repair mobile phones and tablets, diagnosing circuit board issues",
    "duration_years": 5.0,
    "frequency": "daily",
    "tools_used": ["soldering iron", "multimeter", "heat gun"],
    "task_log": "Fixed 200+ phones, trained 2 apprentices in screen replacement",
    "income_range": "50_200",
    "certifications": [],
    "languages": [{"name": "English", "spoken": "fluent", "written": "basic"}],
}
