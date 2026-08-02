"""
database.py — aiosqlite (plain SQLite on local disk).
No Turso, no external DB, no env vars needed.
"""

import asyncio
import logging
from pathlib import Path
from typing import Any

import aiosqlite

DB_PATH = Path("data/aqi_memory.db")
logger = logging.getLogger(__name__)

_write_lock = asyncio.Lock()


def _db_path() -> str:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return str(DB_PATH)


async def init_db() -> None:
    schema = (Path(__file__).parent / "schema.sql").read_text()
    statements = [
        s.strip() for s in schema.split(";")
        if s.strip() and not s.strip().startswith("--")
    ]
    async with aiosqlite.connect(_db_path()) as conn:
        conn.row_factory = aiosqlite.Row
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA foreign_keys=ON")
        for stmt in statements:
            try:
                await conn.execute(stmt)
            except Exception as exc:
                logger.debug("Schema stmt skipped (%s): %.80s", exc, stmt)
        await conn.commit()
    logger.info("DB initialised at %s", DB_PATH)


async def fetchall(query: str, params: tuple = ()) -> list[dict]:
    async with aiosqlite.connect(_db_path()) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(query, params) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


async def fetchone(query: str, params: tuple = ()) -> dict | None:
    async with aiosqlite.connect(_db_path()) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(query, params) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def execute(query: str, params: tuple = ()) -> int:
    async with _write_lock:
        async with aiosqlite.connect(_db_path()) as conn:
            conn.row_factory = aiosqlite.Row
            await conn.execute("PRAGMA journal_mode=WAL")
            await conn.execute("PRAGMA foreign_keys=ON")
            cur = await conn.execute(query, params)
            await conn.commit()
            return cur.lastrowid or 0


async def executemany(query: str, params_list: list[tuple]) -> None:
    if not params_list:
        return
    async with _write_lock:
        async with aiosqlite.connect(_db_path()) as conn:
            conn.row_factory = aiosqlite.Row
            await conn.execute("PRAGMA journal_mode=WAL")
            await conn.execute("PRAGMA foreign_keys=ON")
            await conn.executemany(query, params_list)
            await conn.commit()


async def close_pool() -> None:
    pass  # aiosqlite opens/closes per call, nothing to pool
