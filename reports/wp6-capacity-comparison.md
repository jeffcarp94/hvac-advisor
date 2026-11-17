# WP6 capacity comparison — v6.6.13

November 17, 2026. Comparison only. Jeff selected B59186 as the working family in this chat. Installed identification and delivered airflow remain unverified. Live heating/cooling capacities and dispatch are unchanged. D2 remains the owner's release decision.

## Results

The nine original jobs completed independent normal planner searches with both capacity models. Two qualify with each nominal model. No nominally qualified complete plan was lost. Changes to failed candidates are diagnostic findings, not operating recommendations. Two additional cases cover a currently-away return and the no-Wi-Fi input gate.

| Fixture | Complete plan, current / experimental | Initial mode, current → experimental | Recorded bedroom minimum, current / experimental |
| --- | --- | --- | --- |
| March historical weather | Fail / Fail | HEAT PUMP → AUTO HEAT PUMP | 65.647 / 65.095°F |
| October 2025 reconstruction | Fail / Fail | AUTO HEAT PUMP → COOL | 65.100 / 64.998°F |
| May reconstruction | Fail / Fail | MAXXFAN → OFF | 64.991 / 65.515°F |
| Saved October forecast | Fail / Fail | MAXXFAN → AUTO HEAT PUMP | 64.998 / 64.993°F |
| Synthetic surface advisory | Pass / Pass | AUTO HEAT PUMP → AUTO HEAT PUMP | 65.413 / 65.413°F |
| Synthetic bedtime preparation | Pass / Pass | COOL → COOL | 65.454 / 65.454°F |
| Synthetic hot afternoon | Fail / Fail | COOL → COOL | 67.438 / 67.438°F |
| Synthetic falling temperatures | Fail / Fail | HEAT PUMP → AUTO HEAT PUMP | 65.316 / 65.893°F |
| Synthetic rising temperatures | Fail / Fail | HEAT PUMP → HEAT PUMP | 65.957 / 65.957°F |

Recorded qualification traces can stop at failure. Their minima and runtimes do not establish full-night coverage. Full-window diagnostic runs are kept separately in the [machine-readable report](wp6-capacity-comparison.json). Each of the ten simulated cases has 13 selected-plan sensitivity checks, for 130 diagnostic runs. The no-Wi-Fi case is rejected at input validation.

## Qualified bedtime-preparation change

This synthetic case starts at 9 PM Central on May 8, 2026, with both zones at 72°F and 45% RH. Outdoor air changes from 66°F to 60°F at 10 PM. No field observations validate this case.

| Time, Central | Existing capacities | Experimental capacities |
| --- | --- | --- |
| 9:00 PM | COOL 69°F, Low fan | COOL 67°F, Low fan |
| 9:55 PM | COOL 67°F, Low fan | Continue the 9 PM setting |
| 10:00 PM | HEAT PUMP 67°F, Low fan | AUTO HEAT PUMP, HEAT TO 67°F / COOL TO 71°F, High fan |

Both complete plans pass all nine body/weather scenarios, with a 65.454°F minimum and zero nominal furnace runtime. The experimental sequence passes the −15% and +25% heating scales and all eight tested changeover states. It fails both bundled airflow/coil cases because bedroom temperature stays above 69°F for more than 30 minutes. These bundles also change leaving RH and fan fractions; the high-flow bundle includes the provisional roof-heating increment. They do not isolate airflow alone. Cooling-curve input clamping occurs in the experimental nominal case.

These sensitivities re-evaluate the selected sequence. They do not rerun the optimizer at every extreme. A sensitivity failure does not prove every other executable sequence fails.

### Separately verified alternatives

Retaining the experimental cooling preparation and its 10 PM transition, AUTO HEAT PUMP at HEAT TO 67°F / COOL TO 71°F passes with Low, Medium and High fan. FURNACE 67°F fails sustained overnight warmth. AUTO FURNACE at 67°F / 71°F fails with each fixed fan. Exact setup records and failure reasons are in `sameTransitionAlternatives` in the JSON report. This is a bounded same-transition check, not an exhaustive search of different preparation times or setpoints.

The surface-advisory full search retains qualified FURNACE and AUTO FURNACE alternatives. Its selected AUTO HEAT PUMP plan and qualification remain unchanged across all 13 sensitivity checks.

## Full-window diagnostic findings

Failed sequences are continued for diagnosis, and remain unsuitable. Full-window experimental minima reach 64.373°F in the October 2025 case and 62.442°F in the saved October case. Their qualification traces already reject them. Neither is a released prescription.

