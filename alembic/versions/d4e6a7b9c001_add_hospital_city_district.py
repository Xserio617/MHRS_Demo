"""add_hospital_city_district

Revision ID: d4e6a7b9c001
Revises: c5f2a4d11e2b
Create Date: 2026-02-27 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4e6a7b9c001"
down_revision: Union[str, Sequence[str], None] = "c5f2a4d11e2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("hospitals", sa.Column("city", sa.String(length=100), nullable=False, server_default="Bilinmiyor"))
    op.add_column("hospitals", sa.Column("district", sa.String(length=100), nullable=False, server_default="Bilinmiyor"))
    op.create_index("ix_hospitals_city", "hospitals", ["city"], unique=False)
    op.create_index("ix_hospitals_district", "hospitals", ["district"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_hospitals_district", table_name="hospitals")
    op.drop_index("ix_hospitals_city", table_name="hospitals")
    op.drop_column("hospitals", "district")
    op.drop_column("hospitals", "city")
