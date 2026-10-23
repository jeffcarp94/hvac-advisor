const test=require('node:test');
const assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');

function messages(){
    const a=app();
    a.run(`end=new Date('2026-10-22T07:00Z');sp={cool:70,heat:66,auto:68};
        candidate=(type,extra={})=>({type,suitable:true,equipmentEligible:true,floorCompliant:true,endInBand:true,
            comfortLow:66,comfortHigh:70,finalIndoor:66,indoorMin:66,indoorMax:72,hoursOutOfBand:0,
            autoDidHeat:true,autoDidCool:false,hourly:[{indoor:72},{indoor:66}],...extra});
        winner=candidate('auto',{optimizedSet:68});`);
    return a;
}

test('the approved overnight descriptions replace scores and the misleading off label',()=>{
    const a=messages();
    for(const mode of ['auto','hp','furnace','ac','passive','maxxfan']){
        a.run(`c=candidate('${mode}')`);
        const html=a.run("comparisonRow(c,winner,sp,end,true)");
        assert.doesNotMatch(html,/weighted|Discomfort|criteria|full-period|No system needed|Ranges include/);
        assert.match(html,/Expected indoor temperature: 66–72°F/);
    }
    assert.match(a.run("comparisonExplanation(candidate('hp'),winner,sp,end,true)"),/Lets the RV cool to about 66°F, then uses the heat pump/);
    assert.match(a.run("comparisonExplanation(candidate('furnace'),winner,sp,end,true)"),/propane heat.*cooler than the recommended AUTO setting/);
    assert.match(a.run("comparisonRow(candidate('passive'),winner,sp,end,true)"),/Heating and cooling OFF/);
    assert.match(a.run("comparisonExplanation(winner,winner,sp,end,true)"),/Recommended\. Best match.*overnight.*AUTO to 68°F/);
});

test('unused equipment and incomplete recovery do not claim to hold a setpoint',()=>{
    const a=messages();
    assert.match(a.run("comparisonExplanation(candidate('hp',{autoDidHeat:false}),winner,sp,end,true)"),/Heating is not needed/);
    assert.match(a.run("comparisonExplanation(candidate('ac',{autoDidCool:false}),winner,sp,end,true)"),/Cooling is not needed/);
    const recovering=a.run("comparisonExplanation(candidate('ac',{autoDidCool:true,finalIndoor:71}),winner,sp,end,true)");
    assert.match(recovering,/toward 70°F/);assert.doesNotMatch(recovering,/then runs|hold/);
    const passive=a.run("comparisonExplanation(candidate('passive',{hoursOutOfBand:1}),winner,sp,end,true)");
    assert.match(passive,/reach your preferred temperature/);assert.doesNotMatch(passive,/stay comfortable/);
});

test('every equipment rejection has a plain-language cause in both comparison paths',()=>{
    const a=messages();
    const cases=[
        ['ac','cooling-ice',/may ice up.*FAN ONLY/],
        ['ac','cooling-airflow',/humid enough to require High fan/],
        ['maxxfan','outside-humid',/too much moisture/],
        ['maxxfan','outside-cold',/too cold.*Keep them closed.*heating and cooling off/],
        ['maxxfan','outside-hot',/as warm as, or warmer than/],
        ['hp','heat-pump-cold',/below 50°F.*Select FURNACE/],
        ['auto','heat-pump-cold',/below 50°F.*instead of HEAT PUMP or AUTO/]
    ];
    for(const [mode,code,expected] of cases){
        a.run(`c=candidate('${mode}',{suitable:false,equipmentEligible:false,equipmentIssueCode:'${code}',equipmentMinimum:50,
            equipmentReason:'INTERNAL POLICY TEXT',mode:'${mode}',trace:[{indoor:72},{indoor:66}]})`);
        for(const current of [false,true]){
            const html=a.run(`comparisonRow(c,winner,sp,end,true,${current},70)`);
            assert.match(html,expected);assert.doesNotMatch(html,/INTERNAL POLICY TEXT|Expected indoor temperature|weighted|full-period|proxy|assessment/);
        }
    }
});

test('heating/cooling mismatches and AUTO drift name the needed action or temperature',()=>{
    const a=messages();
    for(const [mode,final,expected] of [
        ['ac',65,/Cooling alone will not work.*needs heat.*minimum of 66°F/],
        ['furnace',75,/cannot cool.*Cooling is needed.*maximum of 70°F/],
        ['hp',75,/cannot cool.*Cooling is needed/],
        ['maxxfan',75,/cannot cool.*70°F.*outdoor air/],
        ['maxxfan',65,/cannot heat.*Use heat/],
        ['passive',75,/Cooling is needed.*maximum of 70°F/],
        ['passive',65,/Heat is needed.*minimum of 66°F/],
        ['auto',71,/waits until 70°F before cooling/],
        ['auto',65,/waits until 66°F before heating/]
    ]){
        const text=a.run(`temperatureIssue(candidate('${mode}',{suitable:false,endInBand:false,finalIndoor:${final}}),sp,end).text`);
        assert.match(text,expected);assert.doesNotMatch(text,/weighted|criteria|drift|floor compliance/);
    }
});

test('a later cold dip is explained even when the RV starts warm and recovers by the end',()=>{
    const a=messages();
    const text=a.run("temperatureIssue(candidate('passive',{suitable:false,floorCompliant:false,finalIndoor:68,hourly:[{indoor:72},{indoor:64},{indoor:68}]}),sp,end).text");
    assert.match(text,/drop to about 64.0°F.*minimum of 65°F.*More heat is needed/);
    assert.doesNotMatch(text,/starts too cold|needs more time|cannot maintain/);
});

test('Current comparisons explain recovery time without suggesting a failed option is recommended',()=>{
    const a=messages();
    a.run("c=candidate('ac',{autoDidCool:true,finalIndoor:70,timeToTargetMin:23,mode:'ac',trace:[{indoor:85},{indoor:70}]})");
    const html=a.run('comparisonRow(c,c,sp,end,false,true,70)');
    assert.match(html,/Recommended/);assert.match(html,/Reaches about 70°F in 23 minutes/);
    a.run('c.suitable=false;c.capacityCool=true');
    const failed=a.run('comparisonRow(c,c,sp,end,false,true,70)');
    assert.match(failed,/cannot maintain your set point of 70°F/);assert.doesNotMatch(failed,/Recommended/);
});

test('AUTO compared with heating modes explains their inability to cool',()=>{
    const a=messages();
    a.run("winner.autoDidCool=true;winner.selectionBasis='preference';c=candidate('furnace',{selectionReason:'preference'})");
    const text=a.run('comparisonExplanation(c,winner,sp,end,true)');
    assert.match(text,/both cooling and heating.*The furnace can heat but cannot cool/);
    assert.doesNotMatch(text,/COOL cannot add heat/);
});
