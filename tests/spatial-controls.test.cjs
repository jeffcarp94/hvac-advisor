const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function scenario(){
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.temp=55;state.rh=25;state.wind=0;state.cloud=1;state.dehumidifierEnabled=false;
 r={start:new Date('2026-10-24T03:00Z'),initial:{temperature:[67,63],rh:[30,30]},occupancy:'staying',remote:false};
 e=makeEnvelope(r.start,planBounds(r.start,r).end,'Spatial controls',300000);to=+r.start+90*60000;rows=planRows(e,r,.5,[to]).filter(x=>x.to<=to);`);return a;
}
test('scale geometry includes open cab and overhead output is uniform per served volume',()=>{
 const a=app();close(a.run('M.volumeFt3[0]'),431.1094631498402,1);close(a.run('M.volumeFt3[1]'),533.4600,1);
 close(a.run('M.fraction.reduce((s,x)=>s+x,0)'),1);
 for(const op of ['ac','hp']){
  a.run(`q=zoneHeatGains(0,0,10000,'${op}')`);close(a.run('q[0]+q[1]'),10000);
  close(a.run('q[0]/M.volumeFt3[0]'),a.run('q[1]/M.volumeFt3[1]'));
 }
 a.run("q=zoneHeatGains(0,0,10000,'furnace')");close(a.run('q[0]'),7000);close(a.run('q[1]'),3000);
});
test('cab losses have their own area; spatial sensitivity preserves approved aggregate UA',()=>{
 const a=app();let previous;
 for(const ratio of [1.5,3,4.5]){
  a.run(`e=envelopeAllocation(${ratio})`);close(a.run('e.front+e.rear'),136.57142857142858);close(a.run('e.cab+e.body'),a.run('e.total'));
  assert.ok(a.run('e.bodyOpaque>0&&e.cabOpaque>0&&e.front>e.rear'));
  if(previous!==undefined)assert.ok(a.run('e.front')>previous);previous=a.run('e.front');
 }
});
test('shade coefficients alter solar only and gains conserve energy in each distribution',()=>{
 const a=app();const ua=a.run('envelopeAllocation().front');const solar=a.run('solarLoad(1,true)');
 a.run('C.cabGlassSHGC=.05');assert.equal(a.run('envelopeAllocation().front'),ua);assert.ok(a.run('solarLoad(1,true)')<solar);
 for(const op of ['ac','hp','furnace','off']){a.run(`q=zoneHeatGains(300,4200,-1000,'${op}')`);close(a.run('q[0]+q[1]'),3500);}
});
test('bed-qualified plans prefer both areas comfortable; a dinette miss cannot defeat bed eligibility',()=>{
 const a=app();a.run(`bed={suitable:true,ready:true,frontFits:false,targetRank:0,score:0,type:'furnace'};
 both={...bed,frontFits:true,targetRank:.2};bad={...both,suitable:false,targetRank:0};`);
 assert.ok(a.run('comparePlans(both,bed)')<0);assert.ok(a.run('comparePlans(bed,bad)')<0);
});
test('furnace setpoint is selected from bed response with front control and a visible dinette miss',()=>{
 const a=scenario();a.run(`seed=stagePlanRaw([],planSetup('furnace',true),+r.start,to,e,r,rows);p=stagePlan([],planSetup('furnace',true),+r.start,to,e,r,rows)`);
 assert.equal(a.run('seed.suitable'),false);assert.equal(a.run('p.suitable'),true);assert.equal(a.run('p.setup.setpoints.heat'),63);
 assert.equal(a.run('p.frontFits'),false);assert.ok(a.run('p.trials.every(t=>t.suitable&&t.trace.at(-1).time.getTime()===to)'));
 assert.ok(a.run('p.trials[0].finalZones.temperature[0]>66&&p.trials[0].finalZones.temperature[1]<64'));
 assert.match(a.run('frontOutlook(p.trials,+r.start,to)'),/Dinette comfort differs/);
});
test('AUTO control keeps actual selected deadband independently of the bedroom target',()=>{
 const a=scenario();a.run(`s=withSetting(planSetup('auto',true),64);env={tOut:80,ua:100,gains:0,mass:300};p=thermalStep('auto',64,env,s.setpoints,2);`);
 close(a.run('p.segments[0].t1'),66);close(a.run('p.segments[1].t1'),64);
 assert.equal(a.run('s.setpoints.auto'),64);assert.equal(a.run('COMFORT.sleeping.target'),67);
 a.run(`env.tOut=40;p=thermalStep('auto',64,env,s.setpoints,2)`);close(a.run('p.segments[0].t1'),62);close(a.run('p.segments[1].t1'),64);
});
test('planned cabinet isolation has no invented numeric correction or insulation credit',()=>{
 const a=scenario();assert.equal(a.run('state.thermostatIsolated'),false);assert.match(a.run('spatialModelText()'),/planned/);
 a.run(`before=simulatePlan([{time:+r.start,setup:withSetting(planSetup('furnace',true),63)}],e,r,AIR_SCENARIOS[0],rows);state.thermostatIsolated=true;after=simulatePlan([{time:+r.start,setup:withSetting(planSetup('furnace',true),63)}],e,r,AIR_SCENARIOS[0],rows)`);
 assert.deepEqual(a.run('before.finalZones'),a.run('after.finalZones'));assert.match(a.run('spatialModelText()'),/installed/);
});
