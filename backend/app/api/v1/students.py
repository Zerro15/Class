from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lesson import Lesson
from app.models.payment import Payment
from app.models.student import Student
from app.models.user import User
from app.schemas.finance import StudentBalance
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


@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentOut:
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.owner_id == current_user.id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


@router.patch("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentOut:
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.owner_id == current_user.id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
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
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.owner_id == current_user.id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    db.delete(student)
    db.commit()
    return None


@router.get("/{student_id}/balance", response_model=StudentBalance)
def get_student_balance(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentBalance:
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.owner_id == current_user.id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    billed = (
        db.query(func.coalesce(func.sum(Lesson.price), 0.0))
        .filter(Lesson.student_id == student_id, Lesson.owner_id == current_user.id)
        .scalar()
    )
    paid = (
        db.query(func.coalesce(func.sum(Payment.paid_amount), 0.0))
        .join(Lesson, Lesson.id == Payment.lesson_id)
        .filter(
            Lesson.student_id == student_id,
            Lesson.owner_id == current_user.id,
            Payment.is_paid.is_(True),
        )
        .scalar()
    )

    balance = float(billed) - float(paid)
    return StudentBalance(
        student_id=student_id,
        total_billed=float(billed),
        total_paid=float(paid),
        balance=balance,
    )
