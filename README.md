# v6.7.0 — UI overhaul: settings first, short reasons, adapts to any screen

Presentation only. The model, ranking, eligibility, comfort checks, control logic and logging are unchanged (fixture before/after comparison in the PR).

- **Each setting change is one card.** Mode, set point(s) and fan in large type, the windows and MaxxFans line, a one-line **Why**, and the predicted bedroom range. Later cards start with **Predicted Internal Temperature at [time]**; the first shows the measured bedroom.
- **Other modes for each card.** "Works, but ranked lower" and "Ruled out", one plain reason each (your A–D decisions, November 21):
  - Reasons describe what happens (temperature, time, conditions), not engineering causes.
  - "Practically a tie" when the difference is under 5 degree-minutes (averaged over the 32 conditions) and the bedroom ranges are within 0.5°F.
  - Modes with the same result share one row; heating modes are hidden when only cooling is needed, and the reverse.
- **Text you approved stays; the rest is gone.**
  - Kept: "Works in X of 32 tested conditions" (with "misses run cold/warm" below 32), the recheck time, the "No setting works all night" line, the weather source line (NWS · place · issued time), the old-readings note (over 10 minutes), and a one-line coil-icing warning when flagged.
  - Removed: comfort-policy and methodology text, the Forecast & calculation details panel, the condition-by-condition failure list, the window-moisture advisory, the AC airflow line and the footer.
- **Inputs.** Weather, Inside the coach now (humidity labeled "Humidity % (YoLink)"; EasyTouch display fields stay beside the readings), Today, then collapsed Coach setup, Parking, and Log & calibration (YoLink update times, comfort vote, Sheets logging, sensor comparison).
- **Look.** System fonts (no web-font download), one accent color plus a color per mode, follows the phone's light/dark setting. Phones show Inputs and Plan tabs and switch to Plan after a build; screens 960 px and wider show both side by side. The 480 px maximum width is retired.
- **Kept as one short line when it applies:** "Not every setup was checked" for a budget-limited absence search.

# v6.6.28 — refrigeration-cycle AC model, coil-ice advisory on the same model, faster moisture buffering, 1°F comfort allowance

- **One AC model (your WP14 approval).** Plan cooling capacity and the coil-icing advisory now come from the same vapor-compression cycle model of the rooftop unit (compressor, capillary tube, coil, condenser). The coil's evaporating temperature is solved from the equipment instead of read off capacity curves. Plan capacities are within about 1–4% of v6.6.27 (for example 15,117 vs 15,142 BTU/h total on a 95°F afternoon at High).
- **Coil-icing advisory rebuilt.** The old v6.6.27 hold on legacy capacities is retired. The advisory now tracks ice on the coldest part of the coil: condensate draining across it freezes and frost forms while that part is below 32°F, and the ice melts between compressor runs (quickly with a running fan, slowly in still air when an AUTO fan stops). It flags at 0.43 mm, enough to start blocking the fin gaps. It still never changes the recommendation.
- **Hot days no longer flag.** On 95°F and 100°F synthetic afternoons no fan speed is flagged, including Low and AUTO. Your point that a 95°F day should not ice a working unit holds in the model.
- **Gulf Shores is explained and validated.** Your account (November 20): the CCC2 read the coach warm from its cabinet-void mounting and never saw COOL 72 satisfied, so the compressor ran continuously while the coach sat at about 66–68°F. Modeled that way, the coil ices within about an hour on every day (March 3–5) and every fan speed. With an accurate thermostat the same day cycles and the ice melts between runs, which is why earlier reconstructions did not flag. This is a historical validation case only. The live model senses front air exactly; your EasyTouch, foam plug, insulated mount and −4°F adjustment are what it assumes.
- **Faster moisture buffering.** Furnishings now exchange moisture with the air within minutes, so an AC run no longer swings room RH by 30 points within a cycle. This changes predicted RH and can change humidity-related checks.
- **1°F allowance on every comfort check (your decision).** A prediction within 1°F of a limit now passes: bedtime readiness (64–70°F counts for the 65–69°F sleeping band), recovery, the bedroom at your return, the 30-minute check, and the warm, cold and severe-warm runs (now 1°F outside the band, was 0.5°F). The 65°F floor carries the same allowance, so a plan fails only below 64°F. Ranking still prefers the plan closer to target. Thermostat settings, the 42°F propane changeover and the 32°F coil physics stay exact.
- **Example.** A bedroom readiness of 69.0–70.0°F at 10 PM no longer fails the plan, and a reading of 67°F at 9:45 PM no longer triggers a recovery card.
- **Log.** The `coil_advisory` JSON now carries `min_surface_f` (coldest coil region) and `peak_frost_mm`, replacing `min_coldest_f`. Same column; no receiver change.
- **Effect on the test fixtures.** Qualifying fixtures go from 13 of 19 to 15 of 19:
  - **Now qualify:** rising-synthetic, Winterset 2025-10-01, hot synthetic S, May 8 E.
  - **Now fail:** hot synthetic N and E. A qualifying plan exists (the v6.6.27 plan passes when checked directly), but the one-phase-at-a-time setting search now steers to a different evening setting that no night setting can rescue. That's a search limitation, flagged for your decision.
  - **Pass counts** rise on most other fixtures (for example May 8 N 30 → 32, preparation N 29 → 32).
  - [Full table](model-assumptions.md).
- **Open questions recorded:** how much sun on the exterior wall behind the thermostat cabinet still adds to the EasyTouch reading (sunny-day logs will show it); the indoor moisture sources on long hot AUTO runs; the size of the coldest coil region.

# v6.6.27 — realistic equipment capacities, garage refit, 30-minute bedtime window, absence rule, comfort metric removed

- **Realistic capacities are now live (your D2 decision).** The planner now uses the WP6 equipment model instead of the old fixed numbers:
  - **Heat pump:** about 9,600 BTU/h at 45°F (was 13,800).
  - **AC:** about 9,600 BTU/h sensible on a 95°F afternoon (was a fixed 11,250).
  - **Moisture removal:** comes from the coil model instead of a fixed allowance.
  - **Fan speed:** it now changes the output.
  - **Gas changeover:** follows your 42°F setting. In the model, propane takes over at 42°F and below; the plan text still says "below 42°F", and what the EasyTouch does at exactly 42°F isn't documented.
