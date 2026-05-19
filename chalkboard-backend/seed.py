"""First-run seeding: create tables, insert a default user, import holds.json.

Idempotent — safe to run on every startup. `data/holds.json` remains the
source of truth for the initial catalogue; new entries added there will be
inserted on the next boot. Existing rows are left alone.
"""

from __future__ import annotations

import json
from pathlib import Path
from uuid import UUID

from sqlalchemy.orm import Session

from db import SessionLocal, engine
from models import Base, HoldAsset, User

# Matches PLACEHOLDER_AUTHOR_ID in chalkboard-frontend/src/constants.ts so the
# frontend's stubbed author satisfies the FK on `routes.author_id`.
DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
HOLDS_DATA_PATH: Path = Path(__file__).parent / "data" / "holds.json"


def run() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        _ensure_default_user(db)
        _ensure_hold_catalogue(db)
        db.commit()


def _ensure_default_user(db: Session) -> None:
    if db.get(User, DEFAULT_USER_ID) is not None:
        return
    db.add(
        User(
            user_id=DEFAULT_USER_ID,
            username="default",
            email="default@chalkboard.local",
        )
    )


def _ensure_hold_catalogue(db: Session) -> None:
    raw: list[dict[str, object]] = json.loads(
        HOLDS_DATA_PATH.read_text(encoding="utf-8")
    )
    existing_ids: set[str] = {row[0] for row in db.query(HoldAsset.asset_id).all()}
    for record in raw:
        asset_id = str(record["asset_id"])
        if asset_id in existing_ids:
            continue
        db.add(
            HoldAsset(
                asset_id=asset_id,
                display_name=str(record["display_name"]),
                image_url=str(record["image_url"]),
                grip_type=str(record["grip_type"]),
                base_colour=str(record["base_colour"]),
                difficulty_modifier=float(record["difficulty_modifier"]),  # type: ignore[arg-type]
                width_cm=float(record["width_cm"]),  # type: ignore[arg-type]
                height_cm=float(record["height_cm"]),  # type: ignore[arg-type]
            )
        )
