"""
Photo Service — Pillow validation, MinIO storage, llava:7b captioning

Photos are skill evidence for informal workers. Max 3 per profile.
Stored in MinIO bucket 'worker-photos' at path {profile_id}/{uuid}_{filename}.
Captioned by llava:7b to describe tools, work environment, products.
"""

import base64
import io
import logging
import uuid
from datetime import timedelta

import httpx
from minio import Minio
from minio.error import S3Error
from PIL import Image

from core.config import settings

logger = logging.getLogger(__name__)


# ── MinIO client ──────────────────────────────────────────────────

def _get_client() -> Minio:
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


def ensure_bucket() -> None:
    """Create the photos bucket on startup if it doesn't exist."""
    try:
        client = _get_client()
        if not client.bucket_exists(settings.minio_bucket):
            client.make_bucket(settings.minio_bucket)
            logger.info("Created MinIO bucket: %s", settings.minio_bucket)
        else:
            logger.info("MinIO bucket exists: %s", settings.minio_bucket)
    except Exception as e:
        logger.warning("MinIO bucket check failed (will retry on upload): %s", e)


# ── Photo operations ──────────────────────────────────────────────

def validate_image(file_bytes: bytes) -> Image.Image:
    """Validate that file_bytes is a real image using Pillow. Raises ValueError if not."""
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()
        return Image.open(io.BytesIO(file_bytes))  # re-open after verify closes the stream
    except Exception as e:
        raise ValueError(f"File is not a valid image: {e}")


async def upload_photo(profile_id: int, filename: str, file_bytes: bytes) -> str:
    """
    Validate image, upload to MinIO, return the object path.

    Raises ValueError if file is not a valid image.
    """
    validate_image(file_bytes)

    unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
    object_path = f"{profile_id}/{unique_name}"

    client = _get_client()
    client.put_object(
        settings.minio_bucket,
        object_path,
        io.BytesIO(file_bytes),
        length=len(file_bytes),
        content_type="image/jpeg",
    )
    logger.info("Uploaded photo: %s (%d bytes)", object_path, len(file_bytes))
    return object_path


async def caption_photo(file_bytes: bytes) -> str:
    """
    Caption the photo using llava:7b via Ollama.

    Returns an empty string on any failure — never raises.
    """
    try:
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        payload = {
            "model": settings.ollama_vision_model,
            "messages": [{
                "role": "user",
                "content": (
                    "Describe what you see in this photo in one sentence. "
                    "Focus on tools, work environment, and products."
                ),
                "images": [b64],
            }],
            "stream": False,
            "options": {"num_predict": 100, "temperature": 0.3},
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/api/chat", json=payload
            )
            response.raise_for_status()
        return response.json().get("message", {}).get("content", "").strip()
    except Exception as e:
        logger.warning("Photo captioning failed: %s", e)
        return ""


def get_presigned_url(object_path: str) -> str:
    """Generate a presigned GET URL for a photo."""
    client = _get_client()
    return client.presigned_get_object(
        settings.minio_bucket,
        object_path,
        expires=timedelta(hours=settings.presigned_url_expiry_hours),
    )


def delete_photos(photo_paths: list[str]) -> None:
    """Delete all MinIO objects by path. Called before a profile is deleted."""
    if not photo_paths:
        return
    client = _get_client()
    for path in photo_paths:
        try:
            client.remove_object(settings.minio_bucket, path)
            logger.info("Deleted photo: %s", path)
        except S3Error as e:
            logger.warning("Failed to delete photo %s: %s", path, e)


async def check_health() -> bool:
    """Return True if MinIO is reachable."""
    try:
        _get_client().bucket_exists(settings.minio_bucket)
        return True
    except Exception:
        return False
