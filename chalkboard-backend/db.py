"""Database engine, session factory, and FastAPI session dependency.

URL is taken from the `CHALKBOARD_DB_URL` env var; defaults to a local
SQLite file at the backend root. Switching to Postgres later is a one-env-var
change (e.g. `postgresql+psycopg://user:pass@host/db`).
"""

from __future__ import annotations

import os
from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

DEFAULT_DB_URL = "sqlite:///./chalkboard.db"
DB_URL: str = os.environ.get("CHALKBOARD_DB_URL", DEFAULT_DB_URL)

_is_sqlite = DB_URL.startswith("sqlite")

engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine, autoflush=False, autocommit=False, expire_on_commit=False
)


@event.listens_for(Engine, "connect")
def _sqlite_pragmas(dbapi_connection: object, _connection_record: object) -> None:
    """Enable foreign key enforcement on SQLite.

    SQLite ignores FK constraints (including ON DELETE CASCADE) without this.
    """
    if not _is_sqlite:
        return
    cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
