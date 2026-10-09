# Implementation checklist

Checkboxes indicate acceptance, not effort started. SPEC.md defines requirements; AGENTS.md
defines workflow. P0 = release blocker, P1 = important, P2 = optional. Complexity is relative:
Small (one focused change), Medium (several modules), Large (cross-layer or experimental).
Dependencies refer to completed task IDs. Work in listed order where dependencies apply;
independent frontend work may proceed while ML runs. No automatic next-task implementation.

## Active ownership

The user or a single coordinator serializes claims under the collaboration policy in
AGENTS.md. Record task ID, session owner, branch/worktree, file scope, status and date here;
coordinate directly before claiming from a separate worktree. Release claims on handoff
or completion; acceptance checkboxes above/below remain the shared completion record.

No active claims. Add an entry with the fields above when starting an authorized task.

## Phase 0 — Project Foundation

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | P0-01 | Inspect repository and establish structure | P0 | None | Existing files inspected; backend/frontend/ML responsibilities documented | Small |
| [x] | P0-02 | Write requirements, architecture and workflow docs | P0 | P0-01 | README, SPEC, AGENTS, TASKS, ROADMAP, CONTRIBUTING agree | Medium |
| [x] | P0-03 | Configure Python/Node dependencies | P0 | P0-01 | Manifests and locks resolve; ML extra separate from default API install | Small |
| [x] | P0-04 | Configure code quality | P0 | P0-03 | Ruff, ESLint and strict TypeScript commands defined and pass locally | Small |
| [x] | P0-05 | Configure environment and Git hygiene | P0 | P0-01 | Root .env loader documented; example safe; data/secrets/builds ignored | Small |
| [ ] | P0-06 | Validate initial test infrastructure | P0 | P0-03 | pytest runs isolated API tests without data/GPU/services; infrastructure created, local runtime blocked by Windows policy | Small |
| [x] | P0-07 | Define GitHub Actions checks | P0 | P0-04, P0-06 | Minimal workflow includes locked installs, lint, types, tests and build | Small |
| [ ] | P0-08 | Verify checks on GitHub | P0 | P0-07 | Workflow succeeds on push/PR; repository branch rules considered | Small |
| [ ] | P0-09 | Choose project license | P1 | P0-02 | Owner explicitly chooses; LICENSE and README updated consistently | Small |
| [ ] | P0-10 | Upgrade ESLint when plugins support it | P1 | P0-04 | Supported ESLint major with no peer conflicts; locked install and lint pass before release | Small |
| [ ] | P0-11 | Resolve frontend tooling audit advisory | P1 | P0-03 | Remove GHSA-vfj7-8cjw-p6xm through an upstream-compatible fix or separately reviewed tooling change; full audit and lint/types/build pass; do not force downgrade Next.js lint config | Medium |
| [x] | P0-12 | Share CLI instructions and collaboration policy | P1 | P0-02 | Root AGENTS.md covers three tools, ownership/worktrees/handoff/security; official conventions checked; local config syntax validated and unavailable runtime checks disclosed | Small |

## Phase 1 — Backend MVP

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | P1-01 | Validate minimal FastAPI factory and settings | P0 | P0-03, P0-05 | Scaffold created; confirm package imports, injected settings and OpenAPI at runtime after Windows policy blocker | Small |
| [ ] | P1-02 | Validate health-check endpoint | P0 | P1-01, P0-06 | Endpoint/test created; confirm GET /health returns 200 and exact schema at runtime | Small |
| [ ] | P1-03 | Versioned upload endpoint contract | P0 | P1-02, P0-02 | /api/v1/predictions multipart contract in OpenAPI; service boundary; unavailable model returns 503, never fake success | Medium |
| [ ] | P1-04 | Bounded image validation | P0 | P1-03 | JPEG/PNG decoded validation; streaming 5 MiB/20 MP limits; corrupt/animated/spoofed cases; no filename paths | Medium |
| [ ] | P1-05 | Uniform errors and request IDs | P0 | P1-04 | SPEC envelope for validation/domain/unexpected failures; safe logs and no stack disclosure | Medium |
| [ ] | P1-06 | Backend unit and integration tests | P0 | P1-05 | Boundary sizes/types, corrupt inputs, CORS POST and unavailable model covered in CI | Medium |
| [ ] | P1-07 | Reviewed disease content service | P0 | P1-05, P2-02 | Versioned validated content and list/detail endpoints; each class sourced/reviewed; 404 tests | Medium |

## Phase 2 — Machine Learning

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | P2-01 | Research datasets and pretrained weights | P0 | P0-02 | Compare scope, original licenses, class/sample quality and field relevance; approve one small class set | Medium |
| [ ] | P2-02 | Document dataset provenance | P0 | P2-01 | Exact version/license/attribution and class mapping recorded; data outside Git | Small |
| [ ] | P2-03 | Exploratory analysis and leakage-safe splits | P0 | P2-02 | Counts, quality, duplicates and group split manifests; sealed test partition | Medium |
| [ ] | P2-04 | Shared image preprocessing | P0 | P2-03, P1-04 | Importable transforms match training/inference; orientation/RGB/shape tests | Medium |
| [ ] | P2-05 | Baseline model | P0 | P2-04 | Simple baseline measured on validation with saved configuration | Medium |
| [ ] | P2-06 | Transfer learning experiment | P0 | P2-05 | ResNet18 or MobileNetV3 head/fine-tuning compared on validation, seed recorded | Large |
| [ ] | P2-07 | Reproducible training scripts | P0 | P2-06 | CLI reruns chosen experiment from split/config; no notebook-only pipeline | Medium |
| [ ] | P2-08 | Held-out evaluation and model card | P0 | P2-07 | Accuracy, macro/per-class metrics, confusion matrix, CPU latency, limitations and threshold evidence recorded | Medium |
| [ ] | P2-09 | Artifact management | P0 | P2-08 | Manifest/checksum/classes/transforms/licenses/version; weights outside Git | Medium |
| [ ] | P2-10 | Inference service and readiness | P0 | P2-09, P1-06 | Trusted model loaded once; eval/inference_mode; bounded CPU work; scores/uncertainty; 503 readiness test | Large |

