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

For a temperature T and target P, let m=max(0,abs(T-P)-0.5°F). Inside tolerance the loss is zero. Normalize a preferred-side miss by the distance from the tolerance edge to that side's comfort bound, so preferred-side losses span 0–1 within the band. An opposite-side miss has loss 1 plus its similarly normalized distance, implementing preference for the entire cooler side for heating and warmer side for cooling. This normalization preserves the user's asymmetric awake band: heating at 68°F outranks heating at 73°F despite being farther from 71°F, and cooling reverses that preference. Within the preferred side, closer ranks better. OFF and idle AUTO have no directional preference and use m divided by the larger tolerance-edge-to-bound distance. AUTO applies heating/cooling direction when that operation is active; MaxxFan is a cooling mode. These are explicit implementation conventions for modes without one fixed thermal direction.

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


