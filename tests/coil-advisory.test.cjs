// WP7 (decision D1) coil-icing advisory on the WP14 refrigeration-cycle model (v6.6.28). Non-blocking.
// Synthetic steady inputs are labeled reconstructions. The Gulf Shores cases use the owner-supplied KJKA ASOS
// observations (tests/fixtures/kjka-asos-2025-03-03-05.csv). The icing case is a historical validation of a
// condition that no longer exists: the pre-EasyTouch Dometic CCC2, mounted over an uninsulated cabinet void,
// read the coach warm and never reached COOL 72, so the compressor ran continuously while the coach sat at
// about 66–68°F (owner account, November 20, 2026). The live model senses front air exactly.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {app}=require('./helpers.cjs');

const coil=(a,ret,dp,cond,fan,airflow=1)=>a.run(`wp7CoilState(${ret},humidityRatio(${dp},100),${cond},SEA_LEVEL_PA,'${fan}',${airflow})`);

test('cycle-model coil state: rating point, coldest region at or below the mean-profile minimum',()=>{
 const a=app();
 const rated=a.run(`(()=>{const K=cycleCalibration(),s=cycleSolve(wp6Fahrenheit(27),K.w,95,SEA_LEVEL_PA,'High');return{total:s.total,teF:s.teF};})()`);
 assert.ok(Math.abs(rated.total-15000)<75,'rated 15,000 BTU/h at ISO T1');assert.ok(Math.abs(rated.teF-42)<.5,'rated evaporating 42°F');
 for(const [ret,dp,cond,fan] of [[72,55,73,'Low'],[75,55,97,'High'],[72,48,72,'Medium']]){
  const c=coil(a,ret,dp,cond,fan);
  assert.ok(c.coldSurfaceF<=c.meanMinSurfaceF+1e-6,'low-velocity region is the coldest');
  assert.ok(c.coldSurfaceF>=c.teF-1e-6,'no surface below the evaporating temperature');
  assert.equal(c.minSurfaceF,c.coldSurfaceF);
 }
});

test('coil physics: slower fan, milder condenser air and cooler, drier return air give a colder coil',()=>{
 const a=app(),cs=(...x)=>coil(a,...x).coldSurfaceF;
 for(const [ret,dp,out] of [[72,55,73],[75,60,90]]){
  assert.ok(cs(ret,dp,out,'Low')<cs(ret,dp,out,'Medium')&&cs(ret,dp,out,'Medium')<cs(ret,dp,out,'High'),'fan ordering');
  assert.ok(cs(ret,dp,out-10,'High')<cs(ret,dp,out,'High'),'milder condenser air chills the coil');
  assert.ok(cs(ret-4,dp-4,out,'High')<cs(ret,dp,out,'High'),'cooler, drier return air');
 }
 // A humid coach on a 95°F afternoon keeps every fan speed above freezing.
 for(const fan of ['Low','Medium','High'])assert.ok(cs(74,55,97,fan)>32,fan+' above freezing on a humid 95°F afternoon');
});

test('ice step: grows only below 32°F, retained water freezes at start, melts faster with a running fan',()=>{
 const a=app();
 a.run(`cold=wp7CoilState(66,humidityRatio(50,100),72,SEA_LEVEL_PA,'Low');warm=wp7CoilState(78,humidityRatio(60,100),97,SEA_LEVEL_PA,'High');`);
 assert.ok(a.run('cold.coldSurfaceF')<32&&a.run('warm.coldSurfaceF')>32);
 assert.equal(a.run(`cycleFrostStep(null,warm,30,78,true,'High').mm`),0,'no ice above freezing');
 const dry=a.run(`cycleFrostStep(null,cold,1,66,true,'Low',0).kgM2`),wet=a.run(`cycleFrostStep(null,cold,1,66,true,'Low',1).kgM2`);
 assert.ok(wet-dry>0.04,'one pound of retained coil water freezes on the cold region at compressor start');
 a.run(`s0=cycleFrostStep(null,cold,20,66,true,'Low',0);k0=s0.kgM2;
  fan=cycleFrostStep({...s0},null,5,72,true,"Low");still=cycleFrostStep({...s0},null,5,72,false,"Low");`);
 assert.ok(a.run('fan.kgM2')<a.run('still.kgM2')&&a.run('still.kgM2')<a.run('k0'),'a running fan melts ice faster than still air');
});

