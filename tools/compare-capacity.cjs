// Run from the repository with Node 24.
// Default is a bounded comparison of fixed closed-coach setups. --full uses
// the normal search; --case=<fixture-name> isolates a slow case.
const {app}=require('../tests/helpers.cjs');
const archived=require('../tests/fixtures/winterset-2026-10-23.json');
const full=process.argv.includes('--full');
const only=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
const nominal={};
const sensitivity=[
    ['nominal',nominal],
    ['heating −15%',{heatScale:.85}],
    ['heating +25%',{heatScale:1.25}],
    ['low airflow / high leaving RH',{highCfm:200,leavingRH:98,lowFraction:.55,mediumFraction:.75}],
    ['high airflow / low leaving RH',{highCfm:290,leavingRH:90,lowFraction:.8,mediumFraction:.90,roofHeatF:10}],
    ...[-3,3].flatMap(deltaF=>[0,5].flatMap(hysteresisF=>['hp','furnace'].map(startHeatSource=>[
        `changeover ${deltaF}/${hysteresisF}/${startHeatSource}`,{deltaF,hysteresisF,startHeatSource}
    ])))
];
function synthetic(start,temperatures,rh,initial){
    const time=Date.parse(start),end=new Date(time+temperatures.length*3600000).toISOString();
    return {start,end,initial,points:temperatures.map((tOut,i)=>({
        time:new Date(time+i*3600000).toISOString(),tOut,rh,cloud:1,wind:4,precip:'none'
    }))};
}
const jobs=[
    ['march-historical',require('../tests/fixtures/winterset-2026-03-24.json')],
    ...require('../tests/fixtures/winterset-planning-regressions.json').map(job=>['winterset-'+job.date,job]),
    ['october-saved',{start:archived.request.start,end:archived.envelope.windowEnd,
        initial:archived.request.initial,points:archived.envelope.points}],
    ['surface-synthetic',require('../tests/fixtures/synthetic-surface-advisory.cjs')],
    ['preparation-synthetic',require('../tests/fixtures/synthetic-bedtime-preparation.cjs')],
    ['hot-synthetic',synthetic('2026-07-18T18:00:00Z',[95,98,100,99,96,90,84,79,75,73,72,71,70,69,68,67,66,65],50,{temperature:[78,80],rh:[54,52]})],
    ['falling-synthetic',synthetic('2026-11-12T04:00:00Z',[49,46,44,42,40,38,36,35,34],45,{temperature:[67,66],rh:[45,45]})],
    ['rising-synthetic',synthetic('2026-11-12T04:00:00Z',[35,38,40,42,44,46,48,50,52],45,{temperature:[67,66],rh:[45,45]})]
];
if(only&&!jobs.some(([name])=>name===only))throw new Error('Unknown fixture '+only);
for(const [name,job] of jobs){
    if(only&&name!==only)continue;
    const a=app();
    a.ctx.job=job;a.ctx.full=full;a.ctx.sensitivity=sensitivity;
    a.run(`
        forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;
        r={start:new Date(job.start),reading:new Date(job.start),initial:job.initial||{temperature:[72,72],rh:[54,52]},occupancy:'staying'};
        bounds=planBounds(r.start,r);
        points=job.points.map(p=>({...p,time:new Date(p.time)}));
        e={windowStart:r.start,windowEnd:new Date(job.end),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,
            points,cloud:points[0].cloud,wind:points[0].wind,precip:points[0].precip};
        function capacityMetrics(model,runFull){
            const envelope=model?{...e,capacityComparison:model}:{...e};
            let winner,plans;
            if(runFull){
                ({winner,plans}=runUnifiedPlan(r,envelope));
            }else{
                const rows=planRows(envelope,r).filter(row=>row.to<=+envelope.windowEnd);
                plans=planSetups(bounds.sleep).map(s=>applyRecoverySetting(s,r,+r.start))
                    .map(setup=>evaluatePlan([{time:+r.start,setup}],envelope,r,rows)).sort(comparePlans);
                winner=plans[0];
            }
            const pass=p=>p.suitable&&p.ready&&p.trials.every(t=>+t.trace.at(-1).time>=+envelope.windowEnd);
            const nominal=winner.trials[0],traces=winner.trials.flatMap(t=>t.trace);
            const number=x=>Number.isFinite(x)?Number(x.toFixed(3)):null;
            const waterResidual=t=>{const m=t.moisture;return m.initialWaterLb+m.totals.occupants+m.totals.outside-
                m.totals.ac-m.totals.dehumidifier-m.condensedLb-m.finalWaterLb;};
            return {mode:winner.type,qualified:pass(winner),phases:winner.phases.map(p=>({
                utc:new Date(p.time).toISOString(),mode:p.setup.type,heat:p.setup.setpoints.heat,cool:p.setup.setpoints.cool,fan:p.setup.fan
            })),minimumBedroomF:number(traces.reduce((minimum,p)=>Math.min(minimum,p.bedroom),Infinity)),nominalRecoveryMinutes:nominal.recoveryInfo?.minutes??null,
                nominalFurnaceMinutes:number(nominal.segments.filter(s=>s.operation==='furnace').reduce((sum,s)=>sum+s.hours*s.duty*60,0)),
                alternatives:[...new Set(plans.filter(p=>p!==winner&&pass(p)&&['furnace','auto','auto_furnace'].includes(p.type)).map(p=>p.type))],
                maxWaterResidualLb:Math.max(...winner.trials.map(t=>Math.abs(waterResidual(t)))),
                clamped:winner.trials.some(t=>t.warnings.some(w=>w.includes('clamped'))),reason:winner.reason||''};
        }
    `);
    const results={fixture:name,full,live:a.run('capacityMetrics(null,full)')};
    results.experimental=a.run('capacityMetrics(sensitivity[0][1],full)');
    results.fixedSensitivity=a.run('sensitivity.map(([label,settings])=>[label,capacityMetrics(settings,false)])');
    console.log(JSON.stringify(results));
}
