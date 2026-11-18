// Usage: node tools/analysis/calibration-profile.cjs <repo> <param> <v1,v2,...> [iterations]
// Profile likelihood of the v6.6.15 joint garage fit (owner YoLink runs, digitized ±0.3°F, ±1 min).
// Holds <param> at each listed value and re-optimizes every other free parameter
// (ca, cm, tau, f, w, ff, sf, fm, mx; shp = 1 and u = 1 held fixed as in v6.6.15) by Nelder–Mead,
// warm-started from the previous grid point. Prints one JSON line per value with the re-fitted
// parameters and the front / rear / gap RMSE of each run.
// mx scales the forced interzone term (60 CFM + 120 CFM × circulation) exactly as
// AIR_WEATHER_CASES.mix does in zoneProfile.
const repo=process.argv[2],target=process.argv[3],grid=process.argv[4].split(',').map(Number),iters=+(process.argv[5]||220);
// joint-fit.cjs reads its own argv (argv[4] = furnace off minute); give it only the repo.
process.argv=process.argv.slice(0,3);
const {errors}=require(repo+'/tools/analysis/joint-fit.cjs');
const adopted={ca:297,cm:574,tau:.98,f:.38,w:.58,ff:.57,sf:.77,fm:.49,mx:1};
// cab (cab conductance factor, nominal 3) is held at 3 unless it is the profiled parameter.
if(target==='cab')adopted.cab=3;
const fixed={shp:1,u:1};
const lo={ca:15,cm:50,tau:.05,f:.1,w:.02,ff:.2,sf:.1,fm:0,mx:0,cab:.3},hi={ca:2000,cm:5000,tau:8,f:.8,w:12,ff:.98,sf:1.5,fm:.95,mx:6,cab:12};
const lin=new Set(['f','ff','fm','mx','cab']);
const names=Object.keys(adopted).filter(k=>k!==target);
const clamp=(k,v)=>Math.min(hi[k],Math.max(lo[k],v));
const enc=(k,v)=>lin.has(k)?v:Math.log(v),dec=(k,v)=>clamp(k,lin.has(k)?v:Math.exp(v));
function nm(cost,x0,steps){
    const n=x0.length;let S=[x0.slice()];
    for(let i=0;i<n;i++){const x=x0.slice();x[i]+=lin.has(names[i])?steps.lin:steps.log;S.push(x);}
    let V=S.map(cost);
    for(let k=0;k<iters;k++){
        const idx=V.map((v,i)=>i).sort((a,b)=>V[a]-V[b]);S=idx.map(i=>S[i]);V=idx.map(i=>V[i]);
        const c=S.slice(0,n).reduce((s,x)=>s.map((v,j)=>v+x[j]/n),Array(n).fill(0)),w=S[n],xr=c.map((v,j)=>2*v-w[j]),fr=cost(xr);
        if(fr<V[0]){const xe=c.map((v,j)=>3*v-2*w[j]),fe=cost(xe);if(fe<fr){S[n]=xe;V[n]=fe;}else{S[n]=xr;V[n]=fr;}}
        else if(fr<V[n-1]){S[n]=xr;V[n]=fr;}
        else{const xc=c.map((v,j)=>(v+w[j])/2),fc=cost(xc);if(fc<V[n]){S[n]=xc;V[n]=fc;}
            else{for(let i=1;i<=n;i++){S[i]=S[i].map((v,j)=>(S[0][j]+v)/2);V[i]=cost(S[i]);}}}
    }
    const b=V.indexOf(Math.min(...V));return S[b];
}
let start={...adopted};
for(const value of grid){
    const toP=x=>({...fixed,...Object.fromEntries(names.map((k,i)=>[k,dec(k,x[i])])),[target]:value});
    const cost=x=>errors(toP(x)).cost;
    let x=names.map(k=>enc(k,start[k]));
    x=nm(cost,x,{lin:.05,log:.25});x=nm(cost,x,{lin:.02,log:.1});
    const p=toP(x),r=errors(p);start=p;
    const worst=Math.max(r.hp.front,r.hp.rear,r.hp.gap,r.furnace.front,r.furnace.rear,r.furnace.gap);
    console.log(JSON.stringify({target,value,cost:+r.cost.toFixed(4),worst:+worst.toFixed(3),
        hp:Object.fromEntries(Object.entries(r.hp).map(([k,v])=>[k,+v.toFixed(3)])),
        furnace:Object.fromEntries(Object.entries(r.furnace).map(([k,v])=>[k,+v.toFixed(3)])),
        params:Object.fromEntries(Object.entries(p).map(([k,v])=>[k,+(+v).toFixed(3)]))}));
}
