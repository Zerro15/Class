from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lesson import Lesson
from app.models.payment import Payment
from app.models.payment_transaction import PaymentTransaction
from app.models.student import Student
from app.models.user import User
from app.schemas.finance import PaymentTransactionCreate, PaymentTransactionOut
from app.schemas.payment import PaymentStatus

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("", response_model=PaymentTransactionOut, status_code=status.HTTP_201_CREATED)
def create_payment_transaction(
    payload: PaymentTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentTransactionOut:
    student = (
        db.query(Student)
        .filter(Student.id == payload.student_id, Student.owner_id == current_user.id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    lesson: Lesson | None = None
    if payload.lesson_id is not None:
        lesson = (
            db.query(Lesson)
            .filter(
                Lesson.id == payload.lesson_id,
                Lesson.owner_id == current_user.id,
                Lesson.student_id == payload.student_id,
            )
            .first()
        )
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    tx = PaymentTransaction(
        owner_id=current_user.id,
        student_id=payload.student_id,
        lesson_id=payload.lesson_id,
        amount=payload.amount,
        method=payload.method,
        comment=payload.comment,
        paid_at=payload.paid_at or datetime.now(timezone.utc),
    )
    db.add(tx)

    if lesson is not None:
        payment = db.query(Payment).filter(Payment.lesson_id == lesson.id).first()
        if not payment:
            payment = Payment(lesson_id=lesson.id, amount=lesson.price, paid_amount=0)
            db.add(payment)
            db.flush()

        payment.paid_amount = float(payment.paid_amount or 0) + payload.amount
        target = float(payment.amount or lesson.price)
        if payment.paid_amount <= 0:
            payment.status = PaymentStatus.unpaid.value
            payment.is_paid = False
        elif payment.paid_amount < target:
            payment.status = PaymentStatus.partial.value
            payment.is_paid = False
        else:
            payment.status = PaymentStatus.paid.value
            payment.is_paid = True
        payment.paid_at = tx.paid_at

    db.commit()
    db.refresh(tx)
    return tx
