# Task A — airflow sensitivity cases: evidence review (November 18, 2026)

Status: **decision pending (owner).** The v6.6.16 candidate on branch `airflow-scenarios` implements the
method as specified in the handoff. Its decision changes are large, so it is reported before any PR.
Steady nights and labeled synthetic fixtures below are reconstructed inputs, not field data.

## 1. What drives the 3.9–8.5°F bedroom-minus-front spread (v6.6.15)

`tools/analysis/offset-decomposition.cjs`, FURNACE 63 on a steady 30°F night, nominal body, one field at a time
from the working estimate (Δ offset, °F, restricted / greater):

| Field | 30°F furnace | 45°F AUTO HP 67/71 | Airflow? |
| --- | --- | --- | --- |
| `cabFactor` (cab conductance ×1.5 / ×0.5) | +1.15 / −1.20 | +0.49 / −0.49 | No |
| `mix` (0.7 / 1.3) | +0.88 / −0.64 | +0.43 / −0.30 | Yes |
| `tempOffset` (+2 / −2°F) | −0.23 / +0.27 | −0.11 / +0.11 | No (offsets the others) |
| `flow`, `windSign`, `surfaceFactor`, `rhOffset` | 0.00 (closed coach) | 0.00 | — |
| Body case | −0.4 / +0.1 | −0.5 / +0.1 | No |

The hypothesis holds in part: `cabFactor` is the largest single driver; forced mixing is second.
The calibrated splits and buoyant width were not varied at all.

The within-case furnace swing (4.2–5.7°F) already exceeds the 4°F sleep band. At 30°F the **working
estimate alone** fails at every FURNACE setpoint (e.g. HEAT TO 63: bedroom 65.7–70.4°F). No airflow-case
change can make that night qualify.

## 2. What the garage runs support (`calibration-profile.cjs`, `airflow-envelope.cjs`)

Profile likelihood, every other parameter re-fitted. "Supported" = every front/rear/gap RMSE of both runs
within the v6.6.15 residual combined in quadrature with the 0.3°F digitizing tolerance
(HP 0.384/0.396/0.453, furnace 0.476/0.461/0.484°F).

| Parameter | Fitted | Supported range | Note |
| --- | --- | --- | --- |
| Ducted rear share `f` | 0.38 | ≈ 0.34–0.41 | Well identified |
| Furnace rear share `ff` | 0.57 | ≈ 0.51–0.69 | Trades with mixing |
| Buoyant width `w` | 0.58 ft | < 0.1 to ≈ 2 ft | Not identified alone |
| Forced-mix scale `mx` | 1 (held) | 0 to ≈ 3.4 | Not identified alone; free optimum 0.0–0.8 |
| Cab factor (non-airflow) | 3 (held) | 0.75–4.5 all supported | Data mildly prefer **lower** cab conductance |

The runs pin total exchange at 2–4°F gaps, unoccupied. They do not separate ΔT-independent (forced) from
ΔT-dependent (buoyant) exchange, and furnace rear share trades against mixing. The occupied 30°F night runs
at 4–9°F gaps with sleeping heat in the rear, so those trade-offs extrapolate apart.

## 3. Data-supported extremes (`airflow-extremes.cjs`, engineering floors w ≥ 0.25 ft, mx ≥ 0.5)

Bedroom offset after the first hour, nominal body, airflow fields only (non-airflow at working estimate):

| Tolerance | Restricted set (mix / duct / furnace / width) | Greater set | 30°F furnace | 45°F AUTO HP |
| --- | --- | --- | --- | --- |
| v6.6.15 cases (mix 0.7 / 1.3 only) | — | — | 5.3–6.8 | 1.4–2.2 |
| **0.3°F (as specified; candidate)** | 0.5 / 0.40 / 0.52 / 0.28 ft | 2.8 / 0.35 / 0.65 / 0.30 ft | **4.4–8.3** | **0.7–3.2** |
| 0.15°F (sensitivity) | 0.87 / 0.39 / 0.55 / 0.39 ft | 1.38 / 0.37 / 0.58 / 0.60 ft | 5.2–6.8 | 1.3–2.1 |

Both candidate sets reproduce both garage runs within the stated tolerance (pinned in
`tests/airflow-scenarios.test.cjs`). The width and mix floors exclude degenerate no-buoyancy or
no-blower-exchange corners; without them the restricted extreme reaches 8.4°F (30°F) and 4.7°F (45°F).

## 4. Consequences of the 0.3°F candidate (v6.6.16 working tree)

| Check | v6.6.15 | Candidate |
| --- | --- | --- |
| Nine-case offset, 30°F FURNACE 63 | 4.0–7.8°F | 3.5–9.8°F |
| Steady 30°F plan | none | none (nominal itself fails) |
| Steady 45°F plan | AUTO HEAT PUMP 67/71 | **none** (bedroom to 71.6°F in a restricted case) |
| Runnable fixtures qualified | 5 of 10 | **1 of 10** (lost: March historical, 2025-10-01, 2026-05-08, preparation synthetic) |
| `cycles.cjs` (nominal) | — | identical |
| Garage reproduction tests | pass | pass |
| Full suite | 245/245 | 3 failures: tests whose cases no longer qualify |

With the 0.15°F tolerance the 45°F plan is kept (AUTO HEAT PUMP 67/71) and 30°F still fails.
With the 0.3°F airflow sets and `cabFactor`/`tempOffset` neutralized, 45°F still fails.

## 5. Owner decisions needed

1. Tolerance for "data-supported": 0.3°F in quadrature (as specified), or tighter. The fitted residual
   (0.24–0.38°F) already contains the digitizing error, so adding 0.3°F again may double-count it.
2. Separately: whether to keep `cabFactor` and `tempOffset` bundled in these cases (not airflow; the garage
   data do not narrow the cab range).
3. The 30°F result is a control/comfort-criterion question (front-sensed 3°F furnace cycle vs a 4°F band
   with 57% rear delivery), not a scenario question.
