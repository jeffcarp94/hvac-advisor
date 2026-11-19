# WP13 priors: proposal for owner review (November 18, 2026)

Status: **priors approved by the owner, November 18, 2026 (§4); the ensemble policy is still built behind
`ENSEMBLE.enabled` (off) pending the shortlist stage and enabling.** Owner decisions 4 and 5
(November 18, 2026) direct the storage and furnace rear-share ranges. Everything else follows scope v3 §4 and
WP13 item 2, adjusted only where WP11 shipped first. Items marked **Proposed** need Jeff's confirmation.
The garage runs are owner field data (digitized YoLink, ±0.3°F, ±1 min). Steady nights and fixtures in the
companion report are reconstructed or synthetic inputs.

## 1. Storage (owner decision 4: garage-derived, Task A method)

**Method.** Two complementary checks against both garage runs (11/16 heat pump, 11/17 furnace). "Supported" =
every front / rear / gap RMSE within the v6.6.15 residual combined in quadrature with the 0.3°F tolerance
(heat pump 0.384 / 0.396 / 0.453°F, furnace 0.476 / 0.461 / 0.484°F), the Task A criterion.

**a) Profile likelihood** (`calibration-profile.cjs`, each value held, all other fitted parameters re-fitted,
including the furnace output scale and furnace-to-mass share):

| Parameter | Fitted | Supported (re-fitted) | First unsupported values |
| --- | --- | --- | --- |
| Air node `ca` (BTU/°F) | 297 | 270–325 | 255 (HP front 0.467), 340 (HP rear 0.489) |
| Mass node `cm` (BTU/°F) | 574 | ≈ 480–760 | 470 (furnace 0.48), 800 (HP rear 0.425) |
| Coupling `tau` (h) | 0.98 | 0.75–1.25 | 0.58 (0.494), 1.6 (0.403) |

The re-fits move the furnace output scale (0.72–0.91 × 15,000 BTU/h at the supported points; adopted 0.77). A member does not
re-fit anything, and delivered furnace capacity is a calibrated value whose replacement is gated.

**b) Conditional check (Task A method: non-storage values stay at v6.6.15).** A 13 × 23 × 17 grid
(`wp13-prior-checks.cjs grid`): 488 of 5,083 points supported, spanning `ca` 275–320, `cm` 530–640,
`tau` 0.80–1.20, strongly correlated (more mass needs a longer coupling). Total storage `ca + cm` spans 835–935
BTU/°F (fitted 871).

**Proposal.** One storage family position s ∈ [−1, 1], linear between three data-supported sets:

| Set | `ca` | `cm` | `tau` | Worst ratio to threshold |
| --- | --- | --- | --- | --- |
| low (s = −1) | 295 | 540 | 0.85 h | 0.996 |
| fitted (s = 0) | 297 | 574 | 0.98 h | 0.778 |
| high (s = +1) | 305 | 630 | 1.20 h | 0.999 |

Every quarter-step point passes (worst 0.999 at the ends; `wp13-prior-checks.cjs storage`). This is far
narrower than the scope's pre-calibration priors (C_a 40–100, C_m 150–800) and the single-node 180–400 interim
range, because the garage runs pin total storage closely. It does not cover occupied behavior or deep cold
(no such data; owner decision 1).

## 2. Airflow and furnace rear share (owner decision 5; v6.6.16 Task A sets)

One airflow family position s ∈ [−1, 1]: restricted (mix 0.5, rooftop rear 0.40, furnace rear 0.52, width
0.28 ft) ↔ working (calibrated 1 / 0.38 / 0.57 / 0.58 ft) ↔ greater (2.8 / 0.35 / 0.65 / 0.30 ft); mix in log
space, the rest linear. Furnace rear share therefore spans 0.52–0.65 with 0.57 nominal, as decided. Every
quarter-step point reproduces both runs (worst ratio 1.000 at the restricted end;
`wp13-prior-checks.cjs airflow`).

**Joint draw.** Airflow and storage extremes together do not fit: the four square corners give ratios 1.005–1.291
(high storage with greater airflow is worst). The 16 points on the unit circle all pass except one, 3% over
(airflow −0.383, storage −0.924: ratio 1.029); half-way corners pass (0.84–0.91). **Proposal:** draw the pair
uniformly on the unit disk with the area-preserving Shirley–Chiu concentric map of two Latin-hypercube
dimensions. The 3% boundary excess is disclosed, not tuned away.

