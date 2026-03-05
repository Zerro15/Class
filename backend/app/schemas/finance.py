from pydantic import BaseModel


class FinanceSummary(BaseModel):
    total_lessons: int
    total_revenue: float
    total_paid: float
    total_outstanding: float


class StudentBalance(BaseModel):
    student_id: int
    total_billed: float
    total_paid: float
    balance: float
