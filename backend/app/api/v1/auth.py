from collections import defaultdict, deque
from time import monotonic

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.settings import Settings
from app.models.user import User
from app.schemas.auth import Token, UserCreate, UserOut
from app.core.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])

_failed_login_attempts: defaultdict[str, deque[float]] = defaultdict(deque)


def _enforce_login_rate_limit(request: Request, email: str) -> None:
    settings = get_settings()
    limit = settings.login_rate_limit_attempts
    window = settings.login_rate_limit_window_seconds
    if limit <= 0 or window <= 0:
        return

    client_ip = request.client.host if request.client else "unknown"
    key = f"{client_ip}:{email.lower()}"
    timestamps = _failed_login_attempts[key]
    cutoff = monotonic() - window

    while timestamps and timestamps[0] < cutoff:
        timestamps.popleft()

    if len(timestamps) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
        )


def _record_failed_login(request: Request, email: str) -> None:
    client_ip = request.client.host if request.client else "unknown"
    key = f"{client_ip}:{email.lower()}"
    _failed_login_attempts[key].append(monotonic())


def _clear_failed_logins(request: Request, email: str) -> None:
    client_ip = request.client.host if request.client else "unknown"
    key = f"{client_ip}:{email.lower()}"
    _failed_login_attempts.pop(key, None)


@router.post("/register", response_model=Token)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.flush()
    settings = Settings(owner_id=user.id, tax_percent_default=get_settings().tax_percent_default)
    db.add(settings)
    db.commit()
    token = create_access_token(str(user.id))
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(payload: UserCreate, request: Request, db: Session = Depends(get_db)) -> Token:
    _enforce_login_rate_limit(request, payload.email)
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        _record_failed_login(request, payload.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    _clear_failed_logins(request, payload.email)
    token = create_access_token(str(user.id))
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return current_user
