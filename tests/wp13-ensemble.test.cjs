// WP13 (v6.6.21; scope v3 WP13, owner decision D3): sampled ensemble and severity ranking, built behind
// ENSEMBLE.enabled (default off). Weather and plan objects below are synthetic (labeled) unless noted.
const test=require('node:test'),assert=require('node:assert/strict'),{app}=require('./helpers.cjs');
const H=3600000,start=Date.parse('2026-11-12T04:00:00Z');
function scene(a,temps=[49,46,44,42,40,38,36,35,34],initial='[67,66]'){
 a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;
  r={occupancy:'staying',start:new Date(${start}),reading:new Date(${start}),initial:{temperature:${initial},rh:[45,45]}};
  points=${JSON.stringify(temps)}.map((tOut,i)=>({time:new Date(${start}+i*${H}),tOut,rh:45,cloud:1,wind:4,precip:'none'}));
  e={windowStart:r.start,windowEnd:new Date(${start}+${temps.length}*${H}),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,points,cloud:1,wind:4,precip:'none'};`);
}
function members(a){a.run(`members=buildEnsembleMembers(ensembleSeed(e,r),+r.start,9);`);}

test('the policy is off by default and the nine v6.6.16 cases are unchanged',()=>{
 const a=app();scene(a);
 assert.equal(a.run('ENSEMBLE.enabled'),false);
 assert.equal(a.run('configureEnsemble(e,r)'),9);
 assert.equal(a.run('AIR_SCENARIOS.some(s=>s.ensemble)'),false);
 // Enabling then disabling restores the nine cases.
 a.run('ENSEMBLE.enabled=true;configureEnsemble(e,r)');assert.equal(a.run('AIR_SCENARIOS.length'),32);
 a.run('ENSEMBLE.enabled=false;configureEnsemble(e,r)');assert.equal(a.run('AIR_SCENARIOS.length'),9);
 assert.equal(a.run('AIR_SCENARIOS.every((s,i)=>s.name===BASE_AIR_SCENARIOS[i].name)'),true);
});

test('32 members, member 0 is the nominal working case, and the draws are deterministic',()=>{
 const a=app();scene(a);members(a);
 assert.equal(a.run('members.length'),32);
 assert.equal(a.run('members.every((m,i)=>m.ensemble.index===i)'),true);
 assert.equal(a.run('members[0].ensemble.params'),null);
 for(const k of ['flow','windSign','mix','ductRear','furnaceRear','widthFt','rhOffset','tempOffset','surfaceFactor','cabFactor'])
  assert.equal(a.run(`members[0].${k}===BASE_AIR_SCENARIOS[0].${k}`),true,k);
 assert.equal(a.run('members[0].bodyCase===BODY_CASES[0]'),true);
 const once=a.run('JSON.stringify(members)');members(a);assert.equal(a.run('JSON.stringify(members)'),once,'same inputs, same members');
 const seed=a.run('ensembleSeed(e,r)');a.run('r.initial.temperature=[67.5,66]');
 assert.notEqual(a.run('ensembleSeed(e,r)'),seed,'a decision-relevant input changes the seed');
});

test('Latin hypercube: each dimension puts one member in each of 31 strata; draws stay within bounds',()=>{
 const a=app();scene(a);members(a);
 const strata=JSON.parse(a.run(`JSON.stringify(ENSEMBLE_DIMENSIONS.map(k=>members.slice(1).map(m=>Math.floor(m.ensemble.draws.u[k]*31))))`));
 for(const v of strata)assert.deepEqual(v.slice().sort((x,y)=>x-y),Array.from({length:31},(_,i)=>i));
 const P=JSON.parse(a.run('JSON.stringify(ENSEMBLE_PRIORS)')),d=JSON.parse(a.run('JSON.stringify(members.slice(1).map(m=>m.ensemble.draws))'));
 const within=(v,r)=>v>=r[0]-1e-12&&v<=r[1]+1e-12;
 for(const x of d){
  assert.ok(within(x.infiltrationACH,P.infiltrationACH)&&within(x.dehumReturn,P.dehumReturn)&&within(x.cabFactor,P.cabFactor)&&within(x.coilColdDeltaF,P.coilColdDeltaF));
  assert.ok(within(x.gains.multiPlusStandby,P.gains.multiPlusStandby)&&within(x.gains.cerboAndDisplay,P.gains.cerboAndDisplay)&&within(x.gains.sleepPhoneCharging,P.gains.sleepPhoneCharging));
  assert.ok(Math.hypot(x.airflow,x.storagePosition)<=1+1e-12,'airflow and storage drawn on the unit disk');
  for(const k of ['airTotal','massTotal','massTauHours'])assert.ok(within(x.storage[k],[P.storage.low[k],P.storage.high[k]]),k);
 }
 const bodies=JSON.parse(a.run('JSON.stringify(["nominal","reduced","stronger"].map(id=>members.slice(1).filter(m=>m.bodyCase.id===id).length))'));
 assert.deepEqual(bodies,[11,10,10],'body cases take whole strata');
 // The concentric map is area-preserving: equal-area halves of the disk get about half the points (many seeds).
 const half=+a.run('(()=>{let n=0,t=0;for(let k=0;k<30;k++)for(const m of buildEnsembleMembers(500+k,0,9).slice(1)){t++;if(Math.hypot(m.ensemble.draws.airflow,m.ensemble.draws.storagePosition)<Math.SQRT1_2)n++;}return n/t;})()');
 assert.ok(Math.abs(half-.5)<.05,'inner half-area disk share '+half);
 // Airflow family endpoints are the v6.6.16 data-supported sets; the middle is the calibrated working case.
 assert.deepEqual(JSON.parse(a.run('JSON.stringify(interpolateAirflow(0))')),JSON.parse(a.run('JSON.stringify({mix:1,ductRear:DUCT.rearFraction,furnaceRear:FURNACE.rearFraction,widthFt:INTERZONE.widthFt})')));
 for(const [s,i] of [[-1,1],[1,2]]){const f=JSON.parse(a.run(`JSON.stringify(interpolateAirflow(${s}))`)),c=JSON.parse(a.run(`JSON.stringify(AIR_WEATHER_CASES[${i}])`));
  for(const k of ['mix','ductRear','furnaceRear','widthFt'])assert.ok(Math.abs(f[k]-c[k])<1e-12,k);}
 assert.deepEqual(JSON.parse(a.run('JSON.stringify(interpolateStorage(0))')),JSON.parse(a.run('JSON.stringify({solarToMass:STORAGE.solarToMass,airTotal:STORAGE.airTotal,massTotal:STORAGE.massTotal,massTauHours:STORAGE.massTauHours})')));
 // Furnace rear share stays within the owner-decided 0.52–0.65.
 assert.equal(a.run('members.every(m=>(m.furnaceRear??FURNACE.rearFraction)>=.52-1e-12&&(m.furnaceRear??FURNACE.rearFraction)<=.65+1e-12)'),true);
 // D2-gated items are not sampled: capacities, WP6 airflow and changeover stay at their live values.
 assert.equal(a.run('members.every(m=>!m.ensemble.params||["capacity","changeover","furnaceOutput"].every(k=>!(k in m.ensemble.params)))'),true);
});

test('forecast error: σ schedule by lead time and AR(1) correlation over about 6 hours',()=>{
 const a=app();
 assert.deepEqual([0,12,24,36,48].map(h=>a.run(`forecastSigmaF(${h})`)),[2,2,2.5,3,3.5]);
 // Across 20 seeds × 31 members: lag-6 h correlation ≈ e^(−1) and the 0 h spread ≈ 2°F (sampling tolerance).
 const st=JSON.parse(a.run(`const z0=[],z6=[];for(let k=0;k<20;k++){const m=buildEnsembleMembers(1000+k,0,12);
   for(const x of m.slice(1)){z0.push(x.ensemble.weather.temp[0]/2);z6.push(x.ensemble.weather.temp[6]/2);}}
  const mean=v=>v.reduce((s,x)=>s+x,0)/v.length,m0=mean(z0),m6=mean(z6),sd=v=>{const m=mean(v);return Math.sqrt(mean(v.map(x=>(x-m)**2)));};
  const c=mean(z0.map((x,i)=>(x-m0)*(z6[i]-m6)))/(sd(z0)*sd(z6));JSON.stringify({c,sd0:sd(z0)*2,m0:m0*2})`));
 assert.ok(Math.abs(st.c-Math.exp(-1))<.1,'lag-6 h correlation '+st.c);
 assert.ok(Math.abs(st.sd0-2)<.15,'0 h σ '+st.sd0);assert.ok(Math.abs(st.m0)<.1,'0 h mean '+st.m0);
});

test('member weather keeps RH consistent with the perturbed dew point',()=>{
 const a=app();scene(a);members(a);
 const out=JSON.parse(a.run(`rows=scheduleWeather(e,r.start,new Date(+r.start+2*${H}),30);m=members[5];
  pert=memberRows(rows,m.ensemble,e);JSON.stringify(pert.map((p,i)=>({dt:p.tOut-rows[i].tOut,dd:dewPt(p.tOut,p.rh)-dewPt(rows[i].tOut,rows[i].rh),
   eT:knotValue(m.ensemble.weather.temp,(rows[i].from-+r.start)/${H}),eD:knotValue(m.ensemble.weather.dew,(rows[i].from-+r.start)/${H}),rh:p.rh,
   capped:dewPt(rows[i].tOut,rows[i].rh)+knotValue(m.ensemble.weather.dew,(rows[i].from-+r.start)/${H})>p.tOut,w:p.wind/rows[i].wind,ws:m.ensemble.weather.windScale})))`));
 for(const p of out){
  assert.ok(Math.abs(p.dt-p.eT)<1e-9);assert.ok(p.rh>0&&p.rh<=100);assert.ok(Math.abs(p.w-p.ws)<1e-12);
  if(!p.capped)assert.ok(Math.abs(p.dd-p.eD)<1e-6,'dew point shifts by its own error');
 }
 assert.equal(a.run('memberRows(rows,members[0].ensemble,e)===rows'),true,'nominal rows unchanged');
});

test('the nominal member reproduces the working-case trial exactly; member context is restored',()=>{
 const a=app();scene(a);members(a);
 a.run(`ph=[{time:+r.start,setup:withSetting(planSetup('furnace',true),66)}];rows=planRows(e,r);
  legacy=simulatePlan(ph,e,r,BASE_AIR_SCENARIOS[0],rows,null,false,true);nominal=simulatePlan(ph,e,r,members[0],rows,null,false,true);
  strip=t=>JSON.stringify({...t,member:undefined});`);
 assert.equal(a.run('strip(legacy)===strip(nominal)'),true);
 assert.equal(a.run('nominal.member'),0);
 a.run('other=simulatePlan(ph,e,r,members[7],rows,null,false,true)');
 assert.equal(a.run('MEMBER_PARAMS'),null);assert.equal(a.run('other.member'),7);
 assert.notEqual(a.run('other.finalIndoor'),a.run('nominal.finalIndoor'),'a member differs from nominal');
 // Restored after an exception inside the simulation as well.
 a.run('saved=solarZoneGains;solarZoneGains=()=>{throw new Error("x")};try{simulatePlan(ph,e,r,members[3],rows,null,false,true)}catch(err){};solarZoneGains=saved;');
 assert.equal(a.run('MEMBER_PARAMS'),null);
 // A member's installation draws reach the helpers it affects.
 a.run('MEMBER_PARAMS=members[4].ensemble.params;st=zoneStorage();g=zoneInternalGains(0,0,true,true);MEMBER_PARAMS=null;st0=zoneStorage();');
 assert.ok(Math.abs(a.run('st.air[0]+st.air[1]')-a.run('members[4].ensemble.draws.storage.airTotal'))<1e-9);
 assert.ok(Math.abs(a.run('st0.air[0]+st0.air[1]')-297)<1e-9);
 assert.ok(Math.abs(a.run('g[0]')-a.run('(members[4].ensemble.draws.gains.multiPlusStandby+members[4].ensemble.draws.gains.sleepPhoneCharging)*WATTS_TO_BTU_H'))<1e-9);
});

// Synthetic member trials (labeled): only the fields the qualification and ranking read.
function trials(a,name,spec){
 a.run(`${name}=Array.from({length:32},(_,i)=>({member:i,suitable:true,ready:true,equipmentEligible:true,floorBreach:false,failureTime:null,firstFailureTime:null,
  unsafe:[],tempMissDegMin:0,rhExceedMin:0,score:0,segments:[],start:new Date(${start}),trace:[{time:new Date(${start}),bedroom:67,midCoach:67},{time:new Date(${start+8*H}),bedroom:67,midCoach:67}],
  comfortReason:'',moistureReason:'',bedtimeReason:'',recoveryInfo:null,recoveryMinutes:0}));(${spec})(${name});`);
}
function planOf(a,name,setup='furnace'){a.run(`${name}P=planFromTrials([{time:${start},setup:withSetting(planSetup('${setup}',true),66)}],${name},e,r);`);}
test('D3 admission boundaries: nominal pass plus at least 29 of the same 32 members',()=>{
 const a=app();scene(a);
 const fail=k=>`t=>{for(let i=1;i<=${k};i++){t[i].suitable=false;t[i].comfortReason='x';}}`;
 for(const [k,ok] of [[2,true],[3,true],[4,false]]){trials(a,'x',fail(k));planOf(a,'x');
  assert.equal(a.run('xP.ensemble.passes'),32-k);assert.equal(a.run('xP.suitable&&xP.ready'),ok,(32-k)+' passes');assert.equal(a.run('xP.ensemble.admitted'),ok);}
 // Nominal failure alone blocks admission even with 31 passing members.
 trials(a,'x',`t=>{t[0].suitable=false;t[0].comfortReason='x';}`);planOf(a,'x');assert.equal(a.run('xP.suitable'),false);
 // A hard-constraint failure in any one member blocks admission (equipment limit; 65°F floor).
 trials(a,'x',`t=>{t[9].equipmentEligible=false;t[9].suitable=false;t[9].unsafe=[{reason:'limit'}];}`);planOf(a,'x');assert.equal(a.run('xP.suitable'),false);
 trials(a,'x',`t=>{t[9].floorBreach=true;t[9].suitable=false;}`);planOf(a,'x');assert.equal(a.run('xP.suitable'),false);
 // Joint pass: comfort in one member and readiness in another are two failures, not one.
 trials(a,'x',`t=>{t[1].suitable=false;t[2].suitable=false;t[3].ready=false;t[4].ready=false;}`);planOf(a,'x');
 assert.equal(a.run('xP.ensemble.passes'),28);assert.equal(a.run('xP.suitable'),true);assert.equal(a.run('xP.ready'),false);
 // Fewer than 32 evaluated members never qualifies; a one-trial screen keeps its own result.
 a.run(`short=planFromTrials([{time:${start},setup:planSetup('furnace',true)}],x.slice(0,9).map(t=>({...t,suitable:true,ready:true})),e,r);`);assert.equal(a.run('short.suitable'),false);
 a.run(`one=planFromTrials([{time:${start},setup:planSetup('furnace',true)}],[{...x[0],member:0}],e,r);`);assert.equal(a.run('one.suitable&&one.ready&&one.ensemble===null'),true);
 // casesPass: hard everywhere, predicate in nominal and ≥ 29.
 trials(a,'y',`t=>{t[5].moistureEligible=false;}`);a.run('y.forEach((t,i)=>{if(i!==5)t.moistureEligible=true;})');
 assert.equal(a.run('casesPass(y,t=>t.moistureEligible)'),true);assert.equal(a.run('casesPass(y.slice(0,9).map((t,i)=>({...t,member:null})),t=>t.moistureEligible)'),false,'nine cases: every case must pass');
 a.run('y[0].moistureEligible=false');assert.equal(a.run('casesPass(y,t=>t.moistureEligible)'),false);
});

test('severity first: one severe hot miss loses to two slight cool misses',()=>{
 const a=app();scene(a);
 // Plan "hot": one member 4°F above the band for 15 min (×2 warm weight = 120 °F·min). It has the better nominal
 // target fit, which the v6.6.16 comparators would prefer. Plan "cool": two members 0.5°F below for 30 min (15 each).
 trials(a,'hot',`t=>{t[6].tempMissDegMin=120;}`);trials(a,'cool',`t=>{t[3].tempMissDegMin=15;t[11].tempMissDegMin=15;}`);
 planOf(a,'hot','hp');planOf(a,'cool','furnace');
 a.run(`hotP.ensemble.nominal.targetRank=0;coolP.ensemble.nominal.targetRank=.5;`);
 assert.equal(a.run('hotP.ensemble.admitted&&coolP.ensemble.admitted'),true);
 assert.ok(a.run('comparePlans(coolP,hotP)')<0);assert.ok(a.run('comparePlans(hotP,coolP)')>0);
 assert.equal(a.run('[hotP,coolP].sort(comparePlans)[0]===coolP'),true);
 // Worst-three severity breaks a mean tie: equal means, lower worst-three wins.
 trials(a,'spread',`t=>{for(let i=1;i<=8;i++)t[i].tempMissDegMin=15;}`);trials(a,'peak',`t=>{t[1].tempMissDegMin=60;t[2].tempMissDegMin=60;}`);
 planOf(a,'spread');planOf(a,'peak');assert.ok(Math.abs(a.run('spreadP.ensemble.severity.mean-peakP.ensemble.severity.mean'))<1e-12);
 assert.ok(a.run('comparePlans(spreadP,peakP)')<0);
});

test('RH exceedance breaks a severity tie before the nominal comparators',()=>{
 const a=app();scene(a);
 trials(a,'dry',`t=>{t[2].rhExceedMin=0;}`);trials(a,'damp',`t=>{t[2].rhExceedMin=45;}`);
 planOf(a,'dry','furnace');planOf(a,'damp','hp');
 // The damp plan is better on every nominal comparator.
 a.run(`dampP.ensemble.nominal.targetRank=0;dryP.ensemble.nominal.targetRank=.9;dampP.ensemble.nominal.score=0;dryP.ensemble.nominal.score=10;`);
 assert.ok(a.run('comparePlans(dryP,dampP)')<0);
 // Equal RH: the nominal comparators decide (target fit), then pass count, then a stable ID.
 trials(a,'damp2',`t=>{t[2].rhExceedMin=0;}`);planOf(a,'damp2','hp');a.run('damp2P.ensemble.nominal.targetRank=0;');
 assert.ok(a.run('comparePlans(damp2P,dryP)')<0);
 a.run('twin=planFromTrials(dryP.phases,dry,e,r);twin.ensemble.nominal=dryP.ensemble.nominal;');assert.equal(a.run('comparePlans(dryP,twin)'),0,'identical plans tie');
});

test('severity is scored over the full horizon: a member that fails early keeps accumulating',()=>{
 const a=app();scene(a,[34,34,34,34,34,34,34,34,34],'[66,66]');
 // OFF on a 34°F night (synthetic): fails within the first hour, keeps missing to the end.
 a.run(`ph=[{time:+r.start,setup:planSetup('passive',true)}];rows=planRows(e,r);
  stopped=simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows);full=simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows,null,false,true);`);
 assert.ok(a.run('stopped.failureTime')<=start+H,'fails at hour 1');
 assert.equal(a.run('+full.trace.at(-1).time'),a.run('+e.windowEnd'));
 assert.ok(a.run('full.tempMissDegMin')>3*a.run('stopped.tempMissDegMin'),'later misses are counted');
 assert.equal(a.run('full.firstFailureTime'),a.run('stopped.failureTime'),'first failure time recorded without stopping');
 // completeEnsembleTrials reruns stopped members only when the plan can still be admitted.
 trials(a,'z',`t=>{t[4].suitable=false;t[4].failureTime=${start+H};t[8].suitable=false;t[8].failureTime=${start+2*H};}`);
 a.run('reran=[];done=completeEnsembleTrials(z,i=>{reran.push(i);return{...z[i],failureTime:null,tempMissDegMin:999};});');
 assert.deepEqual(JSON.parse(a.run('JSON.stringify(reran)')),[4,8]);assert.equal(a.run('done[4].tempMissDegMin'),999);
 trials(a,'z',`t=>{for(let i=1;i<=4;i++){t[i].suitable=false;t[i].failureTime=${start+H};}}`);
 a.run('reran=[];completeEnsembleTrials(z,i=>{reran.push(i);return z[i];});');assert.equal(a.run('reran.length'),0,'not admissible: no rerun');
});

test('non-admitted ensemble plans keep the longest-acceptable ordering, ending at the fourth member failure',()=>{
 const a=app();scene(a);
 trials(a,'p',`t=>{[1,2,3,4,5].forEach((m,k)=>{t[m].suitable=false;t[m].failureTime=${start}+(k+1)*${H};});}`);planOf(a,'p');
 assert.equal(a.run('ensembleUntil(pP)'),start+4*H);
 trials(a,'q',`t=>{[1,2,3,4].forEach((m,k)=>{t[m].suitable=false;t[m].failureTime=${start}+(k+2)*${H};});}`);planOf(a,'q');
 assert.equal(a.run('ensembleUntil(qP)'),start+5*H);
 assert.ok(a.run('comparePlans(qP,pP)')<0,'admissible for longer ranks first');
 // A hard failure ends admissibility at its own time.
 trials(a,'h',`t=>{t[7].equipmentEligible=false;t[7].suitable=false;t[7].failureTime=${start+H/2};t[7].unsafe=[{reason:'limit'}];}`);planOf(a,'h');
 assert.equal(a.run('ensembleUntil(hP)'),start+H/2);
});

test('unknown-heading analysis runs: member 0 is the heading average and the others use one cardinal heading',()=>{
 const a=app();scene(a);
 a.run('hm=buildEnsembleMembers(77,+r.start,9,true);');
 assert.equal(a.run('hm[0].heading'),'avg');
 assert.equal(a.run('hm.slice(1).every(m=>[0,90,180,270].includes(m.heading))'),true);
 a.run('km=buildEnsembleMembers(77,+r.start,9,false);');assert.equal(a.run('km.every(m=>m.heading===undefined)'),true,'confirmed heading: not sampled (decision B)');
});

test('end to end: the enabled policy evaluates 32 members with common draws and is deterministic',()=>{
 const run=()=>{const a=app();scene(a,[47,46,45,45,44]);a.run('ENSEMBLE.enabled=true;res=runUnifiedPlan(r,e);w=res.winner;');
  return a.run(`JSON.stringify({phases:w.phases.map(p=>[p.time,p.setup.key]),members:w.trials.map(t=>t.member),q:w.suitable&&w.ready,
   names:AIR_SCENARIOS.map(s=>s.name),passes:w.ensemble?.passes,final:w.trials.map(t=>+t.finalIndoor.toFixed(6))})`);};
 const first=run(),second=run();assert.equal(first,second);
 const r=JSON.parse(first);assert.equal(r.names.length,32);assert.equal(r.names[0],'member 0 (nominal)');
 if(r.members.length>1)assert.deepEqual(r.members,Array.from({length:32},(_,i)=>i));
});
