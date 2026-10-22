# Thermal model and operating policies — v4.5.0

This is an engineering estimate for a Coach House Platinum III 250 DT, not a measured coach calibration. The owner does not need to collect recorded operating measurements. These assumptions make the calculation inspectable; they do not establish a prediction-error bound.

## Shared sensible heat balance

All three tabs now integrate the same single-zone equation:

`C_eff × dT_in/dt = UA × (T_out − T_in) + Q_internal + Q_solar + Q_heat − Q_cool`.

Temperatures are °F; time is hours; UA is BTU/(hr·°F); heat flows are BTU/hr; effective heat capacity is BTU/°F. Each segment with constant weather, gains, and equipment output has the exact solution `T(t) = T_eq + (T_start − T_eq) × exp(−t / tau)`, where `tau = C_eff / UA_total`. Thermostat crossings split the segment analytically. Five-minute boundaries also sample changing solar elevation. Every weather boundary and the exact window end are included, including partial intervals. Weather applies from its interval start; future weather is not applied early. With known coordinates, solar elevation applies on every tab, including dawn within an Overnight window. Without coordinates the shared fallback credits solar between local 06:00 and 19:00 at the entered sky factor; it does not know actual sunrise/sunset or parking orientation.

| Input | Working value | Basis and confidence |
|---|---:|---|
| Shell/glass heat-loss coefficient | 641/7 + 45/1 = 136.57 BTU/(hr·°F) | Existing owner/project envelope; high confidence in arithmetic, low in as-built accuracy |
| Wind adjustment | UA × (1 + 0.02 × wind in mph) | Existing empirical assumption; not explicit infiltration physics |
| Effective heat capacity | 136.57 × 2 = 273.14 BTU/°F | Interpret existing two-hour constant as the calm-air time constant; low confidence in the absolute value |
| AC sensible output | 11,250 BTU/hr | Existing Current-tab estimate, now used on every tab: 75% of 15,000 total. Low confidence as an operating-point prediction |
| Heat-pump output | 15,000 above 50°F; 13,000 at/below 50°F | Existing engineering estimates; not manufacturer performance curves |
| Furnace delivered output | 15,000 BTU/hr | Existing estimate of delivered heat, distinct from 19,000 BTU/hr fuel input |
| Internal heat | Awake 1,400 / asleep 1,000, plus 640 if dehumidifier enabled | Existing heat estimates; dehumidifier off contributes zero |

Keeping effective heat capacity fixed corrects the earlier implication that increasing wind increases the coach's thermal mass. At 20 mph, UA rises by 40% and the passive time constant becomes 2/1.4 = 1.43 hours. Ventilation adds `1.08 × CFM` BTU/(hr·°F) while operating and shortens the response time further. The existing 900 CFM value assumes available intake openings and effective airflow; rated fan flow does not guarantee this flow in the coach.

The two-hour assumption represents the combined effective storage of air, furnishings, contents, and structure. It is not an estimate of air mass alone. Retaining its calm-air baseline is more defensible than inventing a new material inventory. Absolute recovery times remain sensitive to this assumption.

The supplied Dometic installation manual establishes total cooling capacity, but supplies no sensible-capacity map for varying indoor humidity and outdoor temperature. The thermostat manual does not supply one either. Consequently 11,250 is a consistent working estimate, not an ASHRAE requirement, a verified Dometic sensible rating, or a constant physical sensible-heat ratio. With otherwise equal conditions, less sensible output lengthens recovery and can prevent reaching target. There is no indoor moisture balance in this release.

## Equipment and scoring behavior

Cooling/heating starts from actual cabin temperature, including a hot or cold start whose passive equilibrium would eventually be comfortable. Full modeled output applies during recovery. Ordinary COOL/HEAT operation uses ideal averaged cycling only after reaching its setpoint; it cannot instantly jump to setpoint or forced equilibrium. AUTO uses the CCC2's two-degree triggers and returns to setpoint before stopping. This is a thermal approximation: compressor startup delays, ordinary thermostat hysteresis, fan-speed-dependent capacity, duct losses, and heat-pump defrost cycles are not explicitly simulated.

