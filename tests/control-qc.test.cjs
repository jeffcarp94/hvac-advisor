const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
const close=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
function scene(temp=41,initial=[58,57],rh=[32,31]){
 const a=app();a.run(`forecast.timeZone='America/Chicago';forecast._lat=41.335;forecast._lon=-94.014;
 state.temp=${temp};state.rh=40;state.wind=5;state.cloud=.1;
 r={start:new Date('2026-11-15T23:14Z'),reading:new Date('2026-11-15T23:14Z'),initial:{temperature:${JSON.stringify(initial)},rh:${JSON.stringify(rh)}},occupancy:'staying'};
 e=makeEnvelope(r.start,planBounds(r.start,r).end,'Explicit constant weather',30000);to=+r.start+30*60000;rows=planRows(e,r,.5,[to]).filter(x=>x.to<=to);`);return a;
}
test('all installed heat modes obey the same start, continued-call and stop thresholds',()=>{
 const a=app();
 for(const mode of ['hp','furnace','auto','auto_furnace']){
  a.run(`sp={heat:70,cool:74};control={phase:'off'}`);
  assert.equal(a.run(`thermostatDemand('${mode}',69,sp,control,55)`),'off');
  assert.notEqual(a.run(`thermostatDemand('${mode}',68,sp,control,55)`),'off');
  assert.notEqual(a.run(`thermostatDemand('${mode}',70,sp,control,55)`),'off');
  assert.equal(a.run(`thermostatDemand('${mode}',71,sp,control,55)`),'off');
 }
 // The reported 58°F setpoint cannot call for heat at a 57°F sensor.
 assert.equal(a.run("thermostatDemand('hp',57,{heat:58,cool:72},{phase:'off'},45)"),'off');
});
test('single COOL and AUTO have identical cooling transitions and full-load output',()=>{
 const a=app();for(const mode of ['ac','auto','auto_furnace']){
  a.run("sp={heat:68,cool:72};control={phase:'off'};env={tOut:95,ua:100,gains:500,mass:300}");
  assert.equal(a.run(`thermostatDemand('${mode}',73,sp,control,95)`),'off');
  assert.equal(a.run(`thermostatDemand('${mode}',74,sp,control,95)`),'ac');
  assert.equal(a.run(`thermostatDemand('${mode}',72,sp,control,95)`),'ac');
  assert.equal(a.run(`thermostatDemand('${mode}',71,sp,control,95)`),'off');
  a.run(`p=thermalStep('${mode}',90,env,sp,3)`);
  assert.equal(a.run('p.segments.every(s=>s.duty===0||s.duty===1)'),true);
 }
});
test('recovery selection holds established setpoints and later maintenance remains independent',()=>{
 for(const [temp,initial,mode,field,value] of [[41,[58,57],'hp','heat',70],[55,[58,57],'furnace','heat',70],[95,[110,108],'ac','cool',72]]){
  const a=scene(temp,initial);a.run(`base=withSetting(planSetup('${mode}',false),58);fixed=applyRecoverySetting(base,r,+r.start);later=applyRecoverySetting(base,r,+r.start+60000)`);
  assert.equal(a.run(`fixed.setpoints.${field}`),value);assert.equal(a.run(`later.setpoints.${field}`),58);
  a.run(`p=stagePlan([],fixed,+r.start,to,e,r,rows)`);assert.equal(a.run(`p.setup.setpoints.${field}`),value);
 }
});
test('reported cold readings produce real heat at 70°F and a review before overshoot',()=>{
 for(const out of [20,41,45,55]){
  const a=scene(out);a.run('action=recoveryAction(e,r)');
  assert.ok(a.run('action'));assert.equal(a.run('action.setup.setpoints.heat'),70);
  assert.ok(a.run('action.trials.every(t=>t.heatMinutes>0&&t.finalIndoor>58)'));
  assert.ok(a.run('action.reviewAt>+r.start&&action.reviewAt<=to'));
  assert.match(a.run('recoveryActionHTML(action)'),/70°F/);
  assert.doesNotMatch(a.run('recoveryActionHTML(action)'),/Select HEAT PUMP at 58°F/);
 }
});
test('coupled heat balance includes storage, external losses, gains, and cancels interzone exchange',()=>{
 const a=app();a.run(`old=[58,57];mass=[120,150];ua=[40,80];incoming=[3,7];source=[10500,4500];dt=1/120;out=41;
 next=coupledAdvance(old,mass,ua,incoming,0,180,source,out,dt,1.08);
 storage=next.reduce((sum,t,z)=>sum+mass[z]*(t-old[z])/dt,0);
 net=next.reduce((sum,t,z)=>sum+source[z]+(ua[z]+1.08*incoming[z])*(out-t),0)`);
 close(a.run('storage'),a.run('net'),1e-7);
});
test('fixed source output is independent of a higher setpoint while both call continuously',()=>{
 const a=scene();a.run(`short=rows.slice(0,4);low=simulatePlan([{time:+r.start,setup:withSetting(planSetup('furnace',false),70)}],e,r,AIR_SCENARIOS[0],short);
 high=simulatePlan([{time:+r.start,setup:withSetting(planSetup('furnace',false),80)}],e,r,AIR_SCENARIOS[0],short)`);
 close(a.run('low.finalIndoor'),a.run('high.finalIndoor'));
});
test('ready=false cannot render an approved full plan even when temperature trajectory is suitable',()=>{
 const a=scene();a.run(`p=evaluatePlan([{time:+r.start,setup:planSetup('furnace',false)}],e,r,rows);p.suitable=true;p.ready=false;p.reason='Not ready at bedtime';result={winner:p,bounds:planBounds(r.start,r),request:r,envelope:e};html=renderPlan(result)`);
 assert.match(a.run('html'),/No suitable current setup/);
});
