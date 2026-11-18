// Usage: node tools/analysis/cycles.cjs <repo>. Reconstructed steady nights: thermostat cycle lengths and zone ranges (nominal scenario).
const repo=process.argv[2];const {app}=require(repo+'/tests/helpers.cjs');
const a=app();
for(const [label,type,sp,temp] of [['HP 68 @45F','hp',68,45],['AUTO 68/72 @45F','auto','{heat:68,cool:72}',45],['FURNACE 67 @45F','furnace',67,45],['HP 66 @30F(furnace)','hp',66,30],['COOL 72 @85F','ac',72,85]]){
 a.run(`forecast.timeZone='America/Chicago';state.temp=58;state.rh=25;state.wind=2;state.cloud=1;
  r={start:new Date('2026-10-24T03:00Z'),reading:new Date('2026-10-24T03:00Z'),initial:{temperature:[67,67],rh:[30,30]},occupancy:'staying',remote:false};
  e=makeEnvelope(r.start,planBounds(r.start).end,'Reconstructed',300000);e.points.forEach(p=>p.tOut=${temp});
  s=withSetting(planSetup('${type}',true,null,'Auto'),${sp});p=simulatePlan([{time:+r.start,setup:s}],e,r,AIR_SCENARIOS[0],null,null,false,true);
  {let runs=[],off=[],cur=null,curOff=null;for(const g of p.segments){const on=g.operation!=='off'&&g.operation!=='defrost'&&g.duty>0;
   if(on){if(curOff){off.push(curOff);curOff=null;}cur=cur?{...cur,end:g.endMs}:{start:g.startMs,end:g.endMs};}else{if(cur){runs.push(cur);cur=null;}curOff=curOff?{...curOff,end:g.endMs}:{start:g.startMs,end:g.endMs};}}
  if(cur)runs.push(cur);globalThis.on=runs.slice(1,-1).map(x=>(x.end-x.start)/60000);globalThis.offm=off.slice(1).map(x=>(x.end-x.start)/60000);globalThis.runs=runs;}`);
 console.log(label.padEnd(22),'calls',a.run('runs.length'),'on min/med',a.run('on.length?Math.min(...on).toFixed(1)+"/"+on.sort((x,y)=>x-y)[Math.floor(on.length/2)].toFixed(1):"-"'),'off min/med',a.run('offm.length?Math.min(...offm).toFixed(1)+"/"+offm.sort((x,y)=>x-y)[Math.floor(offm.length/2)].toFixed(1):"-"'),'bed',a.run('Math.min(...p.trace.map(x=>x.bedroom)).toFixed(1)+"-"+Math.max(...p.trace.map(x=>x.bedroom)).toFixed(1)'),'front',a.run('Math.min(...p.trace.map(x=>x.midCoach)).toFixed(1)+"-"+Math.max(...p.trace.map(x=>x.midCoach)).toFixed(1)'));
}
