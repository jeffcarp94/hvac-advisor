// WP12 Phase A (v6.6.22; scope v3 WP12): comfort metric, observation only. Acceptance: operative temperature equals
// air temperature when every surface is at air temperature; PMV matches the ASHRAE 55 reference cases; decision
// outputs are unchanged (the metric is computed after the plan and never read by the planner).
// Reference cases: ASHRAE 55 validation tables as compiled in validation-data-comfort-models (F. Tartarini, MIT),
// source "ASHRAE 55 2017"; the PMV and SET programs are unchanged in substance in 55-2023 except the SET errata
// (September 16, 2024), which this port includes.
const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
const a=app();
// [tdb, tr, rh, vr, met, clo, units, PMV, PPD]
const PMV_CASES=[[19.6,19.6,86,0.1,1.1,1,'si',-0.5,9.7],[23.9,23.9,66,0.1,1.1,1,'si',0.5,9.8],[25.7,25.7,15,0.1,1.1,1,'si',0.5,10.8],[21.2,21.2,20,0.1,1.1,1,'si',-0.5,9.7],
    [23.6,23.6,67,0.1,1.1,0.5,'si',-0.5,9.7],[26.8,26.8,56,0.1,1.1,0.5,'si',0.5,10.6],[27.9,27.9,13,0.1,1.1,0.5,'si',0.5,10.2],[24.7,24.7,16,0.1,1.1,0.5,'si',-0.5,9.9],
    [67.3,67.3,86,0.333,1.1,1,'ip',-0.5,9.8],[75.0,75.0,66,0.333,1.1,1,'ip',0.5,9.6],[78.2,78.2,15,0.333,1.1,1,'ip',0.5,10.6],[70.2,70.2,20,0.333,1.1,1,'ip',-0.5,9.7],
    [74.5,74.5,67,0.333,1.1,0.5,'ip',-0.5,9.7],[80.2,80.2,56,0.333,1.1,0.5,'ip',0.5,10.3],[82.2,82.2,13,0.333,1.1,0.5,'ip',0.5,10.1],[76.5,76.5,16,0.333,1.1,0.5,'ip',-0.5,9.9]];
// [tdb, tr, rh, v, met, clo, SET] °C, standing; cases within the 0–1.5 clo applicability range.
const SET_CASES=[[25,25,10,0.15,1,0.5,23.3],[0,25,50,0.15,1,0.5,12.1],[10,25,50,0.15,1,0.5,16.8],[15,25,50,0.15,1,0.5,19.2],[20,25,50,0.15,1,0.5,21.5],[30,25,50,0.15,1,0.5,26.4],
    [40,25,50,0.15,1,0.5,34.3],[25,25,90,0.15,1,0.5,24.9],[25,25,50,0.15,1,0.5,23.8],[25,25,50,0.1,1,0.5,24.0],[25,25,50,0.6,1,0.5,21.3],[25,25,50,1.1,1,0.5,20.2],[25,25,50,3,1,0.5,18.6],
    [25,10,50,0.15,1,0.5,15.3],[25,40,50,0.15,1,0.5,31.6],[25,25,50,0.15,1,0.1,20.7],[25,25,50,0.15,1,1,27.2],[25,25,50,0.15,0.8,0.5,23.3],[25,25,50,0.15,2,0.5,25.9],
    [25,25,50,0.15,4,0.5,30.5],[25,25,50,1.1,2,0.5,24.0],[25,25,50,1.1,3,0.5,27.4],[25,25,50,1.1,4,0.5,30.3],[25,25,50,1.1,1.5,0.5,22.3],[25,25,50,1.1,1.5,0.75,24.8],
    [25,25,50,1.1,1.5,0.1,17.6],[29,25,50,1.1,1.5,0.5,25.0],[27,25,50,1.1,1.5,0.75,26.2],[20,25,50,1.1,1.5,0.1,13.3],[25,27,50,1.1,1.5,0.5,22.9],[25,29,50,1.1,1.5,0.5,23.5],
    [25,31,50,1.1,1.5,0.5,24.0],[25,27,50,1.3,1.5,0.5,22.5],[25,29,50,1.5,1.5,0.5,22.8],[25,31,50,1.7,1.5,0.5,23.1]];

