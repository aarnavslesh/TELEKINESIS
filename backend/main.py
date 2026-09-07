"""FastAPI app for NetGuardian - Network Security Compliance Auditor."""

import json
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

# Model path
MODEL_PATH = Path(__file__).parent.parent / "cisco-classifier-model"

# Confidence threshold for auto-approval vs pending review
CONFIDENCE_THRESHOLD = 0.65

# Global classifier instance (loaded at startup)
classifier = None


def init_db() -> None:
    """Initialize SQLite database with uploads, results, and pending_reviews tables."""
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
            frameworks TEXT,
            FOREIGN KEY (upload_id) REFERENCES uploads (id)
        )
    """)

    # Safe migration for databases created before the frameworks column existed.
    # SQLite has no IF NOT EXISTS for ADD COLUMN, so we probe the schema and
    # add the column only when it is missing.
    try:
        columns = [row[1] for row in cursor.execute("PRAGMA table_info(results)").fetchall()]
        if "frameworks" not in columns:
            cursor.execute("ALTER TABLE results ADD COLUMN frameworks TEXT")
    except sqlite3.OperationalError:
        pass  # Table may not exist yet; CREATE TABLE above handles it.

    # New table for pending reviews (low-confidence classifications)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pending_reviews (
            id TEXT PRIMARY KEY,
            upload_id TEXT NOT NULL,
            command TEXT NOT NULL,
            predicted_label TEXT NOT NULL,
            confidence REAL NOT NULL,
            suggested_rule TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL,
            reviewed_at TEXT,
            reviewer_action TEXT,
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

    cursor.execute(
        "INSERT INTO uploads (id, filename, uploaded_at, parsed_config) VALUES (?, ?, ?, ?)",
        (upload_id, filename, datetime.now(timezone.utc).isoformat(), json.dumps(parsed)),
    )
    conn.commit()
    conn.close()
    return upload_id


def _frameworks_to_json(frameworks: Any) -> str | None:
    """Serialize a frameworks dict to JSON, tolerating missing/empty values."""
    if not frameworks:
        return None
    return json.dumps(frameworks)


def save_results(upload_id: str, results: list[dict[str, Any]]) -> None:
    """Save compliance check results to database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for result in results:
        cursor.execute(
            """INSERT INTO results (id, upload_id, rule, reference, status, fix_command, frameworks, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                str(uuid.uuid4()),
                upload_id,
                result["rule"],
                result["reference"],
                result["status"],
                result.get("fix_command", ""),
                _frameworks_to_json(result.get("frameworks")),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
    conn.commit()
    conn.close()


def save_pending_reviews(upload_id: str, pending_items: list[dict[str, Any]]) -> None:
    """Save low-confidence classifications for manual review."""
    if not pending_items:
        return
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for item in pending_items:
        cursor.execute(
            """INSERT INTO pending_reviews (id, upload_id, command, predicted_label, confidence,
                   suggested_rule, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                str(uuid.uuid4()),
                upload_id,
                item["command"],
                item["predicted_label"],
                item["confidence"],
                item.get("suggested_rule", ""),
                "pending",
                datetime.now(timezone.utc).isoformat(),
            ),
        )
    conn.commit()
    conn.close()


def load_classifier():
    """Load the SetFit model at startup."""
    global classifier
    from setfit import SetFitModel
    classifier = SetFitModel.from_pretrained(str(MODEL_PATH))
    return classifier


def classify_commands(commands: list[str]) -> list[dict[str, Any]]:
    """
    Classify a list of Cisco IOS commands using SetFit model.
    Returns list of dicts with command, label, confidence, and whether it needs review.
    """
    global classifier
    if classifier is None:
        load_classifier()

    if not commands:
        return []

    results = []
    probs = classifier.predict_proba(commands)

    for i, cmd in enumerate(commands):
        pred_probs = probs[i]
        # Single inference pass: derive the label via argmax over predict_proba
        # (verified: predict_proba columns align with classifier.labels).
        best_idx = max(range(len(pred_probs)), key=lambda j: pred_probs[j])
        label = classifier.labels[int(best_idx)]
        max_confidence = float(pred_probs[best_idx])

        needs_review = max_confidence < CONFIDENCE_THRESHOLD

        # Map classifier labels to CIS rule references
        rule_mapping = {
            "SSH Config": "cis-3.1.1",
            "Password Policy": "cis-3.2.1",
            "Banner": "cis-3.3.1",
            "NTP": "cis-3.5.1",
            "Logging": "cis-3.6.1",
            "AAA": "cis-3.7.1",
            "Access Control": "cis-3.8.1",
            "Interface": "",
            "VLAN": "",
        }

        results.append({
            "command": cmd,
            "predicted_label": label,
            "confidence": max_confidence,
            "needs_review": needs_review,
            "suggested_rule": rule_mapping.get(label, ""),
        })

    return results


