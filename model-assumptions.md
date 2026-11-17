# v6.6.13 — WP6 capacity comparison

Comparison only. The experimental path is enabled by an explicit comparison envelope, with separate solver/cache state. The active app still uses its existing heating and cooling capacities and changeover policy. The EasyTouch outdoor reading is optional and logged as observed; it does not drive the solver.

## Owner-selected equipment assumption, November 17, 2026

Jeff selected B59186 as the working model after reviewing the available candidates and explaining that retrieving the nameplate is difficult. The exact installed model remains unverified. Use the B59186 Brisk II family for this application, with 459186 retained as a plausible family alternative. Control compatibility supplies the technical basis; search visibility and retail listings are supporting context.

The nameplate is optional corroboration for this project. Its absence no longer blocks completing the comparison. The D2 decision on adopting experimental heating and cooling performance follows review of the full planner results.

Use 15,000 BTU/h nominal total cooling and 280 CFM nominal high-fan airflow. The 2,822 W heating anchor at 7°C remains a related-model proxy, with sensitivity from 0.85 to 1.25 times the anchor, approximately 8,185–12,036 BTU/h. This is an engineering sensitivity range, not a published spread between B59186 and 459186. Preserve the 200–290 CFM airflow sensitivity and report invalid coil combinations explicitly. Installed airflow, delivered heating and net blower-heat accounting remain uncertain.

## Sources and assumptions

