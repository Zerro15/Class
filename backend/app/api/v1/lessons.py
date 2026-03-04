from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.models.homework import Homework
from app.models.lesson import Lesson
from app.models.payment import Payment
from app.models.settings import Settings
from app.models.student import Student
from app.models.user import User
from app.schemas.homework import HomeworkCreate, HomeworkOut, HomeworkStatus, HomeworkUpdate
from app.schemas.lesson import LessonCreate, LessonOut, LessonUpdate, LessonWithRelationsOut
from app.schemas.payment import PaymentCreate, PaymentOut, PaymentStatus, PaymentUpdate

router = APIRouter(prefix="/lessons", tags=["lessons"])


def get_lesson_or_404(db: Session, lesson_id: int, owner_id: int) -> Lesson:
    lesson = (
        db.query(Lesson)
        .options(joinedload(Lesson.homework), joinedload(Lesson.payment))
        .filter(Lesson.id == lesson_id, Lesson.owner_id == owner_id)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return lesson


def get_student_or_404(db: Session, student_id: int, owner_id: int) -> Student:
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.owner_id == owner_id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


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


@router.get("/{lesson_id}", response_model=LessonWithRelationsOut)
def get_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonWithRelationsOut:
    return get_lesson_or_404(db, lesson_id, current_user.id)


@router.post("", response_model=LessonOut, status_code=status.HTTP_201_CREATED)
def create_lesson(
    payload: LessonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonOut:
    get_student_or_404(db, payload.student_id, current_user.id)
    settings = db.query(Settings).filter(Settings.owner_id == current_user.id).first()
    tax_percent = settings.tax_percent_default if settings else 0.0
    lesson = Lesson(
        owner_id=current_user.id,
        student_id=payload.student_id,
        start_at=payload.start_at,
        duration_min=payload.duration_min,
        status=payload.status.value,
        topic=payload.topic,
        notes=payload.notes,
        price=payload.price,
        tax_percent=tax_percent,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.patch("/{lesson_id}", response_model=LessonWithRelationsOut)
def update_lesson(
    lesson_id: int,
    payload: LessonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonWithRelationsOut:
    lesson = get_lesson_or_404(db, lesson_id, current_user.id)
    if payload.start_at is not None:
        lesson.start_at = payload.start_at
    if payload.starts_at is not None:
        lesson.start_at = payload.starts_at
    if payload.duration_min is not None:
        lesson.duration_min = payload.duration_min
    if payload.status is not None:
        lesson.status = payload.status.value
    if payload.topic is not None:
        lesson.topic = payload.topic
    if payload.notes is not None:
        lesson.notes = payload.notes
    if payload.price is not None:
        lesson.price = payload.price
    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    lesson = get_lesson_or_404(db, lesson_id, current_user.id)
    # Явно удаляем дочерние сущности: так безопаснее для разных БД/настроек FK.
    if lesson.homework:
        db.delete(lesson.homework)
    if lesson.payment:
        db.delete(lesson.payment)
    db.delete(lesson)
    db.commit()
    return None


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
        amount=Decimal(payload.amount),
        status=PaymentStatus.unpaid.value,
        is_paid=False,
        paid_amount=float(payload.amount),
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
    if payload.amount is not None:
        payment.amount = Decimal(payload.amount)
    if payload.status is not None:
        payment.status = payload.status.value
        payment.is_paid = payload.status is PaymentStatus.paid
    if payload.is_paid is not None:
        payment.is_paid = payload.is_paid
        payment.status = PaymentStatus.paid.value if payload.is_paid else PaymentStatus.unpaid.value
    if payload.paid_amount is not None:
        payment.paid_amount = payload.paid_amount
    if payload.paid_at is not None:
        payment.paid_at = payload.paid_at
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/{lesson_id}/payment/paid", response_model=PaymentOut)
def mark_payment_paid(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentOut:
    lesson = get_lesson_or_404(db, lesson_id, current_user.id)
    payment = lesson.payment
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    payment.status = PaymentStatus.paid.value
    payment.is_paid = True
    payment.paid_at = datetime.now(timezone.utc)
    if payment.paid_amount == 0:
        payment.paid_amount = float(payment.amount)
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
        status=HomeworkStatus.todo.value,
        is_sent=False,
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
    if payload.text is not None:
        homework.text = payload.text
    if payload.link is not None:
        homework.link = payload.link
    if payload.status is not None:
        homework.status = payload.status.value
        homework.is_sent = payload.status is HomeworkStatus.done
    if payload.is_sent is not None:
        homework.is_sent = payload.is_sent
        homework.status = HomeworkStatus.done.value if payload.is_sent else HomeworkStatus.todo.value
    if payload.sent_at is not None:
        homework.sent_at = payload.sent_at
    db.commit()
    db.refresh(homework)
    return homework


@router.post("/{lesson_id}/homework/done", response_model=HomeworkOut)
def mark_homework_done(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HomeworkOut:
    lesson = get_lesson_or_404(db, lesson_id, current_user.id)
    homework = lesson.homework
    if not homework:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Homework not found")
    homework.status = HomeworkStatus.done.value
    homework.is_sent = True
    homework.sent_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(homework)
    return homework
