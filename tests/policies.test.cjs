const test=require('node:test');
const assert=require('node:assert/strict');
const {app,fixture}=require('./helpers.cjs');
function scenario({temp=80,rh=30,wind=0,cloud=0,startIndoor=72,hours=3}={}){
    const a=app();a.run(`state.indoor=${startIndoor};start=new Date('2026-10-21T09:00Z');end=new Date(start.getTime()+${hours}*3600000);
        envelope={windowStart:start,windowEnd:end,wind:${wind},cloud:${cloud},points:[{time:start,tOut:${temp},rh:${rh},wind:${wind},cloud:${cloud}}]};sp={cool:72,heat:70,auto:71};`);
    return a;
}

test('heat-pump app minimum is inclusive at 41°F for both policy contexts',()=>{
    const a=app();
    for(const overnight of [false,true]){
        assert.equal(a.run(`heatPumpPolicy(41,5,${overnight}).safe`),true);
        assert.equal(a.run(`heatPumpPolicy(40.99,5,${overnight}).safe`),false);
    }
});

test('unattended dew-point gates change at exactly 35°F and 38°F',()=>{
    const a=app();
    for(const [dp,expected] of [[34.99,41],[35,45],[37.99,45],[38,50],[45,50]])assert.equal(a.run(`heatPumpMinimum(${dp})`),expected);
    a.run(`rhAtDP=(t,dp)=>{const c=(t-32)*5/9,d=(dp-32)*5/9;return 100*Math.exp(17.27*d/(237.3+d)-17.27*c/(237.3+c));}`);
    for(const [temp,dp] of [[45,35],[50,38]]){
        assert.equal(a.run(`heatPumpPolicy(${temp},rhAtDP(${temp},${dp}),true).safe`),true);
        assert.equal(a.run(`heatPumpPolicy(${temp}-.01,rhAtDP(${temp}-.01,${dp}),true).safe`),false);
    }
});

test('humid 44°F heating passes monitored policy but fails unattended policy for HP and AUTO',()=>{
    const a=scenario({temp:44,rh:95,startIndoor:60});
    for(const mode of ['hp','auto']){
        assert.equal(a.run(`simulateThermalProfile('${mode}',envelope,false,sp,1400,60).unsafe.length`),0);
        assert.ok(a.run(`simulateThermalProfile('${mode}',envelope,true,sp,1000,60).unsafe.length`)>0);
    }
    assert.match(a.run('heatPumpPolicy(44,95,false).warning'),/uncertain/);
    assert.doesNotMatch(a.run('heatPumpPolicy(44,95,true).reason'),/faster than|fail to heat|safe/);
});

test('an idle heat pump is not rejected, but AUTO cannot invent furnace fallback below 41°F',()=>{
    const a=scenario({temp:40,startIndoor:80});
    assert.equal(a.run("simulateThermalProfile('hp',envelope,true,sp,1000,80).segments[0].operation"),'off');
    a.run("s=simulateThermalProfile('auto',envelope,true,sp,1000,50)");
    assert.ok(a.run('s.unsafe.length')>0);
    assert.equal(a.run("s.segments.some(s=>s.operation==='furnace')"),false);
});

test('CCC2 Auto fan uses Low at 4°F, Medium at 5–7°F, High at 8°F',()=>{
    const a=app();
    for(const [delta,fan] of [[0,'Low'],[4,'Low'],[5,'Medium'],[7,'Medium'],[8,'High'],[12,'High']]){
        assert.equal(a.run(`autoFanSpeed(72+${delta},72)`),fan);
        assert.equal(a.run(`autoFanSpeed(72-${delta},72)`),fan);
    }
    assert.equal(a.run("coolingPolicy(60,60,20,60,'Auto',40).actualFan"),'Low');
    assert.equal(a.run("coolingPolicy(60,60,20,60,'Auto',40).safe"),false);
    assert.equal(a.run("coolingPolicy(60,60,20,60,'Medium',40).safe"),true);
});

test('35°F screening equality passes; every colder coil estimate including exactly 30°F fails',()=>{
    const a=app();
    for(const [ret,pass] of [[55,true],[54.999,false],[50,false],[49.999,false]]){
        assert.equal(a.run(`coolingPolicy(${ret},70,20,55,'High',40).safe`),pass);
    }
    assert.equal(a.run("coolingPolicy(50,70,20,55,'High',40).freezeRisk.severity"),'high');
    assert.equal(a.run("classifyFreezeRisk(60,20,35,40,'High').type"),'none');
});

