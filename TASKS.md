# Implementation checklist

Checkboxes indicate acceptance, not effort started. SPEC.md defines requirements; AGENTS.md
defines workflow. P0 = release blocker, P1 = important, P2 = optional. Complexity is relative:
Small (one focused change), Medium (several modules), Large (cross-layer or experimental).
Dependencies refer to completed task IDs. Work in listed order where dependencies apply;
independent prototype/mobile work may proceed while ML runs. Phase numbers are groups,
not mandatory sequential gates; P6-06/P6-07 retain their IDs but belong to the mobile MVP.
No automatic next-task implementation.

## Active ownership

The user or a single coordinator serializes claims under the collaboration policy in
AGENTS.md. Record task ID, session owner, branch/worktree, file scope, status and date here;
coordinate directly before claiming from a separate worktree. Release claims on handoff
or completion; acceptance checkboxes above/below remain the shared completion record.

| Task | Session owner | Branch/worktree | File scope | Status | Date |
| --- | --- | --- | --- | --- | --- |
| P0-08 remote evidence | codex-ci-evidence-20261016 | main / current checkout | TASKS.md, docs/VALIDATION.md, README.md, ROADMAP.md | Complete; ownership released; GitHub run and ruleset verified; documentation checks passed | 2026-10-16 |
| P0-02 direction update | codex-mobile-docs-20261016 | main / current checkout | AGENTS.md, SPEC.md, TASKS.md, ROADMAP.md, README.md, docs/ARCHITECTURE.md | Complete; ownership released | 2026-10-16 |
| P0-06 through P0-09 evidence review | codex-foundation-review-20261016 | main / current checkout | TASKS.md, README.md, CONTRIBUTING.md, docs/VALIDATION.md | Review complete; ownership released; P0-08 evidence pending | 2026-10-16 |
| P0-10 / P0-11 coordinated dependency review | codex-deps-20261016 | main / current checkout | frontend/package.json, frontend/package-lock.json, frontend/eslint.config.mjs if needed, TASKS.md, docs/VALIDATION.md | Review complete; ownership released; both tasks blocked upstream | 2026-10-16 |
| P1-01 / P1-02 backend validation | codex-health-20261016 | main / current checkout | backend/tests, TASKS.md, docs/VALIDATION.md | Complete; ownership released | 2026-10-16 |
| P1-03 | codex-contract-20261016 | main / current checkout | backend/app, backend/tests, backend/pyproject.toml, backend/uv.lock, SPEC.md, README.md, docs/ARCHITECTURE.md, docs/VALIDATION.md, TASKS.md | Complete; ownership released | 2026-10-16 |
| P0-02 documentation corrections | codex-docs-correction-20261016 | main / current checkout | README.md, SPEC.md, TASKS.md, ROADMAP.md | Complete; ownership released; foundation validation and diff check passed | 2026-10-16 |
| P1-04 | codex-upload-validation-20261016 | feat/backend-foundation / current checkout | backend/app, backend/tests, SPEC.md, README.md, docs/ARCHITECTURE.md, docs/VALIDATION.md, TASKS.md | Complete; ownership released | 2026-10-16 |
| P2-01 | codex-ml-research-20261016 | feat/backend-foundation / current checkout | ml/README.md, TASKS.md | Research complete; ownership released; acceptance pending owner approval/rights clarification | 2026-10-16 |
| P1-05 | codex-errors-20261029 | feat/backend-foundation / current checkout | backend/app, backend/tests, SPEC.md, docs/ARCHITECTURE.md, docs/VALIDATION.md, TASKS.md | Complete; ownership released; 65 tests passed; see docs/VALIDATION.md | 2026-10-29 |
| P1-05 verification | codex-errors-verify-20261029 | feat/backend-foundation / current checkout; base ccd7619 | backend/app/core/errors.py, backend/app/schemas/errors.py, backend/app/schemas/predictions.py, backend/app/main.py, backend/app/api/predictions.py, backend/tests/test_errors.py, backend/tests/test_predictions.py, TASKS.md, docs/VALIDATION.md, README.md, SPEC.md | Complete; ownership released; 77 backend tests and required checks passed; P1-04 implementation inspected and 46 upload/prediction tests passed; preserve existing P1-04 and P2-01 work | 2026-10-29 |
| P1-06 | codex-backend-tests-20261029 | feat/backend-foundation / current checkout; base ccd7619 | backend/tests/test_image_upload.py, backend/tests/test_predictions.py, TASKS.md, docs/VALIDATION.md | Complete; ownership released; P1-05 baseline 77 passed; final 83 passed and required checks passed; CI collection verified locally, remote run pending (docs/VALIDATION.md) | 2026-10-29 |
| P2-01 follow-up | codex-ml-selection-20261029 | feat/backend-foundation / current checkout; base ccd7619 | ml/README.md, TASKS.md | Research handoff; ownership released; publisher/license distinctions updated in ml/README.md; owner scope/use/ShareAlike choices and exact weight/model permissions pending; documentation checks passed | 2026-10-29 |
| Local Uvicorn verification | codex-uvicorn-smoke-20261029 | feat/backend-foundation / current checkout; base ccd7619 | TASKS.md, docs/VALIDATION.md, README.md; unique temporary smoke artifacts only | Complete; ownership released; real Uvicorn loopback HTTP/contracts/IDs/CORS/log checks passed; owned process stopped and helper removed; empty temporary-directory cleanup denied (docs/VALIDATION.md) | 2026-10-29 |
| P2-01 owner decisions | codex-ml-decisions-20261029 | feat/backend-foundation / current checkout; base ccd7619 | ml/README.md, TASKS.md | Handoff; ownership released; owner scope/local-first/server-side/MIT/ShareAlike preferences recorded; exact dataset release and weight-specific local-use evidence pending (ml/README.md) | 2026-10-29 |
| P2-01 exact-source evidence | codex-ml-rights-20261029 | feat/backend-foundation / current checkout; base ccd7619 | ml/README.md, TASKS.md | Handoff; ownership released; PlantVillage revision 9e97599868962bd0079b8db4b7f1efa9185fa1e7 identified; exact ResNet18 local-use/license scope and artifact compatibility unresolved; unsent draft in ml/README.md | 2026-10-29 |
| P6-06 framework selection only | codex-mobile-framework-20261029 | feat/backend-foundation / current checkout; base ccd7619 | TASKS.md; docs/ARCHITECTURE.md only after owner choice | Selection review complete; ownership released pending owner choice; recommend React Native/Expo TypeScript; Node/npm present, Android SDK/Studio and Flutter/Dart not found in checked locations; JAVA_HOME/PATH JDK mismatch; no scaffolding/dependencies; P6-06 remains open | 2026-10-29 |
| P6-06 initial Expo scaffold | codex-mobile-scaffold-20261029 | feat/backend-foundation / current checkout; base ccd7619 | mobile/, AGENTS.md, SPEC.md, docs/ARCHITECTURE.md, README.md, TASKS.md, docs/VALIDATION.md | Scaffold portion complete; ownership released; Expo 58/strict TypeScript, lint/types/dependency alignment/Android JS export passed; no Android launch; audit findings recorded; whole P6-06 open | 2026-10-29 |
| P6-06 iPhone preview preparation | codex-iphone-preview-20261029 | feat/backend-foundation / current checkout; base ccd7619 | mobile/app.json, mobile/App.tsx, mobile/package.json (no dependency changes), mobile/README.md, docs/ARCHITECTURE.md, SPEC.md/README.md only if needed, TASKS.md, docs/VALIDATION.md | Preparation complete; ownership released; Android+iOS exports/lint/types/alignment passed; current App Store client supports SDK 58/iOS 16.4+; owner phone/client and device observations pending; P6-06 open | 2026-10-29 |

