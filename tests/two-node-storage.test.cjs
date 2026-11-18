// WP11 (v6.6.15): two-node zone storage, buoyant interzone exchange and the
// calibrated ducted delivery split.
const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
const close=(a,b,tol=1e-8,msg='')=>assert.ok(Math.abs(a-b)<=tol,`${msg} ${a} != ${b}`);

test('storage priors keep the legacy total and split by served volume',()=>{
 const a=app();const s=a.run('zoneStorage()');
 close(s.air[0]+s.air[1],60);close(s.mass[0]+s.mass[1]+60,a.run('C.thermalMass'),1e-9);
 close(s.air[0]/(s.air[0]+s.air[1]),a.run('M.fraction[0]'));
 for(let z=0;z<2;z++)close(s.mass[z]/s.coupling[z],1.5,1e-12,'mass time constant');
});

test('buoyant exchange is zero at equal temperature, symmetric and grows with the difference',()=>{
 const a=app();
 assert.equal(a.run('buoyantExchangeCFM(70,70)'),0);
 close(a.run('buoyantExchangeCFM(70,72)'),a.run('buoyantExchangeCFM(72,70)'),1e-12,'equal and opposite');
 const q1=a.run('buoyantExchangeCFM(70,71)'),q2=a.run('buoyantExchangeCFM(70,72)'),q4=a.run('buoyantExchangeCFM(70,74)');
 assert.ok(q1<q2&&q2<q4);close(q4/q1,2,0.01,'square-root law');
 // Hand check: (0.6/3)·3.5·6.33·√(32.174·6.33·2/530.67)·60 ≈ 233 CFM at a 2°F difference.
 close(q2,233,2,'magnitude');
});

test('one implicit step conserves energy across both zones and both nodes',()=>{
 const a=app();
 a.run(`st=zoneStorage();air=[66,70];mass=[64,71];ua=[35,90];inc=[10,20];src=[1500,2600];srcM=[200,300];dt=.25;hf=1.08;
  n=twoNodeAdvance(air,mass,st,ua,inc,0,150,src,srcM,40,dt,hf,hf);
  stored=[0,1].reduce((s,z)=>s+st.air[z]*(n.air[z]-air[z])+st.mass[z]*(n.mass[z]-mass[z]),0);
  flows=dt*[0,1].reduce((s,z)=>s+src[z]+srcM[z]+ua[z]*(40-n.air[z])+hf*inc[z]*(40-n.air[z]),0);`);
 close(a.run('stored'),a.run('flows'),1e-8,'energy');
});

test('isolated nodes relax to the capacity-weighted temperature',()=>{
 const a=app();
 a.run(`st=zoneStorage();x={air:[80,80],mass:[60,60]};for(let i=0;i<400;i++)x=twoNodeAdvance(x.air,x.mass,st,[0,0],[0,0],0,0,[0,0],[0,0],50,.05,1.08);`);
 const expected=(60*80+a.run('STORAGE.massTotal')*60)/(60+a.run('STORAGE.massTotal'));
 for(let z=0;z<2;z++){close(a.run(`x.air[${z}]`),expected,1e-6);close(a.run(`x.mass[${z}]`),expected,1e-6);}
});

test('ducted delivery uses the calibrated rear fraction; furnace keeps its outlet layout',()=>{
 const a=app();
 close(a.run('ductRearFraction()'),.35);
 for(const op of ['hp','ac','defrost']){const g=a.run(`zoneHeatGains([0,0],0,10000,'${op}')`);close(g[0],3500,1e-9,op);close(g[0]+g[1],10000,1e-9);}
 const f=a.run("zoneHeatGains([0,0],0,10000,'furnace')");close(f[0],7000,1e-9);
});

