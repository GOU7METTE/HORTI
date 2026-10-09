# Foundation validation record

## Environment

Validation performed October 9, 2026 in Windows PowerShell. uv 0.12.19, Python 3.12.14
(project environment), Node 24.21.0, npm 11.19.0, Codex CLI 0.160.0. CI targets Linux,
Python 3.12 and Node 22; no remote workflow run is claimed.

## Results

Commands run from the repository root; UV_CACHE_DIR points to .cache/uv.

| Command/check | Result |
| --- | --- |
| `uv sync --project backend --python <installed Python 3.12 path>` | Passed; default/dev dependencies installed, uv.lock created |
| `npm.cmd install --prefix frontend --cache .cache/npm --no-audit --no-fund` | Passed; frontend lock created |
| `npm.cmd --prefix frontend ci --cache .cache/npm --no-audit --no-fund` | Passed; locked clean install verified |
| `uv sync --project backend --locked --offline` | Passed; lock and installed default/dev environment agree |
| `uv run --project backend --locked ruff check --config backend/pyproject.toml backend scripts` | Passed after import/format fixes |
| `uv run --project backend --locked ruff format --check --config backend/pyproject.toml backend scripts` | Passed after formatting |
| `uv run --project backend --locked python scripts/check_foundation.py` | Passed: TOML/JSON/Python syntax, local Markdown links, unique/known task IDs |
| `uv run --project backend --locked pytest backend/tests` | Blocked during collection; zero tests executed |
| `npm.cmd --prefix frontend run lint` | Passed after PostCSS config cleanup |
| `npm.cmd --prefix frontend run typecheck` | Passed |
| `npm.cmd --prefix frontend run build` | Passed; static homepage and not-found page built |
| `git diff --check` | Passed |
| CI YAML syntax | Parsed with installed js-yaml; push/PR triggers and both jobs checked |
| Frontend dev HTTP smoke | `npm.cmd --prefix frontend run dev -- --hostname 127.0.0.1 --port 3000`; GET / returned 200 and contained Smart Agriculture; server stopped afterward |
| Git exclusion and source review | Checked private/generated patterns and authored files; no credentials found |

## Limitations and follow-up

### Shared AI coding tools (October 9, 2026)

Official documentation confirms native AGENTS.md support for Codex, Cursor CLI and
Antigravity CLI. Shared instructions and collaboration policy were updated in place;
docs/ARCHITECTURE.md remains the single design reference. Native support makes duplicate
.cursor/rules and .agents/rules bootstrap files unnecessary, so none were created.
The existing Codex TOML retains only documented approval_policy/sandbox_mode settings.

Installed CLI checks: `codex --version` reports 0.160.0; `agy --version` reports 1.3.1;
`agy --help` documents --sandbox. Cursor's `agent`/`cursor-agent` executables were not found
on PATH. No CLI installation, authentication, task execution, commit, branch/worktree
creation or merge was performed. Existing uncommitted/untracked foundation files were
preserved. Documentation and static configuration validation do not prove authenticated
instruction loading in any of the three tools.

`uv run --project backend --locked python scripts/check_foundation.py` and
`git diff --check` passed after these documentation updates. The validator parses the
existing Codex TOML, checks local documentation links and confirms task IDs. Codex's
`features list` command succeeded with the existing CODEX_HOME explicitly set, with
warnings about inaccessible user temporary-directory cleanup. No permission settings
were broadened. Application tests/builds were not repeated for this documentation-only change.

### Frontend audit follow-up (October 9, 2026)

`npm.cmd --prefix frontend audit --json --cache .cache/npm` reported five high-severity
package findings, all derived from one [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
The development-only chain is eslint-config-next -> @next/eslint-plugin-next -> fast-glob
-> micromatch -> braces 3.0.3. The advisory lists no patched release, and npm's current
braces version is 3.0.3. No safe dependency upgrade was available during this check.
The full audit remains unresolved; P0-11 tracks it.

`npm.cmd --prefix frontend audit --omit=dev --json --cache .cache/npm` returned zero
vulnerabilities. This narrows the reported exposure to development tooling; it is not
a complete application security assessment. Do not supply untrusted glob patterns to
this tooling. npm's forced fix proposes eslint-config-next 14.2.35, a major downgrade
that would mismatch Next.js 16 and the existing flat lint configuration; it was not run.

`npm.cmd --prefix frontend install-scripts ls` confirmed only the unrs-resolver postinstall
warning. Its script delegates to napi-postinstall for native package preparation. It was
not approved or executed as part of this investigation. Lint and typecheck passed again
with the currently installed packages. No dependency manifest or lockfile was changed.

Windows Application Control reports `DLL load failed while importing _pydantic_core` and
blocks the installed native extension. An approved run outside the sandbox failed the
same way. This is a machine policy restriction, not a passing or failing assertion.
Backend startup depends on that extension and is not verified here. Run the existing
tests on an approved Python environment or GitHub's Linux runner; do not disable security
controls. TASKS.md leaves runtime-validation items open.

Sandbox network access initially blocked dependency fetching; approved installs succeeded.
The default uv cache was inaccessible, so documented commands use a workspace cache.
PowerShell blocks npm.ps1; npm.cmd works without changing execution policy. ML dependencies
were resolved but not installed or run; no dataset/model evaluation was attempted.

ESLint 10 was evaluated and reverted because Next.js transitive plugins declare support
through ESLint 9. The locked ESLint 9.39.5 resolves those peers and passes lint, but npm
marks it unsupported. Track a plugin-compatible upgrade before release. npm also reports
an unapproved optional unrs-resolver postinstall; lint works without approving it, so no
extra install-script permission was granted. Next.js build warns about an unrelated
parent-directory lockfile, but the repository build succeeds; no parent files were changed.

The build script explicitly uses webpack for a predictable foundation build; Next.js dev
uses its default bundler. Frontend has no interaction tests yet because it is static.
Type checking runs `next typegen` first so generated route declarations exist on a fresh clone.
Codex `features list` ran successfully with the existing user CODEX_HOME explicitly set;
without it, the shell environment could not resolve the user home. No user config was edited.
CI action inputs were checked against the official [setup-uv](https://github.com/astral-sh/setup-uv)
and [setup-node](https://github.com/actions/setup-node) documentation; workflow execution remains pending.
Next.js dev generated frontend/AGENTS.md, which was inspected and supplemented with the
root workflow. HTTP smoke validation is recorded above; visual browser inspection and
backend runtime validation remain unperformed. No deployment, remote CI, full security
audit or ML result is claimed.
