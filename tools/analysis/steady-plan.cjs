// Usage: node tools/analysis/steady-plan.cjs <repo> <outdoor F>. Full planner on a synthetic steady night (2 occupants, 9:50 PM CDT start, 68F).
const repo=process.argv[2],temp=+(process.argv[3]||45);const {app}=require(repo+'/tests/helpers.cjs');const {performance}=require('perf_hooks');
const a=app();a.ctx.structuredClone=structuredClone;const t=performance.now();
a.run(`forecast.timeZone='America/Chicago';state.temp=58;state.rh=25;state.wind=2;state.cloud=1;
 r={start:new Date('2026-10-24T02:50Z'),reading:new Date('2026-10-24T02:50Z'),initial:{temperature:[68,68],rh:[30,30]},occupancy:'staying',remote:false};
 e=makeEnvelope(r.start,planBounds(r.start).end,'Reconstructed steady night',300000);e.points.forEach(p=>p.tOut=${temp});result=runUnifiedPlan(r,e);html=renderPlan(result);`);
console.log(temp+'F',((performance.now()-t)/1000).toFixed(0)+'s','qualified',a.run('!!(result.winner&&result.winner.suitable&&result.winner.ready)'));
console.log(a.run('JSON.stringify(result.winner.phases.map(p=>[new Date(p.time).toISOString().slice(11,16),p.setup.type,p.setup.setpoints,p.setup.fan,p.setup.config?.gaps?.join("")]))'));
console.log('reason',a.run('result.winner.reason'));
console.log(a.run(`result.winner.trials.map(t=>Math.min(...t.trace.map(x=>x.bedroom)).toFixed(1)+'..'+Math.max(...t.trace.map(x=>x.bedroom)).toFixed(1)).join(' | ')`));