| P6-06 EAS project link | codex-eas-link-20261029 | feat/backend-foundation / current checkout; base ccd7619 | TASKS.md, docs/VALIDATION.md, mobile/README.md, docs/ARCHITECTURE.md; user-linked mobile/app.json preserved | Link verified; ownership released; remote project:info confirms @horti/horti and requested ID; config/foundation/diff checks passed; device run pending | 2026-10-29 |

| P6-06 iPhone launch evidence | codex-iphone-evidence-20261029 | feat/backend-foundation / current checkout; base ccd7619 | TASKS.md, docs/VALIDATION.md, docs/ARCHITECTURE.md, SPEC.md, README.md, mobile/README.md | Handoff; ownership released; owner confirmed screen on iPhone 13 Pro Max/iOS 26.5/Expo Go 58.0.5; enlarged text/VoiceOver pending, rotation unconfirmed; foundation/diff checks passed; P6-06 open | 2026-10-29 |
| P6-06 mobile upload/errors | codex-mobile-upload-20261029 | feat/backend-foundation / current checkout; base ccd7619 | mobile/ except owner EAS config; TASKS.md, docs/VALIDATION.md, docs/ARCHITECTURE.md and status docs if needed | Handoff; ownership released; upload client/component and 21 mocked tests pass; photo-selection prerequisite absent, component unmounted, integration/iPhone upload blocked pending scope clarification; P6-06 open | 2026-10-29 |

