from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.dashboard import DashboardUpcoming

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/upcoming", response_model=DashboardUpcoming)
def upcoming_lessons(
    days: int = Query(7, gt=0, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardUpcoming:
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=days)
    items = (
        db.query(Lesson)
        .filter(
            Lesson.owner_id == current_user.id,
            Lesson.start_at >= now,
            Lesson.start_at <= end,
        )
        .order_by(Lesson.start_at.asc())
        .all()
    )
    return DashboardUpcoming(items=items)
