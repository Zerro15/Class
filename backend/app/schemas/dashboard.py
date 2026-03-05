from pydantic import BaseModel

from app.schemas.lesson import LessonOut


class DashboardUpcoming(BaseModel):
    items: list[LessonOut]
