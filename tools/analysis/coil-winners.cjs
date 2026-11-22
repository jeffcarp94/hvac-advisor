// v6.7.1 analysis: coil-ice advisory (wp7CoilCheck, live cycle model, 32 conditions) on each winner in a
// wp13-search-gate.cjs JSONL report. Usage: node coil-winners.cjs <repo> <gate-report.jsonl>
// WP13 Search release gate and before/after runner (v6.6.21). Usage: node wp13-search-gate.cjs <repo> <fixture> [heading]
// MODE: nine (live nine-case policy, ENSEMBLE off) | exhaustive (every member of every plan) | auto (exact pruning;
// every plan that could qualify is evaluated in all members; the gate reference) | bounded (auto with the shortlist
// forced on: budget 0). EXACT=on|off overrides ENSEMBLE.exactFallback. GCSAMPLE=n forces a GC every n simulations
// and reports the peak live heap (run with --expose-gc). HTMLDIR=dir saves the rendered plan.
// Prints one JSON line: decision, D3 summary, simulated hours, the rendered plan's hash before and after the
// Worker trimming (htmlTrimmedSame), and the posted result size (structured clone, MB). Phase times are UTC.
const repo=process.argv[2];
const path=require('path'),v8=require('v8'),crypto=require('crypto');
const {app}=require(repo+'/tests/helpers.cjs');const {performance}=require('perf_hooks');
const archived=require(path.resolve(repo,'tests/fixtures/winterset-2026-10-23.json'));
const fx=n=>require(path.resolve(repo,'tests/fixtures',n));
function synthetic(start,temperatures,rh,initial){const time=Date.parse(start),end=new Date(time+temperatures.length*3600000).toISOString();
 return {start,end,initial,points:temperatures.map((tOut,i)=>({time:new Date(time+i*3600000).toISOString(),tOut,rh,cloud:1,wind:4,precip:'none'}))};}
const jobs=Object.fromEntries([
 ['march-historical',fx('winterset-2026-03-24.json')],
 ...fx('winterset-planning-regressions.json').map(job=>['winterset-'+job.date,job]),
 ['october-saved',{start:archived.request.start,end:archived.envelope.windowEnd,initial:archived.request.initial,points:archived.envelope.points}],
 ['surface-synthetic',fx('synthetic-surface-advisory.cjs')],
 ['preparation-synthetic',fx('synthetic-bedtime-preparation.cjs')],
 ['hot-synthetic',synthetic('2026-07-18T18:00:00Z',[95,98,100,99,96,90,84,79,75,73,72,71,70,69,68,67,66,65],50,{temperature:[78,80],rh:[54,52]})],
 ['falling-synthetic',synthetic('2026-11-12T04:00:00Z',[49,46,44,42,40,38,36,35,34],45,{temperature:[67,66],rh:[45,45]})],
 ['rising-synthetic',synthetic('2026-11-12T04:00:00Z',[35,38,40,42,44,46,48,50,52],45,{temperature:[67,66],rh:[45,45]})],
 ...[false,true].map(remote=>['away-return-'+(remote?'wifi':'no-wifi'),{...synthetic('2026-11-12T06:00:00Z',[45,45,45,45,45,45,45],35,{temperature:[68,68],rh:[30,30]}),
   request:{occupancy:'away',remote,departure:'2026-11-12T06:00:00Z',returnTime:'2026-11-12T08:00:00Z',actualConfirmed:true},actual:{mode:'hp',heat:67,fan:'Low'}}])]);

// Analysis only: coil advisory (live cycle model) on each gate winner's phases; 32 conditions (ENSEMBLE on).
const results=require('fs').readFileSync(process.argv[3],'utf8').trim().split('\n').map(JSON.parse);
for(const g of results){
 const job=jobs[g.fixture],heading=g.heading||null;const a=app();a.ctx.job=job;a.ctx.ph=g.winnerPhases;
 a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;ENSEMBLE.enabled=true;
 r={occupancy:'staying',...job.request,start:new Date(job.start),reading:new Date(job.start),initial:job.initial||{temperature:[72,72],rh:[54,52]}};
 for(const field of ['departure','returnTime'])if(r[field])r[field]=new Date(r[field]);
 if(job.actual)r.actual=withSetting(planSetup(job.actual.mode,false,null,job.actual.fan),job.actual.heat);
 points=job.points.map(p=>({...p,time:new Date(p.time)}));
 e={windowStart:r.start,windowEnd:new Date(job.end),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,points,cloud:points[0].cloud,wind:points[0].wind,precip:points[0].precip};
 ${heading?`e.site={heading:'${heading}',confirmed:true,cover:{}};`:''}
 configureSolarScenarios(e);configureEnsemble(e,r);phases=ph;rows=planRows(e,r,.5,phases.map(p=>p.time));t0=simulatePlan(phases,e,r,AIR_SCENARIOS[0],rows);
 c=wp7CoilCheck({phases,trials:[t0]},e,r);`);
 console.log(JSON.stringify({fixture:g.fixture,heading:g.heading,phases:g.phases,coil:JSON.parse(a.run('JSON.stringify(c&&{cases:c.cases,cooling:c.cooling,flagged:c.flagged,staged:c.stagedFlagged,minSurfaceF:c.minSurfaceF&&+c.minSurfaceF.toFixed(1),peakFrostMm:+c.peakFrostMm.toFixed(3),frostCases:c.frostCases})'))}));
}
