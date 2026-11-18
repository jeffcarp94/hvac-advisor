// WP11 (v6.6.15): two-node zone storage, buoyant interzone exchange and the
// calibrated ducted delivery split.
const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
const close=(a,b,tol=1e-8,msg='')=>assert.ok(Math.abs(a-b)<=tol,`${msg} ${a} != ${b}`);

test('calibrated storage values split by served volume',()=>{
 const a=app();const s=a.run('zoneStorage()');
 close(s.air[0]+s.air[1],297);close(s.mass[0]+s.mass[1],574);
 close(s.air[0]/(s.air[0]+s.air[1]),a.run('M.fraction[0]'));
 for(let z=0;z<2;z++)close(s.mass[z]/s.coupling[z],.98,1e-12,'mass time constant');
});

test('buoyant exchange is zero at equal temperature, symmetric and grows with the difference',()=>{
 const a=app();
 assert.equal(a.run('buoyantExchangeCFM(70,70)'),0);
 close(a.run('buoyantExchangeCFM(70,72)'),a.run('buoyantExchangeCFM(72,70)'),1e-12,'equal and opposite');
 const q1=a.run('buoyantExchangeCFM(70,71)'),q2=a.run('buoyantExchangeCFM(70,72)'),q4=a.run('buoyantExchangeCFM(70,74)');
 assert.ok(q1<q2&&q2<q4);close(q4/q1,2,0.01,'square-root law');
 // Hand check: (0.6/3)·W·6.33·√(32.174·6.33·2/530.67)·60 ≈ 66.6 CFM per foot of effective width at 2°F.
 close(a.run('buoyantExchangeCFM(70,72,3.5)'),233,2,'magnitude at 3.5 ft');close(q2,66.6*.58,1,'magnitude at calibrated 0.58 ft');
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
 a.run(`st=zoneStorage();x={air:[80,80],mass:[60,60]};for(let i=0;i<800;i++)x=twoNodeAdvance(x.air,x.mass,st,[0,0],[0,0],0,0,[0,0],[0,0],50,.05,1.08);`);
 const ca=a.run('STORAGE.airTotal'),cm=a.run('STORAGE.massTotal'),expected=(ca*80+cm*60)/(ca+cm);
 for(let z=0;z<2;z++){close(a.run(`x.air[${z}]`),expected,1e-6);close(a.run(`x.mass[${z}]`),expected,1e-6);}
});

test('ducted delivery uses the calibrated rear fraction; furnace keeps its outlet layout',()=>{
 const a=app();
 close(a.run('ductRearFraction()'),.38);
 for(const op of ['hp','ac','defrost']){const g=a.run(`zoneHeatGains([0,0],0,10000,'${op}')`);close(g[0],3800,1e-9,op);close(g[0]+g[1],10000,1e-9);}
 const f=a.run("zoneHeatGains([0,0],0,10000,'furnace')");close(f[0],5700,1e-9);
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

function garageRun(fixture,mode){
 const g=require('./fixtures/'+fixture);
 const a=app();const base=Date.parse(g.startUtc),on=g.heatOnMinute,off=g.heatOffMinute,end=g.minutes.at(-1);
 a.ctx.points=g.minutes.map((m,i)=>({time:new Date(base+m*60000),tOut:g.garage[i],rh:42,wind:0,cloud:0,precip:'none'})).filter(p=>+p.time>=base+(on-1)*60000);
 const i0=g.minutes.indexOf(on);
 a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=false;solarLoad=()=>0;solarZoneGains=()=>[0,0];start=new Date(${base+on*60000});
  r={start,reading:start,initial:{temperature:[${g.rear[i0]},${g.front[i0]}],rh:[40,40]},occupancy:'away',remote:false,departure:start,returnTime:new Date(${base+(end+60)*60000}),actualConfirmed:true};
  e={windowStart:start,windowEnd:new Date(${base+end*60000}),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,singlePoint:false,points,cloud:0,wind:0,precip:'none',elevationM:300};
  heat=withSetting(planSetup('${mode}',false,null,'High'),90);r.actual=heat;
  p=simulatePlan([{time:+start,setup:heat},{time:${base+off*60000},setup:planSetup('passive',false)}],e,r,AIR_SCENARIOS[0],null,null,false,true);
  model=p.trace.map(x=>[(+x.time-${base})/60000,x.bedroom,x.midCoach]);`);
 const model=a.run('model'),at=m=>model.find(x=>x[0]>=m-1e-9);
 let sf=0,sr=0,n=0;g.minutes.forEach((m,i)=>{if(m<on||m>end)return;const x=at(m);sf+=(x[2]-g.front[i])**2;sr+=(x[1]-g.rear[i])**2;n++;});
 return{g,at,off,front:Math.sqrt(sf/n),rear:Math.sqrt(sr/n)};
}
test('owner garage heat-pump and furnace runs are reproduced within the digitizing tolerance',()=>{
 // Field observations (YoLink front/rear/garage, empty coach): heat pump 11/16/2026 and
 // furnace 11/17/2026. Values were fitted jointly to these runs, so this guards against
 // calibration regressions rather than proving independent accuracy.
 const hp=garageRun('garage-heat-pump-2026-11-16.json','hp');
 assert.ok(hp.front<.4&&hp.rear<.4,`heat pump RMSE ${hp.front}/${hp.rear}`);
 const k=hp.g.minutes.indexOf(hp.off),x=hp.at(hp.off);
 assert.ok(x[1]-x[2]<-1,'heat pump: rear below front at shutoff');close(x[1]-x[2],hp.g.rear[k]-hp.g.front[k],.6,'heat-pump shutoff gap');
 const fu=garageRun('garage-furnace-2026-11-17.json','furnace');
 assert.ok(fu.front<.5&&fu.rear<.5,`furnace RMSE ${fu.front}/${fu.rear}`);
 const j=fu.g.minutes.indexOf(80),y=fu.at(80);
 assert.ok(y[1]-y[2]>2,'furnace: rear stays well above front during the cool-down');close(y[1]-y[2],fu.g.rear[j]-fu.g.front[j],.8,'furnace cool-down gap');
});