In the falling-temperature case, nominal full-window furnace use changes from 81.070 to 90.794 equivalent full-output minutes. Across the experimental sensitivity cases it ranges from 65.065 to 119.763 minutes. In the rising-temperature case, nominal use changes from 48.828 to 57.630 minutes, with an experimental range of 34.320–93.564 minutes. These compare selected sequences and dispatch together; they do not isolate the heating anchor. Runtime is not measured propane volume.

Two legacy current-model records omitted their selected ventilation arrangement, so a full-window current replay is unavailable for the May and saved October cases. Their original full-search qualification results are retained. Replays of retained closed-coach phases reproduce qualification, recorded minimum and furnace runtime before accepting sensitivities. New runner output retains complete setup objects, including ventilation geometry.

Maximum per-step heat-equation residual over the 130 experimental diagnostic runs is 9.29 × 10⁻¹² BTU. Maximum integrated water residual is 3.33 × 10⁻¹³ lb. These check numerical closure of the implemented equations, not the accuracy of equipment or envelope assumptions.

For each zone, stored sensible heat is C × (T_new − T_old), with C in BTU/°F. Residual subtracts the step-integrated modeled exterior, source and interzone heat terms, using the implicit endpoint temperatures. Time is in hours, source heat in BTU/h, conductance in BTU/(h·°F), airflow in CFM, and volumetric heat factors include density. Water residual is initial water + occupants + outside exchange − AC removal − dehumidifier removal − condensation − final water, all in lb.

Recovery fields report first recorded band entry. A 0.5-minute entry for an initially comfortable case is the first simulation sample, not a required active recovery. Legacy null fields can mean unreported recovery and must not be treated as measured failures.

## Return and Wi-Fi

The added synthetic currently-away case starts at midnight Central on November 12, 2026, returns at 2 AM, and ends at 7 AM. Outdoor air is 45°F. Initial indoor readings are 68°F/30% RH in both zones. The confirmed existing setup is HEAT PUMP 67°F / Low fan.

With Wi-Fi, neither model verifies a complete overnight plan. The retained setup remains HEAT PUMP 67°F / Low fan; nominal first band entry changes from 16.5 to 18.5 minutes. A selected partial stage does not certify the later night. Without Wi-Fi, the existing currently-away input gate rejects planning before either capacity path runs.

## Provenance and release verification

- Historical weather fixtures retain their saved weather. Where no initial indoor state exists, the runner reconstructs 72°F in both zones and 54%/52% RH. The saved October forecast retains its request inputs. Synthetic cases are labeled. All use Winterset geometry and Central time; the later heading model is not implemented in this hot case.
- The 2,822 W heating anchor at 7°C and 280 CFM high airflow remain related-model proxies. See [model assumptions](../model-assumptions.md#v6613--wp6-capacity-comparison) for source links, normalization, uncertainty and invalid coil combinations. The 200 CFM / 90–95% rated leaving-RH combinations remain invalid. The feasible low-flow bundle uses 98% RH. No capacity is fitted to make a fixture pass.
- 178 unique checks pass across completed test files after repairing three stale expectations reproduced on the merged v6.6.12 baseline. These preserve current-guidance safety and the 7 AM comfort boundary. Native Node 24 VM globals reduce test overhead. The falling-temperature full output was byte-identical with the original and faster harnesses.
- The remaining four connected/departure-planning test files did not complete before the environment disconnected. The full-suite result is unresolved. A duplicate preparation search was killed by the environment; the original full comparison and subsequent selected-plan checks completed.
- Service-worker, browser-test and runner syntax checks passed during verification. Local Chromium could not create its required socket. A headless-shell download was invalid. The cloud browser could not access the local preview and displayed a bearer-token error. GitHub checks remained queued. Phone layout, offline behavior and cache-upgrade verification are pending.
- PR #28 remains draft. D2 and completed release verification are required before adopting experimental capacities in live recommendations. No production switch or coil eligibility change is included.

## Reproduce

Use Node 24. `node tools/compare-capacity.cjs --full --case=preparation-synthetic` runs independent full searches. The default command compares fixed defaults. `--verify-report=/absolute/path/to/report.jsonl` re-evaluates retained sequences across all sensitivities and audits full-window heat and water balances. Replay input is newline-delimited runner output, not the aggregated JSON wrapper. Legacy reports missing ventilation geometry need a new full search for exact replay.
