from pydantic import BaseModel, Field


class SettingsBase(BaseModel):
    default_lesson_duration_min: int = Field(60, ge=15, le=240)
    default_lesson_price: float = Field(0, ge=0)
    workday_start: str = Field("09:00", min_length=5, max_length=5)
    workday_end: str = Field("18:00", min_length=5, max_length=5)
    week_start: str = Field("monday")
    timezone: str = Field("Europe/Moscow")


class SettingsUpdate(SettingsBase):
    pass


class SettingsOut(SettingsBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True
