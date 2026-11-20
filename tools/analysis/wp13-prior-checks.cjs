// WP13 (v6.6.21) prior checks against the owner garage runs (Task A method: every parameter that a member
// does not draw stays at the fit (v6.6.27 refit since v6.6.27); no refit). Usage: node wp13-prior-checks.cjs <repo> [airflow|storage|disk|grid]
// Thresholds: the fit's front/rear/gap residual combined in quadrature with the 0.3°F digitizing tolerance
// (v6.6.27: heat pump 0.418 / 0.429 / 0.559°F, furnace 0.456 / 0.443 / 0.470°F; v6.6.15: 0.384 / 0.396 / 0.453, 0.476 / 0.461 / 0.484). Prints JSON lines; ratio ≤ 1 passes.
const repo=process.argv[2],mode=process.argv[3]||'disk';process.argv=process.argv.slice(0,3);
const {errors}=require(repo+'/tools/analysis/joint-fit.cjs');
const base={ca:229,cm:402,tau:.92,f:.36,w:.61,ff:.58,sf:.605,fm:.50,mx:1,shp:1,u:1}; // v6.6.27 refit (WP6 heat pump)
const lim={hp:{front:.418,rear:.429,gap:.559},furnace:{front:.456,rear:.443,gap:.470}}; // v6.6.27 residual ⊕ 0.3°F
// v6.6.27 sets re-derived around the refit (v6.6.21: R {mx .5, f .40, ff .52, w .28}, G {2.8, .35, .65, .30}, LO 295/540/.85, HI 305/630/1.2).
const SETS=JSON.parse(process.env.SETS||'null'); // optional override {R,G,LO,HI} for exploring candidate sets
const R=SETS?.R??{mx:.92,f:.387,ff:.568,w:.25},G=SETS?.G??{mx:1.805,f:.336,ff:.683,w:1.481},LO=SETS?.LO??{ca:227,cm:390,tau:.86},HI=SETS?.HI??{ca:232,cm:418,tau:1.02};
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
if(mode==='grid')for(let ca=195;ca<=265;ca+=5)for(let cm=320;cm<=520;cm+=10)for(let i=0;i<=12;i++)check({ca,cm,tau:+(.65+.05*i).toFixed(3)},{ca,cm,tau:+(.65+.05*i).toFixed(3)}); // v6.6.27: around the refit
