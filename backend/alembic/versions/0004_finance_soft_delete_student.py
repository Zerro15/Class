"""finance and student soft delete

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-04 02:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("price_per_hour", sa.Float(), nullable=True))
    op.add_column("students", sa.Column("is_active", sa.Boolean(), nullable=True))
    op.add_column("students", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_students_is_active"), "students", ["is_active"], unique=False)

    op.execute("UPDATE students SET price_per_hour = 0 WHERE price_per_hour IS NULL")
    op.execute("UPDATE students SET is_active = true WHERE is_active IS NULL")


def downgrade() -> None:
    op.drop_index(op.f("ix_students_is_active"), table_name="students")
    op.drop_column("students", "deleted_at")
    op.drop_column("students", "is_active")
    op.drop_column("students", "price_per_hour")
