# HORTI

HORTI is a smart agriculture portfolio project exploring plant disease detection through
computer vision, with crop monitoring as a future goal. It aims to turn a leaf photograph
into a model prediction and useful, reviewed plant-health information.

> Currently in development: backend and frontend foundations are in place; disease prediction is planned.

## Overview

The final product is a mobile plant-health app, initially targeting Android and Google Play.
iOS support is a future decision; the mobile framework remains undecided. The existing
Next.js interface is an intermediate prototype for validating the prediction flow. A completed
web prototype is not required before mobile development.

The anonymous mobile MVP will let users capture or select a leaf image, view a predicted class and
confidence score, and read sourced information about the possible disease. The first MVP
will focus on a small, documented set of crops and classes, with clear uncertainty warnings.
The current application provides a static landing page and a health-check API.

## Motivation

HORTI started from a personal connection to agriculture. My father works as an
agricultural technician, so I grew up around his practical knowledge of crops, plant
health, and the challenges faced in agriculture.

As a Computer Science student, I wanted to connect his agricultural experience with
what I am learning in software development and artificial intelligence. HORTI explores
how computer vision and software could support plant-health monitoring and, eventually,
other agricultural applications.

The project gives me practical experience in machine learning, backend engineering,
API design, testing, and deployment while working on a problem with personal meaning.

## Current Progress

### Implemented

- FastAPI application factory with a `GET /health` endpoint and generated API documentation.
- Validated environment settings and a configurable CORS origin allowlist.
- Static Next.js landing page using strict TypeScript and Tailwind CSS.
- Backend health/CORS test cases, dependency locks, and lint/type-check tooling.
- GitHub Actions workflow definition for backend checks and frontend builds.
- Contract-only multipart POST /api/v1/predictions with a required image file and honest
  HTTP 503 response; image validation and model inference remain unimplemented.

Frontend lint, type checks, and production build have been validated. The backend
suite was independently verified on October 16, 2026: 11 tests passed, including
health, settings, OpenAPI, prediction-contract and CORS checks. GitHub backend and frontend
CI passed for committed baseline `274d123`; pending changes still need a new CI run.
Uvicorn startup remains unverified; see the [validation record](docs/VALIDATION.md).

### In Progress / Planned

- Safe image uploads, validation, and shared training/inference preprocessing.
- Dataset selection, a reproducible ML baseline, training, and held-out evaluation.
- Model inference with class scores, uncertainty handling, and reviewed disease information.
- Accessible upload/results screens and frontend-to-API integration.
- End-to-end testing and deployment after the local MVP is complete.

No dataset or model has been selected, and no prediction pipeline is implemented.
The prediction contract does not decode or retain images in application code; framework
multipart parsing may use temporary spool files. Bounded safe uploads remain P1-04.
Accounts, prediction history, Supabase, retained photos, and crop monitoring remain deferred.
Mobile development is part of the MVP path, following the shared API contract.

## Planned MVP

1. Capture or select one leaf image in the Android app and submit it anonymously.
2. Validate the image and apply the model's preprocessing.
3. Run inference using a versioned computer vision model.
4. Return the predicted class, confidence score, and uncertainty information.
5. Display reviewed plant-health information with source links.

This flow is planned and does not yet work end to end.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Backend | Python 3.12, FastAPI, Pydantic, Uvicorn |
| Web prototype | Next.js App Router, React, strict TypeScript, Tailwind CSS |
| Mobile (planned) | Android first; framework undecided; iOS decision deferred |
| Machine learning (planned) | PyTorch, Torchvision, Pillow, scikit-learn; optional ML dependencies declared |
| Persistence (planned) | SQLAlchemy, Alembic, SQLite locally; PostgreSQL later |
| Testing / tooling | pytest, Ruff, ESLint, uv, npm, GitHub Actions workflow |

## Architecture

