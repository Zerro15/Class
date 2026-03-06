"""add settings profile fields

Revision ID: 0007
Revises: 0006
Create Date: 2026-03-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("settings", sa.Column("default_lesson_duration_min", sa.Integer(), nullable=False, server_default="60"))
    op.add_column("settings", sa.Column("default_lesson_price", sa.Float(), nullable=False, server_default="0"))
    op.add_column("settings", sa.Column("workday_start", sa.String(length=5), nullable=False, server_default="09:00"))
    op.add_column("settings", sa.Column("workday_end", sa.String(length=5), nullable=False, server_default="18:00"))
    op.add_column("settings", sa.Column("week_start", sa.String(length=16), nullable=False, server_default="monday"))
    op.add_column("settings", sa.Column("timezone", sa.String(length=64), nullable=False, server_default="Europe/Moscow"))


def downgrade() -> None:
    op.drop_column("settings", "timezone")
    op.drop_column("settings", "week_start")
    op.drop_column("settings", "workday_end")
    op.drop_column("settings", "workday_start")
    op.drop_column("settings", "default_lesson_price")
    op.drop_column("settings", "default_lesson_duration_min")
