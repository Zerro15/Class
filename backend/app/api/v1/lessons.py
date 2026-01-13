from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.homework import Homework
from app.models.lesson import Lesson
from app.models.payment import Payment
from app.models.settings import Settings
from app.models.student import Student
from app.models.user import User
from app.schemas.homework import HomeworkCreate, HomeworkOut, HomeworkUpdate
from app.schemas.lesson import LessonCreate, LessonOut, LessonUpdate
from app.schemas.payment import PaymentCreate, PaymentOut, PaymentUpdate

router = APIRouter(prefix="/lessons", tags=["lessons"])


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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LessonOut]:
    query = db.query(Lesson).filter(Lesson.owner_id == current_user.id)
    if from_date:
        query = query.filter(Lesson.start_at >= from_date)
    if to_date:
        query = query.filter(Lesson.start_at <= to_date)
    return query.order_by(Lesson.start_at.asc()).all()


@router.get("/{lesson_id}", response_model=LessonOut)
def get_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonOut:
    return get_lesson_or_404(db, lesson_id, current_user.id)


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
    if payload.start_at is not None:
        lesson.start_at = payload.start_at
    if payload.duration_min is not None:
        lesson.duration_min = payload.duration_min
    if payload.status is not None:
        lesson.status = payload.status.value
    if payload.topic is not None:
        lesson.topic = payload.topic
    if payload.price is not None:
        lesson.price = payload.price
    db.commit()
    db.refresh(lesson)
    return lesson


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
    payment.is_paid = payload.is_paid
    payment.paid_amount = payload.paid_amount
    payment.paid_at = payload.paid_at
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
    homework.text = payload.text
    homework.link = payload.link
    homework.is_sent = payload.is_sent
    homework.sent_at = payload.sent_at
    db.commit()
    db.refresh(homework)
    return homework