function steadyCooling(a,{tOut=85,rh=55,initial=76,fan='Low',hours=3,cool=72,setup=null}={}){
 a.run(`forecast.timeZone='America/Chicago';state.temp=${tOut};state.rh=${rh};state.wind=4;state.cloud=1;state.dehumidifierEnabled=true;
  r={start:new Date('2026-07-18T19:00Z'),reading:new Date('2026-07-18T19:00Z'),initial:{temperature:[${initial},${initial}],rh:[50,50]},occupancy:'staying',remote:false};
  e=makeEnvelope(r.start,new Date(+r.start+${hours}*3600000),'Synthetic steady',300000);
  s=${setup||`withSetting(planSetup('ac',false,null,'${fan}'),${cool})`};`);
}
test('advisory evaluation never changes the simulated trajectory, checks or reasons',()=>{
 const a=app();steadyCooling(a,{fan:'Low'});
 a.run(`off=simulatePlan([{time:+r.start,setup:s}],e,r,AIR_SCENARIOS[0],null,null,false,true);
  on=simulatePlan([{time:+r.start,setup:s}],{...e,coilAdvisory:true},r,AIR_SCENARIOS[0],null,null,false,true);`);
 assert.equal(a.run('off.coil'),null);assert.ok(a.run('on.coil.coolingMinutes')>0);
 for(const k of ['trace','segments','unsafe','suitable','ready','comfortReason','moistureReason','score','coolMinutes'])
  assert.equal(a.run(`JSON.stringify(on.${k})`),a.run(`JSON.stringify(off.${k})`),k);
});

test('flags are counted only while the compressor runs',()=>{
 const a=app();
 steadyCooling(a,{tOut:50,initial:66,fan:'Low',cool:80});
 a.run(`p=simulatePlan([{time:+r.start,setup:s}],{...e,coilAdvisory:true},r,AIR_SCENARIOS[0],null,null,false,true);`);
 assert.equal(a.run('p.coil.coolingMinutes'),0);assert.equal(a.run('p.coil.flagMinutes'),0);assert.equal(a.run('p.coil.first'),null);
 steadyCooling(a,{tOut:40,initial:66,setup:"withSetting(planSetup('hp',false),70)"});
 assert.equal(a.run(`wp7CoilCheck({phases:[{time:+r.start,setup:s}]},e,r)`),null);
});

test('AUTO is assessed at Low while the compressor runs; the CCC2 staging is reported alongside',()=>{
 const a=app();steadyCooling(a,{tOut:85,initial:80,fan:'Auto'});
 a.run(`c=wp7CoilCheck({phases:[{time:+r.start,setup:s}]},e,r);
  low=wp7CoilCheck({phases:[{time:+r.start,setup:withSetting(planSetup('ac',false,null,'Low'),72)}]},e,r);`);
 assert.equal(a.run('c.autoAssumed'),true);assert.equal(a.run('low.autoAssumed'),false);
 assert.ok(a.run('c.stagedFlagged<=c.flagged'),'staging can only warm the assessed coil');
 assert.equal(a.run('WP7_COIL.autoAssumedFan'),'Low');
});

test('false-flag control: no fan speed is flagged on a 95°F synthetic afternoon',()=>{
 const a=app();
 for(const fan of ['High','Low','Auto']){
  steadyCooling(a,{tOut:95,rh:40,fan,hours:4});a.run('c=wp7CoilCheck({phases:[{time:+r.start,setup:s}]},e,r)');
  assert.equal(a.run('c.flagged'),0,fan);assert.ok(a.run('c.peakFrostMm')<a.run('CYCLE.frost.flagMm'),fan);
 }
});

const KJKA=(()=>{const csv=fs.readFileSync(path.join(__dirname,'fixtures/kjka-asos-2025-03-03-05.csv'),'utf8').trim().split('\n'),h=csv[0].split(','),i=k=>h.indexOf(k);
 return csv.slice(1).map(l=>l.split(',')).filter(f=>f[i('tmpf')]!=='M'&&+f[i('valid')].slice(14,16)>=50)
  .map(f=>({utc:Date.parse(f[i('valid')].replace(' ','T')+':00-06:00'),tOut:+f[i('tmpf')],rh:+f[i('relh')],wind:+f[i('sknt')]*1.150779,
   sky:Math.max(0,...['skyc1','skyc2','skyc3'].map(k=>({CLR:0,FEW:19,SCT:44,BKN:75,OVC:100})[f[i(k)]]??0))}));})();

