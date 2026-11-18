// WP10 (v6.6.20): wind and infiltration. Weather below is synthetic (labeled).
const test=require('node:test'),assert=require('node:assert/strict'),{app}=require('./helpers.cjs');
const near=(x,y,tol=1e-9,msg)=>assert.ok(Math.abs(x-y)<=tol,`${msg?msg+': ':''}${x} != ${y} (±${tol})`);

test('calm-condition conduction is unchanged for every body case and cab factor (no film counted twice)',()=>{
 const a=app();
 for(const cab of [1.5,3,4.5])for(let b=0;b<3;b++){
  const now=a.run(`JSON.stringify(conductionUA(envelopeAssemblies(${cab},BODY_CASES[${b}]),0))`);
  const old=a.run(`(()=>{const e=envelopeAllocation(${cab},BODY_CASES[${b}]);return JSON.stringify([e.rear-1.08*M.volumeFt3[0]*M.baseACH/60,e.front-1.08*M.volumeFt3[1]*M.baseACH/60]);})()`);
  JSON.parse(now).forEach((v,z)=>near(v,JSON.parse(old)[z],1e-9,`cab ${cab} body ${b} zone ${z}`));
 }
 // Each assembly keeps a positive interior resistance after removing the calm film once.
 assert.ok(a.run('BODY_CASES.every(b=>envelopeAssemblies(4.5,b).every(x=>x.r-CALM_FILM_R>0))'));
});

test('pinned correlations: local wind power law and ASHRAE simple-combined exterior film (medium smooth)',()=>{
 const a=app();
 // Independent evaluation: V_3m = V_10m·(270/10)^0.14·(3/370)^0.22.
 near(a.run('localWindMph(10)'),10*Math.pow(27,.14)*Math.pow(3/370,.22),1e-12);
 near(a.run('localWindMph(0)'),0);
 // h = 8.23 + 4.0·V − 0.057·V² W/(m²·K), V in m/s; 1 BTU/(h·ft²·°F) = 5.678263 W/(m²·K).
 near(a.run('exteriorFilmBtu(0)*5.678263'),8.23,1e-9);
 near(a.run('exteriorFilmBtu(3/.44704)*5.678263'),8.23+4*3-.057*9,1e-9);
 // The former 2%/mph multiplier is gone from the live path: conduction rises only through h_o.
 assert.equal(/u\*\(1\+\.02\*row\.wind\)/.test(a.run('zoneProfile.toString()')),false);
});

test('conduction rises monotonically with wind, mostly through glass and the cab',()=>{
 const a=app();a.run('as=envelopeAssemblies();');
 let prev=0;for(const mph of [0,2,5,10,15,20,30]){const ua=a.run(`conductionUA(as,${mph}).reduce((x,y)=>x+y)`);assert.ok(ua>prev,`${mph} mph`);prev=ua;}
 const share=a.run(`(()=>{const f=exteriorFilmBtu(localWindMph(15)),g=x=>x.area*windU(x.r,f)-x.area/x.r;
  const all=as.reduce((t,x)=>t+g(x),0),glassCab=as.filter(x=>/glass|cabGlass|cabOpaque/i.test(x.key)).reduce((t,x)=>t+g(x),0);return glassCab/all;})()`);
 assert.ok(share>.8,`glass and cab share of the wind increase ${share}`);
});

test('infiltration: 0.25 ACH at ΔT 18°F and 7 mph local wind; Handbook units; monotonic in ΔT and wind',()=>{
 const a=app();a.run('vol=M.volumeFt3.reduce((x,y)=>x+y);met7=7/localWindMph(1);');
 near(a.run('infiltrationCFM([68,68],50,met7)*60/vol'),.25,1e-12);
 near(a.run('infiltrationCFM([68,68],86,met7)*60/vol'),.25,1e-12,'|ΔT| (summer)');
 near(a.run('infiltrationCFM([70,70],70,0)'),0);
 // SI → IP check: Q(cfm) = A_L(in²)·√(0.0150·ΔT°F + 0.0065·U²mph) for one story, shelter class 3.
 const areaIn2=a.run('INFILTRATION.leakageCm2/6.4516');
 for(const [dT,u] of [[18,7],[40,0],[0,10],[30,15]]){
  const ip=areaIn2*Math.sqrt(.0150*dT+.0065*u*u);
  const si=a.run(`infiltrationCFM([70,70],${70-dT},${u}/localWindMph(1))`);
  assert.ok(Math.abs(si-ip)/Math.max(ip,1e-9)<.01,`ΔT ${dT}, U ${u}: ${si} vs ${ip}`);
 }
 let prev=-1;for(const dT of [0,5,10,20,40]){const q=a.run(`infiltrationCFM([70,70],${70-dT},5)`);assert.ok(q>prev);prev=q;}
 prev=-1;for(const w of [0,3,6,12,24]){const q=a.run(`infiltrationCFM([70,70],50,${w})`);assert.ok(q>prev);prev=q;}
});

