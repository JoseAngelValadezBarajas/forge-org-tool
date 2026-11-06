"""Shared base for the per-aggregate SQLite persistence mixins."""

import sqlite3


class PersistenceBase:
    connection: sqlite3.Connection
