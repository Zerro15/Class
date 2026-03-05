from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lesson import Lesson
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import PaymentOut

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("", response_model=list[PaymentOut])
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
