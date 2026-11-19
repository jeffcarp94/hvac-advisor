// WP13 (v6.6.21) prior checks against the owner garage runs (Task A method: every parameter that a member
// does not draw stays at the v6.6.15 fit; no refit). Usage: node wp13-prior-checks.cjs <repo> [airflow|storage|disk|grid]
// Thresholds: v6.6.15 front/rear/gap residual combined in quadrature with the 0.3°F digitizing tolerance
// (heat pump 0.384 / 0.396 / 0.453°F, furnace 0.476 / 0.461 / 0.484°F). Prints JSON lines; ratio ≤ 1 passes.
const repo=process.argv[2],mode=process.argv[3]||'disk';process.argv=process.argv.slice(0,3);
const {errors}=require(repo+'/tools/analysis/joint-fit.cjs');
const base={ca:297,cm:574,tau:.98,f:.38,w:.58,ff:.57,sf:.77,fm:.49,mx:1,shp:1,u:1};
const lim={hp:{front:.384,rear:.396,gap:.453},furnace:{front:.476,rear:.461,gap:.484}};
const R={mx:.5,f:.40,ff:.52,w:.28},G={mx:2.8,f:.35,ff:.65,w:.30},LO={ca:295,cm:540,tau:.85},HI={ca:305,cm:630,tau:1.2};
const airflow=s=>{const e=s<0?R:G,k=Math.abs(s);return{mx:Math.exp(Math.log(e.mx)*k),f:base.f+(e.f-base.f)*k,ff:base.ff+(e.ff-base.ff)*k,w:base.w+(e.w-base.w)*k};};
const storage=s=>{const e=s<0?LO:HI,k=Math.abs(s);return{ca:base.ca+(e.ca-base.ca)*k,cm:base.cm+(e.cm-base.cm)*k,tau:base.tau+(e.tau-base.tau)*k};};
function check(p,label){const r=errors({...base,...p});
    const ratio=Math.max(...['hp','furnace'].flatMap(k=>['front','rear','gap'].map(c=>r[k][c]/lim[k][c])));
    console.log(JSON.stringify({...label,ok:ratio<=1,ratio:+ratio.toFixed(3),hp:Object.values(r.hp).map(v=>+v.toFixed(3)),furnace:Object.values(r.furnace).map(v=>+v.toFixed(3))}));}
const S=[-1,-.75,-.5,-.25,0,.25,.5,.75,1];
if(mode==='airflow')for(const s of S)check(airflow(s),{airflow:s});
if(mode==='storage')for(const s of S)check(storage(s),{storage:s});
if(mode==='disk'){for(let k=0;k<16;k++){const a=Math.cos(k*Math.PI/8),b=Math.sin(k*Math.PI/8);check({...airflow(a),...storage(b)},{airflow:+a.toFixed(3),storage:+b.toFixed(3)});}
    for(const [a,b] of [[-1,-1],[-1,1],[1,-1],[1,1],[.5,.5],[-.5,-.5],[.5,-.5],[-.5,.5]])check({...airflow(a),...storage(b)},{airflow:a,storage:b,square:true});}
if(mode==='grid')for(let ca=265;ca<=325;ca+=5)for(let cm=480;cm<=700;cm+=10)for(let i=0;i<=16;i++)check({ca,cm,tau:+(.8+.025*i).toFixed(3)},{ca,cm,tau:+(.8+.025*i).toFixed(3)});
