const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
function scenario(start='2026-10-24T02:50Z'){
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.temp=58;state.rh=25;state.wind=2;state.cloud=1;
 r={start:new Date('${start}'),reading:new Date('${start}'),initial:{temperature:[68,68],rh:[30,30]},occupancy:'staying',remote:false};
 e=makeEnvelope(r.start,planBounds(r.start).end,'Test',300000);shortlistVents=()=>[];
 planSetups=sleep=>['passive','ac','hp','furnace','auto'].map(type=>planSetup(type,sleep));`);return a;
}
test('two periods switch only at exactly 7 AM and 10 PM, with no morning/evening gates',()=>{
 const a=scenario();
 for(const [time,sleep] of [['06:59',true],['07:00',false],['09:59',false],['10:00',false],['18:59',false],['19:00',false],['21:59',false],['22:00',true]]){
  a.run(`now=parseLocalInput('2026-10-23T${time}','test')`);
  assert.equal(a.run('planBounds(now).sleep'),sleep,time);
  assert.equal(a.run('currentTransitionWindow(now).active'),!sleep,time);
 }
});
test('natural daytime recovery is checked after 10 AM and after 7 PM',()=>{
 const a=scenario();
 for(const time of ['09:00','12:00','19:30']){
  a.run(`r.start=parseLocalInput('2026-10-23T${time}','test');
  trials=[{trace:[{time:r.start,elapsedMin:0,bedroom:67,midCoach:67},{time:new Date(+r.start+600000),elapsedMin:10,bedroom:68,midCoach:68}],segments:[]}];
  recovery=naturalRecovery(trials,r,planSetup('passive',false))`);
  assert.equal(a.run('recovery.minutes'),10,time);
 }
});
test('projected alternatives retain identical preparation and exact carried bedtime state',()=>{
 const a=scenario();a.ctx.structuredClone=structuredClone;a.run(`result=runUnifiedPlan(r,e);records=[];originalEvaluate=evaluatePlan;
 evaluatePlan=(...args)=>{const p=originalEvaluate(...args);records.push(p);return p;};
 comparisons=periodComparisons(result,planSetups(false),planSetups(true),planRows(e,r));html=renderPlan({...result,comparisons});`);
 assert.equal(a.run('result.winner.suitable&&result.winner.ready'),true);
 assert.equal(a.run('comparisons.night.projected'),true);
 assert.equal(a.run('comparisons.night.options.length'),5);
 assert.equal(a.run(`records.every(p=>JSON.stringify(p.phases.filter(x=>x.time<+result.bounds.bedtime))===JSON.stringify(result.winner.phases.filter(x=>x.time<+result.bounds.bedtime)))`),true);
 assert.equal(a.run(`records.every(p=>p.trials.every((t,i)=>JSON.stringify(t.atBedtime)===JSON.stringify(result.winner.trials[i].atBedtime)))`),true);
 assert.match(a.run('html'),/projected overnight options/);assert.match(a.run('html'),/same predicted sleep-start conditions/);
 // Comparison summaries survive the exact worker payload pruning.
 a.run(`delete result.envelope.planCache;for(const p of result.plans)for(const t of p.trials){delete t.checkpoints;if(p!==result.winner){t.trace=[];t.segments=[];}};serialized=structuredClone(result);workerHTML=renderPlan(serialized)`);
 assert.match(a.run('workerHTML'),/projected overnight options/);
});
test('daytime alternatives cannot borrow an early AC switch; idle heaters are unnecessary',()=>{
 const a=scenario('2026-10-23T17:00Z');a.run(`r.initial.temperature=[72,72];state.temp=80;e=makeEnvelope(r.start,planBounds(r.start).end,'Test',300000);
 bounds=planBounds(r.start);winner={suitable:true,ready:false,setup:planSetup('ac',false),phases:[{time:+r.start,setup:planSetup('ac',false)},{time:+r.start+3600000,setup:planSetup('ac',true)}]};
 c=periodComparisons({winner,bounds,request:r,envelope:e,plans:[],current:null},planSetups(false),[],planRows(e,r))`);
 assert.equal(a.run('c.day.to'),a.run('+r.start+3600000'));
 assert.equal(a.run("c.day.options.find(p=>p.setup.type==='ac').suitable"),true);
 for(const mode of ['hp','furnace'])assert.equal(a.run(`c.day.options.find(p=>p.setup.type==='${mode}').suitable`),false);
 assert.equal(a.run('c.night'),null);
});
test('night run compares remaining overnight period with no daytime or future-night list',()=>{
 const a=scenario('2026-10-24T03:00Z');a.run('result=runUnifiedPlan(r,e);html=renderPlan(result)');
 assert.equal(a.run('result.comparisons.day'),null);assert.equal(a.run('result.comparisons.night.projected'),false);
 assert.equal(a.run('result.comparisons.night.from'),a.run('+r.start'));
 assert.match(a.run('html'),/Other viable overnight options/);assert.doesNotMatch(a.run('html'),/Other viable daytime|projected overnight options/);
});
test('an absence past 7 AM is covered through return without inventing an overnight stage',()=>{
 const a=scenario();a.run(`r.occupancy='leaving';r.departure=new Date('2026-10-24T02:55Z');r.returnTime=new Date('2026-10-24T13:00Z');r.remote=false;
 e=makeEnvelope(r.start,planBounds(r.start,r).end,'Test',300000);result=runUnifiedPlan(r,e);html=renderPlan(result)`);
 assert.equal(a.run('result.bounds.hasSleep'),false);assert.equal(a.run('result.stages.night'),null);
 assert.match(a.run('html'),/No overnight recommendation/);
});
