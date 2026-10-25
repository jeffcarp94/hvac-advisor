const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {app}=require('./helpers.cjs');
const hash=data=>crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
function decision(result){
 const trial=t=>({suitable:t.suitable,ready:t.ready,failureTime:t.failureTime,score:t.score,comfort:t.comfortReason,moisture:t.moistureReason,unsafe:t.unsafe,trace:t.trace,segments:t.segments});
 const plan=p=>({phases:p.phases,prepareAt:p.prepareAt,suitable:p.suitable,ready:p.ready,reason:p.reason,score:p.score,trials:p.trials.map(trial)});
 return hash({winner:plan(result.winner),plans:result.plans.map(plan),current:result.current&&{setup:result.current.setup,reviewAt:result.current.reviewAt,score:result.current.score,trials:result.current.trials.map(trial)}});
}
test('closed-coach whole-plan selection, ranking, preparation and trajectories are invariant to surface warnings',()=>{
 const a=app();a.ctx.job=require('./fixtures/winterset-2026-03-24.json');
 // Full window/fan search remains covered by browser CI on the same fixture.
 a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;shortlistVents=()=>[];
 r={start:new Date(job.start),reading:new Date(job.start),initial:{temperature:[72,72],rh:[54,52]},occupancy:'staying',remote:false};
 points=job.points.map(p=>({...p,time:new Date(p.time),tOut:Math.round(p.tOut),rh:Math.round(p.rh)}));
 function envelope(){return {windowStart:r.start,windowEnd:new Date(job.end),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,singlePoint:false,points,cloud:points[0].cloud,wind:points[0].wind,precip:points[0].precip};}
 originalSurface=surfaceAssessment;
 function calculate(){return runUnifiedPlan(r,envelope());}
 base=calculate();`);
 assert.equal(a.run('base.winner.suitable&&base.winner.ready'),true);
 assert.equal(a.run('base.winner.trials.length'),9);
 const expected=decision(a.run('base'));
 assert.ok(a.run('base.winner.trials.some(t=>t.condensationConcern)'));
 a.run(`surfaceAssessment=()=>({surface:100,margin:100,surfaceRH:0,condensation:false});quiet=calculate()`);
 assert.equal(decision(a.run('quiet')),expected);
 assert.equal(a.run("surfaceOutlook(quiet.winner.trials)"),'');
 a.run(`surfaceAssessment=()=>({surface:0,margin:-100,surfaceRH:500,condensation:true});loud=calculate()`);
 assert.equal(decision(a.run('loud')),expected);
 assert.match(a.run('surfaceOutlook(loud.winner.trials)'),/advisory only/);
 assert.doesNotMatch(a.run('surfaceOutlook(loud.winner.trials)'),/500%|mold develops/);
});
test('air saturation retains mass/latent bookkeeping and warning without stopping or vetoing',()=>{
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.indoorRH=100;state.dehumidifierEnabled=false;
 e={windowStart:new Date('2026-10-24T03:00Z'),windowEnd:new Date('2026-10-24T03:15Z'),wind:0,cloud:0,points:[{time:new Date('2026-10-24T03:00Z'),tOut:68,rh:100,wind:0,cloud:0}]};
 p=zoneProfile('passive',e,true,confirmedSetpoints(true),0,68,{stopOnFailure:true});`);
 assert.ok(a.run('p.moisture.condensedLb')>0);assert.ok(a.run('p.condensationConcern'));
 assert.equal(a.run('p.suitable'),true);assert.equal(a.run('p.failureTime'),null);
 assert.equal(a.run('+p.trace.at(-1).time'),Date.parse('2026-10-24T03:15Z'));
 assert.equal(a.run('p.trace.every(t=>Number.isFinite(t.dewPoint)&&t.dewPoint<=t.bedroom+1e-6)'),true);
});
test('sustained room-air RH remains a separate rejection when surface warnings are disabled',()=>{
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.indoorRH=85;state.dehumidifierEnabled=false;
 surfaceAssessment=()=>({surface:100,margin:100,surfaceRH:0,condensation:false});
 e={windowStart:new Date('2026-10-24T03:00Z'),windowEnd:new Date('2026-10-24T05:00Z'),wind:0,cloud:0,points:[{time:new Date('2026-10-24T03:00Z'),tOut:68,rh:85,wind:0,cloud:0}]};
 p=zoneProfile('ac',e,true,confirmedSetpoints(true),0,68,{checkEquipment:false,stopOnFailure:true});`);
 assert.equal(a.run('p.moistureEligible'),false);assert.match(a.run('p.moistureReason'),/Indoor RH exceeds 65%/);
 assert.ok(a.run("!p.condensationConcern||p.condensationConcern.source==='air'"));
});

