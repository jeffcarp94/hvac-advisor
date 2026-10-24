const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('nominal envelope reconciles separate conduction, glazing and leakage without double counting',()=>{
 const a=app();a.run('e=envelopeAllocation()');
 close(a.run('e.bodyConduction+e.cabConduction+(e.bodyGlass+e.cabGlass)/C.rGlass+e.bodyLeak+e.cabLeak'),a.run('e.total'));
 close(a.run('e.total'),136.57142857142858);
 close(a.run('e.bodyLeak+e.cabLeak'),a.run('1.08*M.volumeFt3.reduce((x,y)=>x+y)*M.baseACH/60'));
 assert.ok(a.run('e.bodyEffectiveR>e.cabEffectiveR'));
});
test('R-18 comparison changes RV walls and roof only and never becomes an operating trial',()=>{
 const a=app();a.run('before=JSON.stringify({C,M,AIR_SCENARIOS});a=envelopeAudit();e=envelopeAllocation();floor=GEOMETRY.rearFloor+GEOMETRY.frontBodyFloor');
 close(a.run('a.lining18UA'),a.run('e.cab+e.bodyGlass/C.rGlass+e.bodyLeak+floor/e.bodyEffectiveR+(e.bodyOpaque-floor)/18'));
 assert.ok(a.run('a.lining18UA<a.nominalUA&&a.lining18UA>110'));
 close(a.run('a.lining18ReductionPct'),13.05798774450212);
 assert.equal(a.run('JSON.stringify({C,M,AIR_SCENARIOS})===before'),true);
 assert.match(a.run('envelopeAuditText()'),/not a calibrated prediction or a separate comfort test/);
});
test('floor-plan enclosure provides an independent order-of-magnitude area check',()=>{
 const a=app();a.run('a=envelopeAudit()');
 close(a.run('a.planGross'),671.0333598723416);
 assert.ok(a.run('Math.abs(a.areaDifferencePct)<5'));
 close(a.run('a.mass'),273.14285714285717);
});
test('greater cab conductance cools both connected zones faster without changing thermal storage',()=>{
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=false;
 start=new Date('2026-10-24T03:00Z');env={windowStart:start,windowEnd:new Date(+start+30*60000),wind:0,cloud:0,points:[{time:start,tOut:50,rh:30,wind:0,cloud:0}]};
 profiles=[1.5,3,4.5].map(cabFactor=>zoneProfile('passive',env,true,confirmedSetpoints(true),0,70,{initialZones:{temperature:[70,70],rh:[30,30]},scenario:{...AIR_SCENARIOS[0],cabFactor},frontControl:true,checkEquipment:false}));`);
 for(const zone of [0,1])assert.ok(a.run(`profiles[0].finalZones.temperature[${zone}]>profiles[1].finalZones.temperature[${zone}]&&profiles[1].finalZones.temperature[${zone}]>profiles[2].finalZones.temperature[${zone}]`));
 close(a.run('envelopeAudit().mass'),273.14285714285717);
 assert.ok(a.run('envelopeAudit().lowCabUA<UA_BASE&&envelopeAudit().highCabUA>UA_BASE'));
});
test('wind and explicit background air exchange preserve the selected envelope case total',()=>{
 const a=app();for(const cab of [1.5,3,4.5])for(const wind of [0,15]){
 a.run(`e=envelopeAllocation(${cab});wind=${wind};ua=[e.rear,e.front].map((u,z)=>u*(1+.02*wind)-1.08*M.volumeFt3[z]*M.baseACH/60);background=M.volumeFt3.map(v=>v*M.baseACH/60)`);
 close(a.run('ua.reduce((s,u)=>s+u,0)+1.08*background.reduce((s,v)=>s+v,0)'),a.run('e.total*(1+.02*wind)'));
 }
});

test('opaque solar gain follows conductance, preserves nominal total and keeps glazing separate',()=>{
 const a=app();a.run('e=envelopeAllocation();s=solarAllocation(4604);lo=solarAllocation(4604,1.5);hi=solarAllocation(4604,4.5)');
 close(a.run('s[0]+s[1]'),4604);close(a.run('lo[0]'),a.run('s[0]'));close(a.run('hi[0]'),a.run('s[0]'));
 assert.ok(a.run('hi[1]>s[1]&&s[1]>lo[1]'));
 a.run('C.shellSHGC=0;lo=solarAllocation(1800,1.5);hi=solarAllocation(1800,4.5)');
 close(a.run('lo[0]'),a.run('hi[0]'));close(a.run('lo[1]'),a.run('hi[1]'));
 close(a.run('lo[0]+lo[1]'),1800);
});
