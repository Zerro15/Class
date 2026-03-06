from pydantic import BaseModel

from app.schemas.lesson import LessonOut


class DashboardLessonOut(LessonOut):
    is_paid: bool | None = None
    is_homework_sent: bool | None = None


class DashboardUpcoming(BaseModel):
    items: list[DashboardLessonOut]
