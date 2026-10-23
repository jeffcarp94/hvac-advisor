const test=require('node:test');
const assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
const close=(actual,expected,tol=1e-7)=>assert.ok(Math.abs(actual-expected)<tol,`${actual} != ${expected}`);
function setup(){
    const a=app();
    a.run(`env={tOut:80,ua:100,gains:1000,mass:300};sp={cool:72,heat:70,auto:71,fan:72};
        start=new Date('2026-10-21T17:00Z');end=new Date('2026-10-21T18:07Z');
        envelope={windowStart:start,windowEnd:end,wind:0,cloud:0,points:[{time:start,tOut:80,rh:30,wind:0,cloud:0}]};`);
    return a;
}

test('zero time preserves starting temperature for every equipment mode',()=>{
    const a=setup();
    for(const mode of ['passive','ac','hp','furnace','auto','maxxfan']){
        assert.equal(a.run(`thermalStep('${mode}',85,env,sp,0).temperature`),85);
        assert.equal(a.run(`thermalStep('${mode}',55,env,sp,0).segments.length`),0);
    }
});

test('cab exterior shades and coach interior day screens contribute separate solar gains',()=>{
    const a=setup();close(a.run('effectiveGlassSHGC()'),.32);
    assert.equal(a.run('solarLoad(1,true)'),4604);
    assert.equal(a.run('solarLoad(1,false)'),0);
    a.run('C.cabGlassFraction=1');close(a.run('effectiveGlassSHGC()'),.20);
    a.run('C.cabGlassFraction=0');close(a.run('effectiveGlassSHGC()'),.50);
    a.run('C.cabGlassSHGC=.30;C.coachDayGlassSHGC=.61;C.cabGlassFraction=.50');
    const high=a.run("thermalStep('passive',72,thermalEnvironment(80,5,1,true,1400),sp,1).temperature");
    a.run('C.cabGlassSHGC=.12;C.coachDayGlassSHGC=.44;C.cabGlassFraction=.70');
    assert.ok(a.run("thermalStep('passive',72,thermalEnvironment(80,5,1,true,1400),sp,1).temperature")<high);
});

test('finite cooling agrees with the analytic heat balance and reaches target later',()=>{
    const a=setup();
    const eq=80+(1000-11250)/100;
    close(a.run("thermalStep('ac',85,env,sp,1/60).temperature"),eq+(85-eq)*Math.exp(-(1/60)/3));
    const mins=a.run(`s=simulateThermalProfile('ac',envelope,false,sp,1400,85,{checkEquipment:false});targetTimeMinutes(s,72,'cool')`);
    assert.ok(mins>1&&mins<67);
    assert.equal(a.run('s.trace[0].indoor'),85);
    assert.equal(a.run('s.trace[0].time.getTime()'),a.run('start.getTime()'));
    assert.ok(Math.abs(a.run('s.finalIndoor')-72)<.6); // two zones need not have equal temperatures
});

test('heat recovery starts from actual cabin temperature even when passive equilibrium is warm',()=>{
    const a=setup();
    assert.equal(a.run("thermalStep('furnace',55,env,sp,1/60).segments[0].operation"),'furnace');
    const strong=a.run("thermalStep('furnace',55,env,sp,1/60).temperature");
    a.run('C.furnaceOutput=7500');
    assert.ok(a.run("thermalStep('furnace',55,env,sp,1/60).temperature")<strong);
    assert.ok(strong<70);
    a.run('env.tOut=40;env.gains=0');
    assert.equal(a.run("thermalStep('ac',85,env,sp,1/60).segments[0].operation"),'ac');
});

test('capacity shortfall approaches a forced equilibrium without an instantaneous jump',()=>{
    const a=setup();a.run('env.tOut=120;env.ua=300;env.gains=3000');
    const eq=120+(3000-11250)/300;
    close(a.run("thermalStep('ac',85,env,sp,.25).temperature"),eq+(85-eq)*Math.exp(-.25));
    assert.equal(a.run("thermalStep('ac',85,env,sp,.25).segments[0].capacityLimited"),true);
    a.run('env.tOut=80;env.ua=100;env.gains=1000');
    assert.equal(a.run("thermalStep('ac',85,env,sp,.01).segments[0].capacityLimited"),false);
});

test('wind changes response rate without changing effective thermal mass',()=>{
    const a=setup();a.run('calm=thermalEnvironment(40,0,0,false,0);windy=thermalEnvironment(40,20,0,false,0)');
    close(a.run('calm.mass'),273.14285714285717);
    assert.equal(a.run('calm.mass'),a.run('windy.mass'));
    assert.ok(a.run("thermalStep('passive',80,windy,sp,.25).temperature")<a.run("thermalStep('passive',80,calm,sp,.25).temperature"));
});

