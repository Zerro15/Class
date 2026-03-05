from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lesson import Lesson
from app.models.lesson_series import LessonSeries
from app.models.settings import Settings
from app.models.student import Student
from app.models.user import User
from app.schemas.lesson_series import (
    ApplyScheduleRequest,
    ApplyScheduleResponse,
    ApplySeriesPatchRequest,
    ApplySeriesPatchResponse,
    LessonSeriesCreate,
    LessonSeriesOut,
    LessonSeriesUpdate,
)

router = APIRouter(prefix="/lesson-series", tags=["lesson-series"])
schedule_router = APIRouter(prefix="/schedule", tags=["schedule"])


def _ensure_student(db: Session, owner_id: int, student_id: int) -> None:
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.owner_id == owner_id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")


@router.get("", response_model=list[LessonSeriesOut])
def list_series(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LessonSeriesOut]:
    return (
        db.query(LessonSeries)
        .filter(LessonSeries.owner_id == current_user.id)
        .order_by(LessonSeries.weekday.asc(), LessonSeries.time_of_day.asc())
        .all()
    )


@router.post("", response_model=LessonSeriesOut, status_code=status.HTTP_201_CREATED)
def create_series(
    payload: LessonSeriesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonSeriesOut:
    _ensure_student(db, current_user.id, payload.student_id)
    row = LessonSeries(owner_id=current_user.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{series_id}", response_model=LessonSeriesOut)
def update_series(
    series_id: int,
    payload: LessonSeriesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonSeriesOut:
    row = (
        db.query(LessonSeries)
        .filter(LessonSeries.id == series_id, LessonSeries.owner_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")
    data = payload.model_dump(exclude_unset=True)
    if "student_id" in data and data["student_id"] is not None:
        _ensure_student(db, current_user.id, data["student_id"])
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_series(
    series_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    row = (
        db.query(LessonSeries)
        .filter(LessonSeries.id == series_id, LessonSeries.owner_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")
    db.delete(row)
    db.commit()


@schedule_router.post("/apply", response_model=ApplyScheduleResponse)
def apply_schedule(
    payload: ApplyScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApplyScheduleResponse:
    if payload.strategy not in {"skip_existing"}:
        raise HTTPException(status_code=400, detail="Only skip_existing strategy is supported")

    week_start = datetime.combine(payload.week_start, time.min, tzinfo=timezone.utc)
    settings = db.query(Settings).filter(Settings.owner_id == current_user.id).first()
    tax_percent = settings.tax_percent_default if settings else 0.0

    series_items = (
        db.query(LessonSeries)
        .filter(LessonSeries.owner_id == current_user.id, LessonSeries.is_active.is_(True))
        .all()
    )

    created = 0
    skipped = 0
    for current in (week_start + timedelta(days=idx) for idx in range(payload.days)):
        for series in series_items:
            if current.weekday() != series.weekday:
                continue
            slot = datetime.combine(current.date(), series.time_of_day, tzinfo=timezone.utc)
            duplicate = (
                db.query(Lesson)
                .filter(
                    Lesson.owner_id == current_user.id,
                    Lesson.student_id == series.student_id,
                    Lesson.start_at >= slot - timedelta(minutes=1),
                    Lesson.start_at <= slot + timedelta(minutes=1),
                )
                .first()
            )
            # Комментарий наставника: ±1 минута защищает от дублей при повторном apply,
            # даже если клиент/сервер немного сдвинули секунды или таймзону.
            if duplicate:
                skipped += 1
                continue

            db.add(
                Lesson(
                    owner_id=current_user.id,
                    student_id=series.student_id,
                    start_at=slot,
                    duration_min=series.duration_min,
                    status="scheduled",
                    topic=series.topic,
                    price=series.price,
                    tax_percent=tax_percent,
                    series_id=series.id,
                )
            )
            created += 1

    db.commit()
    return ApplyScheduleResponse(created=created, skipped=skipped)


@router.patch("/{series_id}/apply", response_model=ApplySeriesPatchResponse)
def apply_series_patch(
    series_id: int,
    payload: ApplySeriesPatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApplySeriesPatchResponse:
    series = (
        db.query(LessonSeries)
        .filter(LessonSeries.id == series_id, LessonSeries.owner_id == current_user.id)
        .first()
    )
    if not series:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")

    patch = payload.patch.model_dump(exclude_unset=True)
    if not patch:
        raise HTTPException(status_code=400, detail="Patch payload is empty")

    lessons = (
        db.query(Lesson)
        .filter(
            Lesson.owner_id == current_user.id,
            Lesson.series_id == series_id,
            Lesson.start_at >= payload.from_start_at,
        )
        .all()
    )
    # Комментарий наставника: изменяем только будущие занятия серии, прошлые остаются историей фактических условий.
    for lesson in lessons:
        for key, value in patch.items():
            setattr(lesson, key, value)

    series_updated = False
    if payload.also_update_series_template:
        # Комментарий наставника: обновляем и шаблон серии, чтобы следующие apply на недели не «откатывали» правки.
        for key in ("duration_min", "topic", "price"):
            if key in patch:
                setattr(series, key, patch[key])
        series_updated = True

    db.commit()
    return ApplySeriesPatchResponse(updated_lessons=len(lessons), series_updated=series_updated)
