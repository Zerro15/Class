from datetime import date, datetime, time

from pydantic import BaseModel, Field


class LessonSeriesBase(BaseModel):
    student_id: int
    weekday: int = Field(..., ge=0, le=6)
    start_time: time
    duration_min: int = Field(..., gt=0, le=240)
    topic: str | None = None
    price: float = Field(0, ge=0)
    start_date: date
    end_date: date | None = None


class LessonSeriesCreate(LessonSeriesBase):
    pass


class LessonSeriesUpdate(BaseModel):
    weekday: int | None = Field(None, ge=0, le=6)
    start_time: time | None = None
    duration_min: int | None = Field(None, gt=0, le=240)
    topic: str | None = None
    price: float | None = Field(None, ge=0)
    start_date: date | None = None
    end_date: date | None = None
    apply_to_future: bool = False


class LessonSeriesOut(LessonSeriesBase):
    id: int
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True
