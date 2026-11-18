// WP9 (v6.6.19): moisture buffer, dehumidifier taper and returned moisture, AC latent degradation.
// Weather and coach states below are synthetic (labeled); none is fitted to a fixture.
const test=require('node:test'),assert=require('node:assert/strict'),{app}=require('./helpers.cjs');
const near=(x,y,tol=1e-9,msg)=>assert.ok(Math.abs(x-y)<=tol,`${msg?msg+': ':''}${x} != ${y} (±${tol})`);
const G=453.59237;

test('buffer capacity is 30 g/%RH (40 m² × 0.75 g/(m²·%RH)) split by zone volume, stored as water mass',()=>{
 const a=app();
 near(a.run('bufferCapacityLbPerRH()')*G,30,1e-9);
 near(a.run('bufferEquilibrium([50,50]).reduce((x,y)=>x+y)')*G,1500,1e-6);
 near(a.run('bufferEquilibrium([50,50])[0]/bufferEquilibrium([50,50]).reduce((x,y)=>x+y)'),a.run('M.fraction[0]'));
 // The stored mass does not change when only temperature or pressure change (no equivalent humidity ratio).
 a.run(`b0=[.5,.6];r=mixedMoistureStep(humidityRatio(70,50),70,0,0,0,1e-9,false,SEA_LEVEL_PA,72,1,{mass:b0,temperatures:[60,80]});`);
 near(a.run('r.buffer[0]'),.5,1e-9);near(a.run('r.buffer[1]'),.6,1e-9);
});

test('buffer time constant: against a fixed room RH, the stored water relaxes with τ_b = 4 h',()=>{
 const a=app();
 // A huge air mass holds the room RH fixed at 60%; the buffer starts in equilibrium with 40%.
 a.run(`w=humidityRatio(70,60);b=bufferEquilibrium([40,40]);target=bufferEquilibrium([60,60]);
  for(let i=0;i<4000;i++){r=mixedMoistureStep(w,70,0,0,0,.001,false,SEA_LEVEL_PA,1e9,1,{mass:b,temperatures:[70,70]});b=r.buffer;}`);
 const fraction=a.run('(b[0]+b[1]-bufferEquilibrium([40,40]).reduce((x,y)=>x+y))/(target[0]+target[1]-bufferEquilibrium([40,40]).reduce((x,y)=>x+y))');
 near(fraction,1-Math.exp(-1),2e-4,'63.2% of the step after one τ_b');
 // Closed coach: air and buffer exchange conserve water exactly.
 a.run(`w=humidityRatio(70,75);b=bufferEquilibrium([50,50]);air=72;start=w*air+b[0]+b[1];
  for(let i=0;i<480;i++){r=mixedMoistureStep(w,70,0,0,0,.05,false,SEA_LEVEL_PA,air,1,{mass:b,temperatures:[68,71]});w=r.water;b=r.buffer;}`);
 near(a.run('w*air+b[0]+b[1]'),a.run('start'),1e-12,'closed air + buffer water');
 assert.ok(a.run('rhFromRatio(70,w)')<60,'buffer pulls a humid room toward its stored state');
});

test('dehumidifier taper: unchanged above 59°F, continuous at 59°F, zero removal at 41°F with electrical heat continuing',()=>{
 const a=app();
 near(a.run('dehumidifierPerformance(59,60).capacityLbHr'),a.run('dehumidifierPerformance(59.000001,60).capacityLbHr'),1e-6);
 near(a.run('dehumidifierPerformance(58.999999,60).capacityLbHr'),a.run('dehumidifierPerformance(59,60).capacityLbHr'),1e-6);
 near(a.run('dehumidifierPerformance(41,60).capacityLbHr'),0);
 near(a.run('dehumidifierPerformance(50,60).capacityLbHr'),a.run('dehumidifierPerformance(59,60).capacityLbHr')/2,1e-12);
 near(a.run('dehumidifierPerformance(45,60).powerBTU'),a.run('dehumidifierPerformance(59,60).powerBTU'),1e-12);
 assert.equal(a.run('dehumidifierPerformance(40.9,60).capacityLbHr'),0);assert.equal(a.run('dehumidifierPerformance(40.9,60).powerBTU'),0);
 // Above 59°F the NREL curve is unchanged (65°F / 60% normalization).
 near(a.run('dehumidifierPerformance(65,60).capacityLbHr/M.moistureLbPerPint*24'),20);
 // Humidistat calls at 41°F: the compressor runs (electrical heat) but removes nothing.
 a.run(`state.dehumidifierEnabled=true;cold=mixedMoistureStep(humidityRatio(41,80),41,0,0,0,.5,true);`);
 near(a.run('cold.removal'),0);near(a.run('cold.runtime'),1);
 near(a.run('cold.electricalBTU'),a.run('dehumidifierPerformance(41,80).powerBTU'),1e-9);assert.ok(a.run('cold.heatBTU')>0);
});

