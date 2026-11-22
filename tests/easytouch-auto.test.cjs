const test=require('node:test');
const assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');

// v6.7.1 (owner decision, November 21, 2026): 1°F Heat and Cool gaps; 2°F firmware minimum AUTO spread
// (owner observation: HEAT TO 64 / COOL TO 67 accepted, 2°F appears to be the minimum).
test('installed gaps are 1°F for both modes and dual controls reject invalid pairs',()=>{
 const a=app();
 assert.equal(a.run('EASYTOUCH.heatGap'),1);
 assert.equal(a.run('EASYTOUCH.coolGap'),1);
 assert.equal(a.run('EASYTOUCH.minAutoSpread'),2);
 assert.equal(a.run('validDualSetpoints({heat:68,cool:72})'),true);
 assert.equal(a.run('validDualSetpoints({heat:65,cool:67})'),true);
 for(const p of [{heat:68,cool:69},{heat:68,cool:68},{heat:70.5,cool:75},{heat:39,cool:70},{heat:68,cool:91}])
   assert.equal(a.run('validDualSetpoints('+JSON.stringify(p)+')'),false);
 assert.equal(a.run("settingValues(planSetup('auto',true)).every(validDualSetpoints)"),true);
});

test('AUTO heat hysteresis begins at HEAT TO minus 1 and stops at HEAT TO plus 1',()=>{
 const a=app();
 a.run("env={tOut:55,ua:100,gains:0,mass:300};sp={heat:68,cool:72};control={phase:'off'}");
 assert.equal(a.run("thermalDemand('auto',67.01,env,sp,control)"),'off');
 assert.equal(a.run("thermalDemand('auto',67,env,sp,control)"),'hp');
 assert.equal(a.run('control.phase'),'hp');
 assert.equal(a.run("thermalDemand('auto',68,env,sp,control)"),'hp');
 assert.equal(a.run("thermalDemand('auto',69,env,sp,control)"),'off');
 assert.equal(a.run('control.phase'),'off');
});

test('AUTO cooling begins at COOL TO plus 1 and ends at COOL TO minus 1',()=>{
 const a=app();
 a.run("env={tOut:90,ua:100,gains:0,mass:300};sp={heat:68,cool:72};control={phase:'off'}");
 assert.equal(a.run("thermalDemand('auto',72.99,env,sp,control)"),'off');
 assert.equal(a.run("thermalDemand('auto',73,env,sp,control)"),'ac');
 assert.equal(a.run("thermalDemand('auto',72,env,sp,control)"),'ac');
 assert.equal(a.run("thermalDemand('auto',71,env,sp,control)"),'off');
 assert.equal(a.run('control.phase'),'off');
});

test('both AUTO choices use real setpoint pairs; furnace mode never requests heat pump',()=>{
 const a=app();
 assert.equal(a.run("planSetups(true).some(x=>x.type==='auto_furnace')"),true);
 const hp=a.run("setupForMode('auto',{heat:68,cool:72},'Auto',false)");
 assert.match(hp,/AUTO HEAT PUMP/);
 assert.match(hp,/HEAT TO 68°F and COOL TO 72°F/);
 assert.doesNotMatch(hp,/midpoint/);
 const gas=a.run("setupForMode('auto_furnace',{heat:68,cool:72},'Auto',false)");
 assert.match(gas,/AUTO FURNACE/);
 assert.match(gas,/HEAT TO 68°F and COOL TO 72°F/);
 a.run("env={tOut:55,ua:100,gains:0,mass:300};sp={heat:68,cool:72}");
 assert.equal(a.run("thermalDemand('auto_furnace',65,env,sp,{phase:'off'})"),'furnace');
 assert.equal(a.run("thermalDemand('auto',65,env,sp,{phase:'off'})"),'hp');
 a.run('env.tOut=41');
 assert.equal(a.run("thermalDemand('auto',65,env,sp,{phase:'off'})"),'furnace');
});

test('the planner stores and compares both AUTO setpoints and never changes fixed gaps',()=>{
 const a=app();
 a.run("base=planSetup('auto',false);newSetup=withSetting(base,{heat:69,cool:75})");
 assert.equal(a.run('newSetup.setpoints.heat'),69);
 assert.equal(a.run('newSetup.setpoints.cool'),75);
 assert.equal(a.run('sameSetup(base,newSetup)'),false);
 assert.equal(a.run("sameSetup(newSetup,withSetting(base,{heat:69,cool:75}))"),true);
 assert.equal(a.run('EASYTOUCH.heatGap'),1);
 assert.equal(a.run('EASYTOUCH.coolGap'),1);
});

test('AUTO search includes lower independent controls for bedroom cooling preparation',()=>{
 const a=app();
 for(const mode of ['auto','auto_furnace']){
  a.run(`values=settingValues(planSetup('${mode}',true))`);
  assert.equal(a.run('values.some(p=>p.heat===62&&p.cool===66)'),true);
  assert.equal(a.run('values.every(validDualSetpoints)'),true);
 }
});

test('away AUTO entries and remote actions preserve both independently entered setpoints',()=>{
 const a=app();
 a.setNow('2026-10-24T03:00Z');
 a.run("forecast.timeZone='America/Chicago';updatePlanUI()");
 for(const [id,value] of Object.entries({occupancyMode:'away',returnTime:'2026-10-24T06:00',bedTemp:'68',frontTemp:'68',bedRH:'40',frontRH:'40',readingTime:'2026-10-23T22:00',actualHeatSetpoint:'66',actualCoolSetpoint:'73'}))a.element(id).value=value;
 a.element('remoteAccess').checked=true;a.element('setupConfirmed').checked=true;
 for(const mode of ['auto','auto_furnace']){
  a.element('actualMode').value=mode;
  a.run('r=readPlanRequest()');
  assert.equal(a.run('r.actual.setpoints.heat'),66);
  assert.equal(a.run('r.actual.setpoints.cool'),73);
  assert.match(a.run('planActionText({time:+r.start,setup:r.actual},r)'),/HEAT TO 66°F and COOL TO 73°F/);
 }
 a.element('actualCoolSetpoint').value='67'; // v6.7.1: 2°F minimum spread
 assert.throws(()=>a.run('readPlanRequest()'),/at least 2°F/);
});
