# HVAC Advisor

Phone-focused single-file HVAC advisor for the Coach House Platinum III 250 DT. Hosted as a static PWA; `index.html`, `sw.js`, the manifest, and the icons are the deployment files.

## v4.3.0 — weather and result reliability

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

This batch repairs weather data, provenance, and PWA delivery. Thermodynamic constants, the coil model, equipment gates, optimizer scoring, and the heating/cooling predictors remain unchanged. The earlier review's temperature-recovery, comfort-floor eligibility, and equipment-policy findings remain for the next batches. Correct weather can change recommendations even though those rules are unchanged.

Indoor temperature and recovery time remain engineering estimates; this release is not measured coach calibration. No collection of field measurements is required for the planned repairs.

## Verification

Node.js 24, no dependency installation needed:

```sh
node --test tests/*.test.cjs
node --check sw.js
```

Tests cover interval decoding and coverage gaps, null RH, rain policy, remote time zones/DST, overrides, input invalidation, freshness, request races, complete retrieval/rendering, scoped/offline caching, cache migration, and preservation of unrelated caches. GitHub Actions runs the same checks for pull requests and main pushes.

The browser smoke test also verifies real service-worker installation, offline manual use, forecast refreshes, phone-width layouts, and migration from the repository's v4.2 installation. It uses deterministic weather fixtures, not live NWS forecasts. It requires the repository history containing commit `5deb371` and Playwright:

```sh
npm install --no-save --package-lock=false playwright@1.64.1
npx playwright install chromium
node tests/browser-smoke.cjs
```

An existing Chromium executable can be supplied using `CHROMIUM_EXECUTABLE`. Screenshots are optional via `QC_SCREENSHOT_DIR`. GitHub Actions runs the browser test in a separate job.

For local manual checks, serve the repository under the deployment subpath, for example run `python3 -m http.server 8000` from its parent and open `http://localhost:8000/hvac-advisor/`. Do not open `index.html` through `file://` for weather or PWA tests.
