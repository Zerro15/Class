"""tutor workflow quality updates

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-04 01:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lesson_reschedules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("old_start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("new_start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column("notify_student", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
    )
    op.create_index(op.f("ix_lesson_reschedules_lesson_id"), "lesson_reschedules", ["lesson_id"], unique=False)

    op.create_table(
        "payment_transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("method", sa.String(length=32), nullable=False),
        sa.Column("comment", sa.String(length=500), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
    )
    op.create_index(op.f("ix_payment_transactions_owner_id"), "payment_transactions", ["owner_id"], unique=False)
    op.create_index(op.f("ix_payment_transactions_student_id"), "payment_transactions", ["student_id"], unique=False)
    op.create_index(op.f("ix_payment_transactions_lesson_id"), "payment_transactions", ["lesson_id"], unique=False)

    op.execute("UPDATE lessons SET status = 'completed' WHERE status = 'done'")
    op.execute("UPDATE homeworks SET status = 'reviewed' WHERE status = 'done'")
    op.execute("UPDATE homeworks SET status = 'assigned' WHERE status = 'todo'")


def downgrade() -> None:
    op.execute("UPDATE lessons SET status = 'done' WHERE status = 'completed'")
    op.execute("UPDATE homeworks SET status = 'done' WHERE status = 'reviewed'")
    op.execute("UPDATE homeworks SET status = 'todo' WHERE status = 'assigned'")
    op.drop_index(op.f("ix_payment_transactions_lesson_id"), table_name="payment_transactions")
    op.drop_index(op.f("ix_payment_transactions_student_id"), table_name="payment_transactions")
    op.drop_index(op.f("ix_payment_transactions_owner_id"), table_name="payment_transactions")
    op.drop_table("payment_transactions")
    op.drop_index(op.f("ix_lesson_reschedules_lesson_id"), table_name="lesson_reschedules")
    op.drop_table("lesson_reschedules")