## Phase 3 — Frontend

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | P3-01 | Next.js/TypeScript/Tailwind scaffold | P0 | P0-03 | Static landing page; lint/types/build pass; no prediction claim | Small |
| [ ] | P3-02 | MVP homepage and navigation | P1 | P3-01, P0-02 | Explains supported crop set/limits and links to upload flow | Small |
| [ ] | P3-03 | Accessible image upload | P0 | P3-02, P1-04 | Keyboard file picker, preview, client size/type hints; server remains authoritative | Medium |
| [ ] | P3-04 | Loading and cancellation states | P0 | P3-03 | Disable duplicate submissions; announce progress and handle cancellation | Small |
| [ ] | P3-05 | Results display | P0 | P3-04, P2-02 | Typed result/uncertainty UI with score limitations and reviewed source links; fixtures only in tests | Medium |
| [ ] | P3-06 | API client integration | P0 | P3-05, P1-06 | Configured public API URL; multipart JSON contracts; no secrets in browser | Medium |
| [ ] | P3-07 | Error and retry states | P0 | P3-06 | Invalid image, unavailable API/model, timeout and unknown errors accessible and tested | Medium |
| [ ] | P3-08 | Responsive/accessibility review | P0 | P3-07 | 375px/1280px and keyboard checks; clear focus/labels; frontend interaction tests | Medium |

## Phase 4 — Integration

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | P4-01 | Connect ML to prediction API | P0 | P2-10, P1-07 | Real-artifact response follows SPEC; reviewed content matches classes | Medium |
| [ ] | P4-02 | Connect frontend and backend end-to-end | P0 | P4-01, P3-08 | Real upload produces honest model result and content in browser | Medium |
| [ ] | P4-03 | End-to-end regression tests | P0 | P4-02 | Success/error/uncertainty flows; CI small deterministic fixture; separate real-weight smoke evidence | Medium |
| [ ] | P4-04 | Performance checks | P0 | P4-03 | SPEC 100-request CPU benchmark reported; bounded memory/concurrency | Medium |
| [ ] | P4-05 | Security and privacy validation | P0 | P4-04 | Upload abuse/CORS/error/log/dependency review; ingress rate limits planned for hosting | Medium |
| [ ] | P4-06 | Local MVP acceptance review | P0 | P4-05, P0-08 | Every SPEC MVP criterion met; fresh-clone instructions verified; limitations documented | Small |

## Phase 5 — Deployment

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | P5-01 | Docker configuration | P1 | P4-06 | Reproducible non-root builds, artifact injection, health/readiness; Compose only if useful | Medium |
| [ ] | P5-02 | Production environment design | P0 | P5-01 | Explicit origins, model path/version, resource/rate limits, HTTPS and secret injection documented | Medium |
| [ ] | P5-03 | Backend hosting | P0 | P5-02 | Affordable CPU host; real readiness/inference smoke; no reload; bounded requests | Medium |
| [ ] | P5-04 | Frontend hosting | P0 | P5-03 | HTTPS frontend and API URL; hosted upload works with production CORS | Small |
| [ ] | P5-05 | CI/release pipeline validation | P0 | P5-04 | Build/release checks, scoped credentials, separate release approval and rollback tested | Medium |
| [ ] | P5-06 | Deployment and operation guide | P0 | P5-05 | Fresh deployment, smoke, rollback, costs, artifact updates and limitations documented | Small |

## Phase 6 — Future Improvements (optional; separately scoped)

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | P6-01 | User accounts | P2 | P5-06 | Auth threat model, ownership/consent, safe credentials/session tests | Large |
| [ ] | P6-02 | Prediction history and migrations | P2 | P6-01 | SQLAlchemy/Alembic, ownership, deletion/retention, SQLite/PostgreSQL migration tests | Large |
| [ ] | P6-03 | Model monitoring | P2 | P5-06 | Privacy-preserving latency/errors/shift signals; no unsupported accuracy claims | Medium |
| [ ] | P6-04 | Disease severity estimation | P2 | P6-03 | Licensed severity labels, separate evaluation and uncertainty; expert-reviewed meaning | Large |
| [ ] | P6-05 | Additional crops | P2 | P5-06 | Provenance and held-out metrics per added class; backward compatible IDs | Large |
| [ ] | P6-06 | Mobile application | P2 | P5-06 | Same REST API; platform choice justified; upload/results tests | Large |
| [ ] | P6-07 | Camera-based capture | P2 | P6-06 | Permission denial, orientation and privacy handling validated | Medium |
| [ ] | P6-08 | Optional real-time monitoring | P2 | P6-03, P6-07 | Separate requirements, cost/privacy analysis and evaluated prototype | Large |
