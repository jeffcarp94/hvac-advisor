// v6.8.1 (owner decision, November 22, 2026): the shown plan and the Inputs setup survive the app being closed.
// The plan stays until its own end; at its recheck time it is marked, not cleared. Readings are never restored.
const test=require('node:test');
const assert=require('node:assert/strict');
const {app}=require('./helpers.cjs');

function withStorage(storage=new Map()){
    const a=app();
    a.ctx.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
    return {a,storage};
}
const H=3600000;

test('the Inputs setup is saved and restored; readings and the projected start are not',async()=>{
    const {a,storage}=withStorage();
    for(const [id,v] of Object.entries({zipInput:'50273',occupancyMode:'leaving',departureTime:'2026-10-21T14:00',returnTime:'2026-10-21T18:00',
        dehumidifierMode:'disabled',bedTemp:'68',frontTemp:'69',readingTime:'2026-10-21T11:55',planningMode:'future',futureStart:'2026-10-21T20:00'}))a.element(id).value=v;
    a.element('remoteAccess').checked=true;
    a.run(`forecast={...emptyForecast(),fetched:true,_lat:41.3792,_lon:-94.0016,location:'Winterset, IA'};state.weatherMode='forecast';state.temp=55;state.cloud=.6;state.precip='rain';saveSession();`);
    const saved=JSON.parse(storage.get('hvac-advisor-session-v1'));
    assert.equal(saved.fields.zipInput,'50273');assert.equal(saved.fields.remoteAccess,true);assert.deepEqual(saved.location,{lat:41.3792,lon:-94.0016,place:'Winterset, IA'});
    for(const id of ['bedTemp','frontTemp','readingTime','planningMode','futureStart','setupConfirmed','easyLogTemp'])assert.equal(id in saved.fields,false,id);
    // A fresh page (the phone unloaded the app): the setup comes back and the forecast is requested again.
    const b=withStorage(storage).a;const urls=[];b.ctx.fetch=async url=>{urls.push(url);throw new Error('offline for the test');};
    b.run('restoreSession()');await new Promise(r=>setImmediate(r));
    assert.equal(b.element('zipInput').value,'50273');assert.equal(b.element('occupancyMode').value,'leaving');assert.equal(b.element('departureTime').value,'2026-10-21T14:00');
    assert.equal(b.element('dehumidifierMode').value,'disabled');assert.equal(b.run('state.dehumidifierEnabled'),false);assert.equal(b.element('remoteAccess').checked,true);
    assert.equal(b.element('weatherMode').value,'forecast');assert.equal(b.run('state.weatherMode'),'forecast');
    assert.match(urls[0],/api\.weather\.gov\/points\/41\.3792,-94\.0016/);
    assert.equal(b.run('state.temp'),55);assert.equal(b.run('state.precip'),'rain');
    assert.equal(b.element('bedTemp').value,'');assert.equal(b.element('planningMode').value,'now');
});

test('manual weather is restored as manual; no saved location means no forecast request',()=>{
    const {a,storage}=withStorage();
    a.run(`state.weatherMode='manual';state.temp=81;state.rh=40;state.wind=9;saveSession();`);
    const b=withStorage(storage).a;b.ctx.fetch=async()=>{throw new Error('no request expected');};
    b.run('restoreSession()');
    assert.equal(b.element('weatherMode').value,'manual');assert.equal(b.run('state.temp'),81);assert.equal(b.element('tempValue').textContent,81);
    assert.equal(b.element('windValue').textContent,9);
});

test('the plan stays shown, is marked at its recheck time, survives a reload and ends at its own end',()=>{
    const {a,storage}=withStorage();
    const now=Date.parse('2026-10-21T17:00:00Z');
    a.element('results').innerHTML='<div id="planCard" class="plan">HEAT PUMP 70°F</div>';
    a.element('resultStatus').textContent='NWS · Winterset, IA · built 12:00 PM';
    a.run(`resultContext={mode:'forecast',windowEnd:${now+19*H},expires:${now+30*60000},request:null};savePlanView();`);
    // 31 minutes later, app still open: not cleared, marked.
    let card='';a.element('planCard').insertAdjacentHTML=(where,html)=>{card=html;};
    a.setNow(new Date(now+31*60000).toISOString());a.run('checkResultValidity()');
    assert.match(card,/Recheck time passed\. <\/b>Build a fresh plan with new readings\./);
    assert.equal(a.run('resultContext!==null'),true);
    // The phone unloads the app; reopening restores the plan and its status line.
    const b=withStorage(storage).a;b.setNow(new Date(now+2*H).toISOString());
    b.element('planCard').insertAdjacentHTML=()=>{};
    b.run('restoreSession()');
    assert.match(b.element('results').innerHTML,/HEAT PUMP 70°F/);assert.equal(b.element('emptyPlan').hidden,true);
    assert.equal(b.element('resultStatus').textContent,'NWS · Winterset, IA · built 12:00 PM');
    assert.equal(b.run('resultContext.restored'),true);
    // At the plan's end it is cleared, here and on the next reload.
    b.setNow(new Date(now+19*H).toISOString());b.run('checkResultValidity()');
    assert.equal(b.element('results').innerHTML,'');assert.equal(storage.has('hvac-advisor-plan-view-v1'),false);
    const c=withStorage(storage).a;c.run('restoreSession()');assert.equal(c.element('results').innerHTML,'');
});

test('changing inputs clears the shown and saved plan; an expired saved plan is not restored',()=>{
    const {a,storage}=withStorage();const now=Date.parse('2026-10-21T17:00:00Z');
    a.element('results').innerHTML='<div id="planCard">plan</div>';
    a.run(`resultContext={mode:'manual',windowEnd:${now+H},expires:${now+H},request:null};savePlanView();`);
    assert.equal(storage.has('hvac-advisor-plan-view-v1'),true);
    a.run('planInputsChanged()');
    assert.equal(storage.has('hvac-advisor-plan-view-v1'),false);assert.equal(a.element('results').innerHTML,'');
    storage.set('hvac-advisor-plan-view-v1',JSON.stringify({version:1,html:'old',status:'',windowEnd:now-1,expires:now-1,mode:'manual',saved:now-H}));
    const b=withStorage(storage).a;b.run('restoreSession()');
    assert.equal(b.element('results').innerHTML,'');assert.equal(storage.has('hvac-advisor-plan-view-v1'),false);
});
