"""add lesson series

Revision ID: 0007
Revises: 0006
Create Date: 2026-03-06 00:00:00.000000
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
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("duration_min", sa.Integer(), nullable=False),
        sa.Column("topic", sa.String(length=255), nullable=True),
        sa.Column("price", sa.Float(), nullable=False, server_default="0"),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
    )
    op.create_index(op.f("ix_lesson_series_owner_id"), "lesson_series", ["owner_id"], unique=False)
    op.create_index(op.f("ix_lesson_series_student_id"), "lesson_series", ["student_id"], unique=False)

    op.add_column("lessons", sa.Column("series_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_lessons_series_id"), "lessons", ["series_id"], unique=False)
    op.create_foreign_key("fk_lessons_series_id_lesson_series", "lessons", "lesson_series", ["series_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_lessons_series_id_lesson_series", "lessons", type_="foreignkey")
    op.drop_index(op.f("ix_lessons_series_id"), table_name="lessons")
    op.drop_column("lessons", "series_id")

    op.drop_index(op.f("ix_lesson_series_student_id"), table_name="lesson_series")
    op.drop_index(op.f("ix_lesson_series_owner_id"), table_name="lesson_series")
    op.drop_table("lesson_series")
