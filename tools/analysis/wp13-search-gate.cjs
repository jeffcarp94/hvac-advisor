// WP13 Search release gate and before/after runner (v6.6.21). Usage: node wp13-search-gate.cjs <repo> <fixture> [heading]
// MODE: nine (live nine-case policy, ENSEMBLE off) | exhaustive (every member of every plan) | auto (exact pruning;
// every plan that could qualify is evaluated in all members; the gate reference) | bounded (auto with the shortlist
// forced on: budget 0). EXACT=on|off overrides ENSEMBLE.exactFallback. GCSAMPLE=n forces a GC every n simulations
// and reports the peak live heap (run with --expose-gc). HTMLDIR=dir saves the rendered plan.
// Prints one JSON line: decision, D3 summary, simulated hours, the rendered plan's hash before and after the
// Worker trimming (htmlTrimmedSame), and the posted result size (structured clone, MB). Phase times are UTC.
const repo=process.argv[2],only=process.argv[3],heading=process.argv[4]||null;
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
const job=jobs[only];if(!job)throw new Error('unknown fixture '+only);
const mode=process.env.MODE||'auto';
const a=app();a.ctx.job=job;
let peakLive=0;const gcEvery=+process.env.GCSAMPLE||0;let n=0;
if(gcEvery)a.ctx.__tick=()=>{if(++n%gcEvery===0){global.gc();peakLive=Math.max(peakLive,process.memoryUsage().heapUsed);}};
if(gcEvery)a.run(`(()=>{const orig=simulatePlan;simulatePlan=function(...x){const r=orig.apply(this,x);__tick();return r;};})()`);
const t0=performance.now();let out;
try{
a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=${process.env.DEHUM!=='off'};
 r={occupancy:'staying',...job.request,start:new Date(job.start),reading:new Date(job.start),initial:job.initial||{temperature:[72,72],rh:[54,52]}};
 for(const field of ['departure','returnTime'])if(r[field])r[field]=new Date(r[field]);
 if(job.actual)r.actual=withSetting(planSetup(job.actual.mode,false,null,job.actual.fan),job.actual.heat);
 points=job.points.map(p=>({...p,time:new Date(p.time)}));
 e={windowStart:r.start,windowEnd:new Date(job.end),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,points,cloud:points[0].cloud,wind:points[0].wind,precip:points[0].precip};
 ${heading?`e.site={heading:'${heading}',confirmed:true,cover:{}};`:''}
 ENSEMBLE.enabled=${mode!=='nine'};
 if('search' in ENSEMBLE){ENSEMBLE.search=${JSON.stringify(mode==='exhaustive'?'exhaustive':'auto')};ENSEMBLE.budgetHours=${mode==='bounded'?0:'Infinity'};${process.env.EXACT?`ENSEMBLE.exactFallback=${process.env.EXACT==='on'};`:''}}
 SEARCH_WORK=0;res=runUnifiedPlan(r,e);w=res.winner;work=SEARCH_WORK;`);
const seconds=(performance.now()-t0)/1000;
const summary=JSON.parse(a.run(`JSON.stringify({q:!!(w.suitable&&w.ready),phases:w.phases.map(p=>new Date(p.time).toISOString().slice(11,16)+' '+p.setup.type+(p.setup.type==='passive'?'':' '+(['auto','auto_furnace'].includes(p.setup.type)?p.setup.setpoints.heat+'/'+p.setup.setpoints.cool:p.setup.type==='ac'?p.setup.setpoints.cool:p.setup.type==='maxxfan'?p.setup.setpoints.fan:p.setup.setpoints.heat))+' '+p.setup.fan),
 bed:Math.min(...w.trials.flatMap(t=>t.trace.map(p=>p.bedroom))).toFixed(1)+'-'+Math.max(...w.trials.flatMap(t=>t.trace.map(p=>p.bedroom))).toFixed(1),reason:(w.reason||'').slice(0,70),
 current:res.current?setupName(res.current.setup)+' '+JSON.stringify(res.current.setup.setpoints)+' '+res.current.setup.fan:null,
 ensemble:w.ensemble?{passes:w.ensemble.passes,evaluated:w.ensemble.evaluated,admitted:w.ensemble.admitted,mean:+w.ensemble.severity.mean.toFixed(2),worst3:+w.ensemble.severity.worst3.toFixed(2)}:null,
 winnerPhases:w.phases.map(p=>({time:p.time,setup:p.setup})),counters:typeof ENSEMBLE_SEARCH!=='undefined'?{pruned:ENSEMBLE_SEARCH.pruned,completions:ENSEMBLE_SEARCH.completions,shortlists:ENSEMBLE_SEARCH.shortlists,cut:ENSEMBLE_SEARCH.cut}:null,work:Math.round(work)})`));
// Render before and after the Worker trimming; both must match.
const html1=a.run(`renderPlan(res)`);
a.run(`res=typeof trimPlanResult==='function'?trimPlanResult(res):(()=>{delete res.envelope.planCache;const grouped=new Map();for(const p of res.plans)if(!grouped.has(p.type))grouped.set(p.type,p);res.plans=[...new Set([res.winner,...grouped.values()])];for(const p of res.plans)for(const t of p.trials){delete t.checkpoints;if(p!==res.winner){t.trace=[];t.segments=[];}}return res;})()`);
const posted=v8.serialize(a.ctx.res).length;
a.ctx.res=v8.deserialize(v8.serialize(a.ctx.res));
const html2=a.run(`renderPlan(res)`);
const h=x=>crypto.createHash('sha1').update(x).digest('hex').slice(0,12);
const core=x=>x.replace(/<p class="hint" data-search="[a-z]+">[^<]*<\/p>/,'');
out={fixture:only,...(heading?{heading}:{}),mode,exact:process.env.EXACT||null,s:+seconds.toFixed(1),...summary,html:h(html1),htmlCore:h(core(html1)),htmlTrimmedSame:html1===html2,postedMB:+(posted/1e6).toFixed(2),peakLiveMB:gcEvery?Math.round(peakLive/1e6):null};
}catch(err){
 if(!heading&&/confirm the coach heading/.test(err.message)){out={fixture:only,needsHeading:true};}
 else out={fixture:only,...(heading?{heading}:{}),mode,error:err.message.slice(0,140)};
}
console.log(JSON.stringify(out));
if(process.env.HTMLDIR&&out.html){require('fs').writeFileSync(process.env.HTMLDIR+'/'+only+(heading?'-'+heading:'')+'-'+mode+'.html',a.run('renderPlan(res)'));}
