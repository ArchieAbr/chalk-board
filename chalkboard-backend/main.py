"""ChalkBoard API — FastAPI entry point.

Stub implementation of the endpoints described in Section 7 of
Technical Spec.md. Hold catalogue is loaded from `data/holds.json` at
startup; routes and beta pathfinding remain mock stubs until SQLAlchemy
(step 3) and the NetworkX pathfinder land.
"""

from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import TypeAdapter

from schemas import (
    BetaCalculateRequest,
    BetaCalculateResponse,
    BetaPathwayNode,
    HoldAsset,
    RouteCreate,
    RouteCreated,
)

HOLDS_DATA_PATH: Path = Path(__file__).parent / "data" / "holds.json"


def _load_holds() -> list[HoldAsset]:
    """Load and validate the hold catalogue from disk at startup."""
    raw: object = json.loads(HOLDS_DATA_PATH.read_text(encoding="utf-8"))
    return TypeAdapter(list[HoldAsset]).validate_python(raw)


HOLDS_CATALOGUE: list[HoldAsset] = _load_holds()

MOCK_BETA_PATHWAY: list[BetaPathwayNode] = [
    BetaPathwayNode(grid_x=4, grid_y=2),
    BetaPathwayNode(grid_x=5, grid_y=6),
    BetaPathwayNode(grid_x=3, grid_y=12),
]

app: FastAPI = FastAPI(title="ChalkBoard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/holds", response_model=list[HoldAsset])
async def list_holds(
    grip_type: str | None = None,
    base_colour: str | None = None,
) -> list[HoldAsset]:
    """Return the catalogue of available hold assets, optionally filtered."""
    results: list[HoldAsset] = HOLDS_CATALOGUE
    if grip_type is not None:
        results = [h for h in results if h.grip_type == grip_type]
    if base_colour is not None:
        results = [h for h in results if h.base_colour.lower() == base_colour.lower()]
    return results


@app.post("/api/routes", response_model=RouteCreated)
async def create_route(payload: RouteCreate) -> RouteCreated:
    """Persist a new route. Stub: echoes the payload with a fresh route_id."""
    return RouteCreated(
        route_id=uuid4(),
        name=payload.name,
        author_id=payload.author_id,
        grade=payload.grade,
        holds=payload.holds,
    )


@app.post("/api/beta/calculate", response_model=BetaCalculateResponse)
async def calculate_beta(payload: BetaCalculateRequest) -> BetaCalculateResponse:
    """Calculate the simplest movement pathway. Stub: returns a fixed sequence."""
    del payload
    return BetaCalculateResponse(pathway=MOCK_BETA_PATHWAY)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
