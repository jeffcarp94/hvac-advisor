// Before/after fixture runner (live model only). Usage: node fixtures-beforeafter.cjs <repo> [fixture]
// v6.6.19 (WP9): DEHUM=off runs every fixture with the dehumidifier disabled (default: enabled), so both
// dehumidifier states can be reviewed. Output also reports the plan's maximum room RH and longest >65% run.
const repo=process.argv[2],only=process.argv[3];const path=require('path');
const {app}=require(repo+'/tests/helpers.cjs');const {performance}=require('perf_hooks');
const archived=require(path.resolve(repo,'tests/fixtures/winterset-2026-10-23.json'));
const fx=n=>require(path.resolve(repo,'tests/fixtures',n));
function synthetic(start,temperatures,rh,initial){
    const time=Date.parse(start),end=new Date(time+temperatures.length*3600000).toISOString();
    return {start,end,initial,points:temperatures.map((tOut,i)=>({
        time:new Date(time+i*3600000).toISOString(),tOut,rh,cloud:1,wind:4,precip:'none'
    }))};
}
const jobs=[
    ['march-historical',fx('winterset-2026-03-24.json')],
    ...fx('winterset-planning-regressions.json').map(job=>['winterset-'+job.date,job]),
    ['october-saved',{start:archived.request.start,end:archived.envelope.windowEnd,
        initial:archived.request.initial,points:archived.envelope.points}],
    ['surface-synthetic',fx('synthetic-surface-advisory.cjs')],
    ['preparation-synthetic',fx('synthetic-bedtime-preparation.cjs')],
    ['hot-synthetic',synthetic('2026-07-18T18:00:00Z',[95,98,100,99,96,90,84,79,75,73,72,71,70,69,68,67,66,65],50,{temperature:[78,80],rh:[54,52]})],
    ['falling-synthetic',synthetic('2026-11-12T04:00:00Z',[49,46,44,42,40,38,36,35,34],45,{temperature:[67,66],rh:[45,45]})],
    ['rising-synthetic',synthetic('2026-11-12T04:00:00Z',[35,38,40,42,44,46,48,50,52],45,{temperature:[67,66],rh:[45,45]})],
    ...[false,true].map(remote=>['away-return-'+(remote?'wifi':'no-wifi'),{
        ...synthetic('2026-11-12T06:00:00Z',[45,45,45,45,45,45,45],35,{temperature:[68,68],rh:[30,30]}),
        request:{occupancy:'away',remote,departure:'2026-11-12T06:00:00Z',returnTime:'2026-11-12T08:00:00Z',actualConfirmed:true},
        actual:{mode:'hp',heat:67,fan:'Low'},
        expectedError:remote?null:'Currently away requires remote thermostat access and current sensor readings.'
    }])
];

// v6.6.18 (WP8, owner decision B): a plan window with daylight needs a confirmed heading. Archived and
// synthetic fixtures have none, so a sunlit fixture is run at each cardinal heading (labeled assumption).
const runs=[];
for(const [name,job] of jobs)runs.push([name,job,null]);
const HEADINGS=['N','E','S','W'];
for(let i=0;i<runs.length;i++){
 const [name,job,heading]=runs[i];
 if(only&&name!==only)continue;
 const a=app();a.ctx.job=job;a.ctx.structuredClone=structuredClone;const t0=performance.now();
 try{a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=${process.env.DEHUM!=='off'};
  r={occupancy:'staying',...job.request,start:new Date(job.start),reading:new Date(job.start),initial:job.initial||{temperature:[72,72],rh:[54,52]}};
  for(const field of ['departure','returnTime'])if(r[field])r[field]=new Date(r[field]);
  if(job.actual)r.actual=withSetting(planSetup(job.actual.mode,false,null,job.actual.fan),job.actual.heat);
  points=job.points.map(p=>({...p,time:new Date(p.time)}));
  e={windowStart:r.start,windowEnd:new Date(job.end),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,points,cloud:points[0].cloud,wind:points[0].wind,precip:points[0].precip};
  ${heading?`e.site={heading:'${heading}',confirmed:true,cover:{}};`:''}
  res=runUnifiedPlan(r,e);w=res.winner;`);
  const out=JSON.parse(a.run(`JSON.stringify({q:!!(w.suitable&&w.ready&&w.trials.every(t=>+t.trace.at(-1).time>=+e.windowEnd)),
   phases:w.phases.map(p=>new Date(p.time).toISOString().slice(11,16)+' '+p.setup.type+(p.setup.type==='passive'?'':' '+(['auto','auto_furnace'].includes(p.setup.type)?p.setup.setpoints.heat+'/'+p.setup.setpoints.cool:p.setup.type==='ac'?p.setup.setpoints.cool:p.setup.type==='maxxfan'?p.setup.setpoints.fan:p.setup.setpoints.heat))+' '+p.setup.fan),
   bed:Math.min(...w.trials.flatMap(t=>t.trace.map(p=>p.bedroom))).toFixed(1)+'-'+Math.max(...w.trials.flatMap(t=>t.trace.map(p=>p.bedroom))).toFixed(1),
   reason:(w.reason||'').slice(0,70),remote:res.stages?.remoteAction?new Date(res.stages.remoteAction.time).toISOString().slice(11,16)+' '+res.stages.remoteAction.setup.type:null,bounded:!!res.stages?.boundedSearch,
   rh:Math.round(Math.max(...w.trials.map(t=>t.moisture?.maxRH??0)))+'% max, '+Math.round(Math.max(...w.trials.map(t=>t.moisture?.humidMax??0)))+' min >65%',
   failing:Object.fromEntries(['equipment','moisture','comfort'].map(k=>[k,w.trials.filter(t=>t[k+'Reason']).length])),
   coil:typeof res.coilAdvisory==='undefined'?'n/a':res.coilAdvisory?{flagged:res.coilAdvisory.check.flagged,cases:res.coilAdvisory.check.cases,staged:res.coilAdvisory.check.stagedFlagged,alternative:!!res.coilAdvisory.alternative}:null})`));
  console.log(JSON.stringify({fixture:name,...(heading?{heading}:{}),dehum:process.env.DEHUM!=='off',s:+((performance.now()-t0)/1000).toFixed(0),...out}));
 }catch(err){
  if(!heading&&/confirm the coach heading/.test(err.message)){for(const h of HEADINGS)runs.splice(i+1+HEADINGS.indexOf(h),0,[name,job,h]);continue;}
  console.log(JSON.stringify({fixture:name,...(heading?{heading}:{}),error:err.message.slice(0,120)}));}
}
