const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');

function fixture(initial,hour,minute,type,crossing,{late='23:00',verified=true,allReach=true,qualified=true,nightPhase=''}={}){
    const a=app();
    a.run(`forecast.timeZone='America/Chicago';
        clockAt=text=>new Date('2026-11-16T'+text+':00-06:00');
        request={start:clockAt('${hour}:${minute}'),initial:{temperature:[${initial},${initial}]},occupancy:'staying'};
        bounds=planBounds(request.start,request);
        setup=planSetup('${type}',bounds.sleep);
        result={bounds,winner:{setup,suitable:${qualified},ready:${qualified}${nightPhase?`,phases:[{time:+request.start,setup},{time:+bounds.bedtime,setup:${nightPhase}}]`:''}},request${qualified?'':',current:{setup}'}};
        trials=[];
        point=(time,bedroom)=>({time,bedroom});
        simulatePlan=(phases,e,r,scenario)=>{
            trials.push(phases);
            const initialPoint=point(request.start,${initial});
            const projected=phases.length>1||phases[0].setup.sleepComfort;
            const bedtimePoint=point(clockAt('22:00'),${verified?67:type==='furnace'?63:74});
            const latePoint=point(clockAt('${late}'),${allReach?67:type==='furnace'?63:74});
            const trace=[initialPoint];
            if(!projected&&'${crossing}')trace.push(point(clockAt('${crossing}'),67));
            if(+bedtimePoint.time>+request.start)trace.push(bedtimePoint);
            if(+latePoint.time>+request.start)trace.push(latePoint);
            return {trace,equipmentEligible:true,moistureEligible:true,suitable:true,ready:${verified}};
        };
        outcome=bedtimeRecovery(result,{},request);`);
    return a;
}

test('heating recovery that reaches the sleep target at 7 PM keeps the daytime plan',()=>{
    const a=fixture(57,'18','30','furnace','19:00');
    assert.equal(a.run('outcome'),null);
});

for(const [type,initial,setting] of [['furnace',58,66],['ac',77,68]]){
    test(type+' switches to its sleep setting when recovery reaches the sleep target in the window',()=>{
        const a=fixture(initial,'20','00',type,'21:40');
        assert.equal(a.run('outcome.switchAt'),a.run("+clockAt('21:40')"));
        assert.equal(a.run(`outcome.night.setpoints.${type==='ac'?'cool':'heat'}`),setting);
        assert.equal(a.run('outcome.verified'),true);
        assert.match(a.run('bedtimeRecoveryHTML(outcome)'),new RegExp(setting+'°F'));
        assert.equal(a.run('trials.slice(1).every(phases=>phases.at(-1).time===outcome.switchAt)'),true);
    });
}

test('a rerun at 9:45 PM: 67°F is within the 1°F allowance (no card); 66°F switches when the sleep target is reached',()=>{
    // v6.6.28 (owner decision): 67°F is within 1°F of the 68°F awake low, so no recovery is prescribed. Before v6.6.28
    // this case switched immediately; with the allowance an immediate switch would need a reading at or above the 67°F
    // sleep target that is still more than 1°F below the awake low, which cannot occur with these bands.
    assert.equal(fixture(67,'21','45','furnace','').run('outcome'),null);
    const a=fixture(66,'21','45','furnace','');
    assert.equal(a.run('outcome.switchAt'),a.run("+clockAt('22:00')"));
});

test('late recovery shows a conditional overnight ETA and a 9:30 PM rerun prompt',()=>{
    // v6.6.27: an unverified card is shown only when no qualified plan exists.
    const a=fixture(58,'21','40','furnace','',{verified:false,qualified:false});
    assert.equal(a.run('outcome.switchAt'),a.run("+clockAt('22:00')"));
    assert.match(a.run('bedtimeRecoveryHTML(outcome)'),/11:00 PM/);
    assert.match(a.run('bedtimeRecoveryHTML(outcome)'),/fresh readings.*9:30 PM/);
});

test('v6.6.27: an unverified card yields to a qualified plan; a verified card uses the plan night setting',()=>{
    const unverified=fixture(58,'21','40','furnace','',{verified:false});
    assert.equal(unverified.run('outcome'),null);
    const own=fixture(58,'21','40','furnace','',{nightPhase:"withSetting(planSetup('furnace',true),64)"});
    assert.equal(own.run('outcome.night.setpoints.heat'),64);
    assert.equal(own.run('outcome.verified'),true);
    assert.equal(own.run('trials.slice(1).every(phases=>phases.at(-1).setup.setpoints.heat===64)'),true);
});

test('a bedtime rerun shows no definite ETA when sleeping comfort is not reached',()=>{
    const a=fixture(58,'22','00','furnace','',{verified:false,allReach:false});
    assert.equal(a.run('outcome.overnight'),true);
    assert.match(a.run('bedtimeRecoveryHTML(outcome)'),/not expected to reach 65–69°F/);
});

test('real two-zone late recovery carries both zones across the 10 PM switch',()=>{
    const a=app();
    a.run(`forecast.timeZone='America/Chicago';state.weatherMode='manual';state.temp=15;state.rh=45;state.wind=5;
        request={start:new Date('2026-11-16T21:58:00-06:00'),initial:{temperature:[46,45],rh:[40,40]},occupancy:'staying'};
        bounds=planBounds(request.start,request);setup=planSetup('furnace',false);
        env={windowStart:request.start,windowEnd:bounds.end,points:[{time:request.start,tOut:15,rh:45,wind:5,cloud:0}],cloud:0,wind:5,singlePoint:true};
        result={bounds,winner:{setup,suitable:false,ready:false},current:{setup,reviewAt:+request.start+60000}};
        outcome=bedtimeRecovery(result,env,request);`);
    assert.equal(a.run('outcome.verified'),false);
    assert.equal(a.run('outcome.switchAt'),a.run('+bounds.bedtime'));
    assert.match(a.run('outcome.bedroom'),/^4/);
    assert.match(a.run('bedtimeRecoveryHTML(outcome)'),/Recheck your readings sooner at 9:59 PM/);
});