test('low duty fraction does not manufacture warmer return air to pass a coil screen',()=>{
    const a=app();
    for(const duty of [.01,.1,1])assert.equal(a.run(`equipmentSafeAt('ac',70,20,0,0,true,1400,{cool:55},false,null,54.9,.1,true,{operation:'ac',dutyCycle:${duty},fanSetting:'High',indoorDP:40}).safe`),false);
});

test('the selected cooling fan setting passes the entire interval without conflicting instructions',()=>{
    const a=scenario({temp:38,rh:20,cloud:1,startIndoor:80,hours:2});
    a.run("sp.cool=66;s=simulateThermalProfile('ac',envelope,false,sp,1400,80)");
    assert.equal(a.run('s.unsafe.length'),0);assert.equal(a.run('s.maxFan'),'High');
    a.run("fixed=simulateThermalProfile('ac',envelope,false,sp,1400,80,{fanSetting:'High'})");
    assert.equal(a.run('fixed.unsafe.length'),0);
    assert.equal(a.run('fixed.finalIndoor'),a.run('s.finalIndoor'));
    const text=a.run("setupForMode('ac',sp,s.maxFan,false)+assumptionPanel('ac',s.maxFan)");
    assert.match(text,/fan to HIGH/);assert.doesNotMatch(text,/Fan →|DEHUMIDIFIER CRITICAL|prevents condensate/);
});

test('entered humid indoor conditions select High even when outdoor air is dry',()=>{
    const a=scenario({temp:80,rh:10,startIndoor:80});
    a.run("state.indoorRH=80;s=simulateThermalProfile('ac',envelope,false,sp,1400,80)");
    assert.equal(a.run('s.maxFan'),'High');assert.equal(a.run('s.unsafe.length'),0);
    assert.equal(a.run('state.indoorRH'),80);
    assert.match(a.run("operatingAssumptions('ac','High')"),/50% setting does not establish actual indoor RH/);
    assert.match(a.run('humidityDescription()'),/80% starting/);
});

test('unknown indoor humidity stays explicitly estimated and optional',()=>{
    const a=app();assert.equal(a.run('state.indoorRH'),null);
    assert.match(a.run('indoorMoisture(80,50,null).source'),/proxy/);
    assert.match(a.run('humidityDescription()'),/unknown/);
    assert.match(a.run('humidityDescription()'),/not a humidity measurement/);
});

test('coil screening does not permit an indoor dew point above return-air saturation',()=>{
    const a=app();assert.equal(a.run("coolingPolicy(70,80,10,68,'High',75).indoorDewPoint"),70);
});

test('Current ventilation uses thermostat-controlled recovery instead of full-flow equilibrium',()=>{
    const a=scenario({temp:58,rh:20,startIndoor:85,hours:2});
    a.run("r=simulateCurrentMode('maxxfan',envelope,85,72,'cool',sp,start,end)");
    assert.equal(a.run('r.equipmentEligible'),true);assert.equal(a.run('r.suitable'),true);
    assert.ok(a.run('Math.min(...r.trace.map(p=>p.indoor))')>=72-1e-8);
});

test('dehumidifier on/off changes heat on all predictor paths and invalidates forecast results',()=>{
    const a=scenario();const on=a.run('thermalEnvironment(80,0,0,false,1400).gains');
    a.run('state.dehumidifierEnabled=false');assert.equal(on-a.run('thermalEnvironment(80,0,0,false,1400).gains'),640);
    assert.equal(a.run('passiveEqAt(80,0,0,false,1400)'),a.run('80+1400/UA_BASE'));
    fixture(a);a.element('results').innerHTML='old';a.element('indoorRH').value='55';a.element('dehumidifierMode').value='enabled';
    a.run('equipmentInputsChanged()');assert.equal(a.run('state.weatherMode'),'forecast');
    assert.equal(a.element('results').innerHTML,'');assert.equal(a.run('state.indoorRH'),55);
    assert.equal(a.run('state.dehumidifierEnabled'),true);
});

test('invalid indoor RH blocks analysis rather than silently becoming an estimate',()=>{
    const a=app();a.element('indoorRH').value='101';a.element('dehumidifierMode').value='enabled';a.run('equipmentInputsChanged();analyze()');
    assert.match(a.element('resultStatus').textContent,/1–100/);assert.equal(a.element('results').innerHTML,'');
});

