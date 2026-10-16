# Roadmap

| Milestone | Essential scope | Exit gate | Optional/deferred |
| --- | --- | --- | --- |
| Foundation (current) | Documentation, manifests, health, landing page, checks, CI definition | Local checks recorded; baseline 274d123 passed remote CI; pending changes need a new run | No classifier or persistence |
| Prediction prototype (Phases 1-3, P4-01/P4-02) | FastAPI validation/inference, reproducible model, reviewed content, intermediate Next.js flow | Prototype flow validated independently; completion does not gate mobile development | Polished/hosted web app |
| Mobile MVP (P6-06/P6-07, Phase 4 acceptance) | Anonymous Android capture/select, submission, prediction, uncertainty and reviewed information | SPEC.md MVP criteria and local Android end-to-end evidence | Accounts, history, Supabase, retained photos |
| Initial release (Phase 5) | Deploy FastAPI backend; prepare Android release on Google Play, smoke checks and operating guide | Hosted API/mobile flow and Google Play release requirements verified | Web hosting, additional services |
| Version 1.1 | Prioritize feedback, optionally accounts/history and additional crops with evaluation | Ownership/retention tests and per-crop evidence | Model monitoring dashboard |
| Future versions | Decide iOS support; consider severity estimation, monitoring and field experiments | Separate scoped requirements and acceptance | No iOS release commitment |

Mobile framework selection remains undecided. Android and Google Play are the initial
release target; mobile development does not require a completed web prototype.
P6-06 may use test fixtures for success/uncertainty screens; real prediction integration
requires P4-01/P6-07. The production API must never return fabricated predictions.

Complete an inexpensive functioning MVP before adding infrastructure or broader crop support.
Dates are intentionally unset; task dependencies and evidence determine progress. Future
improvements are candidates, not release promises. See TASKS.md for actionable work.
