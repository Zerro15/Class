from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field


class PaymentStatus(str, Enum):
    unpaid = "unpaid"
    paid = "paid"


class PaymentBase(BaseModel):
    amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    status: PaymentStatus = PaymentStatus.unpaid
    is_paid: bool = False
    paid_amount: float = Field(0, ge=0)
    paid_at: datetime | None = None


class PaymentCreate(BaseModel):
    amount: Decimal = Field(..., ge=0)


class PaymentUpdate(BaseModel):
    amount: Decimal | None = Field(None, ge=0)
    status: PaymentStatus | None = None
    is_paid: bool | None = None
    paid_amount: float | None = Field(None, ge=0)
    paid_at: datetime | None = None


class PaymentOut(PaymentBase):
    id: int
    lesson_id: int

    class Config:
        from_attributes = True
