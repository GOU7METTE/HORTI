# Shared agent instructions

These instructions apply to OpenAI Codex CLI, Cursor CLI, Google Antigravity CLI,
and human collaborators. Keep common policy here; tool-specific files may contain only
behavior that actually differs by tool. Read scoped AGENTS.md files for directories you edit.

## Context and objectives

HORTI (Smart Agriculture) is an undergraduate portfolio project for learning software
engineering, backend APIs, computer vision, testing, and deployment. Build incrementally
and explain decisions. SPEC.md is the requirements source; TASKS.md is the implementation
checklist; [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) is the single system design reference.
The current priorities are validating the backend foundation, a safe upload contract,
a reproducible ML baseline and an end-to-end MVP. Do not start subsequent tasks automatically.

## Stack and architecture

Python 3.12, FastAPI, Pydantic, Uvicorn, SQLAlchemy, Alembic, SQLite locally and PostgreSQL
later; optional PyTorch, Torchvision, Pillow, scikit-learn. Next.js App Router, strict
TypeScript, Tailwind CSS. uv, pytest, Ruff, ESLint, GitHub Actions. See
docs/ARCHITECTURE.md. HTTP routes delegate business logic to services. Offline training
produces versioned artifacts; the API performs inference only. Mobile clients will use
the same versioned REST API. No database or inference pipeline exists yet.

## Workflow

1. Read AGENTS.md, SPEC.md, TASKS.md, and docs/ARCHITECTURE.md before changing files.
2. Inspect relevant existing source and identify the requested task and dependencies.
3. Explain significant architectural decisions; implement only the requested scope.
4. Add or update appropriate tests, including failure cases for behavior changes.
5. Run relevant validation from README.md; report failures or unavailable checks honestly.
6. Update documentation and task checkboxes only when acceptance criteria are met.
7. Summarize files changed, tests run, and remaining limitations.

## Coding rules

- Use readable, maintainable code, Python type hints, and strict TypeScript where practical.
- Prefer simple solutions; keep business logic outside routes and avoid duplicated code.
- Validate input at boundaries; configuration belongs in settings, never hardcoded secrets.
- Keep dataset transforms consistent between training and inference.
- Keep dependency declarations in backend/pyproject.toml and frontend/package.json;
  update their locks with the package managers.
- Never silently add major dependencies or modify unrelated code.
- Never fabricate test results or claim unvalidated features work.
- Never commit secrets, datasets, uploaded images, or trained model weights.
- Never perform destructive repository operations without explicit approval.
- Avoid overengineering, unrequested services, and speculative abstractions.
- Do not introduce pesticide recommendations without reviewed regional references.

## Educational requirement

For a significant feature, briefly explain what was implemented, why the approach was
chosen, how it works, and exact commands or steps the developer can use to test it.
Keep implementation, planned behavior, and measured results distinct.

## Collaboration policy

### Branches, worktrees and existing changes

- Default to one writing agent at a time for this solo project. Parallel agents are optional;
  do not launch them automatically. Different CLI tools have no automatic shared lock.
- Before editing, run `git status --short`, inspect the relevant diff and untracked files,
  and identify the branch/base commit. Treat pre-existing work as belonging to its author.
  An empty `git diff` does not mean a clean tree: untracked files matter.
- Never reset, clean, stash, discard, overwrite or commit somebody else's changes to make
  the tree clean. Inspect overlapping work and coordinate with its owner; if ownership or
  intended behavior cannot be established, pause only the overlapping edit.
- For concurrent implementation, use one task branch and separate Git worktree per writing
  agent, based on a reviewed committed baseline. Use CONTRIBUTING.md branch conventions.
  Worktrees contain committed files, not this checkout's uncommitted foundation. Do not
  create a worktree from an incomplete baseline and assume it includes the current project.
- The user/coordinator chooses the integration checkout. Never switch branches underneath
  another running agent, share a virtual environment between worktrees, or delete worktrees
  while another agent uses them. Separate local servers must use different ports.

### Ownership, file edits and task tracking

- Claim one requested task before implementation in TASKS.md's active ownership section.
  Record a unique session owner (for example `cursor-upload-1`), branch/worktree, intended
  file scope, status and date. A claim coordinates people; it is not a technical lock.
- The user or one designated coordinator serializes tracker updates. On separate branches,
  confirm the current claims with the coordinator; a stale worktree copy is not authoritative.
  Do not independently claim the same task or edit another agent's claim.
- Check dependencies against actual implementation and acceptance evidence. Another agent's
  checked box is a report to verify, not proof. Re-run relevant checks after integration.
- Avoid overlapping file ownership even in separate worktrees. Assign shared files such as
  TASKS.md, SPEC.md, docs/ARCHITECTURE.md, manifests and lockfiles to one writer/coordinator.
  Sequence changes to these files rather than combining concurrent dependency updates.
- If unexpected changes appear during work, inspect and reconcile with the owner before
  editing those files. Resolve conflicts by preserving both intended behaviors, not by
  blindly choosing ours/theirs. Release ownership at handoff or completion.

### Quality, documentation and handoff

- All tools follow the shared coding rules above and checks in README.md. Add appropriate
  tests for behavior; report exact commands, results and environmental blockers. A passing
  lint check does not validate runtime behavior or model quality.
- Update SPEC.md only when requirements change, docs/ARCHITECTURE.md when design changes,
  and TASKS.md when ownership/status/evidence changes. Do not copy these documents into
  CLI rules. Keep pending and verified functionality distinct.
- Handoff in the task/PR or session summary: task ID, owner, branch/worktree, base/current
  commit (or explicitly uncommitted), files changed, decisions, checks/results, known risks,
  remaining work and next verification steps. Do not create a second task tracker.
- A receiving agent inspects the diff and implementation, confirms dependencies, and runs
  relevant validation before relying on a handoff. Close a task only when all acceptance
  criteria are evidenced; blockers remain visible rather than marked successful.

### Commits, integration and security

- Commit only when the user requests/authorizes it. Stage explicit owned paths or reviewed
  hunks; never use blanket staging in a dirty checkout. Review the staged diff for scope,
  secrets and generated artifacts. Use focused commits with CONTRIBUTING.md conventions.
- Merge, cherry-pick, push, publish, rebase shared history or delete branches/worktrees only
  with explicit authorization. The integration owner reviews changes and reruns affected
  checks on the combined tree; branch-level success alone is insufficient.
- Keep authentication and personal CLI settings outside Git. Do not read/display/send .env
  contents, credentials, raw images or private datasets to an AI service unless specifically
  needed and authorized. Use examples and synthetic test data. Never commit these inputs.
- Preserve sandbox/approval protections. Do not disable permission checks or broaden network
  access to bypass a blocker; report the blocked action and use the normal approval process.
  AGENTS.md describes behavior, not an enforceable security boundary.
