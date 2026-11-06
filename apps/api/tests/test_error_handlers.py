from collections.abc import Callable

from fastapi import FastAPI
from fastapi.testclient import TestClient

from forge_org.api.error_handlers import register_error_handlers
from forge_org.domain.errors import Conflict, DuplicateName, InvalidInput, NotFound, StorageCorrupt


def _raiser(error: Exception) -> Callable[[], None]:
    def raiser() -> None:
        raise error

    return raiser


def _client() -> TestClient:
    app = FastAPI()
    register_error_handlers(app)
    cases: dict[str, Exception] = {
        'not-found': NotFound('missing'),
        'invalid': InvalidInput('bad input'),
        'conflict': Conflict('stale'),
        'duplicate': DuplicateName('taken'),
        'corrupt': StorageCorrupt('internal detail'),
    }
    for path, error in cases.items():
        app.get(f'/{path}')(_raiser(error))
    return TestClient(app, raise_server_exceptions=False)


def test_domain_errors_map_to_one_http_status_each() -> None:
    client = _client()
    assert (client.get('/not-found').status_code, client.get('/not-found').json()) == (
        404,
        {'detail': 'missing'},
    )
    assert client.get('/invalid').status_code == 422
    assert client.get('/conflict').status_code == 409
    assert client.get('/duplicate').status_code == 409


def test_storage_corruption_is_a_server_error_without_internal_detail() -> None:
    response = _client().get('/corrupt')
    assert response.status_code == 500
    assert 'internal detail' not in response.text
