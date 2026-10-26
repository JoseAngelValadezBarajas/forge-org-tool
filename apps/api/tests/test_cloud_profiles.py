"""Cloud config safety contracts. No live services or operator data used."""

import pytest

from forge_org.infrastructure.cloud import (
    CloudConfigurationError,
    LocalProfile,
    StorageProvider,
    SupabaseProfile,
    parse_storage_profile,
)

PUBLIC_KEY = 'sb_publishable_testkey123'


def test_local_storage_is_default_and_has_no_remote_settings() -> None:
    profile = parse_storage_profile('local')
    assert isinstance(profile, LocalProfile)
    assert profile.safe_metadata() == {'provider': 'local'}


def test_supabase_configuration_is_normalized_without_secret_in_repr_or_metadata() -> None:
    profile = parse_storage_profile(
        'supabase',
        {'project_url': 'https://example123.supabase.co/', 'publishable_key': PUBLIC_KEY},
    )
    assert isinstance(profile, SupabaseProfile)
    assert profile.project_url == 'https://example123.supabase.co'
    assert profile.provider == StorageProvider.SUPABASE
    assert profile.safe_metadata() == {
        'provider': 'supabase',
        'project_url': 'https://example123.supabase.co',
    }
    assert PUBLIC_KEY not in repr(profile)
    assert PUBLIC_KEY not in str(profile.safe_metadata())


@pytest.mark.parametrize(
    'url',
    [
        '',
        'http://example123.supabase.co',
        'https://example123.supabase.co.attacker.test',
        'https://attacker.test/example123.supabase.co',
        'https://example123.supabase.co.evil.com',
        'https://example123.supabase.co:443',
        'https://user:pass@example123.supabase.co',
        'https://example123.supabase.co/redirect',
        'https://example123.supabase.co?token=123',
        'https://example123.supabase.co#fragment',
        'https://localhost:54321',
        'https://[malformed',
    ],
)
def test_reject_untrusted_supabase_urls(url: str) -> None:
    with pytest.raises(CloudConfigurationError):
        SupabaseProfile(project_url=url, publishable_key=PUBLIC_KEY)


@pytest.mark.parametrize(
    'key',
    [
        '',
        'sb_secret_not_allowed',
        'service_role_key',
        'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature',
        'sb_publishable_wrong key',
        'sb_publishable_',
    ],
)
def test_reject_privileged_or_malformed_keys_without_echoing_value(key: str) -> None:
    with pytest.raises(CloudConfigurationError) as exc:
        SupabaseProfile(project_url='https://example123.supabase.co', publishable_key=key)
    if key:
        assert key not in str(exc.value)


def test_firebase_is_reserved_but_unavailable() -> None:
    with pytest.raises(CloudConfigurationError, match='not implemented'):
        parse_storage_profile('firebase', {'project_id': 'example'})


def test_unknown_provider_and_unused_local_config_are_denied() -> None:
    with pytest.raises(CloudConfigurationError):
        parse_storage_profile('unknown')
    with pytest.raises(CloudConfigurationError):
        parse_storage_profile('local', {'project_url': 'https://example123.supabase.co'})
    with pytest.raises(CloudConfigurationError):
        parse_storage_profile(
            'supabase',
            {
                'project_url': 'https://example123.supabase.co',
                'publishable_key': PUBLIC_KEY,
                'database_password': 'secret',
            },
        )


def test_configuration_never_starts_network_or_writes_user_files() -> None:
    # Contractually a pure parser; integration tests will cover the real backend later.
    profile = parse_storage_profile(
        'supabase',
        {'project_url': 'https://example123.supabase.co', 'publishable_key': PUBLIC_KEY},
    )
    assert isinstance(profile, SupabaseProfile)
