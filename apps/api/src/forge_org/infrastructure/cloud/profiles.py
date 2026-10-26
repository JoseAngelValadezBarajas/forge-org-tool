"""Fail-closed, side-effect-free validation of FORGE storage profiles.

A client-installed backend is *not* trusted infrastructure. This module only
accepts public Supabase project configuration. It never accepts database
passwords, service-role keys, admin credentials or user access tokens. The
browser API-client adapter owns Auth/Data API connectivity; this Python
module remains a pure parser for shared configuration and diagnostics.
"""

import re
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Mapping
from urllib.parse import urlsplit

_SUPABASE_HOST = re.compile(r'[a-z0-9][a-z0-9-]*\.supabase\.co', re.ASCII)
_SUPABASE_PUBLISHABLE_KEY = re.compile(r'sb_publishable_[A-Za-z0-9_-]+', re.ASCII)


class CloudConfigurationError(ValueError):
    """Invalid, unsafe or not-yet-supported storage provider configuration."""


class StorageProvider(StrEnum):
    LOCAL = 'local'
    SUPABASE = 'supabase'
    FIREBASE = 'firebase'  # Reserved for a later, separately certified adapter.


@dataclass(frozen=True, slots=True)
class LocalProfile:
    provider: StorageProvider = StorageProvider.LOCAL

    def safe_metadata(self) -> dict[str, str]:
        return {'provider': self.provider.value}


@dataclass(frozen=True, slots=True)
class SupabaseProfile:
    project_url: str
    publishable_key: str = field(repr=False)
    provider: StorageProvider = field(default=StorageProvider.SUPABASE, init=False)

    def __post_init__(self) -> None:
        """Accept only ordinary hosted project URLs and public keys.

        Restricting the hostname matters when a future preflight performs an
        outbound request using caller-supplied settings.
        """
        try:
            parsed = urlsplit(self.project_url)
            port = parsed.port  # Access triggers ValueError for malformed ports.
            host = parsed.hostname
        except (TypeError, ValueError) as exc:
            raise CloudConfigurationError('Invalid Supabase project URL') from exc

        if (
            parsed.scheme != 'https'
            or port is not None
            or parsed.username is not None
            or parsed.password is not None
            or not host
            or _SUPABASE_HOST.fullmatch(host) is None
            or parsed.path not in {'', '/'}
            or parsed.query
            or parsed.fragment
        ):
            raise CloudConfigurationError('Expected an HTTPS Supabase project URL')

        if (
            not isinstance(self.publishable_key, str)
            or _SUPABASE_PUBLISHABLE_KEY.fullmatch(self.publishable_key) is None
        ):
            raise CloudConfigurationError(
                'Expected a valid public Supabase key; privileged keys are prohibited'
            )

        object.__setattr__(self, 'project_url', f'https://{host}')

    def safe_metadata(self) -> dict[str, str]:
        """Information safe to show in logs, diagnostics, and status UIs."""
        return {'provider': self.provider.value, 'project_url': self.project_url}


def parse_storage_profile(
    provider: str, configuration: Mapping[str, str] | None = None
) -> LocalProfile | SupabaseProfile:
    """Parse user-owned storage configuration without contacting any provider.

    Firebase is represented in the selection contract but deliberately disabled
    until there is an authenticated, rules-enforced Firestore adapter.
    """
    config = configuration or {}
    if provider == StorageProvider.LOCAL:
        if config:
            raise CloudConfigurationError('Local storage does not accept cloud settings')
        return LocalProfile()
    if provider == StorageProvider.SUPABASE:
        if set(config) - {'project_url', 'publishable_key'}:
            raise CloudConfigurationError('Unexpected Supabase configuration field')
        return SupabaseProfile(
            project_url=config.get('project_url', ''),
            publishable_key=config.get('publishable_key', ''),
        )
    if provider == StorageProvider.FIREBASE:
        raise CloudConfigurationError('Firebase BYOC is not implemented yet')
    raise CloudConfigurationError('Unknown storage provider')
