from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.database import get_db
from services import llm_service, photo_service, retrieval_service

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(db: Session = Depends(get_db)):
    checks = {
        "db": False,
        "ollama": False,
        "minio": False,
        "retrieval_indexes": retrieval_service.is_ready(),
    }

    try:
        db.execute(text("SELECT 1"))
        checks["db"] = True
    except Exception:
        pass

    checks["ollama"] = await llm_service.check_health()
    checks["minio"] = await photo_service.check_health()

    all_ok = all(checks.values())
    return {
        "status": "ok" if all_ok else "degraded",
        "details": checks,
    }
