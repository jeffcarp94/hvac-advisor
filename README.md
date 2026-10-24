# HVAC Advisor

Phone-focused single-file HVAC advisor for the Coach House Platinum III 250 DT. Hosted as a static PWA; `index.html`, `sw.js`, the manifest, and the icons are the deployment files.

## v6.0.1 — useful current guidance when the overnight outlook has a shortfall

- A failed overnight comfort forecast no longer suppresses a separately verified current setup. The fallback checks all three scenarios over the same next 30 minutes, or until departure/7 AM if earlier. It gives an exact review time and expires there. It does not prescribe a rejected overnight sequence or certify an upcoming absence.
- Estimated elevated cold-surface RH is an advisory, distinct from room-air humidity. It shows timing, predicted room/surface RH, and a request to check readings/windows. Equipment limits, the 65°F floor, condensation-margin rejection, and the sustained room-RH limit remain enforced.
- Fixed LOW/MED/HIGH roof fans circulate between compressor calls. AUTO fan circulation follows compressor duty; furnace circulation follows its blower call. Existing capacities, airflow coefficients, comfort targets and moisture-removal assumptions are retained.
- Failed full plans are compared by how long they remain acceptable, before comparing truncated scores. Failure explanations retain the threshold/time that actually triggered the concern across setup changes. A daytime bridge search is used when no single daytime setup covers the daytime period; it does not repeat that search solely for an overnight failure.
- The reported Winterset evening is a permanent regression fixture with source and input notes. Browser checks repeat its real form inputs, forecast parsing and Web Worker calculation, and exercise upgrades from v5.0.0 and v6.0.0.

## v6.0.0 — one connected HVAC plan

