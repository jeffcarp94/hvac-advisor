const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
const winterset=require('./fixtures/winterset-2026-10-23.json');
function setup(){
 const a=app();a.ctx.saved=structuredClone(winterset);a.setNow(winterset.request.start);
 a.run(`forecast.timeZone=saved.envelope.timeZone;state.dehumidifierEnabled=true;
 r={...saved.request,start:new Date(saved.request.start),reading:new Date(saved.request.reading)};
 e={...saved.envelope,windowStart:new Date(saved.envelope.windowStart),windowEnd:new Date(saved.envelope.windowEnd),points:saved.envelope.points.map(p=>({...p,time:new Date(p.time)}))};`);
 return a;
}
test('fixed roof fan circulates between calls; coach moisture is mixed with either fan setting',()=>{
 const a=setup();a.run(`state.dehumidifierEnabled=false;
 short={...e,windowEnd:new Date(+r.start+15*60000),singlePoint:true,points:[{time:r.start,tOut:68,rh:40}],wind:0};
 sp={heat:60,cool:80,auto:68,fan:80};zones={temperature:[66,68],rh:[60,40]};
 fixed=zoneProfile('ac',short,false,sp,0,66,{initialZones:zones,frontControl:true,fanSetting:'Low'});
 cycling=zoneProfile('ac',short,false,sp,0,66,{initialZones:zones,frontControl:true,fanSetting:'Auto'});`);
 assert.equal(a.run("fixed.segments.every(s=>s.operation==='off'&&s.circulation===1)"),true);
 assert.equal(a.run("cycling.segments.every(s=>s.operation==='off'&&s.circulation===0)"),true);
 assert.ok(a.run('Math.abs(fixed.finalZones.temperature[0]-fixed.finalZones.temperature[1])')<a.run('Math.abs(cycling.finalZones.temperature[0]-cycling.finalZones.temperature[1])'));
 assert.equal(a.run('fixed.finalZones.water[0]'),a.run('fixed.finalZones.water[1]'));
 assert.equal(a.run('cycling.finalZones.water[0]'),a.run('cycling.finalZones.water[1]'));
 for(const mode of ['ac','hp','auto'])for(const fan of ['Low','Medium','High'])assert.equal(a.run(`circulationFraction('${mode}','${fan}','off',0)`),1);
 assert.equal(a.run("circulationFraction('ac','Auto','ac',.25)"),.25);
 assert.equal(a.run("circulationFraction('furnace','Low','off',0)"),0);
});
test('surface and condensation warnings cannot set a room-air humidity rejection',()=>{
 const a=setup();a.run(`ph=[{time:+r.start,setup:planSetup('ac',false)},{time:Date.parse('2026-10-24T02:30Z'),setup:planSetup('ac',true)}];
 surfaceAssessment=()=>({surface:50,margin:1,surfaceRH:90,condensation:true});
 p=simulatePlan(ph,e,r,AIR_SCENARIOS[2],null,null,false,true);`);
 assert.ok(a.run('p.surfaceConcern'));assert.match(a.run('p.surfaceWarning'),/surface RH, not room-air RH/);
 assert.equal(a.run('p.moistureEligible'),true);assert.equal(a.run('p.moisture.condensedLb'),0);
 a.run(`r.initial.rh=[98,98];wet=simulatePlan(ph,e,r)`);
 assert.ok(a.run('wet.condensationConcern'));assert.doesNotMatch(a.run('wet.moistureReason'),/Condensation|surface/i);
});
test('rejected plans are ranked by acceptable duration before comparing truncated scores',()=>{
 const a=setup();a.run(`short={suitable:false,ready:false,score:0,type:'passive',trials:[{failureTime:100,trace:[]}]};
 longer={suitable:false,ready:false,score:10,type:'ac',trials:[{failureTime:200,trace:[]}]};ranked=[short,longer].sort(comparePlans)`);
 assert.equal(a.run('ranked[0].type'),'ac');
});
test('a diagnostic continuation keeps the original comfort threshold and failure time across handoffs',()=>{
 const a=setup();a.run(`e.points=e.points.map(p=>({...p,tOut:82,rh:40,wind:2}));ph=[{time:+r.start,setup:planSetup('passive',false)},{time:Date.parse('2026-10-24T03:00Z'),setup:planSetup('ac',true)}];
 p=simulatePlan(ph,e,r,AIR_SCENARIOS[0],null,null,false,true)`);
 assert.ok(a.run('p.comfortProblem.time')<new Date('2026-10-24T03:00Z'));
 assert.match(a.run('p.comfortProblem.reason'),/73°F|74°F/);assert.equal(a.run('p.comfortReason'),a.run('p.comfortProblem.reason'));
 assert.ok(a.run('p.comfortProblem.time')<new Date('2026-10-24T03:00Z'));
});
test('current guidance ends at departure and never certifies an unvalidated absence',()=>{
 const a=setup();a.run(`r.occupancy='leaving';r.departure=new Date(+r.start+15*60000);r.returnTime=new Date(+r.start+8*3600000);
 c=currentRecommendation(e,r,[])`);
 assert.ok(a.run('c'));assert.equal(a.run('c.reviewAt'),Date.parse(winterset.request.start)+15*60000);
 assert.equal(a.run('c.trials.every(t=>t.suitable&&+t.trace.at(-1).time===+r.departure)'),true);
});
test('current guidance favors target fit over the former natural-recovery preference',()=>{
 const a=setup();a.run(`r.start=new Date('2026-10-23T12:30Z');r.reading=r.start;r.initial={temperature:[67,67],rh:[30,30]};
 state.temp=70;state.rh=25;state.wind=2;state.cloud=1;state.weatherMode='manual';e=makeEnvelope(r.start,planBounds(r.start).end,'Morning',300000);
 c=currentRecommendation(e,r,[])`);
 assert.equal(a.run('c.trials.every(t=>t.suitable)'),true);
 a.run(`rows=planRows(e,r,.5,[c.reviewAt]).filter(row=>row.to<=c.reviewAt);off=AIR_SCENARIOS.map(s=>simulatePlan([{time:+r.start,setup:planSetup('passive',false)}],e,r,s,rows));`);
 assert.ok(a.run('c.targetRank<=targetMetrics(off).targetRank'));
 assert.ok(a.run('c.trials.some(t=>t.didHeat)'));
});
test('current guidance cannot bypass an initially cold coach',()=>{
 const a=setup();a.run('r.initial.temperature=[64,72];c=currentRecommendation(e,r,[])');assert.equal(a.run('c'),null);
});
test('currently-away guidance preserves the verified physical arrangement and available controls',()=>{
 const a=setup();a.run(`r.occupancy='away';r.remote=true;r.departure=r.start;r.returnTime=new Date(+r.start+3600000);
 r.actualConfirmed=true;r.actual=planSetup('passive',false,{fanZone:1,gaps:[0,0,0,4,0,0]});
 plans=[{setup:r.actual,type:'passive',phases:[{time:+r.start,setup:r.actual}]}];c=currentRecommendation(e,r,plans)`);
 if(a.run('c'))assert.equal(a.run('sameSetup(c.setup,r.actual)'),true);
 assert.equal(a.run("setupChangeAllowed(r.actual,planSetup('ac',false),+r.start,r)"),false);
});
test('Winterset evening gives verified current guidance when body uncertainty prevents a complete plan',()=>{
 // Full window/fan search is exercised in browser CI; isolate closed-coach guidance here.
 const a=setup();a.run('shortlistVents=()=>[];result=runUnifiedPlan(r,e);html=renderPlan(result)');
 assert.equal(a.run('result.winner.suitable'),false);assert.equal(a.run('result.winner.ready'),true);
 assert.ok(a.run('result.current'));assert.equal(a.run('result.winner.trials.length'),9);
 assert.equal(a.run('result.winner.trials[0].suitable'),true);
 assert.ok(a.run('result.winner.trials.some(t=>!t.suitable)'));
 assert.ok(a.run('Number.isFinite(result.current.targetRank)'));
 assert.ok(a.run('result.winner.phases.every(p=>p.setup.type===\"passive\"||settingValues(p.setup).includes(p.setup.setpoints[p.setup.type===\"auto\"?\"auto\":p.setup.type===\"ac\"?\"cool\":p.setup.type===\"maxxfan\"?\"fan\":\"heat\"]))'));
 assert.equal(a.run('result.current.trials.length'),9);
 assert.equal(a.run('result.current.reviewAt'),+new Date(winterset.request.start)+30*60000);
 assert.equal(a.run('result.current.trials.every(t=>t.suitable&&+t.trace.at(-1).time===result.current.reviewAt&&t.moisture.humidMax===0)'),true);
 assert.match(a.run('html'),/Select (COOL|AUTO|HEAT PUMP|FURNACE) at \d+°F/);assert.match(a.run('html'),/Bed-area comfort takes priority/);assert.match(a.run('html'),/dew point/);
 assert.doesNotMatch(a.run('html'),/No suitable current setup/);
 assert.match(a.run('html'),/Overnight needs reassessment|complete overnight setup has not been verified/);
});
test('a future extreme-cold shortfall still provides bounded current guidance',()=>{
 const a=setup();a.run(`shortlistVents=()=>[];planSetups=sleep=>['ac','furnace'].map(type=>planSetup(type,sleep));
 e.points=e.points.map(p=>+p.time>+r.start+3*3600000?{...p,tOut:-50,wind:20,rh:30}:p);
 result=runUnifiedPlan(r,e);html=renderPlan(result)`);
 assert.equal(a.run('result.winner.suitable'),false);assert.ok(a.run('result.current'));
 assert.equal(a.run('result.current.reviewAt'),+new Date(winterset.request.start)+30*60000);
 assert.equal(a.run('result.current.trials.every(t=>t.suitable&&+t.trace.at(-1).time===result.current.reviewAt)'),true);
 assert.match(a.run('html'),/Next action — refresh readings/);assert.match(a.run('html'),/Overnight needs reassessment/);
});

