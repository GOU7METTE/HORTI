# Machine learning workspace

No dataset, training code or model is implemented. Use TASKS.md Phase 2 and SPEC.md.
The optional ML dependency set lives in backend/pyproject.toml to avoid duplicate Python
environments. From the repository root, `uv sync --project backend --extra ml` installs
it when beginning ML work (not required for health/API development).

Create ml/src/, ml/tests/ and ml/notebooks/ only when they contain actual work. Training
must emit a manifest and model card; shared preprocessing must be importable by training
and inference. Keep datasets in ignored data/ or outside the repository. No automatic
dataset/model downloads are part of the foundation.
