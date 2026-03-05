"""add archive field to lesson

Revision ID: 0006
Revises: 0005
Create Date: 2026-03-05 00:05:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("lessons", sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false")))


def downgrade() -> None:
    op.drop_column("lessons", "is_archived")
