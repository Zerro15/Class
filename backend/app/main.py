from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, dashboard, lessons, payments, students
from app.core.config import get_settings

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
app.include_router(payments.router, prefix=settings.api_v1_prefix)
app.include_router(dashboard.router, prefix=settings.api_v1_prefix)


@app.get(f"{settings.api_v1_prefix}/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
