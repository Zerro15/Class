from datetime import datetime

from pydantic import BaseModel


class FinanceSummaryOut(BaseModel):
    income_paid: float
    debt_unpaid: float
    transferred_sum: float
    not_transferred_sum: float
    lessons_count: int


class FinanceItemOut(BaseModel):
    lesson_id: int
    student_id: int
    student_name: str
    start_at: datetime
    status: str
    topic: str | None
    price: float
    is_archived: bool
    is_paid: bool
    paid_amount: float
    paid_at: datetime | None
    is_transferred: bool
    transferred_amount: float
    transferred_at: datetime | None


class FinanceItemsOut(BaseModel):
    items: list[FinanceItemOut]
