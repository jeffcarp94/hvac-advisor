const {test}=require('node:test');
const assert=require('node:assert/strict');
const {app,fixture}=require('./helpers.cjs');

test('decodes day, minute, second and explicit-end intervals; rejects ambiguous durations',()=>{
    const a=app();
    assert.equal(a.run("durationMs('P1DT2H30M')"),95400000);
    assert.equal(a.run("durationMs('PT90M')"),5400000);
    assert.equal(a.run("durationMs('PT30S')"),30000);
    assert.equal(a.run("decodeIntervals([{validTime:'2026-10-21T00:00Z/2026-10-22T02:00Z',value:10}],v=>v,'temperature',-150,160)[0].end"),Date.parse('2026-10-22T02:00Z'));
    for(const duration of ['PT0H','P1M','bad','P','PT'])assert.throws(()=>a.run(`durationMs(${JSON.stringify(duration)})`));
});

test('rejects overlap, invalid numbers and out-of-range humidity; null is retained as missing',()=>{
    const a=app();
    for(const value of ['101','NaN',"'50'"])assert.throws(()=>a.run(`decodeIntervals([{validTime:'2026-10-21T00:00Z/PT3H',value:${value}}],v=>v,'humidity',0,100)`));
    assert.throws(()=>a.run("decodeIntervals([{validTime:'2026-10-21T00:00Z/PT3H',value:1},{validTime:'2026-10-21T02:00Z/PT1H',value:2}],v=>v,'temperature',-150,160)"),/Overlapping/);
    assert.equal(a.run("decodeIntervals([{validTime:'2026-10-21T00:00Z/PT3H',value:null}],v=>v,'humidity',0,100)[0].value"),null);
});

test('maximum RH respects an interval longer than a day',()=>{
    const a=app();assert.equal(a.run("extractMaxRH([{validTime:'2026-10-21T00:00Z/P1DT2H',value:95}],'2026-10-21T17:00Z','2026-10-21T18:00Z')"),95);
});

test('Current preserves constant NWS intervals instead of creating a ramp',()=>{
    const a=app();fixture(a);
    a.run("forecast.intervals.temperature=[{start:Date.parse('2026-10-21T12:00Z'),end:Date.parse('2026-10-21T15:00Z'),value:50},{start:Date.parse('2026-10-21T15:00Z'),end:Date.parse('2026-10-21T16:00Z'),value:68}]");
    assert.equal(a.run("lookupEnvelopeAt(buildCurrentEnvelope(new Date('2026-10-21T12:00Z'),new Date('2026-10-21T16:00Z')),new Date('2026-10-21T14:00Z')).tOut"),50);
    assert.equal(a.run("lookupEnvelopeAt(buildCurrentEnvelope(new Date('2026-10-21T12:00Z'),new Date('2026-10-21T16:00Z')),new Date('2026-10-21T15:00Z')).tOut"),68);
});

test('requires complete temperature, RH and period-weather coverage, including gaps between samples',()=>{
    for(const layer of ['temperature','humidity']){
        const a=app();fixture(a);
        a.run(`forecast.intervals.${layer}=[{start:Date.parse('2026-10-21T17:00Z'),end:Date.parse('2026-10-21T17:10Z'),value:50},{start:Date.parse('2026-10-21T17:20Z'),end:Date.parse('2026-10-21T19:00Z'),value:50}]`);
        assert.throws(()=>a.run("makeEnvelope(new Date('2026-10-21T17:00Z'),new Date('2026-10-21T19:00Z'),'Test',3600000)"),/coverage is incomplete/);
    }
    const a=app();fixture(a);a.run('forecast.periods[0].wind=null');assert.throws(()=>a.run('buildEnvelope(false)'),/coverage/);
});

test('null RH is not replaced by nearest or invented humidity',()=>{
    const a=app();fixture(a);a.run('forecast.intervals.humidity[0].value=null');
    assert.throws(()=>a.run('buildEnvelope(false)'),/humidity coverage/);
});

test('rain RH floor is applied to evaluated points only in qualifying periods',()=>{
    const a=app();fixture(a);
    a.run("forecast.periods=[{start:Date.parse('2026-10-21T00:00Z'),end:Date.parse('2026-10-21T18:00Z'),cloud:.1,wind:5,precip:'rain',rainFloor:true},{start:Date.parse('2026-10-21T18:00Z'),end:Date.parse('2026-10-24T00:00Z'),cloud:1,wind:5,precip:'none',rainFloor:false}]");
    assert.equal(a.run("buildEnvelope(false).points.find(p=>p.time.getUTCHours()===17).rh"),90);
    assert.equal(a.run("buildEnvelope(false).points.find(p=>p.time.getUTCHours()===18).rh"),50);
});