- The [Dometic installation manual](https://media.dometic.com/externalassets/brisk-ii-evolution-15k-with-heat-pump_9105304481_71275.pdf) confirms 15,000 BTU/h nominal cooling and a 29.0 oz R-410A charge for the candidate models in its table. Multiple configurations share those values; the owner-selected B59186 assumption is recorded above.
- The scope's 2,822 W heating anchor at 7°C comes from the related B59196 rating. The original product listing was unavailable during implementation. The anchor is a tier-4 proxy carried forward from the approved comparison scope, with low-to-medium confidence for the installed unit. The 280 CFM high-fan value is a [retailer proxy](https://steedtrailerparts.com/product/dometic-air-conditioners-b59196-xx1c0-brisk-air-ii-heat-pump-15k-btu/), with low confidence for installed duct airflow. The scope's separate 295 m³/h figure has an unverified basis and is not treated as evaporator airflow.
- Curves are pinned to [EnergyPlus v24.2.0, EMSCurveOverride_PackagedTerminalHeatPump.idf](https://github.com/NREL/EnergyPlus/blob/v24.2.0/testfiles/EMSCurveOverride_PackagedTerminalHeatPump.idf), objects HPACCoolCapFT, HPACCoolCapFFF, HPACHeatCapFT and HPACHeatCapFFF. These are example shapes from a technical reference, not measured Dometic curves. Input domain clamps are flagged. The estimated condenser roof increment is zero nominally and can be tested through 10°F times the existing solar fraction.
- Cooling uses a gross-coil comparison boundary with 15,000 BTU/h at 27°C dry bulb, 19°C wet bulb and 35°C outdoors. The 95% leaving RH assumption gives rated bypass factor 0.0712 and SHR about 0.658, or about 9,863 BTU/h sensible and 5,137 latent. This is inferred from the psychrometric balance, not a factory SHR. Airflow adjusts bypass factor by the NTU relation. The modeled condensate rate follows dry-air mass flow times the humidity-ratio drop. The comparison assumes full sensible output when the apparatus dew point is above the entering dew point. An installed net blower-heat correction has not been measured.
- The cooling sensitivity inputs cannot be sampled independently as written. At 200 CFM, both 90% and 95% rated leaving RH yield no saturation intersection with the inlet-to-outlet process line. At 95%, the minimum separation is approximately 0.000047 lb/lb of dry air at 29.24°F. At 98% the bypass factor is valid, about 0.049. These are model feasibility results, not installed measurements. The model reports invalid points and applies no replacement. The later sampled design needs an explicit decision on correlated or feasible-only draws.
- Heating normalizes the example curve at 7°C and preserves 2,822 W at high reference airflow. Low/medium flow fractions of 0.68/0.82 and the −15%/+25% heating sensitivity are approved comparison assumptions. The reference heating curve uses a 9,629 BTU/h approximate anchor compared with about 13,800 BTU/h in the existing model near 44.6°F.
- The experimental changeover uses outdoor scenario air as a proxy for rooftop sensor temperature. Switch to furnace at or below 42°F plus the tested offset and switch back only above that threshold plus the tested hysteresis. Initial source is an explicit input for sensitivity. Furnace-only and AUTO FURNACE dispatch remain separate. Test cases include both initial sources and both extremes of each input. The original cooling eligibility rules continue to govern the comparison runs.

## Comparison runs

Run `node tools/compare-capacity.cjs` under Node 24. It prints the highest-ranked of the six fixed closed-coach defaults with the approved initial recovery settings, plus the sensitivity results. Run with `--full --case=<fixture-name>` to use the normal plan search independently for the current and experimental models. These controlled fixed-setup results do not establish the result of the full scheduler. Exact phase settings, furnace minutes, recovery, water residual and qualifying alternatives are in the runner output. The hot profile is synthetic and uses the existing solar geometry, which has no heading input yet. No comparison results have independent field validation.

| Fixture | Highest-ranked fixed setup, current → experimental | Minimum bedroom, current → experimental | Experimental qualification |
| --- | --- | --- | --- |
| March Winterset, historical | AUTO → AUTO | 66.54 → 66.54°F | Fails warm duration |
| October 2025 Winterset, reconstruction | COOL → COOL | 70.13 → 70.16°F | Fails warm duration |
| May Winterset, reconstruction | OFF → OFF | 64.99 → 64.99°F | Fails warm duration in at least one member |
| October Winterset, saved forecast | COOL → COOL | 70.22 → 70.25°F | Fails warm duration |
| Surface advisory, synthetic | OFF → OFF | 65.04 → 65.04°F | Qualifies; FURNACE also qualifies |
| Bedtime preparation, synthetic | OFF → OFF | 70.22 → 70.22°F | Fixed setup fails; requires timed search |
| Hot afternoon, synthetic | OFF → OFF | 78.00 → 78.00°F | Fails recovery |
| Falling temperatures, synthetic | HEAT PUMP → HEAT PUMP | 65.32 → 65.32°F | Fails warm duration |
| Rising temperatures, synthetic | HEAT PUMP → HEAT PUMP | 65.23 → 65.23°F | Fails warm duration |

The evaluated sensitivities did not change the highest-ranked fixed mode or complete fixed qualification. Selected nominal furnace minutes rose by up to 7.21 min in the March sensitivity cases and 6.81 min in the falling-temperature case. The rising-temperature case used 16.59 min of furnace on both nominal models. The comparison logs runtime, not fuel volume.

The full synthetic surface-advisory search also selected the same qualified AUTO HEAT PUMP plan (HEAT TO 67°F, COOL TO 71°F, Low fan) with a 65.41°F minimum in both models. AUTO FURNACE and FURNACE qualified as alternatives. Other full searches remain pending. D2 remains pending full plan review and the owner’s performance-release decision. The incompatible cooling input combinations are also open. No production switch or coil eligibility change is included.

# v6.6.12 — WP5 forecast precision and altitude

NWS grid estimated site elevation in meters supplies standard-atmosphere pressure, P = 101325 × (1 − 2.25577e−5 × z)^5.25588 Pa. Missing or implausible elevation uses the labeled sea-level fallback. The modeled range of valid site elevation is −500 to 9,000 m, an engineering sanity check. The grid elevation is an official estimate and may differ from the actual parking spot. This is an engineering pressure approximation without observed barometric pressure. At 1,000 m it gives about 89.9 kPa and raises modeled humidity ratio at 70°F/50% RH to about 1.13× its sea-level value.

Airflow volume remains in CFM. The density ratio is P/101325 multiplied by the absolute temperature ratio relative to 70°F. Apply the ratio once when converting outdoor or interzone CFM to sensible conductance or atmospheric airflow to dry-air mass flow. The existing 1.08, 4.5, 0.075 and 1.2 reference values are modeling conventions, not new measurements. The baseline leakage term is removed at reference density from the existing envelope UA before adding its live airflow term. Zone dry-air storage uses initial zone density and stays fixed through the horizon, preserving the existing shared water inventory. Outdoor moisture transport uses outdoor density, evaporator transport uses front-return density, and mixing conductance uses mean indoor density. Pressure also sets the psychrometric conversions used by the humidistat, coil checks and surface advisory. The legacy analytical routines retain reference defaults when pressure is absent.

Grid wind and gusts are converted to mph. Valid zero is calm, while missing speed can use the low end of the existing forecast-text range. When both are missing the existing zero-mph preview default is labeled in the diagnostic and logged as missing. Grid sky cover supplies the existing solar factor through 1 − sky percent/100. Missing values use the prior text mapping, or its existing 0.6 default when period text is unavailable. Solar geometry is the existing estimated model. Temperature and RH still require full coverage. Weather intervals include starts and ends, retain decimals, and preserve the rain humidity floor. Exact 42°F heat-source dispatch remains unchanged. NWS grid data is official, while fallback and rendering choices are engineering conventions. [NWS API](https://www.weather.gov/documentation/services-web-api)

## WP4 follow-up validation

Concurrent cooling with dehumidifier removal limits thermal/moisture substeps to 7.5 seconds. This is a numerical resolution control, with other operating conditions using the normal integration step. The convergence test compares normal and 15-second scheduling against a separate 3.75-second reference, retaining the existing 0.05°F tolerance and water/runtime checks.

The original synthetic fixtures remain available in v6.6.11 history. They cannot be used as positive qualification checks on the revised model. The positive condensation case uses a 90-minute synthetic interval with 60°F after the cold start. The positive cooling-preparation case uses synthetic 60°F overnight weather, 1°F cooler than the earlier fixture. The test criteria and model limits are unchanged.

## Controlled before and after

This fixed-setup comparison reruns the checked-in pre-WP5 inputs with the same nine-case solver and six closed-coach default settings. It measures solver effects only, since the archived inputs lack the new grid wind/sky fields and elevation. The nominal minimum may be from a terminated trial. These are simulated values without independent field validation.

| Fixture | v6.6.11 | WP5, original inputs |
| --- | --- | --- |
| March 24 Winterset historical weather | AUTO, 0/9, minimum 68.44°F | AUTO, 0/9, 68.46°F |
| October 1, 2025 reconstructed weather | COOL, 0/9, 70.54°F | COOL, 0/9, 70.53°F |
| May 8 reconstructed weather | OFF, 0/9, 71.17°F | OFF, 0/9, 71.17°F |
| October 23 Winterset saved forecast | COOL, 0/9, 72.00°F | COOL, 0/9, 72.00°F |
| Synthetic surface advisory | AUTO, 8/9, 67.38°F | AUTO, 8/9, 67.37°F |
| Synthetic bedtime preparation | OFF, 0/9, 72.00°F | OFF, 0/9, 72.00°F |

# v6.6.11 — WP4 internal heat sources and window sides

WP4 updates the spatial sources in the live two-temperature simulation. The previous model allocated the 313.49 BTU/h sleeping-occupant sensible load as 140.11 rear / 173.38 front. A 640 BTU/h example dehumidifier contribution was 286.04 rear / 353.96 front. Both used the volume split (431.11 / 533.46 ft³; 44.6945% rear). The new model allocates that sleeping load entirely to the rear and the measured-state dehumidifier model's electrical plus condensation heat entirely to the front. Awake sensible heat retains the volume split. Occupant vapor and dehumidifier water removal still use the common moisture balance.

| Source | Placement and schedule | Basis and confidence |
| --- | --- | --- |
| Occupants | Existing sensible load, shared by volume awake and entirely rear asleep. Zero when away. | Owner observation for location (high). Existing activity load and awake allocation are engineering estimates (medium). |
| Midea Cube | Existing humidistat and electrical plus latent-to-sensible output, entirely front. | Owner-confirmed location (high). Output uses the existing engineering model (medium). |
| MultiPlus 12/3000/120-50 | 20 W standby in the rear, continuously. Additional conversion loss is 0 until an AC load is modeled. | OEM 120 V MultiPlus datasheet for standby (high at its rated condition). Installed operating mode is unconfirmed (low for actual draw). Scope bound 8–30 W reserved for WP13. [OEM datasheet](https://www.victronenergy.com.au/upload/documents/Datasheet-Multiplus-inverter-charger_2kVA-and-3kVA-120V-US-EN.pdf) |
| Cerbo GX and GX Touch | 6 W continuously in the front. | Community examples and provisional placement (low). Scope bound 4–7 W reserved for WP13. |
| Phones | 40 W in the rear for the first two hours of occupied sleep, starting at delayed return when applicable. An overnight rebuild uses the same 10 PM local charging start unless delayed return is known. | Engineering assumption (low). Scope bound 20–60 W reserved for WP13. |
| Refrigerator | 0 W into the modeled interior. | Owner reports outward venting (high). Neglecting incidental interior heat is a simplification (low). |
| Furnace | Retains 70% rear, 30% front. Two rear outlets serve the aisle and bathroom, and the front outlet is under the sink. | Owner-reported outlet geometry (high). The fractional split is an engineering estimate (medium), with 60–85% rear reserved for WP13. |

Power conversion is 3.412 BTU/h per watt. The entry-door side now has Jeff's bedside panes and the sink pane. The driver side has Kim's pane and the two dinette panes. This is an owner observation (high). The existing opposite wind pressure signs and bedside draft weighting remain engineering estimates. Solar glazing and shade calculations are independent of the window-side correction in this release.

## Before and after

This controlled comparison uses each checked-in weather fixture, the same paired starting readings and all nine scenarios, with only the six default closed-coach fixed setups and the existing initial recovery adjustments. The result is the highest-ranked fixed setup, so it does not establish the recommendation of the full search. Temperatures refer to the nominal run through its verified end or stopping point. The historical starting readings for March, October 2025 and May use the existing reconstructed 72°F / 72°F and 54% / 52% RH pair.

| Fixture | Before v6.6.10 | WP4 | Binding change |
| --- | --- | --- | --- |
| March 24 Winterset, historical ERA5 | AUTO, 0/9 qualified, 69.87°F nominal minimum | AUTO, 0/9, 68.44°F | Sustained severe bedroom warmth remains binding. |
| October 1, 2025, historical reconstruction | COOL, 0/9, 72.00°F | COOL, 0/9, 70.54°F | The highest-ranked fixed trial now hits the severe warm-duration limit. |
| May 8, 2026, historical reconstruction | OFF, 0/9, 71.38°F | OFF, 0/9, 71.17°F | Sustained severe bedroom warmth remains binding. |
| October 23 Winterset, saved forecast | OFF, 0/9, 72.00°F | COOL, 0/9, 72.00°F | The highest-ranked fixed setup changes. Daytime bedroom warmth still prevents full qualification. |
| Synthetic surface advisory | AUTO, 9/9, 67.11°F | AUTO, 8/9, 67.38°F | One case now remains above the sleeping band. |
| Synthetic bedtime preparation | OFF, 0/9, 71.93°F | OFF, 0/9, 72.00°F | This fixture needs a timed preparation search. The fixed-plan result remains unqualified. |

Source-allocation, delayed-return charging, pressure direction, moisture balance and cache parity are covered in the targeted tests. No independent field temperatures validate these predicted changes. In the wet-cooling convergence fixture the nominal 30-second run ends at 68.293°F, compared with 68.188°F at 15 seconds and 68.140°F at 7.5 seconds. The 0.153°F difference exceeds the existing 0.05°F regression threshold. The tolerance and model inputs remain in place for investigation. The full closed-coach search also no longer yields a qualified winner in the synthetic surface-advisory fixture. Its invariant comparison is therefore blocked at the qualification precondition. The recorded warning still does not gate the solver. The targeted three-stage COOL preparation fixture also no longer produces a qualified overnight heating sequence. These three checks are release blockers, and the full suite and browser checks require completion before deployment.

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

Run logging observes planner inputs and outputs. The queue snapshots the weather inputs used by the current planner, keeps forward-planning values separate from measured indoor readings, and records the nominal prediction when the requested sample is in a verified trace. Weather fields unavailable in the current model and fields belonging to later work packages are recorded as missing. Logging settings and credentials stay on the main thread. The logging client follows the positive R1a acknowledgement test on the owner’s Pixel.

# v6.6.5 — WP0 test baseline

This release restores the checks used for the November 16 model scope. Model parameters, eligibility, control and ranking carry forward from v6.6.4. The app and service worker use the new version for deployment and cache checks.

| Fixture | Baseline finding | Coverage in v6.6.5 |
| --- | --- | --- |
| March 24 Winterset, historical weather | The completeness assertion failed on the PR #16 head and main. In a direct closed-coach run seven scenarios passed. One stayed above 69°F for more than 30 minutes and a second stayed above 70°F for at least 15 minutes. | The historical inputs remain archived. A distinct synthetic two-hour cold-start period verifies that a qualifying nine-scenario plan reaches the end, shows an actual modeled surface warning, and gives identical decisions and trajectories when surface warnings are suppressed or intensified. |
| October 23 synthetic manual-weather morning | OFF and passive recovery have the same target score. The selected setup calls for no heat in all nine scenarios. The former heating-call expectation was stale. | Assert OFF, zero heating and target fit at least as good as the passive comparison. Separate cold-bedroom coverage verifies an actual heating requirement. |
| October 23 Winterset evening | The outdated scalar check still expected a single AUTO setting. EasyTouch AUTO uses two independent whole-degree settings. | Verify both AUTO settings against the existing bounds and spacing rule, verify single-mode settings against their ranges, and retain all nine checks for bounded current guidance when a full plan falls short. |
| May 8 Winterset preparation | The baseline browser Worker rejected the historical complete-plan expectation. | A synthetic evening exercises cooling preparation followed by heat, with all nine scenarios and the full overnight horizon. The timing-island, cache continuation and away-action coverage stays in the suite. |

Sources are the repository fixtures, the planner call path and GitHub Actions runs [PR #16](https://github.com/jeffcarp94/hvac-advisor/actions/runs/43953760286) and [main](https://github.com/jeffcarp94/hvac-advisor/actions/runs/43954347430). The two synthetic fixtures use assumed inputs. They provide no independent field validation of temperature, condensation or preparation timing.

# v6.6.4 cabinet isolation and remote-action policy

Cabinet isolation is installed and recorded without applying an additional modeled temperature offset. Remote access defaults on and means the EasyTouch has Wi-Fi and can be reached in the Micro-Air app. Currently-away mode requires fresh readings and the confirmed physical setup. HVAC Advisor supplies guidance and does not operate the thermostat.

The planner first seeks a complete zero-remote-action plan. An in-person change may occur at departure, return, or before sleep. If a fixed setup falls short at return or for sleeping comfort, or presents a modeled equipment operating-limit or freezing concern, the planner may verify one timed thermostat mode, setpoint, or fan change during the absence. A daytime temperature excursion alone, energy savings, or a smaller target deviation does not justify it. The existing away comfort band still applies; the protection exception can be shown separately as a partial plan with the remaining comfort shortfall. Setup and exposure carry across the action. Windows and MaxxFans stay as configured, and no manual change is planned during sleep. Freeze-related inputs are the modeled evaporator icing screen and existing 65°F indoor protection floor. Neither establishes temperatures at tanks, pipes, or compartments.

# v6.6.1 — Initial temperature recovery

Measured indoor temperatures and manual outdoor temperature controls have no arbitrary minimum or maximum. Missing or nonfinite indoor readings are rejected; equipment eligibility checks and thermostat control/setpoint ranges remain separate. Recovery tests cover conditions below 40°F and above 110°F.

Owner-approved November 15, 2026: initial cold/hot conditions are recoverable states, not automatic equipment disqualifications. Appropriate active heating/cooling may begin outside the comfort band, including below 65°F, without a fixed 30-minute deadline. Initial recovery ends at the first entry into the applicable bedroom comfort band. It is never reset by departure, return, mode changes, or cached simulation continuation. Subsequent temperature failures remain failures. Equipment and room-air moisture checks are unchanged.

Recovery timing and progress are evaluated across all sensitivity scenarios. Completed recovery ranks ahead of unfinished recovery; faster completed recovery, or greater progress over a common unfinished interval, ranks ahead of steady-state preferences. The UI distinguishes a recovery trajectory from guaranteed comfort. A separate limited-action fallback compares equipment-eligible HVAC against HVAC off when no current plan qualifies. It does not certify departure or overnight comfort. No heat-transfer, capacity, solar, or thermal-mass constants changed.

# v6.6.0 — EasyTouch RV 350 dual-temperature AUTO controls (current policy)

**Actual owner settings confirmed November 15, 2026:** Auto Gas Changeover Outside Temperature Setpoint 42°F; Temperature Differential Gap HEAT 2°F and COOL 2°F. These are constants, with no user-adjustable gap UI.

The Micro-Air 350 manual, *Operational Modes → Auto Modes*, documents independently programmable HEAT TO and COOL TO setpoints in both Auto Heat Pump and Auto Furnace. *Settings Screens → Temperature Gap (Hysteresis)* illustrates heating starting at HEAT TO minus the gap and ending at HEAT TO plus 1°F. The model extrapolates that heating rule to a 2°F gap. Cooling starts at COOL TO plus 2°F and, **as an explicitly labeled unverified symmetric engineering assumption**, ends at COOL TO minus 1°F. This is not a certified cooling control cycle table.

Auto Heat Pump heats via the rooftop heat pump at or above the 42°F outdoor changeover setting and via propane furnace below it; Auto Furnace always heats via propane. Both select air conditioning for cooling. Their AUTO modes have no single shared midpoint.

Every proposed pair uses whole degrees, with a conservative 4°F minimum between COOL TO and HEAT TO to avoid contradictory call regions. **The thermostat firmware's actual narrowest allowed spacing is not documented in the retrieved manufacturer manual; 4°F is a planning safeguard, not a claimed OEM limit.** The reference manual's example shows 68°F heat and 72°F cool. The optimizer explores independent values and verifies resulting temperature/moisture histories under all scenario tests. The exact reset hysteresis for the outdoor 42°F gas handoff remains unverified.

OEM source: [Micro-Air EasyTouch RV 350 Reference Manual, Operational Modes and Temperature Gap](https://www.micro-air.com/support-documents/EasyTouchRV/EasyTouchRV_350_Manual_2.0.pdf). The older CCC2 assumptions below are historical when they conflict with this section.

# v6.5.1 — Installed Micro-Air EasyTouch RV 350 and 42°F gas changeover (current policy)

**Actual owner setting (2026-11-15):** The factory Dometic CCC2 thermostat display was replaced with Micro-Air EasyTouch RV 350. The thermostat setting named **Auto Gas Changeover Outside Temperature Setpoint** is **42°F**. Micro-Air's manual, *Operational Modes*, confirms distinct **Auto Heat Pump** (cooling / heat-pump heat) and **Auto Furnace** (cooling / furnace heat) modes, each with two independent heating/cooling setpoints. Its *Unique Features → Auto Gas Changeover* confirms the existing Dometic control board can replace heat-pump output with auxiliary gas heating based on the heat-pump outdoor sensor. The Micro-Air display retains the Dometic controller protocol. See [Micro-Air EasyTouch RV 350 Reference Manual, Revision 2.0](https://www.micro-air.com/support-documents/EasyTouchRV/EasyTouchRV_350_Manual_2.0.pdf) and [Dometic CCC2 Operating Instructions, Special Features → Auxiliary Heat](https://media.dometic.com/externalassets/thermostat-control-box-ccc2_64755.pdf).

**Current heat-source simulation:** For a selected Heat Pump or Auto Heat Pump heating call, use heat pump if outdoor temperature is at least 42°F and LP furnace if below 42°F. The auto-fallback does not represent a manual thermostat mode change; cooling in Auto Heat Pump remains available. For furnace output, apply the existing 19,000 BTU/h nominal furnace capacity and 70% rear / 30% front duct split, rather than heat-pump overhead airflow distribution. Furnace-only continues to use furnace at every temperature. Outdoor temperature is the rooftop heat-pump sensor reading; forecast air temperature is its approximation. Below 42°F the heat pump is not credited with useful heat. At 42°F and above use the existing (uncalibrated) heat-pump capacity model. The Dometic defrost model remains available in simulations where the threshold is lowered to its original 30°F, but under the owner's normal 42°F setting it will not normally activate below 42°F.

**Unresolved differences from the physical controller:** Micro-Air documents AUTO as separate heat and cool setpoints, but HVAC Advisor currently approximates AUTO as an older single-setpoint ±2°F mode, so AUTO timing and selections have not been fully updated to mirror the replacement thermostat. The physical Auto Furnace mode is not yet an independent Advisor candidate. Dometic's original auxiliary-heat hysteresis returned to heat pump above 35°F after a below-30°F trigger; Micro-Air allows the threshold to be moved to 42°F, but its manual does not specify whether a +5°F reset differential is retained. The app currently uses an instantaneous 42°F boundary (no hysteresis). This is an acknowledged engineering approximation, not a verified manufacturer's exact switching algorithm. The 42°F thermostat setting does *not* establish minimum heat-pump hardware survivability or calibrated capacity.

**Supersession:** Older sections below (including v6.0.1, the original 30°F minimum, and statements of no furnace fallback) are historical and superseded for the present installed thermostat. Their defrost and capacity discussions remain useful as documented original-Dometic reference cases, not the owner's current control policy.

# v6.5.0 independently calculated RV-body envelope

This section supersedes the retained nominal body UA, diagnostic-only R-18 comparison, aggregate opaque solar normalization, and three-case descriptions below. Historical release notes remain for provenance. The new model is an engineering estimate informed by construction evidence; it is not a measured thermal calibration.

## Evidence review: molded Platinum family, excluding Arriva

The owner reports a plywood floor with a possible insulation layer and marine-industry woven sheet vinyl. Treat the plywood and finish as owner observations; the insulation layer is uncertain. The exact manufacturer, thickness and backing of the installed finish have not been independently identified. No separate insulation credit is invented for marine branding or a woven appearance.

Sources checked on October 24, 2026:

| Source | What it establishes | Confidence and applicability |
| --- | --- | --- |
| [Coach House current specifications](https://coachhouserv.com/specs-and-options/) | Molded one-piece fiberglass with carbon reinforcement; heavy-duty insulation; aluminum floor framing; frameless jalousie windows; standard premium and optional textured floor finishes. | High for documented common features. The table distinguishes 1.5-inch square-tube floors from 4-inch-channel frames, so sharing construction methods does not mean every dimension is identical. Use the Platinum III geometry and equipment for this RV. |
| [Coach House patent US6782623B1](https://patents.google.com/patent/US6782623B1/en), floor description and Figs. 5–7 | A primary historical section describes aluminum sheet under two bonded half-inch plywood layers, mechanically attached to a tubular subframe; vinyl/carpet finish; bonded perimeter body mounts. | High for the patent's described assembly; low that a 2002-priority patent specifies the 2025 floor. It confirms plywood/metal methods, not today's insulation rating. |
| [2003 factory-visit report](https://magazine.frva.com/2003/12/01/coach-house-platinum/) | One-inch plywood subfloor with aluminum underside; an older steel floor frame; foam and foil-backed insulation descriptions. | Medium for historical construction. Do not transfer steel framing or all layers to a modern coach. |
| [2009 factory-visit report](https://magazine.frva.com/2009/08/01/coach-house-platinum-272xl/) | Hand-laid molded shell; approximately one-inch air-pocket insulation with aluminum faces and interior panels; 1.5-inch aluminum floor grid, aluminum underside and a one-inch lightweight honeycomb composite floor. | Medium for observed methods. Core chemistry and whole-floor thermal resistance are not identified. A honeycomb core is not automatically conventional foam. |
| [2011 construction report](https://familyrvingmag.com/2011/05/01/coach-house-platinum-ii-241xl/) | A 2.5-inch subfloor assembly with honeycomb insulation and aluminum underside; thin double-layer bubble/foil wall/roof insulation; plywood attachment pads. | Medium for historical construction, low for exact current thickness. These descriptions do not reconcile into a verified 2025 layer stack. |
| [2016 factory-tour account](https://familyrvingmag.com/2016/08/01/coach-house-platinum-ii/) | Molded roof/walls/caps, localized carbon reinforcement, internal aluminum framing, insulation and wood cribbing. | Medium-high for shared construction architecture; no thermal assembly test. |
| [2016 Living the RV Dream plant visit](https://www.ivoox.com/en/ltrvd0371-coach-house-rv-audios-mp3_rf_11685592_1.html) | Firsthand visitors report R-18 on the sides and floor. | Medium for the reported claim, low for treating the floor as tested effective R-18; no layer thickness/test method. |
| [Manufacturer 2019 advertisement](https://webcontent.goodsam.com/motorhomemagazine.com/digital_editions/MotorHomeMagazineSeptember2019.pdf), also [2022 manufacturer listing](https://www.frvta.org/wp-content/uploads/SuperShow_2022-web.pdf) | Explicit R-18 insulation lining claim, including the Platinum III. | Medium for using R-18 as a reported shell-insulation working case. It does not certify the installed composite assembly. |
| [2024 Platinum IV construction review, published June 2023](https://familyrvingmag.com/2023/06/01/2024-coach-house-platinum-iv/) | Continued hand-laid/carbon-reinforced shell, interior insulation, aluminum floor framing and a continuous linoleum/textured finish. | Medium for continued common methods. Does not resolve floor core, plywood thickness or assembly R. |
| [Manufacturer factory-video gallery](https://coachhouserv.com/video-gallery-btc/) | Lists factory/build videos including From Fiberglass to Finish, Construction: Built for Comfort, Strength, and Quiet Travel, and Four-Season Motorhomes. | Video links were retrieved, but YouTube embeds/watch endpoints were throttled or disabled. No footage was watched and no transcript was retrieved. Video titles are not treated as proof of a hidden floor layer or rating. |
| [DOE insulation guidance](https://bsesc.energy.gov/energy-basics/types-insulation) | Installation quality matters; reflective surfaces need adjacent air space. | High for the general physical principle; no specific Coach House product/application rating. |

There is agreement on the molded insulated body and an insulated/composite floor construction in multiple historical factory accounts. There is partial agreement, rather than a verified current section, on exact layers and ratings. Older publications also contain R-14/R-28 claims; these are not substituted for the later R-18 claim or averaged into a fictitious rating. The available evidence does not support assuming bare plywood, applying R-18 to every component, or preserving the legacy total merely because it existed. Exact floor performance remains uncertain.

## Component geometry and explicit working values

Use the same owner scale drawing (73-inch bed reference) and 76-inch working body height. Body length is 16.704 ft and width 7.730 ft. These are approximate thermal-envelope dimensions from a drawing, not surveyed inside/outside layer coordinates. The cab opening is excluded from exposed body-front area. No slide-out is added to this owner's floor plan. The shell below the living floor is not double-counted as another conditioned living-space enclosure.

A_body,gross = 2LW + 2LH + WH + max(0, WH − Wcab Hcab) = 535.400 ft². The roof and floor each occupy LW = 129.125 ft². Body glazing remains an unverified 18 ft² (45 ft² total, 60% cab); no unsupported dual-pane credit is added. Estimated entry door: 28 × 72 in = 14 ft². Roof penetrations: three 14 × 14 in cutouts (AC and two closed fans) plus an assumed 18 × 24 in shower skylight = 7.083 ft². These assembly sizes are approximate, not newly verified dimensions; they replace an equal area of shell, not add area to it. Nominal wall area after door and body glass is 245.150 ft²; insulated roof area after penetrations is 122.042 ft².

| Component | Area ft² | Working effective R | Reduced-performance case R | Stronger-floor case R | Basis |
| --- | ---: | ---: | ---: | ---: | --- |
| Insulated body walls | 245.150 | 18 | 9 | 18 | R-18 reported insulation case. R-9 is a deliberate 50% performance sensitivity to installation/air-space/bridging uncertainty, not a measured derating. |
| Insulated body roof | 122.042 | 18 | 9 | 18 | Same claim, separate area. |
| Floor assembly | 129.125 | 8 | 4 | 18 | R-8/R-4 are explicit engineering test assumptions, not calculated from a verified layer stack. They allow appreciably weaker performance than the claimed shell; R-18 tests the stronger historical floor claim. |
| Closed entry door | 14.000 | 5 | 2.5 | 8 | Unverified insulated-door assembly including its weak paths; not shell R-18. |
| Closed roof openings/skylight | 7.083 | 2 | 1 | 3 | Unverified effective closed assemblies; not shell R-18. |
| Body windows | 18.000 | 1 | 1 | 1 | Retained glazing assumption; exact pane/frame properties unverified. |

These are uncalibrated sensitivity cases, not a probability distribution, measured tolerances, worst-case bounds, or a claim that R-4 is the lowest possible floor value. The nominal R-18 shell is an explicit hypothesis drawn from the manufacturer claim, not a newly verified effective assembly rating. The floor R-8 working point is a practical modeling choice within the tested spread; evidence is insufficient to assert that 8 is the actual or most likely installed R. No fictitious plywood/core thickness, insulation brand, backing R, or blanket framing percentage is introduced to give this choice false precision. Door, floor, opening and shell values remain independently editable in the model.

Allocate wall losses to actual front/rear exposed wall lengths; roof/floor to their respective areas. The rear wall belongs to the rear zone; the closed entry door and exposed front body portions belong to the front. Rear glass fraction 0.58 approximates the supplied openable-section inventory, not a measured full-glazing survey. Rear roof-opening fraction 0.70 is an estimated spatial split for the rear bath/vent versus front equipment. These approximations are documented rather than replacing geometry with a single uniform rear/front heat-loss fraction. Overhead equipment delivery remains uniform per served volume, independent of envelope loss; furnace delivery remains 70% rear/30% front.

## Heat-loss calculation and before/after comparison

All R-values use hr·ft²·°F/BTU. For each assembly i, K_i=A_i/R_i in BTU/(hr·°F). Closed-body H = sum(K_i) + Aglass/Rglass + 1.08 Vbody ACH/60. Vbody is ft³ and ACH=0.25/hr is retained unverified background infiltration. Nominal opaque terms are: walls 13.6195, roof 6.7801, floor 16.1406, door 2.8000 and roof openings 3.5417 BTU/(hr·°F). Their sum is 42.8818. Add glazing 18.0000 and background leakage 3.6801: H_body=64.5619.

The former body H was 74.8001, so nominal body heat loss falls 13.69%; it is not forced to match the former result. With the cab held fixed, the reduced/working/stronger body cases are 107.4437 / 64.5619 / 53.3643 BTU/(hr·°F). The retained nominal cab contribution is 61.7714 (opaque 34.1109 + glass 27 + leakage 0.6605). Total nominal H is therefore 126.3333 versus 136.5714 previously, a 7.50% decrease. Cab conductance remains an independent unverified parameter; changing body R cannot alter cab R. Varying cab factors 1.5/3/4.5 now yields nominal-body totals 109.2778 / 126.3333 / 143.3887.

For a solar-free, no-wind 20°F indoor/outdoor difference, sensible body transmission plus baseline leakage is Q_body = H_body ΔT = 64.5619 × 20 = 1,291 BTU/hr, compared with 1,496 BTU/hr previously. Whole-vehicle values are 2,527 versus 2,731 BTU/hr. These are heat-loss comparisons, not furnace input, total HVAC demand including occupants, or a predicted thermostat runtime.

The existing wind multiplier (1+0.02 mph) is retained and remains uncalibrated. Background exchange is removed from the zone conductance before the ventilation network adds it explicitly, so it is counted once. Retained effective thermal storage is an independent 273.1429 BTU/°F, allocated by volume; changing insulation cannot rescale the vehicle's mass. The former two-hour response was tied to the old UA and is no longer used to derive storage from the new UA.

Every selected plan is tested in the Cartesian product of all three body cases and all three existing weather/airflow/cab cases: nine trajectories. Thus body uncertainty is not merely a displayed comparison or tested only with one favorable weather case. Nominal setting screening remains bounded and approximate; full verification applies to selected candidates. The existing moisture, equipment and comfort criteria are unchanged. Higher insulation can preserve unwanted internal heat, so the stronger-floor case is tested as well as the weaker case. This is a finite sensitivity study, not exhaustive assurance against every unknown material/air-leakage combination.

## Solar consistency

Opaque surfaces use Q_solar,i = (A_i/R_i) × (alpha I_peak / h_ext) × exposure_i × forecast/cloud/solar-elevation factor. I_peak=250 BTU/(hr·ft²) is retained; alpha=0.5 is an assumed average opaque-surface absorptance; h_ext=4 BTU/(hr·ft²·°F) is an assumed combined exterior film coefficient. Roof exposure=1, mean vertical exposure=0.5, underside direct exposure=0. These are simplified mean exposures without measured paint/orientation; they do not claim a detailed surface-radiation model. Floor R affects heat exchange but cannot create direct underside solar gain. The [EnergyPlus exterior heat balance](https://bigladdersoftware.com/epx/docs/24-1/engineering-reference/outside-surface-heat-balance.html) supports separating absorbed solar, exterior exchange and conduction; it does not certify these RV coefficients. Explicit night-sky radiation and surface thermal lag remain omitted.

Glass gains retain the separate cab/Magneshade and body/MCD shade coefficients (0.20/0.50 effective SHGC and 0.5 mean exposure). They add about 675/1125 BTU/hr at peak. Nominal opaque contribution becomes about 1,112 BTU/hr and peak total about 2,912, versus the former 4,604. This reduction results from linking solar transmission to actual component conductance and exposure rather than an insulation-independent shell SHGC. The peak is not an observed irradiance or orientation-specific prediction. Changing body/cab conductance changes opaque gain without a renormalization back to the old total. Shade settings still change solar only; they receive no conductive insulation benefit. Thermal storage and internal/equipment gains remain separate.

## Search and changed regression outcomes

Nine-case qualification exposed a cache-related performance bug: daytime coverage had been inferred from retained prefixes, so eviction could erase knowledge of an already verified daytime setup and trigger an unnecessary bridge search. Coverage now comes from the daytime evaluation itself. Timing proposals also receive a nominal half-minute trajectory first; a nominal failure cannot pass all cases and is rejected without repeating that proposal eight more times. Every potentially accepted proposal is verified in all nine cases. Retained rejected diagnostic plans are also restored to all nine cases before final comparison/rendering. A failed bedtime-readiness check now receives the same separately verified current fallback as other complete-plan failures.

The saved October 23 Winterset evening is no longer assumed to produce a complete overnight prescription under every construction hypothesis. Closed-coach diagnostics find nominally acceptable sequences that fail colder/body-performance cases at the 65°F protection floor; alternatives that correct those cold misses can fail the upper sleeping band in another case. The app must provide a separately verified current interval and label the overnight projection unverified when no searched fixed setup passes all nine cases. The regression now checks nine-case current qualification and its exact 30-minute expiry, rather than preserving the older complete-plan outcome by retuning physical parameters or relaxing comfort limits. The browser check likewise requires either a fully qualified nine-case complete plan or an explicitly bounded nine-case current recommendation; rejected future trajectories cannot be prescribed. The timing-island unit test isolates the three weather cases for the working body and adds an explicit synthetic readiness window: coarse samples must fail, a fine-grid time must be found, and real temperature/moisture/equipment checks still pass there. It tests search coverage without claiming that the historical fixture qualifies under every construction hypothesis. Production qualification and the separate current/complete-plan integration checks retain all nine cases. The surface-advisory invariance regression now uses the March 24 historical fixture with a complete nine-case closed-coach plan, and explicitly asserts that qualification before comparing exact selection/ranking/preparation/trajectory hashes with normal, suppressed and exaggerated surface warnings. Full window/fan search on this same forecast remains covered in browser CI. This replaces a repeated unsuccessful-search workload rather than weakening the physical checks or the invariance assertion.

## Validation and confidence

Confidence is high in the documented shared construction features and energy/area accounting, medium in the applicability of the manufacturer's historical R-18 shell claim, and low in precise installed assembly coefficients. The refinement improves model structure and exposes body uncertainty; it does not demonstrate an absolute temperature-error tolerance. Regression tests check component conservation, shell-versus-floor independence, area cutouts, independent cab changes, actual cold-night response across body cases, fixed mass, one-time leakage, the nine-case cross product and exposed-surface solar treatment. Integration and browser checks cover the unchanged user policies and staged recommendations. No measurement campaign is required to use this improvement.

---

# v6.4.1 construction-evidence audit and independent cab sensitivity

This section supersedes the constant-total cab sensitivity and area-only opaque-solar allocation described in v6.4.0 below. The nominal estimate is retained; the uncertainty cases and spatial solar allocation are refined. This is a source-backed plausibility audit, not empirical calibration of this individual RV.

## Evidence and confidence

The supplied 2023–2024 Platinum III model-specific manual, PDF pages 4–6, confirms a one-piece fiberglass body reinforced with carbon fiber, an aluminum floor frame, frameless jalousie windows, 25 ft 6 in overall length, 8 ft width, 6 ft 4 in headroom, and heavy-duty insulation. Current [Coach House model specifications](https://coachhouserv.com/specs-and-options/) agree on the general construction. Confidence is high for those documented features; the model-specific manual governs over generic current equipment tables.

A stronger historical source than the older ads is the manufacturer's own entry in the [2022 Florida RV SuperShow catalog](https://www.frvta.org/wp-content/uploads/SuperShow_2022-web.pdf), also reproduced in its [2022 RVers Guide, printed p.23](https://www.frvta.org/wp-content/uploads/2022-RVers-Guide-web-compressed.pdf). It explicitly includes the Ford Transit Platinum III and states an R-18 insulation factor for the shell interior. The 2020 catalog separately describes an R-18 lining. Confidence is medium that this is the intended historical shell-insulation specification for the Platinum line. It is not a model-year-specific assembly test report for this RV. Layer thickness, installation air spaces, thermal bridges, floor performance and Ford-cab conductance remain uncertain. The sources do not establish the installed insulation product or a certified effective R-value for each assembly. DOE's [insulation guidance](https://bsesc.energy.gov/energy-basics/types-insulation) explains that installation matters and reflective surfaces require adjacent air space; the audit does not assume a particular foil product is installed merely from an older description.

The R-18 claim cannot be applied to the Ford cab, glass, leakage or an unverified floor assembly. No numerical cab assembly rating or measured coach heat-loss coefficient was found. Absolute UA confidence therefore remains low. Structural consistency and energy accounting can be tested with high confidence; mathematical consistency is not proof of physical accuracy. No new temperature offset or insulation benefit is assigned to the planned thermostat-cabinet isolation or the Magneshades.

## Independent area check

The scale drawing gives RV-body length L=16.704 ft, width W=7.730 ft, working height H=6.333 ft, cab width Wc=5.882 ft and working cab height Hc=5.5 ft. The body/cab boundary excludes the cab opening from exposed body-front area. Gross RV-body enclosure area is 2LW + 2LH + WH + (WH − WcHc) = 535.400 ft². Add the cab's previously documented roof/floor/front/sides estimate, 135.633 ft², to obtain 671.033 ft². The retained 641 ft² opaque + 45 ft² glass = 686 ft² is 2.23% higher. Curvature, actual interior height, drawing precision and exposure assumptions exceed this small difference, so replacing the area solely to chase that 2% would create false precision. This is an independent rough area check, not a 2%-accuracy claim. Working volume, supply delivery and actual thermostat location remain as documented in v6.4.0.

## Component heat-loss accounting

Use H = Kbody + Kcab + Gbody + Gcab + Lbody + Lcab, in BTU/(hr·°F), and Q = H × ΔT in BTU/hr. A is ft²; R is hr·ft²·°F/BTU; conductive K=A/R; glazing G=Ag/Rg. Background leakage L=1.08 × V × ACH/60, with V in ft³ and the retained 0.25 ACH assumption. Nominal components are:

| Component | Nominal BTU/(hr·°F) |
| --- | ---: |
| RV-body opaque conduction | 53.1200 |
| Cab opaque conduction | 34.1109 |
| RV-body glazing | 18.0000 |
| Cab glazing | 27.0000 |
| RV-body background leakage | 3.6801 |
| Cab background leakage | 0.6605 |
| Total | 136.5714 |

These are the previous nominal allocation with its already embedded background infiltration explicitly separated. The model removes that baseline leakage contribution before adding explicit air exchange, so it is counted once. With body/cab opaque areas 532.367/108.633 ft², the nominal *implied effective conductive* R-values are about 10.02/3.18. They are derived baseline assumptions, not manufacturer ratings or measured insulation values. The old R-7 parameter sets an aggregate working anchor; it does not mean every RV-body assembly is R-7. The effective conductances also absorb unmodeled film/installation/bridge effects. Floor, glass and infiltration assumptions are not independently verified by the R-18 advertisement.

The former model renormalized every cab-factor case to H=136.57. That forced greater cab loss to be canceled by an artificial reduction in RV-body loss. The corrected model holds the RV-body, glazing and baseline leakage terms fixed and applies the existing 1.5/3/4.5 factors only to cab conduction relative to nominal factor 3. Total H now varies: 119.516 / 136.571 / 153.627. These are retained engineering sensitivity factors, not measured cab R-values, calibrated confidence bounds or all possible envelope/weather combinations. They remain part of the same three airflow/weather cases; the R-18 comparison below is not added as a fourth qualification scenario. Wind multiplies each selected case's H by the retained (1 + 0.02 × mph); the duty/capacity balance and coupled zone equations use that same selected total. No change to comfort, equipment operating limits or unattended-change rules is made to obtain a passing result.

## R-18 shell comparison

Hold the estimated 129.125 ft² RV floor, cab, glazing and leakage at baseline. Treat only the remaining RV opaque walls/roof area, 532.367 − 129.125 = 403.242 ft², as an ideal effective R-18 assembly. H18 = Hnom − Awallroof/Rbody,eff + Awallroof/18 = 118.738 BTU/(hr·°F), 13.06% below nominal. For a nighttime indoor/outdoor difference of 20°F before wind and other gains, Qnom=136.571×20=2,731 BTU/hr versus Q18=118.738×20=2,375 BTU/hr. This comparison is deliberately optimistic: a lining claim does not establish an effective wall/roof assembly value. It is displayed in calculation details and does not silently replace the nominal model, become a qualified HVAC plan, or claim that uncertainty has been calibrated. The previous estimate is plausible at this level of evidence; its absolute accuracy remains unvalidated. A wholesale R-18 substitution would incorrectly give insulation credit to components outside the claim.

## Opaque solar gain and thermal storage

A less-insulated cab should transmit more opaque solar heat under comparable exposure. The previous per-area allocation ignored that construction difference. The refined allocation weights opaque gains by the body/cab conductive terms while retaining the nominal aggregate solar gain. It assumes a common *mean effective sol-air exposure*, not measured equal paint absorptance or equal orientation. This is a compact engineering approximation supported by the [EnergyPlus exterior heat-balance formulation](https://bigladdersoftware.com/epx/docs/24-1/engineering-reference/outside-surface-heat-balance.html), which separates absorbed sunlight, exterior exchange and conduction. It is not a full surface-orientation/paint/sky radiation simulation. Baseline opaque peak S0 = 0.035 × 641 × 250 × 0.5 = 2,804.375 BTU/hr; K0 = Kbody,nom + Kcab,nom. For each case, Sbody = S0×Kbody/K0 and Scab = S0×Kcab/K0. Forecast solar scaling applies to both; glazing retains its separately shaded gains. About 39.1% of nominal opaque gain now enters the cab, rather than its 16.9% share of opaque area. Sensitivity changes to cab conduction also change cab opaque solar transmission, rather than redistributing a fixed total. No new paint property, absolute solar coefficient or shade R-value is invented.

Total effective thermal storage remains 273.143 BTU/°F, divided by served volume. Insulation changes heat flow and response time, not the mass of the coach. The retained storage estimate is not newly validated by the construction advertising. Moisture capacity and equipment output assumptions remain independent. Tests verify component conservation, distinct cab/body effects, one-time leakage accounting, unchanged storage, nighttime cooling response, floor/cab/glass exclusion from the R-18 comparison, and separate shaded glazing versus opaque solar gain.

---

# v6.4.0 spatial delivery, comfort priority and thermostat search

This section supersedes older fixed-setpoint, 40/60 allocation, volume-weighted awake comfort and uniform-envelope statements below. Historical sections remain for provenance.

## Comfort and controls

The bed-area temperature determines the 65°F protection floor, applicable comfort band, recovery/excursion checks, bedtime readiness and target fit at every time of day. Sleeping remains occupied sleep until 7 AM: 65–69°F, target 67°F. Awake and unoccupied remain 68–73°F, target 71°F. Temperature at the front thermostat controls HVAC calls; the sleeping-area sensor does not replace it. Among plans that qualify for bed comfort, equipment and moisture, prefer a plan keeping the dinette in band too. If none do, bed comfort takes priority and the dinette range/miss is shown. Front room-air RH still participates in the existing humidity protection checks. Surface condensation remains advisory only.

The red dot in the owner's scale drawing places the thermostat at the outboard, front end of the dinette, approximately one foot behind the Ford cab's rear edge. The cab is open to the coach. No partition, closed cab curtain or remote sensor is assumed. Cabinet-void isolation with the planned two-layer treatment is **not installed by default**. A planning checkbox records installed status; neither state invents a sensor offset, lag correction, added coach R-value or sensor relocation. Use a contemporaneous reading near the actual thermostat as the front control observation.

HEAT, COOL, AUTO and MaxxFan settings are searched independently of the comfort target. The former day 70/72/71°F and sleep 66/68/67°F controls are seed candidates. No constant furnace offset is imposed: the front-to-bed response determines whether a different setting is useful for each mode and interval. The CCC2 manual, printed p.9, gives heating 40–90°F and cooling 55–90°F; use integer settings in these ranges (AUTO 55–90°F). MaxxFan candidate settings span the applicable comfort interval. AUTO's selected setting still has real ±2°F activation thresholds, full heating/cooling calls and shutoff at the selected setting, with crossings resolved within steps. AUTO heat uses the overhead heat pump distribution, not the furnace distribution; no automatic furnace fallback is assumed.

The search screens every integer setting in the nominal scenario on a three-minute grid, then verifies the best candidates in all three scenarios on the normal half-minute grid. The best three settings are fully checked; if none qualifies, the remaining nominally qualified settings are checked rather than rejecting a mode solely from its seed setting. Controls are learned before transition-time search and refined again on retained complete trajectories. Original overnight controls are retained alongside the learned controls: a setup that cannot start safely at bedtime may work when preparation begins earlier under different outdoor conditions. A later phase cannot repair an already failed prefix, so such refinement is skipped. Phase-by-phase refinement evaluates settings on continuous carried trajectories and does not add a control change. It refines each retained mode/fan/timing candidate, then compares qualified plans. This is a bounded candidate search, not a proof of the global optimum across every possible setting/fan/transition combination. Displayed alternatives are independently verified over their labeled intervals. Departure/overnight alternatives use the same entering state and exposure history as the recommended preceding stages. Optimizing settings cannot authorize a physical adjustment while away or an overnight manual change. A stage label or unused HEAT/COOL value does not change effective controls or restart AUTO cycling. Cached continuations retain the current control and compressor state. The prefix cache retains at most twelve recent trajectories to bound phone memory use; eviction recomputes the same trajectory rather than changing the model.

## Scale geometry and distribution

Sources: owner-supplied 1536 × 878 floor plan, using the labeled 73 × 32 inch beds; Coach House 2023–2024 Platinum III model-specific manual, dimension table: 25 ft 6 in overall, 8 ft outside width, 6 ft 4 in maximum headroom. The drawing is an approximate plan, not a surveyed thermal envelope. The nominal bed length occupies 362 pixels. Interior RV bounds are approximately x=490..1484, y=90..550; split at x=960, the forward bed/cabinet edge. The front zone includes dinette, galley and open cab; the rear includes beds and rear bathroom. The cab is approximated by x=220..490, y=155..505. This excludes the nose/engine bay. Maximum coach headroom is used as a working height; cab working height is an explicit 5.5 ft assumption. Furniture displacement, curved surfaces and local ceiling height are not measured.

These estimates give rear floor 68.1 ft², front RV floor 61.1 ft² and cab floor 26.7 ft²; working volumes 431 and 533 ft³. Equal overhead delivery per served volume means approximately 44.7% rear / 55.3% front, **not equal zone totals**. AC, heat pump and actual AUTO heating/cooling operation use that same distribution. The furnace uses the owner's ducted 70% rear / 30% front output. Each distribution conserves delivered BTU/hour. Other internal sensible gains follow volume; shared humidity remains one mixed coach air volume. Existing effective total thermal storage is retained and divided by volume. Interzone thermal mixing remains finite and conserves energy.

## Envelope evidence and treatment

The Coach House Drive folder, its generic/model-specific manuals and purchase specifications were checked. The manuals identify heavy-duty insulation but do not supply a numeric wall/roof/floor assembly R-value. Current [manufacturer specifications](https://coachhouserv.com/specs-and-options/) describe a one-piece fiberglass body reinforced with carbon fiber, aluminum floor framing and heavy-duty insulation, without a numeric insulation rating.

A manufacturer advertisement in *MotorHome*, September 2018 (page 39; [archived issue text](https://device.report/m/92d036345d5bca5512606be23176fc93cc730abb982617e397c8a9e650cfe3a3)) describes a hand-laid, molded fiberglass shell reinforced with carbon fiber and an interior insulation lining rated R-18. The same historical rating appears in the [2013 Coach House brochure](https://library.rvusa.com/brochure/2013-Coach-House-Platinum.pdf). These are evidence for the company's construction method and historical insulation claim; they do not establish an effective assembly R-18 for this Platinum III, its floor, framing, windows or Ford cab. No numeric Ford cab assembly rating was established. R-18 is therefore documented, not substituted for whole-vehicle R-value or used to claim a measured cab/body contrast.

Retain the established aggregate UA = 641/7 + 45/1 = 136.5714 BTU/(hr·°F), before the existing wind multiplier. R-7 is a retained **effective working assumption**, not a Coach House specification. Cab exposure is approximated by roof + floor + front + two side faces, less the existing cab glass estimate (60% of 45 ft²). The remaining opaque area and body glass belong to the RV body. Allocate opaque conductance with a nominal cab/body per-area ratio of 3; sensitivity cases use 1.5 and 4.5. These ratios are engineering assumptions, not manufacturer insulation claims. Normalize the opaque allocation to the retained total opaque UA, then add the separate cab/body glass shares. Divide RV-body losses between zones by their body floor-area shares and assign all cab loss to the front. Nominal rear/front UA is approximately 39.4/97.1, summing to 136.6. Thus the entire front RV body is not treated as an uninsulated cab, and the nominal cab contrast does not silently increase whole-coach loss. Sensitivity scenarios change its spatial allocation while preserving aggregate UA. No independently calculated absolute cab-plus-body UA replaces the approved baseline in this release.

Solar allocation separates cab glass, RV glass and opaque shell contributions while preserving the existing aggregate solar load. All cab gain enters the front; remaining body gains use body-area shares. Magneshades reduce solar transmission only: no R-value or conductive-loss reduction is assigned. Body volume, delivery allocation, envelope allocation and solar allocation are distinct quantities. A future validated assembly specification could justify revising aggregate UA; this implementation does not require a measurement campaign or assume one has occurred.

---

# v6.3.0 comfort targets (supersedes earlier preparation-band and ranking rules)

Owner-approved policies are sleeping: low 65°F, high 69°F, target 67°F; non-sleeping: low 68°F, high 73°F, target 71°F. The target tolerance is ±0.5°F inclusive. Sleeping requires occupied actual sleep time and ends at 7 AM. Every unoccupied interval uses non-sleeping comfort regardless of clock time or a thermostat sleep/preparation setting. Thermostat setpoints remain a separate control definition; choosing a sleep setpoint cannot change comfort qualification. The existing 30-minute recovery/excursion policies and hard 65°F floor remain unchanged. A preparation that fails non-sleeping comfort is unsuitable even if it would help sleep readiness.

Target ranking is independent of equipment/moisture/comfort eligibility and cannot bypass it. Sleeping readiness uses the shared sleeping band rather than mode-specific 66°F/68°F literals. Thus an acceptable target miss remains eligible and is ranked by the owner-approved direction rules. Both awake zones are weighted equally for target fit; sleeping target fit uses the bedroom. Each half-minute segment uses midpoint temperature, integrated with its actual duration. The maximum scenario-average loss supplies the conservative target rank, and maximum average absolute deviation is reported separately. Current/departure comparisons integrate their own intervals without bias from the common prefix. Target segment rates survive cached-prefix resumption and Web Worker transport.

For a temperature T and target P, let m=max(0,abs(T-P)-0.5°F). Inside tolerance the loss is zero. Normalize a preferred-side miss by the distance from the tolerance edge to that side's comfort bound, so preferred-side losses span 0–1 within the band. An opposite-side miss has loss 1 plus its similarly normalized distance, implementing preference for the cooler side during heating, cooling and MaxxFan ventilation. With the asymmetric awake band, 68°F outranks 73°F in these modes even though it is farther from the 71°F target. Within the preferred side, closer ranks better. OFF and idle AUTO have no directional preference and use m divided by the larger tolerance-edge-to-bound distance. AUTO applies the cooler-side preference during an active heating or cooling call.

Eligibility/readiness and failed-trajectory duration remain ahead of target rank. Target rank is ahead of natural recovery and the retained humidity/draft/temperature score and mode-order tie breaks. Thus natural recovery cannot defeat a materially better target fit solely because it avoids heating. Thermodynamic constants, moisture coefficients, operating envelopes and thermostat setpoints are unchanged. The user-facing policy summary distinguishes indoor targets from control settings and removes the blanket No away setback claim when preparation settings are used.

# v6.2.0 departure stages and adjusted sleep (supersedes earlier absence timing)

The owner approved separate run-to-departure, departure-to-return and projected sleep recommendations. The search first checks occupied setups to departure in all three scenarios, then fixed departure setups from the carried departure state to return. If the first occupied choice cannot lead to a viable absence setup, other verified occupied choices are tried. Each period's alternatives use the recommended prefix state, and choosing an alternative requires rebuilding dependent projections with fresh readings. Idle heating is unnecessary rather than a useful alternative. Short intervals retain the existing recovery/comfort rules; exposure durations do not restart at handoffs.

A departure setup remains fixed for the whole absence even with declared remote access. A final physical adjustment is allowed exactly at departure. Occupancy becomes zero at departure and two at return. An absence overlapping normal bedtime delays sleep until return; before that there are no sleeping metabolic sources or sleep-only action restrictions. Unattended equipment checks still apply during absence. Return at or after the relevant 7 AM end omits that night's sleep period and extends the evaluated absence horizon to return. Forecast coverage is required through this extended horizon. Early returns keep the normal 10 PM sleep deadline. Time boundaries use local calendar dates in the forecast location zone, including DST.

After return, the projection carries the departure setup until any explicitly calculated sleep preparation, with resumed occupant sources. There is no separate return recommendation: the output asks for fresh readings and a rerun at return. Preparation can begin at return or later, never silently during the absence. For late returns, sleep readiness is assessed at the delayed sleep start. Departure candidates include the existing sleep/preparation settings when return coincides with sleep start, so preparation can be configured at departure if needed. No new thermostat setpoints or relaxed absence comfort bands are introduced.

Projected overnight alternatives use the same complete current/departure/preparation prefix and its exact carried heat, water, defrost/control state, dehumidifier heat and cumulative exposure. No state is reset at departure, return or bedtime. When no overnight continuation passes from the selected departure plan, it is explicitly unverified; this does not claim that every imaginable alternative preparation is impossible. The user reruns on return to obtain a measured-state plan. Current or departure recommendations are not suppressed solely by an unverified later sleep projection, and a partial pass never gets a full-plan Fits criteria badge.

All capacities, UA, airflow/surface coefficients, comfort thresholds, humidity rules and equipment operating limits remain as in the prior version. This release changes schedule interpretation, staged selection and presentation only.

# v6.1.0 two-period comparisons (supersedes earlier transition-window rules)

Owner-approved planning periods are awake 7 AM–10 PM and unattended sleep 10 PM–7 AM in the forecast location time zone. There are no morning/evening eligibility gates or one-minute boundary buffers. Natural recovery receives the existing priority throughout awake hours when the same temperature, moisture and equipment checks pass. Bedtime readiness and its preparation search remain deadline-based; occupancy and available controls govern departure/return actions.

Daytime options are independently tested, with daytime settings, from the entered conditions until the next displayed adjustment or bounded review time. All three scenarios must pass continuously without a borrowed early mode change. Heating-only modes with no heating call in any scenario are marked unnecessary, not viable heating recommendations. Alternatives show the exact interval and their own settings and predicted ranges. Their state is not substituted into the displayed overnight projection: choosing one requires rebuilding the plan with fresh readings at the next adjustment. If sleep preparation begins immediately there is no separate normal-daytime interval to compare.

Projected overnight options preserve every recommended phase before 10 PM and replace only the fixed overnight setup. The existing evaluator carries temperature, water, equipment phase/defrost, dehumidifier heat and exposure counters across these phases; no independently chosen daytime plan or reset bedtime moisture is allowed. Fixed fan variants and vent configurations are tested, then the best result per overnight mode is retained. A full pass includes bedtime readiness, comfort, moisture, equipment limits and available bedtime action. Otherwise the reason is shown under unsuitable projected overnight modes. No automatic furnace backup or post-bedtime intervention is added. If the recommended prefix fails, overnight comparison is deferred rather than prescribed from an unverified state. After 10 PM or before 7 AM the current observations initialize the remaining-night comparison.

All thermodynamic constants, setpoints, equipment limits, comfort tolerances and moisture rules remain unchanged by this release. Earlier sections document historical behavior where they disagree with these comparison and time-scope rules.

# v6.0.1 preparation search and heat-pump repair

Owner decision (October 24, 2026): no automatic furnace fallback and no manual or remote setup change during sleep. The 10 PM boundary is the final awake action; the chosen setup must run unchanged through 7 AM. AUTO may alternate cooling and heat-pump heating; it never receives furnace output. Below-limit heat-pump calls fail the plan instead of silently crediting backup heat. A furnace plan is selected before sleep where necessary. Setup-execution checks apply both during search and to directly evaluated sequences.

**Equipment range and defrost:** supplied Dometic 3314080 CCC2 Operating Instructions, printed pp.16–17, describes auxiliary changeover below 30°F, return above 35°F after auxiliary operation, and defrost below 42°F and above 30°F. See [manufacturer copy](https://media.dometic.com/externalassets/thermostat-control-box-ccc2_64755.pdf). The app no longer invents different 41/45/50°F limits from dew point or attendance. It permits calls at 30°F and above, rejects calls below 30°F, and never models automatic auxiliary heat, so a trajectory requiring that changeover is unsuitable. The 35°F return hysteresis is not used to authorize an overnight recovery after a rejected sub-30°F call.

The unified simulation records an explicit five-minute zero-delivered-heat pause after 25 equivalent compressor-on heating minutes below 42°F. Five minutes combines the documented 4.5-minute reversal and 30-second fan restart delay; roof-fan circulation is zero during the pause. Accumulating equivalent on-minutes across cycling, rather than requiring 25 uninterrupted minutes, is a conservative working simplification. An already-started pause completes even if weather warms. Runtime clocks, remaining pause and total defrost minutes carry through cached handoffs. No invented reverse-cycle cabin-cooling rate is added with the indoor fan off. Legacy one-zone helpers use the corresponding 25/30 average availability; connected plans use explicit pauses.

**Heating output estimate:** no exact installed-unit low-temperature capacity map was found in the supplied manuals or manufacturer search. Retain the existing engineering anchors, 15,000 BTU/hour at 50°F and 13,000 at 41°F. Use `Q_heat(T) = min(15000, 13000 + (T−41)×2000/9)` BTU/hour for permitted outdoor T≥30°F, zero below the operating cutoff. The interpolation/continuation makes reduced output explicit (about 10,556 BTU/hour at 30°F, before defrost interruptions). This is an uncalibrated engineering assumption, not a Dometic-certified performance curve or a proven lower bound. It is not fitted to annual outcomes. Fixed comfort targets, paired temperature states and all three weather/airflow scenarios still govern whether allowed equipment has adequate performance.

**Preparation search:** coarse 30-minute exploration remains a fast first pass. If it finds no suitable ready result, all intervening five-minute preparation starts are tested; a failed coarse bracket cannot hide a successful island. A successful bracket is refined to five minutes. Where an overnight heating mode lacks a ready two-stage sequence, explicitly search daytime setup → COOL 68°F preparation → overnight HP/Furnace 66°F. All transitions require available physical controls and occur no later than bedtime. Every retained sequence passes the complete continuous trajectory in all scenarios. This remains a bounded sequence search, not a global optimization over arbitrary interventions.

**Readiness versus AUTO cycling:** cooling preparation must have reached 68.5°F or lower by bedtime. AUTO may subsequently be anywhere in its documented 65–69°F sleep cycle at precisely 10 PM, rather than being declared late because it has drifted above 68.5°F after reaching the target. It must still pass all temperature-duration, moisture and equipment checks. Heating-only plans retain 65.5–68.5°F readiness; their setpoint stays 66°F. Cooling-only readiness stays at 68.5°F maximum. This does not change thermostat setpoints or the 65–69°F overnight comfort band.

Calendar formatters are cached by complete formatting options (including location timezone), with a bounded cache, to keep the expanded search responsive without changing date/DST semantics.

This section supersedes older heat-pump minima, coarse-only failed-bracket behavior and AUTO readiness descriptions below. Condensation remains strictly advisory.

# v6.0.1 humidity repair — small-coach air volume

Owner decision (October 24, 2026): occupant/dehumidifier separation under 20 ft does not create a moisture-transport constraint. The prediction now has **one mixed humidity ratio / dew point** for the coach. Both measured temperatures and both initial RH observations are preserved at time zero. The volume-weighted initial water content starts the shared moisture balance; subsequent RH is calculated at each predicted local temperature. No interzone mixing coefficient restricts moisture removal. Thermal exchange still represents different initial temperatures and local window/vent conditions. Occupant and dehumidifier sensible gains are distributed 40/60 across the small coach rather than concentrated by appliance/bed location.

The moisture balance is `m_air dw/dt = G_people − D_dehum − D_AC + 4.5 Q_outdoor (w_out−w)`, with m_air = 82.5 lb, w in lb water/lb dry air, sources/removal in lb/hour, outdoor flow Q in CFM and time in hours. A backward-Euler step conserves water; source/removal/outdoor totals and condensed water are retained for verification. Shared air saturation removes water and releases latent heat once, and remains warning-only.

**Portable dehumidifier:** established 20 pints/day at the DOE portable rating of 65°F/60% RH, controlled at 50%. Capacity and energy-factor shapes use [NREL/TP-5500-52791](https://www.osti.gov/servlets/purl/1032386), Table 10, printed p.9 / PDF p.17, verified against the original table. Each published curve is divided by its value at 65°F/60% RH before applying the owner's rating; the old 80°F rating reference is not mixed with the current nameplate. Shape is `a+bT+cT²+dRH+eRH²+fT·RH`, T in °C and RH in percentage points.

| Curve | a | b | c | d | e | f |
|---|---:|---:|---:|---:|---:|---:|
| Water capacity | -1.1625 | 0.022715 | -0.00011321 | 0.021111 | -0.000069303 | 0.00037884 |
| Energy factor | -1.9022 | 0.063467 | -0.00062284 | 0.039540 | -0.00012564 | -0.00017672 |

The generic laboratory relationship is an engineering estimate, not a Midea-specific certified map. Polynomial inputs are bounded to 59–91.4°F and 35–90% RH to avoid uncontrolled extrapolation. Operation outside the manufacturer's 41–95°F working interval gets no removal credit. Every otherwise valid plan remains at least 65°F. Nameplate is a rating-point capacity, not a ceiling at warmer/wetter conditions. Source shape/ranges are not retuned to annual pass counts.

Humidistat control calculates the removal load needed at the 50% front/thermostat temperature, then caps removal at available capacity. A finite unit cannot force 50% under excess moisture load. Part-load ratio = actual removal / available removal. Electrical runtime fraction uses the [EnergyPlus](https://bigladdersoftware.com/epx/docs/24-1/engineering-reference/zone-equipment-and-zone-forced-air-units.html#zone-air-dx-dehumidifier) generic cycling relation `PLF = 0.95 + 0.05×PLR`, runtime = PLR/PLF. This is a cycle-average model, not a claim the compressor switches every simulation step. The retained 640 BTU/hour (~188 W) is now a **compressor-on reference electrical estimate** at the rating point, adjusted by capacity/energy-factor shape and runtime; it is not always-on heat and is not asserted as a new measured wattage. Actual sensible heat is electrical input plus 1,060 BTU per lb removed. The HVAC load estimate uses the preceding step's dehumidifier heat; the current thermal step receives current actual heat. Prior heat/runtime/water totals carry through cached handoffs. This operator splitting is verified by timestep convergence.

**Occupants:** 40 g/hour/person asleep and 55 awake, with two present and zero away. These documented engineering baselines replace 106 g/hour/person asleep. [ASHRAE moisture-management Table 1](https://handbook.ashrae.org/Handbooks/F25/SI/F25_Ch37/F25_Ch37_si.aspx) gives 30–60 g/hour for light activity; [published bedroom modeling](https://www.osti.gov/servlets/purl/1474605) uses 40 g/hour asleep. Sensible and latent loads share a budget: total = activity (0.7 met asleep / 1.0 awake) × 58.2 W/(m²·met) × assumed 1.8 m²/person × people, converted to BTU/hour; sensible = total − latent moisture energy. The body area is a reference assumption, not a measurement of either owner. For two people this yields about 313 BTU/hour sensible asleep and 457 awake. Cooking, showers and wet-load events are not hidden in respiration. [ASHRAE metabolic rates](https://handbook.ashrae.org/Handbooks/F25/IP/F25_Ch09/F25_Ch09_ip.aspx) provide the activity basis.

**Roof AC:** one 300 CFM evaporator stream, counted once: removal = min(latent capacity×duty, `4.5×300×duty×max(0,w_return−w_sat50°F)`). The retained 50°F apparatus dew point and 3,750 BTU/hour latent allowance are still engineering assumptions. No new unsupported off-cycle evaporation coefficient is invented. Dehumidifier/AC removal both act on the shared air volume.

The owner's >65% room-RH duration criterion and temperature/equipment limits remain enforced; condensation and surface-RH warnings never affect suitability/ranking/timing. Moisture buffering is not added as a guessed storage multiplier. Fixed thermostat targets, equipment capacities, envelope properties and window geometry are unchanged. Weather and solar forecasts remain continuous. This section supersedes the older occupant, two-zone-water and constant-dehumidifier-heat descriptions below.

# v6.0.1 current guidance and moisture interpretation

This section supersedes the v6.0.0 full-plan-only presentation and all condensation/surface-RH rejection rules below. Equipment capacities, envelope properties, window geometry, fixed thermostat targets and weather sensitivity coefficients are retained. Occupant and dehumidifier methodology is superseded by the sourced humidity repair above.

A complete plan still must meet temperature/duration, equipment and room-air humidity criteria in all three scenarios. When none does, a separate current recommendation is evaluated over a common horizon: the next 30 minutes, the end at 7 AM, or departure, whichever comes first. Each candidate starts at the paired measured/projected state. It must complete that entire horizon and pass all its checks in every scenario. Only this current setup is prescribed; the rejected future sequence is continued for explanation, not issued as an operating plan. Reassessment occurs at the displayed deadline. A short current result never validates an upcoming absence, and currently-away candidates retain all verified physical/control restrictions. Fixed-fan variants are considered for current guidance as well as default setups.

Morning natural recovery gets priority in the fallback only when the full current horizon passes every scenario. Its minutes are calculated from those same trajectories without heating before recovery. The separate overnight outlook prefers a same-mode continuation when one was searched, explicitly names the assumed mode/setting/time, and reports bedtime readiness. It never silently attributes an unprescribed ventilation forecast to the current cooling recommendation.

Condensation and elevated modeled surface RH are advisory only in every simulation path, including legacy candidate screening, current guidance, coarse ventilation searches and cached preparation trials. Neither can reject a setup, stop a trajectory, affect its score/rank or move a preparation time. Surface concern history is retained only for output. The 2°F dew-point margin and >=80% surface RH for 30 minutes are warning triggers, not measured surface properties or validated mold/damage thresholds. The warning describes possible moisture, identifies the earliest estimated time and requests a visible check; it does not report hypothetical >100% surface RH as an actual measurement. The >65% sustained room-RH rejection remains a separate room-air policy, including during current guidance. The dehumidifier's 50% setting remains a target in a finite moisture balance, not a forced indoor RH value. Dew point is derived from temperature and humidity ratio and shown with overnight zone predictions; it is not an independent humidity penalty.

CCC2 fixed LOW/MED/HIGH roof fans run continuously in COOL, HP and AUTO (supplied CCC2 manual pp.10–12). Their existing additional mixing estimate applies between compressor calls as well as during them. AUTO fan mixing is averaged by the modeled compressor duty; the furnace's blower mixing follows its heating duty. The 60/120 CFM coefficients remain engineering assumptions. Continuous fan operation adds mixing, not invented cooling or moisture removal; condensate re-evaporation remains unmodeled.

Stopped simulations cannot be compared using unadjusted accumulated discomfort as if they covered equal durations. Failed complete plans now prefer the later earliest failure across scenarios, then score/preference. Valid complete plans retain their prior ranking. First comfort thresholds/times and surface-advisory history carry across cached handoffs. The existing daytime-bridge fallback runs when no single daytime prefix covers the daytime period; an overnight-only shortfall instead leads to the separate current recommendation and outlook.

The Winterset fixture preserves paired readings of 72/72°F, 54/52% RH, dehumidifier enabled, staying, and the October 23 2026 6:48 PM CDT start. Forecast boundaries were retrieved during diagnosis with the same 5:32 PM CDT NWS issue time; the exact original phone response was not preserved. The fixture removes only consecutive identical weather values and documents its source. The repaired humidity/occupant model now validates daytime COOL 72°F followed by sleep AUTO 67°F LOW through 7 AM in all three scenarios. A separate synthetic future extreme-cold fixture verifies bounded current guidance when a complete plan really fails.

# v6 connected-plan methodology

This section supersedes the v5 schedule, sensor initialization, monitored-context and ranking behavior below. Existing envelope, equipment capacities, solar coefficients and coil screening are retained. See the humidity repair for revised occupant/dehumidifier methodology. Owner reconfirmed fixed thermostat settings during the rewrite: day heat/cool 70/72°F, sleep 66/68°F. Bedroom targets are not implemented as automatic thermostat offsets.

## State, control and schedules

Bedroom and front-zone temperature and humidity ratio are initialized separately from paired sensor readings at a stated time. The front sensor adjacent to the CCC2 approximates its sensed temperature; this assumes no separately installed remote control sensor. CCC2 operating instructions, printed p.8, explicitly distinguish the thermostat sensor from an optional remote sensor. The sleeping-area reading is an observation, not a replacement thermostat. The prior two-zone distribution/mixing estimates are retained; their predicted gradients require calibration with actual observations.

The thermal balances and shared moisture balance run continuously from the analysis start through the relevant overnight period ending at 7 AM. The default starts now; a future start explicitly requires projected input conditions. Daytime targets apply 7 AM–10 PM. A calculated preparation stage may intentionally use sleep settings before 10 PM. There is no fixed 9 PM target change. At 10 PM the sleep comfort policy applies even if the physical arrangement and thermostat cannot be changed while absent.

Occupancy is exactly two people when present and zero between the entered departure and approximate return. Metabolic and respiration sources change at those boundaries; sleeping sources apply 10 PM–7 AM. Dehumidifier heat/removal, solar gains and outdoor exchange remain active while absent. No separate numerical LED-lighting load is added. MCD day shades are always down; existing cab shade assumptions and coefficients remain unchanged. Existing nighttime shade assumptions remain in the underlying envelope model.

Daytime monitored HP minimum remains 41°F. During absence or sleep the existing dew-point-adjusted unattended policy applies (41/45/50°F; equality inclusive). No operating envelope is widened. AC/heat/AUTO have closed windows and closed/off roof vents. Ventilation uses exactly one AUTO exhaust fan and fixed closed/half/full window sections. Rain does not independently prohibit rain-shielded fan/jalousie ventilation; the weather moisture balance and rain RH floor still apply. AUTO lid/speed operation is permitted while absent, but no manual fan, lid, or window change is scheduled there. Future remote thermostat access permits only thermostat operations compatible with the confirmed, unchanged physical arrangement.

## Plan selection and timing

Each plan is evaluated under the three retained sensitivity scenarios. All must pass equipment, moisture and temperature/duration criteria. Comfort bands remain day 68–73°F and sleep 65–69°F, including the owner's 65°F fallback. Initial recovery is limited to 30 minutes; cold/warm excursion and dampness runs carry across all setup changes. A better comfort score never offsets a failed protection requirement. Humidity ranking uses the agreed broad bands: <=55% no penalty, >55–60% .4 points/hour, >60–65% 1.9, >65% 3.4. Within-band single-percentage-point differences do not create a ranking advantage; the retained >65% duration rejection remains separate.

Morning (7–10 AM) passive or cooling-only standby plans get priority over an active-heating score advantage when both zones naturally reach 68–73°F within 30 minutes and the whole plan is viable. The displayed recovery time is the slowest of the three scenarios, rounded up to a minute. A zone already in band needs zero recovery time. A morning benefit cannot override sustained room-air humidity or a later comfort/equipment failure.

Bedtime readiness is separately assessed at precisely 10 PM. The bedroom cooling target has a 0.5°F numerical readiness tolerance (<=68.5°F); the 65°F fallback is preserved. A heating plan must reach at least 65.5°F for the 66°F target. These timing tolerances do not alter thermostat settings or the overnight comfort band. Passing this instantaneous deadline is insufficient: the rest of the night must also pass comfort/moisture/equipment checks. A viable but late plan gets a specific missed-target message; an unsuitable complete plan gets no operating prescription.

The planner first screens single daytime setups with an overnight handoff. If none forms a viable complete plan, it also tests an explicit daytime handoff before a predicted failure (e.g. furnace followed by COOL), only where an occupant or the declared remote controls can execute it. Setup changes at the departure instant mean actions immediately before leaving. Return allows manual changes again. During absence, thermostat cycling and the already configured AUTO MaxxFan continue automatically; unsupported physical changes are rejected.

Preparation search explores available times in 30-minute intervals and at departure/return boundaries, then refines the latest successful bracket in 5-minute steps. This is an approximate latest validated start, not a proof of a global continuous-time optimum. No arbitrary extra lead-time buffer or calibrated probability is invented. The fallback daytime-handoff search uses candidates 15/30 minutes before the first predicted failure and available departure/return times. Its returned schedules receive the same full simulation.

All practical window configurations are screened at 3-minute resolution. Exact geometric symmetries between the two equal Jeff panes and two equal dinette panes share one representative; the six physical sections remain in the instructions and flow network. Nominal candidates are ranked, then additional sensitivity scenarios are evaluated until four viable coarse candidates are found, or the candidate list is exhausted. Up to four finalists receive full 30-second plan verification. This is a bounded candidate search, not an exhaustive global optimum over every possible multi-stage arrangement.

The full verification timestep is 30 seconds, with exact weather, occupancy, 10 PM and setup boundaries. AUTO threshold crossings are additionally resolved by subdivision. Cached preparation trials reuse complete temperature/water state, accumulated comfort and moisture durations, scores and equipment history from identical earlier trajectory prefixes. No stage resets indoor RH, air temperature, recovery allowance, condensation history or damp-surface exposure. Direct and cached trajectories are regression-tested for equality.

AUTO benefits require meaningful sustained dual use and a counterfactual failure of the available single-function alternatives. Unnecessary overnight heating is penalized using overnight heat runtime only; useful daytime furnace heat is not counted as needless overnight reheating. Sensitivity scenarios are qualitative assumption tests, not calibrated forecast probabilities.

## Interaction and validation

A future remote capability toggle defaults off and does not connect to equipment. Currently-away mode also requires paired readings and a confirmed existing setup. Away mode uses the coach ZIP and disables/cancels phone GPS, preventing a traveling phone from silently replacing the coach weather location. Without remote capability, a departure plan can still select any fixed arrangement that passes for the entire absence. The app does not assume windows close themselves.

Sensor readings older than 30 minutes are rejected as a usability/data-freshness policy. A plan expires at the next scheduled action, after 30 minutes, or when weather/horizon coverage expires. Datetime fields use the forecast location IANA timezone and preserve instants when the selected zone changes. Future projected readings are explicitly distinguished from current measured values. Recalculating is manual; automatic equipment control and sensor import are separate projects.

Tests include actual sensor differences, control-sensor location, occupancy heat/moisture sources, unattended HP screening, executable transitions, rain-compatible ventilation, natural recovery priority, continuous-state conservation, sustained moisture history, exact deadlines, timezone/DST conversion, failure presentation and offline/cache upgrades. Browser CI captures 390/448/480-pixel layouts in light/dark mode and verifies the actual Web Worker and disabled-currently-away controls.

---

# HVAC methodology v5.0.0

This section records the historical v5 implementation; the v6 and v6.0.1 sections above supersede it. Earlier behavior in the README changelog is historical. Values described as assumptions are not measured properties or calibrated probabilities. No field-measurement project is required to use the app.

## Owner decisions (October 23, 2026; factual prompt sources)

- Daytime HEAT 70°F / COOL 72°F; overnight HEAT 66°F / COOL 68°F. Targets no longer move to win an optimizer comparison.
- Current uses daytime targets 7–10 AM and 7–9 PM; at 9 PM it prepares for sleep using overnight targets through 10 PM. Pre-9 PM results expire at 9 PM. Existing end-of-transition one-minute buffer is retained.
- Preferred allowance: 2°F below and 1°F above a desired setpoint. Common mode-independent comparison envelope is HEAT target minus 2 through COOL target plus 1, bounded by a 65°F minimum: daytime 68–73°F; overnight 65–69°F. Overnight 66–69°F is preferred around the cooling target; cooling-only drift to 65°F is allowed without creating a reason to reheat.
- Temperature must recover into the envelope in 30 minutes; after that, over 30 consecutive minutes outside it is unsuitable. At least 15 consecutive minutes above the upper boundary plus 1°F is unsuitable. Any occupied-zone temperature below 65°F is unsuitable, including initial state. Initial recovery is included in scoring.
- Occupied-zone comfort is bedroom overnight; daytime warm/cold checks use the warmer/colder zones respectively, and the daytime floor checks both zones. Both zones are always checked for moisture, irrespective of occupancy.
- Updated October 24, 2026: condensation and estimated surface dampness are warning-only and have no effect on eligibility, ranking or timing. Temperature, sustained room-air RH and equipment limits remain independent decision criteria.
- Humidity comfort policy: 40–55% preferred, 55–60% modest penalty, above 60% increasing penalty; above 65% for more than 30 consecutive minutes after recovery is unsuitable. These are owner-approved preferences, not proven scientific sleep thresholds.
- Exactly one MaxxFan operates, in exhaust AUTO. The other fan is closed/off. Window settings are fixed for the whole interval: closed / half open (2 inches at bottom) / full open (4 inches). Both fans modulate automatically with cabin temperature.
- Bedside intakes have direct-draft potential; sink/dinette intakes have lower direct exposure. Window geometry, preferred cooling sheets, and occupancy do not establish measured airspeed at the body. No numerical bedding credit is applied.

## Retained thermal constants

UA = 641/7 + 45/1 = 136.57 BTU/(hr·°F), wind multiplier 1 + .02 × mph, total effective storage UA × 2 = 273.14 BTU/°F. AC total capacity 15,000 BTU/hr, working sensible output 11,250 BTU/hr. HP output 15,000 above 50°F / 13,000 at or below 50°F. Furnace 19,000 fuel input / 15,000 working delivered output. Occupants 1,000 asleep / 1,400 awake. Enabled dehumidifier contributes the retained 640 BTU/hr motor/waste-heat assumption. Shell/glass solar inputs and shade coefficients are retained below. No envelope, equipment-capacity, or original coil-screen constant has been retuned to make a result pass.

## Two-zone heat and water balances

Bedroom / mid-coach working volumes: 440 / 660 ft³. Effective storage and envelope UA split 40/60. These volumes, allocation, an open interior passage, and mixing rates are engineering assumptions. No partition or door sensor is implied. Occupant gains/moisture are placed in bedroom overnight; daytime allocation is 40/60. Dehumidifier is assumed mid-coach. Current remains attended and uses awake gains, including 9–10 PM preparation for sleep.

For zone i, integrate:

`C_i dT_i/dt = UA_i(T_out-T_i) + Q_i + 1.08 [outside_in_i(T_out-T_i) + interzone_in_i(T_other-T_i)]`.

T is °F, C is BTU/°F, UA is BTU/(hr·°F), airflow is CFM, Q is BTU/hr, and time is hours. Heat sources include occupants, solar, equipment sensible delivery, dehumidifier heat, and latent heat released by dehumidification. Outdoor inflow exchanges both heat and water. Exhaust does not itself create heat or moisture.

For humidity ratio w (lb water / lb dry air):

`m_air_i dw_i/dt = G_i + 4.5 [outside_in_i(w_out-w_i) + interzone_in_i(w_other-w_i)]`.

m_air = volume × .075 lb/ft³; sources/removal G are lb water/hr. Interzone exchange conserves total heat and water. Simultaneous backward-Euler 2×2 systems avoid unstable mixing steps and negative moisture. Nominal timestep 30 seconds, with every forecast boundary and exact end included. Solar evaluated at step midpoint; no future weather value is used early. AUTO trigger/setpoint crossings subdivide steps with a time-root solve, avoiding artificial undershoot at 65°F. Step-refinement tests check convergence. This is a numerical two-zone model, not the previous exact one-zone exponential profile; standalone legacy analytical helpers remain as reference/component checks.

Baseline infiltration for moisture uses .25 ACH. To avoid adding baseline heat loss twice, its 1.08 × CFM contribution is subtracted from the retained aggregate UA before explicit airflow is added; aggregate closed-coach sensible UA is preserved. Background infiltration and wind-dependent aggregate UA are still approximate, not separate measured leakage and shell conductance.

Bidirectional mixing: 60 CFM, plus 120 CFM with active roof HVAC/furnace delivery, multiplied by scenario factor. Air delivery splits 40/60. These do not establish actual duct balance. Ordinary thermostat control averages duty to meet the sensed target subject to capacity; AUTO uses its actual ±2°F triggers and returns toward its single setpoint. Bedroom senses overnight HVAC; daytime uses volume-weighted temperature; each MaxxFan senses its own zone.

## Indoor moisture

Starting RH, if entered, applies at the starting temperature to both zones. Unknown starting RH uses the outdoor absolute moisture converted at indoor temperature, times .85; trials add 5 percentage points. It is an estimate, not a sensor measurement or a guarantee. RH is subsequently computed from dynamic humidity ratio and each zone temperature, never held fixed.

Working water sources: .45 pints/hr for two sleepers, .55 awake, 1.043 lb/pint. Sleep source is inherited from the project rationale; awake source is an additional engineering assumption.

Enabled dehumidifier has a 50% humidistat. Working removal ceiling is 20/24 pints/hr, derated below 80°F using clamp((T-45)/35, 0, 1), multiplied by clamp((RH-50)/15, 0, 1.5), capped at nameplate maximum. Off contributes no heat or removal. This curve is not a Midea certified performance map. Net room heat includes the retained 640 BTU/hr enabled electrical/waste estimate plus 1,060 BTU per lb of water condensed; the latter is latent energy converted to sensible heat, not a second electrical input. Its average electrical contribution is retained even during low-humidity periods rather than inventing a new duty-power map.

AC moisture removal is limited by both 3,750 BTU/hr remaining latent capacity and airflow moisture available above saturated 50°F air, scaled by compressor duty. 50°F is a working apparatus-dew-point assumption, separate from the existing empirical coil icing screen. Actual sensible/latent split, startup wetting, and off-cycle re-evaporation are not known; this approximation does not assert manufacturer performance across conditions.

Air saturation is retained as physical bookkeeping: all trajectories remove modeled excess airborne water, record it and release latent heat. This diagnostic flag is advisory only. The calculation does not predict surface condensate mass, runoff, material wetting or drying, and it does not bypass the independent room-air humidity-duration policy.

## Condensation warning (no eligibility or ranking effect)

Both zones are checked from the initial state using:

`T_surface = T_zone - max(0,T_zone-T_out) × surfaceFactor`.

surfaceFactor .80 nominal / .85 and .90 sensitivity are uncalibrated cold-frame/glazing assumptions, not measured R-values or a transient surface model. Actual glass, frames, shades, wind and airflow can differ. Surface temperatures near indoor dew point can indicate possible moisture; the retained 2°F margin is an advisory buffer, not proof of liquid condensation. Elevated estimated surface RH is also advisory. Neither trigger establishes mold growth, damage or that a particular HVAC mode is unsuitable.

Warnings do not change the recommended mode, thermostat setting, fan, physical arrangement, preparation time or review deadline. Tests vary only the surface-warning calculation while requiring identical decision and trajectory signatures. Temperature, room-air RH duration and equipment operating checks remain enforced. Indoor dew point is derived from the same indoor moisture state, not independently scored. Room-air readings do not certify hidden surfaces, leaks or manufacturer operating conditions.

## Measured windows and geometric openings

| Section | Count | Width per section | Operable height | Zone |
|---|---:|---:|---:|---|
| Jeff | 2 | 21.625 in | 10.5 in | Bedroom |
| Kim | 1 | 16.875 in | 25.25 in | Bedroom |
| Sink | 1 | 19.25 in | 10.5 in | Mid-coach |
| Dinette | 2 | 21.625 in | 10.5 in | Mid-coach |

Owner measured 43.25 in combined operable width for Jeff/dinette; equal split is assumed. Kim/Jeff/dinette overall height 25.25 in; sink overall width/height 19.25 in. Kim operable pane is full height. All open outward with 4 in maximum bottom gap. Frames, seals and rounded corners remain obstructions.

Approximate bottom plus two triangular side gaps: `A = min(w × h, g × (w+h))`. Inputs inches, convert to m² using .00064516. Full-open geometric total is 801.5 in²; this is not free airflow area. Discharge coefficient .60 and screen factor .65 are resistance assumptions. Side-gap obstruction is represented approximately in those coefficients; no measured screen pressure drop is claimed.

## Airflow network and fan control

Solve common cabin pressure from the sum of all window flows minus roof exhaust = zero. An open interior passage supports approximately common pressure while bedroom and mid-coach retain distinct temperature/moisture states. Per-zone imbalance gives directed interzone bulk flow, plus bidirectional mixing. Window flow `Q = C_d × screenFactor × A × sign(deltaP) × sqrt(2 abs(deltaP)/rho)`, rho 1.2 kg/m³; m³/s converted to CFM by 2118.88.

Window pressure includes wind and buoyancy. Working window wind = .5 × forecast speed, wall pressure coefficient ±.35, roof coefficient -.20; approximate .5 m buoyancy reference. Opposing wall exposure assignments Jeff/dinette versus Kim/sink are inferred configuration assumptions. Unknown parking heading/shielding is explored via reversed exposure, not claimed to be known from ZIP/GPS. Single-sided exchange adds area × [.025 × window-wind-speed + .20 × sqrt(g × pane-height × abs(indoor/outdoor temperature difference)/absolute temperature)]. Units are SI before conversion to CFM. This assumed bidirectional exchange persists in calm weather through buoyancy; it is not inferred from net flow alone. Both coefficients represent unresolved screened-window exchange, not measured correlations for these windows.

Maxxair publishes up to 900 CFM for 10-speed Deluxe models; owner-supplied 8501K manual printed p.7 confirms temperature-dependent automatic speed; pp.8–9 describe shutdown/lid closure at setpoint. The installed pressure-flow curve and speed schedule are unavailable. Working normalized AUTO speed = clamp(.15 + .17 × temperature excess in °F, 0, 1), zero at/below setpoint. Fan flow decreases with pressure using a square-root curve, 40 Pa assumed full-speed shutoff pressure scaled with speed²; never exceeds 900 CFM. The 40 Pa value and control curve are assumptions, not Maxxair specifications.

When the fan stops, its lid closes but selected windows remain open. Natural pressure-driven and single-sided exchange continue. The old 65°F outdoor cutoff and 62°F outdoor dew-point gate are not used in live selection; trajectory/moisture screening replaces them. Legacy component helpers retain historical policy only for regression reference.

Practical candidates: all six individual sections at half/full; every pair with all half/full combinations; all mid-coach, all bedroom, and all sections at half/full; each with bedroom or mid-coach fan (one only). This is a practical shortlist, not exhaustive optimization of all 729 window combinations. Three-minute screening ranks them; the top eight are rerun at 30 seconds and under both sensitivity scenarios before selecting the best. Failed nominal candidates cannot be prescribed. Shortlisting may miss another robust layout; this is an optimization limitation, not a guarantee of a global optimum.

## Drafts, scoring and AUTO

Comfort score is a penalty (lower is better), integrating warm excess × 2 and cold deficit × 1 in °F·hr. Humidity adds .08 per percentage-point-hour above 55 through 60, then .4 + .3 × excess above 60. Below 55 receives no extra drying reward. Small RH differences can influence ranking but cannot alone make a mode unsuitable unless a sustained threshold is crossed.

Overnight draft penalty integrates positive intake CFM at bedside sections /100 × max(0, cooling target minus outdoor temperature) × .03, reduced to 30% when bedroom exceeds its upper comfort limit. Coefficient is a subjective ranking preference, not human heat transfer or a measured body airspeed. Indirect intake produces no direct-window penalty, but bedroom/mid-coach temperature and airflow remain modeled. Viscose bamboo bedding receives no numerical temperature credit.

All eligible modes are ranked by score; former five-degree-hour preference pool is removed. Exact ties use off, ventilation, AC, HP, furnace, AUTO. The selected mode is omitted from alternative sections. If no mode qualifies, display no suitable setup, no operating prescription, and the closest result's reasons.

AUTO setpoint = 67°F overnight / 71°F daytime; CCC2 triggers at ±2°F. Compare AUTO against cooling-only and best heating-only. At least 5 equivalent full-output minutes of both functions per trial defines meaningful dual use, but is insufficient by itself: neither single-function mode may remain suitable. If COOL stays comfortable above 65°F, heating does not earn flexibility credit. High likelihood = both functions meaningful in all three trials and neither single mode sufficient; Possible = some trials; otherwise Low. These are sensitivity labels, not calibrated probabilities. Genuine dual necessity earns 1 penalty-point benefit; unnecessary heating when COOL is suitable adds 1 + heating-minutes/30; other AUTO adds .5. These explicit owner-approved engineering preferences avoid selecting unnecessary reheating solely to chase a small temperature advantage.

Sensitivity trials: nominal; airflow × .7, mixing × .7, outdoor +2°F, starting RH +5 points, surface factor .85, one wind exposure; airflow ×1.2 (fan capped), mixing ×1.3, outdoor -2°F, starting RH +5 points, surface factor .90, reversed exposure. Nominal uses neutral crosswind pressure, factor .80. All three must pass. They are assumption stress tests, not NWS ensemble probabilities or validated error bounds.

## Retained equipment policies

- HP minimum 41°F monitored; overnight effective minimum 41 /45 /50°F for outdoor dew point below 35 /35–<38 /≥38°F. Threshold equality remains inclusive as in v4.5.3. Daytime/Current monitoring and Overnight unattended context remain distinct. No unverified AUTO furnace backup is invented.
- Cooling coil screen retains fan depressions 24/22/20°F (Low/Medium/High), .3°F per degree outdoors below 70°F, .4°F per indoor dew point above 55°F; reject below 35°F estimated coil. Indoor dew point now comes from the evolving moisture state. Actual return-air minimum across the two zones is screened conservatively while cooling is called. The coil screen is empirical, not an actual coil sensor.
- One fixed roof HVAC fan setting is evaluated for the entire interval. Overnight tries Low/Medium/High; monitored periods Auto/Medium/High. Each setting is rerun from the beginning. Indoor dew point >60°F requires High under the retained app policy. Idle equipment is not rejected for a call that never occurs.
- Dometic airflow prerequisites and observed-ice recovery remain: clean filter, unobstructed outlets, at least two distribution vents open or quick-cool plus one; stop cooling and use FAN ONLY to melt existing ice, then resume at a warmer setpoint.
- Supplied component manuals outrank coach manuals and general references. Retained model heat-loss/capacity/frost heuristics are project assumptions, not newly attributed manufacturer specifications.

## Primary references

- Supplied MaxxFan 8501K guide, printed pp.7–9: AUTO speed adjustment and lid closure. [Maxxair Deluxe](https://www.maxxair.com/products/fans/maxxfan-deluxe-fans/): up to 900 CFM for 10-speed models.
- Supplied Dometic CCC2 guide, printed pp.9–12: fan behavior and AUTO ±2°F operation; supplied rooftop installation guide: equipment airflow/icing guidance.
- [EnergyPlus Airflow Network](https://energyplus.readthedocs.io/en/latest/guides/input-output-reference/1.27-group-airflow-network.html): network method, wind/buoyancy, exhaust and two-way exchange. Supports method, not coach coefficients.
- [Humid heat experiment](https://pubmed.ncbi.nlm.nih.gov/10505822/) and [bedroom field study](https://pubmed.ncbi.nlm.nih.gov/37076419/): humidity/sleep evidence, with stronger humid-heat findings than a universal isolated RH cutoff. App comfort bands are personal policies.

## Glazing and shades

Owner-confirmed configuration: the Ford Transit cab is unmodified. MagneShade exterior shades cover the windshield and both cab doors when using the app. Other coach windows have MCD Day/Night interior shades. The supplied images show two driver-side coach windows, two passenger-side coach windows plus an entry-door window, and one rear window. A glass-area inventory must include all of these, not just the cab.

The owner reports overall length 25 ft 6 in and height 10 ft 6 in. The supplied Coach House model-specific manual lists width 8 ft and height including AC 10 ft 5 in, and explicitly notes build/equipment variations. Use the owner's height for photo scaling. Roof equipment, rounded body edges, image cropping, and perspective prevent a uniform pixels-to-feet scale across all three images.

Primary accessory-maker references found on 2026-10-22:

| Factory-window reference | Published cover dimensions | Bounding rectangle, not net glass |
|---|---|---:|
| [VANLUSIS Transit windshield cover](https://vanlusis.com/products/ford-transit-windshield-cover) | 65.25 × 38.75 in | 17.56 ft² |
| [VANLUSIS Transit front-door covers](https://vanlusis.com/products/ford-transit-front-door-window-covers) | 38.5 × 26.75 in per door; pair | 7.15 ft² each |

Both list medium/high-roof full-size Transit 2015 onward, not Transit Connect. [VanEssential's cab bundle](https://vanessential.com/products/transit-van-front-cab-kit) independently lists medium/high-roof compatibility, but does not publish dimensions on that page. Cab cutaway fitment still needs to be matched to the actual factory glass variant; no VIN-specific Ford dimensioned glass drawing was established in this research. These covers mount over/around the glass. Their summed bounding rectangles are 31.86 ft², which **must not** be treated as 31.86 ft² of exposed cab glazing. Tapered outlines, rounded corners, opaque borders, and mounting overlap reduce net area. The photos are useful for counting coach windows and approximate proportions, but do not establish their cutout sizes.

The geometry supports a rounded working split rather than an exact glass takeoff. Applying an illustrative 0.85 shape/overlap factor to the windshield rectangle and 0.80 to the two tapered door-cover rectangles gives 26.4 ft². These factors are engineering estimates, not accessory-maker data. Rounded to 27 ft² within the existing 45 ft² reference area, the cab share is 60%; the six coach apertures share the remaining 18 ft². The photographs help check the window inventory and scale, but perspective, trim, and partial cropping leave material area uncertainty. Use a 50–70% cab-share range for sensitivity. The total 45 ft² and shell 641 ft² remain provisional existing envelope inputs; they have not become measured values through this exercise.

### Material-based solar estimates

Material, screen openness, color, glazing, and installation position can support a useful estimate without testing this coach. The selected coefficients describe **glass plus deployed shade**, not fabric transmission alone:

| Window group | Effective solar-gain coefficient | Sensitivity bracket | Basis |
|---|---:|---:|---|
| Cab windshield and doors, exterior MagneShades installed | 0.20 | 0.12–0.30 | Exterior solar-screen class, allowing absorbed heat transfer back through the glass rather than equating UV blocking with heat rejection |
| Coach glass, interior MCD day screens lowered | 0.50 | 0.44–0.61 | Interior solar-screen class; absorbed screen heat can enter the cabin |

The owner confirmed that MCD day screens are lowered whenever solar load is present. Night blackout shades are lowered overnight after solar load is gone. Therefore no blackout-shade solar credit is applied during daylight, and no invented night-shade heat-rejection coefficient is needed when incident solar is zero. This model does not add a separate conductive R-value benefit for the night shades.

[MagneShade's fabric description](https://magneshade.com/fabrics/) identifies PVC-coated fabrics and a 90% UV/heat-blocking claim, with black/brown recommended for heat protection. That statement establishes the solar-screen class; it is not converted directly to a 0.10 whole-window SHGC. Exact fabric option/color is not established here. [MCD's FAQ](https://mcdinnovations.com/service-support/faqs) identifies its Clearview solar day screen separately from the opaque night material. Their [cleaning guide](https://mcdinnovations.com/service-support/documents/cleaning-mcd-shades/) identifies night-shade vinyl/cloth options. These materials are not interchangeable with an exterior screen simply because both block visible light.

The [LBNL/BuildingGreen solar-screen guidance](https://efficientwindowcoverings.org/node/64.html), developed in a [DOE-supported project](https://efficientwindowcoverings.org/about.html), gives shading-coefficient ranges 0.14–0.33 exterior and 0.50–0.70 interior, with SHGC = 0.87 × SC. Converted class ranges are approximately 0.12–0.29 exterior and 0.44–0.61 interior. The selected 0.20/0.50 are rounded analog estimates within those classes. The class ranges are sensitivity brackets, not statistical confidence intervals or manufacturer-certified values for the actual Transit and tinted coach glazing. They do not get multiplied by an additional bare-glass SHGC, which would double-count the reference glazing in the SC conversion.

[ASHRAE Fundamentals, Fenestration](https://handbook.ashrae.org/Handbooks/F17/IP/f17_ch15/f17_ch15_ip.aspx), simplified methodology and roller-shade sections, supports estimating shaded-system gain from shade optical properties, openness, glazing, and attachment location. It also explains absorbed heat flowing inward and why opaque/light-blocking material does not imply zero heat gain. The present class approximation is simpler than a detailed optical/thermal layer calculation; it is appropriate to the available product information, not a claim to that calculation's accuracy.

With the same sunlit fraction for both groups, the implemented aggregate is `0.60 × 0.20 + 0.40 × 0.50 = 0.32`. Peak glass gain is `250 × 45 × 0.5 × 0.32 = 1,800 BTU/hr`, compared with 1,406 BTU/hr under the previous blanket 0.25 coefficient: an increase of about 394 BTU/hr before cloud/solar-elevation factors. The shell contribution is unchanged. Keeping separate coefficients in code makes the construction assumptions explicit even though the present orientation approximation uses one shared sunlit fraction.

Combining the coefficient brackets with 50–70% cab share gives aggregate endpoints 0.216 and 0.455 (roughly 0.22–0.46), corresponding to 1,215–2,559 BTU/hr peak glass load. These are deliberately broad scenario limits, not measured uncertainty. Coefficient sensitivity is checked in the thermal tests. Absolute glazing-area uncertainty and unknown parking orientation remain additional limitations; the model does not pretend to know which individual windows face the sun.

An illustrative constant peak-solar scenario (85°F outdoors, wind 5 mph, awake gains, cabin initially 72°F) gives:

| Shade scenario | Aggregate coefficient | Passive cabin after one hour | AC duty needed to hold 72°F |
|---|---:|---:|---:|
| Lower solar gain | 0.216 | 94.6°F | 71% |
| Working estimate | 0.320 | 96.2°F | 76% |
| Upper solar gain | 0.455 | 98.3°F | 83% |

These are model calculations under deliberately constant peak exposure, not observed temperatures or an ordinary hourly weather forecast. Their purpose is to show material sensitivity: the shade uncertainty can move a near-limit comfort/capacity assessment. It is not negligible, but it does not prevent using the working estimate.


