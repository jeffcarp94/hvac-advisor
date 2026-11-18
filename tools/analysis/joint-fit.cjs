// Usage: node tools/analysis/joint-fit.cjs <repo> ['{"u":1,"shp":1}' fixed params] [furnace off minute] [iterations]
// Owner garage runs (YoLink, digitized; see fixtures). v6.6.15 adopted: shp=1,u=1 fixed; ca 297, cm 574, tau .98,
// f .38, w .58, ff .57, sf .77, fm .49.
// Joint fit: HP garage run (11/16) + furnace garage run (11/17). Shared storage, coupling,
// interzone width and envelope; separate equipment output scale and rear split.
const repo=process.argv[2];const {app}=require(repo+'/tests/helpers.cjs');
const hp=require(repo+'/tests/fixtures/garage-heat-pump-2026-11-16.json'),fu=require(repo+'/tests/fixtures/garage-furnace-2026-11-17.json');
const tests=[
 {name:'hp',d:hp,base:Date.parse('2026-11-16T18:00:00Z'),on:20,off:44,end:106,mode:'hp'},
 {name:'furnace',d:fu,base:Date.parse('2026-11-18T01:30:00Z'),on:10,off:+(process.argv[4]||53),end:106,mode:'furnace'}];
const a=app();a.ctx.structuredClone=structuredClone;
a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=false;solarLoad=()=>0;__hp=heatPumpCapacity;__shp=1;heatPumpCapacity=t=>__shp*__hp(t);
 __ea=envelopeAllocation;__u=1;envelopeAllocation=(...x)=>{const v=__ea(...x);return{...v,rear:v.rear*__u,front:v.front*__u};};
 __furn0=15000; // sf scales the pre-v6.6.15 estimate (19,000 input x 80%); adopted sf .77 -> 11,550`);
for(const t of tests){t.obs=t.d.minutes.map((m,i)=>({m,front:t.d.front[i],rear:t.d.rear[i]})).filter(o=>o.m>=t.on&&o.m<=t.end);t.i0=t.d.minutes.indexOf(t.on);
 t.points=t.d.minutes.map((m,i)=>({time:new Date(t.base+m*60000),tOut:t.d.garage[i],rh:42,wind:0,cloud:0,precip:'none'})).filter(p=>+p.time>=t.base+(t.on-1)*60000&&+p.time<=t.base+(t.end+1)*60000);}
function simulate(p,t){
 a.ctx.points=t.points;
 a.run(`STORAGE.airTotal=${p.ca};STORAGE.massTotal=${p.cm};STORAGE.massTauHours=${p.tau};DUCT.rearFraction=${p.f};INTERZONE.widthFt=${p.w};__shp=${p.shp};__u=${p.u??1};FURNACE.rearFraction=${p.ff};FURNACE.toMass=${p.fm??0};C.furnaceOutput=__furn0*${p.sf};
  start=new Date(${t.base+t.on*60000});
  r={start,reading:start,initial:{temperature:[${t.d.rear[t.i0]},${t.d.front[t.i0]}],rh:[40,40]},occupancy:'away',remote:false,departure:start,returnTime:new Date(${t.base+(t.end+60)*60000}),actualConfirmed:true};
  e={windowStart:start,windowEnd:new Date(${t.base+t.end*60000}),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,singlePoint:false,points,cloud:0,wind:0,precip:'none',elevationM:300};
  heat=withSetting(planSetup('${t.mode}',false,null,'High'),90);r.actual=heat;
  sim=simulatePlan([{time:+start,setup:heat},{time:${t.base+t.off*60000},setup:planSetup('passive',false)}],e,r,AIR_SCENARIOS[0],null,null,false,true);
  out=sim.trace.map(x=>[(+x.time-${t.base})/60000,x.bedroom,x.midCoach]);`);
 return a.run('out');
}
function errors(p){
 const res={};let total=0;
 for(const t of tests){const tr=simulate(p,t);let sf=0,sr=0,sg=0,n=0;
  for(const o of t.obs){const x=tr.find(x=>x[0]>=o.m-1e-9);if(!x)continue;sf+=(x[2]-o.front)**2;sr+=(x[1]-o.rear)**2;sg+=((x[1]-x[2])-(o.rear-o.front))**2;n++;}
  res[t.name]={front:Math.sqrt(sf/n),rear:Math.sqrt(sr/n),gap:Math.sqrt(sg/n)};total+=Math.sqrt((sf+sr)/(2*n))+.5*Math.sqrt(sg/n);}
 res.cost=total;return res;
}
module.exports={simulate,errors,tests};
if(require.main===module){
 const fixed=JSON.parse(process.argv[3]||'{}');
 const all=['ca','cm','tau','f','w','shp','ff','sf','u','fm'],lo={ca:15,cm:50,tau:.05,f:.15,w:.3,shp:.3,ff:.3,sf:.1,u:.2,fm:0},hi={ca:2000,cm:5000,tau:8,f:.7,w:12,shp:1.6,ff:.98,sf:1.5,u:2.5,fm:.95};
 const names=all.filter(k=>!(k in fixed)),lin=new Set(['f','ff','fm']);
 const toP=v=>({...fixed,...Object.fromEntries(names.map((k,i)=>[k,Math.min(hi[k],Math.max(lo[k],lin.has(k)?v[i]:Math.exp(v[i])))]))});
 const cost=v=>errors(toP(v)).cost;
 function nm(x0,iters){let n=x0.length,S=[x0.slice()];for(let i=0;i<n;i++){const x=x0.slice();x[i]+=lin.has(names[i])?.06:.35;S.push(x);}let V=S.map(cost);
  for(let k=0;k<iters;k++){const idx=V.map((v,i)=>i).sort((a,b)=>V[a]-V[b]);S=idx.map(i=>S[i]);V=idx.map(i=>V[i]);
   const c=S.slice(0,n).reduce((s,x)=>s.map((v,j)=>v+x[j]/n),Array(n).fill(0)),w=S[n],xr=c.map((v,j)=>2*v-w[j]),fr=cost(xr);
   if(fr<V[0]){const xe=c.map((v,j)=>3*v-2*w[j]),fe=cost(xe);if(fe<fr){S[n]=xe;V[n]=fe;}else{S[n]=xr;V[n]=fr;}}
   else if(fr<V[n-1]){S[n]=xr;V[n]=fr;}
   else{const xc=c.map((v,j)=>(v+w[j])/2),fc=cost(xc);if(fc<V[n]){S[n]=xc;V[n]=fc;}else{for(let i=1;i<=n;i++){S[i]=S[i].map((v,j)=>(S[0][j]+v)/2);V[i]=cost(S[i]);}}}}
  const b=V.indexOf(Math.min(...V));return S[b];}
 const seeds=[{ca:290,cm:565,tau:.95,f:.38,w:1,shp:1,ff:.7,sf:.7,u:1,fm:.4},{ca:200,cm:400,tau:.6,f:.35,w:.6,shp:.8,ff:.8,sf:.5,u:.8,fm:.6},{ca:350,cm:900,tau:1.5,f:.4,w:.5,shp:1,ff:.6,sf:.9,u:1,fm:.2}];
 for(const s of seeds){const x0=names.map(k=>lin.has(k)?s[k]:Math.log(s[k]));let x=nm(x0,+(process.argv[5]||500));x=nm(x,250);const p=toP(x);const r=errors(p);
  console.log(JSON.stringify(Object.fromEntries(Object.entries(p).map(([k,v])=>[k,+v.toFixed(3)]))),JSON.stringify(r,(k,v)=>typeof v==='number'?+v.toFixed(3):v));}
}
