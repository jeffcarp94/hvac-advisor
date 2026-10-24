const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
function scenario(start='2026-10-23T17:00Z'){
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.temp=58;state.rh=25;state.wind=2;state.cloud=1;
 r={start:new Date('${start}'),initial:{temperature:[68,68],rh:[30,30]},occupancy:'staying',remote:false};
 e=makeEnvelope(r.start,planBounds(r.start,r).end,'Test',300000);e.cloud=0;e.points[0].cloud=0;`);return a;
}
test('targets, tolerance and mode direction implement the owner-approved policy',()=>{
 const a=scenario();assert.equal(a.run('COMFORT.sleeping.target'),67);assert.equal(a.run('COMFORT.nonSleeping.target'),71);
 for(const [sleep,target,low,high]of [[true,67,65,69],[false,71,68,73]]){
  for(const mode of ['hp','furnace','ac','maxxfan','auto','passive']){
   for(const t of [target-.5,target,target+.5])assert.equal(a.run(`targetPenalty(${t},${sleep},'${mode}')`),0);
  }
  for(const mode of ['hp','furnace'])assert.equal(a.run(`targetPenalty(${low},${sleep},'${mode}')<targetPenalty(${high},${sleep},'${mode}')`),true);
  for(const mode of ['ac','maxxfan'])assert.equal(a.run(`targetPenalty(${high},${sleep},'${mode}')<targetPenalty(${low},${sleep},'${mode}')`),true);
  assert.equal(a.run(`targetPenalty(${target-1},${sleep},'hp')<targetPenalty(${low},${sleep},'hp')`),true);
  assert.equal(a.run(`targetPenalty(${target+.5},${sleep},'ac')<targetPenalty(${high},${sleep},'ac')`),true);
 }
 assert.equal(a.run("targetPenalty(65,true,'auto','hp')<targetPenalty(69,true,'auto','hp')"),true);
 assert.equal(a.run("targetPenalty(69,true,'auto','ac')<targetPenalty(65,true,'auto','ac')"),true);
});
test('sleep thermostat settings cannot activate sleeping bands while awake or after 7 AM',()=>{
 for(const start of ['2026-10-23T17:00Z','2026-10-24T12:00Z']){
  const a=scenario(start);a.run(`rows=planRows(e,r).filter(x=>x.to<=+r.start+90*60000);p=simulatePlan([{time:+r.start,setup:planSetup('hp',true)}],e,r,AIR_SCENARIOS[0],rows)`);
  assert.equal(a.run('p.comfortLow'),68);assert.equal(a.run('p.comfortHigh'),73);
  assert.equal(a.run('p.trace.every(x=>!x.sleep)'),true);assert.equal(a.run('p.suitable'),false);
  assert.match(a.run('p.comfortReason'),/below 68|acceptable temperature/);
 }
});
test('sleeping band follows occupancy and clock, ending exactly at 7 AM',()=>{
 const a=scenario('2026-10-24T03:00Z');a.run(`p=simulatePlan([{time:+r.start,setup:planSetup('hp',false)}],e,r)`);
 assert.equal(a.run('p.comfortLow'),65);assert.equal(a.run('p.comfortHigh'),69);
 // Use a viable fixed heating setup so the entire trace reaches the boundary.
 a.run(`p=simulatePlan([{time:+r.start,setup:planSetup('hp',true)}],e,r)`);
 assert.equal(a.run('p.trace.at(-1).time.toISOString()'),'2026-10-24T12:00:00.000Z');assert.equal(a.run('p.trace.at(-1).sleep'),false);
 a.run(`r.occupancy='away';r.remote=true;r.departure=r.start;r.returnTime=new Date(+r.start+3600000);r.actual=planSetup('hp',true);rows=planRows(e,r).filter(x=>x.to<=+r.returnTime);p=simulatePlan([{time:+r.start,setup:r.actual}],e,r,AIR_SCENARIOS[0],rows)`);
 assert.equal(a.run('p.comfortLow'),68);assert.equal(a.run('p.comfortHigh'),73);
 assert.equal(a.run('p.segments.every(s=>!s.sleeping&&s.occupied===0)'),true);
});
test('qualification precedes target ranking and natural recovery cannot override target fit',()=>{
 const a=scenario();a.run(`good={suitable:true,ready:true,type:'hp',score:1,targetRank:.5};bad={suitable:false,ready:true,type:'ac',score:0,targetRank:0};
 near={...good,targetRank:0,natural:null};far={...good,targetRank:.6,natural:{minutes:0}};`);
 assert.ok(a.run('comparePlans(good,bad)')<0);assert.ok(a.run('comparePlans(near,far)')<0);
});
test('target ranking uses elapsed duration, stage boundaries and the worst scenario',()=>{
 const a=scenario();a.run(`trials=[{segments:[{startMs:0,endMs:3600000,targetPenalty:10,targetAbsolute:5},{startMs:3600000,endMs:7200000,targetPenalty:1,targetAbsolute:2}]},
 {segments:[{startMs:0,endMs:3600000,targetPenalty:2,targetAbsolute:1},{startMs:3600000,endMs:7200000,targetPenalty:2,targetAbsolute:3}]}];`);
 assert.equal(a.run('targetMetrics(trials).targetRank'),5.5);
 assert.equal(a.run('targetMetrics(trials,3600000,7200000).targetRank'),2);
 assert.equal(a.run('targetMetrics(trials,3600000,7200000).targetDeviation'),3);
});
test('cached continuations preserve target scoring with the complete carried trajectory',()=>{
 const a=scenario('2026-10-24T02:50Z');a.run(`ph=[{time:+r.start,setup:planSetup('ac',false)},{time:+r.start+5*60000,setup:planSetup('hp',true)}];rows=planRows(e,r);direct=evaluatePlan(ph,e,r,rows);e.planCache=new Map();cached=evaluatePlan(ph,e,r,rows)`);
 assert.ok(Math.abs(a.run('direct.targetRank-cached.targetRank'))<1e-9);assert.ok(Math.abs(a.run('direct.targetDeviation-cached.targetDeviation'))<1e-9);
});
