import asyncio
import itertools
import logging
import random
from typing import Any

import httpx

from config import (
    AQI_BREAKPOINTS,
    AQI_CATEGORIES,
    MAX_RETRIES,
    POLLUTANT_FIELD_MAP,
    REQUEST_DELAY_MAX,
    REQUEST_DELAY_MIN,
    USER_AGENTS,
)

logger = logging.getLogger(__name__)

_ua_cycle = itertools.cycle(USER_AGENTS)


def get_headers() -> dict[str, str]:
    """Rotate User-Agent on each call."""
    return {
        "User-Agent":   next(_ua_cycle),
        "Referer":      "https://app.cpcbccr.com/ccr/",
        "Origin":       "https://app.cpcbccr.com",
        "Accept":       "application/json, text/plain, */*",
        "Content-Type": "application/json",
    }


async def random_delay() -> None:
    delay = random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX)
    await asyncio.sleep(delay)


async def post_with_retry(
    client: httpx.AsyncClient,
    url: str,
    payload: dict,
    retries: int = MAX_RETRIES,
) -> dict | None:
    """POST JSON with exponential backoff retry. Returns parsed JSON or None."""
    wait_times = [2, 4, 8]
    for attempt in range(retries + 1):
        try:
            resp = await client.post(url, json=payload, headers=get_headers(), timeout=30.0)
            if resp.status_code != 200:
                logger.warning(
                    "HTTP %s for %s (attempt %d): %s",
                    resp.status_code, url, attempt + 1, resp.text[:300],
                )
                if attempt < retries:
                    await asyncio.sleep(wait_times[min(attempt, len(wait_times) - 1)])
                    continue
                return None

            try:
                data = resp.json()
            except Exception:
                logger.warning(
                    "Non-JSON response from %s (attempt %d): %s",
                    url, attempt + 1, resp.text[:300],
                )
                if attempt < retries:
                    await asyncio.sleep(wait_times[min(attempt, len(wait_times) - 1)])
                    continue
                return None

            return data

        except (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError) as exc:
            logger.warning("Request error %s (attempt %d): %s", url, attempt + 1, exc)
            if attempt < retries:
                await asyncio.sleep(wait_times[min(attempt, len(wait_times) - 1)])
            else:
                return None

    return None


async def get_with_retry(
    client: httpx.AsyncClient,
    url: str,
    retries: int = MAX_RETRIES,
    as_bytes: bool = False,
) -> Any | None:
    """GET with exponential backoff. Returns JSON, bytes, or None."""
    wait_times = [2, 4, 8]
    for attempt in range(retries + 1):
        try:
            resp = await client.get(url, headers=get_headers(), timeout=60.0)
            if resp.status_code != 200:
                logger.warning(
                    "HTTP %s for GET %s (attempt %d)",
                    resp.status_code, url, attempt + 1,
                )
                if attempt < retries:
                    await asyncio.sleep(wait_times[min(attempt, len(wait_times) - 1)])
                    continue
                return None

            if as_bytes:
                return resp.content

            try:
                return resp.json()
            except Exception:
                logger.warning("Non-JSON GET response %s: %s", url, resp.text[:300])
                return None

        except (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError) as exc:
            logger.warning("GET error %s (attempt %d): %s", url, attempt + 1, exc)
            if attempt < retries:
                await asyncio.sleep(wait_times[min(attempt, len(wait_times) - 1)])
            else:
                return None

    return None


def calculate_sub_index(field: str, value: float) -> int | None:
    """Calculate AQI sub-index for a single pollutant using CPCB breakpoints."""
    bp = AQI_BREAKPOINTS.get(field)
    if bp is None or value is None:
        return None

    conc = bp["conc"]
    aqi_pts = bp["aqi"]

    if value < 0:
        return None
    if value > conc[-1]:
        return 500

    for i in range(len(conc) - 1):
        if conc[i] <= value <= conc[i + 1]:
            c_lo, c_hi = conc[i], conc[i + 1]
            i_lo, i_hi = aqi_pts[i], aqi_pts[i + 1]
            if c_hi == c_lo:
                return i_lo
            sub = ((i_hi - i_lo) / (c_hi - c_lo)) * (value - c_lo) + i_lo
            return round(sub)

    return None


def calculate_aqi(pollutant_values: dict[str, float | None]) -> tuple[int | None, str | None]:
    """
    Given a dict of {field: value}, return (aqi, dominant_pollutant).
    AQI = max sub-index across all valid readings.
    """
    sub_indices: dict[str, int] = {}

    for field, value in pollutant_values.items():
        if value is None:
            continue
        si = calculate_sub_index(field, value)
        if si is not None:
            sub_indices[field] = si

    if not sub_indices:
        return None, None

    dominant = max(sub_indices, key=lambda k: sub_indices[k])
    aqi = sub_indices[dominant]

    # Map field back to display name
    field_to_display = {v: k for k, v in POLLUTANT_FIELD_MAP.items()}
    dominant_display = field_to_display.get(dominant, dominant)

    return aqi, dominant_display


def get_aqi_category(aqi: int | None) -> str | None:
    if aqi is None:
        return None
    for threshold, category, _ in AQI_CATEGORIES:
        if aqi <= threshold:
            return category
    return "Severe"
