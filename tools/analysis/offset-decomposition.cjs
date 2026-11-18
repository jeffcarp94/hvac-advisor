// Usage: node tools/analysis/offset-decomposition.cjs <repo> [outdoor F ...]
// Synthetic steady nights (labeled: reconstructed inputs, not field data). Two occupants
// staying, 68F start at 9:50 PM CDT, sleep comfort. Setup per night: FURNACE 63 below the
// 42F changeover, AUTO HEAT PUMP 67/71 at or above it (the v6.6.15 steady-plan result).
// Starting from each body case's working estimate, varies ONE AIR_WEATHER_CASES field at a
// time to its restricted and greater value and reports how the bedroom-minus-front offset
// (mean after the first hour) and the bedroom range move. Prints JSON when --json is passed.
const repo=process.argv[2];const {app}=require(repo+'/tests/helpers.cjs');
const json=process.argv.includes('--json');
const temps=process.argv.slice(3).filter(x=>!x.startsWith('--')).map(Number);if(!temps.length)temps.push(30,45);
const a=app();
const cases=a.run('JSON.parse(JSON.stringify(AIR_WEATHER_CASES))'),bodies=a.run('BODY_CASES.map(b=>b.id)');
const fields=['flow','windSign','mix','ductRear','furnaceRear','widthFt','rhOffset','tempOffset','cabFactor','surfaceFactor'];
const airflow=['flow','windSign','mix','ductRear','furnaceRear','widthFt'];
function run(temp,scenario,body){
    const setup=temp<42?"withSetting(planSetup('furnace',true),63)":"withSetting(planSetup('auto',true),{heat:67,cool:71})";
    a.run(`forecast.timeZone='America/Chicago';state.temp=58;state.rh=25;state.wind=2;state.cloud=1;
     r={start:new Date('2026-10-24T02:50Z'),reading:new Date('2026-10-24T02:50Z'),initial:{temperature:[68,68],rh:[30,30]},occupancy:'staying',remote:false};
     e=makeEnvelope(r.start,planBounds(r.start).end,'Reconstructed steady night',300000);e.points.forEach(p=>p.tOut=${temp});
     sc={...${JSON.stringify(scenario)},bodyCase:BODY_CASES.find(b=>b.id==='${body}')};
     p=simulatePlan([{time:+r.start,setup:${setup}}],e,r,sc,null,null,false,true);
     tr=p.trace.filter(x=>+x.time>=+r.start+3600000);`);
    return a.run(`(()=>{const b=tr.map(x=>x.bedroom),f=tr.map(x=>x.midCoach),m=v=>v.reduce((x,y)=>x+y)/v.length;
      return{bmin:Math.min(...b),bmax:Math.max(...b),bmean:m(b),fmean:m(f),offset:m(b)-m(f)};})()`);
}
const out=[];
for(const temp of temps){
    for(const body of bodies){
        const base=run(temp,cases[0],body);
        out.push({temp,body,variant:'working estimate',...base});
        for(const field of fields)for(const k of [1,2]){
            if(cases[k][field]===cases[0][field]||cases[k][field]===undefined)continue;
            const r=run(temp,{...cases[0],[field]:cases[k][field]},body);
            out.push({temp,body,variant:field+'='+cases[k][field]+' ('+(k===1?'restricted':'greater')+')',...r,dOffset:r.offset-base.offset});
        }
        for(const k of [1,2]){
            const only={...cases[0],...Object.fromEntries(airflow.filter(f=>f in cases[k]).map(f=>[f,cases[k][f]]))};
            const r=run(temp,only,body);out.push({temp,body,variant:'airflow fields only, '+(k===1?'restricted':'greater'),...r,dOffset:r.offset-base.offset});
        }
        for(const k of [1,2])out.push({temp,body,variant:'full '+cases[k].name,...run(temp,cases[k],body)});
    }
}
if(json)console.log(JSON.stringify(out));
else for(const x of out)console.log(String(x.temp+'F').padEnd(4),x.body.padEnd(9),x.variant.padEnd(42),'bed',x.bmin.toFixed(1)+'-'+x.bmax.toFixed(1),
    'mean',x.bmean.toFixed(1),'front',x.fmean.toFixed(1),'offset',x.offset.toFixed(2),x.dOffset===undefined?'':'Δ '+(x.dOffset>=0?'+':'')+x.dOffset.toFixed(2));