- **Garage runs refit (R1).** Your 11/16 and 11/17 garage runs were refit on the new heat-pump model:
  - **Storage:** air 229, mass 402 BTU/°F (was 297 / 574).
  - **Furnace:** 9,075 BTU/h delivered to the living space (was 11,550). This is a fitted delivery figure, not an appliance measurement.
  - **Splits:** furnace 58% rear, ducted air 36% rear.
  - **Fit:** within 0.29–0.47°F of both runs. The old values were 1.7–1.9°F off on the new heat pump, which is why the refit was needed.
- **Uncertainty ranges re-centered (your confirmation).** The "restricted" and "greater airflow" ends and the storage range were re-derived around the refit with the same method as before; for example, furnace rear share is now 0.568–0.683 (was 0.52–0.65). No new uncertainty dimensions were added (your N decision).
- **Bedtime readiness gets 30 minutes (B).** A plan is ready if the bedroom is in 65–69°F at 10 PM or gets there by 10:30 PM. The warm-run rules after bedtime are unchanged.
- **Absence rule (E).** While you're away, only protection applies: 65°F floor, equipment and moisture. Comfort is judged at your return. A departure inside the first 30 minutes moves the 30-minute deadline to your return.
- **Comfort metric removed (your Item 6 decision).** The Comfort metric panel and the "Awake clothing" setting are gone. `comfort_metric_json` now logs "missing", and the vote fields stay. No receiver change.
- **Decisions made during the build:**
  - **Coil-icing advisory stays on the old equipment model** until the coach's moisture buffering is reviewed. With the new model, the AC dries the modeled coach to about 30% RH, and the advisory would flag even High fan on ordinary hot afternoons.
  - **"Recovery before bed" card fixed.** With a qualified plan, the card now uses that plan's own night setting. If its check fails, you see the normal plan instead of "A reliable time … is unavailable".
