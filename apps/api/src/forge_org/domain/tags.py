"""Tag naming rules."""

import unicodedata


def normalize_tag_name(raw_name: str) -> tuple[str, str]:
    """Return the display name and the case-insensitive key for a tag."""
    name = unicodedata.normalize('NFKC', raw_name).strip()
    normalized = unicodedata.normalize('NFKC', name).casefold()
    if not name or len(name) > 40:
        raise ValueError('Tags must contain 1 to 40 characters')
    return name, normalized