MaxxFan exchanges heat with outdoor air while above its thermostat setting and idles below it. It can import heat when outdoors is hotter. Reaching its setting permits averaged cycling only when ventilation can offset the incoming load. It does not automatically achieve outdoor temperature or a fixed drift limit.

Comfort score integrates temperature outside the same band for all candidates in a tab, in weighted °F·hours with warm/cold weights 2/1: Daytime 68–72°F, Overnight 66–70°F, Current 70–72°F. Exact exponential integrals and threshold crossings avoid dependence on sample count. Initial temperature is recorded at window start; equipment recovery starts after that instant. Capacity warnings describe a load exceeding output at the target, distinct from merely starting outside target. Current recovery time is the first analytical crossing of the existing ±0.5°F target tolerance, rounded up to minutes, and must occur within the available window. First reaching target does not establish suitability if the cabin subsequently finishes outside its band.

Operating policy is applied to actual modeled calls and return temperatures. A rejected interval makes that candidate ineligible for the full window. Its diagnostic temperatures assume equipment off during rejected slices; they are not an approved automatic equipment-switching schedule. Passing these checks is not proof of hardware safety or uninterrupted comfort.

## Equipment-policy reconciliation

### Heat pump and AUTO heating

Daytime and Current assume the owner can monitor operation. Overnight assumes unattended operation. The app retains the project's 41°F lower limit for a heat-pump call; the generic controller manual is not used to lower that owner/project constraint. Idle equipment does not fail merely because outdoor temperature is below its operating policy.

| Context | Outdoor dew point | Minimum outdoor temperature for a heat-pump call |
|---|---:|---:|
| Monitored Daytime/Current | Any | 41°F |
| Unattended Overnight | Below 35°F | 41°F |
| Unattended Overnight | 35°F to below 38°F | 45°F |
| Unattended Overnight | 38°F or higher | 50°F |

The temperature minimum is inclusive. At exactly 35°F dew point the 45°F gate applies; at exactly 38°F the 50°F gate applies. These crossover temperatures and dew points are retained conservative app policies, not manufacturer-validated frost/defrost predictions. Monitored operation between 41°F and 50°F carries an uncertainty/monitoring note rather than inheriting the unattended gate. The note does not claim frost forms faster than defrost clears.

The CCC2 manual describes AUTO heat-source priority (HP, furnace, strip), generic auxiliary-furnace activation below 30°F, restoration above 35°F, and defrost behavior in the 30–42°F range. The exact installed backup configuration is not established. The model consequently rejects AUTO heat-pump calls below the app's 41°F limit and tells the user to select Furnace directly; it does not simulate a backup switch that has not been established for this coach. Generic defrost timing does not verify this coach's capacity or make the retained 41/45/50°F policy a manufacturer rating.

### One cooling fan setting across the window

Each AC/AUTO candidate is simulated with one complete setup. Daytime/Current try Auto, Medium, then High; Overnight tries Low, Medium, then High. The first setting that passes every operating interval is selected. A different fan choice requires a fresh whole-window simulation. No independently generated mitigation text can override the selected setting.

The supplied CCC2 manual says Auto cycles the fan with the compressor and selects Low for a setpoint difference of 4°F or less, Medium at 5–7°F, and High at 8°F or more. Continuous modeled differences below 5°F are conservatively screened as Low; this does not assert knowledge of the controller's internal temperature resolution. Fixed Low/Medium/High runs continuously. In Furnace mode the roof fan's Auto setting is off; the furnace blower controls itself.

The retained empirical coil screen is:

`T_coil_est = T_return − D_fan − max(0, 0.3 × (70 − T_out)) − max(0, 0.4 × (DP_indoor − 55))`.

