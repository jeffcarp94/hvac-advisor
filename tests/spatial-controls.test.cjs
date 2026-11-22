const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function scenario(temp=55){
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.temp=${temp};state.rh=25;state.wind=0;state.cloud=1;state.dehumidifierEnabled=false;
 r={start:new Date('2026-10-24T03:00Z'),initial:{temperature:[67,63],rh:[30,30]},occupancy:'staying',remote:false};
 e=makeEnvelope(r.start,planBounds(r.start,r).end,'Spatial controls',300000);to=+r.start+90*60000;rows=planRows(e,r,.5,[to]).filter(x=>x.to<=to);`);return a;
}
test('scale geometry includes open cab and ducted output follows the calibrated rear share',()=>{
 const a=app();close(a.run('M.volumeFt3[0]'),431.1094631498402,1);close(a.run('M.volumeFt3[1]'),533.4600,1);
 close(a.run('M.fraction.reduce((s,x)=>s+x,0)'),1);
 for(const op of ['ac','hp']){
  a.run(`q=zoneHeatGains([0,0],0,10000,'${op}')`);close(a.run('q[0]+q[1]'),10000);
  // v6.6.15: owner garage test calibrates ducted delivery to 38% rear (was uniform per volume).
  close(a.run('q[0]/(q[0]+q[1])'),a.run('ductRearFraction()'));
 }
 // v6.6.15: owner 11/17/2026 garage furnace run calibrates the furnace split to 57% rear (was 70% from the outlet layout).
 // v6.6.27 (R1): joint refit of both garage runs on the WP6 heat pump gives 58% rear.
 a.run("q=zoneHeatGains([0,0],0,10000,'furnace')");close(a.run('q[0]'),5800);close(a.run('q[1]'),4200);
});
test('cab uncertainty changes total load while preserving independent RV-body conductance',()=>{
 const a=app();const body=a.run('envelopeAllocation().body'),rear=a.run('envelopeAllocation().rear');let previous;
 close(a.run('envelopeAllocation().total'),126.33326325214344);
 for(const ratio of [1.5,3,4.5]){
  a.run(`e=envelopeAllocation(${ratio})`);close(a.run('e.front+e.rear'),a.run('e.total'));close(a.run('e.body'),body);close(a.run('e.rear'),rear);close(a.run('e.cab+e.body'),a.run('e.total'));
  assert.ok(a.run('e.bodyOpaque>0&&e.cabOpaque>0&&e.front>e.rear'));
  if(previous!==undefined)assert.ok(a.run('e.front')>previous);previous=a.run('e.front');
 }
});
test('shade coefficients alter solar only and gains conserve energy in each distribution',()=>{
 const a=app();const ua=a.run('envelopeAllocation().front');const solar=a.run('solarLoad(1,true)');
 a.run('C.cabGlassSHGC=.05');assert.equal(a.run('envelopeAllocation().front'),ua);assert.ok(a.run('solarLoad(1,true)')<solar);
 for(const op of ['ac','hp','furnace','off']){a.run(`q=zoneHeatGains([100,200],4200,-1000,'${op}')`);close(a.run('q[0]+q[1]'),3500);}
});
test('bed-qualified plans prefer both areas comfortable; a dinette miss cannot defeat bed eligibility',()=>{
 const a=app();a.run(`bed={suitable:true,ready:true,frontFits:false,targetRank:0,score:0,type:'furnace'};
 both={...bed,frontFits:true,targetRank:.2};bad={...both,suitable:false,targetRank:0};`);
 assert.ok(a.run('comparePlans(both,bed)')<0);assert.ok(a.run('comparePlans(bed,bad)')<0);
});
test('furnace maintenance cannot claim an ideal clamped setpoint with real hysteresis',()=>{
 // Labeled synthetic manual-weather night. v6.6.16: at 55°F the evidence-derived greater-airflow
 // case keeps the front 0.04°F above the restart threshold within the 90-minute window, so
 // no case shows a restart; a 50°F night exercises the same real hysteresis with all assertions kept.
 const a=scenario(50);a.run(`p=stagePlan([],planSetup('furnace',true),+r.start,to,e,r,rows);
 old=stagePlanRaw([],withSetting(planSetup('furnace',true),63),+r.start,to,e,r,rows)`);
 assert.equal(a.run('old.suitable'),false);
 // The optimized setting is simulated through real EasyTouch cycling, not a clamped
 // setpoint: the front sensor spans heat-on (HEAT TO − 2) to shutoff (HEAT TO + 1).
 // v6.6.15 storage let the optimized HEAT TO 65 pass at 55°F; v6.6.14 rejected every setting.
 // v6.6.16's airflow cases reject it on bedroom comfort only (tabled per owner, 11/18/2026).
 const heat=a.run('p.setup.setpoints.heat');
 assert.ok(a.run('p.trials.every(t=>Math.max(...t.trace.slice(1).map(x=>x.midCoach))>='+(heat+1-.05)+')'),'every case reaches shutoff');
 assert.ok(a.run('p.trials.some(t=>Math.min(...t.trace.slice(1).map(x=>x.midCoach))<='+(heat-2+.05)+')'),'a case returns to the restart threshold');
 assert.ok(a.run('p.trials.some(t=>t.trace.some(x=>{const b=comfortPolicy(x.sleep);return x.midCoach<b.low-.05||x.midCoach>b.high+.05;}))'),'the dinette leaves its band');
});
test('AUTO control uses independent EasyTouch setpoints instead of a midpoint',()=>{
  const a=scenario();a.run(`s=withSetting(planSetup('auto',true),{heat:67,cool:71});env={tOut:80,ua:100,gains:0,mass:300};p=thermalStep('auto',69,env,s.setpoints,2);`);
  close(a.run('p.segments[0].t1'),73);
  assert.equal(a.run('p.segments[1].operation'),'ac');
  close(a.run('p.segments[1].t1'),70);
  assert.equal(a.run('s.setpoints.heat'),67);assert.equal(a.run('s.setpoints.cool'),71);
  assert.equal(a.run('COMFORT.sleeping.target'),67);
  a.run(`env.tOut=55;env.gains=0;p=thermalStep('auto',69,env,s.setpoints,2)`);
  close(a.run('p.segments[0].t1'),65);assert.equal(a.run('p.segments[1].operation'),'hp');
  close(a.run('p.segments[1].t1'),68);
 });
test('installed cabinet isolation is recorded without a modeled correction',()=>{
 const a=scenario();assert.equal(a.run('state.thermostatIsolated'),undefined);
 a.run(`before=simulatePlan([{time:+r.start,setup:withSetting(planSetup('furnace',true),63)}],e,r,AIR_SCENARIOS[0],rows);state.thermostatIsolated=true;after=simulatePlan([{time:+r.start,setup:withSetting(planSetup('furnace',true),63)}],e,r,AIR_SCENARIOS[0],rows)`);
 assert.deepEqual(a.run('before.finalZones'),a.run('after.finalZones'));
});

test('unchanged effective controls preserve AUTO cycle and cached state across a stage label',()=>{
 const a=scenario();a.run(`r.initial.temperature=[67,67];state.temp=80;e=makeEnvelope(r.start,planBounds(r.start,r).end,'Cycle continuity',300000);
 to=+r.start+60*60000;rows=planRows(e,r,.5,[to]).filter(x=>x.to<=to);
 first=withSetting(planSetup('auto',true),{heat:67,cool:71});second=withSetting(planSetup('auto',false,null,'Low'),{heat:67,cool:71});
 direct=simulatePlan([{time:+r.start,setup:first}],e,r,AIR_SCENARIOS[0],rows);
 split=[{time:+r.start,setup:first},{time:+r.start+7*60000,setup:second}];
 divided=simulatePlan(split,e,r,AIR_SCENARIOS[0],rows);e.planCache=new Map();cached=evaluatePlan(split,e,r,rows);`);
 assert.equal(a.run('sameSetup(first,second)'),true);
 assert.deepEqual(a.run('direct.finalZones'),a.run('divided.finalZones'));
 assert.deepEqual(a.run('divided.finalZones'),a.run('cached.trials[0].finalZones'));
 assert.equal(a.run('direct.coolMinutes'),a.run('divided.coolMinutes'));
});

test('internal sensible gains reconcile by source and follow occupancy',()=>{
 const a=app();
 a.run(`base=zoneInternalGains(0,0,false,false);
   awake=zoneInternalGains(100,0,false,false);
   asleep=zoneInternalGains(100,0,true,false);
   wet=zoneInternalGains(100,640,true,false);
   charging=zoneInternalGains(100,640,true,true);`);
 close(a.run('base[0]'),20*3.412);
 close(a.run('base[1]'),6*3.412);
 close(a.run('awake[0]-base[0]'),a.run('100*M.fraction[0]'));
 close(a.run('awake[1]-base[1]'),a.run('100*M.fraction[1]'));
 close(a.run('asleep[0]-base[0]'),100);
 close(a.run('asleep[1]-base[1]'),0);
 close(a.run('wet[0]-asleep[0]'),0);
 close(a.run('wet[1]-asleep[1]'),640);
 close(a.run('charging[0]-wet[0]'),40*3.412);
 close(a.run('charging[1]-wet[1]'),0);
 close(a.run('charging[0]+charging[1]'),740+66*3.412);
});

test('charging follows occupied sleep, including delayed return and a late-night rebuild',()=>{
 const a=scenario();
 a.run(`r.start=new Date('2026-10-24T02:00Z');
   r.occupancy='leaving';r.departure=new Date('2026-10-24T02:30Z');
   r.returnTime=new Date('2026-10-24T04:13Z');
   e=makeEnvelope(r.start,planBounds(r.start,r).end,'Synthetic charging schedule',300000);
   scheduled=planRows(e,r,7);`);
 assert.equal(a.run('scheduled.filter(row=>row.occupants===0).every(row=>!row.phoneCharging)'),true);
 assert.equal(a.run('scheduled.find(row=>row.phoneCharging).from'),Date.parse('2026-10-24T04:13Z'));
 assert.equal(a.run('scheduled.filter(row=>row.phoneCharging).at(-1).to'),Date.parse('2026-10-24T06:13Z'));
 a.run(`r={...r,occupancy:'staying',start:new Date('2026-10-24T06:30Z')};
   e=makeEnvelope(r.start,planBounds(r.start,r).end,'Synthetic late sleep',300000);
   scheduled=planRows(e,r);`);
 assert.equal(a.run('scheduled.some(row=>row.phoneCharging)'),false);
});

test('owner-confirmed window sides change wind pressure with the same pane and solar geometry',()=>{
 const a=scenario();
 a.run(`config={gaps:[4,0,4,0,0,0],fanZone:1};
   windward=ventilationNetwork(config,[72,72],72,12,0,{...AIR_SCENARIOS[0],windSign:1});
   leeward=ventilationNetwork(config,[72,72],72,12,0,{...AIR_SCENARIOS[0],windSign:-1});`);
 assert.equal(a.run("WINDOW_SECTIONS.filter(p=>p.side==='entry').map(p=>p.id).join(',')"),'jeff1,jeff2,sink');
 assert.equal(a.run("WINDOW_SECTIONS.filter(p=>p.side==='driver').map(p=>p.id).join(',')"),'kim,dinette1,dinette2');
 assert.ok(a.run('windward.flows[0]>0&&windward.flows[2]<0'));
 assert.ok(a.run('leeward.flows[0]<0&&leeward.flows[2]>0'));
 assert.equal(a.run("WINDOW_SECTIONS.filter(p=>p.bed).map(p=>p.id).join(',')"),'jeff1,jeff2,kim');
});
test('furnace and ducted heat use their garage-calibrated rear/front splits',()=>{
 const a=app();
 // Furnace under the owner's bed: aisle and bathroom outlets (rear), weaker sink-cabinet outlet (front).
 // The 11/17/2026 garage run measured a 57% rear share (FURNACE.rearFraction), below the former 70% layout estimate;
 // v6.6.27 (R1) joint refit: 58%.
 const furnace=a.run('zoneHeatGains([0,0],0,10000,"furnace")'),hp=a.run('zoneHeatGains([0,0],0,10000,"hp")');
 assert.ok(Math.abs(furnace[0]-5800)<1e-9&&Math.abs(furnace[1]-4200)<1e-9);
 assert.ok(Math.abs(hp[0]-10000*a.run('ductRearFraction()'))<1e-9);
 for(const g of [furnace,hp])assert.ok(Math.abs(g[0]+g[1]-10000)<1e-9);
 const both=a.run('zoneHeatGains([100,200],0,10000,"furnace")');assert.ok(Math.abs(both[0]-5900)<1e-9&&Math.abs(both[1]-4400)<1e-9);
});
