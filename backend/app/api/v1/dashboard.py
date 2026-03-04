from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.dashboard import DashboardHistory, DashboardUpcoming

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
            Lesson.status.in_(["scheduled", "rescheduled"]),
        )
        .order_by(Lesson.start_at.asc())
        .all()
    )
    return DashboardUpcoming(items=items)


@router.get("/history", response_model=DashboardHistory)
def lessons_history(
    limit: int = Query(20, gt=0, le=200),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardHistory:
    query = db.query(Lesson).filter(Lesson.owner_id == current_user.id)
    if status:
        query = query.filter(Lesson.status == status)
    items = query.order_by(Lesson.start_at.desc()).limit(limit).all()
    return DashboardHistory(items=items)
