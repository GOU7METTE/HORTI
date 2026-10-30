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

### P1-04 bounded image validation (October 16, 2026)

Owner `codex-upload-validation-20261016`; branch `feat/backend-foundation`, current
checkout; base/current commit `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`.
Working tree was clean before this task. Changes remain uncommitted. Read root instructions,
SPEC, TASKS and architecture; no scoped backend instructions exist. P1-03 implementation,
OpenAPI/service boundary and its 11-test baseline were inspected and rerun successfully.
No dependency, manifest or lockfile changes were needed: Pillow and python-multipart
0.0.32 are already locked/installed.

Implementation and rationale:

- Replaced automatic File/UploadFile form parsing on the prediction route with a dependency
  that streams Request input into services/image_upload. This avoids parsing/spooling an
  unbounded request before handler checks. OpenAPI retains the required image file schema.
- Counts actual ASGI body bytes before parser writes; rejects >5,308,416 bytes regardless
  of missing or false Content-Length. Feeds slices of <=65,536 bytes. File callbacks check
  <=5,242,880 bytes before appending. Multipart overhead is separately capped at 65,536
  bytes during parsing and on completion, including for small files. Conservative running
  accounting includes parser lookbehind until emitted as file data. No Content-Length
  shortcut is relied on and rejected requests do not drain the remaining stream.
- Exactly one part named image with a nonempty filename; no ordinary form fields, duplicate
  image parts or other files. Filename is never a path and MIME claims do not determine
  image format. Content-Type is <=256 characters; boundary uses RFC multipart characters,
  length 1-70 and no trailing space. Header names/values combined are <=8,192 bytes;
  locked parser additionally enforces <=8 headers and <=4,224 bytes per header line.
  Limit errors are 413, malformed/duplicate multipart 400, missing multipart/file 422.
  Both header-resource exceptions from the locked parser are mapped to a safe 413 message.
- The parser's finalize method does not check completion; an explicit on_end flag rejects
  truncated/incomplete forms. Request-local bytearrays/headers clear in finally, including
  rejection and disconnect. No temporary files, storage paths, logging of input or retained
  images are introduced.
- Pillow identifies actual format (JPEG/PNG only), checks width*height <=20,000,000 before
  decoding and rejects multiple frames. verify() checks structure; reopening and load()
  catches truncated pixel data. All BytesIO/Pillow contexts close. Decode runs in a worker
  thread; only validated bytes reach the prediction service, which still always raises
  InferenceUnavailable. No model transforms (P2-04), real inference or persistence.
- New rejections use HTTPException detail messages. The existing 503 envelope is preserved;
  uniform errors/request IDs remain P1-05.

