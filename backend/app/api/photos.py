import base64
import io
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, UploadFile
from PIL import Image, ImageOps

from app.api.deps import DB, CurrentUser
from app.core.security import decrypt_bytes, encrypt_bytes
from app.models.user import UserProfilePhoto

router = APIRouter(prefix="/users", tags=["Users Profile Photos"])

MAX_PHOTO_BYTES = 2 * 1024 * 1024  # 2 MiB
MAX_PIXELS = 4096


@router.put("/me/photo")
@router.post("/me/photo", include_in_schema=False)
async def upload_my_photo(file: UploadFile, db: DB, user: CurrentUser):
    if user.role not in ("it", "admin", "supervisor"):
        raise HTTPException(
            403, "Role is not authorized to maintain a custom profile photo"
        )

    content = await file.read(MAX_PHOTO_BYTES + 1)
    if not content:
        raise HTTPException(422, "Image file cannot be empty")
    if len(content) > MAX_PHOTO_BYTES:
        raise HTTPException(413, "Photo must not exceed 2 MiB")

    # Pillow validation
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
        # Re-open for operations after verify()
        img = Image.open(io.BytesIO(content))
    except Exception:
        raise HTTPException(422, "Corrupt or unreadable image file")

    fmt = (img.format or "").upper()
    if fmt not in ("JPEG", "PNG", "WEBP"):
        raise HTTPException(415, "Only JPEG, PNG, and WebP images are supported")

    if getattr(img, "is_animated", False):
        raise HTTPException(422, "Animated images are not supported")

    width, height = img.size
    if width > MAX_PIXELS or height > MAX_PIXELS:
        raise HTTPException(
            422, f"Image dimensions must not exceed {MAX_PIXELS}px per side"
        )

    # Strip metadata and normalize orientation
    img = ImageOps.exif_transpose(img)
    buffer = io.BytesIO()
    save_format = "PNG" if fmt == "PNG" else "JPEG"
    mime_type = "image/png" if save_format == "PNG" else "image/jpeg"
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if save_format == "PNG" else "RGB")
    img.save(buffer, format=save_format, quality=85)
    normalized_bytes = buffer.getvalue()

    # Encrypt and persist (store as base64 string because photo_enc column is Text)
    enc_b64 = base64.b64encode(encrypt_bytes(normalized_bytes)).decode()
    photo_row = await db.get(UserProfilePhoto, user.id)
    if not photo_row:
        photo_row = UserProfilePhoto(
            user_id=user.id,
            photo_enc=enc_b64,
            mime_type=mime_type,
        )
        db.add(photo_row)
    else:
        photo_row.photo_enc = enc_b64
        photo_row.mime_type = mime_type

    await db.commit()
    await db.refresh(photo_row)

    ts = int(photo_row.updated_at.timestamp())
    return {
        "avatar_url": f"/api/v1/users/{user.id}/photo?v={ts}",
        "avatar_updated_at": photo_row.updated_at,
    }


@router.delete("/me/photo", status_code=204)
async def delete_my_photo(db: DB, user: CurrentUser):
    photo_row = await db.get(UserProfilePhoto, user.id)
    if photo_row:
        await db.delete(photo_row)
        await db.commit()
    return Response(status_code=204)


@router.get("/{user_id}/photo")
async def get_user_photo(user_id: UUID, db: DB, current_user: CurrentUser):
    """Authenticated staff can view user profile photo."""
    photo_row = await db.get(UserProfilePhoto, user_id)
    if not photo_row:
        raise HTTPException(404, "Profile photo not found")

    raw_bytes = decrypt_bytes(base64.b64decode(photo_row.photo_enc))
    return Response(
        content=raw_bytes,
        media_type=photo_row.mime_type,
        headers={
            "Cache-Control": "private, max-age=86400",
            "X-Content-Type-Options": "nosniff",
        },
    )
