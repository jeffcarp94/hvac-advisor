// v6.6.24 (owner decision, November 19, 2026, reassessment option C): the warm, cold and severe-warm runs start
// 0.5°F outside the band edge; the 65°F floor and the exact band elsewhere are unchanged.
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

test('the run edge tolerance is 0.5°F',()=>{assert.equal(app().run('M.comfortRunEdgeF'),.5);});

test('warm runs start 0.5°F above the band and fail later than at the exact edge',()=>{
    const a=app(),tol=drift(a,78,72.6,.5),exact=drift(a,78,72.6,0);
    assert.ok(tol.trace.at(-1).b>74,'the trial must warm well past the tolerance');
    assert.deepEqual(tol.problem,reference(tol.trace,band,.5));
    assert.deepEqual(exact.problem,reference(exact.trace,band,0));
    assert.equal(tol.problem.reason,'Remains above 73.5°F for more than 30 minutes.');
    assert.ok(tol.problem.time>exact.problem.time);
});

test('cold runs start 0.5°F below the band; the 65°F floor is unchanged',()=>{
    const a=app(),tol=drift(a,60,68.4,.5),exact=drift(a,60,68.4,0);
    assert.deepEqual(tol.problem,reference(tol.trace,band,.5));
    assert.deepEqual(exact.problem,reference(exact.trace,band,0));
    assert.equal(tol.problem.reason,'Remains below 67.5°F for more than 30 minutes.');
    assert.ok(tol.problem.time>exact.problem.time);
    // Floor: a trial that reaches 65°F fails it at the same time with or without the tolerance.
    const deep=drift(a,35,66,.5),deepExact=drift(a,35,66,0);
    assert.equal(deep.floor,true);assert.equal(deepExact.floor,true);
    const below=x=>x.trace.find(p=>p.b<65-1e-6).t;assert.equal(below(deep),below(deepExact));
});

test('the comfort policy text states the tolerance and the hard floor',()=>{
    const text=app().run('comfortPolicyText()');
    assert.match(text,/more than 0\.5°F outside the allowed range for over 30 minutes, or more than 1\.5°F above it for 15 minutes; 65°F remains a hard floor/);
});
