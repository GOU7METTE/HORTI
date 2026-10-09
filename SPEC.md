# Smart Agriculture specification

## Scope and status

This document defines planned behavior unless explicitly described as implemented.
The foundation implements GET /health, validated environment settings, an origin allowlist,
tests, and a static frontend landing page. No uploads, model, database tables, accounts,
history, or deployment exist. MVP scope: anonymous, single-image classification for a
small documented crop/class set, with reviewed disease information. Crop monitoring is
a future goal, not an MVP capability.

## Functional requirements

| ID | Requirement |
| --- | --- |
| FR-01 | Accept one leaf image through the web interface and a public REST API. |
| FR-02 | Accept JPEG/PNG only, at most 5 MiB (5,242,880 bytes), decoded dimensions at most 20 megapixels. Enforce byte limits while reading, verify decoded content, reject corrupt, animated, or unsupported images. MIME/extension alone is insufficient. |
| FR-03 | Apply EXIF orientation, convert to RGB, resize and normalize using artifact-declared transforms. Never use the client filename as a storage path; process in memory and discard images after the request. |
| FR-04 | Run one versioned classifier and return crop, label, top candidates, scores, model version, and uncertainty state. Do not return fabricated predictions when the model is unavailable. |
| FR-05 | Display scores with an explanation: model confidence is not necessarily calibrated probability, and a prediction is not a confirmed diagnosis. |
| FR-06 | Display reviewed disease descriptions and general crop management guidance with source links, review dates, and applicable crop/region. No generated treatment advice or automatic pesticide recommendations. |
| FR-07 | Clearly show loading, retryable errors, unsupported input, and uncertain results; provide accessible keyboard interaction and responsive layouts. |
| FR-08 | Permit future prediction history without requiring persistence or accounts for MVP. |
| FR-09 | Keep browser-independent REST contracts so future mobile clients use the same API. |

## Nonfunctional requirements

- **Maintainability:** small modules, typed boundaries, business logic in services, documented
  contracts, no premature queues or microservices.
- **Security:** allowlisted CORS; no secrets in Git; bounded reads and decoded pixels;
  no unsafe deserialization of untrusted weights; no raw image, EXIF, or filename logs.
  Use trusted weights/checksums and safe state-dict loading. Before public exposure add
  HTTPS, request limits, timeouts, rate limiting, dependency audit, and generic server errors.
- **Performance:** target warmed inference p95 <= 3 seconds for one image on a documented
  CPU deployment, excluding upload network time, measured over at least 100 requests at
  concurrency 1. Benchmark before setting higher concurrency; cap in-flight work.
- **Reliability:** liveness is independent of inference readiness; return 503 for unavailable
  models, never substitute mock results. Model loads once per worker, not per request.
- **Testability:** injected services and temporary databases; CI needs no dataset, GPU,
  weights, or external service. Test upload boundaries and unavailable inference explicitly.
- **Extensibility:** additive v1 changes, explicit new version for breaking changes, SQLAlchemy
  models and Alembic migrations when persistence begins.
- **Reproducibility:** tracked dependency locks, dataset provenance/split manifests, seeds,
  transforms, code revision, metrics, and artifact checksums. Record nondeterministic operations.
- **Privacy/cost:** anonymous ephemeral uploads, CPU baseline, no image retention by default;
  document consent/retention before introducing history. No paid services required locally.

## Machine learning specification

### Dataset selection and provenance

Research public plant disease datasets; no dataset has been selected or licensed for this
repository. PlantVillage is a candidate, not an approved input. Before downloading, record
the original publisher, exact source/version, license text/link, attribution, redistribution
and model-use permissions, class counts, collection conditions, and any privacy concerns.
Do not assume a mirror's license covers original images. Reject unclear rights. Store data
outside Git under ignored data/ or a configured external path. Document distribution shift
between controlled leaf images and field photographs. Select a small supported crop/class
set with enough independent samples, healthy examples, and reviewed class semantics.

### Training and validation

1. Inspect image quality, class balance, duplicates/near-duplicates and metadata. Group
   by plant, source session, or collection when identifiers exist; use duplicate groups otherwise.
2. Create a fixed, stratified group split targeting 70/15/15 train/validation/test; document
   deviations for small classes. Keep the test split sealed until final evaluation.
3. Fit transformations/statistics only on training data; apply augmentation only during training.
   Never let variants of the same source image cross splits. Document residual leakage risk
   where plant identity is unavailable.
4. Establish a simple baseline, then transfer-learn ResNet18 or MobileNetV3 using pretrained
   weights with separately documented weight licenses. Replace the classifier head, train
   it first, then optionally fine-tune selected layers using validation performance.
5. Choose hyperparameters and uncertainty threshold on validation only. Record seed, optimizer,
   scheduler, epochs, stopping rule, imbalance handling, preprocessing, and hardware.
6. Evaluate once on held-out test data: accuracy, macro F1, per-class precision/recall/F1,
   confusion matrix, sample counts, and CPU latency. Report field-image results separately
   when legally available; do not extrapolate lab accuracy to farms.

### Artifacts and inference

Store weights outside Git in ml/models/; track a small manifest with model version, class
index mapping, architecture, input dimensions, normalization, dataset/split hashes,
training configuration, dependency versions, code revision, evaluation metrics, threshold,
weight checksum and licenses. Training lives in ml/src/; shared preprocessing is added
there when needed and imported by the backend, with packaging resolved in that task.
No training in request handlers. Load trusted weights once, use eval mode and inference_mode,
and keep tensor operations outside the event loop with bounded execution.

