# Analysis tools

Developer scripts used for the v6.6.15 WP11 calibration and its consequence checks. They load
`index.html` through `tests/helpers.cjs`. None of them change the app. Pass the repository
path as the first argument (Node 24).

| Script | Purpose | Inputs |
| --- | --- | --- |
| `joint-fit.cjs` | (v6.6.20: `u` scales `conductionUA`) Nelder–Mead joint fit of storage, splits, buoyant width and furnace terms to both owner garage runs; `errors(params)` returns RMSE | Field fixtures `garage-heat-pump-2026-11-16.json`, `garage-furnace-2026-11-17.json` (digitized YoLink) |
| `scenario-sweep.cjs` | Every `AIR_SCENARIOS` case at FURNACE 62–66 on a steady night; bedroom/front ranges and offset | Synthetic weather |
| `steady-plan.cjs` | Full planner on a steady night at a given outdoor temperature | Synthetic weather |
| `cycles.cjs` | Thermostat cycle lengths and zone ranges at 45°F, 30°F and 85°F | Synthetic weather |
| `furnace-capacity.cjs` | FURNACE 72 duty and final temperatures at 10 to −20°F | Synthetic weather |
| `fixtures-beforeafter.cjs` | Live planner on every runnable fixture (qualification, winner, bedroom range, max room RH and longest >65% run since v6.6.19); `DEHUM=off` runs with the dehumidifier disabled; `ENSEMBLE=on` (v6.6.21) enables the WP13 ensemble and adds the winner's pass count, admission and severity | Archived and labeled synthetic fixtures |
| `coil-winners.cjs` | (v6.7.1) Coil-ice advisory (`wp7CoilCheck`, live cycle model, 32 conditions) on each winner of a `wp13-search-gate.cjs` JSONL report: cooling, flagged and staged-flagged conditions, coldest coil region, peak ice | A gate report (`reports/v671-fixtures.jsonl`) |
| `gulf-shores-matrix.cjs` | WP7 Gulf Shores away-plan matrix, every fan × both dehumidifier states (`HEADING` env, default S; dehumidifier on only since v6.6.20 per owner decision, `DEHUM=both` adds off); since v6.6.19 also max room RH, >65% run and the air/buffer/coil water split | `tests/fixtures/kjka-asos-2025-03-03-05.csv` (owner-supplied, reconstructed) |
| `wp13-prior-checks.cjs` | (v6.6.21) Garage-run RMSE along the WP13 airflow and storage families, on the unit disk and square corners, and a conditional storage grid; members draw these without refitting anything else | Owner garage runs (as `joint-fit.cjs`) |
| `wp13-search-gate.cjs` | (v6.6.21) WP13 Search release gate and before/after: one fixture per process in `MODE` nine, exhaustive, auto (reference) or bounded; prints the decision, D3 summary, simulated hours, rendered-plan hash before and after the Worker trimming, posted result size and (with `GCSAMPLE`) peak live heap | Archived and labeled synthetic fixtures |

v6.6.15 adopted parameters (`joint-fit.cjs` names): `ca` 297, `cm` 574, `tau` 0.98, `f` 0.38,
`w` 0.58, `ff` 0.57, `sf` 0.77 (× 15,000 = 11,550 BTU/h), `fm` 0.49, with `shp` = 1 and
`u` = 1 held fixed. RMSE front/rear/gap: heat pump 0.24/0.26/0.34°F, furnace 0.37/0.35/0.38°F.
