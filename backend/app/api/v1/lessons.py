from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.homework import Homework
from app.models.lesson import Lesson
from app.models.lesson_series import LessonSeries
from app.models.payment import Payment
from app.models.settings import Settings
from app.models.student import Student
from app.models.user import User
from app.schemas.homework import HomeworkCreate, HomeworkOut, HomeworkUpdate
from app.schemas.lesson import LessonCreate, LessonOut, LessonUpdate
from app.schemas.payment import PaymentCreate, PaymentOut, PaymentUpdate

router = APIRouter(prefix="/lessons", tags=["lessons"])


def apply_lesson_projection(lesson: Lesson, student_name: str | None = None) -> Lesson:
    lesson.student_name = student_name
    lesson.is_paid = lesson.payment.is_paid if lesson.payment else None
    lesson.is_homework_sent = lesson.homework.is_sent if lesson.homework else None
    return lesson


def get_lesson_or_404(db: Session, lesson_id: int, owner_id: int) -> Lesson:
    lesson = (
        db.query(Lesson)
        .filter(Lesson.id == lesson_id, Lesson.owner_id == owner_id)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return lesson


@router.get("", response_model=list[LessonOut])
def list_lessons(
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    student_id: int | None = None,
    status_value: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LessonOut]:
    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'from' must be earlier than or equal to 'to'",
        )

    if status_value is not None and status_value not in {"scheduled", "done", "canceled"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status filter",
        )

    query = db.query(Lesson).filter(Lesson.owner_id == current_user.id)
    if from_date:
        query = query.filter(Lesson.start_at >= from_date)
    if to_date:
        query = query.filter(Lesson.start_at <= to_date)
    if student_id is not None:
        query = query.filter(Lesson.student_id == student_id)
    if status_value is not None:
        query = query.filter(Lesson.status == status_value)
    lessons = query.order_by(Lesson.start_at.asc()).all()
    student_map = {
        row.id: row.name
        for row in db.query(Student.id, Student.name).filter(Student.owner_id == current_user.id).all()
    }
    for lesson in lessons:
        apply_lesson_projection(lesson, student_map.get(lesson.student_id))
    return lessons


@router.get("/{lesson_id}", response_model=LessonOut)
def get_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonOut:
    lesson = get_lesson_or_404(db, lesson_id, current_user.id)
    student = (
        db.query(Student)
        .filter(Student.id == lesson.student_id, Student.owner_id == current_user.id)
        .first()
    )
    return apply_lesson_projection(lesson, student.name if student else None)


@router.post("", response_model=LessonOut, status_code=status.HTTP_201_CREATED)
def create_lesson(
    payload: LessonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonOut:
    student = (
        db.query(Student)
        .filter(Student.id == payload.student_id, Student.owner_id == current_user.id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    settings = db.query(Settings).filter(Settings.owner_id == current_user.id).first()
    tax_percent = settings.tax_percent_default if settings else 0.0
    lesson = Lesson(
        owner_id=current_user.id,
        student_id=payload.student_id,
        start_at=payload.start_at,
        duration_min=payload.duration_min,
        status=payload.status.value,
        topic=payload.topic,
        price=payload.price,
        tax_percent=tax_percent,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.patch("/{lesson_id}", response_model=LessonOut)
def update_lesson(
    lesson_id: int,
    payload: LessonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonOut:
    lesson = get_lesson_or_404(db, lesson_id, current_user.id)
    original_start_at = lesson.start_at
    updates = payload.model_dump(exclude_unset=True)
    apply_to_future = updates.pop("apply_to_future", False)

    student_id = updates.get("student_id")
    if student_id is not None:
        student = (
            db.query(Student)
            .filter(Student.id == student_id, Student.owner_id == current_user.id)
            .first()
        )
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    if "status" in updates and updates["status"] is not None:
        updates["status"] = updates["status"].value

    for field, value in updates.items():
        setattr(lesson, field, value)

    if apply_to_future and lesson.series_id:
        future_lessons = (
            db.query(Lesson)
            .filter(
                Lesson.owner_id == current_user.id,
                Lesson.series_id == lesson.series_id,
                Lesson.start_at > original_start_at,
            )
            .all()
        )
        future_shift = None
        if "start_at" in updates and updates["start_at"] is not None:
            future_shift = updates["start_at"] - original_start_at

        propagated_fields = {"student_id", "duration_min", "topic", "price"}
        for future_lesson in future_lessons:
            for field in propagated_fields:
                if field in updates:
                    setattr(future_lesson, field, updates[field])
            if future_shift is not None:
                future_lesson.start_at = future_lesson.start_at + future_shift

        series = (
            db.query(LessonSeries)
            .filter(LessonSeries.id == lesson.series_id, LessonSeries.owner_id == current_user.id)
            .first()
        )
        if series:
            for field in propagated_fields:
                if field in updates:
                    setattr(series, field, updates[field])
            if "start_at" in updates and updates["start_at"] is not None:
                series.weekday = updates["start_at"].weekday()
                series.time_of_day = updates["start_at"].timetz().replace(tzinfo=None)

    db.commit()
    db.refresh(lesson)
    student = (
        db.query(Student)
        .filter(Student.id == lesson.student_id, Student.owner_id == current_user.id)
        .first()
    )
    return apply_lesson_projection(lesson, student.name if student else None)


@router.post("/{lesson_id}/payment", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    lesson_id: int,
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentOut:
    lesson = get_lesson_or_404(db, lesson_id, current_user.id)
    if lesson.payment:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment already exists")
    payment = Payment(
        lesson_id=lesson.id,
        is_paid=payload.is_paid,
        paid_amount=payload.paid_amount,
        paid_at=payload.paid_at,
        is_transferred=payload.is_transferred,
        transferred_amount=payload.transferred_amount,
        transferred_at=payload.transferred_at,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.patch("/{lesson_id}/payment", response_model=PaymentOut)
def update_payment(
    lesson_id: int,
    payload: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentOut:
    lesson = get_lesson_or_404(db, lesson_id, current_user.id)
    payment = lesson.payment
    if not payment:
        payment = Payment(lesson_id=lesson.id)
        db.add(payment)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(payment, field, value)

    db.commit()
    db.refresh(payment)
    return payment


@router.post("/{lesson_id}/homework", response_model=HomeworkOut, status_code=status.HTTP_201_CREATED)
def create_homework(
    lesson_id: int,
    payload: HomeworkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HomeworkOut:
    lesson = get_lesson_or_404(db, lesson_id, current_user.id)
    if lesson.homework:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Homework already exists")
    homework = Homework(
        lesson_id=lesson.id,
        text=payload.text,
        link=payload.link,
        is_sent=payload.is_sent,
        sent_at=payload.sent_at,
    )
    db.add(homework)
    db.commit()
    db.refresh(homework)
    return homework


@router.patch("/{lesson_id}/homework", response_model=HomeworkOut)
def update_homework(
    lesson_id: int,
    payload: HomeworkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HomeworkOut:
    lesson = get_lesson_or_404(db, lesson_id, current_user.id)
    homework = lesson.homework
    if not homework:
        homework = Homework(lesson_id=lesson.id)
        db.add(homework)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(homework, field, value)

    db.commit()
    db.refresh(homework)
    return homework
