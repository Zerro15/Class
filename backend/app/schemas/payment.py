from datetime import datetime

from pydantic import BaseModel, Field


class PaymentBase(BaseModel):
    is_paid: bool = False
    paid_amount: float = Field(0, ge=0)
    paid_at: datetime | None = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(PaymentBase):
    pass


class PaymentOut(PaymentBase):
    id: int
    lesson_id: int

    class Config:
        from_attributes = True
