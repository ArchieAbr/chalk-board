"""Pydantic request and response models for the ChalkBoard API.

Shapes mirror Section 7 of Technical Spec.md with two MVP-driven additions:
- `difficulty_modifier` on holds, feeding `HoldQualityPenalty * w_2` in §8.
- `display_name`, `width_cm` and `height_cm` to support the palette UI and
  physically-scaled canvas render.

Asset IDs use the human-readable `CLMB-###` form rather than UUIDs.
"""

from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

GripType = Literal["Jug", "Crimp", "Sloper", "Pinch", "Foot"]

AssetId = Annotated[str, StringConstraints(pattern=r"^CLMB-\d{3}$")]


class HoldAsset(BaseModel):
    """A catalogue entry for a physical climbing hold."""

    model_config = ConfigDict(extra="forbid")

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

    model_config = ConfigDict(extra="forbid")

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


class RouteCreated(BaseModel):
    """Response for POST /api/routes — echoes the submitted route with a fresh id."""

    model_config = ConfigDict(extra="forbid")

    route_id: UUID
    name: str
    author_id: UUID
    grade: str
    holds: list[RouteHoldPlacement]


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
