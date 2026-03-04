from datetime import datetime

from pydantic import BaseModel, Field


class StudentBase(BaseModel):
    name: str = Field(..., min_length=1)
    notes: str | None = None
    price_per_hour: float = Field(0, ge=0)


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1)
    notes: str | None = None
    price_per_hour: float | None = Field(None, ge=0)


class StudentOut(StudentBase):
    id: int
    is_active: bool
    deleted_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True
