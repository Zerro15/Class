from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.dashboard import DashboardLessonOut, DashboardUpcoming

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/upcoming", response_model=DashboardUpcoming)
def upcoming_lessons(
    days: int = Query(7, gt=0, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardUpcoming:
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=days)
    lessons = (
        db.query(Lesson)
        .options(joinedload(Lesson.payment), joinedload(Lesson.homework))
        .filter(
            Lesson.owner_id == current_user.id,
            Lesson.start_at >= now,
            Lesson.start_at <= end,
        )
        .order_by(Lesson.start_at.asc())
        .all()
    )
    items = [
        DashboardLessonOut.model_validate(
            {
                "id": lesson.id,
                "student_id": lesson.student_id,
                "start_at": lesson.start_at,
                "duration_min": lesson.duration_min,
                "status": lesson.status,
                "topic": lesson.topic,
                "price": lesson.price,
                "tax_percent": lesson.tax_percent,
                "is_archived": lesson.is_archived,
                "is_paid": lesson.payment.is_paid if lesson.payment else None,
                "is_homework_sent": lesson.homework.is_sent if lesson.homework else None,
            }
        )
        for lesson in lessons
    ]
    return DashboardUpcoming(items=items)
