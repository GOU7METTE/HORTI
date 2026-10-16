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

### P0-08 GitHub CI verification (October 16, 2026)

Verified through the GitHub connector against the repository's Actions and ruleset APIs.
The [CI run 38758447780](https://github.com/GOU7METTE/HORTI/actions/runs/38758447780)
completed successfully on a push to main for commit
`274d12386385d4251ada22b0ab2e74aa0d40f96a` (workflow `.github/workflows/ci.yml`,
run number 4, attempt 1). It ran October 15, 2026, from 11:13:41 to 11:14:20
America/Toronto (15:13:41 to 15:14:20 UTC).

- Backend job 116503029029 succeeded: locked installation, Ruff lint and formatting,
  pytest, and foundation validation all passed.
- Frontend job 116503028748 succeeded: npm ci, lint, typecheck, and production build
  all passed.

Inspected the active [main branch ruleset](https://github.com/GOU7METTE/HORTI/rules/25172078)
named `p0-08-verify checks`, created October 15. It targets `refs/heads/main`, requires
pull requests with zero required approving reviews, and blocks deletion and non-fast-forward
updates. Its required-status-check rule currently has an empty check list, so it does
not require the backend/frontend checks before merging. Consider adding those two checks;
no remote settings were changed during this verification.

P0-08 is complete: a successful push workflow and branch-rule review are evidenced.
This supersedes earlier notes that remote CI evidence was unavailable. The successful
run validates only the named committed baseline, not the current uncommitted mobile
documentation, license, backend tests, or prediction-contract changes. Run CI again
after those changes are committed and pushed. Uvicorn startup remains separately unverified.

### P1-03 prediction contract (October 16, 2026)

Owner `codex-contract-20261016`, main/current checkout, base/current commit
`274d12386385d4251ada22b0ab2e74aa0d40f96a`; changes uncommitted. Existing work preserved.
Dependencies P0-02 and P1-02 were reviewed against SPEC/architecture and implementation;
the prior five backend tests passed again before changes.

Added api/predictions, schemas/predictions and services/predictions. FastAPI requires
one image file field at POST /api/v1/predictions; the injectable service always raises
InferenceUnavailable without reading or decoding the file. The route translates that
specific exception to HTTP 503 with a typed error envelope (inference_unavailable,
safe message, UUID request_id, empty details). OpenAPI documents multipart input, 503
and framework 422; no functioning 200 prediction is advertised. No model was added.
CORS now explicitly permits GET/POST for configured origins, without credentials.

Tests cover missing input without service invocation, real unavailable service behavior
without application reads, injected route-to-service delegation and framework file closure,
served OpenAPI and allowed/denied POST preflight and response headers. Updated the health
OpenAPI test to allow another implemented path while preserving its health schema checks.
All test inputs are synthetic, with .env/environment isolation retained.

Dependency commands used workspace UV_CACHE_DIR (`$env:UV_CACHE_DIR = Join-Path $PWD '.cache/uv'`):

- `uv add --project backend 'python-multipart>=0.0.18,<1' --offline` initially failed
  because the parser was not cached. Approved online `uv add` resolved/downloaded it but
  failed replacing horti_backend-0.1.0.dist-info with Windows Access denied (os error 5).
  An offline retry also failed during editable-package replacement.
- `uv add --project backend 'python-multipart>=0.0.18,<1' --offline --no-sync` successfully
  updated the manifest/lock. `uv sync --project backend --locked --offline` initially hit
  the same directory error; an approved retry completed and installed python-multipart
  0.0.32. uv warned about a missing RECORD file on the old editable distribution.
  No manual deletion or weakened policy was used. The final package compatibility check
  passed. The lock diff adds only the multipart package and its dependency references.

Intermediate pytest run failed with 11 setup errors while the multipart dependency was
absent. After syncing, 10 tests passed and an OpenAPI assertion failed: the installed
FastAPI emits contentMediaType application/octet-stream rather than legacy format binary.
The assertion now checks the actual file schema and required multipart field.

Final checks (repository root, workspace UV_CACHE_DIR):

| Command | Outcome |
| --- | --- |
| `uv run --project backend --locked --offline pytest backend/tests -v` | Exit 0; 11 passed in 0.28s, Python 3.12.14 / pytest 9.1.1; existing TestClient deprecation warning only |
| `uv run --project backend --locked --offline ruff check --config backend/pyproject.toml backend scripts` | Passed |
| `uv run --project backend --locked --offline ruff format --check --config backend/pyproject.toml backend scripts` | Passed |
| `uv pip check --python backend/.venv/Scripts/python.exe` | Exit 0; 33 installed packages compatible |
| `uv run --project backend --locked --offline python scripts/check_foundation.py` | Passed; syntax, local links and task IDs |
| `git diff --check` | Passed; existing ROADMAP.md line-ending warning only |

Limitations: no image content/type/size/pixel validation, inference, readiness endpoint,
persistence or retained photos. Framework multipart parsing precedes the handler and may
use temporary spool files; application code does not save uploads, but this is not a
no-disk guarantee or safe bounded processing. Duplicate/extra-file handling and streamed
limits remain P1-04. Uniform errors remain P1-05. The 503 status is the current contract;
real success schema/behavior remains future work. Do not expose this as a safe upload API.

To inspect locally, sync the locked backend and start Uvicorn using README, then open
/docs or submit only synthetic data via TestClient tests above. Missing image gives 422;
a formed multipart image request gives 503, regardless of whether its bytes are an image.
P1-03 acceptance criteria pass; no subsequent task was started.

### P1-01 / P1-02 runtime validation (October 16, 2026)

Owner `codex-health-20261016`, main/current checkout, base/current commit
`274d12386385d4251ada22b0ab2e74aa0d40f96a`; changes remain uncommitted.
Existing documentation edits and untracked LICENSE were preserved. Dependencies P0-03,
P0-05 and P0-06 were checked against the manifest/lock, settings implementation,
safe .env.example, ignore rules and existing health/CORS tests; locked offline commands
below successfully used the installed environment. No dependencies were changed.

Reviewed app.main, core/config, api/health and schemas/health. The factory uses supplied
Settings directly, configures an explicit GET CORS allowlist and includes the typed health
route. Default Settings load the root .env plus HORTI_ environment values; tests must
isolate both sources. No application implementation changes were necessary.

Added backend/tests/conftest.py to clear ambient HORTI_ variables and disable default
.env loading before importing app.main, including its module-level app creation.
Existing tests now use this isolated factory. Added health OpenAPI verification and
backend/tests/test_settings.py for independent app CORS configurations, explicit settings
under an invalid ambient environment, synthetic dotenv/environment precedence,
_env_file=None behavior and invalid environment rejection. Only a generated temporary
synthetic settings file is used; no local .env contents are read. All requests use an
in-process TestClient, with no data, weights, GPU, database or external service.

Commands run from the repository root with `$env:UV_CACHE_DIR = Join-Path $PWD '.cache/uv'`:

| Command | Outcome |
| --- | --- |
| `uv run --project backend --locked --offline pytest backend/tests -v` | Exit 0; 5 passed in 0.39s on Python 3.12.14, pytest 9.1.1 |
| `uv run --project backend --locked --offline ruff format --config backend/pyproject.toml backend/tests` | Exit 0; two test files formatted, one unchanged |
| `uv run --project backend --locked --offline ruff check --config backend/pyproject.toml backend scripts` | Exit 0; all checks passed |
| `uv run --project backend --locked --offline ruff format --check --config backend/pyproject.toml backend scripts` | Exit 0; 13 files already formatted |

Tests demonstrate package imports/application creation, injected-settings isolation,
HTTP 200 with exactly {"status":"ok"}, implemented GET /health in served OpenAPI,
and the original allowed/denied CORS behavior. P1-01 and P1-02 acceptance criteria pass.
One StarletteDeprecationWarning reports httpx-based TestClient deprecation and suggests
httpx2; no dependency changes were made for this warning. No policy blocker occurred.
This supersedes the earlier lack of independent runtime test evidence, but does not
verify Uvicorn startup, public deployment or remote GitHub CI. Historical blocked runs
and developer reports below remain unchanged. No upload task was started.

### Backend test follow-up (October 15, 2026)

The developer reported that both existing API tests passed at 11:03
(America/Toronto) on October 15, 2026, following the P0-06 validation instructions:

```powershell
uv run --project backend --locked pytest backend/tests -v
```

Reported result: **2 passed** (`test_health` and
`test_cors_allows_only_configured_origin`). These tests use an in-process TestClient
and injected test settings with `.env` loading disabled; they require no dataset,
GPU, database, or running API server.

This is a developer-reported run; the agent did not rerun pytest or inspect terminal
output. Exact environment versions and the cause of the earlier Windows policy
blocker were not supplied. The October 9 blocked run below remains a historical
record; this report does not establish remote CI success or a Uvicorn startup check.

### Foundation documentation review (October 16, 2026)

Reviewed P0-06 through P0-09 on main at base commit
`274d12386385d4251ada22b0ab2e74aa0d40f96a`, with existing uncommitted work preserved.

- P0-06 remains complete based on the developer-reported October 15 test pass above.
  The test source confirms the named health/CORS cases and injected settings. This review
  did not rerun pytest or verify Uvicorn startup; the October 9 failure remains historical.
- P0-07 remains complete: `.github/workflows/ci.yml` defines push/PR triggers, locked
  installs, backend Ruff/tests/foundation validation and frontend lint/types/build.
  A workflow definition is not evidence of a successful GitHub run.
- P0-08 was previously checked, but no successful run URL/ID, tested commit, or branch-rule
  decision is recorded. It is reopened pending that evidence. `gh` is unavailable here;
  fetching the repository Actions page also failed, so no remote result was verified.
  Record the successful run and the owner's consideration of required checks/branch rules
  (including a reason if no rules are chosen) before closing it.
- P0-09 remains complete: the existing MIT LICENSE, README notice and checked task record
  establish the recorded license choice. Removed the stale pending-license statement from
  CONTRIBUTING; the license text and third-party licensing boundaries are unchanged.
- README now distinguishes the reported test pass from unverified startup and remote CI.
- No temporary patch files were found in Git's nonignored file list or the inspected
  patch/diff filename search. Any later temporary patch files should stay out of commits;
  no files were deleted and no blanket ignore rule was added.

Review checks passed: with `UV_CACHE_DIR` set to `.cache/uv`,
`uv run --project backend --locked --offline python scripts/check_foundation.py`;
`git diff --check`; and an inline Python check confirming all 57 task rows use
`[x]` or `[ ]` syntax. No application tests, installs or builds were run for this review.

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

### P0-10 / P0-11 coordinated dependency review (October 16, 2026)

Reviewed on `main`, base `274d12386385d4251ada22b0ab2e74aa0d40f96a`, preserving
existing uncommitted documentation and LICENSE. Environment: Node 26.12.0, npm 11.20.0,
Windows PowerShell. This local review does not establish CI success on Node 22.

The manifest, npm lock, installed tree and flat ESLint configuration agree: Next.js and
eslint-config-next are both 16.4.0; ESLint is 9.39.5. Configuration imports Next's
core-web-vitals and TypeScript presets. No dependency or configuration changes were made:
there is no compatible fix for either requested blocker, so both tasks remain open.

Official upstream checks:

- [ESLint support policy](https://eslint.org/version-support/) lists v10 as current and
  v9 as EOL since August 6, 2026. Fresh npm metadata reports ESLint 10.13.0.
- Published `eslint-config-next@16.4.2` accepts ESLint >=9, but still requires React,
  import and JSX accessibility plugins. Their latest published versions are respectively
  7.37.5, 2.32.0 and 6.10.2; their ESLint peer ranges stop at v9 (React: ^9.7).
  Thus upgrading just ESLint would violate required plugin peers. React hooks 7.1.1,
  typescript-eslint 8.71.2, eslint-utils and the import resolvers do not add a v10 barrier.
  The import plugin's development branch advertises v10 support, but its published npm
  metadata does not; unpublished branch changes are not a compatible release.
- Official plugin manifests: [React](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/package.json),
  [import](https://github.com/import-js/eslint-plugin-import/blob/main/package.json),
  [JSX accessibility](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/package.json).
  Published registry metadata, not development branches, determined install compatibility.
  [Next.js ESLint guidance](https://nextjs.org/docs/app/api-reference/config/eslint)
  documents the preset integration retained here.
- [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
  affects braces <=3.0.3 and lists no patched version. npm still publishes 3.0.3 as latest.
  The latest aligned Next.js/config pair is 16.4.2; its Next ESLint plugin still depends
  on fast-glob 3.3.1, so that patch cannot remove this chain. No unrelated patch was applied.

Inspection commands from the repository root:

```powershell
npm.cmd --prefix frontend ls eslint eslint-config-next next eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-import eslint-plugin-jsx-a11y typescript-eslint braces --all
npm.cmd view eslint version engines --json --cache .cache/npm
npm.cmd view eslint-config-next version peerDependencies dependencies --json --cache .cache/npm
npm.cmd view next version --cache .cache/npm
npm.cmd view eslint-plugin-react version peerDependencies --json --cache .cache/npm
npm.cmd view eslint-plugin-import version peerDependencies --json --cache .cache/npm
npm.cmd view eslint-plugin-jsx-a11y version peerDependencies --json --cache .cache/npm
npm.cmd view eslint-plugin-react-hooks version peerDependencies --json --cache .cache/npm
npm.cmd view typescript-eslint version peerDependencies --json --cache .cache/npm
npm.cmd view braces version --cache .cache/npm
npm.cmd view @next/eslint-plugin-next@16.4.2 dependencies peerDependencies --json --cache .cache/npm
npm.cmd view eslint-import-resolver-typescript@latest version peerDependencies --json --cache .cache/npm
npm.cmd view eslint-import-resolver-node@latest version peerDependencies --json --cache .cache/npm
```

The initial sandbox audit could not reach the registry. Approved registry access returned
five high-severity package findings, all from the existing braces advisory through
eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces.
No newly discovered advisory appeared. npm proposes eslint-config-next 14.2.35 as its
fix; this downgrade was rejected, not executed. No force, legacy peer resolution,
overrides or audit fixes were used. Revisit when published plugin peers support ESLint 10
and the upstream braces chain has a compatible fix or separately reviewed replacement.

Validation results (commands from the repository root):

| Command | Outcome |
| --- | --- |
| `npm.cmd --prefix frontend ci --cache .cache/npm --no-audit --no-fund --offline` | Exit 0; clean locked install, 368 packages; ESLint EOL warning; optional unrs-resolver 1.12.2 postinstall remains unapproved/unexecuted |
| `npm.cmd --prefix frontend audit --json --cache .cache/npm` | Exit 1; five high findings from the single known braces advisory, before and after install |
| `npm.cmd --prefix frontend audit --omit=dev --json --cache .cache/npm` | Exit 0; zero vulnerabilities; does not establish an overall security pass |
| `npm.cmd --prefix frontend run lint` | Exit 0 |
| `npm.cmd --prefix frontend run typecheck` | Exit 0; Next route types generated and TypeScript passed |
| `npm.cmd --prefix frontend run build` | Exit 0; webpack production build, static / and /_not-found; warning about ignored parent-directory pnpm-lock.yaml outside the Git repository |
| `npm.cmd --prefix frontend ls --all --json > .cache/frontend-dependency-review.json` | Exit 0; no invalid/missing peer dependencies; report stays in ignored .cache |

Foundation validation also passed with `UV_CACHE_DIR=.cache/uv`:
`uv run --project backend --locked --offline python scripts/check_foundation.py`.
`git diff --check` passed; Git only warned about ROADMAP.md line-ending normalization.

The build regenerated tracked next-env.d.ts route imports from dev to production paths;
only that generated change was restored to its pre-review content after validation.
The manifest, lockfile and ESLint configuration remain unchanged. No lock update was
needed because no dependency update was selected. Optional install scripts were not
approved and no permission or audit settings were weakened.

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