test('dehumidifier returned moisture: 15% of cycling removal, one process, continuous to full load',()=>{
 const a=app();a.run(`state.dehumidifierEnabled=true;w=humidityRatio(70,60);cap=dehumidifierPerformance(70,60).capacityLbHr;`);
 a.run('light=mixedMoistureStep(w,70,0,0,0,.5,true)');
 near(a.run('light.grossRemoval*(1-DEHUM_WP9.returnedFraction)'),a.run('light.removal'),1e-12);
 near(a.run('light.returned'),a.run('light.grossRemoval*DEHUM_WP9.returnedFraction'),1e-12);
 near(a.run('light.partLoad*cap'),a.run('light.grossRemoval'),1e-12);
 // Heat counts the net latent release once (returned water condenses and re-evaporates in the zone).
 near(a.run('light.heatBTU'),a.run('light.electricalBTU+light.removal*M.latentBTUPerLb'),1e-9);
 a.run('heavy=mixedMoistureStep(w,70,5,0,0,.5,true)');
 near(a.run('heavy.partLoad'),1);near(a.run('heavy.removal'),a.run('cap'),1e-12);near(a.run('heavy.returned'),0,1e-12);
 // Continuity: sweep the demand through the cycling limit; net removal and returned water never jump.
 const sweep=a.run(`out=[];for(let s=0;s<=1.2;s+=.0005){const r=mixedMoistureStep(w,70,s*cap*.5,0,0,.5,true);out.push([r.removal,r.returned,r.partLoad]);}JSON.stringify(out)`);
 const rows=JSON.parse(sweep);
 for(let i=1;i<rows.length;i++){for(const k of [0,1,2])assert.ok(Math.abs(rows[i][k]-rows[i-1][k])<.01,`step ${i} field ${k}`);}
 assert.ok(rows.every(r=>r[1]>=-1e-15&&r[1]<=.15*a.run('cap')+1e-12));
});

// Rated entering condition for the EnergyPlus latent-degradation scaling: 26.7°C dry bulb, 19.4°C wet bulb.
function ratedW(a){return a.run(`(()=>{let lo=0,hi=.03;for(let i=0;i<80;i++){const m=(lo+hi)/2;if(wp6WetBulb(26.7,m,SEA_LEVEL_PA)>19.4)hi=m;else lo=m;}return(lo+hi)/2;})()`);}

