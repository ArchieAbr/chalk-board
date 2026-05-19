"""SQLAlchemy ORM models mirroring Section 6 of Technical Spec.md.

Deviation from spec: `asset_id` is `VARCHAR(16)` not `UUID` — we use the
human-readable `CLMB-###` form (e.g. `CLMB-007`) instead of UUIDs. Frontend
displays asset IDs to users; readability wins over UUID generality.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)


class HoldAsset(Base):
    __tablename__ = "hold_assets"

    asset_id: Mapped[str] = mapped_column(String(16), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    image_url: Mapped[str] = mapped_column(String(255), nullable=False)
    grip_type: Mapped[str] = mapped_column(String(30), nullable=False)
    base_colour: Mapped[str] = mapped_column(String(20), nullable=False)
    difficulty_modifier: Mapped[float] = mapped_column(Float, nullable=False)
    width_cm: Mapped[float] = mapped_column(Float, nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, nullable=False)


class Route(Base):
    __tablename__ = "routes"

    route_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    author_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.user_id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    grade: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    holds: Mapped[list["RouteHold"]] = relationship(
        back_populates="route",
        cascade="all, delete-orphan",
        order_by="RouteHold.placement_id",
    )


class RouteHold(Base):
    __tablename__ = "route_holds"
    __table_args__ = (
        CheckConstraint("rotation BETWEEN 0 AND 359", name="rotation_range"),
    )

    placement_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    route_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("routes.route_id", ondelete="CASCADE"),
        nullable=False,
    )
    asset_id: Mapped[str] = mapped_column(
        String(16), ForeignKey("hold_assets.asset_id"), nullable=False
    )
    grid_x: Mapped[int] = mapped_column(Integer, nullable=False)
    grid_y: Mapped[int] = mapped_column(Integer, nullable=False)
    rotation: Mapped[int] = mapped_column(Integer, nullable=False)
    is_start: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_finish: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    route: Mapped[Route] = relationship(back_populates="holds")
