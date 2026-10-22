# Thermal model assumptions — v4.4.0

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
| Internal heat | Awake 1,400 / asleep 1,000, plus 640 dehumidifier | Existing assumptions, still applied throughout each applicable profile |

Keeping effective heat capacity fixed corrects the earlier implication that increasing wind increases the coach's thermal mass. At 20 mph, UA rises by 40% and the passive time constant becomes 2/1.4 = 1.43 hours. Ventilation adds `1.08 × CFM` BTU/(hr·°F) while operating and shortens the response time further. The existing 900 CFM value assumes available intake openings and effective airflow; rated fan flow does not guarantee this flow in the coach.

The two-hour assumption represents the combined effective storage of air, furnishings, contents, and structure. It is not an estimate of air mass alone. Retaining its calm-air baseline is more defensible than inventing a new material inventory. Absolute recovery times remain sensitive to this assumption.

The supplied Dometic installation manual establishes total cooling capacity, but supplies no sensible-capacity map for varying indoor humidity and outdoor temperature. The thermostat manual does not supply one either. Consequently 11,250 is a consistent working estimate, not an ASHRAE requirement, a verified Dometic sensible rating, or a constant physical sensible-heat ratio. With otherwise equal conditions, less sensible output lengthens recovery and can prevent reaching target. There is no indoor moisture balance in this release.

## Equipment and scoring behavior

Cooling/heating starts from actual cabin temperature, including a hot or cold start whose passive equilibrium would eventually be comfortable. Full modeled output applies during recovery. Ordinary COOL/HEAT operation uses ideal averaged cycling only after reaching its setpoint; it cannot instantly jump to setpoint or forced equilibrium. AUTO uses the CCC2's two-degree triggers and returns to setpoint before stopping. This is a thermal approximation: compressor startup delays, ordinary thermostat hysteresis, fan-speed-dependent capacity, duct losses, and heat-pump defrost cycles are not explicitly simulated.

MaxxFan exchanges heat with outdoor air while above its thermostat setting and idles below it. It can import heat when outdoors is hotter. Reaching its setting permits averaged cycling only when ventilation can offset the incoming load. It does not automatically achieve outdoor temperature or a fixed drift limit.

Comfort score integrates temperature outside the existing candidate-specific bands in weighted °F·hours, with the existing warm/cold weights (2/1). Exact exponential integrals and threshold crossings avoid dependence on sample count. Initial temperature is recorded at window start; equipment recovery starts after that instant. Capacity warnings describe a load exceeding output at the target, distinct from merely starting outside target. Current recovery time is the first analytical crossing of the existing ±0.5°F target tolerance, rounded up to minutes, and must occur within the available window.

Existing equipment policy is applied to actual modeled calls, return temperatures, and duty fractions. A rejected interval makes that candidate ineligible for the full window. Its plotted/diagnostic temperatures assume equipment off during rejected slices; they are not an approved automatic equipment-switching schedule. Existing equipment-policy, freeze/humidity heuristics, and comfort-floor eligibility remain the next repair category; passing these checks is not proof of hardware safety or whole-window comfort.

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
