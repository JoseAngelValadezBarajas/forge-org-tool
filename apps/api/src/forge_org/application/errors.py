"""Application-level errors translated to HTTP statuses by the API layer."""


class NotFound(Exception):
    pass


class DuplicateName(Exception):
    pass


class InvalidInput(Exception):
    pass