- **Effect on the test fixtures.** Qualifying runs go from 8 of 19 to 13 of 19:
  - **Now qualify:** hot synthetic N, E and W (from the new capacities and refit), May 8 N and W, and away-with-Wi-Fi.
  - **Now fails:** Winterset 2025-10-01, a mild night. One of 32 conditions dips to 64.7°F, and the 65°F floor is hard.
  - **Still fail, but closer:** October now works in 28 of 32 conditions (was 1).
  - **Plans:** every recommended plan except one changes.
  - **Run time:** server run times rose about 1.3–5×. You chose to stop tracking speed, but time one run on the phone after this release.
  - [Full table](model-assumptions.md#v6627--realistic-capacities-d2-garage-refit-r1-bedtime-window-b-absence-rule-e-comfort-metric-removed).

# v6.6.26 — defect fixes: site elevation, WP3 no-chatter test

- **Site elevation was never used (fixed).** Since v6.6.12 the app was meant to use the NWS grid elevation for air pressure (humidity and air-density math). It looked for the elevation's unit under the wrong field name, so every live forecast fell back to sea-level pressure ("Sea-level pressure assumed" on the plan, `elevation_m` "missing" in every logged row). It now reads the NWS field correctly. Effect on your 5:28 PM run, rebuilt at an assumed 340 m: the same recommendations and pass counts, predictions within 0.01°F. Your next plan should say "NWS grid elevation … m" and log `elevation_m`.
- **WP3 no-chatter check now matches the scope.** The test checked only that thermostat calls start at least 3 minutes apart; it now also checks that no completed call is shorter than 3 minutes. The 2.79-minute call noted in v6.6.14 no longer occurs (shortest now 3.22 minutes, with the comparison-only +3°F sensor offset and no lag). Nothing in the app changed for this item.

# v6.6.25 — comfort metric and predictions for Leaving and Away runs (logging only)

- **What was wrong.** For "Leaving the coach" and "Currently away" runs, the plan cards are summaries that don't carry the predicted temperature track. The comfort metric (`comfort_metric_json`, and the Comfort metric panel) and the 30-minute and 2-hour predictions (`prediction_30min_json`, `prediction_2h_json`, `prediction_next_action_json`) read that track, so they were blank on every Leaving/Away run since v6.6.22 (your rows 8–11 on November 19). Staying runs were not affected.
- **The fix.** These runs now use the full plan behind the cards: the setup to use now, then the departure setup at the time you leave, then any overnight plan. It is used only when it starts with the setup the log records; otherwise the fields stay blank rather than describe a different plan. On your 5:28 PM run (reconstructed from the logged inputs) the log now gets the comfort metric for 5:28–7:28 PM and the predicted bedroom 70.3°F at 5:58 PM and 68.7°F at 7:28 PM. Leaving/Away cards now show the Comfort metric panel too.
- **Logging only.** Recommendations, checks, ranking and timing are unchanged (identical decisions and rendered plans on the fast fixtures). No receiver redeploy is needed.

# v6.6.24 — comfort runs start 0.5°F outside the band (option C)

- **What changed (owner decision, November 19, 2026, reassessment option C).** A "too warm" or "too cold" run now starts 0.5°F outside the allowed range instead of exactly at its edge: the sleeping range fails only when the bedroom stays above 69.5°F for more than 30 minutes, or above 70.5°F for 15 minutes; the awake range above 73.5°F or below 67.5°F for more than 30 minutes. The 0.5°F is about the model's own calibration error (0.24–0.37°F against your garage runs), so the app no longer rejects a plan over a difference it can't predict.
- **What did not change.** The 65°F floor is still hard. Getting into the range after a start outside it, being in the sleeping range at 10 PM, the comfort at your return, and the ranking of plans (degree-minutes outside the range) all still use the exact range. The plan card's target text now states the tolerance, and failure messages give the threshold actually used (for example "Remains above 69.5°F for more than 30 minutes").
- **Effect on the test fixtures.** Qualifying runs go from 5 of 19 to 8 of 19: Winterset 2025-10-01 (0 → 31 of 32), the bedtime-preparation case at E (28 → 30) and May 8 at S (0 → 30) now qualify, and the five that qualified still do. Hot ×4, May 8 at N/E/W, October, rising, falling and away-with-Wi-Fi still don't. Many recommended plans change even where qualification doesn't, because more plans are admitted and the least-severe one wins. See [the table](model-assumptions.md#v6624--comfort-run-edge-tolerance-option-c).
- **Run time.** Mixed on these fixtures: some faster, some slower (details in the table). It was not a speed change and isn't one.
- **Options B and E were measured, not adopted.** Adding the 30-minute bedtime window (B) would also qualify May 8 at N and W and bring October to 27 of 32; the absence rule (E) with B qualifies away-with-Wi-Fi only through a 1:55 AM remote adjustment. Neither is in this release.

# v6.6.23 — log the ensemble pass count (logging only)

- **What is new.** Each logged plan run now fills the `ensemble_pass_count` column, which the Sheet has had since v6.6.6 and which logged "missing" on every row until now. The value is the number the plan card shows ("Works in X of 32 tested conditions") for the plan the row records.
- **When it stays "missing".** If the page shows no "Works in X of 32" box for the logged plan, the column logs "missing". That covers a partial run's current guidance (the card's box describes the full-sequence plan, which does not qualify) (owner decision, November 19, 2026). It also stays "missing" with the nine-case policy (ensemble off), or if fewer than all 32 conditions were evaluated, so a partial count is never logged as out of 32. Readings-only rows don't use the column.
- **Logging only.** Nothing the planner reads changed: eligibility, ranking, recommendations and timing are the same as v6.6.22. The log receiver needs no redeploy; the column already exists.

# v6.6.22 — WP12 Phase A comfort metric (observation only)

- **What is new.** The plan card has a **Comfort metric (observation only)** panel, and each logged run has a `comfort_metric_json` field. For the plan shown, it estimates how warm or cool it feels at **Jeff’s bed, Kim’s bed and the dinette**, not just the air temperature:
  - **Radiant temperature:** the average temperature of the surfaces each spot "sees" (walls, ceiling, floor, windows, beds and cabinets, the cab seen from the dinette), weighted by how much of the view each takes up. A nearby window counts much more than a distant one.
  - **Operative temperature:** the average of air and radiant temperature (ASHRAE 55-2023), close to what a thermometer in a person's place would feel like.
  - **Awake (occupied):** PMV (−3 cold to +3 hot), PPD (predicted share dissatisfied) and SET, per ASHRAE 55-2023, at 1.0 met.
  - **Asleep (beds only):** the Lin & Deng (2008) sleeping comfort equation.
- **It changes nothing.** The planner never reads it: eligibility, ranking, recommendations, timing, remote and sleep plans are unchanged. It is computed on the page after the plan is fixed, from the normal estimate (one of the 32 tested conditions). Every fixture gives the same decision and the same rendered plan as v6.6.21.
- **Your settings (November 19, 2026).**
  - **Awake clothing:** new **Awake clothing for the comfort metric** choice under Equipment & planning options, kept between visits. By default 0.5 clo May–September and 0.8 clo October–April.
  - **Air speed:** nothing is measured, so still air (0.1 m/s) is used for every fan state.
  - **Bedding:** 1.8 clo, a light-quilt value from the literature, labeled uncalibrated. With it the sleep equation is neutral near 78°F, so **your 65–69°F sleep band reads about −2 to −3 (cool)**. That reflects the uncalibrated bedding value, not a problem with your settings; your comfort votes can revise it later (WP12 Phase B).
  - **Rear window:** it is in the rear bathroom, so it is out of view from the beds.
- **Windows.** The window surface used is the glass itself, from the room air, outdoor air and wind, with no credit for shades. With MCD shades down the surface you actually face is warmer than that, and sun-warmed shades are not modeled.
- **Logging.** The receiver adds one column at the end, `comfort_metric_json`. Paste the new `tools/logging/Code.gs` into the Sheet's script project and deploy a new version to record it; the existing tab gains the column header automatically on the next write. Until then the field is ignored and logging keeps working.
- **Findings, reported rather than changed.** The calibrated glass R 1.0 is smaller than the window's two air films once wind blows, which would put the window surface below outdoor temperature; the comfort metric uses the films in series instead (owner decision), and the heat balance is unchanged. The scope asked for verified air speeds; none exist. See [the method](model-assumptions.md#v6622--wp12-phase-a-comfort-metric-observation-only).

# v6.6.21 — WP13 sampled conditions and severity ranking

- **What is built.** The nine fixed "what if" cases can be replaced by 32 sampled conditions: the normal estimate plus 31 combinations of forecast error (temperature, dew point, clouds, wind), front–rear airflow, heat storage, air leakage, internal gains, sun and moisture assumptions. A plan qualifies when the normal estimate passes, every condition passes the equipment and 65°F protection checks, and at least 29 of the 32 pass every comfort and humidity check together. Qualifying plans are ranked by how far and how long the bedroom misses its band (warm misses count double), then the worst three conditions, then humid minutes, then the existing comparisons. The plan card would say "Works in X of 32 tested conditions" and name the ones that fail.
- **Search stage (November 18, 2026).**
  - **Faster with the same answers.** A plan stops being simulated as soon as it can no longer qualify (the normal estimate fails, an equipment or 65°F check fails, or a fourth condition fails). Any plan that could still qualify is checked in all 32 conditions, and when two plans that don't qualify are compared, the one stopped early is finished first whenever needed. The search therefore picks exactly what checking everything picks (verified on every fixture). Compared with checking everything, planning time fell up to 2.7× when a plan qualifies (March: 847 to 309 s), but only about 10% when none does.
  - **Memory.** The planner's peak memory fell from about 1.1 GB to 139 MB on Winterset 2025-10-01 (today's nine-case planner: 244 MB) and is 183 MB on the bedtime-preparation case, the largest search (nine-case: 324 MB). The result passed back to the page is 0.2–3.3 MB (was up to about 100 MB). Neither changes any number shown.
  - **Disclosure.** The plan card says whether every plan that could qualify was checked in all 32 conditions, or (bounded search) how many were not.
  - **The bounded shortlist is built but switched off.** It needed 0–29% more simulation on these fixtures (more on one), because the existing search already stops early. It never returned a worse plan, and on March found a marginally better one.
  - **Still too slow for the phone target.** Ensemble plans take about 1.1–8 times as long as nine-case plans (about 2–28 minutes on the evening fixtures here, and roughly three times that on a throttled phone profile). The nine-case planner doesn't meet the 20-second target either.