def extract_commands_from_config(config_text: str) -> list[str]:
    """Extract individual configuration commands from raw config text."""
    commands = []
    for line in config_text.splitlines():
        line = line.strip()
        # Skip comments, empty lines, and section headers
        if not line or line.startswith("!") or line.startswith("version ") or line == "end":
            continue
        # Skip lines that are just closing markers
        if line in ("!", "exit", "end"):
            continue
        commands.append(line)
    return commands


# Pydantic models
class ComplianceResult(BaseModel):
    rule: str
    reference: str
    status: str
    fix_command: str = ""
    frameworks: dict[str, Any] = {}


def _parse_frameworks(raw: Any) -> dict[str, Any]:
    """Decode a stored frameworks JSON column; return {} for NULL/garbage."""
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        value = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    return value if isinstance(value, dict) else {}


class ClassificationResult(BaseModel):
    command: str
    predicted_label: str
    confidence: float
    needs_review: bool
    suggested_rule: str = ""


class PendingReviewItem(BaseModel):
    id: str
    upload_id: str
    command: str
    predicted_label: str
    confidence: float
    suggested_rule: str
    status: str
    created_at: str
    reviewed_at: str | None = None
    reviewer_action: str | None = None


class UploadResponse(BaseModel):
    filename: str
    parsed: dict[str, Any]
    results: list[ComplianceResult]
    classifications: list[ClassificationResult]
    pending_review_count: int


class ReviewAction(BaseModel):
    action: str  # "approve", "reject", "relabel"
    new_label: str | None = None


from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - load model on startup."""
    init_db()
    load_classifier()
    yield


# FastAPI app
app = FastAPI(
    title="NetGuardian API",
    description="Network Security Compliance Auditor for Cisco IOS with AI Classification",
    version="0.2.0",
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
async def health_check() -> dict[str, Any]:
    """Health check endpoint."""
    return {"status": "healthy", "model_loaded": classifier is not None}


@app.post("/upload", response_model=UploadResponse)
async def upload_config(file: UploadFile = File(...)) -> UploadResponse:
    """
    Upload a Cisco IOS config file (.txt), parse it, run compliance checks,
    classify commands with AI, store results in database, and return everything.
    """
    # Validate file type
    if not file.filename or not file.filename.endswith((".txt", ".cfg", ".conf")):
        raise HTTPException(status_code=400, detail="Only .txt, .cfg, and .conf files are accepted")

    # Read file content
    content = await file.read()
    config_text = content.decode("utf-8", errors="replace")

    # Parse the config (TextFSM + regex)
    parsed = parse_cisco_ios(config_text)

    # Run compliance checks (20 CIS rules)
    compliance_results = check_compliance(parsed)

    # Extract and classify individual commands with AI
    commands = extract_commands_from_config(config_text)
    classifications = classify_commands(commands)

    # Separate pending reviews (low confidence)
    pending_items = [c for c in classifications if c["needs_review"]]

    # Save to database
    upload_id = save_upload(file.filename, parsed)
    save_results(upload_id, compliance_results)
    save_pending_reviews(upload_id, pending_items)

    # Convert results to response models
    compliance_response = [
        ComplianceResult(
            rule=r["rule"],
            reference=r["reference"],
            status=r["status"],
            fix_command=r.get("fix_command", ""),
            frameworks=r.get("frameworks", {}),
        )
        for r in compliance_results
    ]

    classification_response = [
        ClassificationResult(
            command=c["command"],
            predicted_label=c["predicted_label"],
            confidence=c["confidence"],
            needs_review=c["needs_review"],
            suggested_rule=c["suggested_rule"],
        )
        for c in classifications
    ]

    return UploadResponse(
        filename=file.filename,
        parsed=parsed,
        results=compliance_response,
        classifications=classification_response,
        pending_review_count=len(pending_items),
    )


@app.get("/uploads")
async def list_uploads() -> list[dict[str, Any]]:
    """List all uploaded configurations with their results summary."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT u.id, u.filename, u.uploaded_at, u.parsed_config,
               (SELECT COUNT(*) FROM results r WHERE r.upload_id = u.id) as total_checks,
               (SELECT COUNT(*) FROM results r
                WHERE r.upload_id = u.id AND r.status = 'PASS') as passed,
               (SELECT COUNT(*) FROM pending_reviews pr
                WHERE pr.upload_id = u.id AND pr.status = 'pending') as pending_reviews
        FROM uploads u
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
            "pending_reviews": row[6] or 0,
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

    # Get compliance results
    cursor.execute(
        """SELECT rule, reference, status, fix_command, frameworks, created_at
           FROM results WHERE upload_id = ? ORDER BY rule""",
        (upload_id,),
    )
    result_rows = cursor.fetchall()

    # Get pending reviews
    cursor.execute(
        """SELECT id, command, predicted_label, confidence, suggested_rule,
                  status, created_at, reviewed_at, reviewer_action
           FROM pending_reviews WHERE upload_id = ? ORDER BY created_at""",
        (upload_id,),
    )
    review_rows = cursor.fetchall()
    conn.close()

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
                "frameworks": _parse_frameworks(r[4]),
                "created_at": r[5],
            }
            for r in result_rows
        ],
        "pending_reviews": [
            {
                "id": r[0],
                "command": r[1],
                "predicted_label": r[2],
                "confidence": r[3],
                "suggested_rule": r[4],
                "status": r[5],
                "created_at": r[6],
                "reviewed_at": r[7],
                "reviewer_action": r[8],
            }
            for r in review_rows
        ],
    }


