from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lesson import Lesson
from app.models.payment import Payment
from app.models.payment_transaction import PaymentTransaction
from app.models.student import Student
from app.models.user import User
from app.schemas.finance import FinanceSummaryOut, PaymentTransactionOut

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/summary", response_model=FinanceSummaryOut)
def finance_summary(
    month: str | None = Query(None, description="Формат YYYY-MM"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FinanceSummaryOut:
    if month:
        month_start = datetime.fromisoformat(f"{month}-01").replace(tzinfo=timezone.utc)
    else:
        now = datetime.now(timezone.utc)
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    # Без внешних зависимостей надёжнее явно вычислить границу месяца.
    if month_start.month == 12:
        month_end = datetime(month_start.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        month_end = datetime(month_start.year, month_start.month + 1, 1, tzinfo=timezone.utc)

    income_month = (
        db.query(func.coalesce(func.sum(PaymentTransaction.amount), 0.0))
        .filter(
            PaymentTransaction.owner_id == current_user.id,
            PaymentTransaction.paid_at >= month_start,
            PaymentTransaction.paid_at < month_end,
        )
        .scalar()
        or 0.0
    )

    unpaid_total = (
        db.query(func.coalesce(func.sum(Payment.amount - Payment.paid_amount), 0.0))
        .join(Lesson, Lesson.id == Payment.lesson_id)
        .join(Student, Student.id == Lesson.student_id)
        .filter(
            Lesson.owner_id == current_user.id,
            Student.is_active.is_(True),
            Payment.amount > Payment.paid_amount,
        )
        .scalar()
        or 0.0
    )

    rows = (
        db.query(PaymentTransaction, Student.name)
        .join(Student, Student.id == PaymentTransaction.student_id)
        .filter(PaymentTransaction.owner_id == current_user.id)
        .order_by(PaymentTransaction.paid_at.desc())
        .limit(100)
        .all()
    )

    payments = [
        PaymentTransactionOut(
            id=tx.id,
            student_id=tx.student_id,
            student_name=student_name,
            lesson_id=tx.lesson_id,
            amount=tx.amount,
            method=tx.method,
            comment=tx.comment,
            paid_at=tx.paid_at,
        )
        for tx, student_name in rows
    ]

    return FinanceSummaryOut(
        income_month=float(income_month),
        unpaid_total=float(unpaid_total),
        payments=payments,
    )
