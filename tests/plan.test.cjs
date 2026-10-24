const test=require('node:test'),assert=require('node:assert/strict');
const {app,fixture}=require('./helpers.cjs');
function scenario(start='2026-10-24T02:55Z'){
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.temp=58;state.rh=25;state.wind=2;state.cloud=0;
 r={start:new Date('${start}'),reading:new Date('${start}'),initial:{temperature:[68,68],rh:[30,30]},occupancy:'staying',remote:false};
 e=makeEnvelope(r.start,planBounds(r.start).end,'Test',300000);`);return a;
}
test('unified horizon works at every hour and uses location calendar dates and DST',()=>{
 const a=scenario();
 for(const [date,bed,end] of [['2026-10-23T12:30Z','2026-10-24T03:00:00.000Z','2026-10-24T12:00:00.000Z'],['2026-10-24T02:30Z','2026-10-24T03:00:00.000Z','2026-10-24T12:00:00.000Z'],['2026-10-24T03:00Z',null,'2026-10-24T12:00:00.000Z'],['2026-10-24T11:30Z',null,'2026-10-24T12:00:00.000Z']]){
  assert.equal(a.run(`planBounds(new Date('${date}')).bedtime?.toISOString()??null`),bed);assert.equal(a.run(`planBounds(new Date('${date}')).end.toISOString()`),end);
 }
 a.run("forecast.timeZone='America/Chicago'");assert.equal(a.run("(planBounds(new Date('2026-11-01T03:00Z')).end-new Date('2026-11-01T03:00Z'))/3600000"),10);
 assert.equal(a.run("currentTargets(new Date('2026-10-24T02:30Z')).cool"),72);
});
test('separate temperature and moisture readings initialize both zones without averaging',()=>{
 const a=scenario();a.run(`r.initial={temperature:[67,71],rh:[60,35]};p=simulatePlan([{time:+r.start,setup:planSetup('furnace',true)}],e,r)`);
 assert.equal(a.run('p.trace[0].bedroom'),67);assert.equal(a.run('p.trace[0].midCoach'),71);
 assert.ok(Math.abs(a.run('p.trace[0].rh')-60)<1e-8);assert.ok(Math.abs(a.run('p.trace[0].midRH')-35)<1e-8);
});
test('front sensor governs HVAC calls while bedroom controls sleep comfort',()=>{
 const a=scenario('2026-10-24T11:55Z');a.run(`r.initial.temperature=[65,70];p=simulatePlan([{time:+r.start,setup:planSetup('furnace',true)}],e,r)`);
 assert.equal(a.run("p.segments.some(s=>s.operation==='furnace')"),false);
 a.run(`r.initial.temperature=[70,65];q=simulatePlan([{time:+r.start,setup:planSetup('furnace',true)}],e,r)`);
 assert.equal(a.run("q.segments.some(s=>s.operation==='furnace')"),true);
});
test('occupancy changes exactly at departure and return, with unchanged targets',()=>{
 const a=scenario('2026-10-23T12:00Z');a.run(`r.occupancy='leaving';r.departure=new Date('2026-10-23T12:12Z');r.returnTime=new Date('2026-10-23T12:37Z');rows=planRows(e,r)`);
 assert.equal(a.run('rows.find(x=>x.from===+r.departure).occupants'),0);assert.equal(a.run('rows.find(x=>x.from===+r.returnTime).occupants'),2);
 assert.equal(a.run('confirmedSetpoints(false).heat'),70);assert.equal(a.run('confirmedSetpoints(false).cool'),72);
});
test('away occupancy removes respiration and metabolism but retains appliance heat',()=>{
 const a=scenario('2026-10-24T11:40Z');a.run(`ph=[{time:+r.start,setup:planSetup('passive',true)}];present=simulatePlan(ph,e,r);
 r.occupancy='away';r.departure=r.start;r.returnTime=new Date('2026-10-24T14:00Z');absent=simulatePlan(ph,e,r)`);
 assert.ok(a.run('absent.trace.at(-1).bedroom')<a.run('present.trace.at(-1).bedroom'));
 assert.ok(a.run('absent.finalZones.water[0]')<a.run('present.finalZones.water[0]'));
 assert.equal(a.run('dehumidifierHeat()'),0);assert.equal(a.run('dehumidifierHeat(1)'),640);
});
test('attended and away heating share the documented equipment minimum',()=>{
 const a=scenario('2026-10-23T13:00Z');a.run(`state.temp=45;state.rh=95;r.initial={temperature:[68,68],rh:[25,25]};e=makeEnvelope(r.start,planBounds(r.start).end,'Test',300000);ph=[{time:+r.start,setup:planSetup('hp',false)}];rows=planRows(e,r).filter(row=>row.to<=+r.start+3600000);present=simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows);
 r.occupancy='leaving';r.departure=r.start;r.returnTime=new Date(+r.start+3600000);awayRows=planRows(e,r).filter(row=>row.to<=+r.start+3600000);away=simulatePlan(ph,e,r,AIR_SCENARIOS[0],awayRows)`);
 assert.equal(a.run('present.equipmentEligible'),true);assert.equal(a.run('away.equipmentEligible'),true);
 assert.equal(a.run('heatPumpPolicy(29,95,true).safe'),false);
});
test('away transitions require available controls, with a departure instant exception',()=>{
 const a=scenario('2026-10-24T00:00Z');a.run(`r.occupancy='leaving';r.departure=new Date(+r.start+600000);r.returnTime=new Date(+r.start+7200000);off=planSetup('passive',false);cool=planSetup('ac',false);vent=planSetup('maxxfan',false,{fanZone:0,gaps:[0,0,0,4,0,0]});`);
 assert.equal(a.run('setupChangeAllowed(vent,cool,+r.departure,r)'),true);
 assert.equal(a.run('setupChangeAllowed(vent,cool,+r.departure+1,r)'),false);
 a.run('r.remote=true');assert.equal(a.run('setupChangeAllowed(vent,cool,+r.departure+1,r)'),false);
 assert.equal(a.run('setupChangeAllowed(off,cool,+r.departure+1,r)'),true);
 assert.equal(a.run('setupChangeAllowed(vent,vent,+r.departure+1,r)'),true);
 assert.equal(a.run('setupChangeAllowed(vent,cool,+r.returnTime,r)'),true);
});
test('currently away is gated and requires confirmed existing physical conditions',()=>{
 const a=scenario();a.run(`r.occupancy='away';r.departure=r.start;r.returnTime=new Date(+r.start+3600000)`);
 assert.throws(()=>a.run('validatePlanRequest(r)'),/remote thermostat/);
 a.run('r.remote=true');assert.throws(()=>a.run('validatePlanRequest(r)'),/Confirm/);
 a.run(`r.actualConfirmed=true;r.actual=planSetup('ac',false,{fanZone:1,gaps:[0,0,0,4,0,0]})`);
 assert.throws(()=>a.run('validatePlanRequest(r)'),/open windows/);
});
test('window ventilation is eligible for consideration during absence and rain',()=>{
 const a=scenario();a.run(`r.initial.temperature=[76,76];r.occupancy='leaving';r.departure=r.start;r.returnTime=new Date(+r.start+3600000);e.precip='rain';e.points[0].precip='rain';
 v=planSetup('maxxfan',false,{fanZone:0,fanName:'Bedroom MaxxFan',gaps:[2,0,0,0,0,0]});p=simulatePlan([{time:+r.start,setup:v}],e,r)`);
 assert.equal(a.run("p.segments.some(s=>s.operation==='maxxfan')"),true);assert.equal(a.run('p.equipmentEligible'),true);
});
test('cached preparation trials preserve continuous heat, water, comfort and moisture exposure',()=>{
 const a=scenario();a.run(`ph=[{time:+r.start,setup:planSetup('furnace',false)},{time:+r.start+5*60000,setup:planSetup('furnace',true)}];rows=planRows(e,r);
 direct=evaluatePlan(ph,e,r,rows);e.planCache=new Map();cached=evaluatePlan(ph,e,r,rows)`);
 for(const field of ['score','moisture.minMargin','moisture.surfaceMax','moisture.humidMax','comfortRuns.warmMax','comfortRuns.coldMax']){
  assert.ok(Math.abs(a.run('direct.trials[0].'+field)-a.run('cached.trials[0].'+field))<1e-8,field);
 }
 assert.equal(a.run('direct.suitable'),a.run('cached.suitable'));
 assert.equal(a.run('JSON.stringify(direct.trials[0].trace)'),a.run('JSON.stringify(cached.trials[0].trace)'));
});
test('morning natural recovery outranks a small active-heating score advantage only when viable',()=>{
 const a=scenario('2026-10-23T12:30Z');a.run(`r.initial.temperature=[67,67];e.points[0].tOut=70;ph=[{time:+r.start,setup:planSetup('passive',false)}];p=simulatePlan(ph,e,r);recovery=naturalRecovery([p,p,p],r,ph[0].setup)`);
 assert.ok(a.run('recovery.minutes')>0);assert.ok(a.run('recovery.minutes')<=30);
 a.run(`plans=[{suitable:true,ready:true,natural:null,score:0,type:'hp'},{suitable:true,ready:true,natural:recovery,score:.2,type:'passive'}];plans.sort(comparePlans)`);
 assert.equal(a.run('plans[0].type'),'passive');
 a.run('plans[0].suitable=false;plans.sort(comparePlans)');assert.equal(a.run('plans[0].type'),'hp');
});
test('bedtime eligibility is separate from sustained overnight comfort and reports missed deadlines',()=>{
 const a=scenario('2026-10-24T02:59Z');a.run(`r.initial.temperature=[70,70];p=simulatePlan([{time:+r.start,setup:planSetup('furnace',true)}],e,r)`);
 assert.equal(a.run('p.ready'),false);assert.match(a.run('p.bedtimeReason'),/10 PM/);
 assert.equal(a.run('p.atBedtime.time.toISOString()'),'2026-10-24T03:00:00.000Z');
});
test('initial condensation warning persists through a setup change without rejecting the plan',()=>{
 const a=scenario();a.run(`r.initial.rh=[90,90];p=evaluatePlan([{time:+r.start,setup:planSetup('furnace',false)},{time:+r.start+60000,setup:planSetup('furnace',true)}],e,r,planRows(e,r))`);
 assert.ok(a.run('p.trials[0].condensationConcern'));assert.doesNotMatch(a.run('p.reason'),/Condensation|surface/i);
});
test('known location supplies solar elevation; no latitude invents dawn precision',()=>{
 const a=scenario('2026-10-23T12:30Z');a.run(`e.lat=41.3;e.lon=-94;e.cloud=1;e.points[0].cloud=1;rows=planRows(e,r)`);
 assert.ok(a.run('rows.find(x=>x.from>=+r.start+90*60000).solar')>a.run('rows[0].solar'));
});
test('reading validation rejects missing data, mismatched schedule and impossible local times',()=>{
 const a=scenario();a.run('r.initial.rh[1]=NaN');assert.throws(()=>a.run('validatePlanRequest(r)'),/humidity/);
 a.run(`r.initial.rh[1]=40;r.occupancy='leaving';r.departure=new Date(+r.start+3600000);r.returnTime=r.start`);assert.throws(()=>a.run('validatePlanRequest(r)'),/Return/);
 assert.throws(()=>a.run("parseLocalInput('2026-03-08T02:30','test time')"),/valid local time/);
});
test('real end-to-end overnight planning has no unsafe prescription and keeps fixed settings',()=>{
 const a=scenario('2026-10-24T11:45Z');a.run(`result=runUnifiedPlan(r,e);html=renderPlan(result)`);
 assert.ok(a.run('result.plans.length')>=5);assert.equal(a.run('result.winner.nightSetup.setpoints.cool'),68);assert.equal(a.run('result.winner.nightSetup.setpoints.heat'),66);
 assert.match(a.run('html'),/Your HVAC plan/);assert.match(a.run('html'),/Other viable overnight options/);assert.match(a.run('html'),/Unsuitable overnight modes/);
 if(!a.run('result.winner.suitable')&&!a.run('result.current'))assert.doesNotMatch(a.run('html'),/Select FURNACE at|Select COOL at|Use the .*MaxxFan in AUTO/);
});
test('a scheduled action expires the displayed plan and remote capability is off by default',()=>{
 const a=scenario();a.setNow('2026-10-24T02:00Z');a.run(`resultRecorded({windowEnd:new Date('2026-10-24T12:00Z')},Date.parse('2026-10-24T02:10Z'));`);a.element('results').innerHTML='old';
 a.setNow('2026-10-24T02:10Z');a.run('checkResultValidity()');assert.equal(a.element('results').innerHTML,'');
 assert.equal(a.element('awayOption').disabled,true);
});
test('form times preserve their actual instant when NWS changes the location timezone',()=>{
 const a=scenario();a.run("forecast.timeZone='America/Los_Angeles';updatePlanUI();document.getElementById('readingTime').value='2026-10-23T18:00';document.getElementById('departureTime').value='2026-10-23T19:00';forecast.timeZone='America/Chicago';updatePlanUI()");
 assert.equal(a.element('readingTime').value,'2026-10-23T20:00');assert.equal(a.element('departureTime').value,'2026-10-23T21:00');
});
test('a physically unchanged thermostat is still judged against overnight comfort after 10 PM',()=>{
 const a=scenario();a.run(`r.initial.temperature=[72,72];state.temp=72;e=makeEnvelope(r.start,planBounds(r.start).end,'Test',300000);p=simulatePlan([{time:+r.start,setup:planSetup('ac',false)}],e,r)`);
 assert.equal(a.run('p.suitable'),false);assert.match(a.run('p.comfortReason'),/69°F|70°F/);
});
test('currently-away instructions never prescribe manual window or roof-fan adjustments',()=>{
 const a=scenario();a.run(`r.occupancy='away';r.departure=r.start;r.returnTime=new Date(+r.start+3600000);r.remote=true;phase={time:+r.start,setup:planSetup('ac',false)};text=planActionText(phase,r)`);
 assert.match(a.run('text'),/remote thermostat app/);assert.doesNotMatch(a.run('text'),/Close windows|Use the .*MaxxFan|Set .*window/);
});
test('a validated plan compares measured-state continuation with complete evaporation history',()=>{
 const a=scenario();a.run(`r.initial.rh=[65,65];state.temp=68;state.dehumidifierEnabled=false;e=makeEnvelope(r.start,planBounds(r.start).end,'Test',300000);
 ph=[{time:+r.start,setup:planSetup('passive',false)},{time:+r.start+5*60000,setup:planSetup('ac',true)}];rows=planRows(e,r);direct=evaluatePlan(ph,e,r,rows);e.planCache=new Map();cached=evaluatePlan(ph,e,r,rows)`);
 assert.equal(a.run('cached.reason'),a.run('direct.reason'));assert.equal(a.run('cached.trials[0].moisture.surfaceMax'),a.run('direct.trials[0].moisture.surfaceMax'));
});
test('two successive handoffs preserve the full temperature and moisture trajectory',()=>{
 const a=scenario();a.run(`ph=[{time:+r.start,setup:planSetup('furnace',false)},{time:+r.start+2*60000,setup:planSetup('passive',false)},{time:+r.start+5*60000,setup:planSetup('furnace',true)}];rows=planRows(e,r);
 direct=evaluatePlan(ph,e,r,rows);e.planCache=new Map();cached=evaluatePlan(ph,e,r,rows)`);
 for(let i=0;i<3;i++)assert.equal(a.run('JSON.stringify(direct.trials['+i+'].trace)'),a.run('JSON.stringify(cached.trials['+i+'].trace)'));
});
test('currently away uses the coach location and cancels a pending phone-location lookup',async()=>{
 const a=scenario();a.element('remoteAccess').checked=true;a.element('occupancyMode').value='away';
 a.run('gpsRequestActive=true;weatherLoading=true;updatePlanUI()');assert.equal(a.run('gpsRequestActive'),false);assert.equal(a.element('gpsBtn').disabled,true);
 await a.run('useMyLocation()');assert.match(a.element('weatherStatus').textContent,/RV’s ZIP code/);
});
test('future planning displays weather for the selected future start rather than the current hour',()=>{
 const a=app();fixture(a);a.run(`forecast.intervals.temperature=[{start:Date.parse('2026-10-21T00:00Z'),end:Date.parse('2026-10-22T00:00Z'),value:50},{start:Date.parse('2026-10-22T00:00Z'),end:Date.parse('2026-10-24T00:00Z'),value:70}];updatePlanUI();document.getElementById('planningMode').value='future';document.getElementById('futureStart').value='2026-10-22T06:45';planInputsChanged()`);
 assert.equal(a.run('state.temp'),70);assert.equal(a.run("makeEnvelope(parseLocalInput('2026-10-22T06:45','start'),parseLocalInput('2026-10-22T07:00','end'),'Test',300000).points[0].tOut"),70);
});
test('full-night search verifies bedtime and the entire night after passive cooldown',()=>{
 const a=scenario('2026-10-24T02:30Z');a.run(`state.temp=60;state.rh=20;r.initial={temperature:[69,69],rh:[35,35]};e=makeEnvelope(r.start,planBounds(r.start).end,'Full night',300000);result=runUnifiedPlan(r,e)`);
 assert.equal(a.run('result.winner.suitable'),true);assert.equal(a.run('result.winner.ready'),true);
 assert.equal(a.run('result.winner.trials.every(t=>t.suitable&&t.ready&&+t.trace.at(-1).time===+result.bounds.end)'),true);
 assert.equal(a.run('result.winner.nightSetup.setpoints.cool'),68);assert.equal(a.run('result.winner.nightSetup.setpoints.heat'),66);
 assert.match(a.run('renderPlan(result)'),/Bedroom at 10 PM/);
});

