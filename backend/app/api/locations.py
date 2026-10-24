from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request

from app.api.deps import DB
from app.core.cache import rate_limit
from app.core.security import digest
from app.models import LocationObservation
from app.schemas import LocationObservationInput, LocationObservationOut

router = APIRouter(prefix="/locations", tags=["Locations"])


def now():
    return datetime.now(UTC)


@router.post("/observations", status_code=201, response_model=LocationObservationOut)
async def record_observation(
    body: LocationObservationInput,
    request: Request,
    db: DB,
):
    client_ip = request.client.host if request.client else "unknown"
    await rate_limit("loc_ip:" + digest(client_ip), 60, 60)

    obs = LocationObservation(
        session_id=body.session_id,
        latitude=body.latitude,
        longitude=body.longitude,
        accuracy=body.accuracy,
        captured_at=body.captured_at or now(),
        ip_digest=digest(client_ip),
    )
    db.add(obs)
    await db.commit()
    await db.refresh(obs)

    return LocationObservationOut(
        observation_id=obs.id,
        status="recorded",
    )
