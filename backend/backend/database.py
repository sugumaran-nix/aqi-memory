import aiosqlite
import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncIterator

from config import DB_PATH

logger = logging.getLogger(__name__)

_pool: list[aiosqlite.Connection] = []
_pool_lock = asyncio.Lock()
POOL_SIZE = 5


async def init_db() -> None:
    """Create tables and indexes from schema.sql."""
    os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)
    schema_path = Path(__file__).parent / "schema.sql"
    schema = schema_path.read_text()

    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        await conn.executescript(schema)
        await conn.commit()
    logger.info("Database initialized at %s", DB_PATH)


async def _new_connection() -> aiosqlite.Connection:
    conn = await aiosqlite.connect(DB_PATH)
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA journal_mode=WAL")
    await conn.execute("PRAGMA foreign_keys=ON")
    await conn.execute("PRAGMA synchronous=NORMAL")
    return conn


async def get_pool() -> list[aiosqlite.Connection]:
    """Lazy-initialize the connection pool."""
    global _pool
    async with _pool_lock:
        if not _pool:
            for _ in range(POOL_SIZE):
                _pool.append(await _new_connection())
    return _pool


@asynccontextmanager
async def get_db() -> AsyncIterator[aiosqlite.Connection]:
    """Borrow a connection from the pool (round-robin)."""
    pool = await get_pool()
    async with _pool_lock:
        conn = pool.pop(0)
    try:
        yield conn
    finally:
        async with _pool_lock:
            pool.append(conn)


async def fetchall(
    query: str,
    params: tuple = (),
    conn: aiosqlite.Connection | None = None,
) -> list[dict]:
    async def _run(c: aiosqlite.Connection) -> list[dict]:
        async with c.execute(query, params) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

    if conn:
        return await _run(conn)
    async with get_db() as c:
        return await _run(c)


async def fetchone(
    query: str,
    params: tuple = (),
    conn: aiosqlite.Connection | None = None,
) -> dict | None:
    async def _run(c: aiosqlite.Connection) -> dict | None:
        async with c.execute(query, params) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None

    if conn:
        return await _run(conn)
    async with get_db() as c:
        return await _run(c)


async def execute(
    query: str,
    params: tuple = (),
    conn: aiosqlite.Connection | None = None,
) -> int:
    """Execute a write statement. Returns lastrowid."""
    async def _run(c: aiosqlite.Connection) -> int:
        async with c.execute(query, params) as cur:
            await c.commit()
            return cur.lastrowid or 0

    if conn:
        return await _run(conn)
    async with get_db() as c:
        return await _run(c)


async def executemany(
    query: str,
    params_list: list[tuple],
    conn: aiosqlite.Connection | None = None,
) -> None:
    async def _run(c: aiosqlite.Connection) -> None:
        await c.executemany(query, params_list)
        await c.commit()

    if conn:
        return await _run(conn)
    async with get_db() as c:
        return await _run(c)


async def close_pool() -> None:
    global _pool
    async with _pool_lock:
        for conn in _pool:
            await conn.close()
        _pool = []
    logger.info("Database pool closed")
