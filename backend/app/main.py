from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    auth,
    dashboard,
    finance,
    lesson_series,
    lessons,
    notifications,
    settings as settings_router,
    students,
)
from app.core.config import get_settings


# Импорт Celery app для задач
import sys
sys.path.append('/app')


settings = get_settings()

app = FastAPI(title="ClassFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(students.router, prefix=settings.api_v1_prefix)
app.include_router(lessons.router, prefix=settings.api_v1_prefix)
app.include_router(dashboard.router, prefix=settings.api_v1_prefix)
app.include_router(finance.router, prefix=settings.api_v1_prefix)
app.include_router(settings_router.router, prefix=settings.api_v1_prefix)
app.include_router(lesson_series.router, prefix=settings.api_v1_prefix)
app.include_router(lesson_series.schedule_router, prefix=settings.api_v1_prefix)
app.include_router(notifications.router, prefix=settings.api_v1_prefix)


@app.get(f"{settings.api_v1_prefix}/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