test('infiltration enters once, split by zone volume; windows use the same local wind',()=>{
 const a=app();a.run(`n=ventilationNetwork(null,[68,64],40,12,0);q=infiltrationCFM([68,64],40,12);`);
 near(a.run('n.incoming[0]+n.incoming[1]'),a.run('q'),1e-12);near(a.run('n.outgoing[0]+n.outgoing[1]'),a.run('q'),1e-12);
 near(a.run('n.incoming[0]/q'),a.run('M.fraction[0]'),1e-12);
 // Window pressure: dynamic pressure from the local wind (was 0.5 × forecast wind).
 a.run(`c={fanZone:1,gaps:[4,0,0,4,0,0]};w1=ventilationNetwork(c,[72,72],72,12,0,{...AIR_SCENARIOS[0],windSign:1});
  w2=ventilationNetwork(c,[72,72],72,12*.5/localWindMph(1),0,{...AIR_SCENARIOS[0],windSign:1});`);
 assert.ok(a.run('Math.abs(w1.flows[0]-w2.flows[0])>1e-6'),'local wind differs from 0.5 × forecast');
 near(a.run('localWindMph(12)'),a.run('localWindMph(1)*12'),1e-12);
});

test('sol-air uses h_o(V): opaque gain falls with wind, glass gain is unchanged',()=>{
 const a=app();const REF="new Date('2026-07-15T23:00:00Z'),41.33,-94.01";
 a.run(`co=solarSurfaceCoefficients();g=w=>{const r={date:new Date('2026-07-15T23:00:00Z'),wind:w,sunC:solarComponents(${REF},0)};solarZoneGains(r,270,{},co);
  const f=exteriorFilmBtu(localWindMph(w)),fac=r.facadeCache['270'];return{glass:co.filter(s=>s.kind==='glass').reduce((t,s)=>t+s.coef*fac[s.facade].glass,0),
  total:solarZoneGains(r,270,{},co).reduce((x,y)=>x+y)};};`);
 const calm=a.run('g(0)'),windy=a.run('g(15)');
 near(calm.glass,windy.glass,1e-9,'glass');assert.ok(calm.total-calm.glass>windy.total-windy.glass,'opaque falls with wind');
 // Calm coefficient equals the stored coef (sol-air through the calm assembly).
 assert.ok(a.run(`co.filter(s=>s.kind==='opaque').every(s=>Math.abs(s.aAlpha*windU(s.r,exteriorFilmBtu(0))/exteriorFilmBtu(0)-s.coef)<1e-12)`));
});

test('cold-night cases: wind increases furnace runtime; heat-loss change at 15 mph is reported',()=>{
 const a=app();
 const run=w=>{a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=false;solarLoad=()=>0;solarZoneGains=()=>[0,0];
  e={windowStart:new Date('2026-01-10T06:00Z'),windowEnd:new Date('2026-01-10T12:00Z'),wind:${w},cloud:1,points:[{time:new Date('2026-01-10T06:00Z'),tOut:20,rh:70,wind:${w},cloud:1}]};
  p=zoneProfile('furnace',e,true,{heat:66,cool:72},C.metaSleep,67,{initialZones:{temperature:[67,67],rh:[40,40]},frontControl:true,checkEquipment:false});`);
  return a.run('p.heatMinutes');};
 const calm=run(0),windy=run(15);assert.ok(windy>calm,`${windy} vs ${calm} furnace minutes`);
 // Steady loss at 68°F inside, 30°F outside: calm vs 15 mph (NWS 10 m; local 3 m = 8.25 mph).
 const loss=w=>a.run(`(conductionUA(envelopeAssemblies(),${w}).reduce((x,y)=>x+y)+1.08*infiltrationCFM([68,68],30,${w}))*38`);
 const ratio=loss(15)/loss(0);assert.ok(ratio>1.2&&ratio<1.5,`15 mph / calm = ${ratio}`);
});
