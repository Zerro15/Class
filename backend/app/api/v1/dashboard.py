from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lesson import Lesson
from app.models.payment import Payment
from app.models.user import User
from app.schemas.dashboard import DashboardHistory, DashboardUpcoming
from app.schemas.finance import DashboardSummaryOut

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


@router.get("/summary", response_model=DashboardSummaryOut)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardSummaryOut:
    now = datetime.now(timezone.utc)
    day_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    upcoming_count = (
        db.query(func.count(Lesson.id))
        .filter(
            Lesson.owner_id == current_user.id,
            Lesson.start_at >= now,
            Lesson.status.in_(["scheduled", "rescheduled"]),
        )
        .scalar()
        or 0
    )
    today_count = (
        db.query(func.count(Lesson.id))
        .filter(
            Lesson.owner_id == current_user.id,
            Lesson.start_at >= day_start,
            Lesson.start_at < day_end,
            Lesson.status.in_(["scheduled", "rescheduled"]),
        )
        .scalar()
        or 0
    )
    unpaid_total = (
        db.query(func.coalesce(func.sum(Payment.amount - Payment.paid_amount), 0.0))
        .join(Lesson, Lesson.id == Payment.lesson_id)
        .filter(
            Lesson.owner_id == current_user.id,
            Payment.amount > Payment.paid_amount,
        )
        .scalar()
        or 0.0
    )

    return DashboardSummaryOut(
        upcoming_count=int(upcoming_count),
        today_count=int(today_count),
        unpaid_total=float(unpaid_total),
    )


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
