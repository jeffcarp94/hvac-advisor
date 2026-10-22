const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function worker(scope='https://example.test/hvac-advisor/'){
    const handlers={},entries=new Map(),cacheNames=new Set(['hvac-advisor-v1','another-app-v2','hvac-advisor:/elsewhere/:old','hvac-advisor:/hvac-advisor/:old']);
    const state={network:0,offline:false,httpError:false,assets:[]};
    const cache={addAll:async reqs=>{state.assets=reqs.map(r=>r.url);for(const r of reqs)entries.set(r.url,new Response('precache'));},put:async(key,res)=>entries.set(key,res),match:async key=>entries.get(key)?.clone()};
    const ctx=vm.createContext({URL,Request,Response,
        self:{registration:{scope},location:new URL(scope),addEventListener:(type,fn)=>handlers[type]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},
        caches:{open:async name=>{cacheNames.add(name);return cache;},keys:async()=>[...cacheNames],delete:async key=>cacheNames.delete(key)},
        fetch:async()=>{state.network++;if(state.offline)throw new Error('Offline');return new Response('revision '+state.network,{status:state.httpError?503:200});}});
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),ctx);
    async function lifecycle(type){let pending;handlers[type]({waitUntil:p=>pending=p});await pending;}
    function request(url,{mode='navigate',method='GET'}={}){let pending;handlers.fetch({request:{url,mode,method},respondWith:p=>pending=p});return pending;}
    return{state,cacheNames,lifecycle,request,entries};
}

test('precache uses project-relative assets and excludes optional external fonts',async()=>{
    const w=worker();await w.lifecycle('install');
    assert.deepEqual(Array.from(w.state.assets),['index.html','manifest.json','icon-192.png','icon-512.png'].map(p=>'https://example.test/hvac-advisor/'+p));
});

test('activation removes legacy and own old cache while preserving other apps and scopes',async()=>{
    const w=worker();await w.lifecycle('install');await w.lifecycle('activate');
    assert.equal(w.cacheNames.has('hvac-advisor-v1'),false);
    assert.equal(w.cacheNames.has('hvac-advisor:/hvac-advisor/:old'),false);
    assert.equal(w.cacheNames.has('another-app-v2'),true);
    assert.equal(w.cacheNames.has('hvac-advisor:/elsewhere/:old'),true);
});

test('external weather/geocoding, non-GET and unrelated paths are never intercepted',()=>{
    const w=worker();
    assert.equal(w.request('https://api.weather.gov/gridpoints/DMX/1,1',{mode:'cors'}),undefined);
    assert.equal(w.request('https://api.zippopotam.us/us/50273',{mode:'cors'}),undefined);
    assert.equal(w.request('https://example.test/other/index.html'),undefined);
    assert.equal(w.request('https://example.test/hvac-advisor/api',{method:'POST'}),undefined);
});

test('each online navigation obtains fresh HTML, including a query-string launch',async()=>{
    const w=worker();await w.lifecycle('install');
    assert.equal(await(await w.request('https://example.test/hvac-advisor/')).text(),'revision 1');
    assert.equal(await(await w.request('https://example.test/hvac-advisor/?launch=1')).text(),'revision 2');
    assert.equal(w.state.network,2);
});

test('offline project navigation uses the latest cached app; HTTP errors stay visible',async()=>{
    const w=worker();await w.lifecycle('install');await w.request('https://example.test/hvac-advisor/');
    w.state.offline=true;assert.equal(await(await w.request('https://example.test/hvac-advisor/')).text(),'revision 1');
    w.state.offline=false;w.state.httpError=true;assert.equal((await w.request('https://example.test/hvac-advisor/')).status,503);
});

test('root-hosted app also precaches correctly',async()=>{
    const w=worker('https://example.test/');await w.lifecycle('install');
    assert.ok(w.state.assets.includes('https://example.test/index.html'));
});
