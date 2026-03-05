"""add lesson series

Revision ID: 0007_add_lesson_series
Revises: 0006_add_archive_field_to_lesson
Create Date: 2026-03-05
"""

from alembic import op
import sqlalchemy as sa


revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lesson_series",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("time_of_day", sa.Time(), nullable=False),
        sa.Column("duration_min", sa.Integer(), nullable=False),
        sa.Column("topic", sa.String(length=255), nullable=True),
        sa.Column("price", sa.Float(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_lesson_series_owner_id", "lesson_series", ["owner_id"])
    op.create_index("ix_lesson_series_owner_weekday", "lesson_series", ["owner_id", "weekday"])

    op.add_column("lessons", sa.Column("series_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_lessons_series_id", "lessons", "lesson_series", ["series_id"], ["id"])
    op.create_index("ix_lessons_series_start", "lessons", ["series_id", "start_at"])


def downgrade() -> None:
    op.drop_index("ix_lessons_series_start", table_name="lessons")
    op.drop_constraint("fk_lessons_series_id", "lessons", type_="foreignkey")
    op.drop_column("lessons", "series_id")

    op.drop_index("ix_lesson_series_owner_weekday", table_name="lesson_series")
    op.drop_index("ix_lesson_series_owner_id", table_name="lesson_series")
    op.drop_table("lesson_series")
