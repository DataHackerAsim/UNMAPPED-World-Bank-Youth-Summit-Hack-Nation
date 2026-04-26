import io
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import VALID_PROFILE


@pytest.mark.asyncio
async def test_photo_upload(client, auth_headers):
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    profile_id = r.json()["id"]

    from PIL import Image
    img = Image.new("RGB", (1, 1), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    with (
        patch("services.photo_service.upload_photo", new_callable=AsyncMock) as mock_upload,
        patch("services.photo_service.caption_photo", new_callable=AsyncMock) as mock_caption,
    ):
        mock_upload.return_value = f"{profile_id}/abc123_test.jpg"
        mock_caption.return_value = "A red pixel image"

        r = await client.post(
            f"/profiles/{profile_id}/photos",
            files={"file": ("test.jpg", buf, "image/jpeg")},
            headers=auth_headers,
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data["photo_paths"]) == 1
        assert len(data["photo_descriptions"]) == 1


@pytest.mark.asyncio
async def test_photo_limit(client, auth_headers):
    """4th photo should be rejected."""
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    profile_id = r.json()["id"]

    from PIL import Image
    img = Image.new("RGB", (1, 1), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    with (
        patch("services.photo_service.upload_photo", new_callable=AsyncMock) as mock_upload,
        patch("services.photo_service.caption_photo", new_callable=AsyncMock) as mock_caption,
    ):
        mock_upload.return_value = f"{profile_id}/photo.jpg"
        mock_caption.return_value = "test"

        for i in range(3):
            buf.seek(0)
            r = await client.post(
                f"/profiles/{profile_id}/photos",
                files={"file": (f"photo{i}.jpg", buf, "image/jpeg")},
                headers=auth_headers,
            )
            assert r.status_code == 200

        buf.seek(0)
        r = await client.post(
            f"/profiles/{profile_id}/photos",
            files={"file": ("photo4.jpg", buf, "image/jpeg")},
            headers=auth_headers,
        )
        assert r.status_code == 400


@pytest.mark.asyncio
async def test_photo_presigned_url(client, auth_headers):
    r = await client.post("/profiles", json=VALID_PROFILE, headers=auth_headers)
    profile_id = r.json()["id"]

    from PIL import Image
    img = Image.new("RGB", (1, 1))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    with (
        patch("services.photo_service.upload_photo", new_callable=AsyncMock) as mock_upload,
        patch("services.photo_service.caption_photo", new_callable=AsyncMock) as mock_caption,
    ):
        mock_upload.return_value = f"{profile_id}/abc_test.jpg"
        mock_caption.return_value = "test"
        await client.post(
            f"/profiles/{profile_id}/photos",
            files={"file": ("test.jpg", buf, "image/jpeg")},
            headers=auth_headers,
        )

    with patch("services.photo_service.get_presigned_url") as mock_url:
        mock_url.return_value = "http://minio:9000/worker-photos/1/abc_test.jpg?signature=xyz"
        r = await client.get(
            f"/profiles/{profile_id}/photos/abc_test.jpg",
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert "url" in r.json()
