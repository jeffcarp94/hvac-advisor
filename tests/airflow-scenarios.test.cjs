// v6.6.16: evidence-based interzone airflow sensitivity cases (AIR_WEATHER_CASES).
// Provenance: owner garage runs (YoLink, digitized ±0.3°F, ±1 min; field observation), the v6.6.15
// joint fit, and tools/analysis/airflow-extremes.cjs. The steady nights below are reconstructed
// (synthetic) inputs, labeled as such; they bracket the bedroom offset and are not pass/fail targets.
const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');

const AIRFLOW={
 working:{flow:1,windSign:0,mix:1,ductRear:null,furnaceRear:null,widthFt:null},
 // v6.6.27 (R1): re-centered on the refit; ends from tools/analysis/airflow-extremes.cjs (restricted
 // furnace rear rounded inward to .568 so the 3-decimal value stays within the garage-run limit).
 restricted:{flow:.7,windSign:1,mix:.92,ductRear:.387,furnaceRear:.568,widthFt:.25},
 greater:{flow:1.2,windSign:-1,mix:1.805,ductRear:.336,furnaceRear:.683,widthFt:1.481}};
// Not airflow terms: unchanged from v6.6.15 pending a separate owner decision.
const OTHER={
 working:{rhOffset:0,tempOffset:0,surfaceFactor:.8,cabFactor:3},
 restricted:{rhOffset:5,tempOffset:2,surfaceFactor:.85,cabFactor:4.5},
 greater:{rhOffset:5,tempOffset:-2,surfaceFactor:.9,cabFactor:1.5}};

test('case values and names are pinned; the working estimate keeps the calibrated nominal',()=>{
 const a=app(),cases=JSON.parse(a.run('JSON.stringify(AIR_WEATHER_CASES)'));
 assert.deepEqual(cases.map(c=>c.name),['working estimate','restricted airflow / warmer','greater airflow / cooler']);
 ['working','restricted','greater'].forEach((k,i)=>{
  for(const [f,v] of Object.entries({...AIRFLOW[k],...OTHER[k]}))assert.equal(cases[i][f],v,`${k}.${f}`);
 });
 assert.equal(a.run('AIR_SCENARIOS.length'),9);
 assert.equal(a.run('AIR_SCENARIOS.every(s=>s.name.includes(" / "))'),true);
});

test('null airflow fields reproduce the calibrated constants exactly (nominal unchanged)',()=>{
 const a=app();
 a.run(`forecast.timeZone='America/Chicago';state.temp=58;state.rh=25;state.wind=2;state.cloud=1;
  r={start:new Date('2026-10-24T02:50Z'),reading:new Date('2026-10-24T02:50Z'),initial:{temperature:[68,68],rh:[30,30]},occupancy:'staying',remote:false};
  e=makeEnvelope(r.start,planBounds(r.start).end,'Reconstructed steady night',300000);e.points.forEach(p=>p.tOut=30);
  ph=[{time:+r.start,setup:withSetting(planSetup('furnace',true),63)}];
  implicit=simulatePlan(ph,e,r,AIR_SCENARIOS[0],null,null,false,true);
  explicit=simulatePlan(ph,e,r,{...AIR_SCENARIOS[0],ductRear:DUCT.rearFraction,furnaceRear:FURNACE.rearFraction,widthFt:INTERZONE.widthFt},null,null,false,true);`);
 // v6.6.22: only the nominal scenario object's trace carries the WP12 slow-storage fields; compare trajectories without them.
 a.run("noWp12=(k,v)=>k==='bedMass'||k==='midMass'?undefined:v");
 assert.equal(a.run('JSON.stringify(implicit.trace,noWp12)'),a.run('JSON.stringify(explicit.trace,noWp12)'));
 assert.equal(a.run('JSON.stringify(implicit.finalZones)'),a.run('JSON.stringify(explicit.finalZones)'));
});

test('per-case delivery splits conserve heat and route furnace mass gains by the case share',()=>{
 const a=app();
 for(const op of ['hp','ac','furnace']){
  const g=a.run(`zoneHeatGains([0,0],0,10000,'${op}',null,{ductRear:.4,furnaceRear:.52})`);
  assert.ok(Math.abs(g[0]+g[1]-10000)<1e-9,op);
  assert.ok(Math.abs(g[0]-(op==='furnace'?5200:4000))<1e-9,op);
 }
 const d=a.run(`zoneHeatGains([0,0],0,10000,'furnace',null,{ductRear:null,furnaceRear:null})`);
 assert.ok(Math.abs(d[0]-10000*a.run('FURNACE.rearFraction'))<1e-9);
 // Width enters the buoyant term linearly.
 assert.ok(Math.abs(a.run('buoyantExchangeCFM(70,72,.28)')/a.run('buoyantExchangeCFM(70,72,.56)')-.5)<1e-12);
});