The planned prediction flow keeps HTTP routes separate from validation and inference
logic. FastAPI will validate images and run model inference. Training runs offline and
produces versioned model artifacts; the API will perform inference only.

```mermaid
flowchart LR
    Web[Next.js prototype] -->|Planned REST API calls| API[FastAPI REST API]
    Mobile[Android app - planned] -->|Same REST API| API
    API --> Service[Inference service - planned]
    Service --> Model[Computer vision model - planned]
    subgraph Offline[Offline workflow - planned]
        Data[Dataset selection] --> Training[Training and evaluation]
    end
    Training -. Versioned artifact .-> Model
```

The frontend and API foundations exist; their prediction integration and the ML components
are planned. See [Architecture](docs/ARCHITECTURE.md) for the full design.

## Project Structure

```text
HORTI/
  backend/     FastAPI application and API tests
  frontend/    Intermediate Next.js web prototype
  ml/          Workspace documentation for planned ML work
  docs/        Architecture and validation records
  scripts/     Foundation validation script
  README.md    Project overview and local setup
  SPEC.md      Requirements and acceptance criteria
  TASKS.md     Implementation checklist
  ROADMAP.md   Major milestones
```

## Running Locally

Install Python 3.12, [uv](https://docs.astral.sh/uv/), and Node.js 22+ with npm.
Run these commands from the repository root:

```sh
uv sync --project backend --locked
npm --prefix frontend ci
```

Optionally copy `.env.example` to `.env` if that file does not already exist, to enable
the local frontend origin in CORS. The backend otherwise uses default settings.

Start the backend:

```sh
uv run --project backend --locked uvicorn app.main:app --reload --app-dir backend --host 127.0.0.1 --port 8000
```

Start the frontend in a second terminal:

```sh
npm --prefix frontend run dev
```

Open [the frontend](http://localhost:3000) and [API documentation](http://127.0.0.1:8000/docs).
The health endpoint at `http://127.0.0.1:8000/health` is defined to return `{"status":"ok"}`.
The landing page does not yet call the API. No GPU, dataset, or database server is required.

For existing environment restrictions and validation commands, see
[Validation](docs/VALIDATION.md). In Windows PowerShell, use `npm.cmd` if `npm` is blocked
by execution policy.

## Roadmap

- [x] Create the backend/frontend scaffolds, dependency locks, and project documentation.
- [x] Verify backend and frontend CI on GitHub for baseline `274d123`.
- [ ] Verify Uvicorn startup and rerun CI for the pending changes.
- [ ] Implement safe uploads and train/evaluate a reproducible model baseline.
- [ ] Connect inference, reviewed disease content, and an accessible results interface.
- [ ] Build and verify the anonymous Android MVP using the shared API.
- [ ] Deploy the backend and prepare the initial Google Play release.
- [ ] Explore additional crops, history, iOS support, and crop monitoring.

See [ROADMAP.md](ROADMAP.md) for milestones and [TASKS.md](TASKS.md) for dependencies
and acceptance criteria.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — component boundaries and system design.
- [Specification](SPEC.md) — planned behavior and MVP acceptance criteria.
- [Implementation checklist](TASKS.md) — task status and dependencies.
- [Roadmap](ROADMAP.md) — MVP, deployment, and future milestones.
- [Contributing](CONTRIBUTING.md) — development and review conventions.
- [Validation record](docs/VALIDATION.md) — recorded checks and environment limitations.

## Limitations / Disclaimer

HORTI is an educational project. Predictions, once implemented, should not be treated as
professional agricultural diagnoses. Confidence scores may be uncalibrated, and performance
on curated datasets will not establish reliability in the field.

## License

HORTI's original source code and documentation are licensed under the
[MIT License](LICENSE). Copyright (c) 2026 Aymane Mhamid.

Third-party datasets, pretrained model weights, and other third-party assets are
subject to their own licenses and attribution requirements; the HORTI MIT License
does not automatically cover them.