test('Gulf Shores historical validation: continuous CCC2 call with the coach at 66–68°F ices within two hours',()=>{
 // Owner account: COOL 72 on the CCC2, which read warm and never satisfied; real coach 66–68°F. Indoor dew point
 // 50°F (assumed; 45–55°F reported in the v6.6.28 notes). Condenser inlet = KJKA air + 1°F. Every day and fan speed.
 const a=app();
 for(const day of ['2025-03-03','2025-03-04','2025-03-05']){
  const hourly=[...Array(8)].map((_,k)=>{const t=Date.parse(`${day}T${String(9+k).padStart(2,'0')}:00:00-06:00`);
   return KJKA.reduce((b,o)=>Math.abs(o.utc-t)<Math.abs(b.utc-t)?o:b).tOut;});
  for(const fan of ['Low','Medium','High'])for(const ret of [66,68]){
   const minutes=a.run(`(()=>{let s=null;const w=humidityRatio(50,100,101300);
    for(let m=0;m<480;m++){const c=wp7CoilState(${ret},w,${JSON.stringify(hourly)}[Math.floor(m/60)]+1,101300,'${fan}',s?.airflow??1);
     s=cycleFrostStep(s,c,1,${ret},true,'${fan}',0);if(s.mm>=CYCLE.frost.flagMm)return m+1;}return null;})()`);
   assert.ok(minutes!=null&&minutes<=120,`${day} ${fan} return ${ret}°F: flag within 2 h (got ${minutes})`);
  }
 }
});

