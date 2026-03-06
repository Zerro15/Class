from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.settings import Settings
from app.models.user import User
from app.schemas.settings import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


def _get_or_create_settings(db: Session, owner_id: int) -> Settings:
    settings = db.query(Settings).filter(Settings.owner_id == owner_id).first()
    if settings:
        return settings

    settings = Settings(owner_id=owner_id)
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("", response_model=SettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SettingsOut:
    return _get_or_create_settings(db, current_user.id)


@router.put("", response_model=SettingsOut)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SettingsOut:
    settings = _get_or_create_settings(db, current_user.id)
    settings.default_lesson_duration_min = payload.default_lesson_duration_min
    settings.default_lesson_price = payload.default_lesson_price
    settings.workday_start = payload.workday_start
    settings.workday_end = payload.workday_end
    settings.week_start = payload.week_start
    settings.timezone = payload.timezone

    db.commit()
    db.refresh(settings)
    return settings
