# Contributing

Read AGENTS.md, SPEC.md and TASKS.md first. Use README.md for setup and validation.
Work on one task with dependencies satisfied. Keep changes small enough to explain and review.

When using multiple coding tools, follow the collaboration policy in [AGENTS.md](AGENTS.md)
and claim work in TASKS.md. Use the same requirements and docs/ARCHITECTURE.md reference
across tools. See README.md for CLI launch instructions and documented support limits.

## Development

Use Python 3.12 via uv and Node 22+ with npm. Commit backend/uv.lock and
frontend/package-lock.json after intentional dependency changes. Use local .env copied
from .env.example; never commit credentials, data, uploads or weights. No pre-commit tool is
adopted: run the documented checks directly, and CI repeats them.

Branch names: `feat/P1-03-image-upload`, `fix/P1-04-validation`, `docs/ml-provenance`,
or `chore/dependency-update`. Suggested commits: `feat(api): validate image uploads`,
`test(api): cover corrupt images`, `docs: explain dataset split`. Describe intent, not
just filenames. No automatic commits are made by agents.

## Pull requests and review

Explain the problem, resulting behavior, linked task ID, significant decisions, tests run,
and known limitations. Include screenshots for UI changes and API examples for contract
changes. Update task status only after its acceptance criteria pass. Do not include unrelated
refactors or dependencies. CI must pass before merging; new behavior needs appropriate
unit/integration tests, with error cases. ML work includes reproducibility and metrics;
real weights are validated separately, never downloaded implicitly by CI.

Review checklist:

- Scope matches the task and SPEC; architecture remains understandable.
- Types, validation, error messages and configuration are clear.
- Happy path and relevant failure cases are tested; no fabricated validation claims.
- README commands and API documentation match implementation.
- No secrets, image data, weights, unsafe paths or sensitive logs appear in the diff.
- UI changes preserve keyboard access and responsive behavior.
- Dependency changes explain purpose and update locks; CI remains dataset/GPU independent.

License choice is pending. Discuss contribution licensing before accepting outside code;
public repository visibility does not grant an open-source license.