test('PMV and PPD match the ASHRAE 55 reference cases (within 0.1 PMV and 1% PPD)',()=>{
    for(const [tdb,tr,rh,vr,met,clo,units,pmv,ppd] of PMV_CASES){
        const si=units==='ip'?[(tdb-32)/1.8,(tr-32)/1.8,vr*.3048]:[tdb,tr,vr];
        const r=JSON.parse(a.run(`JSON.stringify(wp12Pmv(${si[0]},${si[1]},${si[2]},${rh},${met},${clo}))`));
        assert.equal(r.valid,true);
        assert.ok(Math.abs(r.pmv-pmv)<=.1,`PMV ${r.pmv} vs ${pmv} at ${tdb} ${units}`);
        assert.ok(Math.abs(r.ppd-ppd)<=1,`PPD ${r.ppd} vs ${ppd}`);
    }
});
test('SET matches the ASHRAE 55 validation table within 0.5°C (D4 program with the 2024 errata)',()=>{
    for(const [tdb,tr,rh,v,met,clo,set] of SET_CASES){
        const r=a.run(`wp12TwoNode(${tdb},${tr},${v},${rh},${met},${clo},{position:'standing'}).set`);
        assert.ok(Math.abs(r-set)<=.5,`SET ${r} vs ${set} for ${[tdb,tr,rh,v,met,clo]}`);
    }
});
test('elevated air speed uses the SET cooling effect; still air has none; inputs outside ASHRAE 55 are not scored',()=>{
    assert.equal(a.run('wp12CoolingEffect(25,25,.1,50,1,.5)'),0);
    assert.ok(Math.abs(a.run('wp12CoolingEffect(10,10,1.1,10,1,.5)')-8.19)<=.1);
    assert.equal(a.run('wp12Pmv(9,20,.1,50,1,.5).valid'),false);
    assert.equal(a.run('wp12Pmv(20,20,.1,50,1,1.6).valid'),false);
});
test('operative temperature equals air temperature when every surface is at air temperature',()=>{
    const r=JSON.parse(a.run(`(()=>{const T=68,e={points:[{time:0,tOut:T,rh:50,wind:12,sky:0}],lat:null,lon:null};
        const s=wp12Surfaces(e,{bedroom:T,midCoach:T,bedMass:T,midMass:T},0);
        return JSON.stringify({surfaces:Object.values(s),locations:wp12Locations().map(l=>{const tr=wp12MeanRadiant(l,s);return[tr,wp12Operative(T,tr)];})});})()`));
    for(const v of r.surfaces)assert.ok(Math.abs(v-68)<1e-9);
    for(const [tr,to] of r.locations){assert.ok(Math.abs(tr-68)<1e-9);assert.ok(Math.abs(to-68)<1e-9);}
    assert.equal(a.run('wp12Operative(70,60,.1)'),65);assert.equal(a.run('wp12Operative(70,60,.3)'),66);
});
test('view factors are normalized and the adjacent bedside window gets the larger share',()=>{
    const L=JSON.parse(a.run('JSON.stringify(wp12Locations())'));
    assert.deepEqual(L.map(l=>l.id),['jeff','kim','dinette']);
    for(const l of L){
        assert.ok(Math.abs(l.total-4*Math.PI)<1e-6,'closed enclosure');
        assert.ok(Math.abs(l.factors.reduce((s,x)=>s+x.factor,0)-1)<1e-12);
        assert.ok(l.factors.every(x=>x.factor>0));
    }
    const f=(l,k)=>L.find(x=>x.id===l).factors.find(x=>x.key===k).factor;
    assert.ok(f('jeff','glass:entry:0')>5*f('jeff','glass:driver:0'));assert.ok(f('kim','glass:driver:0')>5*f('kim','glass:entry:0'));
    assert.ok(f('dinette','glass:driver:1')>f('dinette','glass:entry:1'));
    // Owner answer, November 19, 2026: the rear window is in the rear bathroom, out of the bed views.
    assert.ok(L.filter(l=>l.zone===0).every(l=>!l.factors.some(x=>x.key.startsWith('glass:rear'))));
});
test('surface temperatures lie between room air and outdoor air, including glass in high wind',()=>{
    const r=JSON.parse(a.run(`(()=>{const out=[];for(const wind of [0,15,40]){const e={points:[{time:0,tOut:20,rh:50,wind,sky:0}],lat:null,lon:null};
        out.push(wp12Surfaces(e,{bedroom:68,midCoach:70,bedMass:67,midMass:69},0));}return JSON.stringify(out);})()`));
    for(const s of r)for(const [k,v] of Object.entries(s))if(!k.startsWith('interior'))assert.ok(v>20&&v<70,k+' '+v);
    assert.ok(r[0]['glass:entry:0']>r[2]['glass:entry:0'],'windier is colder');
    assert.ok(Math.abs(r[0]['glass:entry:0']-(68-48*(1/1.46)/(1/1.46+a.run('1/exteriorFilmBtu(0)'))))<1e-9,'film series at calm');
});
test('Lin & Deng sleeping comfort: neutral points at two bedding insulations',()=>{
    const neutral=clo=>a.run(`(()=>{let lo=5,hi=40;for(let k=0;k<60;k++){const t=(lo+hi)/2,pa=.5*Math.exp(16.6536-4030.183/(t+235));wp12SleepPmv(t,t,pa,${clo}*.155)<0?lo=t:hi=t;}return(lo+hi)/2;})()`);
    // Lan et al. (2014) report the model neutral at 18.5°C with 3.12 clo; the light-quilt value is near 26°C.
    assert.ok(Math.abs(neutral(3.12)-18.5)<.6);assert.ok(Math.abs(neutral(1.8)-26)<.5);
    assert.ok(a.run('wp12SleepPmv(19.4,19.4,1.0,1.8*.155)')<-2,'1.8 clo reads cool at 67°F (disclosed)');
});
test('awake clothing: season default May–September 0.5 clo, otherwise 0.8; a saved owner choice overrides',()=>{
    const b=app();b.run("forecast.timeZone='America/Chicago'");
    assert.equal(b.run("wp12Clothing(Date.parse('2026-07-04T18:00:00Z')).clo"),.5);
    assert.equal(b.run("wp12Clothing(Date.parse('2026-11-19T18:00:00Z')).clo"),.8);
    assert.equal(b.run("wp12Clothing(Date.parse('2026-05-01T12:00:00Z')).source"),'season');
    b.ctx.localStorage={getItem:k=>k==='hvac-advisor-comfort-clothing-v1'?JSON.stringify({value:.65}):null};
    assert.deepEqual(JSON.parse(b.run("JSON.stringify(wp12Clothing(Date.parse('2026-07-04T18:00:00Z')))")),{clo:.65,source:'owner'});
    b.ctx.localStorage={getItem:()=>JSON.stringify({value:7})};
    assert.equal(b.run("wp12Clothing(Date.parse('2026-07-04T18:00:00Z')).source"),'season','an invalid saved value is ignored');
});
test('the metric is observation only: computing it changes nothing in the result and logs a compact record',()=>{
    const b=app();
    b.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;ENSEMBLE.enabled=false;
        r={occupancy:'staying',start:new Date('2026-11-12T04:00:00Z'),reading:new Date('2026-11-12T04:00:00Z'),initial:{temperature:[67,66],rh:[45,45]}};
        points=[35,38,40,42,44,46,48,50,52].map((tOut,i)=>({time:new Date(Date.parse('2026-11-12T04:00:00Z')+i*3600000),tOut,rh:45,cloud:1,wind:4,precip:'none'}));
        e={windowStart:r.start,windowEnd:new Date('2026-11-12T13:00:00Z'),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,points,cloud:1,wind:4,precip:'none'};
        res=runUnifiedPlan(r,e);res.request??=r;before=JSON.stringify(res);html=renderPlan(res);comfort=wp12Comfort(res,e,r);`);
    assert.equal(b.run('JSON.stringify(res)'),b.run('before'),'result untouched');
    assert.ok(b.run('comfort.samples')>0);
    const sleep=JSON.parse(b.run('JSON.stringify(comfort.periods.sleep)'));
    assert.deepEqual(Object.keys(sleep).sort(),['jeff','kim'],'no dinette while asleep');
    const log=b.run('wp12LogJSON(comfort)');assert.ok(log.length<2000);assert.equal(JSON.parse(log).bedding_clo,1.8);
    // The rendered plan only gains the comfort panel.
    b.run('res.comfort=comfort');const withPanel=b.run('renderPlan(res)'),panel=b.run('wp12HTML(comfort)');
    assert.ok(panel.includes('observation only'));assert.equal(withPanel.replace(panel,''),b.run('html'));
});
test('trace points carry the slow-storage temperatures the metric reads',()=>{
    const keys=JSON.parse(a.run(`(()=>{forecast.timeZone='America/Chicago';const r={occupancy:'staying',start:new Date('2026-11-12T04:00:00Z'),reading:new Date('2026-11-12T04:00:00Z'),initial:{temperature:[67,66],rh:[45,45]}};
        const e={windowStart:r.start,windowEnd:new Date('2026-11-12T06:00:00Z'),timeZone:'America/Chicago',lat:null,lon:null,points:[{time:r.start,tOut:40,rh:45,cloud:1,wind:4,precip:'none'}],cloud:1,wind:4,precip:'none',singlePoint:true};
        const sim=simulatePlan([{time:+r.start,setup:planSetup('passive',true,null,'Auto')}],e,r);return JSON.stringify([Object.keys(sim.trace[0]),sim.trace[0].bedMass,sim.trace.at(-1).bedMass<67]);})()`));
    assert.ok(keys[0].includes('bedMass')&&keys[0].includes('midMass'));assert.equal(keys[1],67);assert.equal(keys[2],true);
});
