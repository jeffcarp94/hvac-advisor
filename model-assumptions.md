# HVAC methodology v5.0.0

This document describes the current implementation. Earlier behavior in the README changelog is historical. Values described as assumptions are not measured properties or calibrated probabilities. No field-measurement project is required to use the app.

## Owner decisions (October 23, 2026; factual prompt sources)

- Daytime HEAT 70°F / COOL 72°F; overnight HEAT 66°F / COOL 68°F. Targets no longer move to win an optimizer comparison.
- Current uses daytime targets 7–10 AM and 7–9 PM; at 9 PM it prepares for sleep using overnight targets through 10 PM. Pre-9 PM results expire at 9 PM. Existing end-of-transition one-minute buffer is retained.
- Preferred allowance: 2°F below and 1°F above a desired setpoint. Common mode-independent comparison envelope is HEAT target minus 2 through COOL target plus 1, bounded by a 65°F minimum: daytime 68–73°F; overnight 65–69°F. Overnight 66–69°F is preferred around the cooling target; cooling-only drift to 65°F is allowed without creating a reason to reheat.
- Temperature must recover into the envelope in 30 minutes; after that, over 30 consecutive minutes outside it is unsuitable. At least 15 consecutive minutes above the upper boundary plus 1°F is unsuitable. Any occupied-zone temperature below 65°F is unsuitable, including initial state. Initial recovery is included in scoring.
- Occupied-zone comfort is bedroom overnight; daytime warm/cold checks use the warmer/colder zones respectively, and the daytime floor checks both zones. Both zones are always checked for moisture, irrespective of occupancy.
- Condensation and sustained damp surfaces disqualify a setup independently of comfort or equipment score. No preference can override a failed screen.
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

Saturation is physical: diagnostic continuation removes excess air moisture, records condensed water, and releases latent heat. Any such condensation permanently rejects that candidate; condensation is never allowed to make a candidate eligible by drying the air.

## Condensation and mold-promoting surface screen

Check both zones from the initial state, with no condensation recovery grace period. Exposed cold-surface estimate:

`T_surface = T_zone - max(0,T_zone-T_out) × surfaceFactor`.

surfaceFactor .80 nominal / .85 and .90 sensitivity represents a cold frame/glazing screening surface. These are deliberately conservative assumed surface factors, not a measured R-value, thermal bridge survey, or transient surface model. Walls, shades, hidden cavities, bedding against walls, and air leakage may behave differently.

Disqualify if surface temperature is less than 2°F above indoor dew point at any evaluated point, or if estimated surface RH is at least 80% for 30 consecutive minutes. The margin and duration are preventive app criteria, not a prediction that mold develops in 30 minutes. The screen does not certify zero condensation or mold at every unobserved surface. Intentional evaporator/dehumidifier condensate in the designed drainage path is not a cabin condensation failure; this release screens cold envelope surfaces, not every grille, pipe, hidden cavity or drain malfunction.

The user requires moisture protection to precede comfort preference. When no candidate passes the screen, show **No suitable HVAC setup** and reasons; never prescribe a rejected setup. A moisture result remains estimated even when all three scenarios pass. Unknown initial RH and unmeasured surfaces are material uncertainties.

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

Window pressure includes wind and buoyancy. Working window wind = .5 × forecast speed, wall pressure coefficient ±.35, roof coefficient -.20; approximate .5 m buoyancy reference. Opposing wall exposure assignments Jeff/dinette versus Kim/sink are inferred configuration assumptions. Unknown parking heading/shielding is explored via reversed exposure, not claimed to be known from ZIP/GPS. Wind turbulence adds an exchange term .025 × area × window-wind-speed; it represents unresolved single-sided exchange at small net flow.

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

