const test=require('node:test'),assert=require('node:assert/strict'),{app}=require('./helpers.cjs');
const near=(x,y,tol=1e-9)=>assert.ok(Math.abs(x-y)<tol,`${x} != ${y}`);
test('published dehumidifier capacity curve is normalized at 65°F / 60% RH',()=>{
 const a=app();near(a.run('dehumidifierPerformance(65,60).capacityLbHr/M.moistureLbPerPint*24'),20);
 // Independent evaluation of NREL Table 10 at the legacy 80°F point and 65°F reference.
 const curve=t=>-1.1625+.022715*t-.00011321*t*t+.021111*60-.000069303*60*60+.00037884*t*60;
 near(a.run('dehumidifierPerformance(80,60).capacityLbHr/M.moistureLbPerPint*24'),20*curve((80-32)*5/9)/curve((65-32)*5/9));
 assert.ok(a.run('dehumidifierPerformance(80,60).capacityLbHr')>a.run('dehumidifierPerformance(65,60).capacityLbHr'));
 assert.equal(a.run('dehumidifierPerformance(40,60).capacityLbHr'),0);
});
test('humidistat runtime is separate from capacity, and overload cannot force 50% RH',()=>{
 const a=app();a.run(`state.dehumidifierEnabled=true;w=humidityRatio(65,60);
 light=mixedMoistureStep(w,65,0,0,0,.5,true);heavy=mixedMoistureStep(w,65,2,0,0,.5,true);
 dry=mixedMoistureStep(humidityRatio(65,40),65,0,0,0,.5,true);off=mixedMoistureStep(w,65,0,0,0,.5,false);`);
 near(a.run('light.capacityLbHr'),a.run('heavy.capacityLbHr'));assert.ok(a.run('light.runtime')<1);
 near(a.run('heavy.runtime'),1);assert.ok(a.run('rhFromRatio(65,heavy.water)')>60);
 near(a.run('dry.removal'),0);near(a.run('dry.heatBTU'),0);near(a.run('off.removal'),0);near(a.run('off.heatBTU'),0);
 near(a.run('light.heatBTU'),a.run('light.electricalBTU+light.removal*M.latentBTUPerLb'));
 near(a.run('light.electricalBTU'),a.run('dehumidifierPerformance(65,60).powerBTU*light.runtime'));
});
test('occupant sensible and latent loads reconcile to the activity-based energy budget',()=>{
 const a=app();for(const sleeping of [true,false]){
  a.run(`p=occupantLoad(${sleeping},2)`);near(a.run('p.sensibleBTU+p.latentBTU'),a.run('p.totalBTU'));
  near(a.run('p.moistureLbHr*453.59237'),sleeping?80:110);
  near(a.run('p.totalBTU'),(sleeping?.7:1)*58.2*1.8*2*3.412141633);
 }
 near(a.run('occupantLoad(true,0).sensibleBTU'),0);near(a.run('occupantLoad(false,0).moistureLbHr'),0);
});
test('AC latent availability counts the single evaporator airflow once',()=>{
 const a=app();a.run('w=humidityRatio(68,60);actual=acMoistureRemoval(w,1)');
 const expected=a.run('(humidityRatio(68,60)-humidityRatio(50,100))*4.5*300');near(a.run('actual'),expected);
 near(a.run('acMoistureRemoval(w,.25)'),expected*.25);near(a.run('acMoistureRemoval(humidityRatio(65,35),1)'),0);
});
function profile(a,mode='ac'){
 a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;
 e={windowStart:new Date('2026-10-24T03:00Z'),windowEnd:new Date('2026-10-24T04:00Z'),wind:2,cloud:0,points:[{time:new Date('2026-10-24T03:00Z'),tOut:70,rh:75,wind:2,cloud:0}]};
 p=zoneProfile('${mode}',e,true,confirmedSetpoints(true),C.metaSleep,68,{initialZones:{temperature:[68,71],rh:[58,52]},fanSetting:'Low',checkEquipment:false});`);
}
test('one coach moisture balance conserves water and preserves both measured initial readings',()=>{
 const a=app();profile(a);
 near(a.run('p.trace[0].rh'),58);near(a.run('p.trace[0].midRH'),52);
 assert.equal(a.run('p.trace.slice(1).every(x=>x.water[0]===x.water[1]&&x.dewPoint===x.midDewPoint)'),true);
 assert.ok(a.run('p.trace.some(x=>Math.abs(x.rh-x.midRH)>1)'));
 near(a.run('p.moisture.initialWaterLb+p.moisture.totals.occupants+p.moisture.totals.outside-p.moisture.totals.ac-p.moisture.totals.dehumidifier-p.moisture.condensedLb-p.moisture.finalWaterLb'),0);
 assert.ok(a.run('p.moisture.dehumRuntimeMinutes')>0);
});
test('dehumidifier effect has no front/rear transport bottleneck or fan-mixing dependence',()=>{
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;
 e={windowStart:new Date('2026-10-24T03:00Z'),windowEnd:new Date('2026-10-24T03:15Z'),wind:0,cloud:0,points:[{time:new Date('2026-10-24T03:00Z'),tOut:68,rh:50,wind:0,cloud:0}]};
 M.mixCFM=0;M.ductMixCFM=0;slow=zoneProfile('passive',e,true,confirmedSetpoints(true),C.metaSleep,68,{initialZones:{temperature:[68,68],rh:[60,60]}});
 M.mixCFM=1000;M.ductMixCFM=1000;fast=zoneProfile('passive',e,true,confirmedSetpoints(true),C.metaSleep,68,{initialZones:{temperature:[68,68],rh:[60,60]}});`);
 near(a.run('slow.finalZones.water[0]'),a.run('fast.finalZones.water[0]'));near(a.run('slow.moisture.totals.dehumidifier'),a.run('fast.moisture.totals.dehumidifier'));
});
test('cached handoffs preserve moisture totals, prior heat and accumulated dehumidifier runtime',()=>{
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.temp=60;state.rh=70;state.wind=2;state.cloud=0;
 r={start:new Date('2026-10-24T02:55Z'),reading:new Date('2026-10-24T02:55Z'),initial:{temperature:[69,71],rh:[60,58]},occupancy:'staying',remote:false};
 e=makeEnvelope(r.start,planBounds(r.start).end,'Moisture carry',300000);ph=[{time:+r.start,setup:planSetup('ac',false)},{time:+r.start+5*60000,setup:planSetup('auto',true)}];rows=planRows(e,r);
 direct=evaluatePlan(ph,e,r,rows);e.planCache=new Map();cached=evaluatePlan(ph,e,r,rows);`);
 assert.equal(a.run('JSON.stringify(direct.trials.map(t=>({trace:t.trace,moisture:t.moisture})))'),a.run('JSON.stringify(cached.trials.map(t=>({trace:t.trace,moisture:t.moisture})))'));
});

test('active AC and dehumidifier coupling converges as the timestep is refined',()=>{
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;
 e={windowStart:new Date('2026-10-24T03:00Z'),windowEnd:new Date('2026-10-24T05:00Z'),wind:2,cloud:0,points:[{time:new Date('2026-10-24T03:00Z'),tOut:78,rh:85,wind:2,cloud:0}]};
 ps=[.5,.25,.125].map(maxStepMin=>zoneProfile('ac',e,true,confirmedSetpoints(true),C.metaSleep,72,{maxStepMin,initialZones:{temperature:[72,72],rh:[70,70]},fanSetting:'Low',frontControl:true}));`);
 for(const p of ['ps[0]','ps[1]']){
  assert.ok(a.run(`Math.abs(${p}.finalIndoor-ps[2].finalIndoor)`)<.05);
  assert.ok(a.run(`Math.abs(${p}.finalZones.water[0]-ps[2].finalZones.water[0])`)<.00002);
  assert.ok(a.run(`Math.abs(${p}.moisture.dehumRuntimeMinutes-ps[2].moisture.dehumRuntimeMinutes)`)<1.2);
  assert.ok(a.run(`${p}.moisture.totals.ac`)>0);assert.ok(a.run(`${p}.moisture.totals.dehumidifier`)>0);
 }
});