| P6-06 photo-selection prerequisite | codex-photo-select-20261029 | feat/backend-foundation / current checkout; base ccd7619 | mobile/App.tsx, mobile/src selection files/tests, mobile/package.json and lock, mobile/app.json picker permission config, mobile/README.md, README.md status, TASKS.md, docs/ARCHITECTURE.md, docs/VALIDATION.md | Handoff; ownership released; selection mounted, upload remains unmounted; 47 tests/lint/types/alignment/both exports/foundation/diff passed; audit28 (3high/25low); iPhone/VoiceOver/large-text checks pending; P6-06 open | 2026-10-29 |

| P6-06 selection error popup and product direction | codex-photo-feedback-20261029 | feat/backend-foundation / current checkout; base ccd7619 | mobile/App.tsx, mobile/src/photo-selection.tsx and tests, mobile/README.md, AGENTS.md, README.md, SPEC.md, docs/ARCHITECTURE.md, docs/VALIDATION.md, TASKS.md | Handoff; ownership released; owner basic selection checks passed, new popup device check pending; 49 tests/lint/types/alignment/both exports/foundation/diff passed; product/UI release expectations recorded; no upload wiring; P6-06 open | 2026-10-29 |

| P6-06 selection-to-upload integration | codex-selection-upload-20261029 | feat/backend-foundation / current checkout; base ccd7619 | mobile/App.tsx, controlled selection interface, UploadPanel wording, mobile tests, README.md/mobile setup, TASKS.md, docs/ARCHITECTURE.md, docs/VALIDATION.md; no dependency/config/backend changes | Handoff; ownership released; one shared selection/revision, existing upload client mounted; red popup preserved; 63 mobile/83 backend tests and mobile checks/both exports/foundation/diff passed; manifest/lock/EAS unchanged; iPhone upload/popup/accessibility pending; P6-06 open | 2026-10-29 |

| P6-06 iPhone upload runtime verification | codex-iphone-upload-verify-20261029 | feat/backend-foundation / current checkout; base ccd7619 | TASKS.md, docs/VALIDATION.md; owned temporary runtime logs/process only | Handoff; ownership released pending owner phone results; trusted LAN API running at 10.0.0.157:8000 (owned PID25524/session35034), Windows health200; Metro restart commands supplied, security settings unchanged; phone health/upload/UUID/popup results pending; P6-06 open | 2026-10-29 |