test('Gulf Shores sensitivity: with an accurate thermostat at COOL 72 the same day cycles and the ice melts between runs',()=>{
 // Characterizes why the original reconstruction did not flag: about 8-minute runs with 40–140 minutes off.
 const start=Date.parse('2025-03-04T09:00:00-06:00'),ret=Date.parse('2025-03-04T17:00:00-06:00');
 const points=KJKA.filter(o=>o.utc>=start-7200000&&o.utc<=ret+3600000)
  .map(o=>({time:new Date(Math.round(o.utc/3600000)*3600000),tOut:o.tOut,rh:o.rh,wind:o.wind,cloud:1-o.sky/100,precip:'none'}));
 const a=app();a.ctx.pts=points;
 a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;pts=pts.map(p=>({...p,time:new Date(p.time)}));
  e={windowStart:new Date(${start}),windowEnd:new Date(${ret+3600000}),timeZone:'America/Chicago',lat:30.2905,lon:-87.6718,elevationM:5,singlePoint:false,points:pts,cloud:pts[0].cloud,wind:pts[0].wind,precip:'none',
   site:{heading:'N',confirmed:true,cover:{tree_driver:'Full',tree_rear:'Full'}}};
  r={start:new Date(${start}),reading:new Date(${start}),initial:{temperature:[72,72],rh:[55,55]},remote:false,occupancy:'leaving',departure:new Date(${start}),returnTime:new Date(${ret})};
  rows=planRows(e,r,.5,[${ret}]).filter(x=>x.to<=${ret});
  t=simulatePlan([{time:${start},setup:withSetting(planSetup('ac',false,null,'Auto'),72)}],{...e,coilAdvisory:true},r,AIR_SCENARIOS[0],rows,null,false,true);`);
 assert.ok(a.run('t.coil.minSurfaceF')<32,'the coldest region does go below freezing');
 assert.equal(a.run('t.coil.flagMinutes'),0);assert.ok(a.run('t.coil.peakFrostMm')<.2);
});

test('advisory wording: non-blocking, no damage wording, no WP9 gap statement, icing response stated',()=>{
 const a=app();
 const base=`{flagged:true,alternativesChecked:2,alternative:null,check:{cases:9,cooling:9,flagged:9,stagedFlagged:7,autoAssumed:true,flagMinutes:40,minSurfaceF:20.1,peakFrostMm:.6,clamped:false,
   first:{time:Date.parse('2026-07-18T20:00Z'),fan:'Auto',assessedFan:'Low',minSurfaceF:23.1,returnF:74,outdoorF:73,indoorDewPointF:54}}}`;
 const html=a.run(`wp7CoilAdvisoryHTML(${base},{})`);
 // v6.7.0 (approved item 6): one line, only when flagged, with the icing response.
 assert.match(html,/AC coil may ice up<\/b>Flagged in 9 of 9 tested conditions from \d+:\d\d [AP]M\./);
 assert.doesNotMatch(html,/unsafe|danger|damage/i);
 assert.doesNotMatch(html,/Not yet modeled|re-evaporation penalty|\(WP9\)/);
 assert.match(html,/If you see ice, run FAN ONLY until it clears, then cool at a warmer setting\./);
 assert.doesNotMatch(html,/avoids it/);
 assert.equal(a.run('wp7CoilAdvisoryHTML(null,{})'),'');assert.equal(a.run('wp7CoilAdvisoryHTML({flagged:false},{})'),'');
});

test('an alternative is offered only if evaluated, executable (suitable and ready) and clear in every case',()=>{
 const a=app();
 a.run(`const trace=[{time:new Date('2026-07-18T19:00Z'),bedroom:70,midCoach:71},{time:new Date('2026-07-18T23:00Z'),bedroom:68,midCoach:69}];
  const plan=(type,extra)=>({phases:[{time:Date.parse('2026-07-18T19:00Z'),setup:withSetting(planSetup(type,false,null,type==='ac'?'Low':null),type==='ac'?72:70)}],trials:[{trace}],suitable:true,ready:true,...extra});
  winner=plan('ac',{mock:{flagged:9}});
  rejected=plan('ac',{suitable:false,mock:{flagged:0}});
  stillFlagged=plan('ac',{mock:{flagged:3}});
  clear=plan('ac',{mock:{flagged:0,cases:9}});
  wp7CoilCheck=p=>p.mock?{cases:9,cooling:9,stagedFlagged:0,autoAssumed:false,minSurfaceF:30,peakFrostMm:0,first:null,...p.mock}:null;
  r={start:new Date('2026-07-18T19:00Z')};
  adv=wp7CoilAdvisory({winner,plans:[winner,rejected,stillFlagged,clear],bounds:{end:new Date('2026-07-18T23:00Z')}},{},r);`);
 assert.equal(a.run('adv.flagged'),true);assert.equal(a.run('adv.alternativesChecked'),2);
 assert.equal(a.run('adv.alternative.check.flagged'),0);
 assert.match(a.run('wp7CoilAdvisoryHTML(adv,r)'),/COOL at 72°F from \d+:\d\d [AP]M avoids it\./);
 a.run(`adv2=wp7CoilAdvisory({winner:{...winner,suitable:false},current:{...winner},plans:[winner,clear]},{},r);`);
 assert.equal(a.run('adv2.flagged'),true);assert.equal(a.run('adv2.alternative'),null);
});

test('plan log records the comparison for the D1 review trigger',()=>{
 const a=app();
 a.run(`ev={};recordRunLog=recordRunLog;enqueueLogEvent=x=>{queued=x;};
  res={winner:{suitable:true,ready:true,phases:[],trials:[{trace:[]}]},request:{start:new Date('2026-07-18T19:00Z')},
   coilAdvisory:{flagged:true,alternative:null,check:{flagged:9,cases:9,stagedFlagged:7,autoAssumed:true,minSurfaceF:20.14,peakFrostMm:.617,first:{time:Date.parse('2026-07-18T20:00Z'),fan:'Auto'}}}};
  recordRunLog(ev,res,null);`);
 const logged=JSON.parse(a.run('queued.coil_advisory'));
 assert.deepEqual({...logged},{flagged:9,cases:9,staged_flagged:7,auto_assumed:true,min_surface_f:20.1,peak_frost_mm:.62,first_utc:'2026-07-18T20:00:00.000Z',first_fan:'Auto',alternative:false});
 a.run(`res.coilAdvisory=null;recordRunLog(ev2={},res,null);`);assert.equal(a.run('queued.coil_advisory'),'no cooling');
});
