from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lesson import Lesson
from app.models.payment import Payment
from app.models.user import User
from app.schemas.finance import FinanceSummary
from app.schemas.payment import PaymentOut

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/summary", response_model=FinanceSummary)
def finance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FinanceSummary:
    total_lessons = (
        db.query(func.count(Lesson.id)).filter(Lesson.owner_id == current_user.id).scalar() or 0
    )
    total_revenue = (
        db.query(func.coalesce(func.sum(Lesson.price), 0.0))
        .filter(Lesson.owner_id == current_user.id)
        .scalar()
    )
    total_paid = (
        db.query(func.coalesce(func.sum(Payment.paid_amount), 0.0))
        .join(Lesson, Lesson.id == Payment.lesson_id)
        .filter(Lesson.owner_id == current_user.id, Payment.is_paid.is_(True))
        .scalar()
    )

    return FinanceSummary(
        total_lessons=int(total_lessons),
        total_revenue=float(total_revenue),
        total_paid=float(total_paid),
        total_outstanding=float(total_revenue) - float(total_paid),
    )


@router.get("/payments", response_model=list[PaymentOut])
def list_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PaymentOut]:
    return (
        db.query(Payment)
        .join(Lesson, Lesson.id == Payment.lesson_id)
        .filter(Lesson.owner_id == current_user.id)
        .order_by(Payment.id.desc())
        .all()
    )