| P6-06 iPhone upload diagnosis | codex-upload-diagnosis-20261029 | feat/backend-foundation / current checkout; base ccd7619 | mobile/src/uploads.ts, mobile/src/UploadPanel.tsx, related tests, mobile/README.md, docs/VALIDATION.md, TASKS.md | Handoff; ownership released; dev health diagnostic implemented; owner clarified laptop health only, iPhone browsers and upload fail despite Local Network enabled; LAN listener/host200 confirmed; connectivity cause unresolved, no firewall changes | 2026-10-30 |
| P6-07 camera capture portion | codex-camera-capture-20261029 | feat/backend-foundation / current checkout; base ccd7619 | mobile/src/photo-selection.tsx and tests, mobile/app.json, mobile/App.tsx, README.md, SPEC.md, docs/ARCHITECTURE.md, mobile/README.md, TASKS.md, docs/VALIDATION.md | Handoff; ownership released; still capture/permission denial/cancel/shared preview implemented; 77 mobile/83 backend tests, lint/types/alignment/both exports/config introspection/foundation/diff passed; device acceptance and P4-01 remain pending; P6-07 open | 2026-10-30 |

| P6-06 temporary LAN firewall test | codex-lan-firewall-20261030 | feat/backend-foundation / current checkout; base ccd7619 | TASKS.md, docs/VALIDATION.md; no system mutation succeeded | Handoff; ownership released; owner approved scoped rule, preflight passed; New-NetFirewallRule denied by Windows error5 (administrator rights required), no rule created; owner-admin execution/device result pending | 2026-10-30 |

| P6-06 phone LAN failure follow-up | codex-lan-followup-20261030 | feat/backend-foundation / current checkout; base ccd7619 | TASKS.md, docs/VALIDATION.md; read-only runtime/firewall inspection | Handoff; ownership released; no VPN/http confirmed; sandbox inbound block discovered and preserved; approved outside-sandbox API restart PID10316/session82994, host200; phone retry pending; no firewall edits; P6-06 open | 2026-10-30 |

| P6-06 SDK58 multipart runtime fix | codex-expo-upload-fix-20261030 | feat/backend-foundation / current checkout; base ccd7619 | mobile/src/uploads.ts, upload/screen tests, mobile/package.json and lock if direct SDK File declaration needed, mobile/README.md, TASKS.md, docs/VALIDATION.md, docs/ARCHITECTURE.md | Handoff; ownership released; SDK58 descriptor rejection reproduced and fixed with File/expo-fetch; same installed FileSystem version declared directly; 78 mobile/83 backend tests, lint/types/alignment/exports/foundation/diff pass; phone503/UUID retry pending; P6-06 open | 2026-10-30 |

| P6-06 upload evidence and interface states | codex-mobile-states-20261030 | feat/backend-foundation / current checkout; base ccd7619 | mobile upload feedback/components/tests, mobile/README.md, TASKS.md, docs/ARCHITECTURE.md, docs/VALIDATION.md | Handoff; ownership released; real phone503/UUID matched; loading/error cards implemented, uncertainty component test-only/unmounted; 92 mobile/83 backend tests and lint/types/alignment/exports/foundation/diff pass; device race/accessibility pending; P6-06 open | 2026-10-30 |

| Branch checkpoint review and push | codex-checkpoint-20261030 | feat/backend-foundation / current checkout; base ccd7619 | reviewed backend/mobile/ML source and docs; explicit staging excludes personal/generated/private inputs | In progress; user authorizes focused commits and origin branch push only; full connectivity/camera/accessibility/audit acceptance open | 2026-10-30 |

