# v6.6.15 — WP11 two-node storage, calibrated to the owner's garage test

- **Two-node zone storage.** Each zone now has a fast air node (air plus surfaces and light furnishings) and a slow mass node. HVAC, conduction, infiltration, ventilation and internal gains act on the air node, and solar splits 50/50. The thermostat and YoLink comparisons use the air node.
- **Calibrated to field data.** Values are fitted to the owner's November 16, 2026 YoLink garage run, with the front and rear sensors measured during heat-pump warm-up and cool-down. Air storage is 290 BTU/°F and mass storage 565 BTU/°F, with a 0.95 h coupling. The rooftop unit's ducted air goes **38% to the rear** (previously 45% by volume), and the effective buoyant mixing width is 1 ft. The model reproduces both sensors within 0.25°F RMSE. See [the calibration](model-assumptions.md#v6615--wp11-two-node-storage-calibrated-to-the-garage-test).
- **Effects.** Recovery from very hot or cold starts takes longer. Modeled heat-pump cycles run about 4 min on and 15–20 min off at 45°F, instead of very short cycles. Steady cool nights (45–56°F) now produce qualified overnight heating plans. With occupants asleep in the rear, the bedroom is predicted to run warmer than the front sensor overnight.
- **Not calibrated:** the furnace's 70% rear outlet split, overnight occupied behavior, and the separation of heat-pump output from envelope heat loss (one test cannot separate them).
- Planner runtime: the reconstructed full-night staying search takes 343 s on the 2-core reference machine, up from 272 s (+26%). It explores the same number of plans.

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


