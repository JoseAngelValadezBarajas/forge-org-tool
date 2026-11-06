"""Ordering rules for sortable child collections."""


def ensure_exact_ordering(requested: list[str], existing: list[str], message: str) -> None:
    """A reorder request must list every existing id exactly once."""
    if (
        len(requested) != len(existing)
        or len(set(requested)) != len(requested)
        or set(requested) != set(existing)
    ):
        raise ValueError(message)