## Phase 0 — Project Foundation

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | P0-01 | Inspect repository and establish structure | P0 | None | Existing files inspected; backend/frontend/ML responsibilities documented | Small |
| [x] | P0-02 | Write requirements, architecture and workflow docs | P0 | P0-01 | README, SPEC, AGENTS, TASKS, ROADMAP, CONTRIBUTING agree | Medium |
| [x] | P0-03 | Configure Python/Node dependencies | P0 | P0-01 | Manifests and locks resolve; ML extra separate from default API install | Small |
| [x] | P0-04 | Configure code quality | P0 | P0-03 | Ruff, ESLint and strict TypeScript commands defined and pass locally | Small |
| [x] | P0-05 | Configure environment and Git hygiene | P0 | P0-01 | Root .env loader documented; example safe; data/secrets/builds ignored | Small |
| [x] | P0-06 | Validate initial test infrastructure | P0 | P0-03 | pytest runs isolated API tests without data/GPU/services; developer reported 2 passed on 2026-10-15; see docs/VALIDATION.md for command and evidence limits | Small |
| [x] | P0-07 | Define GitHub Actions checks | P0 | P0-04, P0-06 | Minimal workflow includes locked installs, lint, types, tests and build | Small |
| [x] | P0-08 | Verify checks on GitHub | P0 | P0-07 | Push CI run 38758447780 succeeded for 274d123; main ruleset inspected on 2026-10-16 (required-check list empty); see docs/VALIDATION.md for evidence and scope | Small |
| [x] | P0-09 | Choose project license | P1 | P0-02 | Owner explicitly chooses; LICENSE and README updated consistently | Small |
| [ ] | P0-10 | Upgrade ESLint when plugins support it | P1 | P0-04 | Supported ESLint major with no peer conflicts; locked install and lint pass before release; 2026-10-16 review blocked by published React/import/JSX accessibility plugin peers (docs/VALIDATION.md) | Small |
| [ ] | P0-11 | Resolve frontend tooling audit advisory | P1 | P0-03 | Remove GHSA-vfj7-8cjw-p6xm through an upstream-compatible fix or separately reviewed tooling change; full audit and lint/types/build pass; do not force downgrade Next.js lint config; 2026-10-16 audit still finds 5 high findings from this advisory, no patched braces release (docs/VALIDATION.md) | Medium |
| [x] | P0-12 | Share CLI instructions and collaboration policy | P1 | P0-02 | Root AGENTS.md covers three tools, ownership/worktrees/handoff/security; official conventions checked; local config syntax validated and unavailable runtime checks disclosed | Small |

## Phase 1 — Backend MVP

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | P1-01 | Validate minimal FastAPI factory and settings | P0 | P0-03, P0-05 | Runtime imports, factory creation, isolated injected settings and health OpenAPI verified by pytest on 2026-10-16; see docs/VALIDATION.md | Small |
| [x] | P1-02 | Validate health-check endpoint | P0 | P1-01, P0-06 | GET /health returns HTTP 200 and exactly {"status":"ok"}; existing CORS tests pass on 2026-10-16; see docs/VALIDATION.md | Small |
| [x] | P1-03 | Versioned upload endpoint contract | P0 | P1-02, P0-02 | /api/v1/predictions multipart contract in OpenAPI; service boundary; unavailable model returns 503, never fake success; 11 tests pass on 2026-10-16 (docs/VALIDATION.md); bounded image validation remains P1-04 | Medium |
| [x] | P1-04 | Bounded image validation | P0 | P1-03 | JPEG/PNG decoded validation; streaming 5 MiB/20 MP limits; corrupt/animated/spoofed cases; no filename paths; request/parser overhead limits and cleanup verified by 51 passing tests on 2026-10-16 (docs/VALIDATION.md) | Medium |
| [x] | P1-05 | Uniform errors and request IDs | P0 | P1-04 | SPEC envelope for validation/domain/HTTP/unexpected failures; server-owned UUIDs; safe logs and no stack disclosure; 77 backend tests and required checks passed on 2026-10-29 (docs/VALIDATION.md) | Medium |
| [x] | P1-06 | Backend unit and integration tests | P0 | P1-05 | Boundary sizes/types, corrupt inputs, CORS POST, unavailable model and uniform errors covered by 83 passing tests on 2026-10-29; CI collection verified locally, remote run pending (docs/VALIDATION.md) | Medium |
| [ ] | P1-07 | Reviewed disease content service | P0 | P1-05, P2-02 | Versioned validated content and list/detail endpoints; each class sourced/reviewed; 404 tests | Medium |

