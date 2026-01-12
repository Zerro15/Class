from datetime import datetime

from pydantic import BaseModel


class HomeworkBase(BaseModel):
    text: str | None = None
    link: str | None = None
    is_sent: bool = False
    sent_at: datetime | None = None


class HomeworkCreate(HomeworkBase):
    pass


class HomeworkUpdate(HomeworkBase):
    pass


class HomeworkOut(HomeworkBase):
    id: int
    lesson_id: int

    class Config:
        from_attributes = True
