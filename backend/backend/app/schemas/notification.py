from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    type: str
    message: str
    sent_via: str
    sent_at: datetime | None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    student_id: int
    lesson_id: int | None = None
    type: Literal["reminder", "homework_due", "cancellation"]
    message: str
    sent_via: Literal["email", "sms", "push"]


class NotificationUpdate(BaseModel):
    is_read: bool | None = None