## Phase 2 — Machine Learning

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | P2-01 | Research datasets and pretrained weights | P0 | P0-02 | Compare scope, original licenses, class/sample quality and field relevance; approve one small class set; research/recommendation and rights follow-up in ml/README.md (2026-10-29); owner approved conditional three-class educational scope, local-first/server-side use and artifact-license preference; immutable PlantVillage revision/declared terms evidenced; ResNet18 artifact-specific local-use license scope and fine-tuned-artifact compatibility unresolved (ml/README.md); public release separate | Medium |
| [ ] | P2-02 | Document dataset provenance | P0 | P2-01 | Exact version/license/attribution and class mapping recorded; data outside Git | Small |
| [ ] | P2-03 | Exploratory analysis and leakage-safe splits | P0 | P2-02 | Counts, quality, duplicates and group split manifests; sealed test partition | Medium |
| [ ] | P2-04 | Shared image preprocessing | P0 | P2-03, P1-04 | Importable transforms match training/inference; orientation/RGB/shape tests | Medium |
| [ ] | P2-05 | Baseline model | P0 | P2-04 | Simple baseline measured on validation with saved configuration | Medium |
| [ ] | P2-06 | Transfer learning experiment | P0 | P2-05 | ResNet18 or MobileNetV3 head/fine-tuning compared on validation, seed recorded | Large |
| [ ] | P2-07 | Reproducible training scripts | P0 | P2-06 | CLI reruns chosen experiment from split/config; no notebook-only pipeline | Medium |
| [ ] | P2-08 | Held-out evaluation and model card | P0 | P2-07 | Accuracy, macro/per-class metrics, confusion matrix, CPU latency, limitations and threshold evidence recorded | Medium |
| [ ] | P2-09 | Artifact management | P0 | P2-08 | Manifest/checksum/classes/transforms/licenses/version; weights outside Git | Medium |
| [ ] | P2-10 | Inference service and readiness | P0 | P2-09, P1-06 | Trusted model loaded once; eval/inference_mode; bounded CPU work; scores/uncertainty; 503 readiness test | Large |

## Phase 3 — Intermediate web prototype

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | P3-01 | Next.js/TypeScript/Tailwind scaffold | P0 | P0-03 | Static landing page; lint/types/build pass; no prediction claim | Small |
| [ ] | P3-02 | Prototype homepage and navigation (optional before mobile) | P1 | P3-01, P0-02 | Explains supported crop set/limits and links to upload flow | Small |
| [ ] | P3-03 | Accessible image upload | P0 | P3-01, P1-04 | Keyboard file picker, preview, client size/type hints; server remains authoritative | Medium |
| [ ] | P3-04 | Loading and cancellation states | P0 | P3-03 | Disable duplicate submissions; announce progress and handle cancellation | Small |
| [ ] | P3-05 | Results display | P0 | P3-04, P2-02 | Typed result/uncertainty UI with score limitations and reviewed source links; fixtures only in tests | Medium |
| [ ] | P3-06 | API client integration | P0 | P3-05, P1-06 | Configured public API URL; multipart JSON contracts; no secrets in browser | Medium |
| [ ] | P3-07 | Error and retry states | P0 | P3-06 | Invalid image, unavailable API/model, timeout and unknown errors accessible and tested | Medium |
| [ ] | P3-08 | Prototype responsive/accessibility review (optional before mobile) | P2 | P3-07 | 375px/1280px and keyboard checks; clear focus/labels; frontend interaction tests | Medium |

## Mobile MVP (existing task IDs retained)

