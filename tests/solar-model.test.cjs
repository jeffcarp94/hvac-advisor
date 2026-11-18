// WP8 solar model. Reference values from an independent calculation (NREL SPA via pvlib 0.11,
// 41.33°N 94.01°W, 2026-07-15 23:00 UTC = 18:00 CDT): elevation 29.081°, azimuth 273.831°,
// cos(incidence) west wall 0.8717, horizontal 0.4865.
const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');
const close=(a,b,tol,msg='')=>assert.ok(Math.abs(a-b)<=tol,`${msg} ${a} vs ${b}`);
const REF="new Date('2026-07-15T23:00:00Z'),41.33,-94.01";

test('reference case: sun position and incidence cosines match an independent calculation',()=>{
 const a=app(),sun=a.run(`solarPosition(${REF})`);
 close(sun.altitude,29.081,.05,'altitude');close(sun.azimuth,273.831,.05,'azimuth');
 a.run(`c=solarComponents(${REF},0)`);
 close(a.run('planeIrradiance(c,90,270).cosTheta'),.8717,.002,'west wall');
 close(a.run('planeIrradiance(c,0,0).cosTheta'),.4865,.002,'horizontal');
});

test('evening ratio: the rebuilt model gives more late-afternoon gain than the aggregate sin(altitude) model',()=>{
 // 18:00 CDT, clear, 16-point heading average, nominal case. Legacy: one aggregate peak × sin(altitude).
 const a=app();a.run(`row={date:new Date('2026-07-15T23:00:00Z'),sunC:solarComponents(${REF},0)};co=solarSurfaceCoefficients();`);
 const avg=a.run('solarZoneGains(row,"avg",{},co).reduce((x,y)=>x+y)'),legacy=a.run(`solarLoad(1,true,${REF})`);
 const ratio=avg/legacy;assert.ok(ratio>1.3&&ratio<1.7,`evening ratio ${ratio.toFixed(2)}`);
 // Solar noon the same day: the vertical-surface model is lower than the aggregate peak.
 a.run(`noon={date:new Date('2026-07-15T18:20:00Z'),sunC:solarComponents(new Date('2026-07-15T18:20:00Z'),41.33,-94.01,0)};`);
 assert.ok(a.run('solarZoneGains(noon,"avg",{},co).reduce((x,y)=>x+y)')<a.run("solarLoad(1,true,new Date('2026-07-15T18:20:00Z'),41.33,-94.01)"));
});

test('GHI closure, Kasten–Czeplak points and non-negative irradiance through sunrise and sunset',()=>{
 const a=app();
 for(const hour of [10,14,18,22,23,23.9,24.5,25.5]){
  const t=Date.parse('2026-07-15T00:00:00Z')+hour*3600000;
  const c=a.run(`solarComponents(new Date(${t}),41.33,-94.01,40)`);
  if(c.ghi>0)close(c.dni*c.sun.sinAlt+c.dhi,c.ghi,1e-9,'closure');
  assert.ok(c.ghi>=0&&c.dni>=0&&c.dhi>=0);
  for(const [tilt,az] of [[90,0],[90,90],[90,180],[90,270],[55,270],[0,0]]){
   const p=a.run(`planeIrradiance(solarComponents(new Date(${t}),41.33,-94.01,40),${tilt},${az})`);
   assert.ok(p.beam>=0&&p.sky>=0&&p.ground>=0,`${hour} ${tilt}/${az}`);
  }
 }
 close(a.run('kastenCzeplak(100,0)'),100,1e-12);close(a.run('kastenCzeplak(100,50)'),100*(1-.75*Math.pow(.5,3.4)),1e-12);close(a.run('kastenCzeplak(100,100)'),25,1e-12);
 close(a.run('erbsDiffuseFraction(.1)'),.991,1e-12);close(a.run('erbsDiffuseFraction(.9)'),.165,1e-12);
});

test('heading wraps from N to NNW and averaged headings stay within the individual-heading range',()=>{
 const a=app();assert.equal(a.run('headingDegrees("N")'),0);assert.equal(a.run('headingDegrees("NNW")'),337.5);assert.equal(a.run('headingDegrees("Unknown")'),null);
 a.run(`row={date:new Date('2026-07-15T23:00:00Z'),sunC:solarComponents(${REF},0)};co=solarSurfaceCoefficients();
  each=PARKING_HEADINGS.map((h,i)=>solarZoneGains({...row,facadeCache:undefined},i*22.5,{},co));avg=solarZoneGains({...row,facadeCache:undefined},'avg',{},co);`);
 for(const z of [0,1]){const v=a.run(`each.map(x=>x[${z}])`);assert.ok(a.run(`avg[${z}]`)>=Math.min(...v)-1e-9&&a.run(`avg[${z}]`)<=Math.max(...v)+1e-9);}
 // 360° is the same as 0°.
 a.run(`g0=facadeIrradiance(row.sunC,0,{});g360=facadeIrradiance(row.sunC,360,{});`);assert.equal(a.run('JSON.stringify(g0)'),a.run('JSON.stringify(g360)'));
});

