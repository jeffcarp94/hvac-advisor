// Usage: node tools/analysis/airflow-envelope.cjs <repo> [out.jsonl] [shard/of]
// Grid over the four airflow parameters the garage runs inform, with every non-airflow value held at
// v6.6.15 (storage 297/574 BTU/°F, τ 0.98 h, furnace 11,550 BTU/h, 49% to mass, construction UA):
//   f  ducted rear share, ff furnace rear share, w buoyant width (ft),
//   mx scale on the forced interzone term (60 CFM + 120 CFM × circulation).
// For each set: front / rear / gap RMSE against both owner garage runs (digitized YoLink, ±0.3°F, ±1 min)
// and the predicted bedroom-minus-front offset on three reconstructed steady nights (labeled synthetic):
// 30°F FURNACE 63, 45°F AUTO HEAT PUMP 67/71 and 85°F COOL 72 (nominal body, working weather case).
const repo=process.argv[2],outFile=process.argv[3],[shard,of]=(process.argv[4]||'0/1').split('/').map(Number);
process.argv=process.argv.slice(0,3);
const fs=require('fs');const {errors}=require(repo+'/tools/analysis/joint-fit.cjs');const {app}=require(repo+'/tests/helpers.cjs');
const base={ca:297,cm:574,tau:.98,sf:.77,fm:.49,shp:1,u:1};
const grid={f:[.32,.34,.36,.38,.40,.42],ff:[.45,.50,.55,.60,.65,.70,.75,.80],w:[.1,.25,.58,1,1.5,2,3],mx:[0,.5,1,1.5,2,3,4.5]};
const a=app();
const nights=[['30F FURNACE 63',30,"withSetting(planSetup('furnace',true),63)"],
    ['45F AUTO HP 67/71',45,"withSetting(planSetup('auto',true),{heat:67,cool:71})"],
    ['85F COOL 72',85,"withSetting(planSetup('ac',true),72)"]];
function night(p){
    return nights.map(([label,temp,setup])=>{
        a.run(`DUCT.rearFraction=${p.f};FURNACE.rearFraction=${p.ff};INTERZONE.widthFt=${p.w};
         forecast.timeZone='America/Chicago';state.temp=58;state.rh=25;state.wind=2;state.cloud=1;
         r={start:new Date('2026-10-24T02:50Z'),reading:new Date('2026-10-24T02:50Z'),initial:{temperature:[68,68],rh:[30,30]},occupancy:'staying',remote:false};
         e=makeEnvelope(r.start,planBounds(r.start).end,'Reconstructed steady night',300000);e.points.forEach(q=>q.tOut=${temp});
         sim=simulatePlan([{time:+r.start,setup:${setup}}],e,r,{...AIR_SCENARIOS[0],mix:${p.mx}},null,null,false,true);
         tr=sim.trace.filter(x=>+x.time>=+r.start+3600000);`);
        return {label,...a.run(`(()=>{const b=tr.map(x=>x.bedroom),f=tr.map(x=>x.midCoach),m=v=>v.reduce((x,y)=>x+y)/v.length;
            return{bmin:+Math.min(...b).toFixed(2),bmax:+Math.max(...b).toFixed(2),offset:+(m(b)-m(f)).toFixed(2)};})()`)};
    });
}
const lines=[];let i=0;
for(const f of grid.f)for(const ff of grid.ff)for(const w of grid.w)for(const mx of grid.mx){
    if(i++%of!==shard)continue;
    const p={...base,f,ff,w,mx},r=errors(p);
    const row={f,ff,w,mx,hp:Object.fromEntries(Object.entries(r.hp).map(([k,v])=>[k,+v.toFixed(3)])),
        furnace:Object.fromEntries(Object.entries(r.furnace).map(([k,v])=>[k,+v.toFixed(3)])),cost:+r.cost.toFixed(4)};
    row.nights=night(p);
    const line=JSON.stringify(row);lines.push(line);
    if(outFile)fs.appendFileSync(outFile,line+'\n');else console.log(line);
}
