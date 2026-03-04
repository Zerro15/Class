from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class HomeworkStatus(str, Enum):
    todo = "todo"
    done = "done"


class HomeworkBase(BaseModel):
    text: str | None = None
    link: str | None = None
    status: HomeworkStatus = HomeworkStatus.todo
    is_sent: bool = False
    sent_at: datetime | None = None


class HomeworkCreate(BaseModel):
    text: str = Field(..., min_length=1)


class HomeworkUpdate(BaseModel):
    text: str | None = None
    link: str | None = None
    status: HomeworkStatus | None = None
    is_sent: bool | None = None
    sent_at: datetime | None = None


class HomeworkOut(HomeworkBase):
    id: int
    lesson_id: int
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
