const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('independent component heat loss conserves areas and includes openings once',()=>{
 const a=app();a.run('e=envelopeAllocation();s=bodySurfaces()');
 close(a.run('s.wall+s.roof+s.floor+s.door+s.opening+s.glass'),a.run('s.gross'));
 close(a.run('e.bodyConduction+e.cabConduction+(e.bodyGlass+e.cabGlass)/C.rGlass+e.bodyLeak+e.cabLeak'),a.run('e.total'));
 close(a.run('e.total'),126.33326325214344);
 close(a.run('e.body'),64.56189863250626);
 close(a.run('e.rear+e.front'),a.run('e.total'));
 close(a.run('e.bodyLeak+e.cabLeak'),a.run('1.08*M.volumeFt3.reduce((x,y)=>x+y)*M.baseACH/60'));
 assert.ok(a.run('e.bodyEffectiveR>e.cabEffectiveR'));
 for(const key of ['wall','roof','floor','door','opening','glass'])assert.ok(a.run(`s.rear.${key}>=0&&s.rear.${key}<=s.${key}`));
});
test('shell and floor ratings are separate and body changes cannot silently alter the cab',()=>{
 const a=app();a.run('e=envelopeAllocation();changed=envelopeAllocation(3,{...BODY_CASES[0],floor:4})');
 close(a.run('changed.body-e.body'),a.run('e.areas.floor*(1/4-1/8)'));
 close(a.run('changed.cab'),a.run('e.cab'));
 close(a.run('changed.parts.wall'),a.run('e.parts.wall'));
 a.run('changed=envelopeAllocation(3,{...BODY_CASES[0],roof:9})');
 close(a.run('changed.total-e.total'),a.run('e.areas.roof*(1/9-1/18)'));
 close(a.run('changed.parts.floor'),a.run('e.parts.floor'));
 assert.match(a.run('envelopeAuditText()'),/engineering assumption, not a verified specification/);
});
test('geometry and thermal storage are independent of a legacy UA target',()=>{
 const a=app();close(a.run('envelopeAudit().planGross'),671.0333598723416);
 close(a.run('envelopeAudit().mass'),273.14285714285717);
 assert.ok(a.run('UA_BASE!==136.57142857142858'));
 a.run('before=envelopeAllocation().total;C.cabOpaqueUA*=2');
 close(a.run('envelopeAllocation().total-before'),34.1108641985);
 close(a.run('envelopeAudit().mass'),273.14285714285717);
});
test('all body-performance cases are crossed with all weather/airflow/cab cases',()=>{
 const a=app();assert.equal(a.run('AIR_SCENARIOS.length'),9);
 assert.equal(a.run('AIR_SCENARIOS[0].bodyCase.id'),'nominal');
 for(const body of ['nominal','reduced','stronger']){
  assert.equal(a.run(`AIR_SCENARIOS.filter(s=>s.bodyCase.id==='${body}').length`),3);
  assert.equal(a.run(`new Set(AIR_SCENARIOS.filter(s=>s.bodyCase.id==='${body}').map(s=>s.cabFactor)).size`),3);
 }
 assert.equal(a.run('new Set(AIR_SCENARIOS.map(s=>s.name)).size'),9);
});
test('insulation uncertainty affects the actual night trajectory with fixed storage',()=>{
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=false;
 start=new Date('2026-10-24T03:00Z');env={windowStart:start,windowEnd:new Date(+start+30*60000),wind:0,cloud:0,points:[{time:start,tOut:50,rh:30,wind:0,cloud:0}]};
 profiles=BODY_CASES.map(bodyCase=>zoneProfile('passive',env,true,confirmedSetpoints(true),0,70,{initialZones:{temperature:[70,70],rh:[30,30]},scenario:{...AIR_SCENARIOS[0],bodyCase},frontControl:true,checkEquipment:false}));`);
 for(const zone of [0,1])assert.ok(a.run(`profiles[1].finalZones.temperature[${zone}]<profiles[0].finalZones.temperature[${zone}]&&profiles[0].finalZones.temperature[${zone}]<profiles[2].finalZones.temperature[${zone}]`));
 close(a.run('envelopeAudit().mass'),273.14285714285717);
});
test('greater cab loss cools both connected zones without changing the body conductance',()=>{
 const a=app();a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=false;
 start=new Date('2026-10-24T03:00Z');env={windowStart:start,windowEnd:new Date(+start+30*60000),wind:0,cloud:0,points:[{time:start,tOut:50,rh:30,wind:0,cloud:0}]};
 profiles=[1.5,3,4.5].map(cabFactor=>zoneProfile('passive',env,true,confirmedSetpoints(true),0,70,{initialZones:{temperature:[70,70],rh:[30,30]},scenario:{...AIR_SCENARIOS[0],cabFactor},frontControl:true,checkEquipment:false}));`);
 for(const zone of [0,1])assert.ok(a.run(`profiles[0].finalZones.temperature[${zone}]>profiles[1].finalZones.temperature[${zone}]&&profiles[1].finalZones.temperature[${zone}]>profiles[2].finalZones.temperature[${zone}]`));
 assert.ok(a.run('envelopeAudit().lowCabUA<UA_BASE&&envelopeAudit().highCabUA>UA_BASE'));
});
test('wind and explicit background exchange count each selected component once',()=>{
 const a=app();for(const body of [0,1,2])for(const cab of [1.5,3,4.5])for(const wind of [0,15]){
 a.run(`e=envelopeAllocation(${cab},BODY_CASES[${body}]);wind=${wind};ua=[e.rear,e.front].map((u,z)=>u*(1+.02*wind)-1.08*M.volumeFt3[z]*M.baseACH/60);background=M.volumeFt3.map(v=>v*M.baseACH/60)`);
 close(a.run('ua.reduce((s,u)=>s+u,0)+1.08*background.reduce((s,v)=>s+v,0)'),a.run('e.total*(1+.02*wind)'));
 }
});
test('sol-air gain follows exposed conductance, excludes the floor, and preserves separate glass/shade gains',()=>{
 const a=app();a.run('e=envelopeAllocation();s=solarPeakGains();lo=solarPeakGains(1.5);hi=solarPeakGains(4.5)');
 close(a.run('lo[0]'),a.run('s[0]'));close(a.run('hi[0]'),a.run('s[0]'));
 assert.ok(a.run('hi[1]>s[1]&&s[1]>lo[1]'));
 a.run('floorOnly=solarPeakGains(3,{...BODY_CASES[0],floor:1})');
 close(a.run('floorOnly[0]+floorOnly[1]'),a.run('s[0]+s[1]'));
 a.run('C.solarAbsorptance=0;lo=solarPeakGains(1.5);hi=solarPeakGains(4.5)');
 close(a.run('lo[0]'),a.run('hi[0]'));close(a.run('lo[1]'),a.run('hi[1]'));
 close(a.run('lo[0]+lo[1]'),1800);
 a.run('C.solarAbsorptance=.5;fixedUA=envelopeAllocation().total;C.cabGlassSHGC=0');
 close(a.run('envelopeAllocation().total'),a.run('fixedUA'));
 close(a.run('solarPeakGains()[0]+solarPeakGains()[1]'),a.run('s[0]+s[1]-675'));
});