test('late-day window uses tomorrow weather; evening uses the matching night period',()=>{
    const a=app();fixture(a);a.setNow('2026-10-22T01:00Z');a.run('forecast.fetchedAt=Date.now();forecast.issuedAt=Date.now()');
    a.run("forecast.periods=[{start:Date.parse('2026-10-21T00:00Z'),end:Date.parse('2026-10-22T00:00Z'),cloud:1,wind:1,precip:'none'},{start:Date.parse('2026-10-22T00:00Z'),end:Date.parse('2026-10-22T12:00Z'),cloud:.1,wind:9,precip:'rain'},{start:Date.parse('2026-10-22T12:00Z'),end:Date.parse('2026-10-24T00:00Z'),cloud:.3,wind:3,precip:'none'}]");
    assert.equal(a.run('buildEnvelope(false).wind'),3);
    assert.equal(a.run("buildCurrentEnvelope(new Date('2026-10-22T01:00Z'),new Date('2026-10-22T03:00Z')).wind"),9);
});

test('remote ZIP windows use location time, independent of device time zone',()=>{
    const a=app();fixture(a,{zone:'America/Los_Angeles'});a.setNow('2026-10-22T01:00Z');
    assert.equal(a.run('computeWindow(false).label'),'Today');
    assert.equal(a.run('computeWindow(false).end.toISOString()'),'2026-10-22T02:00:00.000Z');
    assert.equal(a.run("formatTime(new Date('2026-10-22T01:00Z'))"),'6:00 PM');
});

test('overnight calendar boundaries handle DST and half-hour zones',()=>{
    const a=app();a.run("forecast.timeZone='America/Chicago'");a.setNow('2026-10-31T17:00Z');
    assert.equal(a.run('(computeWindow(true).end-computeWindow(true).start)/3600000'),10);
    a.setNow('2026-03-07T17:00Z');assert.equal(a.run('(computeWindow(true).end-computeWindow(true).start)/3600000'),8);
    a.run("forecast.timeZone='America/St_Johns'");a.setNow('2026-10-21T17:00Z');
    assert.equal(a.run('computeWindow(true).start.toISOString()'),'2026-10-22T00:30:00.000Z');
});

test('weather edits switch to manual, clear stale results and use displayed values',()=>{
    const a=app();fixture(a);a.element('results').innerHTML='old';a.run("step('temp',1)");
    assert.equal(a.run('state.weatherMode'),'manual');assert.equal(a.element('results').innerHTML,'');
    assert.equal(a.run('buildEnvelope(false).points[0].tOut'),79);
    a.run("setWeatherMode('forecast')");assert.equal(a.run('state.temp'),50);
    a.run("state.cloud=.3;state.wind=7;setWeatherMode('manual')");
    assert.equal(a.run('buildEnvelope(false).cloud'),.3);assert.equal(a.run('buildEnvelope(false).wind'),7);
});

test('indoor edits invalidate without discarding the forecast source',()=>{
    const a=app();fixture(a);a.element('results').innerHTML='old';a.run("step('indoor',1)");
    assert.equal(a.run('state.weatherMode'),'forecast');assert.equal(a.element('results').innerHTML,'');
});

test('editing ZIP clears the previous forecast, location, recommendation and setpoints',()=>{
    const a=app();fixture(a);a.run('analyze()');a.element('weatherLocation').textContent='Old city';
    a.run('locationEdited()');assert.equal(a.run('forecast.fetched'),false);
    assert.equal(a.element('weatherLocation').textContent,'');assert.equal(a.element('results').innerHTML,'');
    assert.match(a.element('setpointDisplay').textContent,/Thermostat: day heat\/cool 70\/72/);
    assert.throws(()=>a.run('buildEnvelope(false)'),/Retrieve a forecast/);
});

test('forecast expires at two hours; stale or missing issue time blocks analysis',()=>{
    const a=app();fixture(a);a.run('forecast.fetchedAt=Date.now()-2*3600000');
    assert.throws(()=>a.run('buildEnvelope(false)'),/two hours/);
    fixture(a);a.run('forecast.issuedAt=Date.now()-24*3600000');assert.throws(()=>a.run('buildEnvelope(false)'),/issue time/);
    fixture(a);a.run('forecast.issuedAt=NaN');assert.throws(()=>a.run('buildEnvelope(false)'),/issue time/);
});

test('a visible plan is cleared when weather expires or its next action arrives',()=>{
    const a=app();fixture(a);a.run('resultRecorded(buildEnvelope(false))');a.element('results').innerHTML='old';
    a.setNow('2026-10-21T19:00Z');a.run('checkResultValidity()');assert.equal(a.element('results').innerHTML,'');
});

test('the unified planner rejects missing measured inputs without a runtime error',async()=>{
    const a=app();await a.run('analyze()');assert.match(a.element('resultStatus').textContent,/both indoor temperatures/);
    fixture(a);await a.run('analyze()');assert.match(a.element('resultStatus').textContent,/both indoor temperatures/);
});

