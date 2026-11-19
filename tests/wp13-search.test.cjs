// WP13 Search (scope v3 WP13 "Search"): exact pruning, lazy completion, the bounded shortlist, the trimmed
// Worker result and the search disclosure. Weather and plan objects are synthetic (labeled).
const test=require('node:test'),assert=require('node:assert/strict'),{app}=require('./helpers.cjs');
const H=3600000,start=Date.parse('2026-11-12T04:00:00Z');
function scene(a,temps=[47,46,45,45,44],initial='[67,66]'){
 a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;
  r={occupancy:'staying',start:new Date(${start}),reading:new Date(${start}),initial:{temperature:${initial},rh:[45,45]}};
  points=${JSON.stringify(temps)}.map((tOut,i)=>({time:new Date(${start}+i*${H}),tOut,rh:45,cloud:1,wind:4,precip:'none'}));
  e={windowStart:r.start,windowEnd:new Date(${start}+${temps.length}*${H}),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,points,cloud:1,wind:4,precip:'none'};`);
}
function ensemble(a,search='auto'){a.run(`ENSEMBLE.enabled=true;ENSEMBLE.search='${search}';e.planCache=new Map();configureSolarScenarios(e);configureEnsemble(e,r);rows=planRows(e,r);`);}
function trials(a,name,spec){
 a.run(`${name}=Array.from({length:32},(_,i)=>({member:i,suitable:true,ready:true,equipmentEligible:true,floorBreach:false,failureTime:null,firstFailureTime:null,
  unsafe:[],tempMissDegMin:0,rhExceedMin:0,score:0,segments:[],start:new Date(${start}),trace:[{time:new Date(${start}),bedroom:67,midCoach:67},{time:new Date(${start+5*H}),bedroom:67,midCoach:67}],
  comfortReason:'',moistureReason:'',bedtimeReason:'',recoveryInfo:null,recoveryMinutes:0}));(${spec})(${name});`);
}
// Plan fields the comparators and the display read, for equality checks.
const digest=p=>`JSON.stringify({s:${p}.suitable,r:${p}.ready,reason:${p}.reason,score:${p}.score,tr:${p}.targetRank,ff:${p}.frontFits,rec:${p}.recoveryInfo,
 e:${p}.ensemble&&{p:${p}.ensemble.passes,a:${p}.ensemble.admitted,sev:${p}.ensemble.severity,n:${p}.ensemble.evaluated},
 t:${p}.trials.map(t=>[t.member,t.failureTime,t.suitable,+t.finalIndoor.toFixed(9),t.tempMissDegMin])})`;

test('defaults: automatic search with exact pruning, exact fallback ordering, shortlist only over budget',()=>{
 const a=app();
 assert.equal(a.run('ENSEMBLE.search'),'auto');assert.equal(a.run('ENSEMBLE.screening'),8);
 assert.deepEqual(JSON.parse(a.run('JSON.stringify(ENSEMBLE.shortlist)')),[6,12]);
 assert.equal(a.run('ENSEMBLE.exactFallback'),true);
 assert.equal(a.run('ENSEMBLE.budgetHours'),Infinity);
});

test('exact pruning boundaries: nominal failure, a hard failure, or a fourth failing member',()=>{
 const a=app();scene(a);ensemble(a);
 trials(a,'x',()=>{});assert.equal(a.run('certainlyUnsuitable(x)'),false);
 trials(a,'x',`t=>{for(let i=1;i<=3;i++)t[i].suitable=false;}`);assert.equal(a.run('certainlyUnsuitable(x)'),false,'3 failures can still qualify (29 of 32)');
 trials(a,'x',`t=>{for(let i=1;i<=4;i++)t[i].suitable=false;}`);assert.equal(a.run('certainlyUnsuitable(x)'),true,'4 failures cannot');
 assert.equal(a.run('certainlyUnsuitable(x.slice(0,5))'),true,'decided before the other members run');
 trials(a,'x',`t=>{t[0].suitable=false;}`);assert.equal(a.run('certainlyUnsuitable(x.slice(0,1))'),true,'nominal failure');
 trials(a,'x',`t=>{t[2].equipmentEligible=false;t[2].suitable=false;}`);assert.equal(a.run('certainlyUnsuitable(x.slice(0,3))'),true,'equipment');
 trials(a,'x',`t=>{t[2].floorBreach=true;t[2].suitable=false;}`);assert.equal(a.run('certainlyUnsuitable(x.slice(0,3))'),true,'65°F floor');
});

test('a pruned plan completes to exactly the exhaustive evaluation; qualifying plans are never pruned',()=>{
 const a=app();scene(a);ensemble(a);
 let pruned=0;
 for(const [type,value] of [['passive',null],['ac',70],['hp',67],['furnace',66],['auto',{heat:65,cool:69}],['auto',{heat:66,cool:70}]]){
  a.run(`ph=[{time:+r.start,setup:${value===null?`planSetup('${type}',true)`:`withSetting(planSetup('${type}',true),${JSON.stringify(value)})`}}];
   ENSEMBLE.search='auto';auto=evaluatePlan(ph,e,r,rows);ENSEMBLE.search='exhaustive';exh=evaluatePlan(ph,e,r,rows);ENSEMBLE.search='auto';full=fullPlan(auto);`);
  if(a.run('!!auto.pruned')){
   pruned++;
   assert.ok(a.run('auto.trials.length')<32,'stopped early');assert.equal(a.run('auto.suitable'),false);assert.equal(a.run('exh.suitable'),false);
  }
  assert.equal(a.run(digest('full')),a.run(digest('exh')),type+' '+JSON.stringify(value));
  if(a.run('exh.suitable&&exh.ready'))assert.equal(a.run('!!auto.pruned'),false,'a qualifying plan is evaluated in full');
 }
 assert.ok(pruned>=2,'the synthetic night prunes some setups');
});

test('lazy completion: the best of a list matches the exhaustive sort, with pruned plans',()=>{
 const a=app();scene(a);ensemble(a);
 a.run(`setups=[planSetup('passive',true),withSetting(planSetup('ac',true),70),withSetting(planSetup('hp',true),66),withSetting(planSetup('hp',true),67),
   withSetting(planSetup('furnace',true),65),withSetting(planSetup('furnace',true),67),withSetting(planSetup('auto',true),{heat:65,cool:69}),withSetting(planSetup('auto',true),{heat:66,cool:70})];
  ENSEMBLE.search='auto';autos=setups.map(s=>evaluatePlan([{time:+r.start,setup:s}],e,r,rows));
  ENSEMBLE.search='exhaustive';exhs=setups.map(s=>evaluatePlan([{time:+r.start,setup:s}],e,r,rows));ENSEMBLE.search='auto';`);
 assert.ok(a.run('autos.some(p=>p.pruned)'));
 assert.equal(a.run('stablePlanId(bestPlan(autos))'),a.run('stablePlanId(exhs.slice().sort(comparePlans)[0])'));
 // Every pairwise choice agrees with the exhaustive comparator.
 for(let i=0;i<8;i++)for(let j=0;j<8;j++)if(i!==j)
  assert.equal(a.run(`stablePlanId(pickPlan(autos[${i}],autos[${j}]))`),a.run(`stablePlanId(comparePlans(exhs[${i}],exhs[${j}])<0?exhs[${i}]:exhs[${j}])`),i+' vs '+j);
 // bestByType keeps the first plan of each type, in exhaustive sort order, evaluated in full.
 const types=a.run('JSON.stringify(bestByType(autos).map(p=>[stablePlanId(p),p.trials.length]))');
 const ref=a.run(`JSON.stringify((()=>{const m=new Map();for(const p of exhs.slice().sort(comparePlans))if(!m.has(p.type))m.set(p.type,p);return [...m.values()].map(p=>[stablePlanId(p),32]);})())`);
 assert.equal(types,ref);
});

test('shortlist: survivors in screening-severity order, K = 6 → 12 → all while none qualifies; cut survivors counted',()=>{
 const a=app();scene(a);ensemble(a);
 // 20 synthetic survivors; severity i, and completion returns a plan that qualifies only for the listed indices.
 const run=q=>{a.run(`ENSEMBLE_SEARCH.cut=0;ENSEMBLE_SEARCH.expanded=0;done=[];good=new Set(${JSON.stringify(q)});
  list=Array.from({length:20},(_,k)=>{const i=19-k;return{phases:[{time:i,setup:{key:'s'+i}}],screen:{severity:{mean:i,worst3:i,rhMean:0,passes:8},complete(){done.push(i);return{id:i,ok:good.has(i)};}}};});
  out=shortlistComplete(list,p=>!!p.ok);`);
  return{done:JSON.parse(a.run('JSON.stringify(done)')),cut:a.run('ENSEMBLE_SEARCH.cut'),expanded:a.run('ENSEMBLE_SEARCH.expanded')};};
 let r=run([2]);assert.deepEqual(r.done,[0,1,2,3,4,5]);assert.equal(r.cut,14);assert.equal(r.expanded,0);
 r=run([9]);assert.deepEqual(r.done,[0,1,2,3,4,5,6,7,8,9,10,11]);assert.equal(r.cut,8);assert.equal(r.expanded,1);
 r=run([17]);assert.equal(r.done.length,20);assert.equal(r.cut,0);assert.equal(r.expanded,2);
 r=run([]);assert.equal(r.done.length,20,'none qualifies: all survivors are completed');assert.equal(r.cut,0);
});

test('screening: a deferred survivor holds the screening members and completes to the exhaustive result',()=>{
 const a=app();scene(a);ensemble(a);
 a.run(`ph=[{time:+r.start,setup:withSetting(planSetup('auto',true),{heat:66,cool:70})}];
  d=evaluatePlan(ph,e,r,rows,{defer:true});ENSEMBLE.search='exhaustive';exh=evaluatePlan(ph,e,r,rows);ENSEMBLE.search='auto';`);
 if(a.run('!!d.screen')){
  assert.equal(a.run('d.trials.length'),8);assert.ok(Number.isFinite(a.run('d.screen.severity.mean')));
  a.run('c=d.screen.complete();');assert.equal(a.run(digest('fullPlan(c)')),a.run(digest('exh')));
 }else assert.equal(a.run('!!d.pruned'),true,'decided during screening');
});

test('checkpoints: prefixes keep only five-minute marks, and a resumed handoff equals a direct run',()=>{
 const a=app();scene(a);ensemble(a);
 a.run(`ph=[{time:+r.start,setup:withSetting(planSetup('hp',true),66)},{time:+r.start+95*60000,setup:withSetting(planSetup('furnace',true),66)}];
  pre=simulatePlan([ph[0]],e,r,AIR_SCENARIOS[4],rows,null,true,true);`);
 assert.ok(a.run('pre.checkpoints.length')>0);assert.equal(a.run('pre.checkpoints.every(c=>c.time%300000===0)'),true);
 a.run(`d=simulatePlan(ph,e,r,AIR_SCENARIOS[4],rows,null,false,true);cp=pre.checkpoints.find(c=>c.time===ph[1].time);
  res=simulatePlan(ph,e,r,AIR_SCENARIOS[4],rows,{time:ph[1].time,carry:cp,prefix:pre},false,true);`);
 assert.equal(a.run('JSON.stringify([res.trace,res.segments,res.finalZones,res.score])'),a.run('JSON.stringify([d.trace,d.segments,d.finalZones,d.score])'));
});

test('display trace: ranges and readings at display boundaries are unchanged',()=>{
 const a=app();scene(a);
 a.run(`tr=Array.from({length:400},(_,i)=>({time:new Date(${start}+i*45000),bedroom:67+Math.sin(i/7)*2,midCoach:66+Math.cos(i/5),rh:45+Math.sin(i/3)*4,midRH:44,dewPoint:40+Math.sin(i/11),midDewPoint:39,indoor:66.5,water:[.01,.01],sleep:i>=200}));
  marks=new Set([${start},${start}+80*45000,${start}+200*45000,${start}+399*45000]);d=displayTrace(tr,marks);P={trials:[{trace:tr}]};Q={trials:[{trace:d}]};`);
 assert.ok(a.run('d.length')<20);
 for(const [f,t] of [[0,80],[0,399],[80,200],[200,399]])for(const field of ['bedroom','midCoach','rh','midRH','dewPoint'])
  assert.equal(a.run(`traceRange(Q,${start}+${f}*45000,${start}+${t}*45000,'${field}')`),a.run(`traceRange(P,${start}+${f}*45000,${start}+${t}*45000,'${field}')`));
 for(const m of [0,80,200,399])assert.equal(a.run(`readingAt(Q,${start}+${m}*45000,'bedroom')`),a.run(`readingAt(P,${start}+${m}*45000,'bedroom')`));
 assert.equal(a.run(`frontOutlook(Q.trials,${start},${start}+399*45000)`),a.run(`frontOutlook(P.trials,${start},${start}+399*45000)`));
});

test('end to end: automatic search renders the same plan as exhaustive; the trimmed Worker result renders identically',()=>{
 const run=search=>{const a=app();scene(a);a.run(`ENSEMBLE.enabled=true;ENSEMBLE.search='${search}';res=runUnifiedPlan(r,e);html=renderPlan(res);`);return a;};
 const x=run('exhaustive'),y=run('auto');
 assert.equal(y.run('html'),x.run('html'));
 assert.ok(y.run('ENSEMBLE_SEARCH.pruned')>0);assert.ok(y.run('SEARCH_WORK')<x.run('SEARCH_WORK'),'less simulated work');
 assert.equal(y.run('res.search.exhaustive'),true);assert.match(y.run('html'),/data-search="exhaustive"/);
 const before=y.run('html');y.ctx.structuredClone=structuredClone;
 y.run('trimPlanResult(res);res2=structuredClone(res);');assert.equal(y.run('renderPlan(res2)'),before);
 assert.equal(y.run('res.winner.trials.slice(1).every(t=>t.segments.length===0)&&res.winner.trials[0].segments.length>0'),true,'nominal kept whole for logging');
});

test('disclosure text: exhaustive and bounded searches',()=>{
 const a=app();
 assert.match(a.run(`ensembleSearchText({exhaustive:true,unchecked:0})`),/every plan that could still qualify was checked in all 32 conditions/);
 assert.match(a.run(`ensembleSearchText({exhaustive:false,unchecked:3})`),/^Bounded search: 3 plans that could still qualify were not checked in all 32 conditions/);
 assert.match(a.run(`ensembleSearchText({exhaustive:false,unchecked:1})`),/1 plan that could still qualify was not checked/);
 assert.equal(a.run('ensembleSearchText(null)'),'');
});

test('flag off: nine cases are evaluated in full and the posted result keeps the winner trajectories',()=>{
 const a=app();scene(a);a.run('ENSEMBLE.enabled=false;res=runUnifiedPlan(r,e);');
 assert.equal(a.run('res.search===undefined'),true);assert.equal(a.run('res.winner.trials.length'),9);
 a.run('trimPlanResult(res);');assert.equal(a.run('res.winner.trials.every(t=>t.segments.length>0&&t.trace.length>2)'),true);
});
