from datetime import date, datetime, time

from pydantic import BaseModel, Field


class LessonSeriesCreate(BaseModel):
    student_id: int
    weekday: int = Field(..., ge=0, le=6)
    time_of_day: time
    duration_min: int = Field(..., gt=0)
    topic: str | None = None
    price: float = Field(0, ge=0)
    is_active: bool = True


class LessonSeriesUpdate(BaseModel):
    student_id: int | None = None
    weekday: int | None = Field(None, ge=0, le=6)
    time_of_day: time | None = None
    duration_min: int | None = Field(None, gt=0)
    topic: str | None = None
    price: float | None = Field(None, ge=0)
    is_active: bool | None = None


class LessonSeriesOut(BaseModel):
    id: int
    owner_id: int
    student_id: int
    weekday: int
    time_of_day: time
    duration_min: int
    topic: str | None
    price: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplyScheduleRequest(BaseModel):
    week_start: date
    days: int = Field(7, gt=0, le=31)
    strategy: str = Field("skip_existing")


class ApplyScheduleResponse(BaseModel):
    created: int
    skipped: int


class SeriesPatchPayload(BaseModel):
    duration_min: int | None = Field(None, gt=0)
    topic: str | None = None
    price: float | None = Field(None, ge=0)


class ApplySeriesPatchRequest(BaseModel):
    from_start_at: datetime
    patch: SeriesPatchPayload
    also_update_series_template: bool = True


class ApplySeriesPatchResponse(BaseModel):
    updated_lessons: int
    series_updated: bool
