"""Time source for application and domain code."""

from datetime import UTC, datetime


def utc_now() -> str:
    return datetime.now(UTC).isoformat()