test('all Daytime candidates use the same desired comfort band',()=>{
    const a=app();
    for(const mode of ['passive','maxxfan','ac','auto','hp','furnace']){
        assert.equal(a.run(`comfortBand('${mode}',false,{}).low`),68);
        assert.equal(a.run(`comfortBand('${mode}',false,{}).high`),72);
    }
});

test('extreme cold produces a real no-suitable outcome even with an eligible furnace',()=>{
    const a=scenario({temp:-10,wind:50,startIndoor:66,hours:9});a.run('result=selectOvernightSetup(envelope,true)');
    assert.equal(a.run('result.noSuitable'),true);
    assert.equal(a.run("result.allCandidates.find(r=>r.type==='furnace').equipmentEligible"),true);
    assert.equal(a.run("result.allCandidates.find(r=>r.type==='furnace').floorCompliant"),false);
    const html=a.run("renderRecommendation('test','Overnight Recommendation',result,true)");
    assert.match(html,/The furnace cannot maintain your minimum set point of 65°F/);
    assert.doesNotMatch(html,/No Suitable Single Setup|RECOMMENDED|<span>Fits criteria<\/span>/);
});

test('extreme heat produces no suitable setup without calling a comfort miss a coil hazard',()=>{
    const a=scenario({temp:110,wind:50,cloud:1,hours:9});a.run('result=selectOvernightSetup(envelope,false)');
    assert.equal(a.run('result.noSuitable'),true);
    assert.equal(a.run("result.allCandidates.find(r=>r.type==='ac').equipmentEligible"),true);
    assert.equal(a.run("result.allCandidates.find(r=>r.type==='ac').endInBand"),false);
    const html=a.run("renderRecommendation('test','Daytime Recommendation',result,false)");
    assert.match(html,/Comfort shortfall/);assert.match(html,/The AC(?: in AUTO mode)? cannot maintain your set point of \d+°F/);
    assert.doesNotMatch(html,/No Suitable Single Setup|AC icing risk|severity-red/);
});

test('a recoverable hot start remains suitable while its out-of-band recovery stays visible',()=>{
    const a=scenario({temp:80,startIndoor:85,hours:2});a.run("r=evaluateCandidate('ac',envelope,false,sp,1400)");
    assert.equal(a.run('r.suitable'),true);assert.ok(a.run('r.hoursOutOfBand')>0);
    assert.equal(a.run('r.indoorMax'),85);assert.equal(a.run('r.finalIndoor'),72);
});

test('starting below 65°F cannot be described as full-window floor compliance',()=>{
    const a=scenario({temp:40,startIndoor:64,hours:2});a.run("r=evaluateCandidate('furnace',envelope,true,sp,1000)");
    assert.equal(a.run('r.equipmentEligible'),true);assert.equal(a.run('r.endInBand'),true);
    assert.equal(a.run('r.floorCompliant'),false);assert.equal(a.run('r.suitable'),false);
    const issue=a.run('temperatureIssue(r,sp,end).text');
    assert.match(issue,/starts at 64°F/);assert.match(issue,/furnace can warm/);assert.doesNotMatch(issue,/cannot maintain/);
});

test('comfort tolerance and floor use unrounded temperatures',()=>{
    const a=app();a.run('s={trace:[{indoor:65}],finalIndoor:70.5}');
    assert.equal(a.run('simulationComfort(s,true).endInBand'),true);
    a.run('s.finalIndoor=70.5001');assert.equal(a.run('simulationComfort(s,true).endInBand'),false);
    a.run('s.trace[0].indoor=64.9999');assert.equal(a.run('simulationComfort(s,true).floorCompliant'),false);
});

test('Current must finish in band even if it first reached target earlier',()=>{
    const a=scenario({temp:95,hours:2});
    a.run("r=simulateCurrentMode('passive',envelope,72,72,'cool',sp,start,end)");
    assert.equal(a.run('r.timeToTargetMin'),0);assert.equal(a.run('r.suitable'),false);
    assert.equal(a.run('r.endInBand'),false);
});

test('ventilation 62°F dew-point preference is not presented as an ASHRAE mandate',()=>{
    const a=app();
    const c=a.run("equipmentSafeAt('maxxfan',85,90,0,0,true,1400,{fan:72},false,null,90,.1,true,{operation:'maxxfan'})");
    assert.equal(c.safe,false);assert.match(c.detail,/app preference/);assert.match(c.detail,/not a universal ASHRAE/);
});