test('ventilation flow has finite response, respects thermostat, and can import heat',()=>{
    const a=setup();a.run('env.tOut=65');
    const fast=a.run("thermalStep('maxxfan',85,env,sp,1/60).temperature");
    assert.ok(fast>72&&fast<85);
    a.run('C.maxxFanCFM=100');assert.ok(a.run("thermalStep('maxxfan',85,env,sp,1/60).temperature")>fast);
    assert.equal(a.run("thermalStep('maxxfan',65,env,sp,1/60).segments[0].operation"),'off');
    a.run('env.tOut=95');assert.ok(a.run("thermalStep('maxxfan',85,env,sp,1/60).temperature")>85);
});

test('AUTO uses two-degree triggers, recovers to setpoint, then drifts while off',()=>{
    const a=setup();
    a.run("autoStep=thermalStep('auto',71,env,sp,2)");
    assert.equal(a.run('autoStep.segments[0].operation'),'off');
    close(a.run('autoStep.segments[0].t1'),73);
    assert.equal(a.run('autoStep.segments[1].operation'),'ac');
    close(a.run('autoStep.segments[1].t1'),71);
    assert.equal(a.run('autoStep.segments[2].operation'),'off');
    a.run('env.tOut=40;env.gains=0');
    a.run("autoHeat=thermalStep('auto',71,env,sp,2)");
    close(a.run('autoHeat.segments[0].t1'),69);
    assert.equal(a.run('autoHeat.segments[1].operation'),'hp');
    close(a.run('autoHeat.segments[1].t1'),71);
});

test('all profiles include the partial final interval and obey weather boundaries causally',()=>{
    const a=setup();
    a.run(`envelope.points.push({time:new Date(start.getTime()+17*60000),tOut:40,rh:30,wind:0,cloud:0});
        s=simulateThermalProfile('passive',envelope,false,sp,1400,75,{checkEquipment:false});`);
    close(a.run('s.segments.reduce((sum,x)=>sum+x.hours,0)'),67/60);
    assert.equal(a.run('s.trace.at(-1).time.getTime()'),a.run('end.getTime()'));
    assert.equal(a.run('s.trace.some(p=>p.elapsedMin===17)'),true);
    a.run("unchanged=simulateThermalProfile('passive',{...envelope,points:[envelope.points[0]]},false,sp,1400,75,{checkEquipment:false})");
    close(a.run('s.trace.find(p=>p.elapsedMin===17).indoor'),a.run('unchanged.trace.find(p=>p.elapsedMin===17).indoor'));
    assert.ok(a.run('s.finalIndoor')<a.run('unchanged.finalIndoor'));
});

test('an Overnight window still receives solar gain after dawn at the selected location',()=>{
    const a=setup();a.run(`forecast.timeZone='America/Chicago';envelope.lat=41.3;envelope.lon=-94;
        envelope.windowStart=new Date('2026-06-21T10:00Z');envelope.windowEnd=new Date('2026-06-21T13:00Z');
        envelope.points[0].time=envelope.windowStart;
        dark=simulateThermalProfile('passive',envelope,true,sp,1000,72,{checkEquipment:false});`);
    a.run(`envelope.points[0].cloud=1;envelope.cloud=1;
        sun=simulateThermalProfile('passive',envelope,true,sp,1000,72,{checkEquipment:false});`);
    assert.ok(a.run('sun.finalIndoor')>a.run('dark.finalIndoor'));
    assert.equal(a.run("solarLoad(1,true,new Date('2026-06-21T05:00Z'),41.3,-94)"),0);
    a.run(`coarseSun=simulateThermalProfile('passive',envelope,true,sp,1000,72,{checkEquipment:false,maxStepMin:15});
        fineSun=simulateThermalProfile('passive',envelope,true,sp,1000,72,{checkEquipment:false,maxStepMin:1});`);
    assert.ok(a.run('Math.abs(sun.finalIndoor-fineSun.finalIndoor)')<.05);
    assert.ok(a.run('Math.abs(sun.finalIndoor-fineSun.finalIndoor)')<=a.run('Math.abs(coarseSun.finalIndoor-fineSun.finalIndoor)')+.001);
});

test('comfort score integrates degree-hours and crossing time rather than sample count',()=>{
    const a=setup();
    close(a.run('segmentComfort({t0:75,t1:75,eq:75,tau:2,hours:2},{low:68,high:72}).score'),12);
    close(a.run('segmentComfort({t0:65,t1:65,eq:65,tau:2,hours:.5},{low:68,high:72}).score'),1.5);
    close(a.run('segmentComfort({t0:75,t1:75,eq:75,tau:2,hours:2},{low:68,high:72}).hoursOut'),2);
});

test('Current and scheduled evaluations share the same physics and full end time',()=>{
    const a=setup();
    a.run("state.indoor=85;profile=simulateThermalProfile('furnace',envelope,false,sp,C.metaAwake,85,{currentContext:true});current=simulateCurrentMode('furnace',envelope,85,70,'heat',sp,start,end);scheduled=evaluateCandidate('furnace',envelope,false,sp,C.metaAwake)");
    close(a.run('current.finalIndoor'),a.run('Math.round(profile.finalIndoor*10)/10'));
    assert.equal(a.run('current.finalIndoor'),a.run('scheduled.finalIndoor'));
    assert.equal(a.run('current.trace.at(-1).time.getTime()'),a.run('end.getTime()'));
});
