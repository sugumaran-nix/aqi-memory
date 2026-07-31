"""
database.py — Turso (libSQL) async connection pool.

Production: connects to Turso over WebSocket (TURSO_URL + TURSO_TOKEN).
Local dev:  TURSO_URL unset → uses a local SQLite file at ./data/aqi_memory.db.

All callers use fetchall / fetchone / execute / executemany — same signatures
as the old aiosqlite layer, so no router or scraper code changes are needed.
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

import libsql_client

from config import TURSO_TOKEN, TURSO_URL

logger = logging.getLogger(__name__)

# Turso free tier: max 3 concurrent connections — keep pool at or below this
POOL_SIZE = 3
_pool: list[libsql_client.Client] = []
_pool_sem: asyncio.Semaphore | None = None


def _make_client() -> libsql_client.Client:
    if TURSO_URL:
        return libsql_client.create_client(
            url=TURSO_URL,
            auth_token=TURSO_TOKEN or None,
        )
    # Local dev fallback
    os.makedirs("data", exist_ok=True)
    return libsql_client.create_client(url="file:data/aqi_memory.db")


async def _get_sem() -> asyncio.Semaphore:
    global _pool_sem
    if _pool_sem is None:
        _pool_sem = asyncio.Semaphore(POOL_SIZE)
    return _pool_sem


async def _get_pool() -> list[libsql_client.Client]:
    global _pool
    if not _pool:
        _pool = [_make_client() for _ in range(POOL_SIZE)]
    return _pool


@asynccontextmanager
async def _borrow() -> AsyncIterator[libsql_client.Client]:
    """Borrow one client from the pool via semaphore (non-deadlocking)."""
    sem = await _get_sem()
    pool = await _get_pool()
    async with sem:
        client = pool.pop(0)
    try:
        yield client
    finally:
        pool.append(client)


# ── Schema init ───────────────────────────────────────────────────────────────

async def init_db() -> None:
    """Run schema.sql against the DB (idempotent — IF NOT EXISTS everywhere)."""
    schema_text = (Path(__file__).parent / "schema.sql").read_text()
    # Split on semicolons; skip blank lines and comment-only lines
    statements = [
        s.strip()
        for s in schema_text.split(";")
        if s.strip() and not s.strip().startswith("--")
    ]
    async with _borrow() as client:
        for stmt in statements:
            try:
                await client.execute(stmt)
            except Exception as exc:
                # Tolerate "already exists" style errors on re-runs
                logger.debug("Schema stmt skipped (%s): %.80s…", exc, stmt)
    logger.info("DB initialised (%s)", "Turso remote" if TURSO_URL else "local file")


# ── Query helpers ─────────────────────────────────────────────────────────────

async def fetchall(query: str, params: tuple = ()) -> list[dict]:
    stmt = libsql_client.Statement(query, list(params)) if params else query
    async with _borrow() as client:
        rs = await client.execute(stmt)
        return [row.asdict() for row in rs.rows]


async def fetchone(query: str, params: tuple = ()) -> dict | None:
    stmt = libsql_client.Statement(query, list(params)) if params else query
    async with _borrow() as client:
        rs = await client.execute(stmt)
        if not rs.rows:
            return None
        return rs.rows[0].asdict()


async def execute(query: str, params: tuple = ()) -> int:
    """Execute a write. Returns last_insert_rowid (0 for non-INSERT)."""
    stmt = libsql_client.Statement(query, list(params)) if params else query
    async with _borrow() as client:
        rs = await client.execute(stmt)
        return rs.last_insert_rowid or 0


async def executemany(query: str, params_list: list[tuple]) -> None:
    """Batch write — single network round-trip via libsql batch()."""
    if not params_list:
        return
    stmts = [libsql_client.Statement(query, list(p)) for p in params_list]
    async with _borrow() as client:
        await client.batch(stmts)


# ── Shutdown ──────────────────────────────────────────────────────────────────

async def close_pool() -> None:
    global _pool
    for client in _pool:
        try:
            await client.close()
        except Exception:
            pass
    _pool = []
    logger.info("DB pool closed")
