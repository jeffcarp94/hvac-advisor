// v6.6.19 (owner decision, November 18, 2026): when no plan qualifies, a trial that never reaches the
// comfort band counts as failing at its 30-minute recovery deadline. Synthetic plan objects (labeled).
const test=require('node:test'),assert=require('node:assert/strict'),{app}=require('./helpers.cjs');
const start=Date.parse('2026-07-18T18:00:00Z'),H=3600000;
function plan(a,name,trial){
 a.run(`${name}={suitable:false,ready:true,score:0,phases:[{time:${start},setup:planSetup('ac',false)}],setup:planSetup('ac',false),
  trials:[${JSON.stringify(trial)}].map(t=>({...t,trace:[{time:new Date(${start})},{time:new Date(t.end)}]}))};`);
}
test('a never-recovering sequence no longer outranks one that holds comfort for hours',()=>{
 const a=app();
 // Holds comfort, then stops on a comfort rule after 4 h.
 plan(a,'holds',{start,end:start+4*H,failureTime:start+4*H,recoveryMinutes:20,comfortReason:'Remains above 70°F for at least 15 minutes.'});
 // Never reaches the band: no in-run stop, runs to the 18 h horizon.
 plan(a,'never',{start,end:start+18*H,failureTime:null,recoveryMinutes:null,comfortReason:'Available HVAC does not restore comfort in this interval.'});
 assert.ok(a.run('comparePlans(holds,never)')<0);assert.ok(a.run('comparePlans(never,holds)')>0);
 assert.equal(a.run('[never,holds].sort(comparePlans)[0]===holds'),true);
});
test('the deadline applies only to trials that never recover; recovered runs keep their full duration',()=>{
 const a=app();
 plan(a,'early',{start,end:start+2*H,failureTime:start+2*H,recoveryMinutes:10,comfortReason:'x'});
 // Recovered, then a non-stopping end-of-run reason: still counts through the horizon (unchanged rule).
 plan(a,'recovered',{start,end:start+18*H,failureTime:null,recoveryMinutes:25,comfortReason:'Finishes outside the band.'});
 assert.ok(a.run('comparePlans(recovered,early)')<0);
 // A never-recovering trial is placed at start + 30 min, ahead of nothing that lasts longer.
 plan(a,'never',{start,end:start+18*H,failureTime:null,recoveryMinutes:null,comfortReason:'y'});
 plan(a,'quick',{start,end:start+10*60000,failureTime:start+10*60000,recoveryMinutes:5,comfortReason:'z'});
 assert.ok(a.run('comparePlans(never,quick)')<0,'30 min beats a 10-min stop');
 assert.ok(a.run('comparePlans(early,never)')<0,'2 h beats the 30-min deadline');
});
