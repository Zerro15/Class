"""initial

Revision ID: 0001
Revises: 
Create Date: 2024-01-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("tax_percent_default", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
    )

    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
    )
    op.create_index(op.f("ix_students_owner_id"), "students", ["owner_id"], unique=False)

    op.create_table(
        "lessons",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_min", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("topic", sa.String(length=255), nullable=True),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("tax_percent", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
    )
    op.create_index(op.f("ix_lessons_owner_id"), "lessons", ["owner_id"], unique=False)
    op.create_index(op.f("ix_lessons_student_id"), "lessons", ["student_id"], unique=False)
    op.create_index(op.f("ix_lessons_start_at"), "lessons", ["start_at"], unique=False)

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lesson_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("is_paid", sa.Boolean(), nullable=False),
        sa.Column("paid_amount", sa.Float(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
    )

    op.create_table(
        "homeworks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lesson_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("text", sa.String(length=1000), nullable=True),
        sa.Column("link", sa.String(length=500), nullable=True),
        sa.Column("is_sent", sa.Boolean(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
    )


def downgrade() -> None:
    op.drop_table("homeworks")
    op.drop_table("payments")
    op.drop_index(op.f("ix_lessons_start_at"), table_name="lessons")
    op.drop_index(op.f("ix_lessons_student_id"), table_name="lessons")
    op.drop_index(op.f("ix_lessons_owner_id"), table_name="lessons")
    op.drop_table("lessons")
    op.drop_index(op.f("ix_students_owner_id"), table_name="students")
    op.drop_table("students")
    op.drop_table("settings")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