// Same procedure as tools/analysis/joint-fit.cjs (both owner garage runs, observations to minute 106).
function garageRMSE(fixture,mode,on,off,airflow){
 const g=require('./fixtures/'+fixture),a=app(),base=Date.parse(g.startUtc),end=106;
 a.ctx.points=g.minutes.map((m,i)=>({time:new Date(base+m*60000),tOut:g.garage[i],rh:42,wind:0,cloud:0,precip:'none'}))
  .filter(p=>+p.time>=base+(on-1)*60000&&+p.time<=base+(end+1)*60000);
 const i0=g.minutes.indexOf(on);
 a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=false;solarLoad=()=>0;solarZoneGains=()=>[0,0];
  start=new Date(${base+on*60000});
  r={start,reading:start,initial:{temperature:[${g.rear[i0]},${g.front[i0]}],rh:[40,40]},occupancy:'away',remote:false,departure:start,returnTime:new Date(${base+(end+60)*60000}),actualConfirmed:true};
  e={windowStart:start,windowEnd:new Date(${base+end*60000}),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,singlePoint:false,points,cloud:0,wind:0,precip:'none',elevationM:300};
  heat=withSetting(planSetup('${mode}',false,null,'High'),90);r.actual=heat;
  sim=simulatePlan([{time:+start,setup:heat},{time:${base+off*60000},setup:planSetup('passive',false)}],e,r,{...AIR_SCENARIOS[0],...${JSON.stringify(airflow)}},null,null,false,true);
  out=sim.trace.map(x=>[(+x.time-${base})/60000,x.bedroom,x.midCoach]);`);
 const tr=a.run('out');let sf=0,sr=0,sg=0,n=0;
 g.minutes.forEach((m,i)=>{if(m<on||m>end)return;const x=tr.find(x=>x[0]>=m-1e-9);if(!x)return;
  sf+=(x[2]-g.front[i])**2;sr+=(x[1]-g.rear[i])**2;sg+=((x[1]-x[2])-(g.rear[i]-g.front[i]))**2;n++;});
 return{front:Math.sqrt(sf/n),rear:Math.sqrt(sr/n),gap:Math.sqrt(sg/n)};
}
test('each sensitivity airflow set still reproduces both owner garage runs within the stated tolerance',()=>{
 // Limit = v6.6.27 refit residual (HP .291/.307/.472, furnace .344/.326/.362 °F) combined in quadrature
 // with the 0.3°F digitizing tolerance. Non-airflow values stay at their v6.6.27 calibration.
 const limit=r=>Math.hypot(r,.3);
 for(const k of ['restricted','greater']){
  const {mix,ductRear,furnaceRear,widthFt}=AIRFLOW[k],set={mix,ductRear,furnaceRear,widthFt};
  const hp=garageRMSE('garage-heat-pump-2026-11-16.json','hp',20,44,set);
  const fu=garageRMSE('garage-furnace-2026-11-17.json','furnace',10,53,set);
  assert.ok(hp.front<=limit(.291)&&hp.rear<=limit(.307)&&hp.gap<=limit(.472),`${k} heat pump ${JSON.stringify(hp)}`);
  assert.ok(fu.front<=limit(.344)&&fu.rear<=limit(.326)&&fu.gap<=limit(.362),`${k} furnace ${JSON.stringify(fu)}`);
 }
});

test('restricted and greater sets bracket the working estimate on reconstructed heating nights',()=>{
 // Synthetic steady nights (labeled): two occupants, 68F start 9:50 PM CDT, nominal body, airflow fields only.
 const a=app();
 const offset=(temp,setup,k)=>{a.run(`forecast.timeZone='America/Chicago';state.temp=58;state.rh=25;state.wind=2;state.cloud=1;
   r={start:new Date('2026-10-24T02:50Z'),reading:new Date('2026-10-24T02:50Z'),initial:{temperature:[68,68],rh:[30,30]},occupancy:'staying',remote:false};
   e=makeEnvelope(r.start,planBounds(r.start).end,'Reconstructed steady night',300000);e.points.forEach(p=>p.tOut=${temp});
   sim=simulatePlan([{time:+r.start,setup:${setup}}],e,r,{...AIR_SCENARIOS[0],...${JSON.stringify(AIRFLOW[k])}},null,null,false,true);
   tr=sim.trace.filter(x=>+x.time>=+r.start+3600000);`);
  return a.run('(()=>{const m=v=>v.reduce((x,y)=>x+y)/v.length;return m(tr.map(x=>x.bedroom))-m(tr.map(x=>x.midCoach));})()');};
 for(const [temp,setup] of [[30,"withSetting(planSetup('furnace',true),63)"],[45,"withSetting(planSetup('auto',true),{heat:67,cool:71})"]]){
  const w=offset(temp,setup,'working'),r=offset(temp,setup,'restricted'),g=offset(temp,setup,'greater');
  assert.ok(r>w+.5&&g<w-.5,`${temp}F offsets ${g.toFixed(2)} < ${w.toFixed(2)} < ${r.toFixed(2)}`);
 }
});
