from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lesson import Lesson
from app.models.payment import Payment
from app.models.student import Student
from app.models.user import User
from app.schemas.finance import FinanceItemOut, FinanceItemsOut, FinanceSummaryOut

router = APIRouter(prefix="/finance", tags=["finance"])


def apply_finance_filters(
    query,
    current_user: User,
    from_date: datetime | None,
    to_date: datetime | None,
    student_id: int | None,
    paid: bool | None,
    transferred: bool | None,
    archived: bool | None,
):
    query = query.filter(Lesson.owner_id == current_user.id)
    if from_date:
        query = query.filter(Lesson.start_at >= from_date)
    if to_date:
        query = query.filter(Lesson.start_at <= to_date)
    if student_id:
        query = query.filter(Lesson.student_id == student_id)
    if paid is not None:
        query = query.filter(Payment.is_paid == paid)
    if transferred is not None:
        query = query.filter(Payment.is_transferred == transferred)
    if archived is not None:
        query = query.filter(Lesson.is_archived == archived)
    return query


@router.get("/summary", response_model=FinanceSummaryOut)
def get_finance_summary(
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    student_id: int | None = None,
    paid: bool | None = None,
    transferred: bool | None = None,
    archived: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FinanceSummaryOut:
    query = db.query(Lesson, Payment).join(Student, Lesson.student_id == Student.id).outerjoin(Payment, Payment.lesson_id == Lesson.id)
    query = apply_finance_filters(query, current_user, from_date, to_date, student_id, paid, transferred, archived)

    rows = query.all()
    income_paid = 0.0
    debt_unpaid = 0.0
    transferred_sum = 0.0
    not_transferred_sum = 0.0

    for lesson, payment in rows:
        payment_amount = payment.paid_amount if payment and payment.is_paid else 0.0
        if payment and payment.is_paid:
            income_paid += payment_amount
            if payment.is_transferred:
                transferred_sum += payment.transferred_amount or payment_amount
            else:
                not_transferred_sum += payment_amount
        else:
            debt_unpaid += lesson.price

    return FinanceSummaryOut(
        income_paid=round(income_paid, 2),
        debt_unpaid=round(debt_unpaid, 2),
        transferred_sum=round(transferred_sum, 2),
        not_transferred_sum=round(not_transferred_sum, 2),
        lessons_count=len(rows),
    )


@router.get("/items", response_model=FinanceItemsOut)
def get_finance_items(
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    student_id: int | None = None,
    paid: bool | None = None,
    transferred: bool | None = None,
    archived: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FinanceItemsOut:
    query = db.query(Lesson, Student, Payment).join(Student, Lesson.student_id == Student.id).outerjoin(Payment, Payment.lesson_id == Lesson.id)
    query = apply_finance_filters(query, current_user, from_date, to_date, student_id, paid, transferred, archived)
    rows = query.order_by(Lesson.start_at.desc()).all()

    items = []
    for lesson, student, payment in rows:
        items.append(
            FinanceItemOut(
                lesson_id=lesson.id,
                student_id=student.id,
                student_name=student.name,
                start_at=lesson.start_at,
                status=lesson.status,
                topic=lesson.topic,
                price=lesson.price,
                is_archived=lesson.is_archived,
                is_paid=payment.is_paid if payment else False,
                paid_amount=payment.paid_amount if payment else 0.0,
                paid_at=payment.paid_at if payment else None,
                is_transferred=payment.is_transferred if payment else False,
                transferred_amount=payment.transferred_amount if payment else 0.0,
                transferred_at=payment.transferred_at if payment else None,
            )
        )

    return FinanceItemsOut(items=items)
