"""Shared SQLite persistence helpers."""

import sqlite3
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from functools import wraps
from typing import Any, ParamSpec, TypeVar

from forge_org.domain.errors import DuplicateRecord

_P = ParamSpec('_P')
_R = TypeVar('_R')


def row_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


def unique_as_duplicate(method: Callable[_P, _R]) -> Callable[_P, _R]:
    """Translate SQLite uniqueness failures into the framework-free domain error."""

    @wraps(method)
    def wrapper(*args: _P.args, **kwargs: _P.kwargs) -> _R:
        try:
            return method(*args, **kwargs)
        except sqlite3.IntegrityError as exc:
            raise DuplicateRecord(str(exc)) from exc

    return wrapper


@contextmanager
def transaction(connection: sqlite3.Connection) -> Iterator[None]:
    """Commit when the block succeeds, roll back and re-raise when it fails.

    The single place stores use for all-or-nothing writes.
    """
    try:
        yield
    except Exception:
        connection.rollback()
        raise
    else:
        connection.commit()
