from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.homework import HomeworkOut
from app.schemas.payment import PaymentOut


class LessonStatus(str, Enum):
    scheduled = "scheduled"
    done = "done"
    canceled = "canceled"


class LessonBase(BaseModel):
    student_id: int
    start_at: datetime
    duration_min: int = Field(..., gt=0)
    status: LessonStatus = LessonStatus.scheduled
    topic: str | None = None
    notes: str | None = None
    price: float = Field(0, ge=0)


class LessonCreate(LessonBase):
    pass


class StudentLessonCreate(BaseModel):
    # На клиенте используем starts_at, чтобы не путать с внутренним start_at.
    starts_at: datetime
    topic: str = Field(..., min_length=1)
    notes: str | None = None
    duration_min: int = Field(60, gt=0)
    homework_text: str | None = None
    payment_amount: float | None = Field(None, ge=0)


class LessonUpdate(BaseModel):
    start_at: datetime | None = None
    starts_at: datetime | None = None
    duration_min: int | None = Field(None, gt=0)
    status: LessonStatus | None = None
    topic: str | None = None
    notes: str | None = None
    price: float | None = Field(None, ge=0)


class LessonOut(BaseModel):
    id: int
    student_id: int
    start_at: datetime
    duration_min: int
    status: LessonStatus
    topic: str | None
    notes: str | None
    price: float
    tax_percent: float

    class Config:
        from_attributes = True


class LessonWithRelationsOut(LessonOut):
    homework: HomeworkOut | None = None
    payment: PaymentOut | None = None
