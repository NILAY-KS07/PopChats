import sqlite3
import os
from flask import current_app
from contextlib import contextmanager


@contextmanager
def get_db():
    db_path = os.path.join(current_app.instance_path, "data.db")

    conn = sqlite3.connect(
        db_path,
        timeout=30,
        check_same_thread=False
    )

    conn.row_factory = sqlite3.Row

    # --- SQLITE STABILITY SETTINGS ---
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")

    try:
        yield conn
    finally:
        conn.close()