test('time-domain Henderson–Rengarajan reproduces the EnergyPlus 25.1 closed form under periodic cycling',()=>{
 const a=app();const w=ratedW(a);
 a.run(`ql=liveRatedLatentLbHr();tF=26.7*9/5+32;`);
 for(const X of [.2,.35,.5,.65,.8]){
  // E+ cycle at runtime fraction X: t_on = 3600/(4·Nmax·(1−X)), t_off = 3600/(4·Nmax·X).
  const ratio=a.run(`(()=>{const L=LATENT_DEGRADATION,ton=1/(4*L.nMaxPerHour*(1-${X})),toff=1/(4*L.nMaxPerHour*${X}),n=400;
   let coil={water:0,onHours:0},drained=0,latent=0;
   for(let cycle=0;cycle<40;cycle++){drained=0;latent=0;
    for(let i=0;i<n;i++){const r=coilMoistureStep(coil,{compressor:true,continuous:true,blower:true,latentLbHr:ql,ratedLatentLbHr:ql,tF,w:${w},pressure:SEA_LEVEL_PA},ton/n);
     coil=r.coil;drained+=r.drainedLb;latent+=r.airRemovalLbHr*ton/n;}
    for(let i=0;i<n;i++){const r=coilMoistureStep(coil,{compressor:false,continuous:true,blower:true,latentLbHr:0,ratedLatentLbHr:ql,tF,w:${w},pressure:SEA_LEVEL_PA},toff/n);coil=r.coil;}}
   return drained/latent;})()`);
  const closed=a.run(`latentDegradationRatio(${X})`);
  // The closed form counts drainage time at full Q_L; the time-domain ramp is exact. Agreement within 0.02.
  near(ratio,closed,.02,`X=${X}`);
 }
 near(a.run('latentDegradationRatio(1)'),1);near(a.run('latentDegradationRatio(0)'),0);
});

test('equal duty and equal airflow: continuous-fan latent removal ≤ AUTO-fan latent removal',()=>{
 const a=app();a.run(`w=humidityRatio(75,60);ql=acMoistureRemoval(w,1);rated=liveRatedLatentLbHr();`);
 const run=continuous=>a.run(`(()=>{let coil={water:0,onHours:0},drained=0,air=0;
  for(let cycle=0;cycle<12;cycle++)for(const [on,minutes] of [[true,8],[false,12]])for(let i=0;i<16;i++){
   const r=coilMoistureStep(coil,{compressor:on,continuous:${continuous},blower:on||${continuous},latentLbHr:on?ql:0,ratedLatentLbHr:rated,tF:75,w,pressure:SEA_LEVEL_PA},minutes/60/16);
   coil=r.coil;drained+=r.drainedLb;air+=r.airRemovalLbHr*minutes/60/16;}
  return{drained,air,held:coil.water};})()`);
 const fixed=run(true),auto=run(false);
 assert.ok(fixed.air<=auto.air+1e-12,'net room-air removal');assert.ok(fixed.drained<=auto.drained+1e-12,'drained water');
 assert.ok(auto.air-fixed.air>.1,'the difference is material at a 40% runtime');
 // AUTO fan: no off-cycle evaporation, so room-air removal equals the steady-state latent.
 near(auto.air,a.run('ql')*12*8/60,1e-9);
});

test('dry coil and equipment handoffs: no accumulation when dry; evaporation only while the blower runs',()=>{
 const a=app();a.run(`w=humidityRatio(75,50);rated=liveRatedLatentLbHr();base={tF:75,w,pressure:SEA_LEVEL_PA,ratedLatentLbHr:rated};`);
 near(a.run('coilMoistureStep({water:0,onHours:0},{...base,compressor:true,continuous:true,blower:true,latentLbHr:0},.25).coil.water'),0);
 near(a.run('coilMoistureStep({water:.3,onHours:.1},{...base,compressor:true,continuous:true,blower:true,latentLbHr:0},.25).coil.water'),.3,1e-12);
 near(a.run('coilMoistureStep({water:.3,onHours:0},{...base,compressor:false,continuous:false,blower:false,latentLbHr:0},.25).coil.water'),.3,1e-12);
 assert.ok(a.run('coilMoistureStep({water:.3,onHours:0},{...base,compressor:false,continuous:true,blower:true,latentLbHr:0},.25).coil.water')<.3);
 // A full coil dries at 2·t_wet/γ scaled by the wet-bulb depression; never below zero.
 near(a.run('coilMoistureStep({water:coilHoldingLb(rated),onHours:0},{...base,compressor:false,continuous:true,blower:true,latentLbHr:0},10).coil.water'),0);
 // Saturated air: no wet-bulb depression, no evaporation.
 near(a.run('coilEvaporationLbHr(rated,75,humidityRatio(75,100))'),0,1e-6);
 // Coil filling: drains only beyond the holding capacity M_o = Q_L,rated · t_wet.
 near(a.run('coilHoldingLb(rated)'),a.run('rated')*1000/3600,1e-12);
 const fill=a.run(`(()=>{let c={water:0,onHours:0},d=0;for(let i=0;i<120;i++){const r=coilMoistureStep(c,{...base,compressor:true,continuous:true,blower:true,latentLbHr:rated},1/240);c=r.coil;d+=r.drainedLb;}return{held:c.water,d};})()`);
 near(fill.held,a.run('coilHoldingLb(rated)'),1e-12);assert.ok(fill.d>0);
 // Start-up ramp: removal + shortfall equals the steady-state latent (total capacity unchanged).
 a.run(`s=coilMoistureStep({water:0,onHours:0},{...base,compressor:true,continuous:true,blower:true,latentLbHr:rated},30/3600);`);
 near(a.run('s.airRemovalLbHr+s.shortfallLbHr'),a.run('rated'),1e-12);assert.ok(a.run('s.shortfallLbHr')>0);
 // AUTO fan has no ramp in EnergyPlus' formulation.
 near(a.run(`coilMoistureStep({water:0,onHours:0},{...base,compressor:true,continuous:false,blower:true,latentLbHr:rated},30/3600).shortfallLbHr`),0);
});

