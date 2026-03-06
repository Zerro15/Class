from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lesson import Lesson
from app.models.lesson_series import LessonSeries
from app.models.settings import Settings
from app.models.student import Student
from app.models.user import User
from app.schemas.lesson_series import LessonSeriesCreate, LessonSeriesOut, LessonSeriesUpdate

router = APIRouter(prefix="/lesson-series", tags=["lesson-series"])


def _get_series_or_404(db: Session, series_id: int, owner_id: int) -> LessonSeries:
    series = db.query(LessonSeries).filter(LessonSeries.id == series_id, LessonSeries.owner_id == owner_id).first()
    if not series:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson series not found")
    return series


@router.get("", response_model=list[LessonSeriesOut])
def list_series(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LessonSeriesOut]:
    return db.query(LessonSeries).filter(LessonSeries.owner_id == current_user.id).order_by(LessonSeries.id.desc()).all()


@router.post("", response_model=LessonSeriesOut, status_code=status.HTTP_201_CREATED)
def create_series(
    payload: LessonSeriesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonSeriesOut:
    student = db.query(Student).filter(Student.id == payload.student_id, Student.owner_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    series = LessonSeries(owner_id=current_user.id, **payload.model_dump())
    db.add(series)
    db.commit()
    db.refresh(series)
    return series


@router.patch("/{series_id}", response_model=LessonSeriesOut)
def update_series(
    series_id: int,
    payload: LessonSeriesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonSeriesOut:
    series = _get_series_or_404(db, series_id, current_user.id)

    updates = payload.model_dump(exclude_unset=True)
    apply_to_future = updates.pop("apply_to_future", False)
    for field, value in updates.items():
        setattr(series, field, value)

    if apply_to_future:
        # Комментарий наставника: массовое обновление затрагивает только будущие уроки серии, чтобы не переписывать историю проведённых занятий.
        now = datetime.now(timezone.utc)
        future_lessons = db.query(Lesson).filter(
            Lesson.owner_id == current_user.id,
            Lesson.series_id == series.id,
            Lesson.start_at >= now,
        )
        for lesson in future_lessons:
            if payload.duration_min is not None:
                lesson.duration_min = payload.duration_min
            if payload.topic is not None:
                lesson.topic = payload.topic
            if payload.price is not None:
                lesson.price = payload.price

    db.commit()
    db.refresh(series)
    return series


@router.post("/{series_id}/apply-schedule", response_model=dict[str, int])
def apply_schedule(
    series_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    series = _get_series_or_404(db, series_id, current_user.id)
    settings = db.query(Settings).filter(Settings.owner_id == current_user.id).first()
    tax_percent = settings.tax_percent_default if settings else 0.0

    start_cursor = datetime.combine(series.start_date, series.start_time).replace(tzinfo=timezone.utc)
    end_limit = datetime.combine(series.end_date, series.start_time).replace(tzinfo=timezone.utc) if series.end_date else (datetime.now(timezone.utc) + timedelta(days=90))

    while start_cursor.weekday() != series.weekday:
        start_cursor += timedelta(days=1)

    created = 0
    cursor = start_cursor
    while cursor <= end_limit:
        # Почему так: защищаемся от дублей при повторном apply, чтобы recurring можно было безопасно запускать несколько раз.
        exists = db.query(Lesson.id).filter(Lesson.series_id == series.id, Lesson.start_at == cursor).first()
        if not exists:
            db.add(
                Lesson(
                    owner_id=current_user.id,
                    student_id=series.student_id,
                    series_id=series.id,
                    start_at=cursor,
                    duration_min=series.duration_min,
                    status="scheduled",
                    topic=series.topic,
                    price=series.price,
                    tax_percent=tax_percent,
                )
            )
            created += 1
        cursor += timedelta(days=7)

    db.commit()
    return {"created": created}


@router.delete("/{series_id}", response_model=dict[str, bool])
def delete_series(
    series_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, bool]:
    series = _get_series_or_404(db, series_id, current_user.id)
    # Комментарий наставника: удаляем правило серии отдельно от уже созданных уроков, чтобы не терять историю занятий и финансовые записи.
    db.query(Lesson).filter(Lesson.owner_id == current_user.id, Lesson.series_id == series.id).update({"series_id": None})
    db.delete(series)
    db.commit()
    return {"ok": True}
