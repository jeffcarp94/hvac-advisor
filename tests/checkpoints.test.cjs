// v6.8.0 (owner decisions, November 22, 2026): Checkpoints tab. Logging and display only.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {app}=require('./helpers.cjs');

const endpoint='https://script.google.com/macros/s/test-deployment/exec';
const token='test-token-'.repeat(4);
const H=3600000;
function loggingApp(){
    const a=app(),storage=new Map();
    a.ctx.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
    a.ctx.crypto=require('node:crypto').webcrypto;a.ctx.AbortSignal=AbortSignal;a.ctx.navigator.onLine=false;a.ctx.structuredClone=structuredClone;
    a.element('logEnabled').checked=true;a.element('logEndpoint').value=endpoint;a.element('logToken').value=token;
    a.run('saveLogSettings()');
    return a;
}
async function checkpoint(a,values={}){
    for(const [id,v] of Object.entries({cpBedTemp:'67.5',cpFrontTemp:'68.4',cpBedRH:'44',cpFrontRH:'43',cpOpenings:'plan',cpDehumidifier:'on',cpOccupancy:'in_coach',...values}))
        a.element(id).value=v;
    await a.run('saveCheckpoint()');
    return a.run('readLogQueue().at(-1)?.event');
}
// Labeled synthetic weather: a steady 55°F night from 10 PM CST (the complete-plan case in logging.test.cjs).
function plannedNight(a){
    const start=Date.parse('2026-11-12T04:00:00Z');a.setNow(new Date(start).toISOString());
    a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;ENSEMBLE.enabled=true;
        r={occupancy:'staying',start:new Date(${start}),reading:new Date(${start}),initial:{temperature:[67,66],rh:[45,45]}};
        points=[55,55,55,55,55].map((tOut,i)=>({time:new Date(${start}+i*${H}),tOut,rh:45,cloud:1,wind:4,precip:'none'}));
        e={windowStart:r.start,windowEnd:new Date(${start}+5*${H}),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,points,cloud:1,wind:4,precip:'none'};
        result=structuredClone(trimPlanResult(runUnifiedPlan(r,e)));ev=prepareRunLog(r,e);finishRunLog(ev,result,Infinity);
        saveCheckpointPlan(result,e,ev.event_id,false);record=readCheckpointPlan();`);
    return start;
}

test('a checkpoint inside the saved plan logs predicted and measured values for the same time',async()=>{
    const a=loggingApp(),start=plannedNight(a);
    assert.equal(a.run('result.winner.suitable&&result.winner.ready'),true);
    assert.equal(a.run('record.members'),32);
    assert.equal(a.run('record.plan_event_id'),a.run('ev.event_id'));
    // Every member keeps exact values on the 10-minute grid after the Worker trim.
    assert.equal(a.run('record.series.every(p=>p.n===32)'),true);
    const planned=a.run('JSON.stringify(plannedSetupAt(record,record.start))');
    // The form is prefilled with the plan's setting.
    assert.equal(a.element('cpMode').value,a.run('plannedSetupAt(record,record.start).type'));
    a.setNow(new Date(start+65*60000).toISOString());
    a.element('cpTime').value=a.run(`inputDate(new Date(${start+65*60000}))`);a.run('checkpointTimeEdited=true');
    const ev=await checkpoint(a);
    assert.equal(ev.event_type,'checkpoint');assert.equal(ev.data_source,'real');
    assert.equal(ev.plan_event_id,a.run('ev.event_id'));
    assert.equal(ev.settings_match,'match');
    assert.equal(ev.planned_setup_json,planned);
    const p=JSON.parse(ev.predicted_json);
    assert.equal(p.valid_time,new Date(start+65*60000).toISOString());assert.equal(p.members,32);
    // 65 minutes is between grid points at 60 and 70: linear interpolation of the nominal member.
    const nominal=a.run(`(()=>{const t=result.winner.trials.find(t=>t.member===0).trace,at=x=>t.find(q=>+q.time===x).bedroom;
        return +(at(${start+3600000})+(at(${start+4200000})-at(${start+3600000}))*.5).toFixed(1);})()`);
    assert.ok(Math.abs(p.bed_temp_f-nominal)<=.1,p.bed_temp_f+' vs '+nominal);
    assert.ok(p.bed_range_f[0]<=p.bed_temp_f+.05&&p.bed_temp_f<=p.bed_range_f[1]+.05);
    const assumed=JSON.parse(ev.forecast_at_checkpoint_json);assert.equal(assumed.temperature_f,55);
    assert.deepEqual(JSON.parse(ev.observed_weather_json),{error:'offline'});
    assert.equal(ev.bed_temp_f,67.5);assert.equal(ev.front_temp_f,68.4);
    const html=a.element('cpResult').innerHTML;
    assert.match(html,/Bedroom measured<\/span><span class="v">67\.5°F/);
    assert.match(html,/Bedroom predicted<\/span><span class="v">\d+\.\d°F \(\d+\.\d–\d+\.\d\)/);
    assert.match(html,/Outdoor in the plan<\/span><span class="v">55\.0°F/);
    assert.doesNotMatch(html,/Settings differ/);
});

test('a different setting is marked; a checkpoint after the plan has no prediction',async()=>{
    const a=loggingApp(),start=plannedNight(a);
    const t=start+30*60000;a.setNow(new Date(t).toISOString());a.element('cpTime').value=a.run(`inputDate(new Date(${t}))`);a.run('checkpointTimeEdited=true');
    let ev=await checkpoint(a,{cpMode:'ac',cpSetpoint:'60',cpFan:'High'});
    assert.equal(ev.settings_match,'differs');assert.ok(ev.predicted_json);
    assert.match(a.element('cpResult').innerHTML,/Settings differ from the plan\./);
    // After 7:00 AM, when the plan ends.
    const late=start+10*H;a.setNow(new Date(late).toISOString());a.element('cpTime').value=a.run(`inputDate(new Date(${late}))`);a.run('checkpointTimeEdited=true');
    ev=await checkpoint(a,{cpMode:'passive'});
    assert.equal(a.element('cpStatus').textContent,'');
    assert.equal(ev.reading_utc,new Date(late).toISOString());
    assert.equal(ev.settings_match,'no plan');assert.equal(ev.predicted_json,null);assert.equal(ev.plan_event_id,null);
    assert.doesNotMatch(a.element('cpResult').innerHTML,/predicted/);
    a.run('showCheckpointPlan()');assert.match(a.element('cpPlanLine').textContent,/No current plan/);
});

test('the simulation box is owner-set only, logged once and never sticky',async()=>{
    const a=loggingApp();
    a.element('cpSimulation').checked=true;
    let ev=await checkpoint(a,{cpMode:'passive'});
    assert.equal(ev.data_source,'simulation');assert.equal(a.element('cpSimulation').checked,false);
    assert.match(a.element('cpResult').innerHTML,/Logged as simulation/);
    ev=await checkpoint(a,{cpMode:'passive'});assert.equal(ev.data_source,'real');
    // Plans: the flag is passed per build; manual weather alone never marks a plan as a simulation.
    a.run(`state.weatherMode='manual';r={start:new Date(),reading:new Date(),initial:{temperature:[68,69],rh:[50,48]},occupancy:'staying'};`);
    assert.equal(a.run('prepareRunLog(r,null).data_source'),'real');
    assert.equal(a.run('prepareRunLog(r,null,true).data_source'),'simulation');
    a.element('planSimulation').checked=true;a.element('cpSimulation').checked=true;a.run('initializeCheckpoints()');
    assert.equal(a.element('planSimulation').checked,false);assert.equal(a.element('cpSimulation').checked,false);
});

test('checkpoints validate readings, the AUTO pair and vote context',async()=>{
    const a=loggingApp();
    await checkpoint(a,{cpBedTemp:''});assert.match(a.element('cpStatus').textContent,/both temperatures/);
    await checkpoint(a,{cpMode:'auto',cpHeat:'66',cpCool:'67'});assert.match(a.element('cpStatus').textContent,/at least 2°F/);
    a.element('voteFront').value='Too cold';
    await checkpoint(a,{cpMode:'passive'});assert.match(a.element('cpStatus').textContent,/context/);
    assert.equal(a.run('readLogQueue().length'),0);
    a.element('voteContext').value='Awake elsewhere';a.element('cpTagShower').checked=true;a.element('cpNotes').value='Back door open 5 min';
    const ev=await checkpoint(a,{cpMode:'auto',cpHeat:'65',cpCool:'67',cpFan:'High',cpEasyTemp:'68',cpEasyOutdoor:'41',cpCall:'heating'});
    assert.equal(ev.actual_heat_to,65);assert.equal(ev.actual_cool_to,67);assert.equal(ev.actual_fan,'High');
    assert.equal(ev.easytouch_display_f,68);assert.equal(ev.easytouch_outdoor_f,41);assert.equal(ev.bias_obs_f,-.4);assert.equal(ev.active_call,'heating');
    assert.equal(ev.vote_front,'Too cold');assert.equal(ev.checkpoint_tags,'shower');assert.equal(ev.checkpoint_notes,'Back door open 5 min');
    assert.equal(a.element('cpTagShower').checked,false);assert.equal(a.element('cpNotes').value,'');
});

test('observed weather comes from the nearest NWS station with unit conversion',async()=>{
    const a=loggingApp();a.ctx.navigator.onLine=true;const urls=[];
    a.ctx.fetch=async url=>{urls.push(url);const json=
        url.includes('/points/')?{properties:{observationStations:'https://api.weather.gov/gridpoints/DMX/60,45/stations'}}:
        url.endsWith('/stations')?{features:[
            {id:'https://api.weather.gov/stations/KFAR',geometry:{coordinates:[-93.0,42.5]},properties:{stationIdentifier:'KFAR',name:'Far'}},
            {id:'https://api.weather.gov/stations/KNEAR',geometry:{coordinates:[-94.02,41.34]},properties:{stationIdentifier:'KNEAR',name:'Near'}}]}:
        url.endsWith('/KNEAR/observations/latest')?{properties:{timestamp:'2026-10-21T16:52:00+00:00',textDescription:'Cloudy',
            temperature:{unitCode:'wmoUnit:degC',value:5},dewpoint:{unitCode:'wmoUnit:degC',value:1},relativeHumidity:{unitCode:'wmoUnit:percent',value:75.4},
            windSpeed:{unitCode:'wmoUnit:km_h-1',value:16.09},windGust:{unitCode:'wmoUnit:km_h-1',value:null},cloudLayers:[{amount:'BKN'},{amount:'OVC'}]}}:null;
        if(!json)throw new Error('unexpected '+url);return {ok:true,json:async()=>json};};
    const w=await a.run('fetchObservedWeather(41.3358,-94.0136)');
    assert.equal(w.station_id,'KNEAR');assert.equal(w.temperature_f,41);assert.equal(w.dew_point_f,33.8);assert.equal(w.rh_pct,75);
    assert.equal(w.wind_mph,10);assert.equal(w.wind_gust_mph,null);assert.equal(w.sky,'Cloudy');assert.equal(w.cloud_layers,'BKN OVC');
    assert.ok(w.distance_mi<2);
    a.ctx.fetch=async()=>{throw new Error('down');};
    assert.deepEqual({...await a.run('fetchObservedWeather(41.3,-94)')},{error:'unavailable'});
    assert.deepEqual({...await a.run('fetchObservedWeather(NaN,-94)')},{error:'no location'});
});

test('an unedited checkpoint time is the save time; an edited one is kept, then reset',async()=>{
    const a=loggingApp();
    a.run("forecast.timeZone='America/Chicago';initializeCheckpoints()");const shown=a.element('cpTime').value;
    a.setNow('2026-10-21T19:30:00Z'); // the tab stayed open for 2.5 hours
    let ev=await checkpoint(a,{cpMode:'passive'});
    assert.equal(ev.reading_utc,'2026-10-21T19:30:00.000Z');assert.notEqual(shown,a.element('cpTime').value);
    a.element('cpTime').value='2026-10-21T13:00';a.run('checkpointTimeEdited=true');
    ev=await checkpoint(a,{cpMode:'passive'});assert.equal(ev.reading_utc,'2026-10-21T18:00:00.000Z');
    assert.equal(a.run('checkpointTimeEdited'),false);
});
test('the logged app version follows the release version',()=>{
    const a=app();
    const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8'),sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
    const version=sw.match(/APP_VERSION = '([\d.]+)'/)[1];
    assert.equal(a.run('LOG_APP_VERSION'),version);
    assert.match(html,new RegExp('<span class="header-version">v'+version.replace(/\./g,'\\.')+'</span>'));
});
