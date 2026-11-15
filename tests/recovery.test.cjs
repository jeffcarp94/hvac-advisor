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
