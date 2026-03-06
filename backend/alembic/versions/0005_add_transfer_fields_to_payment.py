"""add transfer fields to payment

Revision ID: 0005
Revises: 0004
Create Date: 2026-03-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("is_transferred", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("payments", sa.Column("transferred_amount", sa.Float(), nullable=False, server_default="0"))
    op.add_column("payments", sa.Column("transferred_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("payments", "transferred_at")
    op.drop_column("payments", "transferred_amount")
    op.drop_column("payments", "is_transferred")
