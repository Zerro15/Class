"""tutor workflow mvp fields

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-04 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("lessons", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column("homeworks", sa.Column("status", sa.String(length=16), nullable=True))
    op.add_column("homeworks", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payments", sa.Column("amount", sa.Numeric(10, 2), nullable=True))
    op.add_column("payments", sa.Column("status", sa.String(length=16), nullable=True))

    op.execute("UPDATE homeworks SET status = CASE WHEN is_sent THEN 'done' ELSE 'todo' END")
    op.execute("UPDATE payments SET status = CASE WHEN is_paid THEN 'paid' ELSE 'unpaid' END")
    op.execute("UPDATE payments SET amount = COALESCE(paid_amount, 0)")


def downgrade() -> None:
    op.drop_column("payments", "status")
    op.drop_column("payments", "amount")
    op.drop_column("homeworks", "updated_at")
    op.drop_column("homeworks", "status")
    op.drop_column("lessons", "notes")
