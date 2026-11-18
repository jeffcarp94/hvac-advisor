// Usage: node tools/analysis/gulf-shores-matrix.cjs <repo> [--json]
// WP7 Gulf Shores validation matrix (RECONSTRUCTED; validation, not calibration).
// Weather: KJKA (Jack Edwards National Airport) hourly ASOS, March 3–5, 2025, local CST, from the
// Iowa Environmental Mesonet, supplied by the owner (tests/fixtures/kjka-asos-2025-03-03-05.csv).
// Owner event (field observation): COOL 72°F, coach unattended morning to late afternoon; on return
// about 78°F inside and the coil frozen. Exact date, fan setting and dehumidifier state are unknown,
// so every combination below is run on each of the three dates.
// Labeled assumptions: away 09:00–17:00 local with zero occupants; closed coach; starting interior
// 72°F and 55% RH in both zones at 09:00; heading Unknown and tree cover None (neither is used by the
// solar model before WP8); sky cover from the highest reported cloud layer (CLR 0, FEW 19, SCT 44,
// BKN 75, OVC 100%); wind kt → mph; routine :5x observations rounded to the hour; missing
// observations hold the previous hour.
const repo=process.argv[2],json=process.argv.includes('--json');
const fs=require('fs'),path=require('path');const {app}=require(repo+'/tests/helpers.cjs');
const csv=fs.readFileSync(path.join(repo,'tests/fixtures/kjka-asos-2025-03-03-05.csv'),'utf8').trim().split('\n');
const head=csv[0].split(','),col=n=>head.indexOf(n);
const cover={CLR:0,SKC:0,FEW:19,SCT:44,BKN:75,OVC:100,VV:100};
const obs=[];let missing=0;
for(const line of csv.slice(1)){
    const f=line.split(','),num=k=>{const v=f[col(k)];return v==='M'||v===undefined?null:+v;};
    const local=f[col('valid')];const utc=Date.parse(local.replace(' ','T')+':00-06:00');
    const sky=Math.max(0,...['skyc1','skyc2','skyc3','skyc4'].map(k=>cover[f[col(k)]]??0));
    const tOut=num('tmpf'),rh=num('relh'),kt=num('sknt');
    if(+local.slice(14,16)<50)continue; // routine hourly METARs only (skips the 05:15 special)
    if(tOut==null||rh==null){missing++;continue;}
    obs.push({utc,local,tOut,rh,dewF:num('dwpf'),wind:kt==null?0:kt*1.150779,sky});
}
const fans=['Auto','Low','Medium','High'],out=[];
for(const day of ['2025-03-03','2025-03-04','2025-03-05']){
    const start=Date.parse(day+'T09:00:00-06:00'),ret=Date.parse(day+'T17:00:00-06:00');
    const points=obs.filter(o=>o.utc>=start-2*3600000&&o.utc<=ret+3600000)
        .map(o=>({time:new Date(Math.round(o.utc/3600000)*3600000),tOut:o.tOut,rh:o.rh,wind:o.wind,cloud:1-o.sky/100,sky:o.sky,precip:'none'}));
    for(const dehum of [true,false]){
        const a=app();a.ctx.structuredClone=structuredClone;a.setNow(new Date(start).toISOString());a.ctx.pts=points;
        a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=${dehum};
         pts=pts.map(p=>({...p,time:new Date(p.time)}));
         e={windowStart:new Date(${start}),windowEnd:new Date(${ret+3600000}),timeZone:'America/Chicago',lat:30.2905,lon:-87.6718,elevationM:5,singlePoint:false,
            points:pts,cloud:pts[0].cloud,wind:pts[0].wind,precip:'none'};
         // v6.6.18 (WP8): heading is now used; Unknown in the event, so a labeled assumed heading (HEADING env, default S).
         e.site={heading:'${process.env.HEADING||'S'}',confirmed:true,cover:{}};
         base={start:new Date(${start}),reading:new Date(${start}),initial:{temperature:[72,72],rh:[55,55]},remote:false};
         away={...base,occupancy:'leaving',departure:new Date(${start}),returnTime:new Date(${ret})};
         occupied={...base,occupancy:'staying'};
         rows=planRows(e,away,.5,[${ret}]).filter(r=>r.to<=${ret});`);
        for(const fan of fans){
            for(const [label,req] of [['away (0 occupants)','away'],['occupied sensitivity (2 occupants)','occupied']]){
                a.run(`setup=withSetting(planSetup('ac',false,null,'${fan}'),72);
                 trials=AIR_SCENARIOS.map(s=>simulatePlan([{time:${start},setup}],{...e,coilAdvisory:true},${req},s,planRows(e,${req},.5,[${ret}]).filter(r=>r.to<=${ret}),null,false,true));`);
                const r=JSON.parse(a.run(`JSON.stringify((()=>{const n=trials[0];
                  const hourly=n.trace.filter(p=>((+p.time-${start})%3600000)===0).map(p=>({local:new Date(+p.time-6*3600000).toISOString().slice(11,16),
                    bed:+p.bedroom.toFixed(1),front:+p.midCoach.toFixed(1),bedRH:+p.rh.toFixed(0),frontRH:+(p.midRH??p.rh).toFixed(0)}));
                  return{currentCheck:n.unsafe.length?n.unsafe[0].reason:'accepted',currentCheckCases:trials.filter(t=>!t.unsafe.length).length,
                    physicsFlaggedCases:trials.filter(t=>t.coil?.flagMinutes>0).length,stagedFlaggedCases:trials.filter(t=>t.coil?.stagedFlagMinutes>0).length,
                    nominal:{compressorMin:+n.coolMinutes.toFixed(0),flagMin:+(n.coil?.flagMinutes??0).toFixed(0),minColdestF:n.coil?.minColdestF==null?null:+n.coil.minColdestF.toFixed(1),
                      firstFlag:n.coil?.first?{local:new Date(n.coil.first.time-6*3600000).toISOString().slice(11,16),coldestF:+n.coil.first.coldestF.toFixed(1),returnF:+n.coil.first.returnF.toFixed(1),dewF:+n.coil.first.indoorDewPointF.toFixed(1)}:null,
                      moistureLb:{...Object.fromEntries(Object.entries(n.moisture?.totals||{}).map(([k,v])=>[k,+v.toFixed(2)])),airStart:+(n.moisture?.initialWaterLb??0).toFixed(3),airEnd:+(n.moisture?.finalWaterLb??0).toFixed(3)},dehumMin:+(n.dehumRuntimeMinutes??0).toFixed(0),hourly}};})())`));
                out.push({day,dehum,fan,occupancy:label,...r});
            }
        }
        // What the full planner recommends for the away plan (its own setup choice).
        let planner;
        try{a.run(`res=runUnifiedPlan(away,e);`);
            planner=JSON.parse(a.run(`JSON.stringify({qualified:!!(res.winner.suitable&&res.winner.ready),reason:res.winner.reason||'',
              setup:(res.stages?.departure?.recommended||res.winner).setup?{type:(res.stages?.departure?.recommended||res.winner).setup.type,fan:(res.stages?.departure?.recommended||res.winner).setup.fan,setpoints:(res.stages?.departure?.recommended||res.winner).setup.setpoints}:null,
              phases:(res.winner.phases||[]).map(p=>new Date(p.time-6*3600000).toISOString().slice(11,16)+' '+p.setup.type+' '+p.setup.fan),
              advisory:res.coilAdvisory?{flagged:res.coilAdvisory.check.flagged,cases:res.coilAdvisory.check.cases,staged:res.coilAdvisory.check.stagedFlagged,alternative:!!res.coilAdvisory.alternative}:null})`));
        }catch(err){planner={error:err.message};}
        out.push({day,dehum,planner});
    }
}
if(json){console.log(JSON.stringify({missingObservations:missing,results:out}));return;}
console.log('KJKA observations used:',obs.length,'missing temperature/RH rows skipped:',missing);
for(const x of out){
    if(x.planner){console.log(`${x.day} dehum ${x.dehum?'on ':'off'} PLANNER away plan:`,JSON.stringify(x.planner));continue;}
    const n=x.nominal;
    console.log(`${x.day} dehum ${x.dehum?'on ':'off'} ${x.fan.padEnd(6)} ${x.occupancy.padEnd(34)} current check: ${x.currentCheck} (${x.currentCheckCases}/9 accept) | physics flags ${x.physicsFlaggedCases}/9`+
        (x.fan==='Auto'?` (CCC2 staging ${x.stagedFlaggedCases}/9)`:'')+` | nominal compressor ${n.compressorMin} min, flagged ${n.flagMin} min, min Tcs ${n.minColdestF}°F`+
        (n.firstFlag?`, first ${n.firstFlag.local} Tcs ${n.firstFlag.coldestF} return ${n.firstFlag.returnF} dp ${n.firstFlag.dewF}`:'')+
        ` | 17:00 bed ${n.hourly.at(-1)?.bed} front ${n.hourly.at(-1)?.front} RH ${n.hourly.at(-1)?.bedRH}% | water lb ${JSON.stringify(n.moistureLb)}`);
}
