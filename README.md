# HVAC Advisor

Phone-focused single-file HVAC advisor for the Coach House Platinum III 250 DT. Hosted as a static PWA; `index.html`, `sw.js`, the manifest, and the icons are the deployment files.

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

## Review scope and remaining limitations

The shared model and policy reconciliation repair the earlier recovery, fan-arbitration, attended/unattended, comfort-eligibility, and unsupported-claim findings. The remaining coil screen, humidity proxy, heat-pump crossover, average dehumidifier heat, and equipment capacities are engineering assumptions, not validated performance curves. Equipment eligibility is not proof of hardware safety, and a suitable setup can include a visible, scored recovery/transient comfort miss. Recovery estimates remain sensitive to thermal mass, capacity, solar/shade assumptions, and effective ventilation flow; no prediction-error bound is established. Compressor startup delays, defrost dynamics, and fan-dependent sensible capacity are not explicitly simulated.

Indoor temperature and recovery time remain engineering estimates; this release is not measured coach calibration. No collection of field measurements is required for these repairs.

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
