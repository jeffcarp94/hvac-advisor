// Run from the repository with Node 24.
// Default is a bounded comparison of fixed closed-coach setups. --full uses
// the normal search; --case=<fixture-name> isolates a slow case.
const {app}=require('../tests/helpers.cjs');
const archived=require('../tests/fixtures/winterset-2026-10-23.json');
const full=process.argv.includes('--full');
const only=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
const reportPath=process.argv.find(arg=>arg.startsWith('--verify-report='))?.slice(16);
const prior=reportPath?require('node:fs').readFileSync(reportPath,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
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
    ['rising-synthetic',synthetic('2026-11-12T04:00:00Z',[35,38,40,42,44,46,48,50,52],45,{temperature:[67,66],rh:[45,45]})],
    ...[false,true].map(remote=>['away-return-'+(remote?'wifi':'no-wifi'),{
        ...synthetic('2026-11-12T06:00:00Z',[45,45,45,45,45,45,45],35,{temperature:[68,68],rh:[30,30]}),
        request:{occupancy:'away',remote,departure:'2026-11-12T06:00:00Z',returnTime:'2026-11-12T08:00:00Z',actualConfirmed:true},
        actual:{mode:'hp',heat:67,fan:'Low'},
        expectedError:remote?null:'Currently away requires remote thermostat access and current sensor readings.'
    }])
];
if(only&&!jobs.some(([name])=>name===only))throw new Error('Unknown fixture '+only);
for(const [name,job] of jobs){
    if(only&&name!==only)continue;
    if(reportPath&&!prior.some(result=>result.fixture===name))continue;
    console.error(name+': '+(reportPath?'verifying selected-plan sensitivities':'comparing '+(full?'full searches':'fixed setups')));
    const a=app();
    a.ctx.job=job;a.ctx.full=full;a.ctx.sensitivity=sensitivity;
    const saved=prior.find(result=>result.fixture===name);
    if(reportPath&&!saved)continue;
    if(saved&&!saved.full)throw new Error('Sensitivity replay requires a full-search report.');
    a.run(`
        forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;
        r={occupancy:'staying',...job.request,start:new Date(job.start),reading:new Date(job.start),initial:job.initial||{temperature:[72,72],rh:[54,52]}};
        for(const field of ['departure','returnTime'])if(r[field])r[field]=new Date(r[field]);
        if(job.actual)r.actual=withSetting(planSetup(job.actual.mode,false,null,job.actual.fan),job.actual.heat);
        bounds=planBounds(r.start,r);
        points=job.points.map(p=>({...p,time:new Date(p.time)}));
        e={windowStart:r.start,windowEnd:new Date(job.end),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,
            points,cloud:points[0].cloud,wind:points[0].wind,precip:points[0].precip};
        function capacityMetrics(model,runFull,selectedPhases=null){
            const envelope=model?{...e,capacityComparison:model}:{...e};
            let winner,plans;
            if(selectedPhases){
                plans=[evaluatePlan(selectedPhases,envelope,r)];winner=plans[0];
            }else if(runFull){
                ({winner,plans}=runUnifiedPlan(r,envelope));
            }else{
                const rows=planRows(envelope,r).filter(row=>row.to<=+envelope.windowEnd);
                plans=planSetups(bounds.sleep).map(s=>applyRecoverySetting(s,r,+r.start))
                    .map(setup=>evaluatePlan([{time:+r.start,setup}],envelope,r,rows)).sort(comparePlans);
                winner=plans[0];
            }
            const pass=p=>p.suitable&&p.ready&&p.trials.every(t=>+t.trace.at(-1).time>=+envelope.windowEnd);
            const nominal=winner.trials[0],traces=winner.trials.flatMap(t=>t.trace);
            if(runFull)selectedComparisonPhases=winner.phases;
            const number=x=>Number.isFinite(x)?Number(x.toFixed(3)):null;
            const waterResidual=t=>{const m=t.moisture;return m.initialWaterLb+m.totals.occupants+m.totals.outside-
                m.totals.ac-m.totals.dehumidifier-m.condensedLb-m.finalWaterLb;};
            // Rejected qualification traces can stop early. Keep full-window diagnostics
            // separate so neither truncated minima nor runtimes imply overnight coverage.
            let diagnostics=null,maxHeatResidualBtu=0;
            if(selectedPhases){
                // v6.6.15: the live solver is twoNodeAdvance (air + mass nodes per zone).
                const advance=twoNodeAdvance;
                twoNodeAdvance=(air,massT,storage,ua,incoming,bulk,mix,sourceAir,sourceMass,outside,dt,heatFactor,outdoorFactor=heatFactor)=>{
                    const next=advance(air,massT,storage,ua,incoming,bulk,mix,sourceAir,sourceMass,outside,dt,heatFactor,outdoorFactor);
                    const between=[Math.max(0,-bulk)+mix,Math.max(0,bulk)+mix];
                    for(let z=0;z<2;z++){
                        const stored=storage.air[z]*(next.air[z]-air[z])+storage.mass[z]*(next.mass[z]-massT[z]);
                        const supplied=dt*((ua[z]+outdoorFactor*incoming[z])*(outside-next.air[z])+sourceAir[z]+sourceMass[z]+heatFactor*between[z]*(next.air[1-z]-next.air[z]));
                        maxHeatResidualBtu=Math.max(maxHeatResidualBtu,Math.abs(stored-supplied));
                    }
                    return next;
                };
                try{diagnostics=AIR_SCENARIOS.map(s=>simulatePlan(winner.phases,envelope,r,s,null,null,false,true));}
                finally{twoNodeAdvance=advance;}
            }
            const diagnostic=diagnostics?{
                minimumBedroomF:number(Math.min(...diagnostics.flatMap(t=>t.trace.map(p=>p.bedroom)))),
                nominalFurnaceMinutes:number(diagnostics[0].segments.filter(s=>s.operation==='furnace').reduce((n,s)=>n+s.hours*s.duty*60,0)),
                nominalRecoveryMinutes:diagnostics[0].recoveryMinutes,
                maxHeatResidualBtu,
                complete:diagnostics.every(t=>+t.trace.at(-1).time>=+envelope.windowEnd),
                maxWaterResidualLb:Math.max(...diagnostics.map(t=>Math.abs(waterResidual(t))))
            }:null;
            return {mode:winner.type,qualified:pass(winner),phases:winner.phases.map(p=>({
                utc:new Date(p.time).toISOString(),mode:p.setup.type,heat:p.setup.setpoints.heat,cool:p.setup.setpoints.cool,fan:p.setup.fan,setup:p.setup
            })),minimumBedroomF:number(traces.reduce((minimum,p)=>Math.min(minimum,p.bedroom),Infinity)),nominalRecoveryMinutes:nominal.recoveryMinutes??null,
                nominalFurnaceMinutes:number(nominal.segments.filter(s=>s.operation==='furnace').reduce((sum,s)=>sum+s.hours*s.duty*60,0)),
                alternatives:[...new Set(plans.filter(p=>p!==winner&&pass(p)).flatMap(p=>p.phases.map(x=>x.setup.type)).filter(type=>['furnace','auto','auto_furnace'].includes(type)))],
                executableAlternatives:plans.filter(p=>p!==winner&&pass(p)&&p.phases.some(x=>['furnace','auto','auto_furnace'].includes(x.setup.type)))
                    .map(p=>({phases:p.phases.map(x=>({utc:new Date(x.time).toISOString(),setup:x.setup}))})),
                maxWaterResidualLb:Math.max(...winner.trials.map(t=>Math.abs(waterResidual(t)))),
                clamped:winner.trials.some(t=>t.warnings.some(w=>w.includes('clamped'))),reason:winner.reason||'',...(diagnostic?{diagnostic}:{})};
        }
    `);
    if(job.expectedError){
        let error;try{a.run('validatePlanRequest(r)');}catch(e){error=e.message;}
        if(error!==job.expectedError)throw new Error(name+': unexpected input-gate result '+error);
        console.log(JSON.stringify({fixture:name,full,blocked:true,reason:error,live:{qualified:false,mode:null},experimental:{qualified:false,mode:null}}));continue;
    }
    if(saved){
        a.ctx.saved=saved;
        a.run(`function restoreComparisonPhases(phases){return phases.map(p=>{
            if(!p.setup&&p.mode==='maxxfan')throw new Error('Legacy report omits the ventilation arrangement. Rerun this fixture.');
            const base=planSetup(p.mode,!!(bounds.sleep||bounds.bedtime&&Date.parse(p.utc)>=+bounds.bedtime),null,p.fan);
            const setting=isAutoMode(p.mode)?{heat:p.heat,cool:p.cool}:p.mode==='ac'?p.cool:p.heat;
            const setup=p.setup||withSetting(base,setting);
            return {time:Date.parse(p.utc),setup};
        });}selectedComparisonPhases=restoreComparisonPhases(saved.experimental.phases);`);
        const replay=a.run('capacityMetrics({},false,selectedComparisonPhases)');
        for(const field of ['qualified','minimumBedroomF','nominalFurnaceMinutes']){
            if(replay[field]!==saved.experimental[field])throw new Error(name+': replay differs in '+field);
        }
        saved.selectedPlanSensitivity=a.run('sensitivity.map(([label,settings])=>[label,capacityMetrics(settings,false,selectedComparisonPhases)])');
        if(saved.live.phases.every(p=>p.setup||p.mode!=='maxxfan')){
            saved.liveDiagnostic=a.run('capacityMetrics(null,false,restoreComparisonPhases(saved.live.phases)).diagnostic');
        }else saved.liveDiagnosticUnavailable='Legacy report omitted the physical ventilation arrangement.';
        saved.verifiedNominalReplay=true;
        if(saved.experimental.qualified){
            saved.sameTransitionAlternatives=a.run(`['furnace','auto_furnace','auto'].flatMap(type=>(type==='furnace'?['Auto']:['Low','Medium','High']).map(fan=>{
                const previous=selectedComparisonPhases.at(-1).setup;
                const setting=isAutoMode(type)?{heat:previous.setpoints.heat,cool:previous.setpoints.cool}:previous.setpoints.heat;
                const replacement=withSetting(planSetup(type,true,null,fan),setting);
                const phases=selectedComparisonPhases.map((p,i)=>i===selectedComparisonPhases.length-1?{...p,setup:replacement}:p);
                const metrics=capacityMetrics({},false,phases);
                return {type,fan,qualified:metrics.qualified,reason:metrics.reason,phases:metrics.phases};
            }))`);
        }
        console.log(JSON.stringify(saved));continue;
    }
    const results={fixture:name,full,live:a.run('capacityMetrics(null,full)')};
    console.error(name+': current search complete');
    results.experimental=a.run('capacityMetrics(sensitivity[0][1],full)');
    if(full)results.selectedPlanSensitivity=a.run('sensitivity.map(([label,settings])=>[label,capacityMetrics(settings,false,selectedComparisonPhases)])');
    results.fixedSensitivity=a.run('sensitivity.map(([label,settings])=>[label,capacityMetrics(settings,false)])');
    console.log(JSON.stringify(results));
}