function steadyNight(a,setup,temp=45,step=.5){
 a.run(`forecast.timeZone='America/Chicago';state.temp=58;state.rh=25;state.wind=2;state.cloud=1;state.dehumidifierEnabled=false;
  r={start:new Date('2026-10-24T03:00Z'),reading:new Date('2026-10-24T03:00Z'),initial:{temperature:[67,67],rh:[30,30]},occupancy:'staying',remote:false};
  e=makeEnvelope(r.start,new Date('2026-10-24T05:00Z'),'Synthetic steady night',300000);e.points.forEach(p=>p.tOut=${temp});
  ph=[{time:+r.start,setup:${setup}}];rows=planRows(e,r,${step}).filter(x=>x.to<=+e.windowEnd);`);
}
test('heating trajectories converge as the integration step is refined',()=>{
 // Rapid thermostat cycling shifts cycle phase with the step, so compare cycle-averaged
 // and envelope quantities rather than one instant.
 const values=[.5,.0625].map(step=>{const a=app();steadyNight(a,"withSetting(planSetup('hp',true,null,'Auto'),68)",45,step);
  a.run(`p=simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows,null,false,true);hours=p.segments.reduce((s,g)=>s+g.hours,0);`);
  return JSON.parse(a.run(`JSON.stringify({bed:p.segments.reduce((s,g)=>s+g.hours*(g.t0+g.t1)/2,0)/hours,front:p.segments.reduce((s,g)=>s+g.hours*g.frontTemperature,0)/hours,
   max:Math.max(...p.trace.map(x=>x.bedroom)),min:Math.min(...p.trace.map(x=>x.bedroom)),mass:p.finalZones.mass,heat:p.heatMinutes})`));});
 const [coarse,fine]=values;
 for(const k of ['bed','front','max','min'])close(coarse[k],fine[k],.05,k);
 for(let z=0;z<2;z++)close(coarse.mass[z],fine.mass[z],.05,'mass '+z);
 close(coarse.heat,fine.heat,.02*fine.heat,'heating minutes');
});

test('a cached checkpoint resumes air and mass nodes exactly',()=>{
 const a=app();steadyNight(a,"withSetting(planSetup('hp',true,null,'Auto'),68)");
 a.run(`direct=simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows,null,true,true);cp=direct.checkpoints[Math.floor(direct.checkpoints.length/2)];
  resumed=simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows,{time:cp.time,carry:cp,prefix:direct},false,true);`);
 assert.ok(a.run('Array.isArray(cp.tm)&&cp.tm.length===2'));
 assert.equal(a.run('JSON.stringify(resumed.finalZones)'),a.run('JSON.stringify(direct.finalZones)'));
 assert.equal(a.run('resumed.trace.at(-1).bedroom'),a.run('direct.trace.at(-1).bedroom'));
});

test('reconstructed empty-garage warm-up reproduces the rear running below the front',()=>{
 // Owner garage test: heat pump warming an empty coach from 60F; when the EasyTouch
 // first showed 72F the front YoLink read 68.3F and the rear 66.7F (rear - front = -1.6F).
 // Garage air, wind and sun are not recorded; 50-60F, calm and dark are assumptions.
 for(const garage of [50,55,60]){
  const a=app();
  a.run(`forecast.timeZone='America/Chicago';state.temp=${garage};state.rh=50;state.wind=0;state.cloud=0;state.dehumidifierEnabled=false;solarLoad=()=>0;
   start=new Date('2026-11-10T18:00Z');r={start,reading:start,initial:{temperature:[60,60],rh:[50,50]},occupancy:'away',remote:false,departure:start,returnTime:new Date('2026-11-10T23:00Z'),actualConfirmed:true};
   e=makeEnvelope(start,planBounds(start,r).end,'Reconstructed garage',300000);e.points.forEach(p=>{p.wind=0;p.cloud=0;});
   s=withSetting(planSetup('hp',false,null,'Auto'),72);r.actual=s;p=simulatePlan([{time:+start,setup:s}],e,r,AIR_SCENARIOS[0],null,null,false,true);
   hit=p.trace.find(x=>x.midCoach>=68.3);`);
  const gap=a.run('hit.bedroom-hit.midCoach');
  assert.ok(gap<=-1.0&&gap>=-2.3,`garage ${garage}F gap ${gap}`);
 }
});
