const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
const close=(a,b,tolerance)=>assert.ok(Math.abs(a-b)<tolerance,`${a} vs ${b}`);

test('ISO cooling and heating anchors reproduce their independent ratings',()=>{
 const a=app();
 a.run(`rated=wp6CoolingOutput(80.6,WP6_NOMINAL_RATING.inHumidity,95,SEA_LEVEL_PA,'High');`);
 close(a.run('rated.total'),15000,.01);
 close(a.run('rated.shr'),0.658,.001);
 close(a.run('rated.sensible+rated.latent'),a.run('rated.total'),1e-7);
 assert.ok(a.run('rated.bypass>0&&rated.bypass<1&&rated.waterLbHr>0&&!rated.clamped'));
 close(a.run("wp6HeatOutput(44.6,'High').btuh/3.412141633"),2822,1e-7);
 assert.throws(()=>a.run('wp6Rating(95,200)'),/No rated apparatus dew point/);
 assert.throws(()=>a.run('wp6Rating(90,200)'),/No rated apparatus dew point/);
 assert.ok(a.run('wp6Rating(98,200).bypass>0'));
});

test('coil flow, altitude, dry operation and curve bounds are explicit',()=>{
 const a=app();a.run(`pressure=sitePressurePa(1500);dry=wp6CoolingOutput(80,humidityRatio(80,10,pressure),95,pressure,'High');
   wet=wp6CoolingOutput(80,humidityRatio(80,55,pressure),95,pressure,'High');
   hot=wp6CoolingOutput(89,humidityRatio(89,60),125,SEA_LEVEL_PA,'Low');`);
 assert.equal(a.run('dry.shr'),1);
 assert.equal(a.run('dry.waterLbHr'),0);
 assert.ok(a.run('wet.shr<1&&wet.waterLbHr>0&&wet.bypass>0&&wet.bypass<1'));
 assert.ok(a.run("wp6Cfm('Low')<wp6Cfm('Medium')&&wp6Cfm('Medium')<wp6Cfm('High')"));
 assert.ok(a.run('hot.clamped'));
 assert.ok(a.run(`[64.4,75,85,95,105,115].map(t=>wp6CoolingOutput(80,humidityRatio(80,50),t,SEA_LEVEL_PA,'High').total)
      .every((total,i,values)=>!i||total<values[i-1])`));
 assert.throws(()=>a.run("wp6Cfm('Low',{lowFraction:.9,mediumFraction:.8})"),/ordering/);
});

test('experimental changeover preserves hysteresis at equality and between thresholds',()=>{
 const a=app();a.run('config={deltaF:3,hysteresisF:5};');
 for(const [prior,temperature,out] of [['hp',46,'hp'],['hp',45,'furnace'],['furnace',45,'furnace'],['furnace',50,'furnace'],['furnace',50.01,'hp']]){
    assert.equal(a.run(`wp6HeatSource('${prior}',${temperature},config)`),out);
 }
 assert.equal(a.run("wp6HeatSource('hp',39,{deltaF:-3,hysteresisF:0})"),'furnace');
 assert.equal(a.run('heatSourceForPumpMode(42)'),'hp');
});

test('comparison heat-source memory carries through cached simulation and leaves live decisions isolated',()=>{
 const a=app();
 a.run(`forecast.timeZone='America/Chicago';state.temp=45;state.rh=40;state.wind=2;
 r={start:new Date('2026-10-21T17:00Z'),initial:{temperature:[58,58],rh:[42,42]},occupancy:'staying'};
 handoff=+r.start+15*60000;end=+r.start+30*60000;e=makeEnvelope(r.start,new Date(end),'Synthetic',30000);
 rows=planRows(e,r,.5,[handoff,end]).filter(row=>row.to<=end);
 ph=[{time:+r.start,setup:planSetup('hp',false)}];
 before=JSON.stringify(simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows,null,false,true));
 experimental={...e,capacityComparison:{deltaF:0,hysteresisF:5,startHeatSource:'furnace'}};
 full=simulatePlan(ph,experimental,r,AIR_SCENARIOS[0],rows,null,true,true);
 stateAt=full.checkpoints.find(p=>p.time===handoff);
 resumed=simulatePlan(ph,experimental,r,AIR_SCENARIOS[0],rows,{time:handoff,carry:stateAt,prefix:full},false,true);
 after=JSON.stringify(simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows,null,false,true));`);
 assert.equal(a.run('stateAt.comparisonHeatSource'),'furnace');
 assert.equal(a.run('JSON.stringify(full.segments)===JSON.stringify(resumed.segments)'),true);
 assert.equal(a.run('JSON.stringify(full.trace)===JSON.stringify(resumed.trace)'),true);
 assert.equal(a.run('before===after&&e.capacityComparison===undefined'),true);
 assert.equal(a.run("full.segments[0].operation"),'furnace');
 assert.equal(a.run("JSON.parse(before).segments[0].operation"),'hp');
});

// v6.6.27 (D2): the WP6 models are live; legacyCapacity:true gives the pre-v6.6.27 capacities for comparison.
test('live WP6 capacities differ from the legacy capacities in the expected direction',()=>{
 const a=app();
 a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=false;
    r={start:new Date('2026-10-21T17:00Z'),initial:{temperature:[78,80],rh:[49,50]},occupancy:'staying'};
    end=+r.start+20*60000;
    function trials(mode,out,zone){
        state.temp=out;r.initial.temperature=zone;
        const e=makeEnvelope(r.start,new Date(end),'Synthetic capacity comparison',30000);
        const rows=planRows(e,r).filter(row=>row.to<=end);
        const setup=planSetup(mode,false,null,'High');
        const phases=[{time:+r.start,setup}];
        return [{...e,legacyCapacity:true},e].map(env=>simulatePlan(phases,env,r,AIR_SCENARIOS[0],rows,null,false,true));
    }
    hot=trials('ac',98,[78,80]);mild=trials('hp',44.6,[58,58]);`);
 assert.ok(a.run('hot.every(t=>t.didCool&&t.moisture.totals.ac>0)'));
 assert.ok(a.run('hot[1].finalIndoor>hot[0].finalIndoor'));
 assert.ok(a.run('mild.every(t=>t.didHeat)'));
 assert.ok(a.run('mild[1].finalIndoor<mild[0].finalIndoor'));
});
