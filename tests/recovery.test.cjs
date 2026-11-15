const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
function setup(initial,out,minutes=180){
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.temp=${out};state.rh=40;state.wind=3;state.cloud=1;state.thermostatIsolated=true;
 r={start:new Date('2026-07-15T19:00Z'),initial:{temperature:[${initial},${initial}],rh:[30,30]},occupancy:'staying'};
 e=makeEnvelope(r.start,new Date(+r.start+${minutes}*60000),'Recovery test',30000);
 rows=scheduleWeather(e,r.start,e.windowEnd).map(x=>({...x,sleeping:false,occupants:2}));
 heating=planSetup('furnace',false);cooling=planSetup('ac',false,null,'High');`);return a;
}
test('cold start warms from below floor without an immediate rejection',()=>{
 const a=setup(53.1,41,12);a.run('p=simulatePlan([{time:+r.start,setup:heating}],e,r,AIR_SCENARIOS[0],rows)');
 assert.equal(a.run('p.suitable'),true);assert.equal(a.run('p.trace.at(-1).elapsedMin'),12);
 assert.ok(a.run('p.finalIndoor')>53.1);assert.equal(a.run('p.recoveryInfo.direction'),'heating');
});
test('hot starts retain AC beyond 30 minutes and report actual recovery',()=>{
 for(const initial of [95,105,110]){
 const a=setup(initial,95);a.run('p=simulatePlan([{time:+r.start,setup:cooling}],e,r,AIR_SCENARIOS[0],rows)');
 assert.equal(a.run('p.suitable'),true);assert.equal(a.run('p.equipmentEligible'),true);
 assert.ok(a.run('p.recoveryMinutes')>30);assert.equal(a.run('p.trace.at(-1).elapsedMin'),180);
 assert.equal(a.run('p.recoveryInfo.complete'),true);
 }
});
test('recovery state survives a checkpoint and a departure boundary',()=>{
 const a=setup(110,95);a.run(`ph=[{time:+r.start,setup:cooling}];prefix=simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows,null,true);
 time=+r.start+12*60000;carry=prefix.checkpoints.find(p=>p.time===time);
 resumed=simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows,{time,carry,prefix});`);
 assert.equal(a.run('resumed.recoveryMinutes'),a.run('prefix.recoveryMinutes'));
 assert.equal(a.run('resumed.finalIndoor'),a.run('prefix.finalIndoor'));
 assert.equal(a.run('resumed.suitable'),true);
});
test('recovery does not forgive a subsequent drop below the comfort floor',()=>{
 const a=setup(53,20);a.run(`ph=[{time:+r.start,setup:heating},{time:+r.start+15*60000,setup:planSetup('passive',false)}];p=simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows)`);
 assert.equal(a.run('p.suitable'),false);assert.ok(a.run('p.recoveryMinutes')!==null);
 assert.match(a.run('p.comfortReason'),/below/);
});
test('recovery cannot bypass equipment checks',()=>{
 const a=setup(110,95);a.run(`coolingPolicy=()=>({safe:false,reason:'Blocked equipment',issueCode:'test'});p=simulatePlan([{time:+r.start,setup:cooling}],e,r,AIR_SCENARIOS[0],rows)`);
 assert.equal(a.run('p.equipmentEligible'),false);assert.equal(a.run('p.suitable'),false);
});
test('unfinished recovery is disclosed and faster recovery ranks first',()=>{
 const a=setup(110,95,12);a.run(`p=evaluatePlan([{time:+r.start,setup:cooling}],e,r,rows);summary=recoverySummary(p.trials)`);
 assert.equal(a.run('summary.complete'),false);assert.match(a.run('recoveryNotice(summary)'),/Recovery is still in progress/);
 assert.ok(a.run("compareRecovery({recoveryInfo:{complete:true,minutes:40}},{recoveryInfo:{complete:true,minutes:70}})")<0);
});
test('capacity-limited cooling stays actionable without claiming the target is met',()=>{
 const a=setup(110,120,180);a.run(`C.acSensibleCapacity=500;action=recoveryAction(e,r)`);
 assert.ok(a.run('action'));assert.equal(a.run('action.limited'),true);
 assert.equal(a.run('action.recoveryInfo.complete'),false);
 assert.match(a.run('recoveryActionHTML(action)'),/A complete comfort plan has not passed/);
 assert.equal(a.run('action.reviewAt'),a.run('+r.start+30*60000'));
});
test('fallback refuses blocked equipment and unavailable physical changes',()=>{
 const a=setup(110,95);a.run(`coolingPolicy=()=>({safe:false,reason:'Blocked equipment',issueCode:'test'});action=recoveryAction(e,r)`);
 assert.equal(a.run('action'),null);
 a.run(`r.occupancy='away';r.remote=true;r.actual=planSetup('maxxfan',false,{gaps:[4,0,0,0,0,0],fanZone:0});action=recoveryAction(e,r)`);
 assert.equal(a.run('action'),null);
});
test('slow but effective heating is not subject to a 30-minute deadline',()=>{
 const a=setup(40,41);a.run(`C.furnaceOutput=7000;p=simulatePlan([{time:+r.start,setup:heating}],e,r,AIR_SCENARIOS[0],rows,null,false,true)`);
 assert.ok(a.run('p.recoveryMinutes')>30);assert.equal(a.run('p.recoveryInfo.complete'),true);
 assert.doesNotMatch(a.run('p.comfortReason'),/within 30 minutes|falls below 65/);
});
test('an actual departure during cooldown preserves the recovery clock and occupancy change',()=>{
 const a=setup(110,95);a.run(`r.occupancy='leaving';r.departure=new Date(+r.start+12*60000);r.returnTime=new Date(+r.start+180*60000);
 rows=planRows(e,r,.5,[+r.departure]).filter(x=>x.to<=+r.returnTime);
 prefix=[{time:+r.start,setup:cooling}];before=simulatePlan(prefix,e,r,AIR_SCENARIOS[0],rows.filter(x=>x.to<=+r.departure));
 after=simulatePlan([...prefix,{time:+r.departure,setup:cooling}],e,r,AIR_SCENARIOS[0],rows);
 handoff=after.trace.find(p=>+p.time===+r.departure);`);
 assert.equal(a.run('before.recoveryInfo.complete'),false);
 assert.equal(a.run('handoff.bedroom'),a.run('before.finalIndoor'));
 assert.equal(a.run('after.suitable'),true);assert.ok(a.run('after.recoveryMinutes')>30);
 assert.equal(a.run('rows.find(p=>p.from===+r.departure).occupants'),0);
});
test('measured temperatures have no arbitrary indoor bounds; invalid numbers still fail',()=>{
 const a=setup(20,10);a.run('r.reading=r.start');
 for(const temperatures of [[-20,-15],[20,35],[115,120],[130,135]]){
  a.ctx.temperatures=temperatures;assert.doesNotThrow(()=>a.run('r.initial.temperature=temperatures;validatePlanRequest(r)'));
 }
 for(const bad of [NaN,Infinity,-Infinity]){a.ctx.bad=bad;assert.throws(()=>a.run('r.initial.temperature=[bad,70];validatePlanRequest(r)'),/valid numbers/);}
});
test('temperature steppers cross former indoor and outdoor boundaries',()=>{
 const a=app();
 for(const [control,field,low] of [['temp','temp',20],['indoor','indoor',40],['currentIndoor','indoorCurrent',40]]){
  a.run(`state.${field}=${low};step('${control}',-1)`);assert.equal(a.run(`state.${field}`),low-1);
  a.run(`state.${field}=110;step('${control}',1)`);assert.equal(a.run(`state.${field}`),111);
 }
});
test('heating and cooling recovery simulate beyond the former indoor bounds',()=>{
 for(const [initial,out,type] of [[20,10,'heating'],[-10,-20,'heating'],[120,105,'cooling'],[130,110,'cooling']]){
  const a=setup(initial,out);a.run(`p=simulatePlan([{time:+r.start,setup:${type}}],e,r,AIR_SCENARIOS[0],rows,null,false,true)`);
  assert.equal(a.run('p.equipmentEligible'),true);
  assert.equal(a.run('p.trace.every(t=>Number.isFinite(t.bedroom)&&Number.isFinite(t.midCoach))'),true);
  assert.ok(a.run(type==='heating'?'p.finalIndoor>r.initial.temperature[0]':'p.finalIndoor<r.initial.temperature[0]'));
 }
});