## 3. Full prior register as implemented (`ENSEMBLE_PRIORS`, uniform unless noted)

| Group | Prior | Range | Basis | Status |
| --- | --- | --- | --- | --- |
| Weather | Outdoor temperature error, AR(1) in time (6 h correlation), normal | σ 2°F to 12 h lead, linear to 3°F at 36 h, 3.5°F beyond | Scope WP13 item 2 | As specified. Lead is measured from plan start (the NWS issue time is earlier): **labeled approximation** |
| | Dew-point error (RH derived) | Same σ schedule and correlation, independent of the temperature error | Scope gives no σ | **Proposed** (Eng) |
| | Sky cover | ±20 points, constant per member, clamped 0–100 | Scope | As specified |
| | Wind | × 0.7–1.3, constant per member | Scope | As specified |
| Airflow + storage | Unit-disk family draw (§1–2) | — | Garage runs | **Proposed** (decisions 4, 5) |
| Internal gains | MultiPlus no-load | 8–30 W | Scope §4 (Victron) | As specified |
| | Cerbo GX + display | 4–7 W | Scope §4 | As specified |
| | Phone charging | 20–60 W | Scope §4 | As specified |
| Solar | Tree cover: blocked fraction × 0.5–1.5, transmission kept in [0, 1] | — | Scope §4 | As specified (one factor for all facades per member) |
| | Ground albedo | 0.1–0.3 | Scope §4 | As specified |
| | Opaque absorptance | 0.3–0.7 | Scope §4 | As specified |
| Moisture | Buffer capacity | 15–50 g/%RH | Scope §4 (WP9) | As specified |
| | Buffer time constant | 2–6 h | Scope §4 | As specified |
| | Dehumidifier returned moisture | 0–40% | Scope §4 | As specified |
| Infiltration | Reference ACH (scales A_L) | 0.15–0.50 | Scope §4 (WP10) | As specified |
| Coil advisory | ΔT_cold | 2–6°F | Scope §4 (D1, advisory only) | As specified |
| Carried over from the nine cases | Body assembly: one of three cases | 11 / 10 / 10 of 31 members | v6.6.16 cases | **Proposed** |
| | Cab conductance factor | 1.5–4.5 (× 0.5–1.5) | v6.6.16 cases; garage supports 0.75–4.5 | **Proposed** |
| | Window and MaxxFan flow factor | 0.7–1.2 | v6.6.16 cases | **Proposed** |
| | Wind-pressure sign | −1 to +1 | v6.6.16 cases | **Proposed** |
| | Starting room RH offset | 0 to +5 %RH | v6.6.16 cases (+5 in both non-working cases) | **Proposed** |
| | Surface factor (advisory only) | 0.8–0.9 | v6.6.16 cases | **Proposed** |
| Not sampled | WP6 capacities and airflow, changeover δ/h (D2-gated); furnace output and furnace-to-mass share (calibrated); heading for daylight plans (decision B); the fixed ±2°F outdoor offset (replaced by the AR(1) error) | — | Owner decisions | — |

Member 0 is the nominal working case and takes the unchanged code path (its trial equals the v6.6.16 working
case exactly). Members 1–31 are a Latin hypercube in 24 dimensions (categories take whole strata; the heading dimension is used only by analysis runs that allow an Unknown heading), seeded by an
FNV-1a hash of the decision-relevant inputs, algorithm id `lhs-mulberry32-v1`.

## 4. Owner decisions (November 18, 2026; binding)

Jeff chose the recommended option on all five questions:

1. **Storage:** the conditional garage family (295/540/0.85 ↔ 305/630/1.20), not the wider re-fitted
   profile ranges and not the scope's original priors.
2. **Airflow and storage:** drawn jointly on the unit disk, so both extremes never combine. The one 3%
   boundary excess is disclosed, not tuned.
3. **Dew-point error:** same σ schedule and correlation as the temperature error, independent of it.
4. **Carried-over fields:** keep all six (body, cab, window flow, wind sign, starting RH offset, surface
   factor) sampled over their nine-case ranges.
5. **Plans not admitted:** a plan stays acceptable until the nominal member fails, any hard constraint fails,
   or the fourth member fails (the first time it could no longer qualify).

Items marked Proposed in §3 are now adopted as listed.
