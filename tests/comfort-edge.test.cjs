// v6.6.24 (owner decision, November 19, 2026, reassessment option C): the warm, cold and severe-warm runs start
// outside the band edge. v6.6.28 (owner decision, November 20, 2026): the edge is 1°F, and every comfort pass/fail
// check and the 65°F floor carry the same 1°F allowance (hard floor 64°F).
const test=require('node:test');
const assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');

// Drifting passive trial at night (no sun), awake band 68–73°F, dehumidifier off.
function drift(a,outdoor,startF,edge){
    a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=false;state.indoorRH=45;M.comfortRunEdgeF=${edge};
        e={windowStart:new Date('2026-10-24T08:00Z'),windowEnd:new Date('2026-10-24T11:00Z'),wind:0,cloud:0,
            points:[{time:new Date('2026-10-24T08:00Z'),tOut:${outdoor},rh:45,wind:0,cloud:0}]};
        p=zoneProfile('passive',e,false,confirmedSetpoints(false),0,${startF},{initialZones:{temperature:[${startF},${startF}],rh:[45,45]},stopOnFailure:false});`);
    return JSON.parse(a.run(`JSON.stringify({trace:p.trace.map(x=>({t:+x.time,b:x.bedroom})),problem:p.comfortProblem&&{time:+p.comfortProblem.time,reason:p.comfortProblem.reason},floor:p.floorBreach})`));
}
// The run rule applied to the recorded trace (bedroom air, 30-minute grace from the start).
function reference(trace,band,edge){
    const start=trace[0].t;let warm=0,cold=0,severe=0;
    for(let i=1;i<trace.length;i++){
        const dt=(trace[i].t-trace[i-1].t)/60000,elapsed=(trace[i].t-start)/60000,b=trace[i].b;
        if(elapsed<=30)continue;
        warm=b>band.high+edge?warm+dt:0;cold=b<band.low-edge?cold+dt:0;severe=b>band.high+1+edge?severe+dt:0;
        if(cold>30)return{time:trace[i].t,reason:'Remains below '+(band.low-edge)+'°F for more than 30 minutes.'};
        if(warm>30)return{time:trace[i].t,reason:'Remains above '+(band.high+edge)+'°F for more than 30 minutes.'};
        if(severe>=15)return{time:trace[i].t,reason:'Remains above '+(band.high+1+edge)+'°F for at least 15 minutes.'};
    }
    return null;
}
const band={low:68,high:73};

test('the run edge and the comfort allowance are 1°F',()=>{const a=app();assert.equal(a.run('M.comfortRunEdgeF'),1);assert.equal(a.run('M.comfortAllowanceF'),1);});

test('warm runs start 1°F above the band and fail later than at the exact edge',()=>{
    const a=app(),tol=drift(a,80,72.6,1),exact=drift(a,80,72.6,0);
    assert.ok(tol.trace.at(-1).b>75,'the trial must warm well past the tolerance');
    assert.deepEqual(tol.problem,reference(tol.trace,band,1));
    assert.deepEqual(exact.problem,reference(exact.trace,band,0));
    assert.match(tol.problem.reason,/^Remains above 7[45]°F /);
    assert.ok(tol.problem.time>exact.problem.time);
});

test('cold runs start 1°F below the band; the floor is 65°F less the 1°F allowance',()=>{
    const a=app(),tol=drift(a,58,68.4,1),exact=drift(a,58,68.4,0);
    assert.deepEqual(tol.problem,reference(tol.trace,band,1));
    assert.deepEqual(exact.problem,reference(exact.trace,band,0));
    assert.equal(tol.problem.reason,'Remains below 67°F for more than 30 minutes.');
    assert.ok(tol.problem.time>exact.problem.time);
    // Floor: a trial that dips to 64.5°F passes the floor; one that goes below 64°F fails it.
    const deep=drift(a,30,66,1);assert.equal(deep.floor,true);assert.ok(deep.trace.some(p=>p.b<64-1e-6));
});

test('v6.7.0: the allowance and floor are unchanged; the comfort-policy text is no longer shown',()=>{
    const a=app();
    assert.equal(a.run('M.comfortAllowanceF'),1);assert.equal(a.run('M.comfortRunEdgeF'),1);assert.equal(a.run('C.comfortFloor'),65);
    assert.equal(a.run('typeof comfortPolicyText'),'undefined');
});
