from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


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
    price: float = Field(0, ge=0)


class LessonCreate(LessonBase):
    pass


class LessonUpdate(BaseModel):
    start_at: datetime | None = None
    duration_min: int | None = Field(None, gt=0)
    status: LessonStatus | None = None
    topic: str | None = None
    price: float | None = Field(None, ge=0)


class LessonOut(BaseModel):
    id: int
    student_id: int
    start_at: datetime
    duration_min: int
    status: LessonStatus
    topic: str | None
    price: float
    tax_percent: float

    class Config:
        from_attributes = True
