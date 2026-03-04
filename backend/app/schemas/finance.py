from datetime import datetime

from pydantic import BaseModel, Field


class PaymentTransactionCreate(BaseModel):
    student_id: int
    lesson_id: int | None = None
    amount: float = Field(..., gt=0)
    method: str = Field("перевод", min_length=1, max_length=32)
    comment: str | None = Field(default=None, max_length=500)
    paid_at: datetime | None = None


class PaymentTransactionOut(BaseModel):
    id: int
    student_id: int
    student_name: str | None = None
    lesson_id: int | None
    amount: float
    method: str
    comment: str | None
    paid_at: datetime

    class Config:
        from_attributes = True


class StudentBalanceOut(BaseModel):
    student_id: int
    charged_total: float
    paid_total: float
    debt: float


class DashboardSummaryOut(BaseModel):
    upcoming_count: int
    today_count: int
    unpaid_total: float


class FinanceSummaryOut(BaseModel):
    income_month: float
    unpaid_total: float
    payments: list[PaymentTransactionOut]
