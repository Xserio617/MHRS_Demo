"""add_doctor_application_fields

Revision ID: c5f2a4d11e2b
Revises: b9f2c1d4e8a1
Create Date: 2026-02-27 12:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c5f2a4d11e2b"
down_revision: Union[str, Sequence[str], None] = "b9f2c1d4e8a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("wants_doctor_role", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("doctor_application_status", sa.String(length=20), nullable=False, server_default="none"))
    op.add_column("users", sa.Column("preferred_hospital_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "preferred_hospital_id")
    op.drop_column("users", "doctor_application_status")
    op.drop_column("users", "wants_doctor_role")