test('tree cover: beam is reduced facade by facade, diffuse by the mean of all five settings',()=>{
 const a=app();a.run(`c=solarComponents(${REF},0);open=facadeIrradiance(c,0,{});
  shaded=facadeIrradiance(c,0,{tree_driver:'Full'});`);
 // Heading N at 18:00: the driver side faces west, into the sun.
 const p=a.run('planeIrradiance(c,90,270)'),diff=(p.sky+p.ground)*.316998,beam=p.beam*.316998;
 close(a.run('open.driver.opaque'),beam+diff,1e-9);
 const meanT=(1+1+1+1+.15)/5;close(a.run('shaded.driver.opaque'),beam*.15+diff*meanT,1e-9);
 const q=a.run('planeIrradiance(c,90,90)');close(a.run('shaded.entry.opaque'),(q.beam+(q.sky+q.ground)*meanT)*.316998,1e-9);
});

test('glazing inventory: owner-measured body glass and the 27 ft² cab estimate',()=>{
 const a=app(),g=a.run('solarGlazing()'),sum=f=>g.filter(f).reduce((t,x)=>t+x.area,0);
 close(sum(x=>x.shade==='cab'),27,1e-9,'cab');close(sum(x=>x.shade==='coach'),15.96,.01,'body (measured)');
 close(g.find(x=>x.id==='rearWindow').area,25*19/144,1e-12);close(g.find(x=>x.id==='entryDoorWindow').area,13*22/144,1e-12);
 assert.equal(g.find(x=>x.id==='windshield').facade,'windshield');assert.equal(a.run('SOLAR.windshieldTiltDeg'),55);
});

test('glass angular ratio follows the ASHRAE single-glazing curve and is applied to beam only',()=>{
 const a=app();close(a.run('glassAngularRatio(0)'),1,1e-12);close(a.run('glassAngularRatio(60)'),.78/.86,1e-12);
 close(a.run('glassAngularRatio(90)'),0,1e-12);close(a.run('SOLAR.hemisphericalGlass'),.78/.86,1e-12);
 assert.ok(a.run('glassAngularRatio(45)')<a.run('glassAngularRatio(40)'));
});

test('zone ledger: gains equal Σ coefficient × facade irradiance; nothing is counted twice',()=>{
 const a=app();a.run(`row={date:new Date('2026-07-15T23:00:00Z'),sunC:solarComponents(${REF},30)};co=solarSurfaceCoefficients();
  z=solarZoneGains(row,90,{},co);f=facadeIrradiance(row.sunC,90,{});`);
 const manual=[0,1].map(zone=>a.run(`co.filter(s=>s.zone===${zone}).reduce((t,s)=>t+s.coef*f[s.facade][s.kind],0)`));
 close(a.run('z[0]'),manual[0],1e-9);close(a.run('z[1]'),manual[1],1e-9);
 // Each glazing entry appears once and the cab opaque coefficients sum to cab conductance × α/h_o (floor excluded).
 assert.equal(a.run('co.filter(s=>s.kind==="glass").length'),a.run('solarGlazing().length'));
 assert.equal(a.run('solarZoneGains({date:new Date(),sunC:null},90,{},co)'),null,'no location → legacy aggregate path');
});

test('Unknown heading with a known location qualifies the four cardinal headings; a confirmed heading uses one',()=>{
 const a=app();
 assert.equal(a.run('configureSolarScenarios({lat:41,lon:-94,windowStart:new Date("2026-07-15T15:00Z"),windowEnd:new Date("2026-07-16T12:00Z"),site:{heading:"Unknown",confirmed:false}})'),37);
 assert.equal(a.run('AIR_SCENARIOS[0].heading'),'avg');
 assert.deepEqual(JSON.parse(a.run('JSON.stringify([...new Set(AIR_SCENARIOS.slice(1).map(s=>s.heading))])')),[0,90,180,270]);
 assert.equal(a.run('configureSolarScenarios({lat:41,lon:-94,site:{heading:"SW",confirmed:true}})'),9);
 assert.equal(a.run('configureSolarScenarios({lat:41,lon:-94,windowStart:new Date("2026-07-15T15:00Z"),windowEnd:new Date("2026-07-16T12:00Z"),site:{heading:"SW",confirmed:false}})'),37,'unconfirmed heading is not used');
 assert.equal(a.run(`configureSolarScenarios({lat:41,lon:-94,windowStart:new Date("2026-07-16T04:00Z"),windowEnd:new Date("2026-07-16T10:00Z"),site:{heading:"Unknown"}})`),9,'a window with no sun needs no heading cases');
 assert.equal(a.run('configureSolarScenarios({lat:null,lon:null})'),9,'no location → legacy solar, no heading cases');
});
