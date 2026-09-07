# NetGuardian — Architecture

## Component diagram

```
┌──────────────────┐  POST /upload (.txt/.cfg/.conf)   ┌──────────────────────────────┐
│  React dashboard │ ────────────────────────────────▶ │      FastAPI backend          │
│  (planned; API   │ ◀──────────────────────────────── │      backend/main.py          │
│   fully usable   │        JSON response              │  CORS: localhost:3000/5173    │
│   via curl)      │                                   └──────┬───────────────┬───────┘
└──────────────────┘                                          │               │
                                                              │               │
                            parse_cisco_ios(config)           │               │  classify_commands(commands)
                              backend/parser.py               │               │  SetFit + bge-small-en-v1.5
                              ┌─────────────────────┐         │               │  (cisco-classifier-model/)
                              │ TextFSM template     │        │               │
                              │ templates/           │        ▼               ▼
                              │ cisco_ios.template   │   check_compliance()   21 typed fields
                              │ + regex fallbacks    │   backend/compliance.py      │
                              └──────────┬──────────┘   19 CIS rules           │
                                         │                  │                   │
                                         ▼                  ▼                   ▼
                              ┌───────────────────────────────────────────────────────┐
                              │ findings: rule, reference, status PASS/FAIL,          │
                              │ fix_command, frameworks {cis, nist, iso27001, nciipc} │
                              │ classifications: command, predicted_label, confidence,│
                              │ needs_review, suggested_rule                          │
                              └──────────────────────────┬────────────────────────────┘
                                                         │
                             confidence < 0.65 ──────────┤
                                                         ▼
                                        ┌──────────────────────────────┐
                                        │ SQLite  backend/netguardian.db│
                                        │ uploads | results |           │
                                        │ pending_reviews               │
                                        └──────────────────────────────┘
```

## Data flow

1. **Upload** — `POST /upload` validates the extension (`.txt`/`.cfg`/`.conf`),
   decodes as UTF-8 (`errors="replace"`), and keeps the raw text.
2. **Parse** — `parse_cisco_ios()` runs the TextFSM template as a first
   structured pass, then regex helpers fill gaps and compute typed values the
   flat template cannot express (booleans, lists, negation-aware state such as
   `no ip http server`, per-vty-line lists).
3. **Audit** — `check_compliance()` evaluates 19 CIS Cisco IOS benchmark rules
   against the parsed fields. Each finding carries a human-readable reference,
   a PASS/FAIL status, a suggested `fix_command` for failing rules, and a
   `frameworks` dict (below).
4. **Classify** — every individual command is embedded and classified by the
   local SetFit model in a single inference pass (argmax over `predict_proba`,
   columns aligned with `classifier.labels`). Predictions below the
   `CONFIDENCE_THRESHOLD` (0.65) are flagged `needs_review`.
5. **Persist** — uploads, findings and review-queue items are written to SQLite.
6. **Review** — `GET /pending-reviews` lists unresolved items;
   `POST /pending-reviews/{id}/resolve` applies `approve` / `reject` /
   `relabel` (+`new_label`) and timestamps the decision.

## SQLite tables

| Table | Purpose | Key columns |
|---|---|---|
| `uploads` | one row per uploaded config | `id` (uuid PK), `filename`, `uploaded_at`, `parsed_config` (JSON) |
| `results` | compliance findings per upload | `upload_id` (FK), `rule`, `reference`, `status`, `fix_command`, `frameworks` (JSON), `created_at` |
| `pending_reviews` | low-confidence classifications awaiting a human | `upload_id` (FK), `command`, `predicted_label`, `confidence`, `suggested_rule`, `status` (`pending`/`resolved`), `reviewer_action`, `created_at`, `reviewed_at` |

## Multi-framework mapping

Every finding is mapped to control identifiers in four frameworks so auditors
can report against whichever framework they answer to:

| Framework | Example for `cis-3.4.1` (SSH-only remote access) |
|---|---|
| CIS | `3.4.1` (CIS Cisco IOS Benchmark v1.0.0) |
| NIST SP 800-53 | `AC-17`, `AC-3` |
| ISO/IEC 27001:2022 | `A.8.5`, `A.5.15` |
| NCIIPC | `D3`, `D4` |

The mappings live in `FRAMEWORK_MAP` in `backend/compliance.py` and are
attached to every result before persistence.

## Scope & limitations (prototype)

- Cisco IOS only — other vendors are not detected and would misparse.
- Rules are plain Python functions, not a policy engine (OPA/Rego evaluation is
  planned post-prototype).
- The AI layer suggests categories for review; reviewer decisions are recorded
  but do not yet feed back into the model.
