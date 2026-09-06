"""FastAPI app for NetGuardian - Network Security Compliance Auditor."""

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from parser import parse_cisco_ios
from compliance import check_compliance


# Database setup
DB_PATH = Path(__file__).parent / "netguardian.db"


def init_db() -> None:
    """Initialize SQLite database with uploads and results tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS uploads (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            uploaded_at TEXT NOT NULL,
            parsed_config TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS results (
            id TEXT PRIMARY KEY,
            upload_id TEXT NOT NULL,
            rule TEXT NOT NULL,
            reference TEXT NOT NULL,
            status TEXT NOT NULL,
            fix_command TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (upload_id) REFERENCES uploads (id)
        )
    """)

    conn.commit()
    conn.close()


def save_upload(filename: str, parsed: dict) -> str:
    """Save upload and parsed config to database. Returns upload ID."""
    upload_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    import json
    cursor.execute(
        "INSERT INTO uploads (id, filename, uploaded_at, parsed_config) VALUES (?, ?, ?, ?)",
        (upload_id, filename, datetime.now(timezone.utc).isoformat(), json.dumps(parsed)),
    )
    conn.commit()
    conn.close()
    return upload_id


def save_results(upload_id: str, results: list[dict[str, Any]]) -> None:
    """Save compliance check results to database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for result in results:
        cursor.execute(
            """INSERT INTO results (id, upload_id, rule, reference, status, fix_command, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                str(uuid.uuid4()),
                upload_id,
                result["rule"],
                result["reference"],
                result["status"],
                result.get("fix_command", ""),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
    conn.commit()
    conn.close()


# Pydantic models
class ComplianceResult(BaseModel):
    rule: str
    reference: str
    status: str
    fix_command: str = ""


class UploadResponse(BaseModel):
    filename: str
    parsed: dict[str, Any]
    results: list[ComplianceResult]


from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    init_db()
    yield


# FastAPI app
app = FastAPI(
    title="NetGuardian API",
    description="Network Security Compliance Auditor for Cisco IOS",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/upload", response_model=UploadResponse)
async def upload_config(file: UploadFile = File(...)) -> UploadResponse:
    """
    Upload a Cisco IOS config file (.txt), parse it, run compliance checks,
    store results in database, and return the parsed config with results.
    """
    # Validate file type
    if not file.filename or not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt files are accepted")

    # Read file content
    content = await file.read()
    config_text = content.decode("utf-8")

    # Parse the config
    parsed = parse_cisco_ios(config_text)

    # Run compliance checks
    results = check_compliance(parsed)

    # Save to database
    upload_id = save_upload(file.filename, parsed)
    save_results(upload_id, results)

    # Convert results to response model
    compliance_results = [
        ComplianceResult(
            rule=r["rule"],
            reference=r["reference"],
            status=r["status"],
            fix_command=r.get("fix_command", ""),
        )
        for r in results
    ]

    return UploadResponse(
        filename=file.filename,
        parsed=parsed,
        results=compliance_results,
    )


@app.get("/uploads")
async def list_uploads() -> list[dict[str, Any]]:
    """List all uploaded configurations with their results summary."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT u.id, u.filename, u.uploaded_at, u.parsed_config,
               COUNT(r.id) as total_checks,
               SUM(CASE WHEN r.status = 'PASS' THEN 1 ELSE 0 END) as passed
        FROM uploads u
        LEFT JOIN results r ON u.id = r.upload_id
        GROUP BY u.id
        ORDER BY u.uploaded_at DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    uploads = []
    for row in rows:
        uploads.append({
            "id": row[0],
            "filename": row[1],
            "uploaded_at": row[2],
            "total_checks": row[4],
            "passed": row[5] or 0,
            "failed": (row[4] or 0) - (row[5] or 0),
        })

    return uploads


@app.get("/uploads/{upload_id}")
async def get_upload_detail(upload_id: str) -> dict[str, Any]:
    """Get detailed results for a specific upload."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get upload info
    cursor.execute(
        "SELECT id, filename, uploaded_at, parsed_config FROM uploads WHERE id = ?",
        (upload_id,),
    )
    upload_row = cursor.fetchone()

    if not upload_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Upload not found")

    # Get results
    cursor.execute(
        """SELECT rule, reference, status, fix_command, created_at
           FROM results WHERE upload_id = ? ORDER BY rule""",
        (upload_id,),
    )
    result_rows = cursor.fetchall()
    conn.close()

    import json
    return {
        "id": upload_row[0],
        "filename": upload_row[1],
        "uploaded_at": upload_row[2],
        "parsed": json.loads(upload_row[3]),
        "results": [
            {
                "rule": r[0],
                "reference": r[1],
                "status": r[2],
                "fix_command": r[3],
                "created_at": r[4],
            }
            for r in result_rows
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)