function plan(a,{mode='ac',fan='Low',dehum=true,hours=24,tOut=80,rh=80,setpoints='{cool:70,heat:66}',start=72,extra=''}={}){
 a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=${dehum};
 e={windowStart:new Date('2026-07-24T03:00Z'),windowEnd:new Date(Date.parse('2026-07-24T03:00Z')+${hours}*3600000),wind:3,cloud:1,points:[{time:new Date('2026-07-24T03:00Z'),tOut:${tOut},rh:${rh},wind:3,cloud:1}]};
 p=zoneProfile('${mode}',e,true,${setpoints},C.metaSleep,${start},{initialZones:{temperature:[${start},${start}],rh:[60,58]},fanSetting:'${fan}',frontControl:true,checkEquipment:false${extra}});`);
 return a.run('p.moisture');
}

test('whole-coach moisture residual is under 1 g/day and under 0.1%/day (air + buffer + coil)',()=>{
 const a=app();
 const cases=[{mode:'ac',fan:'Low'},{mode:'ac',fan:'Auto'},{mode:'ac',fan:'High',dehum:false},
  {mode:'hp',fan:'Low',tOut:45,rh:90,setpoints:'{cool:74,heat:68}',start:66},{mode:'auto',fan:'Medium',tOut:60,rh:95,setpoints:'{cool:72,heat:68}',start:70},
  {mode:'passive',fan:'Auto',tOut:55,rh:95,dehum:true}];
 for(const c of cases){
  const m=plan(a,c),days=1,residualG=Math.abs(m.residualLb)*G;
  const inventory=m.initialWaterLb*G;
  assert.ok(residualG/days<1,`${c.mode}/${c.fan}: ${residualG} g/day`);
  assert.ok(residualG/inventory*100/days<.1,`${c.mode}/${c.fan}: ${residualG/inventory*100} %/day`);
  assert.equal(m.buffer,true);
  // Room water (air + buffer) closes with the air-side AC term; the coil closes with drained water.
  near(m.initialWaterLb+m.totals.occupants+m.totals.outside-m.totals.ac-m.totals.dehumidifier-m.condensedLb-m.finalWaterLb,0,1e-9,'room ledger');
  near(m.totals.ac-m.totals.acDrained-m.coilWaterLb,0,1e-9,'coil ledger');
 }
});

test('heat accounting: coil re-evaporation is adiabatic (latent gain = sensible cooling)',()=>{
 const a=app();
 // Synthetic: closed coach, COOL 85 so the compressor never runs; a coil starting with 0.5 lb of
 // water (test hook) evaporates only when the fixed fan runs.
 const run=fan=>{a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=false;
  e={windowStart:new Date('2026-07-24T03:00Z'),windowEnd:new Date('2026-07-24T03:20Z'),wind:0,cloud:1,points:[{time:new Date('2026-07-24T03:00Z'),tOut:72,rh:50,wind:0,cloud:1}]};
  q=zoneProfile('ac',e,true,{cool:85,heat:60},0,72,{initialZones:{temperature:[72,72],rh:[50,50]},fanSetting:'${fan}',frontControl:true,checkEquipment:false,initialCoilWaterLb:.5,moistureBuffer:false});`);
  return a.run(`({energy:(()=>{const s=zoneStorage();return q.finalZones.temperature.reduce((x,t,z)=>x+s.air[z]*(t-72),0)+q.finalZones.mass.reduce((x,t,z)=>x+s.mass[z]*(t-72),0);})(),
   // Conduction plus infiltration gain from outdoors (72°F), trapezoidal over the trace (UA per zone).
   conduction:(()=>{const u=envelopeAllocation(3),ua=[u.rear,u.front];let g=0;for(let i=1;i<q.trace.length;i++){const h=(q.trace[i].time-q.trace[i-1].time)/3600000;
     g+=h*(ua[0]*(72-(q.trace[i].bedroom+q.trace[i-1].bedroom)/2)+ua[1]*(72-(q.trace[i].midCoach+q.trace[i-1].midCoach)/2));}return g;})(),
   evaporated:q.moisture.totals.coilEvaporated,coil:q.moisture.coilWaterLb,residual:q.moisture.residualLb,cool:q.coolMinutes})`);};
 const fixed=run('Low'),auto=run('Auto');
 assert.equal(fixed.cool,0);assert.equal(auto.cool,0);
 near(auto.evaporated,0);near(auto.coil,.5,1e-12);assert.ok(fixed.evaporated>.05);
 const latent=fixed.evaporated*a.run('M.latentBTUPerLb');
 // Same internal gains in both runs. Stored sensible heat lost by the fixed-fan run, net of its
 // extra conduction gain from outdoors, equals the latent heat of the returned water (within 2%).
 const lost=(auto.energy-auto.conduction)-(fixed.energy-fixed.conduction);
 assert.ok(Math.abs(lost-latent)/latent<.02,`stored heat change ${lost} vs latent ${latent}`);
 near(fixed.residual,0,1e-12);
});