All temperatures are °F. `D_fan` is 24/22/20°F for Low/Medium/High. The 70°F and 55°F reference points, multipliers, and fan depressions are existing engineering heuristics, not coefficients established by the supplied manuals. Auto uses its applicable actual speed, including Low near setpoint, rather than a fictitious intermediate depression. Return air is the modeled cabin temperature; low duty no longer adds up to 2°F to manufacture a passing result.

Every cooling segment must have an estimate at or above the 35°F app margin. Exact 35°F passes; every lower estimate fails, including exact 30°F. Numerical comparisons allow only 1e-8°F roundoff. The prior extra 5°F allowance and the separate duty/buffer bypass are removed. The empirical latent-fraction calculation and its claimed condensate-freeze certainty are removed. Low confidence in actual coil-temperature accuracy remains; this correction reconciles the app's policy rather than validating the equation. Displayed one-decimal estimates must not be mistaken for measurement precision.

If the modeled/entered indoor dew point exceeds 60°F, the app chooses fixed High for cooling. Dometic recommends High in high-humidity/high-outdoor-temperature conditions, but the numeric 60°F trigger is an app policy. Continuous fan operation does not guarantee prevention of ice, and a portable dehumidifier is not treated as a freeze-protection device.

Cooling instructions require a clean filter, unobstructed airflow, and at least two distribution vents open, or quick-cool plus one distribution vent. Observed-ice guidance follows the supplied installation manual: stop cooling, inspect/clean the filter and open vents, use FAN ONLY until clear, resume at a warmer setting, and obtain service if icing persists. The app does not infer that these physical prerequisites have been verified from weather inputs.

### Indoor humidity and dehumidifier assumptions

The owner confirmed in this conversation (factual prompt source) that the portable dehumidifier is normally enabled with a 50% RH automatic setpoint. The app defaults to enabled, retains 640 BTU/hr as an unverified average room-heat contribution while enabled, and includes an off option that removes that contribution on all tabs. A humidistat setpoint is not a duty fraction or a measurement of actual RH. This release does not infer runtime, condensate removal, or guaranteed 50% indoor RH from it.

Starting indoor RH is optional. If supplied, dew point is computed at the applicable starting cabin temperature (Interval Starting Temperature or Current Indoor Temperature). The screening scenario holds that dew point constant through the window, rather than holding RH constant as dry-bulb temperature changes. For screening, dew point is capped at the current return-air temperature to avoid an impossible supersaturated state; this saturation bound does not calculate condensate or claim a modeled moisture-removal rate. If RH is blank, the existing `outdoor dew point − 3°F` estimate is used and clearly labeled as a proxy, with the same saturation cap. This estimate can change with weather; it is not a simulated indoor moisture state. Both paths are low-confidence approximations without moisture storage, occupants' moisture production, infiltration moisture, or AC/dehumidifier condensate balances. No recorded measurements or calibration dataset is required; the input can stay blank.

For the existing dew-point helper, `T_C = (T_F − 32) × 5/9`, `g = ln(RH/100) + 17.27 × T_C / (237.3 + T_C)`, and `DP_C = 237.3 × g / (17.27 − g)`; temperatures in the helper formula are °C, RH is percent, and the result is converted back to °F. This is an approximation, not sensor accuracy. User-entered RH outside 1–100% blocks analysis; blank explicitly selects the estimate. Input edits invalidate results and retain the chosen weather source.

MaxxFan retains the app's 62°F outdoor-dew-point comfort preference. It is no longer presented as a universal ASHRAE prohibition or proof of immediate discomfort at every duration. [ASHRAE Addendum h to Standard 55-2020](https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/55_2020_h_20221230.pdf), Informative Appendix H, humidity discussion (printed p.11), explains why a standalone universal humidity threshold is not its thermal-comfort criterion. This does not certify compliance with any standard. Daytime/Overnight retain the existing full-period open-window ventilation minimum of 65°F, a more conservative open-window policy than short Current operation. Current can model colder-air cooling under monitoring and thermostat control; it no longer rejects based on a hypothetical full-flow equilibrium that ignores the fan turning off. Actual window leakage after fan shutoff remains unmodeled. Active ventilation that would import warmer outdoor air is rejected for the single-setup recommendation.

