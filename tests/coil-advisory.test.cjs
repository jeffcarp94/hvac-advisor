// WP7 (decision D1): experimental physics coil-icing comparison with a non-blocking advisory.
// Synthetic steady inputs below are labeled reconstructions. The Gulf Shores case uses the owner-
// supplied KJKA ASOS observations (tests/fixtures/kjka-asos-2025-03-03-05.csv) with labeled
// assumptions (09:00–17:00 away, 72°F / 55% RH start, closed coach). Validation, not calibration.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {app}=require('./helpers.cjs');

test('coldest-surface estimate is ADP minus 4°F and flags at 32°F or colder',()=>{
 const a=app();
 assert.equal(a.run('WP7_COIL.coldDeltaF'),4);assert.equal(a.run('WP7_COIL.flagAtF'),32);
 for(const [ret,dp,out,fan] of [[72,60,73,'Low'],[75,55,95,'High'],[78,63,73,'Medium'],[70,40,60,'High']]){
  const c=a.run(`wp7CoilState(${ret},humidityRatio(${dp},100),${out},SEA_LEVEL_PA,'${fan}')`);
  assert.ok(Math.abs(c.coldestF-(c.adpF-4))<1e-12);assert.equal(c.flag,c.coldestF<=32);
  assert.ok(c.adpF<=c.leavingSaturationF+1e-9,'ADP is at or below the leaving-air saturation temperature');
 }
});

