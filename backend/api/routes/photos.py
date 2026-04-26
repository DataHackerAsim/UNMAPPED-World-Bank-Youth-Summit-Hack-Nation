import logging

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.security import get_current_user
from models.schemas import ProfileOut
from models.worker_profile import WorkerProfile
from services import photo_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profiles", tags=["photos"])


@router.post("/{profile_id}/photos", response_model=ProfileOut)
async def upload_photo(
    request: Request,
    profile_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    profile = db.query(WorkerProfile).filter(WorkerProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, detail="Profile not found")

    current_photos = profile.photo_paths or []
    if len(current_photos) >= settings.max_photos_per_profile:
        raise HTTPException(
            400,
            detail=f"Maximum {settings.max_photos_per_profile} photos per profile",
        )

    file_bytes = await file.read()
    try:
        object_path = await photo_service.upload_photo(
            profile_id, file.filename or "photo.jpg", file_bytes
        )
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    caption = await photo_service.caption_photo(file_bytes)

    profile.photo_paths = list(profile.photo_paths or []) + [object_path]
    profile.photo_descriptions = list(profile.photo_descriptions or []) + [caption]
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{profile_id}/photos/{filename}")
async def get_photo_url(
    request: Request,
    profile_id: int,
    filename: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    profile = db.query(WorkerProfile).filter(WorkerProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, detail="Profile not found")

    target_path = next(
        (p for p in (profile.photo_paths or []) if filename in p), None
    )
    if not target_path:
        raise HTTPException(404, detail="Photo not found")

    return {"url": photo_service.get_presigned_url(target_path)}
