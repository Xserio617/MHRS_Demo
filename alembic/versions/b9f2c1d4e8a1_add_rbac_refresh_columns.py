"""add_rbac_refresh_columns

Revision ID: b9f2c1d4e8a1
Revises: ad63ff9bd26c
Create Date: 2026-02-24 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b9f2c1d4e8a1"
down_revision: Union[str, Sequence[str], None] = "ad63ff9bd26c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("refresh_token_hash", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("refresh_token_expires_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "refresh_token_expires_at")
    op.drop_column("users", "refresh_token_hash")
    op.drop_column("users", "is_admin")
