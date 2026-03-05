"""add_doctor_type_shift_fields

Revision ID: f1a2b3c4d5e6
Revises: d4e6a7b9c001
Create Date: 2026-03-05 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "d4e6a7b9c001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("doctors", sa.Column("doctor_type", sa.String(length=20), nullable=False, server_default="tam"))
    op.add_column("doctors", sa.Column("shift_start", sa.String(length=5), nullable=False, server_default="08:30"))
    op.add_column("doctors", sa.Column("shift_end", sa.String(length=5), nullable=False, server_default="17:00"))


def downgrade() -> None:
    op.drop_column("doctors", "shift_end")
    op.drop_column("doctors", "shift_start")
    op.drop_column("doctors", "doctor_type")