test('actionable setups include Dometic outlets, furnace fan behavior and observed-ice recovery',()=>{
    const a=app();
    for(const mode of ['ac','auto']){
        const s=a.run(`setupForMode('${mode}',{cool:72,heat:70,auto:71},'High',false)`);
        assert.match(s,/two distribution vents open, or quick-cool plus one distribution vent/);
        assert.match(a.run(`assumptionPanel('${mode}','High')`),/FAN ONLY until ice clears/);
    }
    assert.match(a.run("setupForMode('furnace',{heat:70},null,false)"),/AUTO \(roof fan off in Furnace mode\)/);
    assert.match(a.run("setupForMode('passive',{},null,false)"),/thermostat OFF/);
});


test('short recovery windows describe more time, not inadequate capacity',()=>{
    for(const [mode,temp,startIndoor,words] of [['ac',80,85,'cooling'],['furnace',40,65,'heating']]){
        const a=scenario({temp,startIndoor,hours:.05});
        a.run(`r=evaluateCandidate('${mode}',envelope,false,sp,1400)`);
        assert.equal(a.run('r.suitable'),false);assert.equal(a.run('r.capacityCool||r.capacityHeat'),false);
        const issue=a.run('temperatureIssue(r,sp,end).text');
        assert.match(issue,/needs more time to reach your set point/);assert.doesNotMatch(issue,/cannot maintain|ice up/);
        assert.match(a.run('temperatureIssue(r,sp,end).headline'),new RegExp(words));
    }
});

test('Current explains furnace and AC capacity shortfalls with their temperatures',()=>{
    for(const [mode,temp,startIndoor,direction,message] of [
        ['furnace',-10,66,'heat',/The furnace cannot maintain your minimum set point of 65°F/],
        ['ac',110,72,'cool',/The AC cannot maintain your set point of 72°F/]
    ]){
        const a=scenario({temp,wind:50,startIndoor,hours:3});
        a.run(`r=simulateCurrentMode('${mode}',envelope,${startIndoor},${direction==='heat'?70:72},'${direction}',sp,start,end);
            current={winner:r,allModes:[r],window:{label:'Morning',windowEnd:end},envelope,indoor:${startIndoor},target:${direction==='heat'?70:72}}`);
        const html=a.run('renderCurrentCard(current)');
        assert.match(html,message);assert.doesNotMatch(html,/No Suitable Single Setup|AC icing risk|severity-red/);
    }
});

test('potential icing stays explicit and red in both renderers without instructions to use blocked cooling',()=>{
    const a=scenario({temp:35,startIndoor:65,cloud:1});
    a.run(`forecast.timeZone='UTC';sp.cool=65;
        r=evaluateCandidate('ac',envelope,false,sp,1400);
        cr=simulateCurrentMode('ac',envelope,65,72,'cool',sp,start,end);
        result={winner:r,allCandidates:[r],envelope,setpoints:sp,noSuitable:true,tOutMin:35,tOutMax:35};
        current={winner:cr,allModes:[cr],window:{label:'Morning',windowEnd:end},envelope,indoor:65,target:72}`);
    assert.equal(a.run('r.equipmentCategory'),'freeze');assert.equal(a.run('cr.category'),'freeze');
    for(const expression of ["renderRecommendation('test','Daytime Recommendation',result,false)",'renderCurrentCard(current)']){
        const html=a.run(expression);
        assert.match(html,/AC icing risk/);assert.match(html,/severity-red/);assert.match(html,/The AC may ice up/);
        assert.match(html,/Do not use this cooling setting/);assert.match(html,/FAN ONLY until it clears/);
        assert.doesNotMatch(html,/Select COOL|No Suitable Single Setup/);
    }
});

test('an opposite-band excursion is explained even if the final temperature recovers',()=>{
    const a=app();
    const issue=a.run(`temperatureIssue({mode:'furnace',equipmentEligible:true,floorCompliant:true,endInBand:true,
        comfortLow:70,comfortHigh:72,finalIndoor:70,overshoot:true,trace:[{indoor:74},{indoor:70}]},{heat:70},new Date()).text`);
    assert.match(issue,/range from 70.0 to 74.0°F/);assert.doesNotMatch(issue,/needs more time|cannot maintain/);
});
