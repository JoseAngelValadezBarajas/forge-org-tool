import pytest

from forge_org.domain.planning import (
    clean_description,
    clean_title,
    dependency_endpoints,
    ensure_project_writable,
)
from forge_org.domain.transfer_document import canonical_json, validate_document


def test_titles_are_trimmed_and_required() -> None:
    assert clean_title('  Plan  ') == 'Plan'
    for blank in (None, '', '   '):
        with pytest.raises(ValueError, match='Title is required'):
            clean_title(blank)


def test_descriptions_are_required() -> None:
    assert clean_description(' ok ') == 'ok'
    with pytest.raises(ValueError, match='Description is required'):
        clean_description('  ')


def test_archived_projects_are_read_only() -> None:
    ensure_project_writable({'status': 'active'})
    with pytest.raises(ValueError, match='read-only'):
        ensure_project_writable({'status': 'archived'})


def test_dependencies_need_two_different_work_items() -> None:
    assert dependency_endpoints({'blocking_feature_id': 'a', 'blocked_feature_id': 'b'}) == (
        'a',
        'b',
    )
    for values in ({}, {'blocking_feature_id': 'a', 'blocked_feature_id': 'a'}):
        with pytest.raises(ValueError, match='two different features'):
            dependency_endpoints(values)


def test_transfer_documents_are_validated_without_any_infrastructure() -> None:
    document = {
        'schema_version': 'forge-project-transfer-v2',
        'project': {'name': 'Demo'},
        'epics': [],
        'features': [],
        'dependencies': [],
    }
    assert validate_document(document)['project']['name'] == 'Demo'
    assert canonical_json({'b': 1, 'a': 2}) == '{"a":2,"b":1}'
    with pytest.raises(ValueError, match='Unsupported project import schema'):
        validate_document({'schema_version': 'nope'})


def test_tag_names_are_normalized_and_bounded() -> None:
    from forge_org.domain.tags import normalize_tag_name

    assert normalize_tag_name('  Ｂug ') == ('Bug', 'bug')
    for bad in ('', '   ', 'x' * 41):
        with pytest.raises(ValueError, match='1 to 40'):
            normalize_tag_name(bad)


def test_reordering_must_list_every_id_once() -> None:
    from forge_org.domain.ordering import ensure_exact_ordering

    ensure_exact_ordering(['b', 'a'], ['a', 'b'], 'bad')
    for requested in (['a'], ['a', 'a'], ['a', 'c']):
        with pytest.raises(ValueError, match='bad'):
            ensure_exact_ordering(requested, ['a', 'b'], 'bad')