Softmax scores are uncalibrated unless calibration is measured. Assess reliability diagrams
and calibration error before describing scores as probabilities. Below a validation-chosen
threshold return uncertain and encourage another image or expert review. High scores can
still be wrong: this threshold is not an out-of-distribution detector. Unsupported crops,
non-leaves, lighting, multiple diseases, and field backgrounds may defeat the classifier.
Do not claim unknown-input rejection until a separately evaluated method exists.

## REST API contract

Only GET /health is implemented. Other endpoints below are proposals for Phase 1 onward.
FastAPI /docs and /openapi.json expose the implemented API, not the future contract.

| Endpoint | Request | Response | Status |
| --- | --- | --- | --- |
| GET /health | None | `{"status":"ok"}` | Implemented; process liveness, HTTP 200 |
| GET /api/v1/ready | None | `{"status":"ready","model_version":"…"}` | Planned; 503 if model unavailable |
| POST /api/v1/predictions | multipart/form-data, required `image` binary, one file | PredictionResponse | Planned; 200 on success, no persistence |
| GET /api/v1/diseases | optional `crop` string, `limit` 1–100 default 20, `offset` >=0 default 0 | `{"items":[Disease],"total":0}` | Planned; reviewed supported classes |
| GET /api/v1/diseases/{disease_id} | stable disease slug | Disease | Planned; 404 if absent |
| GET /api/v1/predictions | future authenticated, cursor-paginated history | Future contract | Deferred until ownership/retention design |

Proposed success example (illustrative, not a real prediction):

```json
{
  "request_id": "b5e6c155-918a-4c2b-a07b-6e403d9e1a22",
  "model_version": "resnet18-v1",
  "crop": "tomato",
  "disease_id": "tomato-example",
  "label": "Example class",
  "confidence": 0.72,
  "candidates": [{"disease_id": "tomato-example", "label": "Example class", "confidence": 0.72}],
  "uncertain": false,
  "warnings": ["Prediction is not a confirmed diagnosis; scores may be uncalibrated."]
}
```

PredictionResponse: UUID request_id; nonempty model_version/crop/label strings; disease_id
nullable for abstention; confidence float in [0,1]; at most three candidates (or class count
if smaller), sorted descending, each with stable ID, label, and score; uncertain boolean;
warnings list of strings. Scores rounded for presentation only. Disease: id, crop, label,
description, general_guidance, sources [{title,url,region,reviewed_at ISO date}]. Content
requires review before being returned; missing content must be identified explicitly.

Planned error envelope:
`{"error":{"code":"invalid_image","message":"Unable to decode image.","request_id":"UUID","details":[]}}`.
Use 400 for corrupt/invalid image, 413 for byte/pixel limits, 415 for unsupported content,
422 for missing/schema-invalid fields, 404 for unknown resources, 429 for rate limits,
503 for unavailable inference, and 500 for unexpected failures. Keep messages safe and
stable; never expose stack traces or local paths. Normalize FastAPI validation errors in
the error-handling task; the foundation still uses default framework errors.

## Database design

No database is needed for the current health endpoint or stateless prediction MVP.
Initially reviewed disease content can be a versioned validated file. When editable content
or history is needed, introduce SQLAlchemy and Alembic before creating tables:

- Disease: stable slug primary key, crop, label, description, guidance, reviewed_at;
  DiseaseSource: ID, disease FK, title, URL, region, reviewed_at.
- ModelVersion: version primary key, artifact checksum, manifest reference, created_at.
- Prediction (deferred): UUID, created_at UTC, model version FK, nullable disease FK,
  score, uncertain, owner FK after accounts. Store no image blob or client path by default.
- User/ownership, image object storage, telemetry and crop monitoring are deferred.

Use portable SQL types, foreign keys, UTC semantics and migration tests. SQLite locally;
PostgreSQL when concurrent writes or hosting requirements justify it, with psycopg then
added explicitly and migrations tested on both. Do not assume identical database behavior.

## Architecture decisions

FastAPI/Pydantic provide typed validation and OpenAPI for web/mobile clients. SQLAlchemy
and Alembic allow controlled persistence later. SQLite avoids a local service. PyTorch and
Torchvision enable understandable transfer learning; Pillow handles decoding and scikit-learn
evaluation. Next.js/TypeScript provide a typed web interface, Tailwind responsive styling.
uv and locks make environments reproducible; pytest/Ruff/ESLint and CI support feedback.
One API process with in-process inference is affordable and sufficient initially; introduce
queues or separate serving only after measured need. See docs/ARCHITECTURE.md for tradeoffs.

## MVP acceptance criteria

- All FR-01 through FR-07 and FR-09 demonstrated with real versioned weights on the documented
  class set; FR-08 satisfied by keeping API/services independent of the web UI.
- Valid JPEG/PNG works end-to-end; boundary-size, corrupt, spoofed, oversized pixels,
  unsupported and missing-image cases have automated tests and correct errors.
- UI has accessible upload, loading, success, uncertainty, and retryable error states;
  usable at 375px and 1280px widths, with keyboard-only navigation.
- Reviewed descriptions and sources exist for every supported disease; no unsupported
  pesticide advice. Prediction and confidence limitations visible beside results.
- Held-out macro F1 >= 0.80 on the selected dataset, per-class recall reported and
  any class below 0.60 investigated before release. If targets fail, reduce scope or
  improve the model; do not relabel poor results as acceptance. No field accuracy claim.
- Reproducible split/artifact manifest and model card; latency target measured as specified.
- CI passes lint, types, backend/inference contract tests and frontend build; at least one
  real-artifact smoke test run separately. No secrets/data/weights in tracked files.
- A fresh-clone local setup is verified; deployment belongs to Phase 5, after local MVP.
