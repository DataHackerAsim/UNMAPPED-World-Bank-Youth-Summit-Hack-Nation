"""
World Bank Skills Platform — FastAPI Backend

Hybrid LLM + Data Layer Architecture:
  Stage 1: LLM extraction      (services.llm_service.extract_skills)
  Stage 2: Retrieval matching  (services.retrieval_service.match_occupation)
  Stage 3: Data joins          (services.data_layer_service.resolve_occupation)
  Stage 4: LLM reasoning       (services.llm_service.generate_reasoning)

"LLM understands and explains — data decides."
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from api.routes import auth, health, photos, profiles, risk, opportunities, policy
from core.database import SessionLocal, engine
from core.security import seed_admin
from models.user import User          # noqa: F401 — register with Base
from models.worker_profile import WorkerProfile  # noqa: F401 — register with Base
from core.database import Base
from services import llm_service, photo_service, retrieval_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── App & rate limiter ────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="World Bank Skills Platform", version="1.0.0")

# ── CORS — allow frontend dev server ──────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Rate-limit decorators on routers ─────────────────────────────
# Applied per-route inside each router module where needed.
# Attach limiter to app state so router decorators can resolve it.

# ── Register routers ──────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(health.router)
app.include_router(profiles.router)
app.include_router(photos.router)
app.include_router(risk.router)
app.include_router(opportunities.router)
app.include_router(policy.router)


# ── Startup ───────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")

    db = SessionLocal()
    try:
        seed_admin(db)
        logger.info("Admin user seeded")
    finally:
        db.close()

    photo_service.ensure_bucket()

    logger.info("Retrieval indexes ready: %s", retrieval_service.is_ready())

    ollama_ok = await llm_service.check_health()
    logger.info("Ollama reachable: %s", ollama_ok)
