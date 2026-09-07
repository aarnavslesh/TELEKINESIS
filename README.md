# NetGuardian

**AI-driven network security compliance auditor** for Cisco IOS configurations.
Built for Smart India Hackathon (SIH26155).

Upload a Cisco IOS running-config and NetGuardian will:

1. **Parse** it with TextFSM + regex fallbacks into 21 typed fields
   (SSH settings, VTY lines, NTP, logging, SNMP, ACLs, ...).
2. **Audit** it against **19 CIS Cisco IOS benchmark rules** executed as Python
   checks — each finding carries a suggested `fix_command` and is mapped to
   **four control frameworks: CIS, NIST SP 800-53, ISO/IEC 27001:2022 and
   NCIIPC**.
3. **Classify** every command with a local SetFit few-shot model
   (`BAAI/bge-small-en-v1.5`, no external LLM/API). Commands the model is unsure
   about (confidence < 0.65) go to a **human review queue** where a reviewer can
   approve, reject or relabel them.

> **Scope (honest statement):** the prototype supports **Cisco IOS only**, and
> compliance rules are executed as equivalent **Python checks**. Multi-vendor
> support and OPA/Rego policy evaluation are **planned post-prototype**.

## Architecture

```
upload (.txt/.cfg/.conf)
   │
   ▼
TextFSM template + regex fallbacks  →  parsed config dict
   │                                        │
   ▼                                        ▼
19 CIS checks (Python)                SetFit command classifier
   │                                        │
   ├─ PASS/FAIL + fix_command               ├─ confidence ≥ 0.65 → auto
   ├─ CIS / NIST / ISO 27001 / NCIIPC       └─ confidence < 0.65 → pending_reviews
   ▼
SQLite (uploads, results, pending_reviews)  →  JSON API response
```

See [docs/architecture.md](docs/architecture.md) for the detailed component
diagram and data flow.

## Install & run

Requirements: Python 3.10+. All dependencies live in **one** file:
`backend/requirements.txt`.

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
cd backend
pip install -r requirements.txt
uvicorn main:app --reload          # MUST be run from backend/ (uses local imports)
```

The API is now at `http://127.0.0.1:8000` (add `--port 8123` if 8000 is taken).
On startup the app creates `backend/netguardian.db` (SQLite) and loads the
trained classifier from `cisco-classifier-model/` (already in the repo — no
training required to run).

> The base embedding model (`BAAI/bge-small-en-v1.5`) is fetched from the local
> Hugging Face cache on first load. On a fully air-gapped machine, populate the
> cache from a connected staging machine first.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness + whether the AI model is loaded |
| POST | `/upload` | Upload a config (`.txt`/`.cfg`/`.conf`, multipart field `file`). Parses, audits, classifies, persists, returns everything |
| GET | `/uploads` | List all uploads with pass/fail counts |
| GET | `/uploads/{upload_id}` | Full detail for one upload |
| GET | `/pending-reviews` | All unresolved low-confidence classifications |
| POST | `/pending-reviews/{review_id}/resolve` | Reviewer action: `approve`, `reject`, or `relabel` (+ `new_label`) |
| POST | `/classify` | Classify a raw JSON list of commands (no upload) |

### Try it

```bash
# upload the bundled sample config
curl -s -X POST http://127.0.0.1:8000/upload \
  -F "file=@../sample_configs/cisco_router.txt" | python3 -m json.tool

# see the human-review queue
curl -s http://127.0.0.1:8000/pending-reviews | python3 -m json.tool

# resolve one review item
curl -s -X POST http://127.0.0.1:8000/pending-reviews/<review_id>/resolve \
  -H "Content-Type: application/json" \
  -d '{"action": "relabel", "new_label": "Logging"}'
```

The sample config (`sample_configs/cisco_router.txt`) intentionally mixes
compliant and non-compliant settings: the expected outcome is **19 findings —
12 PASS / 7 FAIL** (banner, telnet on VTY, NTP authentication, permissive ACL,
HTTP server, default SNMP communities, NTP authentication).

## Retraining the classifier (optional)

The deployed model already matches the label vocabulary — retraining is only
needed after you extend `dataset.csv` (command, label pairs across 10 labels:
`SSH Config, Password Policy, Banner, Access Control, Logging, NTP, AAA,
Interface, VLAN, Unknown`):

```bash
python train.py        # from the project root; writes ./cisco-classifier-model
```

Training runs fully locally on CPU (SetFit few-shot fine-tuning; no OpenAI,
Ollama or other external generative APIs).

## Project layout

```
backend/            FastAPI app (main.py), parser.py, compliance.py,
                    templates/cisco_ios.template, requirements.txt
cisco-classifier-model/   trained SetFit model loaded by the backend
dataset.csv         classifier training data (text,label)
train.py            retrains the classifier from dataset.csv
sample_configs/     sample Cisco IOS config with intentional GOOD/BAD settings
docs/architecture.md  component diagram + data flow
```