@app.get("/pending-reviews")
async def list_pending_reviews() -> list[PendingReviewItem]:
    """List all pending reviews across all uploads."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, upload_id, command, predicted_label, confidence, suggested_rule,
               status, created_at, reviewed_at, reviewer_action
        FROM pending_reviews
        WHERE status = 'pending'
        ORDER BY created_at DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    return [
        PendingReviewItem(
            id=r[0],
            upload_id=r[1],
            command=r[2],
            predicted_label=r[3],
            confidence=r[4],
            suggested_rule=r[5],
            status=r[6],
            created_at=r[7],
            reviewed_at=r[8],
            reviewer_action=r[9],
        )
        for r in rows
    ]


@app.post("/pending-reviews/{review_id}/resolve")
async def resolve_pending_review(review_id: str, action: ReviewAction) -> dict[str, Any]:
    """
    Resolve a pending review.
    action: "approve" - accept the predicted label
            "reject" - mark as incorrect
            "relabel" - provide a new_label
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Verify review exists
    cursor.execute(
        "SELECT id, status FROM pending_reviews WHERE id = ?",
        (review_id,),
    )
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Pending review not found")

    if row[1] != "pending":
        conn.close()
        raise HTTPException(status_code=400, detail="Review already resolved")

    # Update the review
    if action.action == "approve":
        reviewer_action = "approved"
    elif action.action == "reject":
        reviewer_action = "rejected"
    elif action.action == "relabel":
        reviewer_action = f"relabelled:{action.new_label}"
    else:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid action. Use: approve, reject, relabel")

    cursor.execute(
        """UPDATE pending_reviews
           SET status = 'resolved', reviewed_at = ?, reviewer_action = ?
           WHERE id = ?""",
        (datetime.now(timezone.utc).isoformat(), reviewer_action, review_id),
    )
    conn.commit()
    conn.close()

    return {"status": "resolved", "review_id": review_id, "action": reviewer_action}


@app.post("/classify")
async def classify_commands_endpoint(commands: list[str]) -> list[ClassificationResult]:
    """Classify a list of Cisco IOS commands without uploading a config file."""
    classifications = classify_commands(commands)

    return [
        ClassificationResult(
            command=c["command"],
            predicted_label=c["predicted_label"],
            confidence=c["confidence"],
            needs_review=c["needs_review"],
            suggested_rule=c["suggested_rule"],
        )
        for c in classifications
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)