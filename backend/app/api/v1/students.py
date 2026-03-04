from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.models.homework import Homework
from app.models.lesson import Lesson
from app.models.payment import Payment
from app.models.payment_transaction import PaymentTransaction
from app.models.settings import Settings
from app.models.student import Student
from app.models.user import User
from app.schemas.finance import StudentBalanceOut
from app.schemas.homework import HomeworkStatus
from app.schemas.lesson import LessonWithRelationsOut, StudentLessonCreate
from app.schemas.payment import PaymentStatus
from app.schemas.student import StudentCreate, StudentOut, StudentUpdate

router = APIRouter(prefix="/students", tags=["students"])


@router.get("", response_model=list[StudentOut])
def list_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[StudentOut]:
    return (
        db.query(Student)
        .filter(Student.owner_id == current_user.id)
        .order_by(Student.created_at.desc())
        .all()
    )


@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentOut:
    student = Student(owner_id=current_user.id, name=payload.name, notes=payload.notes)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def _get_student_or_404(db: Session, student_id: int, owner_id: int) -> Student:
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.owner_id == owner_id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentOut:
    return _get_student_or_404(db, student_id, current_user.id)


@router.get("/{student_id}/balance", response_model=StudentBalanceOut)
def get_student_balance(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentBalanceOut:
    _get_student_or_404(db, student_id, current_user.id)
    total_price = (
        db.query(func.coalesce(func.sum(Lesson.price), 0.0))
        .filter(
            Lesson.owner_id == current_user.id,
            Lesson.student_id == student_id,
            Lesson.status != "canceled",
        )
        .scalar()
    )
    total_paid = (
        db.query(func.coalesce(func.sum(PaymentTransaction.amount), 0.0))
        .filter(
            PaymentTransaction.owner_id == current_user.id,
            PaymentTransaction.student_id == student_id,
        )
        .scalar()
    )
    return StudentBalanceOut(
        student_id=student_id,
        total_price=float(total_price or 0),
        total_paid=float(total_paid or 0),
        balance=float(total_price or 0) - float(total_paid or 0),
    )


@router.patch("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentOut:
    student = _get_student_or_404(db, student_id, current_user.id)
    if payload.name is not None:
        student.name = payload.name
    if payload.notes is not None:
        student.notes = payload.notes
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    student = _get_student_or_404(db, student_id, current_user.id)
    db.delete(student)
    db.commit()
    return None


@router.get("/{student_id}/lessons", response_model=list[LessonWithRelationsOut])
def list_student_lessons(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LessonWithRelationsOut]:
    _get_student_or_404(db, student_id, current_user.id)
    return (
        db.query(Lesson)
        .options(joinedload(Lesson.homework), joinedload(Lesson.payment))
        .filter(Lesson.student_id == student_id, Lesson.owner_id == current_user.id)
        .order_by(Lesson.start_at.desc())
        .all()
    )


@router.post("/{student_id}/lessons", response_model=LessonWithRelationsOut, status_code=status.HTTP_201_CREATED)
def create_student_lesson(
    student_id: int,
    payload: StudentLessonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonWithRelationsOut:
    _get_student_or_404(db, student_id, current_user.id)
    settings = db.query(Settings).filter(Settings.owner_id == current_user.id).first()
    tax_percent = settings.tax_percent_default if settings else 0.0

    lesson = Lesson(
        owner_id=current_user.id,
        student_id=student_id,
        start_at=payload.starts_at,
        duration_min=payload.duration_min,
        status="scheduled",
        topic=payload.topic,
        notes=payload.notes,
        tax_percent=tax_percent,
        price=float(payload.payment_amount or 0),
    )
    db.add(lesson)
    db.flush()

    if payload.homework_text:
        db.add(
            Homework(
                lesson_id=lesson.id,
                text=payload.homework_text,
                status=HomeworkStatus.assigned.value,
                is_sent=False,
            )
        )

    if payload.payment_amount is not None:
        db.add(
            Payment(
                lesson_id=lesson.id,
                amount=payload.payment_amount,
                status=PaymentStatus.unpaid.value,
                is_paid=False,
                paid_amount=0,
            )
        )

    db.commit()
    return (
        db.query(Lesson)
        .options(joinedload(Lesson.homework), joinedload(Lesson.payment))
        .filter(Lesson.id == lesson.id)
        .first()
    )
