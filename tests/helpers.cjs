const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function app(){
    let clock=Date.parse('2026-10-21T17:00:00Z');
    const RealDate=Date;
    class Clock extends RealDate{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
    const elements=new Map(),listeners=new Map();
    const getElement=id=>{
        if(!elements.has(id)){
            const classes=new Set();
            elements.set(id,{value:'',textContent:'',innerHTML:'',style:{},disabled:false,
                classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},
                replaceChildren(){this.innerHTML='';},addEventListener(){},scrollIntoView(){}});
        }
        return elements.get(id);
    };
    const ctx=vm.createContext({Date:Clock,Intl,URL,AbortController,setTimeout,clearTimeout,setInterval(){},console,
        navigator:{},document:{getElementById:getElement,querySelectorAll:()=>[],addEventListener(){},hidden:false},
        window:{location:{protocol:'https:',reload(){}},addEventListener:(type,fn)=>listeners.set(type,fn)},
        fetch:async()=>{throw new Error('Unexpected network request');}});
    const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
    vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
    return{ctx,run:source=>vm.runInContext(source,ctx),element:getElement,setNow:date=>clock=Date.parse(date),listeners};
}
function fixture(a,{zone='America/Chicago',temp=50,rh=50}={}){
    a.run(`forecast={...emptyForecast(),fetched:true,timeZone:${JSON.stringify(zone)},location:'Fixture',fetchedAt:Date.now(),issuedAt:Date.now(),
        periods:[{start:Date.parse('2026-10-21T00:00Z'),end:Date.parse('2026-10-24T00:00Z'),cloud:1,wind:5,precip:'none',rainFloor:false}],
        intervals:{temperature:[{start:Date.parse('2026-10-21T00:00Z'),end:Date.parse('2026-10-24T00:00Z'),value:${temp}}],
        humidity:[{start:Date.parse('2026-10-21T00:00Z'),end:Date.parse('2026-10-24T00:00Z'),value:${rh}}]}};state.weatherMode='forecast';`);
}
module.exports={app,fixture};
