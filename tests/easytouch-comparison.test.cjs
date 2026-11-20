const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');

function scene(){
    const a=app();
    a.run(`forecast.timeZone='America/Chicago';state.temp=55;state.rh=40;state.wind=2;
      r={start:new Date('2026-10-21T17:00Z'),reading:new Date('2026-10-21T17:00Z'),
          initial:{temperature:[61,61],rh:[42,42]},occupancy:'staying'};
      end=+r.start+3*3600000;handoff=+r.start+30*60000;
      e=makeEnvelope(r.start,new Date(end),'Synthetic sensor test',30000);
      rows=planRows(e,r,.5,[handoff,end]).filter(row=>row.to<=end);
      setup=withSetting(planSetup('hp',false,null,'Low'),66);
      ph=[{time:+r.start,setup}];sensor={bias:3,lagMinutes:0};`);
    return a;
}

test('comparison bias translates all four thermostat boundaries without changing the control law',()=>{
    const a=scene();
    a.run(`sense=front=>advanceComparisonSensor(0,front,front,0,sensor);
      demand=(mode,front,phase)=>thermostatDemand(mode,sense(front),{heat:66,cool:72},{phase},55);`);
    for(const mode of ['hp','auto']){
        assert.equal(a.run(`demand('${mode}',61.01,'off')`),'off');
        assert.equal(a.run(`demand('${mode}',61,'off')`),'hp');
        assert.equal(a.run(`demand('${mode}',63.99,'hp')`),'hp');
        assert.equal(a.run(`demand('${mode}',64,'hp')`),'off');
    }
    for(const mode of ['ac','auto']){
        assert.equal(a.run(`demand('${mode}',70.99,'off')`),'off');
        assert.equal(a.run(`demand('${mode}',71,'off')`),'ac');
        assert.equal(a.run(`demand('${mode}',68.01,'ac')`),'ac');
        assert.equal(a.run(`demand('${mode}',68,'ac')`),'off');
    }
    assert.equal(a.run(`thermostatDemand('hp',61,{heat:66,cool:72},{phase:'off'},55)`),'hp');
});

test('lag is continuous across a cached restart and leaves the live envelope and output untouched',()=>{
    const a=scene();
    a.run(`baseline=JSON.stringify(simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows,null,false,true));
      experimental={...e,comparisonSensor:{bias:3,lagMinutes:5}};
      full=simulatePlan(ph,experimental,r,AIR_SCENARIOS[0],rows,null,true,true);
      checkpoint=full.checkpoints.find(p=>p.time===handoff);
      resumed=simulatePlan(ph,experimental,r,AIR_SCENARIOS[0],rows,{time:handoff,carry:checkpoint,prefix:full},false,true);
      after=JSON.stringify(simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows,null,false,true));`);
    assert.equal(a.run('Number.isFinite(checkpoint.sensorReading)'),true);
    for(const field of ['trace','segments','finalZones','heatMinutes','coolMinutes']){
        assert.equal(a.run(`JSON.stringify(full.${field})===JSON.stringify(resumed.${field})`),true,field);
    }
    assert.equal(a.run('baseline===after'),true);
    assert.equal(a.run('e.comparisonSensor===undefined'),true);
    assert.equal(a.run('JSON.stringify(full.segments)!==JSON.stringify(JSON.parse(baseline).segments)'),true);
});

test('synthetic heating and cooling fixtures have no call shorter than, or starting within, three minutes',()=>{
    const a=scene();
    for(const [mode,out,initial,setpoint,operation] of [['hp',55,61,66,'hp'],['ac',88,77,72,'ac']]){
        for(const fan of ['Auto','Low']){
            for(const lag of [0,5,10]){
                a.run(`state.temp=${out};r.initial.temperature=[${initial},${initial}];
                    e=makeEnvelope(r.start,new Date(end),'Synthetic sensor test',30000);
                    e.comparisonSensor={bias:3,lagMinutes:${lag}};
                    rows=planRows(e,r,.5,[end]).filter(row=>row.to<=end);
                    ph=[{time:+r.start,setup:withSetting(planSetup('${mode}',false,null,'${fan}'),${setpoint})}];
                    trial=simulatePlan(ph,e,r,AIR_SCENARIOS[0],rows,null,false,true);
                    summary=sensorComparisonSummary({winner:{suitable:true,ready:true,trials:[trial],phases:ph},request:r});`);
                assert.ok(a.run(`summary.blocks.some(b=>b.operation==='${operation}')`),`${mode} ${fan} ${lag}`);
                assert.ok(a.run("summary.blocks.filter(b=>b.operation!=='off').every((b,i,c)=>i===0||b.start-c[i-1].start>=180000)"),
                    `${mode} ${fan} ${lag}`);
                // v6.6.26: the scope's WP3 no-chatter rule itself: no completed call (one that ends before the
                // horizon) is shorter than 3 minutes. Shortest at v6.6.26: 3.22 min (heat pump, zero lag).
                assert.ok(a.run("summary.blocks.filter(b=>b.operation!=='off'&&b.end<end).every(b=>b.end-b.start>=180000)"),
                    `call shorter than 3 min: ${mode} ${fan} ${lag}`);
            }
        }
    }
});