- One screen replaces Daytime / Overnight / Current. Enter measured bedroom and front/thermostat temperature and RH, then build a plan from now through the relevant overnight period ending at 7 AM. Future planning accepts explicitly projected starting conditions.
- Fixed thermostat settings stay day heat/cool 70/72°F and sleep 66/68°F. The front sensor approximates the control sensor; bedroom conditions determine sleeping comfort. No thermostat offset is invented to force bedroom readiness.
- Daytime remains the default until 10 PM. Bedtime preparation is calculated from changing weather and continuous two-zone heat/moisture trajectories, replacing the fixed 9 PM switch. Missed bedtime readiness is separate from a failed overnight comfort/protection assessment.
- Natural morning recovery within 30 minutes takes precedence over a small active-heating score advantage when the complete plan passes all requirements. The result names the expected minutes and local arrival time.
- Staying / Leaving / Currently away: both occupants' heat and moisture stop at departure and resume at return. No away setbacks or energy optimization. Unattended heat-pump screening applies during absence and sleep, not merely by the tab name.
- Departure plans may use a fixed MaxxFan/window arrangement, including rain-compatible openings. A plan cannot require a physical intervention while absent. Normal AUTO fan-speed/lid operation continues; windows remain open after the fan stops.
- Currently away is unavailable until remote thermostat capability is explicitly enabled. Existing physical conditions must then be confirmed. Only executable thermostat changes are proposed; no YoLink, Micro-Air, or equipment-control integration is included. Away mode uses the coach ZIP and blocks phone GPS.
- Sensor timestamps and departure/return times use the selected location timezone, preserving their actual instants when the location changes. Sensor readings older than 30 minutes must be refreshed. Results expire at the next scheduled action, the forecast limit, or after 30 minutes.
- Main results: what to do now, next/later actions, bedtime readiness, overnight setup and bedroom/front temperature/RH ranges. Alternatives and calculation details are collapsed. Failed complete plans never receive operating prescriptions.
- Candidate searches run in a local Web Worker on supported browsers, keeping the phone interface responsive. No data is sent by the planner. Manual weather and calculation remain available offline.
- The pre-rewrite version remains at [`checkpoint/v5.0.0-before-unified-plan-2026-10-23`](https://github.com/jeffcarp94/hvac-advisor/tree/checkpoint/v5.0.0-before-unified-plan-2026-10-23), commit `450f8b6`.

Release history below describes previous interfaces and is superseded by v6 where applicable.

## v5.0.0 — comfort, moisture protection and window-specific ventilation

- Confirmed fixed targets: day heat/cool 70/72°F; sleep 66/68°F. Current keeps daytime targets until 9 PM, then prepares for sleep through 10 PM. Results expire at the target change.
- Two connected bedroom/mid-coach heat and moisture balances. Condensation margin, sustained surface dampness, and indoor humidity are independent suitability checks. No rejected setup is prescribed and no score can override a failed requirement.
- Measured six window sections, closed/half/full openings; thermostatically varying airflow from exactly one of the two MaxxFans; residual exchange with windows open after the fan stops. Draft scoring favors indirect intake when comfort is similar. Ventilation is assessed by its trajectory, not a blanket 65°F outdoor cutoff.
- AUTO compares sustained useful heating/cooling against single-mode alternatives across sensitivity scenarios. Brief unnecessary reheating does not earn preference. Likelihood is qualitative, not an invented calibrated probability.
- Highest-ranked acceptable setup appears once. Remaining modes appear under **Other Viable HVAC Options** and **Unsuitable HVAC Modes**.
- New volume/mixing, airflow resistance, fan curve, surface, and moisture-removal assumptions are explicit in [model-assumptions.md](model-assumptions.md). Passing modeled screens cannot certify every unmeasured surface or hidden cavity.
- Historical release notes below describe previous versions; their one-zone, static-humidity and preference-pool behavior is superseded.

## v4.5.3 — explain why an option was not chosen

- Every usable alternative now names the reason another option was preferred: a better match to the temperature range, the preference order when comfort is similar, faster Current recovery, a recovery-time tie, or no need to run equipment.
- AUTO versus COOL explanations distinguish a period calling for both heating and cooling from one that cooling alone can handle. Selected options no longer claim uniquely better comfort when the preference order decided a close result.
- The choice reason is recorded when selection happens. Temperature calculations, suitability thresholds, comfort scores, the near-best pool and preference order are unchanged.

## v4.5.2 — starting temperature label

- Rename the Daytime/Overnight input to **Predicted Internal Temperature**, followed by **at [analysis start time]**. The time follows the actual simulation start, including periods already in progress, in the selected weather location's time zone.
- Show the applicable temperature input for each tab: predicted starting temperature for Daytime/Overnight, current indoor temperature for Current. Switching tabs preserves both values.

## v4.5.1 — plain-language explanations

- Daytime, Overnight and Current share a **Heating and Cooling Options Compared** section. Each option describes what it would do, why it does not work when rejected, its own selected setpoint/fan, and expected indoor temperatures when the equipment can be used.
- Numeric discomfort scores remain internal to selection. The comparison no longer displays weighted degree-hours or technical policy terminology. **Heating and cooling OFF** replaces the misleading **No system needed** label.
- Explanations cover heating/cooling capacity, recovery time, cold starts and later cold dips, AUTO temperature swings, heat-pump outdoor limits, cold/humid/hot outdoor air for ventilation, required High fan, and potential AC icing. Icing warnings and recovery instructions remain visible. No temperature-range disclaimer is added.
- The existing temperature simulation, equipment thresholds and selection order are unchanged.

## v4.5.0 — operating policies and comfort eligibility

- Heat-pump rules now distinguish monitored Daytime/Current operation from unattended Overnight operation. The app minimum remains 41°F; overnight minimums remain dew-point-dependent at 41/45/50°F. Minimum equality is inclusive. These are app policies, not newly asserted manufacturer limits. AUTO does not invent furnace backup below the app's heat-pump minimum.
- AC and AUTO evaluate one fan setting for the entire window. CCC2 Auto fan is evaluated at its actual Low/Medium/High speed, including Low near setpoint. Every coil estimate below the 35°F app screening margin is rejected, including the former 30°F acceptance boundary. Low duty no longer manufactures a warmer return-air temperature. High fan is selected for the app's humid-load trigger; conflicting fan/dehumidifier directives are removed.
- Equipment-policy eligibility, the 65°F whole-window floor, desired-band recovery, and comfort score are separate. All Daytime candidates use 68–72°F; Overnight uses 66–70°F; Current uses 70–72°F. A suitable setup passes operating policies, stays at/above 65°F including its starting state, and finishes in band with ±0.5°F tolerance. Recovery/transient misses remain visible and scored; an initial hot start alone is not rejected. If none qualify, the app explains the specific issue in plain language, including the furnace’s inability to hold the 65°F minimum or the AC’s inability to maintain its selected setpoint. A slow recovery or initial cold start gets its own explanation. Potential AC icing remains a separate equipment-risk warning. The closest result is labeled as an alternative, not a comfort recommendation.
- The portable dehumidifier defaults to **enabled at a 50% RH setpoint**, as confirmed by the owner. An off option removes the existing 640 BTU/hr average heat estimate. Enabled does not mean continuously running, and the 50% setpoint is not treated as measured indoor RH.
- Optional starting indoor RH can replace the outdoor-dew-point-minus-3°F proxy for coil screening. Blank remains an estimate; entered RH is converted at the applicable starting temperature and held as a constant dew-point scenario, capped at return-air saturation. Neither path models moisture storage/removal over time, and neither verifies an actual coil temperature. RH/dehumidifier edits invalidate results without discarding the weather source.
- Setup instructions include the Dometic airflow prerequisites, explicit thermostat-off passive operation, and correct roof-fan behavior in Furnace mode. Observed-ice recovery guidance is retained. Continuous airflow is not described as preventing ice, and the 62°F ventilation dew-point preference is no longer attributed to a universal ASHRAE prohibition.

## v4.4.0 — shared thermal simulation (retained)

- Current, Daytime, and Overnight now use one finite-capacity sensible heat balance, including actual starting temperature and the complete analysis window. Equipment recovery cannot instantly reach setpoint or a forced equilibrium.
- All cooling uses the existing 11,250 BTU/hr sensible estimate. The 15,000 BTU/hr total rating is retained separately. This is an engineering assumption, not a manufacturer sensible-performance map.
- Effective thermal mass stays fixed at 273.14 BTU/°F, interpreting the existing two-hour time constant as a calm-air baseline. Wind and ventilation change response rate rather than mass.
- Thermostat crossings are solved within each segment. AUTO uses two-degree triggers and returns to setpoint. MaxxFan has finite airflow-driven response and can import outdoor heat. Current target times use analytical crossings, rounded up to minutes.
- The timeline includes five-minute steps, weather boundaries, and partial final intervals. Location-based solar elevation applies on every tab, including dawn within an Overnight window. Comfort scoring integrates weighted degree-hours rather than counting samples. Capacity warnings distinguish insufficient holding capacity from initial recovery.
- Equipment checks see actual recovery calls and return temperatures. Full-window failures remain ineligible; diagnostic traces do not imply an automatic equipment-switching schedule. The current release's badges distinguish modeled comfort suitability from equipment eligibility.
- Solar gain separates cab MagneShades (estimated effective coefficient 0.20) from coach MCD day screens (0.50), using an estimated 60/40 glass-area split. The combined coefficient is 0.32. Cab shades are installed, MCD day screens are down during solar exposure, and night shades are down after solar gain ends. Envelope areas remain the existing provisional values.

See [model-assumptions.md](model-assumptions.md) for equations, source evidence, numerical choices, and limitations.

## v4.3.0 — weather and result reliability (retained)

- Weather retrieval bypasses HTTP and service-worker caches. The service worker caches only scope-relative application files and checks the network first when online. Offline navigation uses the last successfully cached app; weather must be entered manually offline.
- **NWS forecast** mode uses interval temperature/RH and the wind/sky/precipitation period that overlaps each point. No linear ramps are invented inside compressed NWS intervals. NWS-provided temperature units are validated and converted; ISO day/hour/minute/second durations are supported.
- The entire requested window must have temperature, humidity, and period-weather coverage. Missing/null data cannot silently become nearest-hour humidity or a single-point forecast.
- Weather controls summarize the forecast window. Editing weather switches all weather inputs to **Manual** mode, where the displayed values are used as a constant single-point scenario. Selecting Forecast again restores the fetched forecast. Indoor-temperature edits keep the selected weather source.
- Retrieval and NWS issue times are visible. App data policy: a snapshot expires after **two hours** from retrieval; a missing issue time, issue time more than five minutes in the future, or issue time at least **24 hours** old is rejected. These are freshness policies, not manufacturer equipment thresholds. A new retrieval failure clears the previous forecast/location. Individual requests time out after 15 seconds; old requests cannot overwrite a newer request or manual edit.
- Analysis windows and displayed times use the NWS location's IANA time zone, including daylight-saving transitions. Manual mode retains a known selected location; otherwise the device time zone is explicitly labeled.
- The existing 90% RH floor for likely rain is applied at the evaluated point. Minimum wind from NWS ranges and the existing text-based solar factors are retained.
- Input/source/tab changes invalidate old results. Results include calculation time/source/time zone and are invalidated when a window ends or the forecast expires, including on app resume.
- The legacy `hvac-advisor-v1` cache is removed during activation. Cache deletion preserves unrelated apps and other scopes. Old installations receive new HTML on navigation after the new worker activates; v4.3.0 pages also reload when their controller changes.

## Verification

Node.js 24, no dependency installation needed:

```sh
node --test tests/*.test.cjs
node --check sw.js
```

Tests cover policy thresholds/equality, attended versus unattended HP and AUTO, whole-window fan selection, CCC2 fan-speed boundaries, the 35°F/30°F screening boundaries, dehumidifier/RH assumptions, invalidation, no-suitable cold/hot cases, and recovery versus floor compliance. They also cover analytical thermal balances, zero elapsed time, capacity limits, AUTO cycling, wind/fan response, degree-hours, timestep refinement, complete intervals, weather causality, coverage, null RH, time zones/DST, overrides, freshness, retrieval races/rendering, and scoped/offline cache migration. GitHub Actions runs the same checks for pull requests and main pushes.

The browser smoke test also verifies real service-worker installation, offline manual use, forecast refreshes, phone-width layouts, and migration from the repository's v4.2 installation. It uses deterministic weather fixtures, not live NWS forecasts. It requires the repository history containing commit `5deb371` and Playwright:

```sh
npm install --no-save --package-lock=false playwright@1.64.1
npx playwright install chromium
node tests/browser-smoke.cjs
```

An existing Chromium executable can be supplied using `CHROMIUM_EXECUTABLE`. Screenshots are optional via `QC_SCREENSHOT_DIR`. GitHub Actions runs the browser test in a separate job.

For local manual checks, serve the repository under the deployment subpath, for example run `python3 -m http.server 8000` from its parent and open `http://localhost:8000/hvac-advisor/`. Do not open `index.html` through `file://` for weather or PWA tests.

