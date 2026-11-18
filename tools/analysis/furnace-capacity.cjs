// Usage: node tools/analysis/furnace-capacity.cjs <repo>. Synthetic steady cold nights, FURNACE 72, 2 occupants asleep: final temps and duty %.
const {app}=require(process.argv[2]+'/tests/helpers.cjs');
const out=[];
for(const T of [10,0,-10,-20]){
const a=app();a.run(`forecast.timeZone='America/Chicago';state.temp=${T};state.rh=40;state.wind=3;state.cloud=1;
 r={start:new Date('2026-01-15T04:00Z'),initial:{temperature:[68,68],rh:[30,30]},occupancy:'staying'};
 e=makeEnvelope(r.start,new Date(+r.start+600*60000),'cap',30000);
 rows=scheduleWeather(e,r.start,e.windowEnd).map(x=>({...x,sleeping:true,occupants:2}));
 p=simulatePlan([{time:+r.start,setup:withSetting(planSetup('furnace',false),72)}],e,r,AIR_SCENARIOS[0],rows,null,false,true)`);
 out.push([T,a.run('JSON.stringify([+p.trace.at(-1).bedroom.toFixed(1),+p.trace.at(-1).midCoach.toFixed(1),Math.round(p.heatMinutes/6)/1, p.suitable])')]);
}
console.log(out.join(' | '));