Sources checked: installed python-multipart parser/callback/finalize implementation, plus
[Pillow Image documentation](https://pillow.readthedocs.io/en/stable/reference/Image.html)
for lazy open, verify and load behavior. The multipart documentation web fetch failed;
implementation/API behavior was verified against the installed locked source and tests.

Synthetic tests cover JPEG/PNG acceptance despite misleading MIME/filenames; exact 5 MiB
and +1 byte; exact 20 MP and over-limit dimensions; corruption/truncation, GIF/BMP/WebP
spoofed as PNG, APNG animation; duplicate/extra files and fields; missing input, nonfile,
malformed boundaries and incomplete bodies; exact request/overhead limits and +1 byte;
parser header limits including exact 4,224-byte line and +1; duplicate headers and count;
chunked input without Content-Length and with falsely low Content-Length; early rejection
without consuming later chunks; successful one-byte chunks; no temporary spooling; buffer
cleanup on success/rejection/malformed input/disconnect and decoder-buffer closure.
Existing health/settings/CORS/OpenAPI/service-boundary and unavailable tests remain passing.

An initial test run hit Windows' environment-variable length limit because pytest derived
an ID from a 5 MiB synthetic parameter; short explicit IDs fixed test setup/teardown.
Header resource tests then exposed a 400/413 mapping discrepancy; resource exceptions are
now consistently mapped to 413. These were corrected before the final checks below.

Commands from repository root with `$env:UV_CACHE_DIR = Join-Path $PWD '.cache/uv'`:

| Command | Final outcome |
| --- | --- |
| `uv run --project backend --locked --offline pytest backend/tests -q --tb=short` | Exit 0; 51 passed in 0.73s, one existing Starlette TestClient/httpx deprecation warning |
| `uv run --project backend --locked --offline ruff check --config backend/pyproject.toml backend scripts` | Exit 0; all checks passed |
| `uv run --project backend --locked --offline ruff format --check --config backend/pyproject.toml backend scripts` | Exit 0; 19 files already formatted |
| `uv run --project backend --locked --offline python scripts/check_foundation.py` | Exit 0; syntax, links and task IDs validated |
| `git diff --check` | Passed |

P1-04 acceptance criteria pass; ownership released. Uvicorn startup/public ingress and
remote CI for these changes are not verified. Application limits cannot prevent the ASGI
server/proxy from buffering an incoming chunk, nor bound aggregate concurrent decodes,
upload duration or process-wide memory. Deployment still needs ingress body limits,
timeouts, rate/concurrency limits and resource budgets. Historical contract-only notes
below describe P1-03 at that time and are preserved. No subsequent task was started.

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


### P1-05 uniform errors and request IDs (October 29, 2026)

Owner `codex-errors-20261029`, branch `feat/backend-foundation`, current checkout,
base/current commit `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; changes uncommitted.
Existing P1-04 upload work and ML research changes were inspected and preserved.
Only P1-05 was implemented; P1-06 and later tasks remain pending.

Central error handlers preserve upload status/messages, normalize request validation and
HTTP errors, and return safe generic unexpected failures. Pure ASGI middleware generates
one request UUID and puts it in the response header, envelope and safe ID/status logs.
The error boundary is inside CORS; correlation is outside it. The existing unavailable
schema reuses the common error fields. Prediction OpenAPI describes implemented errors.

Commands from repository root, with `UV_CACHE_DIR` set to `.cache/uv`:

- `uv run --project backend --locked --offline pytest backend/tests -q --tb=short`:
  **65 passed**, including the prior 51 tests and 14 new P1-05 cases. One existing
  Starlette TestClient/httpx deprecation warning remains.
- `uv run --project backend --locked --offline ruff check --config backend/pyproject.toml backend scripts`:
  passed after fixing an import-order issue.
- `uv run --project backend --locked --offline ruff format --check --config backend/pyproject.toml backend scripts`:
  passed; 22 files already formatted.
- `uv run --project backend --locked --offline python scripts/check_foundation.py`:
  passed (syntax, local links and task IDs).
- `git diff --check`: passed (line-ending normalization warnings only).

New tests exercise upload status envelopes, actual corrupt-image input, validation input
redaction, 404/405/429 and HTTP failures, preserved Allow/Retry-After headers, generic 500
with CORS, safe correlated logs, server-owned concurrent unique IDs, unchanged health
JSON, preflight IDs, and OpenAPI error models. The existing unavailable test also checks
header/body ID agreement. No dependencies, locks, frontend or service behavior changed.

Limits: application-generated errors before response headers are covered. An already
started streaming response cannot be replaced; no current endpoint streams responses.
CORS preflight keeps its standard protocol body and receives a request ID header.
These checks do not validate deployment/proxy logging, production startup or remote CI.
No commit, push, deployment, dataset access or model evaluation was performed.


### P1-05 verification and final handoff (October 29, 2026)

Owner `codex-errors-verify-20261029`; `feat/backend-foundation` / current checkout;
base/current HEAD `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; all changes uncommitted.
Reread AGENTS, SPEC, TASKS, architecture, README and this record; inspected Git status,
branch/HEAD, relevant diffs and all untracked backend files before editing. Preserved
existing P1-04 upload implementation/tests and P2-01 research. No scoped backend AGENTS
file was found. Verified P1-04 from implementation and reran its upload/prediction tests:
`uv run --project backend --locked --offline pytest backend/tests/test_image_upload.py backend/tests/test_predictions.py -q --tb=short`
exited 0: **46 passed**, one existing TestClient deprecation warning, in 0.87s.

Final design: handlers translate upload/domain, request-validation and HTTP exceptions;
an inner ASGI error boundary returns generic 500s while retaining CORS. An outer ASGI
middleware generates exactly one UUID per request, ignoring client-supplied IDs, and
uses it in response headers, error envelopes and ID/status-only diagnostic logs. No
exception text, input values or validation context is serialized/logged. Details remain
an empty JSON-safe array. Status codes, upload byte/pixel/parser limits and unavailable
503 behavior remain intact; no predictions are fabricated. Explicit HTTP 500 errors now
also use internal_error. No major dependency, lockfile or business-service changes.

Additional tests cover actual prediction-service unavailable/unexpected exceptions,
client ID spoofing on errors, malformed JSON, invalid input, a validator whose context
contains a ValueError object, response validation failures and all configured HTTP
mappings plus the generic HTTP fallback. Test setup now uses the isolated app_factory
fixture rather than importing the default app at collection time. Prior tests cover
UUID validity/uniqueness/concurrency, safe logs/redaction, CORS, health, upload limits,
error schemas and OpenAPI. The final suite includes all existing health/upload tests.

Exact final checks from repository root, with
`$env:UV_CACHE_DIR = Join-Path (Get-Location) '.cache/uv'`:

- `uv run --project backend --locked --offline pytest backend/tests -q --tb=short`:
  exit 0; **77 passed in 2.07s**; one existing Starlette TestClient/httpx deprecation
  warning. No failed tests or collection errors.
- `uv run --project backend --locked --offline ruff check --config backend/pyproject.toml backend scripts`:
  exit 0; All checks passed.
- `uv run --project backend --locked --offline ruff format --check --config backend/pyproject.toml backend scripts`:
  exit 0; 22 files already formatted.
- `uv run --project backend --locked --offline python scripts/check_foundation.py`:
  exit 0; Foundation syntax, local links, and task IDs validated.
- `git diff --check`: exit 0; only Git line-ending normalization warnings.

P1-05 file scope: core/errors.py, schemas/errors.py, schemas/predictions.py, main.py,
api/predictions.py, tests/test_errors.py, tests/test_predictions.py, SPEC.md, TASKS.md,
README.md, docs/ARCHITECTURE.md and this record. Earlier P1-05 changes remain in the same
uncommitted checkout; this verification added tests, isolated test setup, the explicit
HTTP 500 mapping and updated current status/evidence. README now reports the 77-test
result; historical validation records remain unchanged. Ownership released; P1-05 complete.

Limitations: no remote CI, Uvicorn startup, proxy/server log audit or deployment validation
was run. Application diagnostic logs are tested; server access logging is a separate
operational concern. CORS preflight keeps its standard protocol body with a request ID.
Failures after headers are sent cannot be converted to an envelope; the application has
no streaming endpoints/background tasks. No dataset, raw images, credentials or model
weights were accessed; all test images are synthetic. No commit, push, branch switch,
parallel agent or P1-06 implementation was performed.


### P1-06 backend unit/integration coverage (October 29, 2026)

Owner `codex-backend-tests-20261029`; branch `feat/backend-foundation`, current checkout;
base/current HEAD `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; uncommitted. Read instructions,
requirements, architecture, README, validation history and `.github/workflows/ci.yml`.
Inspected Git state, relevant diffs and untracked upload/error implementation/tests.
Pre-existing P1-04, P1-05 and P2-01 changes were preserved. No scoped backend instructions
were found. Verified P1-05 handlers, middleware, schemas and tests, then reran the full
baseline: `uv run --project backend --locked --offline pytest backend/tests -q --tb=short`
exited 0, **77 passed in 1.57s**, one existing TestClient warning. Claimed P1-06 before edits.

Acceptance mapping before implementation:

- Exact/over-limit sizes: test_image_upload's test_exact_file_size_boundary,
  test_exact_pixel_boundary and test_exact_overhead_boundary already cover 5 MiB/+1 byte,
  20 MP/over-limit dimensions and 64 KiB/+1 overhead (also total request cap).
  Existing stream/header tests cover missing/false Content-Length, early rejection,
  chunking and parser limits. Missing assertion: real boundary responses' envelopes/IDs
  and proof that size/pixel rejection prevents inference calls.
- Supported/unsupported formats and corrupt input: test_decoded_format_overrides_filename_and_mime,
  test_invalid_content_never_reaches_inference and test_animated_png_rejected already cover
  JPEG/PNG, GIF/BMP/WebP, MIME spoofing, empty/corrupt/truncated data and APNG.
  Missing assertion: uniform envelopes/IDs on the existing corrupt/unsupported cases.
- Allowed/disallowed CORS POST: test_post_cors previously checked preflight status and
  presence/absence of Allow-Origin for unavailable 503. Missing combinations: corrupt
  400, missing-file 422 and unexpected-service 500 with both origins; exact allowlisted
  origin, browser-readable request ID, safe correlated logs and inference call behavior.
- Unavailable inference: test_valid_image_receives_unavailable,
  test_route_delegates_validated_bytes_to_service and test_prediction_service_failures
  already cover real unavailable behavior, injected services, safe 503 and header/body IDs.
  These remain passing; no success prediction or mock production inference was added.
- Uniform errors/UUIDs: test_errors already covers validation/domain/HTTP/unexpected errors,
  UUID validity, concurrent uniqueness, spoofed client IDs, redaction, JSON-safe empty
  details, response validation failures and OpenAPI. Reused this behavior in the missing
  real upload/CORS combinations instead of duplicating those standalone tests.

Changes: extended existing upload tests with a local envelope/UUID assertion helper;
asserted the boundary tests' exact validated service input or no service call on rejection.
Extended existing CORS parameterization from two to eight cases. It now checks separate
preflight/POST UUIDs, header/body/log agreement, one safe POST diagnostic record, CORS
origin/exposure headers, redaction and service invocation. All images are generated in
memory and services injected; no dataset, weights, GPU, database or network is required.
No production bug was demonstrated, so no application, dependency or architecture change.

CI collection: the existing Ubuntu/Python 3.12 backend job performs a locked sync and
`uv run --project backend --locked pytest backend/tests` without filters. Local matching
collection scope includes test_errors, test_health, test_image_upload, test_predictions
and test_settings; **83 tests collected**. No workflow change is necessary. This verifies
configured collection, not a GitHub run; remote CI for this uncommitted tree is pending.

Final commands from repository root with
`$env:UV_CACHE_DIR = Join-Path (Get-Location) '.cache/uv'`:

- `uv run --project backend --locked --offline pytest backend/tests -q --tb=short`:
  exit 0; **83 passed in 1.53s**, one existing Starlette TestClient/httpx deprecation warning.
- `uv run --project backend --locked --offline pytest backend/tests --collect-only -q`:
  exit 0; **83 tests collected in 0.17s**, same warning.
- `uv run --project backend --locked --offline ruff check --config backend/pyproject.toml backend scripts`:
  exit 0; All checks passed.
- `uv run --project backend --locked --offline ruff format --check --config backend/pyproject.toml backend scripts`:
  exit 0; 22 files already formatted.
- `uv run --project backend --locked --offline python scripts/check_foundation.py`:
  exit 0; Foundation syntax, local links, and task IDs validated.
- `git diff --check`: exit 0; Git line-ending normalization warnings only.

Handoff: changed only backend/tests/test_image_upload.py, backend/tests/test_predictions.py,
TASKS.md and this record for P1-06. Acceptance coverage and CI collection configuration
are verified locally; P1-06 complete and ownership released. The existing README's 77-test
figure records the prior P1-05 run; this section records the current 83-test result.
Remaining verification: an authorized future commit/push must include currently untracked
source/tests, followed by a successful GitHub Actions run on the combined committed tree.
No remote CI result, Uvicorn startup, proxy limits, real model quality, inference success,
performance or deployment validation is claimed. CORS remains browser policy, not access
control; disallowed origins still receive an HTTP response without Allow-Origin.
No commit, push, branch switch, parallel agents or subsequent task was started.


### Real local Uvicorn runtime verification (October 29, 2026)

Owner `codex-uvicorn-smoke-20261029`; branch `feat/backend-foundation`, current checkout;
base/current HEAD `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; uncommitted. Read root
instructions, README, SPEC, TASKS, architecture and validation records; inspected status,
branch/HEAD, relevant diffs and untracked upload/error sources/tests. Preserved all
pre-existing work. Claimed this focused verification in TASKS.md before creating artifacts.
No application, dependency, lockfile or feature changes were needed.

Environment: Windows PowerShell, locked backend Python **3.12.14**. A temporary helper
was created at `.cache/uvicorn-smoke-codex-20261029/verify.py` and run from repository root:

```powershell
$env:UV_CACHE_DIR = Join-Path (Get-Location) '.cache/uv'
uv run --project backend --locked --offline python .cache/uvicorn-smoke-codex-20261029/verify.py
```

Exit 0. The helper used socket.bind(("127.0.0.1", 0)) to select an available loopback
port, then launched exactly this child command using subprocess.Popen with the locked
helper's sys.executable (not a global interpreter):

```powershell
backend/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 63564
```

This imports the current app.main:app. No reload, extra worker or mock service; normal
Uvicorn info/access logging remained enabled. The child-only environment removed inherited
HORTI_* values and set HORTI_ENVIRONMENT=test and
HORTI_CORS_ORIGINS=["http://localhost:3000"]. Default application settings loading was
otherwise unchanged; no .env/credential contents were inspected or printed. No security
control or network permission was weakened and no dependencies fetched. No startup/HTTP
blocker occurred; a cleanup permission blocker is recorded below. Process **19552** reported Application startup complete.

Requests used a real httpx.Client over TCP to http://127.0.0.1:63564, trust_env=False
(to avoid ambient proxies), timeout=3 seconds. Startup polling was bounded to 15 seconds
with 0.1-second retries. Every request supplied Origin=http://localhost:3000 and a
zero-UUID X-Request-ID to demonstrate the server replaced it. Only synthetic inputs:
an in-memory 2x2 PNG with a synthetic metadata marker, a synthetic filename, corrupt
bytes containing body/EXIF markers and an invented Authorization value. No real images,
metadata, tokens, model, dataset, database or GPU were used.

Measured HTTP outcomes:

- GET /health: 200; exact response bytes `{"status":"ok"}`.
- GET /openapi.json: 200; required multipart/form-data image binary, extra properties
  forbidden, no prediction 200 advertised. All 400/413/415/422/500/503 responses resolve
  to schemas with error code/message/request_id/details; request_id has uuid format
  and details has array type. This checks documentation, not runtime behavior for every status.
- POST /api/v1/predictions, valid synthetic PNG: 503 / inference_unavailable /
  Model inference is unavailable. ID 07a20d46-2143-44fe-8fa9-c24a191156ec.
- POST /api/v1/predictions, corrupt multipart image: 400 / invalid_image /
  Unable to decode image. ID a62fab92-cc0f-4688-befc-cdb50370f87a.
- POST /api/v1/predictions, no multipart input: 422 / validation_error /
  A multipart image file is required. ID d98ba5d7-7b7d-4b0c-b3b7-b4944114e2c2.
- GET /runtime-smoke-unknown: 404 / not_found / Resource not found.
  ID a898b436-5e77-4039-8272-3112c520c517.
- OPTIONS /api/v1/predictions with Access-Control-Request-Method=POST and
  Access-Control-Request-Headers=Content-Type: 200 with the exact allowed origin.

All seven observed responses had distinct UUIDv4 X-Request-ID values, none equal to the
supplied zero UUID. All four error bodies were asserted to contain exactly the SPEC
error envelope and expected safe message with details=[] and matching error.request_id.
Each error response also had Access-Control-Allow-Origin=http://localhost:3000 and
Access-Control-Expose-Headers containing X-Request-ID. No fabricated prediction returned.

Captured combined stdout/stderr was inspected after shutdown: all four error request IDs
matched request_failed records with their actual statuses. Supplied filename, body,
PNG metadata, EXIF and fake credential markers were absent from responses and logs;
no traceback or absolute workspace path appeared. This is evidence for these requests,
not a universal log/privacy audit. Default access logs still include request targets;
sensitive query strings were not tested and should not be assumed redacted.

Cleanup: the helper terminated only its owned child PID in finally, waited via
communicate(timeout=10), and confirmed process.poll() was not None. No fallback kill
was needed. This was process termination, not a graceful-shutdown test. Logs and images
were held only in memory. Removed only this verification's helper file using a literal
path after verifying its resolved target was inside the workspace. Removing the now-empty
`.cache/uvicorn-smoke-codex-20261029` directory failed with PermissionDenied /
RemoveFileSystemItemUnAuthorizedAccess. An approved outside-sandbox retry first verified
the exact target and that it was empty, then the same literal-path Remove-Item failed
with the same access-rights error (exit 1). The empty ignored directory remains; no helper,
image or log file remains in it. No permissions/security controls were changed to bypass
this restriction. No unrelated process was stopped, directory recursively deleted, or
existing artifact removed.

Documentation checks: with the same UV_CACHE_DIR,
`uv run --project backend --locked --offline python scripts/check_foundation.py` exited 0;
`git diff --check` exited 0 (line-ending warnings only). No pytest/lint rerun was needed
for this runtime/documentation-only verification; the prior 83-test record remains separate.

Updated README's current startup status and separated the completed local-startup roadmap
item from pending CI. Historical unverified-startup notes describe earlier runs and remain
unchanged; this result supersedes them for this checkout. Ownership released. Only
README.md, TASKS.md and docs/VALIDATION.md remain changed by this verification, plus
the empty ignored directory whose cleanup was denied.
Remote CI, production hosting, ingress protections, graceful shutdown, unexpected 500
over real HTTP and model inference/quality remain outside this smoke test. No commit,
push, branch switch, feature implementation or remote-CI success claim.


### P6-06 initial Expo/TypeScript scaffold (October 29, 2026)

Owner `codex-mobile-scaffold-20261029`; branch `feat/backend-foundation`, current checkout;
base/current HEAD `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; uncommitted. Inspected status,
branch/HEAD, relevant diffs, root instructions, SPEC/TASKS/architecture/README and existing
frontend/backend conventions. Claimed only the initial scaffold before edits; no scoped
mobile instructions existed. Preserved all pre-existing uncommitted backend and ML work.

Owner selected React Native with Expo and strict TypeScript. Recorded the rationale in
architecture and corrected framework status in SPEC, README, TASKS and root AGENTS.
AGENTS also now lists mobile/package.json as the mobile dependency source; no other
workflow/security policy changed. mobile/ is an independent npm app, no monorepo framework.

Before installation, npm registry metadata was checked with these commands (root):

```powershell
node --version
npm.cmd --version
npm.cmd view expo dist-tags version engines --json --cache .cache/npm
npm.cmd view expo-template-blank-typescript dist-tags version dependencies devDependencies --json --cache .cache/npm
npm.cmd view eslint-config-expo version peerDependencies engines --json --cache .cache/npm
npm.cmd view eslint-config-expo@58.0.4 dependencies --json --cache .cache/npm
npm.cmd view react-native@0.88.1 engines peerDependencies --json --cache .cache/npm
npm.cmd view eslint-plugin-react version peerDependencies --json --cache .cache/npm
npm.cmd view typescript@6.0.3 engines --json --cache .cache/npm
```

Node 26.12.0 / npm 11.20.0; published Expo stable latest 58.0.21 explicitly supports Node
26.x. Blank TypeScript template 58.0.30 uses React 19.3.0, RN 0.88.1, TypeScript ~6.0.3;
React/RN peer requirements agree. Read-only Expo package metadata at
https://unpkg.com/expo@58.0.21/bundledNativeModules.json confirmed safe-area-context ~5.10.1
and status-bar ~58.0.4. App dependencies are exact-pinned and package-lock.json generated
by npm. ESLint 9.39.5 is deprecated/EOL but still required by published React plugin peers
(^9.7, no ESLint 10); no forced peer resolution or override was used.
Sources: [SDK compatibility](https://docs.expo.dev/versions/latest/),
[TypeScript](https://docs.expo.dev/guides/typescript/) and
[Expo flat ESLint configuration](https://docs.expo.dev/guides/using-eslint/).

Implemented mobile/App.tsx, index.ts, app.json, tsconfig.json, eslint.config.js,
package.json/package-lock.json, .gitignore and README.md. This is a deliberately minimal
manual scaffold aligned with the official blank TypeScript template's dependency set,
not the default multi-screen/router demo. Single informational HORTI screen with header
roles, scalable text, contrast, safe areas and scrolling; it states predictions are not
available. No actions, API requests, media access, camera/upload/results, retention,
accounts, history, Supabase, model weights or fake predictions. FastAPI remains inference
host. No native project, EAS/cloud project, signing configuration or web build added.

Commands/results from root:

- `npm.cmd --prefix mobile install --cache .cache/npm --no-audit --no-fund`:
  exit 0; 694 packages installed; lock generated. Existing npm script protections left
  optional unrs-resolver@1.12.2 postinstall unapproved/unexecuted; checks work without it.
- `npm.cmd --prefix mobile ci --cache .cache/npm --no-audit --no-fund --offline`:
  exit 0; clean locked reinstall, 694 packages in 42s; same ESLint and install-script warnings.
- `npm.cmd --prefix mobile run lint`: exit 0; ESLint with --max-warnings 0.
- `npm.cmd --prefix mobile run typecheck`: exit 0; strict tsc --noEmit.
- `npm.cmd --prefix mobile run check:dependencies`: initial sandbox run failed creating
  user .expo cache (EPERM); approved retry exited 0, Dependencies are up to date.
- `npm.cmd --prefix mobile run check:bundle`: exit 0; Android JavaScript/Hermes export,
  625 modules, one 1.6 MB .hbc bundle plus metadata.json in ignored mobile/dist/.
- `npm.cmd --prefix mobile run check`: after npm ci, lint/typecheck passed but sandbox
  cache-file open failed (EPERM). Approved complete retry with EXPO_NO_TELEMETRY=1 exited
  0: lint, types, dependency alignment and Android export all passed. Final Metro export
  reported Android Bundled 4865ms, 625 modules. No cache/security controls were disabled.
- From mobile/, `.\node_modules\.bin\expo.cmd config --type public --json`:
  exit 0; parsed config is HORTI, Android only, with no EAS project ID or explicit Android
  permissions. Output kept in ignored .cache/mobile-public-config-20261029.json.
- `npm.cmd --prefix mobile ls --all --json`: exit 0; no invalid/missing peer problems;
  report in ignored .cache/mobile-dependency-tree-20261029.json.
- `npm.cmd --prefix mobile audit --json --cache .cache/npm`: exit 1; eight findings
  (3 high, 5 low), propagated from zod and deepmerge. No critical findings.
- With UV_CACHE_DIR=.cache/uv,
  `uv run --project backend --locked --offline pytest backend/tests -q --tb=short`:
  exit 0; 83 passed in 2.75s; existing Starlette TestClient/httpx warning only.
- `uv run --project backend --locked --offline python scripts/check_foundation.py`:
  exit 0; foundation syntax/local links/task IDs validated.
- `git diff --check`: exit 0; line-ending normalization warnings only.

Audit detail: Expo CLI resolves zod 3.25.76; the report lists GHSA-mrhx-c7xc-m3w5
(oversized constrained collection memory exhaustion, affected <4.6.6). Expo config
resolves deepmerge 4.3.1; GHSA-gcqx-w48m-w2h4 reports prototype poisoning. The SDK 58
tooling chain is affected; npm proposes downgrading Expo to 51.0.39. That incompatible
major downgrade was not applied, nor any force/override/audit fix. This is not an audit
clean result or a conclusion about exploitability in the static app. Revisit upstream
compatible fixes before release. Full report is in ignored .cache/mobile-audit-20261029.json.
The initial attempt to parse that report as UTF-8 failed because PowerShell redirection
wrote UTF-16; reading its detected encoding succeeded. The audit itself returned valid JSON.

Limits: all mobile checks are static/configuration/bundling; no Android device/emulator
launch, APK/AAB build, signing, Play release, TalkBack/large-font/orientation check or
native permissions/device test was performed. Android Studio/SDK/emulator/ADB were not
found during the prior inventory; the JAVA_HOME/PATH mismatch remains unchanged. No
system Java/Node settings or Android tools changed. Current CI has backend/frontend jobs;
mobile checks were run locally and are not claimed as remote CI. No new test framework
was added for a non-interactive screen; interaction tests belong with future behaviors.

Handoff: initial scaffold portion complete; ownership released. Whole P6-06 remains open
because selection/submission/results and loading/error/retry acceptance are not implemented.
Changed mobile/ and only necessary framework/status docs: AGENTS.md, SPEC.md, README.md,
docs/ARCHITECTURE.md, docs/VALIDATION.md and TASKS.md. No backend/frontend implementation,
ML work or existing lock changed. No commit, push or subsequent task started. Exact install,
run/check commands and pending device steps are in mobile/README.md.


### P6-06 Windows-to-iPhone Expo Go preparation (October 29, 2026)

Owner `codex-iphone-preview-20261029`; `feat/backend-foundation` / current checkout;
base/current HEAD `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; uncommitted. Read instructions,
SPEC, mobile README/source/config, TASKS, architecture and latest validation evidence;
inspected status, branch/HEAD, relevant changes and untracked mobile scaffold before edits.
Preserved all existing backend/ML/scaffold work. Claimed this scoped preparation only.

The owner reports an available iPhone and Windows development host. Android remains the
initial release target; iOS/App Store release is undecided. No Android device/emulator
has been established, so Android runtime/TalkBack verification remains pending. An iPhone
can test shared UI/VoiceOver but cannot substitute for Android acceptance.

Compatibility evidence checked before any SDK decision:

- [App Store listing/version history](https://apps.apple.com/us/app/expo-go/id982107779)
  lists Expo Go 58.0.5, October 22, with release notes stating SDK 58 support; minimum
  iOS version is 16.4. Apple's Canadian lookup metadata at
  https://itunes.apple.com/lookup?id=982107779&country=ca independently returned version
  58.0.5, minimumOsVersion 16.4 and the SDK 58 release notes. Read-only text/JSON only;
  no client archive or app was downloaded by the agent.
- [Expo version metadata](https://exp.host/--/api/v2/versions) maps SDK 58 to expo
  ~58.0.21, React 19.3.0 and RN 0.88.1, matching the installed scaffold. It lists iOS
  client 58.0.7 and a simulator archive; that is not evidence of physical-device App
  Store availability for 58.0.7. The store's general description still mentions RN 0.86,
  inconsistent with its newer SDK 58 release notes; this stale description is not a
  reason to change SDKs. Older release-time rollout notes do not override the observed
  current App Store version history. The expo.dev/go SDK-filtered page returned 403.
- [Physical-iPhone sign-in policy](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/)
  and [start-developing steps](https://docs.expo.dev/get-started/start-developing/): the
  same free Expo account is required in Expo CLI and Expo Go for a physical iPhone
  opening a development server project. The owner performs all sign-in outside Git.
  No account commands were run by the agent and no auth state/credentials were inspected.

Conclusion: a published SDK-58-compatible iPhone Expo Go is available; no project SDK
upgrade/downgrade is needed on that evidence. The owner's iPhone model, iOS version and
installed Expo Go version have not been supplied, so compatibility with that particular
phone and any actual runtime success remain unverified. A pre-iOS-16.4 device or an
SDK-incompatible/unavailable client would be a specific blocker; report it before any
SDK change. No SDK, package version or package-lock dependency was changed this turn.

Changes: enabled android and ios in mobile/app.json; retained orientation=default.
Added preview:iphone (`expo start --go --lan`), explicit check:bundle:android and
check:bundle:ios scripts, separate ignored dist/android and dist/ios outputs, and made
check:bundle/aggregate check run both exports. Changed the screen's Android-specific
sentence to platform-neutral wording. Documented iPhone preview support versus an
unapproved iOS release in architecture, SPEC/README and mobile setup instructions.
No camera/upload/API functionality or native build configured.

Measured checks (repository root, Node 26.12.0 / npm 11.20.0):

- With EXPO_NO_TELEMETRY=1, `npm.cmd --prefix mobile run check`: exit 0. It ran
  `npm.cmd --prefix mobile run lint` (ESLint --max-warnings 0),
  `npm.cmd --prefix mobile run typecheck` (tsc --noEmit),
  `npm.cmd --prefix mobile run check:dependencies` (Dependencies are up to date), then
  `npm.cmd --prefix mobile run check:bundle` (both exports).
  Normal Expo user-cache access was approved using the previously established check
  permission; no system/firewall/toolchain permissions were weakened.
- Android export: `expo export --platform android --output-dir dist/android`, exit 0;
  625 modules, 4972ms, 1.6 MB Hermes JavaScript bundle and metadata.json.
- iOS export: `expo export --platform ios --output-dir dist/ios`, exit 0;
  627 modules, 9647ms, 1.6 MB Hermes JavaScript bundle and metadata.json.
  Exports compile JavaScript; neither is a device test or APK/AAB/IPA/native build.
- From mobile/, `.\node_modules\.bin\expo.cmd config --type public --json`: exit 0;
  parsed Android+iOS, default rotation, no EAS project ID. Manifest dependency sections
  equal package-lock root declarations. npm scripts are not stored in the lockfile;
  no reinstall/lock update was necessary. Config output is in ignored
  .cache/mobile-iphone-public-config-20261029.json.
- With UV_CACHE_DIR=.cache/uv,
  `uv run --project backend --locked --offline python scripts/check_foundation.py`:
  exit 0; syntax/local links/task IDs validated.
- `git diff --check`: exit 0; line-ending warnings only. Expo/Metro printed the existing
  NO_COLOR/FORCE_COLOR warning. Prior dependency-audit findings remain unresolved;
  no audit fix, forced downgrade, install or new dependency was attempted.

Owner-run steps are in mobile/README.md: install/update compatible Expo Go from the
App Store; personally sign into the same Expo account on Windows and iPhone; same trusted
LAN with device reachability; run `npm.cmd --prefix mobile run preview:iphone`; scan
terminal QR using iPhone Camera and open Expo Go; permit Expo Go Local Network access
if requested; stop owned Metro with Ctrl+C afterward. Local Network permission is an
expected host requirement, not a new HORTI camera/media permission. The app needs no
FastAPI server for this screen. No server/tunnel was started by the agent this turn.
Firewall/router/VPN changes require a separately agreed setup step if reachability fails.

Device results: **all pending, no observations reported or observed**. Record after the
owner supplies iPhone model/iOS/Expo Go build and actual results for launch/no crash,
unexpected permission prompts, VoiceOver heading/text order, largest accessibility text,
portrait/landscape, scrolling and notch/home-indicator safe areas. The README supplies
exact settings and gestures, including [Apple's Larger Text guidance](https://support.apple.com/en-us/102453).
Do not turn this preparation or bundle success into a device pass. No Android device
result, native development/release build, iOS release approval or remote CI is claimed.

Handoff: preparation complete; ownership released pending owner device observations.
P6-06 remains open. Changed mobile/app.json, mobile/package.json, mobile/App.tsx,
mobile/README.md, docs/ARCHITECTURE.md, SPEC.md, README.md, TASKS.md and this record only.
Preserved package-lock versions and all pre-existing backend/ML work. No signing, cloud
project, native build, tunnel, system Java/Node/firewall change, commit or push.

### Requested EAS project linking (October 29, 2026)

Owner `codex-eas-link-20261029`, branch `feat/backend-foundation`, base/current HEAD
`ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; changes uncommitted. User explicitly requested
linking existing project `264e6efb-c0f6-4151-a73a-5ef0e69cb83c`. From `mobile/`, ran
`npx.cmd --yes eas-cli@latest init --id 264e6efb-c0f6-4151-a73a-5ef0e69cb83c`
with approved download/user-cache access. CLI downloaded, then reported that an Expo
account was required and prompted for email/username. Cancelled with Ctrl+C (exit 1)
without entering or inspecting credentials. `mobile/app.json` remains unchanged with
no EAS project ID; linking is not complete. Owner must sign in personally before retry.
No build, deployment, signing setup, dependency-manifest change, commit or push occurred.
Existing work preserved; ownership released. Only task/evidence documentation changed.

#### EAS link verified after owner sign-in/init

The owner reported completing login/init personally. Re-inspected `mobile/app.json`:
slug changed from `horti-mobile` to `horti`, owner is `horti`, and
`extra.eas.projectId` is `264e6efb-c0f6-4151-a73a-5ef0e69cb83c`. Preserved these owner
changes. From `mobile/`, ran `npx.cmd --yes eas-cli@latest project:info`. Initial sandbox
run failed with EPERM opening the user npm cache; approved retry exited 0 and returned
`fullName @horti/horti` and the exact requested project ID. No credentials were read or
entered by the agent. This verifies project identity/linking, not a build or device launch.
Updated mobile setup and architecture documentation to reflect the link. No dependency,
signing, build-profile, deployment or application-source changes; no commit or push.
Foundation validation, `git diff --check` and a Node assertion of the app config's
project ID/owner/slug passed. Diff checking reported only line-ending warnings.
Ownership released; P6-06 and physical-iPhone validation remain incomplete.

### Owner-reported iPhone scaffold launch (October 29, 2026)

Owner `codex-iphone-evidence-20261029`; branch `feat/backend-foundation`, current checkout,
base/current HEAD `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; uncommitted.
The developer reported connecting Expo Go and confirmed the HORTI screen displays
"Predictions are not yet available". Reported device: iPhone 13 Pro Max, iOS 26.5,
Expo Go 58.0.5. These versions and the screen result are owner-reported, not independently
observed or queried by the agent. This records a successful basic scaffold preview only.

Enlarged-text and VoiceOver checks are explicitly pending because the owner cannot test
them yet. Rotation, scrolling, safe areas, unexpected permission prompts and sustained
crash-free behavior were not separately confirmed. No Android device result, API upload,
prediction, native build or release acceptance is established. P6-06 remains open.
Only documentation/status text changed; existing implementation and owner changes preserved.
Foundation validation and `git diff --check` passed (line-ending warnings only).
No runtime suite rerun for this documentation-only update. Ownership released; no commit
or push, and no subsequent feature started.

### P6-06 mobile upload/error foundation — October 29, 2026

Owner `codex-mobile-upload-20261029`; branch `feat/backend-foundation`, current checkout;
base/current HEAD `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; all work uncommitted.
Inspected status, branch/HEAD, relevant diffs and untracked mobile/backend files; preserved
existing backend, ML, scaffold and owner EAS configuration. Read shared instructions,
requirements/task/architecture/mobile setup and recent validation. Read installed Expo
plugin `native-data-fetching/SKILL.md`; consulted official Expo unit-testing/public-env
and React Native networking documentation linked in mobile/README.md.

**Prerequisite blocker:** the actual checkout has no photo picker, image-selection state,
ImagePicker dependency or selection tests. App.tsx remains the informational screen.
Asked whether to implement the separately requested selection first or limit this turn
to upload infrastructure; no answer received at handoff. Did not infer a completed
prerequisite or add photo selection under the latest upload-only scope. Implemented
`src/uploads.ts`, `src/UploadPanel.tsx`, two behavior-test files and Jest configuration;
updated mobile manifest/lock/TypeScript/check scripts and documentation. UploadPanel is
not mounted. Thus screen integration, real iPhone upload and full scoped acceptance are
**incomplete**. P6-06 remains unchecked; ownership released at handoff.

Behavior evidenced with synthetic URIs and mocked transport: one native multipart field
named image; no explicit multipart Content-Type/boundary or client request ID; omitted
credentials; neutral transport filename; explicit submission, loading, duplicate guard,
cancel/retry; abort on unmount/replacement/removal and stale-result suppression; network
failure and 30-second timeout; defensive envelope/UUID parsing and mismatched-ID rejection;
safe upload rejection/503 feedback without server message/details or fabricated predictions.
No API process, network image upload, device interaction or personal photo was used.
No body/URI/metadata logging, image persistence/file copy, camera or EAS change added.

Commands and observed results (repository root unless stated):

- From mobile/: `npx.cmd expo install jest-expo jest @types/jest --dev` selected
  jest-expo ~58.0.13, Jest ~30.5.2 and @types/jest 30.0.0. Initial EPERM at user Expo cache;
  approved normal-cache retry succeeded. Installed test tools only; no SDK change.
- From mobile/: `npm.cmd install --save-dev @testing-library/react-native@13.3.3 react-test-renderer@19.3.0`;
  initial npm-cache EPERM; approved retry passed. Renderer matches installed React19.3.0.
  npm warned of deprecated inflight/glob/whatwg-encoding and unapproved install scripts
  for unrs-resolver/@parcel/watcher; no script approvals or forced fixes performed.
- Initial tests: 20 passed, 1 failed because the feedback View lacked accessible=true;
  fixed accessibility grouping. Initial lint rejected state resets in an effect; replaced
  them with keyed attempt lifetime. Added explicit Jest types after initial typecheck
  errors. Final `npm.cmd --prefix mobile test`: **21 passed**, 2 suites, no snapshots.
- `npm.cmd --prefix mobile run check`: **exit 0**. Runs those 21 tests, ESLint with zero
  warnings, strict tsc, `expo install --check` (dependencies up to date), Android export
  and iOS export. Used approved normal Expo-cache access. Android: 625 modules; iOS:
  627 modules; each emitted metadata and a 1.6 MB Hermes bundle under ignored dist/.
  These exports package the existing informational entry screen; the unmounted upload
  component is checked by TypeScript/component tests, not exercised by those bundles.
- With `$env:UV_CACHE_DIR = Join-Path (Get-Location) '.cache/uv'`:
  `uv run --project backend --locked pytest backend/tests`: **83 passed**, one existing
  Starlette TestClient/httpx deprecation warning, 1.82s. Current unavailable service and
  uniform error contract verified through existing tests, not a new live HTTP run.
- Same cache: `uv run --project backend --locked ruff check backend`: all checks passed;
  `uv run --project backend --locked ruff format --check backend`: 21 files formatted.
- Same cache: `uv run --project backend --locked python scripts/check_foundation.py`:
  passed. `git diff --check`: exit0, existing CRLF-to-LF warnings only. Git diff does
  not inspect untracked mobile files; their syntax/types/lint/tests are checked above.
- `npm.cmd --prefix mobile audit --json`: exit1, latest report **26 package findings:
  3 high, 23 low**, no moderate/critical. Two underlying advisories: deepmerge
  GHSA-gcqx-w48m-w2h4 and zod GHSA-mrhx-c7xc-m3w5. Low-severity propagation now includes
  Jest/component-test packages. Install-time summary was 15 (3 high/12 low); the explicit
  later audit expanded propagation counts. No compatible fix reported in latest audit;
  no forced fix, dependency override or SDK downgrade.

mobile/README.md provides exact Windows API binding/public URL/Expo Go/health and upload
manual steps, gated on selection integration. Phone localhost is not Windows. No current
phone-to-API reachability has been measured; firewall, LAN isolation and iOS transport
policy remain possible blockers, not established failures. No firewall/tunnel/security
changes were made. Real iPhone 503 upload, UUID/log comparison, VoiceOver, enlarged text,
rotation/scrolling/safe areas remain pending owner-reported or observed evidence. Earlier
owner-reported informational-screen launch does not validate this upload infrastructure.
No Android/native build, remote CI, inference or complete P6-06 acceptance is claimed.
No commits, pushes or subsequent task implementation.

Final documentation check initially found a Windows Add-Content encoding error in the newly appended validation heading. Corrected only that appended section to UTF-8; foundation validation and git diff --check then both passed again. New mobile source/config whitespace scan also passed.

### P6-06 photo-selection prerequisite - October 29, 2026

Owner `codex-photo-select-20261029`; branch `feat/backend-foundation`, current checkout;
base/current HEAD `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; changes uncommitted.
Inspected status, branch, HEAD, diffs and untracked source/test/configuration files;
read shared instructions, SPEC, TASKS, architecture, mobile setup and recent evidence.
The screen was informational; inspected UploadPhoto/UploadPanel and the existing Jest,
jest-expo and React Native Testing Library setup. Reused it without another test stack.
Preserved upload source/tests, backend/ML work and owner EAS identity. Root README/mobile
setup/architecture/status updated only for the new local-selection implementation.

Implemented and mounted `mobile/src/photo-selection.tsx` in App.tsx, plus the pure
`selected-photo.ts` boundary/model and `photo-selection.test.tsx`. One local photo preview,
Choose/Replace/Remove controls, synchronous picker-session guard, safe errors and ignored
post-unmount completion. Cancel/failure/rejected replacement preserves the previous photo.
Single-image native system picker; no camera, broad-library permission request, editing,
EXIF/base64 request, app file copy/delete, persistence or photo/metadata logging. URI-only
preview accepts local file/content schemes; unexpected remote URIs are rejected. Model
retains only URI and optional MIME/size, structurally compatible with UploadPhoto; no
filename/asset ID retained. UploadPanel remains unmounted and upload infrastructure was
not changed. No networking is triggered by selection.

Client hints accept a reported exact 5 MiB size and reject >5 MiB; known unsupported
MIME/filename metadata (including HEIC/HEIF) gets explicit feedback without relabeling or
conversion. Missing/invalid size or missing MIME stays unverified; preview is not proof
of contents or validity. Backend validation remains authoritative. UI text explicitly
says selection does not upload anything. Scrolling, flexible-height labeled controls,
scalable text and safe-area container retained; real accessibility acceptance pending.

Used installed Expo plugin `building-native-ui/SKILL.md` guidance (single scrolling screen,
Expo Go preview first). Consulted official SDK-58 ImagePicker documentation, linked in
mobile/README.md. Inspected installed SDK native source/plugin: iOS current-representation,
quality=1/no-edit flow uses an original-representation cache fast path; SDK fallback may
process provider data. No byte-for-byte guarantee for every provider is claimed. Expo may
cache a chosen file; removing state neither deletes the user's original nor guarantees
immediate cache erasure. No application-added copy/conversion was introduced.

Native app config adds ImagePicker plugin with photosPermission/cameraPermission/
microphonePermission=false, blocking CAMERA/RECORD_AUDIO through its plugin; explicitly
blocks broad Android legacy-storage/media permission declarations. No native generation,
build/signing/cloud change occurred. These settings cannot change Expo Go's own host
manifest. Node assertion confirmed owner horti, slug horti and the existing EAS project
ID are unchanged. Device permissions need actual observation; exports are not proof.

Commands/results:

- `node --version`: v26.12.0; `npm.cmd --version`: 11.20.0, unchanged and inside declared
  engine range. From mobile/, `npx.cmd expo install expo-image-picker`: initial sandbox
  EPERM opening user Expo cache; approved retry succeeded. SDK selected ~58.0.10;
  installed expo-image-picker58.0.10 and expo-image-loader58.0.3, two packages added.
  mobile/package.json and package-lock updated by Expo/npm. No SDK/test-tool upgrade.
- Initial tests had five failures from exact-text matcher assumptions and retained
  mock-once queues; corrected substring assertions to regular expressions and reset the
  native mock per test. Production lint/typecheck already passed. Then 44 tests passed;
  added three local/empty-input guard cases and reran final checks.
- `npm.cmd --prefix mobile run check`: exit0; **47 tests passed in three suites**, no
  snapshots (26 new selection/model tests plus all 21 existing upload tests). Native
  picker mocked; synthetic asset descriptors only. Covered selection/options/mounted UI,
  replace/remove/cancel, failure/retry/redaction, repeated taps, empty/multiple results,
  unsupported formats/HEIC, exact and over-limit bytes, missing metadata, preview errors,
  unmount/remount, local-URI guard and no automatic networking. Existing upload tests
  remain passing. No dataset, weights, device, API process or real HTTP upload used.
- Aggregate also ran `npm.cmd --prefix mobile run lint`: zero warnings/errors;
  `npm.cmd --prefix mobile run typecheck`: passed;
  `npm.cmd --prefix mobile run check:dependencies`: dependencies up to date;
  `npm.cmd --prefix mobile run check:bundle:android`: passed (631 modules, 1.6MB Hermes);
  `npm.cmd --prefix mobile run check:bundle:ios`: passed (633 modules, 1.6MB Hermes).
  Exports are ignored dist/ artifacts, not device/native-build tests. Used approved
  normal Expo-cache access. Only NO_COLOR/FORCE_COLOR environment warnings during bundling.
- `npm.cmd --prefix mobile audit --json`: exit1; **28 findings: 3 high, 25 low**, no
  moderate/critical. Previous explicit audit26 (3high/23low); new low-severity package
  propagation includes expo-image-picker/expo-image-loader, both fixAvailable=false.
  Same underlying deepmerge GHSA-gcqx-w48m-w2h4 and zod GHSA-mrhx-c7xc-m3w5 advisories.
  Install-time summary15 (3high/12low) differed from explicit audit propagation counts.
  No forced fix, dependency override or SDK downgrade. npm noted unapproved install
  scripts for @parcel/watcher/unrs-resolver; no script approvals made.
- With `$env:UV_CACHE_DIR = Join-Path (Get-Location) '.cache/uv'`, ran
  `uv run --project backend --locked python scripts/check_foundation.py`: passed.
- `git diff --check`: exit0, existing CRLF-to-LF warnings only. Git excludes untracked
  mobile files from this check; explicit whitespace scan of changed/new mobile source,
  tests and app.json also passed. Strict mobile types/lint/tests check those files.
  No backend changes this turn; backend suite was not rerun for this isolated mobile
  prerequisite (prior 83-pass evidence remains historical).

Manual iPhone plan is in mobile/README.md: same-network Expo Go QR launch; choose a small
synthetic JPEG/PNG, replace/cancel preserving preview, replace with another, rapid taps,
HEIC/oversize feedback when fixtures available, remove and verify original in Photos,
restart empty; report device/iOS/Expo Go/date/results. No API required. Device results,
VoiceOver/large-text/rotation/scrolling/safe-area and unexpected permission checks remain
pending owner report or observation; earlier informational-screen launch is not evidence
for new picker behavior. No Android runtime, remote CI or native-release validation claimed.
Photo-selection implementation/static acceptance evidenced; device acceptance pending.
P6-06 remains open; ownership released at handoff. Stop after prerequisite: no upload
wiring, camera, predictions, commits, pushes or subsequent task.

### Selection error popup and owner device feedback (October 29, 2026)

Owner `codex-photo-feedback-20261029`; branch `feat/backend-foundation`, current checkout,
base/current HEAD `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; uncommitted. Inspected
instructions, source/tests, existing diffs and untracked mobile files before claiming
this focused change. Preserved all backend/ML/EAS/upload work.

The owner reported that all six requested basic selection checks succeeded on their
iPhone 13 Pro Max (reported iOS 26.5, Expo Go 58.0.5): choose/preview, replace, cancel
preserving selection, remove, invalid-input feedback and no upload on selection. This
is owner-reported evidence, not an agent-observed run or a measured file-boundary test.
The invalid-input fixture was not identified, so do not infer that both HEIC and exact
size boundaries were separately tested on-device. Earlier VoiceOver and enlarged-text
checks remain pending; the selection report did not independently confirm those or
rotation/safe-area checks. The owner requested a small red popup instead of plain
validation text and clarified HORTI's potential production/commercial intent.

Changed `mobile/src/photo-selection.tsx` to use a compact red modal for selection,
picker and preview errors, with a heading, safe message, explicit Dismiss button,
system-back and accessibility-escape dismissal. No automatic timeout. Previous photo
state is preserved. Error content scrolls and supports scaling; safe-area spacing,
screen-reader announcement and modal semantics are implemented but not device-verified.
Routine success/cancellation feedback stays inline and stale feedback clears on the
next picker attempt. No new dependency, file operation, network or upload wiring.
Two regression tests cover dismissal, reopening the same error, previous-photo
preservation, clearing stale feedback and system/accessibility dismissal. Updated
`mobile/App.tsx` introductory wording to reflect product development rather than
positioning the app only as an educational project.

Updated AGENTS/README/SPEC and architecture/setup docs to preserve the owner's product
direction and require a dedicated UI/usability review before release. No production
readiness, trained-model quality or completed UI redesign is claimed. Existing release,
privacy/security, artifact-rights and dependency-audit gaps remain visible.

Checks from repository root:

- `npm.cmd --prefix mobile test -- --watch=false`: exit 0, **49 tests passed in 3 suites**
  (final changed-source run); native/network interfaces mocked.
- `npm.cmd --prefix mobile run lint`: exit 0, no warnings/errors.
- `npm.cmd --prefix mobile run typecheck`: exit 0.
- `npm.cmd --prefix mobile run check:dependencies`: sandbox attempt hit EPERM opening
  Expo's normal user cache; approved retry exited 0, dependencies up to date.
- `npm.cmd --prefix mobile run check:bundle`: exit 0, Android 631 modules and iOS 633
  modules, each 1.6 MB Hermes bundle; only existing NO_COLOR/FORCE_COLOR warnings.
- With `UV_CACHE_DIR=.cache/uv`,
  `uv run --project backend --locked --offline python scripts/check_foundation.py`:
  exit 0. `git diff --check`: exit 0, line-ending warnings only. Untracked mobile
  source is checked by lint/types/tests; Git's diff check alone does not include it.

Sources: [React Native Modal](https://reactnative.dev/docs/modal) and
[accessibility](https://reactnative.dev/docs/accessibility). Mobile tests/exports do
not establish native popup appearance or VoiceOver behavior. Owner should recheck the
new popup on iPhone using mobile/README.md. No backend tests or fresh audit were run
because backend/dependency files were unchanged. The last reported mobile audit remains
3 high/25 low; no dependency fix or security-setting change was attempted.

P6-06 remains open; ownership released. No camera/upload integration, native build,
cloud build, commit, push or subsequent feature. Full UI redesign is still pending.

### P6-06 selection-to-upload integration - October 29, 2026

Owner `codex-selection-upload-20261029`; branch `feat/backend-foundation`, current checkout;
base/current HEAD `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; uncommitted.
Inspected status, branch/HEAD, relevant diffs, untracked mobile source/tests, shared
instructions, SPEC/TASKS/architecture/mobile setup and latest popup/validation evidence.
Preserved pre-existing backend/ML work and the owner's red selection-error modal.
Used installed Expo native-data-fetching guidance; checked official public-environment
configuration documentation (linked in mobile/README.md). No new networking/test stack.

App.tsx now owns the only selected-photo state, paired with a revision counter.
PhotoSelection is controlled via photo/onPhotoChange; no duplicate selection state.
Both preview and the existing UploadPanel receive that same photo. Accepted selection
or removal increments the revision and remounts UploadPanel; existing layout cleanup
aborts the old request and invalidates late responses. This explicitly handles a new
selection returning the same URI. Picker cancellation/rejected replacement changes
neither selection/revision nor the existing upload. Red popup styles, safe messages,
dismiss/back/escape and announcement logic remain intact. Selection success wording
now says upload requires a separate press, avoiding a stale 'not uploaded' assertion
when submission later occurs. Developer configuration names are kept out of user errors.

Existing uploads.ts is reused unchanged: one multipart image field, generated boundary,
public EXPO_PUBLIC_API_URL, explicit submission only, loading/duplicate guard, cancel,
retry, 30-second timeout and defensive safe envelope/UUID parsing. Current valid JPEG/PNG
503 becomes model unavailable; raw server messages/details/URIs and fabricated predictions
are never rendered. Missing/invalid public API address or missing photo disables submit.
No body/URI logging, photo persistence, backend contract change or new dependency.

Changed: mobile/App.tsx, src/photo-selection.tsx controlled interface/wording,
src/UploadPanel.tsx user configuration feedback/disabled styling, existing selection/panel
tests, new src/__tests__/screen-upload.test.tsx, README.md mobile status, mobile/README.md,
docs/ARCHITECTURE.md, TASKS.md and this validation record. Popup implementation preserved.
Manifest/package-lock/app.json SHA256 values were captured before edits and asserted
unchanged afterward, including EAS identity and picker permission configuration.
No dependencies installed, lock updates, native builds or security-setting changes.

Checks (repository root):

- Before integration tests, existing adjusted component/unit suite: **49 passed**.
  New screen tests render the real App, PhotoSelection, UploadPanel and uploads.ts;
  only native picker/safe-area host and fetch boundary mocked, synthetic assets only.
- Initial combined run: 62 passed/1 failed due to a brittle negative wait for a loading
  control in the malformed-response scenario. Changed that assertion to await the
  observable response feedback and assert request count; no client workaround/refactor.
  The isolated scenario then passed, followed by the full aggregate below.
- `npm.cmd --prefix mobile run check`: **exit0, 63 passed in 4 suites**, no snapshots.
  Includes all prior selection/popup/upload tests and 14 new screen cases: selection
  sends nothing; explicit single-field multipart; safe503/UUID; missing/invalid public
  address; duplicate taps; cancel/retry; replace/remove/same-URI selection during upload;
  ignored late responses; cancelled/rejected picker preserving request/preview; red popup
  and dismissal; same-URI clearing completed feedback; timeout/retry; network failure,
  malformed response and unexpected success without predictions. No real image/network.
- The aggregate also passed ESLint (--max-warnings0), strict TypeScript,
  `expo install --check` (dependencies up to date), Android and iOS exports. Android:
  633 modules, 1.6MB Hermes bundle; iOS: 635 modules, 1.6MB. Output under ignored dist/.
  Only existing NO_COLOR/FORCE_COLOR warnings; used approved normal Expo-cache access.
  These are JavaScript packaging checks, not device launch/native build/upload evidence.
- With `$env:UV_CACHE_DIR = Join-Path (Get-Location) '.cache/uv'`:
  `uv run --project backend --locked --offline pytest backend/tests`: **83 passed**,
  1.44s, one existing Starlette TestClient/httpx deprecation warning. Backend unchanged.
- Same cache: `uv run --project backend --locked --offline python scripts/check_foundation.py`:
  passed. `git diff --check`: exit0, existing CRLF-to-LF warnings only. Git excludes
  untracked mobile files; strict lint/types/tests plus explicit source whitespace scan
  cover the new/edited mobile files.
- No fresh npm audit: dependencies/manifest/lock are byte-for-byte unchanged. Last
  explicit report remains historical: 28 package findings (3high/25low), propagated from
  zod/deepmerge advisories. No audit-clean claim, forced fixes or SDK downgrade.

mobile/README.md now gives an executable, still-unverified Windows-to-iPhone upload plan:
trusted same LAN; bind Uvicorn only to the chosen Windows interface for local testing;
phone Safari health check; EXPO_PUBLIC_API_URL points to Windows LAN address, not phone
localhost; restart Metro with Expo Go LAN QR workflow; select synthetic JPEG/PNG and press
Upload; expect safe503 and compare UUID with API diagnostic log. Cancel/replacement can
be too fast to exercise manually against immediate503; record that limitation rather
than a pass. No firewall change, tunnel, transport-security exception or CORS broadening.

Real iPhone API reachability/upload/UUID acceptance remains pending owner report. Earlier
owner basic-selection evidence does not validate integration or the new red popup.
VoiceOver, enlarged text, popup focus/announcements, rotation/scrolling/safe areas remain
pending. No Android runtime, native release, remote CI or prediction success claimed.
P6-06 remains unchecked; ownership released at handoff. No camera, inference, success
screens, persistence, cloud builds, commits, pushes or subsequent-task implementation.

### P6-06 iPhone upload verification preparation - October 29, 2026

Owner `codex-iphone-upload-verify-20261029`; branch `feat/backend-foundation`, current
checkout; base/current HEAD `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; uncommitted.
Inspected status, branch/HEAD, diffs/untracked files, shared instructions, requirements,
tracker, architecture, current screen/client/picker/popup, integration tests and latest
validation/mobile instructions. Preserved all existing implementation/backend/ML/EAS work.
Scope: runtime verification only; no feature/dependency/application-config edits.

Reported target device: iPhone13 Pro Max, reported iOS26.5, ExpoGo58.0.5. No current
phone observation has been made. Earlier selection reports do not establish upload.

Read-only network/process inspection commands:

- `Get-NetConnectionProfile | Select-Object InterfaceIndex,InterfaceAlias,NetworkCategory,IPv4Connectivity`
- `Get-NetIPConfiguration` filtered to IPv4 default-gateway interfaces, projecting
  interface/index/IPv4 only.
- `Get-NetTCPConnection -State Listen` filtered to ports8000/8001/8081/8082/19000/19001.
- `Get-CimInstance Win32_Process` filtered to python/node/uvicorn/uv processes.

Sandbox inspection initially returned Access denied for CIM/network information.
Approved read-only retry succeeded. Wi-Fi interface15 is active with Internet IPv4
connectivity and LAN address10.0.0.157; Windows profile is **Public**. No listeners on
those usual API/Metro ports; no matching API/Metro process found in the inspected Windows
process list. The observed Node processes belong to other tools and were not stopped.
This does not inventory another host/WSL instance or prove the network is trusted.

Asked owner whether this is a trusted home/private network and the iPhone is on the
same network. **Trust confirmation pending at handoff.** Did not bind an API to the
Public-profile interface without that information; did not change its profile/firewall,
router, CORS, transport policy or use a tunnel. No API/Metro process launched, session
API URL configured, .env file created or temporary artifact added. No cleanup needed.

Independent checks while waiting:

- `npm.cmd --prefix mobile test -- --watch=false`: exit0, **63 passed in4 suites**,
  5.867s, native/network boundaries mocked. This is automated evidence only.
- With `$env:UV_CACHE_DIR = Join-Path (Get-Location) '.cache/uv'`:
  `uv run --project backend --locked --offline python -c "import uvicorn; from app.main import app; print('Locked Uvicorn/FastAPI imports OK')"`:
  exit0, locked Uvicorn/FastAPI imports OK. No API process or real HTTP request.
- Foundation validation and git diff --check run for the documentation/tracker handoff;
  results recorded below. No implementation bug demonstrated, so no code fix or extra
  exports/backend-suite rerun performed. Prior63/83 suite/export evidence remains separate.

Next step after confirmation: recheck port availability; start locked Uvicorn on the
specific LAN address and an available port, keeping a record of the owned PID/logs.
Verify health from Windows first. Owner restarts only their Metro terminal with Ctrl+C,
then sets EXPO_PUBLIC_API_URL in that same terminal and runs the documented LAN preview
command. An already-running Metro cannot inherit an environment variable set in another
process; phone localhost is the phone, not Windows. If no Metro is running, start a new
owner terminal with the session variable. Credentials remain outside Git; owner signs in.

Device checklist remains wholly pending: Safari /health; synthetic JPEG/PNG selection
with no POST; explicit upload giving honest503; displayed UUID comparison with safe
backend diagnostic log; cancel/retry and replace/remove/same-URI stale-response cases
when observable; quick red popup/Dismiss/preserved-preview check. Immediate503 may be too
fast for race interaction: record such cases as unobserved, with automated evidence only.
VoiceOver/enlarged text/new popup device behavior remain pending. No device success,
reachability result, native build or remote CI is inferred. P6-06 remains open.
Ownership released at handoff pending owner network confirmation; no commit/push.

Handoff documentation checks: locked offline foundation validator exit0; git diff --check exit0, existing CRLF-to-LF warnings only. No application-source changes this verification attempt.

### iPhone upload verification: trusted LAN preparation resumed

Owner confirmed the Public-profile Wi-Fi is their trusted home network, with iPhone on
that same network, and explicitly authorized using10.0.0.157 without firewall/network
changes. Rechecked git status/branch/HEAD; same branch/base as above. New untracked
.vscode/settings.json was observed and left untouched; all existing work preserved.
Resumed scoped ownership `codex-iphone-upload-verify-20261029`.

Approved read-only Get-NetIPAddress/Get-NetTCPConnection recheck: Wi-Fi interface15
still has10.0.0.157; no listeners on8000/8001/8081/8082. Kept Windows network profile,
firewall/router, transport policy and CORS unchanged. No tunnel.

Started an owned foreground PTY process from repository root:

```powershell
$env:UV_CACHE_DIR = Join-Path (Get-Location) '.cache/uv'
uv run --project backend --locked --offline uvicorn app.main:app --app-dir backend --host 10.0.0.157 --port 8000
```

Startup complete; Uvicorn PID25524, tool PTY session35034. Bound only the confirmed LAN
address, no reload. This process remains running for the requested phone test; stop only
this owned session with Ctrl+C after testing. No unrelated/user-owned process stopped.
No runtime log file/temporary image artifact created.

From Windows ran:

```powershell
$result = Invoke-WebRequest -UseBasicParsing -Uri 'http://10.0.0.157:8000/health' -TimeoutSec 10
```

Observed HTTP200 and exact body {"status":"ok"}; header X-Request-ID
`df5d783f-4215-430e-a897-82a311cd014f`. This is a Windows-host request only, not phone
reachability evidence. No image was sent.

Gave owner Safari URL http://10.0.0.157:8000/health and requested actual phone outcome.
Gave owner exact Metro restart/session configuration, to run personally from repository
root after Ctrl+C only in their Metro terminal (or in a new terminal if none running):

```powershell
$env:EXPO_PUBLIC_API_URL = 'http://10.0.0.157:8000'
npm.cmd --prefix mobile run preview:iphone
```

Explained an existing Metro cannot inherit another process's environment; restart/full
Expo Go reload required for this session command. Agent did not stop/start user Metro,
write .env, change persistent environment settings, or perform account sign-in. Actual
owner execution/config uptake remains pending report. No machine address added to app
source/configuration. Phone localhost remains the phone, not Windows.

Asked owner for Safari health result and whether synthetic-image preview enables Upload
without submitting. Both are pending, as are real503, displayedUUID/log comparison,
observable cancellation/replacement races, red-popup device check and accessibility.
No device pass inferred from Windows health or automated tests. API is intentionally
left available while awaiting owner steps; cleanup remains limited to the owned process.

Preparation handoff: locked offline foundation validation and git diff --check passed (existing line-ending warnings only). Ownership released pending owner phone results; P6-06 open. Owned API PID25524 remains available for testing, with only that process eligible for later cleanup. No feature/code/dependency changes, commits or pushes.

### iPhone connectivity correction and still-camera capture (October 30, 2026)

Owners `codex-upload-diagnosis-20261029` and, sequentially, `codex-camera-capture-20261029`;
branch `feat/backend-foundation`, current checkout, base/current HEAD
`ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; changes uncommitted. Read instructions,
specification, tracker, architecture and source/tests; preserved all existing work,
including untracked `.vscode/`, backend/ML changes and EAS identity. No parallel writer.

**Corrected device evidence:** the owner clarified that the earlier health success was
on the laptop, not iPhone. Safari and Chrome on iPhone cannot reach the LAN health URL;
native upload shows the generic connection error. Expo Go Local Network access is enabled.
No POST-log observation was supplied. The red wrong-file popup is now confirmed working
by the owner. The phone/API upload, camera, VoiceOver and enlarged-text acceptance are
not established. Any earlier interpretation of Safari health success is superseded.

Read-only approved Windows checks confirmed Wi-Fi `10.0.0.157/24`, network profile Public,
API PID 25524 listening specifically on `10.0.0.157:8000`, and Metro PID 34188 on `:::8081`.
An independent host Invoke-WebRequest returned HTTP 200 with exact body `{"status":"ok"}`.
No process was started/stopped during these checks. Public firewall is enabled with
default inbound Block. Two enabled Public Python allow rules exist (TCP and UDP, any
ports/addresses), pointing at `cpython-3.12.14-windows-x86_64-none/python.exe`. The running
process reports the `cpython-3.12-windows-x86_64-none/python.exe` path; file inspection
shows that directory is a junction to the exact versioned directory. Do not claim these
are different binaries or that path mismatch is a proven block. Firewall policy and/or
network isolation remain possible causes; device reachability is unresolved. No firewall,
profile, router, CORS, ATS, tunnel or persistent environment change was made.

Implemented a development-only explicit native health diagnostic in UploadPanel. It
shows the validated service address, sends GET /health without an image/credentials,
uses bounded timeout and unmount cancellation, and returns safe fixed messages. It never
runs automatically and is absent from production UI. URL validation now rejects embedded
whitespace/backslashes. Unit/screen tests cover valid health, wrong service, bad config,
safe native failures, timeout ignoring abort and explicit non-upload behavior. Real
diagnostic results on the iPhone are pending; no fix for LAN reachability is claimed.

The owner also explicitly requested camera capture. Added Take leaf photo through the
existing ImagePicker system still-camera UI, with permission checks only on action.
Denial (including cannot-ask-again), cancel or failure preserves prior selection and
gallery fallback; a shared guard prevents overlapping camera/library/permission flows.
Captured assets reuse existing validation, red popup, preview and selection revision,
so replacement aborts stale uploads even for a repeated URI. No automatic upload, video,
continuous inference, gallery save, app-level copy/delete, EXIF/base64 or extra dependency.
app.json now supplies a camera purpose string while retaining microphone/library blocks
and the owner's exact EAS identity. Expo Go has its own host permissions. SDK cache files
may remain; clearing selection is not an immediate cache-erasure guarantee.

Checks from root:

- `npm.cmd --prefix mobile test -- --watch=false`: exit 0; **77 tests in 4 suites**,
  with mocked native/network boundaries. Camera cases include explicit capture, permission
  denial/grant, cancellation, shared guard, safe failure/unsupported/oversize handling,
  unmount during permission request, and same-URI stale-upload integration.
- `npm.cmd --prefix mobile run lint` and `run typecheck`: exit 0.
- `npm.cmd --prefix mobile run check:dependencies`: initial EPERM on normal Expo user
  cache; approved retry exited 0, dependencies up to date.
- `npm.cmd --prefix mobile run check:bundle`: exit 0; Android 633 modules, iOS 635,
  both 1.6 MB Hermes bundles. Only existing NO_COLOR/FORCE_COLOR warnings.
- With `UV_CACHE_DIR=.cache/uv`,
  `uv run --project backend --locked --offline pytest backend/tests -q --tb=short`:
  exit 0; **83 passed**, one existing Starlette/httpx deprecation warning.
- From mobile/, Expo `config --type introspect --json` was captured and only selected
  fields printed: camera purpose present, microphone purpose absent, broad Android
  media/storage blocks retained and EAS project ID unchanged. Exit 0; no native build.
- Locked offline foundation validator and `git diff --check`: exit 0, line-ending
  warnings only. Tests/lint/types check untracked mobile files that Git diff excludes.

Updated setup/design/status docs, including exact session URL/reload instructions and
camera device checks. Sources: [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/),
[Expo environment variables](https://docs.expo.dev/guides/environment-variables/),
[React Native networking](https://reactnative.dev/docs/network), installed ImagePicker
plugin and Android manifest. Used Expo native-data-fetching skill guidance. No dependency
or lockfile change; audit not refreshed and previous findings remain open. P6-06 and
P6-07 stay open, ownership released. No commit, push, build/deploy or subsequent feature.

### Approved temporary firewall diagnostic: administrator blocker (October 30, 2026)

Owner `codex-lan-firewall-20261030`, same branch/current checkout/base HEAD as above;
uncommitted. The user explicitly approved the proposed temporary inbound rule: TCP8000,
local address 10.0.0.157, remote subnet 10.0.0.0/24, removed after testing. Claimed this
scope, re-inspected status/instructions/docs, and preserved all existing changes.

Approved command first verified Wi-Fi address/prefix, Public profile, expected API
listener and absence of the exact rule name `HORTI-Local-API-Test-20261030`. Preflight
passed. Attempted New-NetFirewallRule with that name, Public profile, inbound Allow,
TCP8000 only, exact local address/subnet above, Wireless interface and edge traversal
blocked. Windows returned Access is denied (system error5), exit1. The shell's approved
outside-sandbox execution does not supply Windows administrator elevation. No rule was
created; read-only follow-up confirmed that exact test rule is absent. No policy,
firewall profile, listener, router, CORS, ATS, tunnel or security protection was changed.
This was an operating-system privilege denial, not an automatic approval-review rejection.

Owner must run the scoped command personally in an Administrator PowerShell if proceeding:

```powershell
New-NetFirewallRule -Name 'HORTI-Local-API-Test-20261030' -DisplayName 'HORTI temporary home Wi-Fi API test' -Direction Inbound -Action Allow -Enabled True -Profile Public -Protocol TCP -LocalAddress '10.0.0.157' -LocalPort 8000 -RemoteAddress '10.0.0.0/24' -InterfaceType Wireless -EdgeTraversalPolicy Block
```

Then test phone Safari health before uploading. Report the actual result. Remove only
this rule after the test, from the same Administrator PowerShell:

```powershell
Remove-NetFirewallRule -Name 'HORTI-Local-API-Test-20261030'
```

No rule currently needs cleanup from the failed agent attempt. Device result and LAN
root cause remain unresolved; P6-06 remains open. Ownership released pending owner/admin
action. Only documentation changed; no app/dependency change, commit or push.

### iPhone LAN failure after owner-created rule (October 30, 2026)

Owner `codex-lan-followup-20261030`; branch feat/backend-foundation, current checkout,
HEAD ccd7619fe97c98b4825f1ba3e16938a04bf1b00a; all work uncommitted. Inspected status,
latest shared instructions/specification/architecture, runtime and validation updates.
Preserved new development-health/camera work and all earlier backend/ML/mobile/config
changes. Read latest handoffs before overlapping documentation edits; prior claims released.

Owner reports Safari still cannot open the health link after personally executing the
named temporary firewall rule in Administrator PowerShell. Exact browser error, phone
IPv4/subnet and VPN status have been requested and remain pending. Do not characterize
this as a measured timeout, connection refusal or proven router isolation yet.

Read-only diagnostics performed (approved normal CIM/firewall access):

- Invoke-WebRequest -UseBasicParsing -Uri http://10.0.0.157:8000/health -TimeoutSec5:
  host HTTP200, exact body {"status":"ok"}.
- Get-NetIPAddress: Wi-Fi15 still10.0.0.157. Get-NetTCPConnection: listener only on
  10.0.0.157:8000, owning PID25524 (the existing owned Uvicorn); no process restart.
- Get-NetFirewallRule for HORTI-Local-API-Test-20261030: now exists, enabled inbound
  Allow on Public. Address filter local10.0.0.157, remote10.0.0.0/255.255.255.0;
  port filter TCP8000. The owner-created rule is also present in ActiveStore.
- Get-NetFirewallProfile -PolicyStore ActiveStore -Name Public: firewall enabled;
  AllowInboundRules/AllowLocalFirewallRules True. This does not rule out overriding
  block rules, third-party filtering, phone routing or Wi-Fi client isolation.
- Polled existing Uvicorn PTY35034 logs: observed host-address health requests and a
  favicon404; no request identified as from the phone. Absence of an HTTP log alone
  does not establish whether packets reached Windows.

No firewall/profile/router/CORS/ATS/VPN changes, tunnel, new feature, process stop or
application/dependency edit. Named rule now needs owner cleanup when testing finishes;
previous record that no rule existed described the failed earlier agent attempt and
is superseded by this owner-created-rule observation. Do not remove unrelated rules.
API PID25524 remains available for phone testing. All phone/upload/UUID acceptance and
current popup/accessibility results remain pending; P6-06 remains open.

Next diagnostic: obtain iPhone Wi-Fi IPv4/subnet and exact Safari error for the explicit
http://10.0.0.157:8000/health URL, plus VPN status. Do not broaden the rule or infer a
subnet match before seeing the phone address. Ownership released pending those details.

### Phone address and TCP observation follow-up (October 30, 2026)

Same scoped owner/branch/HEAD as above; preserved all work. Owner reports iPhone IPv4
10.0.0.3, subnet255.255.255.0 and Safari continuously loading without a displayed error.
This address matches the temporary rule's10.0.0.0/24 remote range. No need to broaden
that range is evidenced. VPN status and confirmation of an explicit http (not https)
Safari URL were requested; pending owner reply.

Asked owner to retry http://10.0.0.157:8000/health while performing an approved read-only
observation:15 Get-NetTCPConnection samples filtered to local port8000 and remote
10.0.0.3, with2-second pauses (CIM query overhead adds to nominal30-second pauses).
No matching TCP connection observed. Owner timing/retry during that interval was not
independently observed, so this is not proof of where packets are blocked. Existing
Uvicorn PTY35034 produced no new HTTP log during polling. No packet capture performed.

Get-NetNeighbor contains an entry for10.0.0.3 on interface15 (reported state numeric4);
Get-NetRoute for10.0.0.0/24 shows interface15, on-link next hop0.0.0.0. An existing
neighbor entry/on-link route does not prove current inbound TCP connectivity. API and
owner-created rule unchanged; no firewall/router/VPN/profile/CORS/ATS change or tunnel.
No feature fix or new dependency. Device health/upload/UUID acceptance remains blocked;
next step is owner's VPN and exact URL confirmation. Ownership released pending reply.

### Sandbox-bound API restart through normal approval (October 30, 2026)

Same scoped follow-up owner/current branch/HEAD; owner confirms no VPN and URL remains
http rather than https. Read-only ActiveStore scan for enabled inbound Block rules
matching Any/TCP and Any/8000 found `codex_sandbox_offline_block_inbound`, profileAny,
programAny, local portAny, rule ID {7C6CF884-A6EC-435D-9790-7049123ADADA}. This is evidence
of a possible sandbox restriction affecting the original default-sandbox API launch,
not proof of the phone failure's sole cause. Do not disable/delete/alter this protection.
No firewall mutation was attempted. Owner-created allow rule remains unchanged.

Used normal sandbox_permissions=require_escalated approval to restart the already
authorized local test API outside the offline sandbox, preserving protections. First
sent Ctrl+C only to owned PTY35034; original server remained running. Initial approved
identity guard refused to stop PID25524 because the command used quoted uvicorn.exe,
not plain uvicorn; no process stopped by that failed guard. Read-only CIM confirmed
same owned python PID25524, uvicorn.exe app.main:app --app-dir backend --host10.0.0.157
--port8000. Corrected guard checked python.exe, uvicorn.exe and exact app/host/port.

Approved command then used Stop-Process only for verified owned PID25524 (confirmed
its Windows prompt) and launched the same locked command:

```powershell
$env:UV_CACHE_DIR = Join-Path (Get-Location) '.cache/uv'
uv run --project backend --locked --offline uvicorn app.main:app --app-dir backend --host 10.0.0.157 --port 8000
```

New owned server PID10316, PTY82994; startup complete, same exact-interface binding and
no reload. Host Invoke-WebRequest health: HTTP200, exact {"status":"ok"}. Old PID25524
is no longer the owned running API. No unrelated/user-owned process stopped, no tunnel,
firewall/profile/router/CORS/ATS changes, app edit or dependency install.

Asked owner to retry explicit Safari health URL after this restart. Phone outcome is
pending; no success inferred from host200. If it succeeds, compare upload503 UUID with
PTY82994 safe diagnostic logs; real upload, races and popup/accessibility still pending.
No correspondence/cloud work or commit/push. P6-06 open; ownership released pending
owner retry. Keep new API available for that requested test; later cleanup only PID10316
or its verified owned PTY82994. Preserve sandbox protection and other firewall rules.

### SDK58 multipart compatibility fix after phone health success (October 30, 2026)

Owner `codex-expo-upload-fix-20261030`; branch feat/backend-foundation/current checkout,
HEAD ccd7619fe97c98b4825f1ba3e16938a04bf1b00a; uncommitted. Claimed scoped demonstrated-bug
fix after inspecting status, current upload client/tests and latest architecture/evidence.
Preserved backend/ML, camera, connection diagnostic, red popup and EAS configuration.

Owner now reports Safari health works after the approved outside-sandbox server restart,
and Check service connection succeeds inside Expo Go. Owner reports explicit image upload
still says Could not reach the service. Observed owned API PTY82994 logs show GET /health
200 from10.0.0.3 (phone), alongside host requests; no POST in inspected output. Thus phone
health connectivity is evidenced by owner report plus real HTTP logs. Upload503/UUID is
not yet evidenced. No new firewall/network/transport/CORS changes or tunnel.

Root cause demonstrated in installed SDK sources:

- Expo58.0.21 src/winter/runtime.native.ts installs Expo fetch as global fetch by default.
- Its src/winter/fetch/convertFormData.ts rejects old RN {uri,name,type} values with
  Unsupported FormDataPart implementation; Expo's own native test asserts that rejection.
- Original HORTI upload appended exactly that descriptor and swallowed the preflight
  serialization exception into generic network feedback. Mocked fetch tests did not run
  native serialization, so they passed despite this incompatibility.
- Official SDK58 FileSystem documentation demonstrates FormData plus File and expo/fetch:
  https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/ (Uploading files using expo/fetch).
  Used installed Expo native-data-fetching skill guidance; no new HTTP client framework.

Fix: uploads.ts explicitly imports expo/fetch and File from expo-file-system, appends
exactly one image field containing new File(photo.uri), and leaves multipart boundary/
headers to Expo. The File references the existing selected cache file, not an app copy.
No create/write/copy/move/delete, conversion, EXIF/base64, URI logging or photo persistence.
File supplies its SDK filename/type; no response or UI reflects file names/paths. Decoded
backend validation is still authoritative. Timeout/abort/stale-response/error semantics
remain intact, including honest unavailable503 and no fabricated success results.

Declared expo-file-system ~58.0.13 directly with Expo/npm because app code now imports
its public API. It was already transitively installed at58.0.13 under Expo; no native
package version or SDK upgrade. From mobile/ ran approved `npx.cmd expo install expo-file-system`:
exit0, one package added/one removed due to deduplication/hoisting,1245 audited. Updated
package.json/lock intentionally; npm ls confirms direct58.0.13 and Expo deduped to it.
No forced fixes, SDK downgrade or install-script approvals. npm again noted existing
unapproved @parcel/watcher/unrs-resolver scripts.

Added shared native-file/fetch boundary mocks (manual File mock and jest.setup.ts), reused
existing Jest stack. Existing multipart assertions now expect a File. New regression uses
actual installed RN FormData plus Expo's actual patch/serializer: legacy descriptor
rejects; real upload path serializes one image part with synthetic bytes and no local URI
in the wire body; mock file create/copy/move/delete never called. File byte read only is
mocked. Initial harness attempts using the test environment's default FormData failed to
model native initialization; corrected to actual RN class/bootstrap before claiming
regression evidence. This does not test real native file readability or device networking.

Validation from root:

- Existing suite after code fix:77 passed. Final `npm.cmd --prefix mobile run check`:
  exit0; **78 tests in4 suites**, no snapshots, including all prior77 plus SDK serializer
  regression. ESLint zero warnings, strict TypeScript passed, SDK alignment up to date.
- Both exports passed: Android651 modules, iOS653 modules,1.7MB Hermes bundles in ignored
  dist/. Existing NO_COLOR/FORCE_COLOR warnings only. Exports are not phone upload tests.
- With UV_CACHE_DIR=.cache/uv, `uv run --project backend --locked --offline pytest backend/tests -q --tb=short`:
  exit0,83 passed,1.73s, one existing Starlette/httpx deprecation warning; backend unchanged.
- Same cache, locked offline scripts/check_foundation.py: passed; git diff --check passed
  with existing line-ending warnings. Explicit mobile whitespace scan also recorded below
  because untracked mobile files are not covered by Git diff checking.
- `npm.cmd --prefix mobile audit --json`: exit1,28 findings unchanged (3high/25low,
  zero moderate/critical). No audit-clean claim or forced remediations.

Updated mobile/README.md and architecture with SDK File rationale, current observed health
status and retry steps. Owner should stop/restart only their Metro terminal, retaining
EXPO_PUBLIC_API_URL=http://10.0.0.157:8000, run preview:iphone -- --clear, reload Expo Go,
reselect a small synthetic JPEG/PNG and explicitly Upload. Expect safe503/model unavailable
plus UUID; request that UUID for comparison with owned API PTY82994. API PID10316 remains
running for that test. No other process stopped; no native/cloud build or deployment.

Corrected real iPhone upload, UUID comparison and observable race cases remain pending
report. VoiceOver/enlarged text and broader device acceptance are not inferred from tests.
P6-06 remains open; ownership released pending owner retry. No subsequent feature,
commit or push. Preserve sandbox inbound block and owner rule; cleanup only after testing.

### Real iPhone503 evidence and interface states (October 30, 2026)

Owner `codex-mobile-states-20261030`; branch feat/backend-foundation, current checkout,
base/current HEAD ccd7619fe97c98b4825f1ba3e16938a04bf1b00a; uncommitted. Inspected status,
branch/HEAD, current code/tests, shared instructions, SPEC/TASKS, architecture and recent
evidence. Claimed user's requested P6-06 interface-state work; no other task started.
All pre-existing backend/ML/mobile/camera/EAS and sandbox/firewall work preserved.

Owner supplied displayed request ID43089f0b-3aad-4bab-9962-0fe15b446186. Direct observation
of owned API PTY82994 shows:

request_failed request_id=43089f0b-3aad-4bab-9962-0fe15b446186 status=503
10.0.0.3 POST /api/v1/predictions HTTP/1.1 503 Service Unavailable

This correlates the owner's iPhone upload with the actual unavailable-model service,
not a mocked test. Device details remain previously reported iPhone13 Pro Max/iOS26.5/
ExpoGo58.0.5, not independently queried. The image's precise fixture/type/size was not
reported, so no on-device format/size boundary claim. No image/URI/EXIF inspected or
logged. Only safe application ID/status and Uvicorn method/path/status observed. Basic
health and this upload/UUID match are now verified; previous pending statements describe
historical handoffs and do not mean full P6-06/device acceptance is complete.

Implemented useful interface states within P6-06:

- upload-status.tsx: labeled busy ActivityIndicator, explanatory loading text, distinct
  headings/cards for model unavailable, rejected image, network failure, timeout,
  cancellation, unexpected response and other service failure. Invalid-image recovery
  suggests JPEG/PNG <=5MiB and reminds that the server validates contents. Request ID
  remains selectable. Text/roles supplement color; text heights remain flexible.
- uploads.ts: fixed internal feedback kind assigned from validated status/code or local
  outcome; never uses raw server text/details to drive or populate UI. Existing safe
  messages, UUID validation, explicit submission, abort/retry/timeout and File upload
  path preserved. No extra requests/photo state. UploadPanel uses the status component;
  original red picker/preview-error popup left unchanged.
- uncertain-prediction.tsx: future uncertainty component with limitations, no diagnosis
  claim/percentage/label, and Choose another photo callback. **Test fixtures only**;
  not imported/mounted by the live screen and not emitted by503 or malformed success.
  Future real-inference integration must validate SPEC uncertainty semantics/policy.
  No prediction parser, inference, success-result screen or API contract change added.

Tests: new interface-states.test.tsx covers accessible progress, feedback replacement,
seven distinct kinds, empty idle state and synthetic uncertainty/reselect behavior.
Screen tests add four backend image-rejection status cases preserving preview/actions,
and assert503/unexpected success never renders uncertainty. Prior selection/popup,
camera, native health, SDK serializer, stale-response and same-URI tests retained.
Existing exact feedback assertions updated for typed kind. Native/network boundaries
mocked; uncertain fixtures are not model-quality or device evidence.

Validation commands/results from repository root:

- Initial new-state run:91 passed/1 failed; test found progress View needed accessible=true.
  Fixed it. Next aggregate exposed a matcher absent from installed test-library version;
  changed to assert queried accessible progress state using supported Jest equality.
- Final `npm.cmd --prefix mobile run check`: exit0, **92 tests passed in5 suites**,
  no snapshots (14 added to prior78). ESLint --max-warnings0 passed; strict TypeScript
  passed; expo install --check reported dependencies up to date. No dependency changes.
- Aggregate Android export:652 modules,1.7MB Hermes; iOS:654 modules,1.7MB. Both exit0,
  metadata under ignored dist/. Existing NO_COLOR/FORCE_COLOR warnings only. Used normal
  approved Expo-cache access. Exports cover live UI packaging, not a native/device test;
  unmounted uncertainty component is covered by tests/types, not claimed device behavior.
- With UV_CACHE_DIR=.cache/uv,
  `uv run --project backend --locked --offline pytest backend/tests -q --tb=short`:
  exit0,83 passed,1.59s, one existing Starlette/httpx deprecation warning. Backend unchanged.
- Same cache, `uv run --project backend --locked --offline python scripts/check_foundation.py`:
  passed. git diff --check and explicit changed-mobile whitespace scan run at handoff;
  Git alone excludes untracked mobile files.
- No dependency/manifest/lock/EAS/native configuration changes this scope. No fresh audit:
  last explicit report remains28 package findings (3high/25low); no forced fix or downgrade.

Updated architecture/mobile setup for verified phone upload and precise implemented versus
fixture-only states. Owner can reload the existing Expo Go session (same API URL); upload
again to see amber unavailable card, inspect red invalid-input popup and clear selection
to remove stale feedback. The immediate503 may make cancellation/loading races impossible
to observe manually; keep such cases unobserved with automated evidence separate. New
status layout, VoiceOver/enlarged text/rotation, and uncertainty device preview remain
unverified. No artificial delay, fabricated API prediction or security changes added.

Owned API PID10316/PTY82994 remains available for testing. Do not stop user Metro or alter
sandbox inbound block; owner-created test rule cleanup remains after testing. P6-06 stays
unchecked. Ownership released at handoff; no commit/push, deployment or next task started.

### Branch checkpoint review (October 30, 2026)

Owner `codex-checkpoint-20261030`; existing branch feat/backend-foundation, starting HEAD
ccd7619fe97c98b4825f1ba3e16938a04bf1b00a. User explicitly authorizes focused checkpoint
commits and push to origin/feat/backend-foundation; no merge/main change. Read AGENTS.md
and CONTRIBUTING.md, inspected status/branch/HEAD/remote, all modified/untracked candidate
paths and relevant source/tests/docs/lock metadata. Preserved all existing authors' work.
Personal .vscode/settings.json remains excluded and untouched; no .env/secrets/images,
dataset/weight binaries, caches, node_modules, Expo/native generated files or exports
will be staged. Existing ignored artifacts remain local, not deleted. Text-only synthetic
fixtures and research source URLs are code/docs, not downloaded images/weights.

Current limitations requested for this checkpoint: **iPhone API connectivity remains
unresolved** as repeatable acceptance. Retain historical owner-reported plus observed
43089f0b-3aad-4bab-9962-0fe15b446186 POST/503 match as an isolated successful test; do not
erase it or infer clean-session/repeated/device-race acceptance. Device camera acceptance,
VoiceOver/enlarged-text/layout and Android/native acceptance remain pending. ML artifact
rights/data-quality blockers remain open. P2-01/P6-06/P6-07 and other incomplete task
checkboxes are unchanged. Uncertainty UI remains fixture-only, not a production response.

Fresh checks, from repository root:

- UV_CACHE_DIR=.cache/uv; `uv run --project backend --locked --offline ruff check --config backend/pyproject.toml backend scripts`:
  passed. `uv run --project backend --locked --offline ruff format --check --config backend/pyproject.toml backend scripts`:
  passed,22 files formatted. `uv run --project backend --locked --offline pytest backend/tests`:
 83 passed,1.98s; existing Starlette TestClient/httpx deprecation warning.
- `uv run --project backend --locked --offline python scripts/check_foundation.py`: passed.
- `npm.cmd --prefix mobile run check`: passed,92 tests in5 suites (9.18s), lint zero
  warnings, strict types, SDK alignment current, Android652/iOS654 modules exported,
 1.7MB Hermes bundles under ignored dist/. Existing NO_COLOR/FORCE_COLOR warnings only.
  These exports/tests are not device/native acceptance. Used normal approved Expo cache.
- `npm.cmd --prefix frontend run lint`: passed; `npm.cmd --prefix frontend run typecheck`:
  passed (next typegen and tsc). `npm.cmd --prefix frontend run build`: **FAILED, exit1**.
  Compilation, type/static generation completed, then Next.js16.4.0 emitted SecurityFatalError
  saying this version is affected by a known vulnerability and recommending an upgrade.
  Did not retry merely to dismiss the warning, suppress its security check or upgrade
  dependencies in this checkpoint task. Also warned about ignored outside-repo pnpm lock;
  no outside file/config was changed. Reported this failure to owner before any commit.
- `npm.cmd --prefix frontend audit --json`: exit1,5 findings (1critical/4high).
  `npm.cmd --prefix mobile audit --json`: exit1,28 findings (3high/25low). Audits remain
  open; no forced fixes, dependency overrides or SDK downgrades. No new runtime dependency
  or lock change during checkpoint review. No claim that backend or release audits clear.
- git ls-remote initially failed under sandbox Windows schannel SEC_E_NO_CREDENTIALS;
  approved normal credential/network retry succeeded, confirming remote branch HEAD
  ccd7619fe97c98b4825f1ba3e16938a04bf1b00a matches starting local HEAD. No credential read,
  display or config workaround. Push will use normal approval/credentials if required.
- Candidate scan:41 modified/untracked text files excluding .vscode; no binary NUL or
  common private-key/GitHub/AWS/OpenAI credential-shaped tokens found. Both npm locks use
  registry.npmjs.org resolved hosts only. This scan supplements review, not a guarantee
  or a full security audit. EAS project identifier is public project metadata, not signing
  credentials. Synthetic secret strings in redaction tests are deliberate test inputs.

Existing GitHub workflow runs backend/frontend checks only; no new remote CI/mobile-job
pass is claimed. No workflow modification or new feature included. Stage explicit paths,
review staged diff/check/allowlist before committing, then push only the existing feature
branch. Intended split: backend validation/errors/tests; ML research; mobile scaffold/
photo/camera/unavailable-service/error states/tests; shared design/status/validation docs.
All incomplete task acceptance stays open despite successful checkpoint storage.

No currently running API/Metro/firewall process/config is part of Git. This task does not
stop a user's runtime session or remove owner test rules. Ownership will be released for
handoff; exact commit IDs and push result reported in the session. Foundation and staged
whitespace/forbidden-path checks are repeated after final documentation edits.
