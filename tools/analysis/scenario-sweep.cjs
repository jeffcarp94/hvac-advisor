// Usage: node tools/analysis/scenario-sweep.cjs <repo> [outdoor F]. Synthetic steady night: every AIR_SCENARIO at each FURNACE setpoint;
// bedroom and front ranges after the first hour and the bedroom-minus-front offset.
// Synthetic steady night, 30F all night, two occupants staying, initial 68F, start 9:50 PM CDT.
// Every one of the nine scenarios simulated; stats after the first hour.
const repo=process.argv[2],T=+(process.argv[3]||30);const {app}=require(repo+'/tests/helpers.cjs');
for(const h of [62,63,64,65,66]){
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.temp=58;state.rh=25;state.wind=2;state.cloud=1;
 r={start:new Date('2026-10-24T02:50Z'),reading:new Date('2026-10-24T02:50Z'),initial:{temperature:[68,68],rh:[30,30]},occupancy:'staying',remote:false};
 e=makeEnvelope(r.start,planBounds(r.start).end,'Test',300000);e.points.forEach(p=>p.tOut=${T});
 s=withSetting(planSetup('furnace',true),${h});ph=[{time:+r.start,setup:s}];
 res=AIR_SCENARIOS.map(sc=>{const p=simulatePlan(ph,e,r,sc,null,null,false,true);const tr=p.trace.filter(x=>+x.time>=+r.start+3600000);
  const b=tr.map(x=>x.bedroom),f=tr.map(x=>x.midCoach);const mean=v=>v.reduce((x,y)=>x+y)/v.length;
  return {n:sc.name,bmin:Math.min(...b),bmax:Math.max(...b),bmean:mean(b),fmin:Math.min(...f),fmax:Math.max(...f),fmean:mean(f)};});`);
 const res=a.run('res');
 console.log('HEAT TO '+h);
 for(const x of res)console.log('  '+(x.n||'').padEnd(28),'bed',x.bmin.toFixed(1),'-',x.bmax.toFixed(1),'(swing',(x.bmax-x.bmin).toFixed(1)+', mean',x.bmean.toFixed(1)+')','front',x.fmin.toFixed(1),'-',x.fmax.toFixed(1),'offset',(x.bmean-x.fmean).toFixed(1));
}