Android and Google Play are the initial release target. iOS is a future decision.
React Native with Expo and strict TypeScript is selected; mobile/ contains an initial
scaffold with shared single-photo selection/preview and explicit unavailable-service upload;
real iPhone upload acceptance remains pending. A completed web prototype, including P4-02, is not
a prerequisite for mobile development; web polish (P3-02/P3-08) and web hosting
(P5-04) do not block it. Accounts, history, Supabase and retained photos are deferred.
P6-06 can build success/uncertainty screens using test fixtures against the API contract.
Real prediction integration requires P4-01 and is verified in P6-07; fixtures must never
be returned as predictions by the production API.

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | P6-06 | Anonymous Android application | P0 | P1-03, P0-02 | Framework choice documented without presupposing one; same REST API; select/submit image and display prediction, uncertainty, reviewed information; success/uncertainty screens may use test fixtures until real integration in P4-01/P6-07; no fake production API predictions; loading/error/retry tests; no accounts/history/Supabase/photo retention | Large |
| [ ] | P6-07 | Android camera capture and prediction integration | P0 | P6-06, P4-01 | Capture/select reaches real inference; permission denial, orientation, privacy and device behavior validated | Medium |

## Phase 4 — Integration

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | P4-01 | Connect ML to prediction API | P0 | P2-10, P1-07 | Real-artifact response follows SPEC; reviewed content matches classes | Medium |
| [ ] | P4-02 | Connect web prototype and backend end-to-end | P0 | P4-01, P3-07 | Real upload produces honest model result and content in browser | Medium |
| [ ] | P4-03 | Mobile end-to-end regression tests | P0 | P4-01, P6-07 | Android success/error/uncertainty flows; CI small deterministic fixture; separate real-weight smoke evidence | Medium |
| [ ] | P4-04 | Performance checks | P0 | P4-03 | SPEC 100-request CPU benchmark reported; bounded memory/concurrency | Medium |
| [ ] | P4-05 | Security and privacy validation | P0 | P4-04 | Upload abuse/CORS/error/log/dependency review; ingress rate limits planned for hosting | Medium |
| [ ] | P4-06 | Local mobile MVP acceptance review | P0 | P4-05, P0-08 | Every SPEC mobile MVP criterion met; fresh-clone Android/API instructions verified; limitations documented | Small |

## Phase 5 — Deployment

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | P5-01 | Docker configuration | P1 | P4-06 | Reproducible non-root builds, artifact injection, health/readiness; Compose only if useful | Medium |
| [ ] | P5-02 | Production environment design | P0 | P5-01 | Explicit origins, model path/version, resource/rate limits, HTTPS and secret injection documented | Medium |
| [ ] | P5-03 | Backend hosting | P0 | P5-02 | Affordable CPU host; real readiness/inference smoke; no reload; bounded requests | Medium |
| [ ] | P5-04 | Web prototype hosting (optional) | P2 | P5-03 | If chosen, HTTPS prototype and API URL; hosted upload works with production CORS | Small |
| [ ] | P5-05 | Android / Google Play release validation | P0 | P5-03, P6-07 | Mobile build/release checks, hosted API smoke, Google Play requirements, scoped signing credentials, separate release approval and rollback tested | Medium |
| [ ] | P5-06 | Deployment and operation guide | P0 | P5-05 | Fresh deployment, smoke, rollback, costs, artifact updates and limitations documented | Small |

## Phase 6 — Future Improvements (optional; separately scoped)

| Done | ID | Description | Priority | Dependencies | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | P6-01 | User accounts | P2 | P5-06 | Auth threat model, ownership/consent, safe credentials/session tests | Large |
| [ ] | P6-02 | Prediction history and migrations | P2 | P6-01 | SQLAlchemy/Alembic, ownership, deletion/retention, SQLite/PostgreSQL migration tests | Large |
| [ ] | P6-03 | Model monitoring | P2 | P5-06 | Privacy-preserving latency/errors/shift signals; no unsupported accuracy claims | Medium |
| [ ] | P6-04 | Disease severity estimation | P2 | P6-03 | Licensed severity labels, separate evaluation and uncertainty; expert-reviewed meaning | Large |
| [ ] | P6-05 | Additional crops | P2 | P5-06 | Provenance and held-out metrics per added class; backward compatible IDs | Large |
| [ ] | P6-08 | Optional real-time monitoring | P2 | P6-03, P6-07 | Separate requirements, cost/privacy analysis and evaluated prototype | Large |