- **Switched on (owner decision, November 19, 2026),** with the bounded shortlist off. Plans are now chosen across the 32 sampled conditions.
- **Effect.** On the test fixtures (sunlit ones at all four headings), 5 of 19 runs qualify instead of 1: March, the bedtime-preparation case at N, S and W (E passes 28 of 32, one short), and the surface case. See [the method and tables](model-assumptions.md#v6621--wp13-sampled-ensemble-and-d3-severity-ranking) and [the proposed ranges](reports/wp13-priors.md).

# v6.6.20 — WP10 wind and infiltration

- **What changed.** Wind no longer raises all heat loss by 2% per mph. The forecast wind (measured at 10 m) is converted to the wind at the coach (3 m, about 0.55 × the forecast). That local wind changes only the outside surface film of each wall, roof, floor and window, and drives air leakage.
  - **Calm conditions are unchanged.** That is the condition of your garage calibration.
  - **Air leakage** now follows the ASHRAE basic (Sherman–Grimsrud) model: 0.25 air changes per hour at an 18°F indoor-outdoor difference and 7 mph at the coach, more in wind and cold, less when mild and calm.
  - **Window ventilation** uses the same local wind.
  - **Sun heat through walls and roof** now depends on wind too. The old fixed value matched a fairly windy 15 mph forecast, so on calmer days more sun heat comes through the walls, roof and cab.
- **Effect.** At a 15 mph forecast on a 30°F night, total heat loss is 35% above calm (the old rule gave 30%). Furnace run time on a steady 10°F, 15 mph night rises about 5% over v6.6.19. Fixture qualification is unchanged (1 of 10); the best available plans move slightly on most fixtures. The garage calibration still fits (RMSE changes ≤ 0.01°F), with no refit. See [the method](model-assumptions.md#v6620--wp10-wind-and-infiltration).
- **Finding, nothing changed.** Keeping calm values exactly leaves single-pane glass more wind-sensitive than real glass (+77% at 15 mph); a physical correction would change a calibrated calm value and needs approval.

# v6.6.19 — WP9 humidity model

- **What changed.** Room humidity now accounts for three things the model ignored:
  - **Moisture stored in furnishings.** Cushions, bedding, wood and fabric absorb water when the air is humid and release it when it is dry. That store holds about six times the coach air's own moisture per percent RH, and it trades with the air over about 4 hours. Room RH now rises and falls more slowly.
  - **Water on the AC coil.** It drips away only once the coil is fully wet. With a fixed fan (Low/Medium/High), the blower keeps running between cooling calls and blows that water back into the coach. With short cooling cycles the coil may never drip, so the AC removes almost no moisture. With the AUTO fan, the blower stops with the compressor and the water drains as before.
  - **The dehumidifier in the cold.** Below 59°F its output now falls to zero at 41°F (it used to keep its full 59°F output), while it still draws power. About 15% of what it collects in short cycles returns to the room.
- **Basis.** Henderson–Rengarajan coil model and suggested values from EnergyPlus; Nordtest moisture-buffer class; NREL dehumidifier tests. All are transfer evidence, not measurements of this coach. See [the method](model-assumptions.md#v6619--wp9-humidity-model).
- **Effect.** On a humid night with the dehumidifier off, the AC on a fixed fan can now fail the 65% room-humidity check that AUTO fan passes. With the dehumidifier on, room RH mostly stays at or below 60%. Fixture qualification is unchanged (1 of 10) with the dehumidifier on or off. The best available plan, used when nothing qualifies, changes on most fixtures; with the dehumidifier off, several RH failures disappear because furnishings absorb moisture.
- **The High-fan rule now works against humidity (finding, unchanged).** The cooling check requires a fixed High fan whenever the indoor dew point is above 60°F, and a fixed fan is now the setup that removes the least moisture. With the dehumidifier running at 50%, as the owner always runs it, this rarely matters.
- **Fallback ordering fixed (owner decision).** When no plan qualifies, plans are ranked by how long they last before a check trips. A plan that never brings the coach into the comfort band now counts as failing at its 30-minute recovery deadline, so it can't outrank one that holds comfort for hours. Without the fix, the hot synthetic afternoon's internal fallback had become "AC for 15 minutes, then off". With it, the fallback is AUTO 68/72 High, then AC 68 Low, then HP 66, as before. Qualifying plans are unaffected.
- **Reviews now run with the dehumidifier on only** (owner decision; the owner always runs it at 50%).
- **Removed:** the coil advisory's "not yet modeled (WP9)" note.
- **Unchanged:** the room-air RH rule (above 65% for 30 minutes), the High-fan cooling rule, eligibility, ranking and the advisory-only surface checks.

# v6.6.18 — WP8 solar rebuild

- **What changed.** Solar gain is now computed surface by surface. The model uses the sun's altitude and azimuth, a clear-sky estimate reduced by the hourly NWS sky cover, and a split into direct and diffuse light. Each roof section, wall, the rear, the windshield (55°, unverified) and every window receives its own share. Glass gain depends on the sun's angle of incidence. Walls and roof gain through their own insulation (sol-air), so nothing is counted twice. Gains go to the zone each surface belongs to, half to air and half to stored mass as before. See [the method](model-assumptions.md#v6618--wp8-solar-rebuild).
- **Heading and tree cover are now used.** Each side's direct sun is reduced by its tree-cover setting; diffuse light by the average of all five. **A plan that includes daylight needs a confirmed heading** (owner decision, November 18, 2026); set it or use the phone compass under Parking observations. Overnight-only plans don't need one. Without a location, the old aggregate solar estimate still applies (manual-weather limitation).
- **Windows.** Body glass uses your measurements: the six coach panes plus the rear window (25 × 19 in) and entry-door window (13 × 22 in), 15.96 ft² in total. Cab glass stays the 27 ft² estimate. Heat loss still uses the calibrated 18 ft².
- **Effect.** On a clear July evening at 6 PM, solar gain is about 1.5× the old estimate for an average heading. At solar noon it is lower. West-facing sides now get the late-day sun they should.

# v6.6.17 — WP7 coil-icing comparison mode with advisory (decision D1)

- **What it does.** Alongside every displayed cooling plan, the experimental WP6 coil model estimates the coldest coil surface (apparatus dew point − 4°F) while the compressor runs, at the actual blower speed, in all nine cases. When it reaches 32°F or colder and the current cooling check permits the setup, the plan shows a non-blocking advisory: "The experimental coil model flags possible icing at this fan setting. The current cooling check permits this setup." An alternative is shown only if it was evaluated, passes the current check and the physics check in every case, and is executable. Its predicted bedroom and front ranges are shown beside the recommended plan's. Eligibility, ranking, timing and the recommendation itself are unchanged (decisions identical to v6.6.16 on every fixture). There is no "unsafe" wording. The plan log's `coil_advisory` column records each result for the D1 review.
- **AUTO fan.** The EasyTouch RV 350 manual (rev. 2.0, p.7) says Full Auto adjusts speed with the setpoint difference but gives no thresholds; the Dometic zone board does the staging. AUTO is therefore assessed at Low while the compressor runs; the CCC2 staging result is reported alongside.
- **Gulf Shores validation (KJKA observations, March 3–5, 2025; reconstructed).** Away 9 AM–5 PM, COOL 72, every fan, dehumidifier on and off: the current cooling check permits every fan on every date. The physics model flags every fan in every case, High included. The full planner's own away plan (AUTO with Low or Auto fan) is also flagged. It is not a complete plan on any date, so no alternative is offered. So v6.6.16 would have permitted, and recommended, the kind of setup that iced. See [the matrix](reports/wp7-gulf-shores-matrix.txt).
- **Specificity is low.** The model also flags Low and Medium on a synthetic 95°F afternoon, and High on a synthetic 78°F one; High is clear at 85–95°F. Expect the advisory on most cooling plans that are not on High fan. Per D1, nothing is tuned; the review comes after 15 distinct disagreement periods or 60 days.
- **Not yet modeled:** moisture returning from a wet coil when the fan keeps running (WP9); the advisory says so.

# v6.6.16 — Evidence-based airflow sensitivity cases

- **What changed.** The restricted and greater airflow cases now vary everything the owner's two garage runs inform about rear/front air exchange: the forced mixing scale, the ducted rear share, the furnace rear share and the buoyant width. Each case is one parameter set that still reproduces both garage runs (11/16 heat pump, 11/17 furnace) within the fitted residual combined with the 0.3°F digitizing tolerance. Restricted: mix 0.5, duct 0.40, furnace 0.52, width 0.28 ft. Greater: mix 2.8, duct 0.35, furnace 0.65, width 0.30 ft (previously mix 0.7 / 1.3 only, with the calibrated splits and width fixed). The working estimate is unchanged. Window/MaxxFan flow, cab conductance, the ±2°F outdoor offset, RH offset and surface factor are unchanged. See [the evidence](model-assumptions.md#v6616--evidence-based-airflow-sensitivity-cases).
- **Why the cases got wider, not narrower.** The garage runs pin the ducted rear share (about 0.34–0.41) but not how mixing grows with the front–rear difference: forced and buoyant exchange trade off, and so do furnace rear share and mixing. Those trade-offs fit the 2–4°F unoccupied garage gaps equally well and diverge on an occupied cold night (4–9°F gaps, sleeping heat in the rear). On a reconstructed steady 30°F night at FURNACE 63, the nine cases' bedroom-minus-front offset now spans 3.5–9.8°F (was 4.0–7.8°F).
- **Decision changes (bedroom comfort only).** The reconstructed steady 45°F night no longer qualifies (was AUTO HEAT PUMP 67/71). Runnable fixtures qualifying fall from 5 of 10 to 1 of 10: the March historical, 2025-10-01 and 2026-05-08 Winterset nights and the bedtime-preparation synthetic now fail on the sleep band or its 65°F lower bound. In each lost plan, no case fails an equipment or moisture check. Per owner direction (November 18, 2026), comfort-only failures across the cases are tabled until WP7–WP10, WP13 and WP12 Phase A are in.
- **The steady 30°F night still has no plan,** and no airflow case could change that: the working estimate alone fails, because each front-sensed furnace cycle swings the bedroom 4.2–5.7°F against a 4°F band.
- **Tests.** New `tests/airflow-scenarios.test.cjs` pins the case values and checks each set against both garage runs. Two tests and the browser preparation case moved to labeled colder synthetic nights (50°F, 55°F) with their assertions unchanged.

# v6.6.15 — WP11 two-node storage, calibrated to the owner's garage tests

- **Two-node zone storage.** Each zone now has a fast air node (air plus surfaces and light furnishings) and a slow mass node. HVAC, conduction, infiltration, ventilation and internal gains act on the air node, and solar splits 50/50. Furnace heat splits between the nodes (below). The thermostat and YoLink comparisons use the air node.
- **Calibrated to field data.** Values are fitted jointly to two owner YoLink garage runs with the front and rear sensors: heat pump on November 16, 2026 and furnace on November 17, 2026. Air storage is 297 BTU/°F and mass storage 574 BTU/°F, with a 0.98 h coupling. The rooftop unit's ducted air goes **38% to the rear** (previously 45% by volume). The furnace delivers **57% to the rear** (previously 70% from the outlet layout) and **11,550 BTU/h** to the living space (previously 15,000), with 49% of it going first into stored mass (floor, bed platform and cabinetry near the furnace). The effective buoyant mixing width is 0.58 ft. The model reproduces both sensors in both runs within 0.37°F RMSE. See [the calibration](model-assumptions.md#v6615--wp11-two-node-storage-calibrated-to-the-garage-tests).
- **Effects.** Recovery from very hot or cold starts takes longer. A 53°F start at 20°F outdoors now takes about 70 min of furnace to reach 65°F (was about 20 min). Modeled heat-pump cycles run about 4 min on and 15–20 min off at 45°F. Furnace cycles lengthen to about 14 min on, and the modeled bedroom peak on a 45°F furnace night falls from 82°F to 73°F. With occupants asleep in the rear, the bedroom is still predicted to run warmer than the front sensor overnight.
- **Not calibrated:** overnight occupied behavior, and furnace capacity in deep cold. At the fitted output the furnace runs about 85% of the time at 0°F and continuously near −20°F with two occupants.
- Planner runtime: the reconstructed full-night staying search takes 277 s on the 2-core reference machine (v6.6.14: 272 s). Its winner is COOL then HEAT PUMP 67 at 10 PM.
- Fixture before/after (live planner, archived and labeled synthetic inputs): 5 of 10 runnable fixtures produce a qualified plan, up from 2 in v6.6.14. The modeled bedroom peaks on the failing synthetic nights fall from 77–113°F to 73–78°F.

# v6.6.14 — Test baseline, bounded absence search and WP1–WP4 acceptance coverage

- **Bounded absence search.** From v6.6.4 the departure search ran a full overnight search for every viable current×departure pair until one qualified, then repeated the cross product for the one-remote-change search. When no overnight plan qualified (for example a steady 45°F night), it did not finish in practice. Up to 6 overnight continuations and 6 fixed setups for the remote search are now checked, in the existing preference order. A deterministic budget of simulated work, about 25 s on a 2-core reference machine, is split 60/40 between fixed setups and the remote search. The plan says when a result came from a bounded search. Staying plans are unchanged. See [the evidence](model-assumptions.md#v6614--test-baseline-and-bounded-absence-search).
- **Test baseline.** The full Node suite now completes; before this release it never finished in CI after v6.6.4. Six inherited failures are resolved without weakening assertions. Three expectations were stale against the installed control model. Three relied on nights where, since v6.6.2, no plan qualifies; they now use a labeled synthetic clear 60°F night.
- **Phone layout.** The YoLink last-updated fields widened the page beyond the viewport. They now sit full width below the paired readings.
- **WP1–WP4 acceptance items.** Optional **Use phone compass** (magnetic heading, owner confirmation required), Apps Script receiver tests, queue survival across app upgrades, a check that Worker messages carry no logging credentials, and a furnace duct-layout test.
- **Known limitation (owner decision pending):** with the front-sensed EasyTouch cycle, the modeled bedroom often swings outside the 65–69°F sleep band. Few overnight plans qualify across all nine cases.

# v6.6.13 — WP6 capacity comparison

Experimental related-model heating and cooling outputs are available to the offline comparison runner. The normal planner still uses its existing capacities and heat-source dispatch. The optional EasyTouch outdoor reading is stored in the existing log column. See the [comparison report](model-assumptions.md#v6613--wp6-capacity-comparison).

# v6.6.12 — WP5 forecast precision and altitude

The solver uses NWS grid temperature, humidity, wind, sky cover and estimated elevation with labeled fallbacks. It keeps outdoor precision at the 42°F heat-source boundary, records wind gusts, and adjusts airflow and moisture calculations for site pressure. Concurrent cooling and dehumidification now use finer internal steps. See the [validation results](model-assumptions.md#v6612--wp5-forecast-precision-and-altitude).

# v6.6.11 — WP4 internal heat sources and window sides

Sleeping occupants and phone charging add heat in the rear, while the Cube's electrical and condensation heat enters the front. The model adds inverter and monitor standby heat, uses the owner-confirmed window sides, and retains the existing furnace delivery estimate. See [the before/after assessment](model-assumptions.md#v6611--wp4-internal-heat-sources-and-window-sides).

# v6.6.10 — EasyTouch sensor comparison

After building a plan, expand **EasyTouch sensor comparison** to run a separate experiment for a selected offset and 0–10 minute lag. The live recommendation, eligibility and logged plan are independent of the experiment. The comparison reports setup changes and nominal predicted heating and cooling call times.

The current pair of readings supplies the bias when present. Otherwise the provisional garage prior uses +7°F referenced to an assumed 0°F garage adjustment. If the current adjustment is unknown, −4°F to +10°F is an illustrative sensitivity range, with +3°F as the initial test. The starting lag of 5 minutes is the midpoint of the specified range, with no field calibration. The sensor starts at front air plus bias and follows a first-order lag driven by a linear ramp over each thermal step. A synthetic zero-lag heating case produced one 2.79-minute call followed by 177 minutes idle. This is a short call, with no rapid restart. The comparison flags short completed calls for review.

# v6.6.9 — Parking and comfort observations

Heading and anticipated tree cover are owner observations saved on this device. Moving more than one mile from the last confirmed weather location or selecting New parking position requires reconfirmation. The location estimate comes from the weather lookup, so use New parking position for moves within the same ZIP. Optional per-run observations include each YoLink app update timestamp and bedroom/front comfort votes with the reported vote-time HVAC setup. The planner does not use these observations in calculations.

# v6.6.8 — EasyTouch reading placement

Enter the EasyTouch displayed temperature and optional reading time alongside the YoLink readings. Run logging retains the Temperature Reading Adjustment as a device-local setting.

# v6.6.7 — EasyTouch logging fields

Run logging records the displayed EasyTouch indoor temperature, its timestamp, and the saved Temperature Reading Adjustment. An empty EasyTouch time uses the YoLink reading time. The display difference is calculated against the front YoLink reading without applying the offset a second time. The fields are for observation and use the existing Sheet columns.

# v6.6.6 — Run logging

Optional Google Sheets logging is available under **Run logging**. Enter the deployed Apps Script URL and your private token, enable logging, and save. **Log readings only** sends current indoor readings without building a plan. Completed plan runs also log their outcome. Entries remain saved until the receiver confirms their event ID. See [receiver setup](tools/logging/README.md).

# v6.6.5 — WP0 test baseline

- Restore Node and browser regression coverage for advisory-only condensation, natural recovery without unnecessary heat, and programmable EasyTouch AUTO pairs. See the [test baseline notes](model-assumptions.md#v665--wp0-test-baseline).
- The planner uses the same model, thresholds and ranking as v6.6.4.

# v6.6.4 — EasyTouch remote access and departure planning

- Cabinet isolation is recorded as installed. The remote-access checkbox defaults on and represents whether the EasyTouch is reachable over Wi-Fi in the Micro-Air app.
- Departure and currently-away plans prefer a verified setup with no remote actions. One timed thermostat change is available when it can prevent a return or sleep comfort miss, operation outside modeled equipment limits, or a modeled freezing concern. If only protection can be verified, the plan identifies the remaining comfort shortfall.
- The thermostat adjustment is manual in the Micro-Air app. Windows and MaxxFans retain their physical setup during absence. Surface condensation remains advisory. Current protections screen coil icing and use an indoor temperature floor. The model does not predict plumbing compartment temperatures.

# v6.6.1 — Heating and cooling recovery

Measured indoor temperatures and manual outdoor temperature controls have no arbitrary minimum or maximum. Missing or nonfinite indoor readings are rejected; equipment eligibility checks and thermostat control/setpoint ranges remain separate. Recovery tests cover conditions below 40°F and above 110°F.

Cold or hot measured starting temperatures now enter a recovery phase. Heating can warm a coach that starts below 65°F; AC can continue cooling beyond 30 minutes. Equipment and moisture checks remain enforced. Plans report estimated recovery time or unfinished recovery and carry temperature and moisture continuously through departure and later stages. After recovery, the existing comfort checks apply.

Recovery options rank by time to reach the acceptable bedroom band, then normal comfort preferences. If the available HVAC cannot produce a verified comfort plan, an equipment-eligible action that improves on leaving HVAC off is shown separately, with a review time and capacity/forecast limitation. Thermodynamic constants are unchanged.

# v6.6.0 — EasyTouch 350 independent AUTO setpoints and owner-configured gaps

- Replaced the old CCC2-style single AUTO midpoint / ±2°F activation assumption. AUTO HEAT PUMP and AUTO FURNACE are modeled with two independent programmable integers: HEAT TO and COOL TO, displayed explicitly in proposed plans and instructions.
- Owner-confirmed fixed Temperature Differential Gap values: HEAT 2°F, COOL 2°F. These are engineering constants in the model, not user inputs. The model starts heating at HEAT TO minus 2°F and ends near HEAT TO plus 1°F. Cooling starts at COOL TO plus 2°F and ends near COOL TO minus 1°F. Micro-Air's reference manual explicitly illustrates heating termination; cooling termination is inferred by symmetry, and remains unverified for the actual equipment.
- Optimizer searches independent heat/cool pairs. The Advisor enforces at least 4°F between COOL TO and HEAT TO as a conservative planning guardrail, not a manufacturer-published firmware constraint. Micro-Air illustrates 68°F heat / 72°F cool but does not document its minimum accepted separation.
- AUTO FURNACE is a distinct modeled mode; AUTO HEAT PUMP continues to honor the configured 42°F LP-furnace outdoor changeover. The new PWA version invalidates the old cached application. Historical notes below are superseded where they refer to a shared AUTO midpoint.
- OEM reference: [Micro-Air EasyTouch RV 350 Reference Manual, Operational Modes and Temperature Gap (Hysteresis)](https://www.micro-air.com/support-documents/EasyTouchRV/EasyTouchRV_350_Manual_2.0.pdf).

# v6.5.1 — Micro-Air EasyTouch 350 thermostat and owner-selected 42°F gas changeover

- **Installed control:** Micro-Air EasyTouch RV 350 replaced the factory Dometic CCC2 display. On November 15, 2026 the owner set **Auto Gas Changeover Outside Temperature Setpoint** to **42°F**.
- **Mode distinction:** EasyTouch exposes Cool, Heat Pump, Furnace, Auto Heat Pump and Auto Furnace (plus Fan Only). Auto Heat Pump selects cooling or heat-pump heating based on demand, and the existing Dometic CCC2 controller can automatically route heat-pump heating calls to the LP furnace below the 42°F outdoor-sensor threshold. Auto Furnace instead selects cooling or furnace heating, with no heat-pump heating. Source: [Micro-Air 350 Reference Manual, Operational Modes and Unique Features](https://www.micro-air.com/support-documents/EasyTouchRV/EasyTouchRV_350_Manual_2.0.pdf); [Dometic CCC2 Operating Instructions, Auxiliary Heat](https://media.dometic.com/externalassets/thermostat-control-box-ccc2_64755.pdf).
- **Simulation update:** Both HEAT PUMP and AUTO HEAT PUMP use furnace heat, the furnace's 70% rear / 30% front distribution and its 19,000 BTU/h nominal output below 42°F. At or above 42°F, they use the heat-pump model. Manual FURNACE always uses propane; COOL does not heat. Regressive defrost tests retain a separate simulated 30°F threshold to test the old Dometic behavior without overriding the RV's live setting.
- **Model limitations:** Micro-Air AUTO uses two separate heat and cool setpoints, while the present Advisor AUTO optimization still uses its historical single-setpoint ±2°F control law. The separate AUTO FURNACE mode is not yet offered as its own planning candidate; FURNACE-only remains available. The precise hysteresis for returning from gas to heat pump after a programmable 42°F changeover was not established in Micro-Air's documentation, so the model currently assumes one 42°F boundary. Do not interpret its timing near that boundary or its AUTO setpoint predictions as exact thermostat behavior.
- **Deployment:** PWA version is 6.5.1 to invalidate older offline assets. Prior release notes below describe historical behavior where they conflict with these changes.

# v6.5.0 construction-based body envelope

- Rebuilt the RV body behind the Ford cab from separate wall, roof, floor, door, roof-opening, window and leakage terms. The total is independently calculated rather than constrained to the legacy whole-vehicle UA.
- The manufacturer R-18 shell claim is now a working simulation case. Floor R-8 and unverified door/opening values are explicitly engineering assumptions, with reduced and stronger assembly cases tested independently of the cab.
- All three body cases are crossed with all three weather/airflow/cab cases. Selected plans must pass nine trajectories. Existing comfort, target, equipment and unattended-operation policies are unchanged.
- Nominal body UA changes from 74.80 to 64.56 BTU/(hr·°F); nominal whole-vehicle UA changes from 136.57 to 126.33 before wind. These remain estimates, not measured accuracy claims.
- Opaque solar transmission follows exposed component conductance; no direct underside solar gain or marine-vinyl insulation credit is invented. Fixed thermal storage remains 273.14 BTU/°F.
- See [model-assumptions.md](model-assumptions.md) for the factory/patent evidence, dated contradictions, geometry, formulas, explicit assumptions, uncertainty cases and validation. Prior version notes below are historical.

# HVAC Advisor

## v6.4.1 — construction evidence and envelope sensitivity

- Audited the source drawings, model-specific manual and manufacturer R-18 shell-insulation claim. The geometry supports the existing enclosure area within rough drawing precision; the sources do not establish a measured whole-coach UA. The retained nominal 136.57 BTU/(hr·°F) is a working estimate, not a certified R-value conversion.
- Corrected the cab-loss sensitivity: it now changes total heat loss (119.52–153.63 before wind) while holding RV-body conductance fixed. The duty/capacity calculation uses the same scenario load as the zone temperatures, with baseline infiltration counted once and thermal storage held fixed.
- Opaque solar gain now follows body/cab conductance under a common mean exposure assumption. The nominal aggregate gain and separate glazing/shade coefficients are retained; uncertain cab conduction also affects cab solar transmission.
- Calculation details show an R-18 walls/roof-only comparison of 118.74 BTU/(hr·°F), keeping the floor, cab, glass and leakage assumptions. This is an optimistic sensitivity comparison rather than a qualified operating scenario. See [model-assumptions.md](model-assumptions.md) for variables, formulas, evidence, confidence and limitations.

Earlier notes are historical where superseded below.

## v6.4.0 — bedroom priority, duct distribution and selected control settings

- The bed area determines comfort and target fit during awake, unoccupied and sleeping periods. The front sensor remains the thermostat input. Plans that also keep the dinette within its band rank first among bedroom-qualified plans; otherwise the output identifies the dinette miss.
- Each current, departure, preparation and overnight setup searches thermostat settings along with mode and fan. The old settings are starting candidates, not fixed requirements. No universal furnace offset is applied. Every selected setting is checked in all three scenarios and remains fixed during an absence or overnight interval. AUTO retains its actual ±2°F triggers and returns to its selected setpoint.
- The supplied scale drawing and 73-inch beds establish approximate served volumes: 431 ft³ rear and 533 ft³ front, including the open Ford cab. Overhead delivery follows those volumes (about 44.7% rear / 55.3% front); furnace delivery follows the owner’s 70% rear / 30% front instruction. Cab envelope losses and solar gains are assigned to the front separately from the insulated RV body.
- Total closed-coach UA remains 136.57 BTU/(hr·°F). Historical manufacturer advertising cites R-18 insulation lining, but does not establish an assembly rating for this model or the Ford cab. See [model-assumptions.md](model-assumptions.md) for sources, geometry, relative cab-loss assumptions, sensitivity cases and search limitations. Magneshades receive solar reduction only. Cabinet-void thermostat isolation defaults to planned; marking it installed adds no invented temperature offset or coach-insulation credit.

Earlier release notes below describe historical behavior and are superseded by this section where they differ.

## v6.3.0 — independent comfort bands and preferred targets

- Exactly two comfort policies: occupied sleep uses 65–69°F with a 67°F target; awake and unoccupied periods use 68–73°F with a 71°F target. Sleep/preparation thermostat settings cannot change the applicable band. Sleep ends at exactly 7 AM.
- Equipment, moisture, temperature and readiness checks qualify plans first. Among qualified plans, temperatures within ±0.5°F of target receive no target penalty. Heating, cooling and MaxxFan ventilation favor cooler-side misses. Closer temperatures on that side rank better. OFF and idle AUTO use neutral distance.
- Target preference is integrated over time (both zones while non-sleeping; bedroom while sleeping), retaining the least favorable scenario result. Departure comparisons score only the departure interval. Cached continuations preserve all target history. Natural recovery, humidity/draft scores and existing mode preferences break target-fit ties.
- Bedtime readiness uses the sleeping band for every mode; target fit ranks acceptable misses rather than disqualifying them. Thermostat settings, capacities, equipment limits and existing excursion-duration rules remain unchanged.

## v6.2.0 — occupied, departure and sleep stages

- Leaving plans evaluate one occupied setup from the run time to departure, then a separate fixed setup from departure through return. Current and departure alternatives are collapsed and have explicit intervals. If a different initial setup is needed to make the absence feasible, it is evaluated with continuous state; alternatives never reset departure conditions.
- The departure setup stays unchanged throughout the absence, including when remote controls exist. It can be physically configured immediately before departure. Predicted bedroom/front temperature and RH at return are shown, followed by a request to rerun with fresh readings. No separate return-mode recommendation is presented.
- Sleep begins at the later of 10 PM and a return that overlaps the sleep period, and ends at 7 AM. An absence through or beyond 7 AM is evaluated through return and omits that night's sleep recommendation. Occupant sources are zero while away and resume at return; sleep metabolism starts at the adjusted sleep time. Earlier returns retain the 10 PM preparation deadline.
- Projected overnight modes and collapsed alternatives retain the recommended occupied/departure trajectory and any explicitly shown post-return preparation. A fixed departure mode that cannot cover the absence is never presented as verified. Preparation cannot require an adjustment during the absence. Thermodynamic constants and equipment operating limits are unchanged.

## v6.1.0 — daytime and overnight comparisons

- Two planning periods: awake 7 AM–10 PM and unattended sleep 10 PM–7 AM. No 7–10 AM or 7–10 PM transition gate. Natural recovery is checked throughout awake hours; preparation is calculated against the 10 PM deadline.
- Daytime alternatives must pass continuously until the next displayed adjustment (or the bounded review time). A later switch to AC cannot qualify an otherwise unsuitable daytime heater. An idle heater is labeled unnecessary. Choosing another daytime option requires fresh readings and a rebuilt plan at the end of that interval.
- Projected overnight alternatives retain the recommended daytime and preparation phases. All use identical predicted bedtime heat/moisture state and carried exposure history in each scenario, and must pass through 7 AM with one fixed setup. Alternatives requiring different preparation are not silently substituted.
- Nighttime runs compare only the remaining night. If no verified bedtime preparation is available, overnight comparisons explicitly await reassessment. Physical constants and equipment limits are unchanged.

The preparation planner now checks missed five-minute intervals and can cool before selecting a heating-only overnight setup. Overnight plans require no manual changes or automatic furnace backup. Heat-pump operation follows the documented 30°F changeover, with explicit defrost pauses and a documented estimated capacity decline; humidity no longer invents a 45–50°F equipment lockout. AUTO bedtime readiness distinguishes normal cycling after reaching the cooling target from an actual preparation miss. See model-assumptions.md for equations and limitations.

The v6.0.1 humidity repair treats the small coach as one mixed moisture volume, per the owner's instruction. Paired temperature/RH inputs initialize the prediction; both temperature forecasts remain, with one predicted dew point and RH derived at each local temperature. A front/rear moisture bottleneck cannot disqualify equipment.

The established 20-pint/day dehumidifier rating is reproduced at 65°F/60% RH using the published NREL generic capacity/energy-factor curves, with separate finite-capacity humidistat runtime and actual operating heat. Occupant sensible and latent loads use a consistent activity budget. Roof-AC latent availability counts its single evaporator airflow once. These assumptions and primary sources are documented in [model-assumptions.md](model-assumptions.md). Condensation remains advisory-only; existing comfort and equipment policies remain enforced.


Phone-focused single-file HVAC advisor for the Coach House Platinum III 250 DT. Hosted as a static PWA; `index.html`, `sw.js`, the manifest, and the icons are the deployment files.

## v6.0.1 — useful current guidance when the overnight outlook has a shortfall

- A failed overnight comfort forecast no longer suppresses a separately verified current setup. The fallback checks all three scenarios over the same next 30 minutes, or until departure/7 AM if earlier. It gives an exact review time and expires there. It does not prescribe a rejected overnight sequence or certify an upcoming absence. The separate overnight outlook names its assumed mode/setting and bedtime status. Verified natural morning recovery retains priority over active heating in current guidance.
- Estimated elevated cold-surface RH is an advisory, distinct from room-air humidity. It shows estimated timing, predicted room RH, and a request to check readings/windows. Condensation and surface-RH estimates are warning-only: they cannot affect eligibility, ranking, early stopping or preparation timing. Equipment limits, the 65°F floor and the sustained room-RH limit remain enforced. Indoor dew point is derived from temperature/RH and displayed without an additional ranking penalty.
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


