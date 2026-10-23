const test=require('node:test');
const assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function setup({temp=65,rh=40,indoor=72,indoorRH=40,hours=2,wind=5}={}){
    const a=app();
    a.run(`forecast.timeZone='America/Chicago';state.indoor=${indoor};state.indoorRH=${indoorRH};
        e={windowStart:new Date('2026-10-24T03:00Z'),windowEnd:new Date(Date.parse('2026-10-24T03:00Z')+${hours}*3600000),wind:${wind},cloud:0,
        points:[{time:new Date('2026-10-24T03:00Z'),tOut:${temp},rh:${rh},wind:${wind},cloud:0}]};sp=confirmedSetpoints(true);`);
    return a;
}
test('confirmed daytime and sleep thermostat settings are fixed',()=>{
    const a=setup();
    assert.equal(a.run('confirmedSetpoints(false).heat'),70);assert.equal(a.run('confirmedSetpoints(false).cool'),72);
    assert.equal(a.run('confirmedSetpoints(true).heat'),66);assert.equal(a.run('confirmedSetpoints(true).cool'),68);
});
test('window geometry uses measured sections and exactly closed/half/full positions',()=>{
    const a=setup();
    near(a.run('WINDOW_SECTIONS[2].height'),25.25);
    near(a.run('WINDOW_SECTIONS.filter(s=>s.bed===\'Jeff\').reduce((x,s)=>x+s.width,0)'),43.25);
    near(a.run('openingArea(WINDOW_SECTIONS[2],2)'),2*(16.875+25.25)*.00064516);
    near(a.run('WINDOW_SECTIONS.reduce((sum,s)=>sum+openingArea(s,4),0)'),801.5*.00064516);
    assert.equal(a.run('openingArea(WINDOW_SECTIONS[0],0)'),0);
    assert.throws(()=>a.run('openingArea(WINDOW_SECTIONS[0],1)'),/closed, half open, or full open/);
    assert.equal(a.run('fanConfigurations().every(c=>[0,1].includes(c.fanZone)&&c.gaps.every(g=>[0,2,4].includes(g)))'),true);
});
test('airflow is restricted by openings, capped at the fan rating, and conserves mass',()=>{
    const a=setup();
    a.run(`small={fanZone:0,gaps:[0,0,0,2,0,0]};large={fanZone:0,gaps:[4,4,4,4,4,4]};
        x=ventilationNetwork(small,[72,72],65,0,1);y=ventilationNetwork(large,[72,72],65,0,1);`);
    assert.ok(a.run('x.exhaust')<a.run('y.exhaust'));
    assert.ok(a.run('y.exhaust')<=900);
    assert.ok(a.run('Math.abs(y.residual)')<.1);
    // With mid-coach intakes and bedroom exhaust, bulk flow must go toward beds.
    assert.ok(a.run('x.bulk')<0);
});
test('open windows retain natural exchange after the fan stops and the roof lid closes',()=>{
    const a=setup();a.run(`c={fanZone:0,gaps:[0,0,0,4,4,0]};
        open=ventilationNetwork(c,[68,68],55,12,0,AIR_SCENARIOS[1]);closed=ventilationNetwork(null,[68,68],55,12,0);`);
    assert.equal(a.run('open.exhaust'),0);
    a.run('calm=ventilationNetwork(c,[68,68],55,0,0)');
    assert.ok(a.run('calm.incoming.reduce((a,b)=>a+b)')>a.run('closed.incoming.reduce((a,b)=>a+b)')); // single-sided buoyancy
    assert.ok(a.run('open.incoming.reduce((a,b)=>a+b)')>a.run('closed.incoming.reduce((a,b)=>a+b)'));
    assert.equal(a.run('autoVentSpeed(68,68)'),0);
    assert.ok(a.run('autoVentSpeed(69,68)')<a.run('autoVentSpeed(73,68)'));
});
test('coupled solver conserves total heat and water when only interzone mixing occurs',()=>{
    const a=setup();
    a.run(`old=[65,80];caps=[100,200];next=coupledAdvance(old,caps,[0,0],[0,0],0,100,[0,0],0,.25,1.08)`);
    near(a.run('next[0]*100+next[1]*200'),65*100+80*200);
    assert.ok(a.run('next[0]')>65);assert.ok(a.run('next[1]')<80);
    a.run('m=coupledAdvance([.006,.012],[30,50],[0,0],[0,0],0,60,[0,0],0,.1,4.5)');
    near(a.run('m[0]*30+m[1]*50'),.006*30+.012*50);
});
test('moisture helpers preserve RH and surface condensation depends on dew point, not RH alone',()=>{
    const a=setup();near(a.run('rhFromRatio(68,humidityRatio(68,55))'),55);
    a.run('dry=surfaceAssessment(68,40,humidityRatio(68,30));wet=surfaceAssessment(68,40,humidityRatio(68,65))');
    assert.equal(a.run('dry.condensation'),false);assert.equal(a.run('wet.condensation'),true);
    assert.ok(a.run('wet.surfaceRH')>a.run('dry.surfaceRH'));
    assert.equal(a.run('moistureRemoval(68,49,true)'),0);
    assert.equal(a.run('moistureRemoval(68,70,false)'),0);
    assert.ok(a.run('moistureRemoval(75,70,true)')>a.run('moistureRemoval(55,70,true)'));
});
test('condensation is a rejection even when temperature is comfortable, including initial conditions',()=>{
    const a=setup({temp:45,rh:30,indoor:68,indoorRH:70,hours:.25});
    a.run(`c=modelCandidate('furnace',e,true,sp,1000,68)`);
    assert.equal(a.run('c.moistureEligible'),false);assert.equal(a.run('c.suitable'),false);
    assert.match(a.run('c.moistureReason'),/Condensation/);
    assert.equal(a.run('c.equipmentEligible'),true);
});
test('dynamic indoor moisture responds to occupants and removal without treating 50% as measured RH',()=>{
    const a=setup({temp:68,rh:45,indoorRH:60});
    a.run(`state.dehumidifierEnabled=false;off=zoneProfile('passive',e,true,sp,1000,72);state.dehumidifierEnabled=true;on=zoneProfile('passive',e,true,sp,1000,72)`);
    assert.ok(a.run('on.trace.at(-1).midRH')<a.run('off.trace.at(-1).midRH'));
    assert.ok(Math.abs(a.run('on.trace.at(-1).rh')-50)>1);
    assert.equal(a.run('on.moisture.estimated'),false);
    a.run(`state.indoorRH=null;unknown=zoneProfile('passive',e,true,sp,1000,72)`);assert.equal(a.run('unknown.moisture.estimated'),true);
});
test('bedside inlet exposure is penalized more than indirect intake under cool sleeping conditions',()=>{
    const a=setup({temp:60,rh:30,wind:8,hours:1});
    a.run(`direct=zoneProfile('maxxfan',e,true,sp,1000,72,{config:{fanZone:1,fanName:'Mid-coach MaxxFan',gaps:[4,0,4,0,0,0]}});
        indirect=zoneProfile('maxxfan',e,true,sp,1000,72,{config:{fanZone:0,fanName:'Bedroom MaxxFan',gaps:[0,0,0,4,4,0]}})`);
    assert.ok(a.run('direct.draftScore')>a.run('indirect.draftScore'));
    assert.ok(a.run('direct.draftScore')>0);
});
test('AUTO does not earn dual-mode preference for brief calls or unnecessary reheating above 65°F',()=>{
    const a=setup();a.run(`auto={suitable:true,heatMinutes:2,coolMinutes:15,scenarioResults:[{heatMinutes:2,coolMinutes:15}]};ac={suitable:true};heat={suitable:false};need=autoNeedAssessment(auto,ac,heat)`);
    assert.equal(a.run('need.sustainedNeed'),false);assert.equal(a.run('need.likelihood'),'Low');assert.equal(a.run('need.unnecessaryHeat'),true);
    a.run(`auto.heatMinutes=30;auto.scenarioResults=[auto];need=autoNeedAssessment(auto,ac,heat)`);assert.equal(a.run('need.sustainedNeed'),false);
    a.run(`ac.suitable=false;need=autoNeedAssessment(auto,ac,heat)`);assert.equal(a.run('need.sustainedNeed'),true);assert.equal(a.run('need.likelihood'),'High');
});
test('AUTO resolves the 65°F heating trigger without a numerical step below the floor',()=>{
    const a=setup({temp:50,rh:15,indoorRH:15,hours:3});
    a.run(`state.dehumidifierEnabled=false;C.metaSleep=0;
        s=zoneProfile('auto',e,true,sp,0,72,{checkEquipment:false});`);
    assert.ok(a.run('Math.min(...s.trace.map(p=>p.bedroom))')>=65-1e-6);
    assert.equal(a.run('s.didHeat'),true);assert.equal(a.run('s.didCool'),true);
    assert.equal(a.run('s.floorCompliant'),true);
});
test('equipment policies remain independent from moisture/comfort and use actual cooling calls',()=>{
    const a=setup({temp:35,rh:30,indoor:65,indoorRH:40,hours:.5});
    a.run(`sp.cool=64;c=modelCandidate('ac',e,false,sp,1400,65)`);
    assert.equal(a.run('c.equipmentEligible'),false);assert.equal(a.run('c.equipmentIssueCode'),'cooling-ice');
    assert.equal(a.run('c.fanSpeed'),'High');
    assert.match(a.run('methodologyProblem(c).text'),/FAN ONLY/);
});
test('fixed heat/cool targets replace optimization; all alternatives share the same comfort policy',()=>{
    const a=setup({hours:.5});
    for(const mode of ['ac','auto','hp','furnace','passive']){
        a.run(`c=optimizeCandidate('${mode}',e,true,1000)`);
        assert.equal(a.run('c.comfortLow'),65);assert.equal(a.run('c.comfortHigh'),69);
        if(mode==='ac')assert.equal(a.run('c.optimizedSet'),68);
        if(mode==='hp'||mode==='furnace')assert.equal(a.run('c.optimizedSet'),66);
    }
});
test('substep refinement converges and no weather interval is applied early',()=>{
    const a=setup({temp:80,hours:1});
    a.run(`coarse=zoneProfile('passive',e,false,confirmedSetpoints(false),1400,75,{maxStepMin:.5});fine=zoneProfile('passive',e,false,confirmedSetpoints(false),1400,75,{maxStepMin:.25});`);
    assert.ok(a.run('Math.abs(coarse.finalIndoor-fine.finalIndoor)')<.1);
    const before=a.run('coarse.trace.find(p=>p.elapsedMin===30).indoor');
    a.run(`e.points.push({time:new Date(+e.windowStart+30*60000),tOut:40,rh:30,wind:5,cloud:0});changed=zoneProfile('passive',e,false,confirmedSetpoints(false),1400,75)`);
    near(a.run('changed.trace.find(p=>p.elapsedMin===30).indoor'),before);
    assert.ok(a.run('changed.finalIndoor')<a.run('coarse.finalIndoor'));
});
test('score ordering cannot override equipment/moisture eligibility and uses score before preferences',()=>{
    const a=setup();a.run(`candidates=[{type:'auto',suitable:true,score:1},{type:'ac',suitable:true,score:2},{type:'passive',suitable:false,equipmentEligible:true,moistureEligible:false,score:0}];candidates.sort(compareCandidates)`);
    assert.equal(a.run('candidates[0].type'),'auto');assert.equal(a.run('candidates[2].type'),'passive');
});
test('presentation omits the winner from both alternative sections and never prescribes rejected modes',()=>{
    const a=setup({hours:.5});
    a.run(`winner=modelCandidate('ac',e,true,sp,1000,72);winner.suitable=true;winner.scenarioSummary='Acceptable in all three tested scenarios';
        vent=modelCandidate('maxxfan',e,true,sp,1000,72);vent.suitable=false;vent.comfortReason='Too cold';
        off=modelCandidate('passive',e,true,sp,1000,72);off.suitable=true;
        result={winner,allCandidates:[winner,vent,off],setpoints:sp,envelope:e,tOutMin:65,tOutMax:65};html=comparisonSections(result,true)`);
    const html=a.run('html');assert.match(html,/Other Viable HVAC Options/);assert.match(html,/Unsuitable HVAC Modes/);
    assert.doesNotMatch(html,/Air Conditioner|Select COOL|Use the .*MaxxFan/);
    assert.match(html,/Heating and cooling OFF/);
});
test('end-to-end selection yields a true winner or an explicit no-suitable result, never an unsafe prescription',()=>{
    const a=setup({hours:1});a.run('result=selectOvernightSetup(e,true)');
    assert.equal(a.run('result.setpoints.cool'),68);assert.equal(a.run('result.setpoints.heat'),66);
    assert.equal(a.run('result.noSuitable'),a.run('!result.winner.suitable'));
    assert.equal(a.run('result.allCandidates.length'),6);
    const html=a.run("renderRecommendation('test','Overnight Recommendation',result,true)");assert.match(html,/Other Viable HVAC Options/);assert.match(html,/Unsuitable HVAC Modes/);
    assert.doesNotMatch(html,/Heating and Cooling Options Compared|±0.5°F|constant dew point/);
});