test('coil-grid unit checks: slower fan, milder outdoor air and cooler return all give a colder coil',()=>{
 const a=app(),adp=(ret,dp,out,fan)=>a.run(`wp7CoilState(${ret},humidityRatio(${dp},100),${out},SEA_LEVEL_PA,'${fan}').adpF`);
 for(const [ret,dp,out] of [[72,55,73],[75,60,90]]){
  assert.ok(adp(ret,dp,out,'Low')<adp(ret,dp,out,'Medium')&&adp(ret,dp,out,'Medium')<adp(ret,dp,out,'High'),'fan ordering');
  assert.ok(adp(ret,dp,out-10,'High')<adp(ret,dp,out,'High'),'milder condenser air raises capacity and chills the coil');
  assert.ok(adp(ret-4,dp-4,out,'High')<adp(ret,dp,out,'High'),'cooler, drier return air');
 }
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
 // Cool synthetic period with COOL 80 well above the indoor temperature: no cooling call.
 steadyCooling(a,{tOut:50,initial:66,fan:'Low',cool:80});
 a.run(`p=simulatePlan([{time:+r.start,setup:s}],{...e,coilAdvisory:true},r,AIR_SCENARIOS[0],null,null,false,true);`);
 assert.equal(a.run('p.coil.coolingMinutes'),0);assert.equal(a.run('p.coil.flagMinutes'),0);assert.equal(a.run('p.coil.first'),null);
 // A heating-only plan has no coil check at all.
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

test('false-flag control: High fan on a hot synthetic afternoon is not flagged; Low is (reported, not tuned)',()=>{
 const a=app();
 steadyCooling(a,{tOut:95,rh:40,fan:'High',hours:4});a.run('high=wp7CoilCheck({phases:[{time:+r.start,setup:s}]},e,r)');
 steadyCooling(a,{tOut:95,rh:40,fan:'Low',hours:4});a.run('low=wp7CoilCheck({phases:[{time:+r.start,setup:s}]},e,r)');
 assert.equal(a.run('high.flagged'),0);assert.ok(a.run('high.minColdestF')>32);
 assert.equal(a.run('low.flagged'),a.run('low.cases'));
});

test('Gulf Shores (KJKA, March 4, 2025, away, COOL 72): current check permits Auto and Low; physics model flags them',()=>{
 const csv=fs.readFileSync(path.join(__dirname,'fixtures/kjka-asos-2025-03-03-05.csv'),'utf8').trim().split('\n');
 const head=csv[0].split(','),i=k=>head.indexOf(k),cover={CLR:0,FEW:19,SCT:44,BKN:75,OVC:100};
 const start=Date.parse('2025-03-04T09:00:00-06:00'),ret=Date.parse('2025-03-04T17:00:00-06:00');
 const points=csv.slice(1).map(l=>l.split(',')).filter(f=>f[i('tmpf')]!=='M'&&+f[i('valid')].slice(14,16)>=50)
  .map(f=>({utc:Date.parse(f[i('valid')].replace(' ','T')+':00-06:00'),tOut:+f[i('tmpf')],rh:+f[i('relh')],wind:+f[i('sknt')]*1.150779,
   sky:Math.max(0,...['skyc1','skyc2','skyc3'].map(k=>cover[f[i(k)]]??0))}))
  .filter(o=>o.utc>=start-7200000&&o.utc<=ret+3600000)
  .map(o=>({time:new Date(Math.round(o.utc/3600000)*3600000),tOut:o.tOut,rh:o.rh,wind:o.wind,cloud:1-o.sky/100,precip:'none'}));
 for(const fan of ['Auto','Low']){
  const a=app();a.ctx.pts=points;
  a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;pts=pts.map(p=>({...p,time:new Date(p.time)}));
   e={windowStart:new Date(${start}),windowEnd:new Date(${ret+3600000}),timeZone:'America/Chicago',lat:30.2905,lon:-87.6718,elevationM:5,singlePoint:false,points:pts,cloud:pts[0].cloud,wind:pts[0].wind,precip:'none'};
   r={start:new Date(${start}),reading:new Date(${start}),initial:{temperature:[72,72],rh:[55,55]},remote:false,occupancy:'leaving',departure:new Date(${start}),returnTime:new Date(${ret})};
   rows=planRows(e,r,.5,[${ret}]).filter(x=>x.to<=${ret});
   tr=AIR_SCENARIOS.map(sc=>simulatePlan([{time:${start},setup:withSetting(planSetup('ac',false,null,'${fan}'),72)}],{...e,coilAdvisory:true},r,sc,rows,null,false,true));`);
  assert.equal(a.run('tr.every(t=>!t.unsafe.length)'),true,fan+': the current cooling check permits it');
  assert.equal(a.run('tr.every(t=>t.coil.flagMinutes>0)'),true,fan+': the physics model flags it in every case');
 }
});

test('advisory wording: non-blocking, no damage wording, WP9 gap and icing response stated',()=>{
 const a=app();
 const base=`{flagged:true,alternativesChecked:2,alternative:null,check:{cases:9,cooling:9,flagged:9,stagedFlagged:7,autoAssumed:true,flagMinutes:40,minColdestF:20.1,clamped:false,
   first:{time:Date.parse('2026-07-18T20:00Z'),fan:'Auto',assessedFan:'Low',coldestF:23.1,returnF:74,outdoorF:73,indoorDewPointF:54}}}`;
 const html=a.run(`wp7CoilAdvisoryHTML(${base},{})`);
 assert.match(html,/The experimental coil model flags possible icing at this fan setting\. The current cooling check permits this setup\./);
 assert.doesNotMatch(html,/unsafe|danger|damage/i);
 assert.match(html,/Not yet modeled: moisture returning from a wet coil while the fan keeps running \(WP9\)/);
 assert.match(html,/stop cooling, check the filter and vents, run FAN ONLY until the ice clears, then resume at a warmer setting/);
 assert.match(html,/No evaluated alternative passes both checks \(checked 2\)/);
 assert.match(html,/flags in 7 of 9/);
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
  wp7CoilCheck=p=>p.mock?{cases:9,cooling:9,stagedFlagged:0,autoAssumed:false,minColdestF:30,first:null,...p.mock}:null;
  r={start:new Date('2026-07-18T19:00Z')};
  adv=wp7CoilAdvisory({winner,plans:[winner,rejected,stillFlagged,clear],bounds:{end:new Date('2026-07-18T23:00Z')}},{},r);`);
 assert.equal(a.run('adv.flagged'),true);assert.equal(a.run('adv.alternativesChecked'),2);
 assert.equal(a.run('adv.alternative.check.flagged'),0);
 assert.match(a.run('wp7CoilAdvisoryHTML(adv,r)'),/Evaluated alternative that passes both checks/);
 // A displayed plan that is not the complete winner gets no alternative.
 a.run(`adv2=wp7CoilAdvisory({winner:{...winner,suitable:false},current:{...winner},plans:[winner,clear]},{},r);`);
 assert.equal(a.run('adv2.flagged'),true);assert.equal(a.run('adv2.alternative'),null);
});

test('plan log records the comparison for the D1 review trigger',()=>{
 const a=app();
 a.run(`ev={};recordRunLog=recordRunLog;enqueueLogEvent=x=>{queued=x;};
  res={winner:{suitable:true,ready:true,phases:[],trials:[{trace:[]}]},request:{start:new Date('2026-07-18T19:00Z')},
   coilAdvisory:{flagged:true,alternative:null,check:{flagged:9,cases:9,stagedFlagged:7,autoAssumed:true,minColdestF:20.14,first:{time:Date.parse('2026-07-18T20:00Z'),fan:'Auto'}}}};
  recordRunLog(ev,res,null);`);
 const logged=JSON.parse(a.run('queued.coil_advisory'));
 assert.deepEqual({...logged},{flagged:9,cases:9,staged_flagged:7,auto_assumed:true,min_coldest_f:20.1,first_utc:'2026-07-18T20:00:00.000Z',first_fan:'Auto',alternative:false});
 a.run(`res.coilAdvisory=null;recordRunLog(ev2={},res,null);`);assert.equal(a.run('queued.coil_advisory'),'no cooling');
});
