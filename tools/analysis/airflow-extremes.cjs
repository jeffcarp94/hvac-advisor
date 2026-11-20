// Usage: node tools/analysis/airflow-extremes.cjs <repo> <max|min> '<start json {f,ff,w,mx}>' [evaluations]
// Constrained search for the data-supported airflow parameter set that maximizes (max) or minimizes (min)
// the predicted bedroom-minus-front offset, summed over the reconstructed 30°F FURNACE 63 and
// 45°F AUTO HEAT PUMP 67/71 steady nights (labeled synthetic). Non-airflow values stay at v6.6.15.
// Constraint ("data-supported"): every front / rear / gap RMSE of both owner garage runs stays within
// the v6.6.15 fit residual combined in quadrature with the 0.3°F digitizing tolerance:
//   heat pump 0.384 / 0.396 / 0.453°F, furnace 0.476 / 0.461 / 0.484°F.
// This brackets the bedroom offset; it does not aim at any pass/fail outcome.
const repo=process.argv[2],sense=process.argv[3]==='min'?-1:1,start=JSON.parse(process.argv[4]),evals=+(process.argv[5]||240);
process.argv=process.argv.slice(0,3);
const {errors}=require(repo+'/tools/analysis/joint-fit.cjs');const {app}=require(repo+'/tests/helpers.cjs');
const base={ca:229,cm:402,tau:.92,sf:.605,fm:.50,shp:1,u:1}; // v6.6.27 refit (WP6 heat pump)
const residual={hp:{front:.291,rear:.307,gap:.472},furnace:{front:.344,rear:.326,gap:.362}}; // v6.6.27 refit
// TOL (env, default 0.3°F) is the digitizing tolerance; WMIN (env, default 0.02 ft) the buoyant-width floor;
// MXMIN (env, default 0) the forced-mix scale floor.
const tol=+(process.env.TOL||.3),wMin=+(process.env.WMIN||.02),mxMin=+(process.env.MXMIN||0);
const limit=run=>Object.fromEntries(Object.entries(residual[run]).map(([k,v])=>[k,Math.hypot(v,tol)]));
const bounds={f:[.28,.46],ff:[.45,.85],w:[wMin,3],mx:[mxMin,4.5]};
const a=app();
function offsets(p){
    return [[30,"withSetting(planSetup('furnace',true),63)"],[45,"withSetting(planSetup('auto',true),{heat:67,cool:71})"],[85,"withSetting(planSetup('ac',true),72)"]].map(([temp,setup])=>{
        a.run(`DUCT.rearFraction=${p.f};FURNACE.rearFraction=${p.ff};INTERZONE.widthFt=${p.w};
         forecast.timeZone='America/Chicago';state.temp=58;state.rh=25;state.wind=2;state.cloud=1;
         r={start:new Date('2026-10-24T02:50Z'),reading:new Date('2026-10-24T02:50Z'),initial:{temperature:[68,68],rh:[30,30]},occupancy:'staying',remote:false};
         e=makeEnvelope(r.start,planBounds(r.start).end,'Reconstructed steady night',300000);e.points.forEach(q=>q.tOut=${temp});
         sim=simulatePlan([{time:+r.start,setup:${setup}}],e,r,{...AIR_SCENARIOS[0],mix:${p.mx}},null,null,false,true);
         tr=sim.trace.filter(x=>+x.time>=+r.start+3600000);`);
        return a.run(`(()=>{const m=v=>v.reduce((x,y)=>x+y)/v.length;return m(tr.map(x=>x.bedroom))-m(tr.map(x=>x.midCoach));})()`);
    });
}
function evaluate(p){
    const r=errors({...base,...p});let violation=0;
    for(const run of ['hp','furnace'])for(const [k,v] of Object.entries(limit(run)))violation+=Math.max(0,r[run][k]-v);
    const o=offsets(p);return {p,r,o,violation,score:violation>0?-Infinity:sense*(o[0]+o[1])};
}
let best=evaluate(start),step={f:.02,ff:.04,w:.4,mx:.5};let seed=12345;
const rand=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
if(best.violation>0)console.error('start violates the constraint by',best.violation.toFixed(3));
for(let k=0;k<evals;k++){
    const keys=Object.keys(bounds),q={...best.p};
    for(const key of keys)if(rand()<.6)q[key]=Math.min(bounds[key][1],Math.max(bounds[key][0],q[key]+(rand()*2-1)*step[key]));
    const t=evaluate(q);
    if(t.score>best.score)best=t;else if(k%40===39)for(const key of Object.keys(step))step[key]*=.7;
}
const fmt=x=>+x.toFixed(3);
console.log(JSON.stringify({sense:sense>0?'max':'min',params:Object.fromEntries(Object.entries(best.p).map(([k,v])=>[k,fmt(v)])),
    offsets:{'30F FURNACE 63':fmt(best.o[0]),'45F AUTO HP 67/71':fmt(best.o[1]),'85F COOL 72':fmt(best.o[2])},
    hp:Object.fromEntries(Object.entries(best.r.hp).map(([k,v])=>[k,fmt(v)])),furnace:Object.fromEntries(Object.entries(best.r.furnace).map(([k,v])=>[k,fmt(v)])),violation:fmt(best.violation),tol,wMin,mxMin}));
