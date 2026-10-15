"""
backend/history.py — SQLite-backed scan history for CodeX-RAY
Stores the last N scan results so users can reload without rescanning.
"""
import json
import sqlite3
import time
from pathlib import Path
from typing import List, Optional, Dict

DB_DIR  = Path.home() / ".codexray"
DB_PATH = DB_DIR / "history.db"


def _connect() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they don't exist."""
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                path         TEXT    NOT NULL,
                name         TEXT    NOT NULL,
                scanned_at   REAL    NOT NULL,
                health_score INTEGER,
                grade        TEXT,
                file_count   INTEGER,
                result_json  TEXT
            )
        """)
        conn.commit()


def save_scan(path: str, name: str, health_score: int, grade: str, file_count: int, result: dict):
    """Persist a completed scan result. Keeps only the last 50 records."""
    init_db()
    result_json = json.dumps(result, default=str)
    with _connect() as conn:
        conn.execute(
            """INSERT INTO scans (path, name, scanned_at, health_score, grade, file_count, result_json)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (path, name, time.time(), health_score, grade, file_count, result_json)
        )
        # Trim to 50 most-recent rows
        conn.execute("""
            DELETE FROM scans WHERE id NOT IN (
                SELECT id FROM scans ORDER BY scanned_at DESC LIMIT 50
            )
        """)
        conn.commit()


def list_scans(limit: int = 20) -> List[dict]:
    """Return recent scans (no result_json blob for performance)."""
    init_db()
    with _connect() as conn:
        rows = conn.execute(
            """SELECT id, path, name, scanned_at, health_score, grade, file_count
               FROM scans ORDER BY scanned_at DESC LIMIT ?""",
            (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


def load_scan(scan_id: int) -> Optional[dict]:
    """Load one full scan result by id."""
    init_db()
    with _connect() as conn:
        row = conn.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone()
    if not row:
        return None
    data = dict(row)
    data["result"] = json.loads(data.pop("result_json", "{}") or "{}")
    return data


def delete_scan(scan_id: int) -> bool:
    """Delete a scan record. Returns True if a row was removed."""
    init_db()
    with _connect() as conn:
        cursor = conn.execute("DELETE FROM scans WHERE id = ?", (scan_id,))
        conn.commit()
    return cursor.rowcount > 0
