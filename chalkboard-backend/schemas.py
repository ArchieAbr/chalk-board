"""Pydantic request and response models for the ChalkBoard API.

Shapes mirror Section 7 of Technical Spec.md with two MVP-driven additions:
- `difficulty_modifier` on holds, feeding `HoldQualityPenalty * w_2` in §8.
- `display_name`, `width_cm` and `height_cm` to support the palette UI and
  physically-scaled canvas render.

Asset IDs use the human-readable `CLMB-###` form rather than UUIDs.

Naming convention: `*Read` for ORM-backed read shapes (with `from_attributes`),
`*Create` for write payloads, `*Summary` for list responses, otherwise the
original spec names.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

GripType = Literal["Jug", "Crimp", "Sloper", "Pinch", "Foot"]

AssetId = Annotated[str, StringConstraints(pattern=r"^CLMB-\d{3}$")]


class HoldAssetRead(BaseModel):
    """A catalogue entry for a physical climbing hold."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    asset_id: AssetId
    display_name: str = Field(min_length=1, max_length=80)
    image_url: str
    grip_type: GripType
    base_colour: str
    difficulty_modifier: float = Field(ge=0.0)
    width_cm: float = Field(gt=0.0)
    height_cm: float = Field(gt=0.0)


class RouteHoldPlacement(BaseModel):
    """A single hold placed on the wall as part of a route."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    asset_id: AssetId
    grid_x: int
    grid_y: int
    rotation: int = Field(ge=0, le=359)
    is_start: bool = False
    is_finish: bool = False


class RouteCreate(BaseModel):
    """Payload for POST /api/routes."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)
    author_id: UUID
    grade: str = Field(min_length=1, max_length=10)
    holds: list[RouteHoldPlacement]


class RouteRead(BaseModel):
    """Canonical fetched route. Used for POST response and GET /api/routes/{id}."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    route_id: UUID
    name: str
    author_id: UUID
    grade: str
    created_at: datetime
    holds: list[RouteHoldPlacement]


class RouteSummary(BaseModel):
    """Lightweight summary for GET /api/routes listing."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    route_id: UUID
    name: str
    grade: str
    created_at: datetime
    hold_count: int


class BetaCalculateRequest(BaseModel):
    """Payload for POST /api/beta/calculate — transient hold array from the UI."""

    model_config = ConfigDict(extra="forbid")

    holds: list[RouteHoldPlacement]


class BetaPathwayNode(BaseModel):
    """One step of a calculated beta sequence."""

    model_config = ConfigDict(extra="forbid")

    grid_x: int
    grid_y: int


class BetaCalculateResponse(BaseModel):
    """Response for POST /api/beta/calculate."""

    model_config = ConfigDict(extra="forbid")

    pathway: list[BetaPathwayNode]