### Comfort suitability and fallback

Operating-policy eligibility, full-window minimum-floor compliance, final-band recovery, and the integrated discomfort score are separate fields. A setup is suitable only if it passes operating policies, its unrounded predicted temperature never drops below 65°F (including the starting state), and its unrounded final temperature is within the tab's desired band with ±0.5°F tolerance. This tolerance reuses the established Current target tolerance for consistent recovery decisions. It is an app choice, not a manufacturer or comfort-standard limit.

Initial hot starts and transient desired-band misses remain scored and displayed; a small miss does not by itself declare an equipment hazard. Final-band compliance is not a claim to have held the desired band throughout. All candidates now use a common band within a tab, correcting the earlier AC-versus-heating scoring bias. Existing warm/cold weights 2/1 and system-priority tiebreaking remain within the suitable pool.

When no setup meets these criteria, the UI explains the specific reason in plain language and identifies the best modeled alternative. A furnace with full-output equilibrium below 65°F and a failed floor check is described as unable to maintain the 65°F minimum; AC capacity shortfalls name the selected cooling setpoint. Inadequate recovery time, an initial cold start, a mode unable to heat/cool as needed, and AUTO temperature drift receive distinct explanations. Potential AC icing remains an explicit red equipment-risk warning with stop-cooling/FAN ONLY guidance; comfort shortfalls alone are not described as equipment damage. Blocked equipment receives no setup instructions. It does not mark that alternative as recommended or tell the owner to continue it into a later, unanalyzed window. A cold start below 65°F cannot truthfully be called full-window floor compliant even when a furnace can recover; its recovery remains visible as an alternative. Extreme heat/cold can likewise produce a genuine no-suitable result while some equipment remains policy-eligible. This distinction is model logic, not a human-health temperature-safety assessment.

| Claim | Source agreement and confidence | Remaining uncertainty |
|---|---|---|
| CCC2 Auto speed selection, continuous fixed fan, roof fan off in Furnace Auto | Agrees with supplied CCC2 manual pp.9–12; Medium (single primary manual) | Exact installed configuration and sensor resolution |
| Open outlets, filter/airflow, observed-ice recovery, High fan advice | Agrees with supplied Dometic rooftop installation manual p.18; Medium (single primary manual) | Actual physical airflow and maintenance not sensed by the app |
| 41/45/50°F crossover, 35/38°F dew points, 35°F coil margin, 60/62°F humidity triggers | App policies, not manufacturer-validated numerical rules; Low for physical prediction | Installed equipment and actual moisture/coil behavior |
| 50% RH dehumidifier setpoint normally enabled | Owner-confirmed prompt fact; High for stated configuration | Actual RH, cycling, average heat and water removal remain uncertain |
| Comfort floor/final-band selection behaves as documented | Agrees with deterministic regression tests; High for code behavior | Accuracy of the underlying temperature forecast remains unbounded |

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

## Source hierarchy

Component manuals take precedence over Coach House, Ford, accessory manufacturers, and general references, in that order. Supplied manuals consulted: Dometic 3314080 CCC2 Operating Instructions (COOL/HP/AUTO operation and fan selection), Dometic rooftop installation instructions (capacity and frost guidance), MaxxFan 8501K operating guide (thermostat-controlled variable/cycling operation), Suburban NT20SQ service/training manual (19,000 BTU/hr input), and Coach House Platinum III 2023/24 model-specific manual (dimensions). Manufacturer accessory pages above are dimensional proxies only; they are not substituted for equipment thermal-performance documentation.

The one-zone energy balance and fixed effective-capacity approach are consistent in form with the [EnergyPlus zone heat-balance reference](https://energyplus.readthedocs.io/en/stable/guides/engineering-reference/2.1-basis-for-the-zone-and-air-system-integration.html). That reference supports the equation structure, not this coach's numerical coefficients.
