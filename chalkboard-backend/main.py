"""ChalkBoard API — FastAPI entry point.

Implements the endpoints in Section 7 of Technical Spec.md, backed by
SQLAlchemy persistence (Section 6) and the NetworkX beta engine (Section 8).
The spec only names POST /api/routes; GET /api/routes, GET /api/routes/{id}
and DELETE /api/routes/{id} are added to make the UI's load/manage flow
possible.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Annotated
from uuid import UUID

import uvicorn
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

import beta
import seed
from db import get_db
from models import HoldAsset as HoldAssetModel
from models import Route as RouteModel
from models import RouteHold as RouteHoldModel
from models import User as UserModel
from schemas import (
    BetaCalculateRequest,
    BetaCalculateResponse,
    HoldAssetRead,
    RouteCreate,
    RouteRead,
    RouteSummary,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    seed.run()
    yield


app: FastAPI = FastAPI(
    title="ChalkBoard API",
    version="0.2.0",
    lifespan=lifespan,
)

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

DBSession = Annotated[Session, Depends(get_db)]


@app.get("/api/holds", response_model=list[HoldAssetRead])
def list_holds(
    db: DBSession,
    grip_type: str | None = None,
    base_colour: str | None = None,
) -> list[HoldAssetModel]:
    """Return the hold catalogue, optionally filtered by grip type or colour."""
    stmt = select(HoldAssetModel).order_by(HoldAssetModel.asset_id)
    if grip_type is not None:
        stmt = stmt.where(HoldAssetModel.grip_type == grip_type)
    if base_colour is not None:
        stmt = stmt.where(
            func.lower(HoldAssetModel.base_colour) == base_colour.lower()
        )
    return list(db.scalars(stmt))


@app.post("/api/routes", response_model=RouteRead, status_code=201)
def create_route(payload: RouteCreate, db: DBSession) -> RouteModel:
    """Persist a route + all its placements in a single transaction."""
    if db.get(UserModel, payload.author_id) is None:
        raise HTTPException(422, f"Unknown author_id: {payload.author_id}")

    asset_ids = {h.asset_id for h in payload.holds}
    if asset_ids:
        known = set(
            db.scalars(
                select(HoldAssetModel.asset_id).where(
                    HoldAssetModel.asset_id.in_(asset_ids)
                )
            )
        )
        missing = asset_ids - known
        if missing:
            raise HTTPException(422, f"Unknown asset_ids: {sorted(missing)}")

    route = RouteModel(
        author_id=payload.author_id,
        name=payload.name,
        grade=payload.grade,
        holds=[
            RouteHoldModel(
                asset_id=h.asset_id,
                grid_x=h.grid_x,
                grid_y=h.grid_y,
                rotation=h.rotation,
                is_start=h.is_start,
                is_finish=h.is_finish,
            )
            for h in payload.holds
        ],
    )
    db.add(route)
    db.commit()
    db.refresh(route)
    return route


@app.get("/api/routes", response_model=list[RouteSummary])
def list_routes(db: DBSession) -> list[RouteSummary]:
    """List all saved routes, newest first."""
    stmt = (
        select(
            RouteModel.route_id,
            RouteModel.name,
            RouteModel.grade,
            RouteModel.created_at,
            func.count(RouteHoldModel.placement_id).label("hold_count"),
        )
        .outerjoin(RouteHoldModel, RouteModel.route_id == RouteHoldModel.route_id)
        .group_by(RouteModel.route_id)
        .order_by(RouteModel.created_at.desc())
    )
    return [
        RouteSummary(
            route_id=row.route_id,
            name=row.name,
            grade=row.grade,
            created_at=row.created_at,
            hold_count=row.hold_count,
        )
        for row in db.execute(stmt)
    ]


@app.get("/api/routes/{route_id}", response_model=RouteRead)
def get_route(route_id: UUID, db: DBSession) -> RouteModel:
    """Fetch a single route with all its placements."""
    stmt = (
        select(RouteModel)
        .where(RouteModel.route_id == route_id)
        .options(selectinload(RouteModel.holds))
    )
    route = db.scalars(stmt).first()
    if route is None:
        raise HTTPException(404, f"Route {route_id} not found")
    return route


@app.delete("/api/routes/{route_id}", status_code=204)
def delete_route(route_id: UUID, db: DBSession) -> None:
    """Delete a route. Placements cascade via ON DELETE CASCADE."""
    route = db.get(RouteModel, route_id)
    if route is None:
        raise HTTPException(404, f"Route {route_id} not found")
    db.delete(route)
    db.commit()


@app.post("/api/beta/calculate", response_model=BetaCalculateResponse)
def calculate_beta(
    payload: BetaCalculateRequest, db: DBSession
) -> BetaCalculateResponse:
    """Run the NetworkX beta engine over the transient hold array from the UI."""
    if not payload.holds:
        raise HTTPException(422, "No holds provided")

    asset_ids = list({h.asset_id for h in payload.holds})
    rows = db.scalars(
        select(HoldAssetModel).where(HoldAssetModel.asset_id.in_(asset_ids))
    ).all()
    holds_meta = {h.asset_id: h for h in rows}
    missing = set(asset_ids) - holds_meta.keys()
    if missing:
        raise HTTPException(422, f"Unknown asset_ids: {sorted(missing)}")

    try:
        pathway = beta.calculate(payload.holds, holds_meta)
    except beta.BetaError as exc:
        raise HTTPException(422, str(exc)) from exc
    return BetaCalculateResponse(pathway=pathway)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
