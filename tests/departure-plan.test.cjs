const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
function scenario({start='2026-10-24T02:00Z',departure='2026-10-24T02:10Z',back='2026-10-24T04:30Z',temp=58}={}){
 const a=app();a.ctx.structuredClone=structuredClone;
 a.run(`forecast.timeZone='America/Chicago';state.temp=${temp};state.rh=25;state.wind=2;state.cloud=1;
 r={start:new Date('${start}'),reading:new Date('${start}'),initial:{temperature:[68,68],rh:[30,30]},occupancy:'leaving',remote:false,departure:new Date('${departure}'),returnTime:new Date('${back}')};
 e=makeEnvelope(r.start,planBounds(r.start,r).end,'Test',300000);shortlistVents=()=>[];
 planSetups=sleep=>['passive','ac','hp','furnace','auto'].map(type=>planSetup(type,sleep));`);return a;
}
test('sleep deadline follows a late return, but remains 10 PM for an early return',()=>{
 const a=scenario();
 for(const [back,bed,end,hasSleep] of [
  ['2026-10-24T02:30Z','2026-10-24T03:00:00.000Z','2026-10-24T12:00:00.000Z',true],
  ['2026-10-24T04:30Z','2026-10-24T04:30:00.000Z','2026-10-24T12:00:00.000Z',true],
  ['2026-10-24T12:00Z',null,'2026-10-24T12:00:00.000Z',false],
  ['2026-10-24T14:00Z',null,'2026-10-24T14:00:00.000Z',false]]){
  a.run(`r.returnTime=new Date('${back}');b=planBounds(r.start,r)`);
  assert.equal(a.run('b.bedtime?.toISOString()??null'),bed);assert.equal(a.run('b.end.toISOString()'),end);assert.equal(a.run('b.hasSleep'),hasSleep);
 }
});
test('absence remains awake-policy/unoccupied after 10 PM; return starts sleep and restores occupant sources',()=>{
 const a=scenario();a.run('rows=planRows(e,r)');
 assert.equal(a.run('rows.filter(x=>x.from>=+r.departure&&x.to<=+r.returnTime).every(x=>x.occupants===0&&!x.sleeping)'),true);
 assert.equal(a.run('rows.find(x=>x.from===+r.returnTime).occupants'),2);
 assert.equal(a.run('rows.find(x=>x.from===+r.returnTime).sleeping'),true);
 a.run(`r.departure=new Date('2026-10-24T03:30Z');off=planSetup('passive',false);cool=planSetup('ac',false)`);
 assert.equal(a.run('setupChangeAllowed(off,cool,+r.departure,r)'),true);
 assert.equal(a.run('setupChangeAllowed(off,cool,+r.returnTime,r)'),true);
 assert.equal(a.run('setupChangeAllowed(off,cool,+r.returnTime+60000,r)'),false);
});
test('complete departure plan carries state, covers each stage and renders the six requested presentations',()=>{
 const a=scenario({start:'2026-10-24T04:00Z',departure:'2026-10-24T04:10Z'});a.run('r.remote=true;result=runUnifiedPlan(r,e);html=renderPlan(result)');
 assert.equal(a.run('result.winner.suitable&&result.winner.ready'),true);
 for(const kind of ['current','departure'])assert.ok(a.run(`result.stages.${kind}.recommended`));
 assert.ok(a.run('result.stages.night.recommendation'));
 assert.equal(a.run('result.stages.current.to'),a.run('+r.departure'));
 assert.equal(a.run('result.stages.departure.to'),a.run('+r.returnTime'));
 assert.equal(a.run('result.stages.night.from'),a.run('+r.returnTime'));
 assert.equal(a.run('result.winner.phases.some(p=>p.time>+r.departure&&p.time<+r.returnTime)'),false);
 assert.equal(a.run('result.winner.trials.every(t=>+t.trace.at(-1).time===+result.bounds.end)'),true);
 assert.equal(a.run("readingAt(result.winner,+r.returnTime,'bedroom')===result.stages.returnConditions.bedroom"),true);
 assert.equal(a.run("readingAt(result.winner,+r.returnTime,'rh')===result.stages.returnConditions.humidity"),true);
 a.run(`prefix=[result.winner.phases[0]];rows=planRows(e,r);before=AIR_SCENARIOS.map(s=>simulatePlan(prefix,e,r,s,rows.filter(x=>x.to<=+r.departure)));
 carried=result.winner.trials.map(t=>t.trace.find(p=>+p.time===+r.departure));`);
 assert.equal(a.run('before.every((t,i)=>JSON.stringify(t.trace.at(-1).water)===JSON.stringify(carried[i].water)&&t.trace.at(-1).bedroom===carried[i].bedroom&&t.trace.at(-1).midCoach===carried[i].midCoach)'),true);
 for(const label of ['Recommended current mode','Other viable current options','Recommended departure mode','Other viable departure options','Recommended overnight mode','Other viable overnight options'])assert.match(a.run('html'),new RegExp(label));
 assert.match(a.run('html'),/Predicted conditions at return/);assert.match(a.run('html'),/11:30 PM/);
 assert.doesNotMatch(a.run('html'),/<details[^>]*\bopen\b|Recommended return mode/);
 a.run(`delete result.envelope.planCache;for(const p of result.plans)for(const t of p.trials){delete t.checkpoints;if(p!==result.winner){t.trace=[];t.segments=[];}};copy=structuredClone(result);workerHTML=renderPlan(copy)`);
 assert.match(a.run('workerHTML'),/Recommended departure mode/);
});
test('current and departure modes may differ without inserting any adjustment during the absence',()=>{
 const a=scenario({start:'2026-10-23T17:00Z',departure:'2026-10-23T17:02Z',back:'2026-10-24T14:00Z',temp:85});
 // Isolate stage selection from a day/night solar-load change during a long absence.
 a.run(`state.cloud=0;e.cloud=0;r.initial.temperature=[70.5,70.5];result=runUnifiedPlan(r,e);html=renderPlan(result)`);
 assert.equal(a.run('result.stages.current.recommended.setup.type'),'passive');
 assert.ok(['ac','auto'].includes(a.run('result.stages.departure.recommended.setup.type')));
 assert.equal(a.run('result.stages.night'),null);
 assert.equal(a.run('result.winner.trials.every(t=>+t.trace.at(-1).time===+r.returnTime)'),true);
 assert.doesNotMatch(a.run('html'),/Recommended overnight mode/);assert.match(a.run('html'),/No overnight recommendation/);
});
test('identical current and departure setup says keep it; immediate departure omits a zero-length current stage',()=>{
 const a=scenario({back:'2026-10-24T12:00Z',temp:80});
 // One fixed control and no sunrise solar jump isolate the keep-setting presentation.
 a.run(`state.cloud=0;e.cloud=0;r.initial.temperature=[72,72];stageSetups=sleep=>[planSetup('ac',sleep,null,'Low')];settingValues=()=>[];result=runUnifiedPlan(r,e);html=renderPlan(result)`);
 assert.match(a.run('html'),/Keep this setup when you leave/);
 a.run(`r.departure=r.start;result=runUnifiedPlan(r,e);html=renderPlan(result)`);
 assert.equal(a.run('result.stages.current'),null);assert.ok(a.run('result.winner.trials'));
 assert.match(a.run('html'),/Recommended departure mode/);assert.doesNotMatch(a.run('html'),/Recommended current mode/);
});
test('failed current stage cannot prescribe a departure mode or claim the full plan passes',()=>{
 const a=scenario();a.run(`r.initial.temperature=[60,60];result=runUnifiedPlan(r,e);html=renderPlan(result)`);
 assert.equal(a.run('result.winner.suitable'),false);assert.equal(a.run('result.stages.current.recommended'),null);assert.equal(a.run('result.stages.departure.recommended'),null);
 assert.match(a.run('html'),/No current setup passes continuously through departure/);assert.doesNotMatch(a.run('html'),/Select COOL at|Select HEAT PUMP at|Select FURNACE at/);
});

test('predeparture cooling cannot qualify by using sleeping comfort while still awake',()=>{
 const a=scenario({start:'2026-10-24T01:00Z',departure:'2026-10-24T02:59:50Z',back:'2026-10-24T03:00:10Z',temp:78});
 a.run(`r.initial.temperature=[72,72];planSetups=sleep=>[planSetup('ac',sleep)];result=runUnifiedPlan(r,e)`);
 assert.equal(a.run('result.winner.suitable&&result.winner.ready'),false);
 assert.equal(a.run('result.stages.current.recommended.setup.setpoints.cool'),72);
 assert.equal(a.run('result.stages.night.recommendation'),null);
 assert.equal(a.run('result.winner.trials.every(t=>t.trace.every(p=>[p.bedroom,p.midCoach,p.rh,p.midRH,...p.water].every(Number.isFinite)))'),true);
 assert.equal(a.run('planRows(e,r).every(row=>row.dt>0)'),true);
});
