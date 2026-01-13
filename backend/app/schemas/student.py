from datetime import datetime

from pydantic import BaseModel, Field


class StudentBase(BaseModel):
    name: str = Field(..., min_length=1)
    notes: str | None = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1)
    notes: str | None = None


class StudentOut(StudentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