test('API failure clears previous location/forecast and late completion cannot overwrite edits',async()=>{
    const a=app();fixture(a);a.element('zipInput').value='50273';a.element('weatherLocation').textContent='Previous city';
    a.ctx.fetch=async()=>{throw new Error('Offline');};await a.run('retrieveWeather()');
    assert.equal(a.run('forecast.fetched'),false);assert.equal(a.element('weatherLocation').textContent,'');
    assert.match(a.element('resultStatus').textContent,/Weather unavailable/);
    const id=a.run('beginWeatherRequest().id');a.run("setWeatherMode('manual')");
    a.ctx.oldId=id;a.run("finishWeatherRequest({id:oldId},new Error('late error'))");
    assert.equal(a.run('state.weatherMode'),'manual');assert.doesNotMatch(a.element('weatherStatus').textContent,/late error/);
});

test('fetch bypasses HTTP cache and supports cancellation',async()=>{
    const a=app();let options;
    a.ctx.fetch=async(url,opts)=>{options=opts;return{ok:true,json:async()=>({ok:true})};};
    await a.run("fetchJSON('https://api.weather.gov/test')");assert.equal(options.cache,'no-store');
    a.ctx.fetch=(url,opts)=>new Promise((resolve,reject)=>{if(opts.signal.aborted)reject(new Error('aborted'));else opts.signal.addEventListener('abort',()=>reject(new Error('aborted')));});
    const promise=a.run("(()=>{const c=new AbortController();const p=fetchJSON('https://api.weather.gov/test',c.signal);c.abort();return p;})()");
    await assert.rejects(promise,/cancelled/);
});

test('period parser converts supported units, recognizes calm, and qualifies rain policy',()=>{
    const a=app();
    a.run("testPeriod={temperature:10,temperatureUnit:'C',windSpeed:'8 to 16 km/h',shortForecast:'Rain',probabilityOfPrecipitation:{value:50},startTime:'2026-10-21T12:00Z',endTime:'2026-10-22T00:00Z'}");
    assert.equal(a.run('parsePeriod(testPeriod,50).temp'),50);
    assert.equal(a.run('parsePeriod(testPeriod,50).rh'),90);
    assert.ok(Math.abs(a.run('parsePeriod(testPeriod,50).wind')-4.97097)<.001);
    a.run("testPeriod.windSpeed='Calm';testPeriod.probabilityOfPrecipitation.value=49");
    assert.equal(a.run('parsePeriod(testPeriod,50).wind'),0);assert.equal(a.run('parsePeriod(testPeriod,50).rh'),50);
});

test('complete ZIP retrieval uses discovered grid endpoint and records location/issue time',async()=>{
    const a=app();a.element('zipInput').value='50273';const calls=[];
    a.ctx.fetch=async(url,opts)=>{
        calls.push({url,cache:opts.cache});
        let body;
        if(url.includes('zippopotam'))body={places:[{latitude:'41.3',longitude:'-94.0','place name':'Winterset','state abbreviation':'IA'}]};
        else if(url.includes('/points/'))body={properties:{forecast:'https://api.weather.gov/forecast-fixture',forecastGridData:'https://api.weather.gov/grid-fixture',timeZone:'America/Chicago'}};
        else if(url.includes('/forecast-fixture'))body={properties:{updateTime:'2026-10-21T16:00Z',periods:[{name:'Fixture',startTime:'2026-10-21T00:00Z',endTime:'2026-10-24T00:00Z',isDaytime:true,temperature:50,temperatureUnit:'F',windSpeed:'5 mph',shortForecast:'Clear',probabilityOfPrecipitation:{value:0}}]}};
        else body={properties:{updateTime:'2026-10-21T16:00Z',temperature:{uom:'wmoUnit:degC',values:[{validTime:'2026-10-21T00:00Z/P3D',value:10}]},relativeHumidity:{uom:'wmoUnit:percent',values:[{validTime:'2026-10-21T00:00Z/P3D',value:50}]}}};
        return{ok:true,json:async()=>body};
    };
    await a.run('retrieveWeather()');
    assert.equal(a.run('forecast.location'),'Winterset, IA');assert.equal(a.run('forecast.fetched'),true);
    assert.equal(a.run('forecast.timeZone'),'America/Chicago');assert.equal(calls.length,4);
    assert.ok(calls.every(c=>c.cache==='no-store'));assert.match(a.element('weatherStatus').textContent,/Forecast retrieved/);
});

test('a late successful request cannot restore forecast after a manual edit',async()=>{
    const a=app();a.element('zipInput').value='50273';let resolveZip;
    a.ctx.fetch=url=>new Promise(resolve=>{if(url.includes('zippopotam'))resolveZip=resolve;else resolve({ok:true,json:async()=>({properties:{forecast:'https://api.weather.gov/f',forecastGridData:'https://api.weather.gov/g',timeZone:'America/Chicago'}})});});
    const pending=a.run('retrieveWeather()');
    a.run("step('temp',1)");
    resolveZip({ok:true,json:async()=>({places:[{latitude:'41',longitude:'-94','place name':'Old','state abbreviation':'IA'}]})});
    await pending;assert.equal(a.run('state.weatherMode'),'manual');assert.equal(a.run('forecast.fetched'),false);
    assert.equal(a.run('state.temp'),79);
});


