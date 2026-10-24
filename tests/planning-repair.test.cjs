const test=require('node:test'),assert=require('node:assert/strict'),{app}=require('./helpers.cjs');
function load(a,job){a.setNow(job.start);a.ctx.job=job;a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;
 r={start:new Date(job.start),reading:new Date(job.start),initial:{temperature:[72,72],rh:[54,52]},occupancy:'staying',remote:false};
 pts=job.points.map(p=>({...p,time:new Date(p.time),tOut:Math.round(p.tOut),rh:Math.round(p.rh)}));
 e={windowStart:r.start,windowEnd:new Date(job.end),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,singlePoint:false,points:pts,cloud:pts[0].cloud,wind:pts[0].wind,precip:pts[0].precip};`);}
test('heat pump includes full defrost interruptions and never substitutes furnace',()=>{
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=false;C.hpCapacityCold=1000;C.hpCapacityWarm=1000;
 e={windowStart:new Date('2026-05-10T03:00Z'),windowEnd:new Date('2026-05-10T04:30Z'),wind:0,cloud:0,points:[{time:new Date('2026-05-10T03:00Z'),tOut:40,rh:70,wind:0,cloud:0}]};
 p=zoneProfile('hp',e,true,confirmedSetpoints(true),0,60,{checkEquipment:false});`);
 assert.ok(Math.abs(a.run('p.defrostMinutes')-15)<1e-6);
 assert.ok(Math.abs(a.run('p.heatMinutes')-75)<1e-6);
 assert.equal(a.run("p.segments.filter(s=>s.operation==='defrost').every(s=>s.duty===0&&s.circulation===0)"),true);
 assert.equal(a.run("p.segments.some(s=>s.operation==='furnace')"),false);
});
test('part-load heating advances through defrost boundaries with finite substeps',()=>{
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;
 e={windowStart:new Date('2026-05-10T03:00Z'),windowEnd:new Date('2026-05-10T08:00Z'),wind:8,cloud:0,points:[{time:new Date('2026-05-10T03:00Z'),tOut:40,rh:75,wind:8,cloud:0}]};
 p=zoneProfile('hp',e,true,confirmedSetpoints(true),C.metaSleep,66,{frontControl:true});`);
 assert.ok(a.run('p.defrostMinutes')>0);assert.ok(a.run('p.segments.length')<2000);
 assert.equal(a.run('p.segments.every(s=>s.hours>0&&Number.isFinite(s.duty))'),true);
 assert.equal(a.run('+p.trace.at(-1).time'),Date.parse('2026-05-10T08:00Z'));
});
test('cached heating handoff preserves defrost clock, pauses and moisture',()=>{
 const a=app();load(a,require('./fixtures/winterset-planning-regressions.json')[0]);
 a.run(`e.points=e.points.map(p=>({...p,tOut:40,rh:60}));ph=[{time:+r.start,setup:planSetup('hp',false)},{time:+r.start+55*60000,setup:planSetup('hp',true)}];rows=planRows(e,r);
 direct=evaluatePlan(ph,e,r,rows);e.planCache=new Map();cached=evaluatePlan(ph,e,r,rows);`);
 assert.equal(a.run('JSON.stringify(direct.trials.map(t=>({trace:t.trace,segments:t.segments,defrost:t.defrostMinutes})))'),a.run('JSON.stringify(cached.trials.map(t=>({trace:t.trace,segments:t.segments,defrost:t.defrostMinutes})))'));
});
test('sleep forbids later thermostat or physical changes even when remote control is enabled',()=>{
 const a=app();load(a,require('./fixtures/winterset-planning-regressions.json')[0]);a.run(`r.remote=true;hp=planSetup('hp',true);furn=planSetup('furnace',true);`);
 assert.equal(a.run('setupChangeAllowed(hp,furn,+planBounds(r.start).bedtime,r)'),true);
 assert.equal(a.run('setupChangeAllowed(hp,furn,+planBounds(r.start).bedtime+60000,r)'),false);
 assert.equal(a.run('setupChangeAllowed(hp,hp,+planBounds(r.start).bedtime+60000,r)'),true);
 a.run(`p=evaluatePlan([{time:+r.start,setup:hp},{time:+planBounds(r.start).bedtime+3600000,setup:furn}],e,r,planRows(e,r));`);
 assert.equal(a.run('p.suitable'),false);assert.match(a.run('p.reason'),/unavailable action/);
});
test('AUTO readiness accepts normal cycling only after cooling target has been reached',()=>{
 const a=app();load(a,require('./fixtures/winterset-planning-regressions.json')[0]);
 a.run(`p=simulatePlan([{time:+r.start,setup:planSetup('auto',true)}],e,r);`);
 assert.equal(a.run('p.ready'),true);
 assert.ok(a.run('p.trace.some(p=>p.bedroom<=68.5)'));
 a.run(`late=simulatePlan([{time:+r.start,setup:planSetup('ac',false)},{time:+planBounds(r.start).bedtime,setup:planSetup('auto',true)}],e,r);`);
 assert.equal(a.run('late.ready'),false);
});
test('preparation search finds a feasible five-minute island between failed coarse samples',()=>{
 const a=app();load(a,require('./fixtures/winterset-planning-regressions.json')[0]);
 // Keep the strict target here to isolate search coverage from AUTO readiness policy.
 a.run(`originalSimulate=simulatePlan;simulatePlan=(...args)=>{const p=originalSimulate(...args);if(p.atBedtime&&p.atBedtime.bedroom>68.5)p.ready=false;return p;};
 result=runUnifiedPlan(r,e);`);
 assert.equal(a.run('result.winner.suitable&&result.winner.ready'),true);
 assert.equal(a.run('result.winner.trials.every(t=>+t.trace.at(-1).time===+e.windowEnd)'),true);
});
test('planner searches separate COOL preparation followed by an overnight heating setup',()=>{
 const a=app();load(a,require('./fixtures/winterset-planning-regressions.json')[1]);a.run('result=runUnifiedPlan(r,e);html=renderPlan(result)');
 assert.equal(a.run('result.winner.suitable&&result.winner.ready'),true);
 assert.equal(a.run("result.plans.some(p=>p.suitable&&p.ready&&p.phases.length===3&&p.phases[1].setup.type==='ac'&&['hp','furnace'].includes(p.nightType))"),true);
 assert.equal(a.run('result.winner.trials.every(t=>+t.trace.at(-1).time===+e.windowEnd)'),true);
 assert.match(a.run('html'),/without manual changes or automatic furnace backup/);
});