test('continuous fan with a short-cycling AC raises room RH relative to AUTO fan (synthetic humid night)',()=>{
 const a=app();
 const fixed=plan(a,{fan:'Low',dehum:false,hours:6}),auto=plan(a,{fan:'Auto',dehum:false,hours:6});
 assert.ok(fixed.maxRH>auto.maxRH,`${fixed.maxRH} vs ${auto.maxRH}`);
 assert.ok(fixed.totals.coilEvaporated>0);near(auto.totals.coilEvaporated,0);
 assert.ok(fixed.totals.acDrained<=auto.totals.acDrained);
});

test('checkpoints carry buffer and coil water; cached continuation equals the direct run',()=>{
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.temp=80;state.rh=80;state.wind=2;state.cloud=1;
 r={start:new Date('2026-07-24T02:55Z'),reading:new Date('2026-07-24T02:55Z'),initial:{temperature:[74,75],rh:[62,60]},occupancy:'staying',remote:false};
 e=makeEnvelope(r.start,planBounds(r.start).end,'WP9 carry (synthetic)',300000);
 ph=[{time:+r.start,setup:planSetup('ac',false,null,'Low')},{time:+r.start+40*60000,setup:planSetup('ac',true,null,'Low')}];rows=planRows(e,r);
 direct=evaluatePlan(ph,e,r,rows);e.planCache=new Map();first=evaluatePlan(ph.slice(0,1),e,r,rows);cached=evaluatePlan(ph,e,r,rows);`);
 assert.equal(a.run('JSON.stringify(direct.trials.map(t=>({trace:t.trace,moisture:t.moisture,z:t.finalZones})))'),
  a.run('JSON.stringify(cached.trials.map(t=>({trace:t.trace,moisture:t.moisture,z:t.finalZones})))'));
 assert.ok(a.run('direct.trials.every(t=>Array.isArray(t.finalZones.buffer)&&t.finalZones.coil&&Number.isFinite(t.finalZones.coil.water))'));
});
