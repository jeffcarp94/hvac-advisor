const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

const endpoint = 'https://script.google.com/macros/s/test-deployment/exec';
const token = 'test-token-'.repeat(4);

function loggingApp() {
    const a = app();
    const storage = new Map();
    a.ctx.localStorage = {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)};
    a.ctx.crypto = require('node:crypto').webcrypto;
    a.ctx.AbortSignal = AbortSignal;
    a.ctx.navigator.onLine = false;
    a.element('logEnabled').checked = true;
    a.element('logEndpoint').value = endpoint + '/?authuser=0';
    a.element('logToken').value = token;
    a.run('saveLogSettings()');
    return a;
}

test('a readings event survives reload and only leaves the queue on matching acknowledgement', async () => {
    const a = loggingApp();
    a.element('bedTemp').value = '68';
    a.element('frontTemp').value = '69';
    a.element('bedRH').value = '50';
    a.element('frontRH').value = '48';
    a.run('logReadingsOnly()');
    const id = a.run('readLogQueue()[0].event.event_id');
    assert.ok(id);
    assert.equal(a.run('readLogQueue()[0].event.event_type'), 'readings_only');
    assert.equal(a.run('JSON.stringify(readLogQueue()).includes(readLogSettings().token)'), false);

    const reloaded = app();
    reloaded.ctx.localStorage = a.ctx.localStorage;
    reloaded.ctx.AbortSignal = AbortSignal;
    reloaded.run('initializeLogging()');
    assert.equal(reloaded.element('logEndpoint').value, endpoint);
    reloaded.ctx.fetch = async () => ({ok: true, json: async () => ({ok: false, code: 'unauthorized'})});
    await reloaded.run('flushLogQueue()');
    assert.match(reloaded.element('logStatus').textContent, /rejected the token/);
    reloaded.ctx.fetch = async (url, options) => {
        assert.equal(url, endpoint);
        assert.equal(options.headers['Content-Type'], 'text/plain');
        assert.equal(options.credentials, 'omit');
        const body = JSON.parse(options.body);
        assert.equal(body.token, token);
        assert.equal(body.event.event_id, id);
        return {ok: true, json: async () => ({ok: true, event_id: 'wrong'})};
    };
    await reloaded.run('flushLogQueue()');
    assert.equal(reloaded.run('readLogQueue()[0].state'), 'attempted');
    assert.equal(reloaded.run('readLogQueue()[0].event.event_id'), id);

    reloaded.ctx.fetch = async () => ({ok: true, json: async () => ({ok: true, event_id: id, row: 2})});
    reloaded.listeners.get('online')();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(reloaded.run('readLogQueue().length'), 0);
    assert.match(reloaded.element('logStatus').textContent, /Confirmed in row 2/);
});

test('queue limit and storage failure are visible and preserve continued use of the planner', () => {
    const a = loggingApp();
    a.run(`for(let i=0;i<201;i++)enqueueLogEvent({event_id:String(i)});`);
    assert.equal(a.run('readLogQueue().length'), 200);
    assert.equal(a.run('readLogQueue()[0].event.event_id'), '1');
    assert.match(a.element('logStatus').textContent, /Queue full/);
    a.ctx.localStorage.setItem = () => {throw new Error('Quota');};
    assert.equal(a.run('enqueueLogEvent({event_id:"overflow"})'), false);
    assert.match(a.element('logStatus').textContent, /could not be saved/);
});

test('completed attempts with no qualified plan and calculation errors both create events', () => {
    const a = loggingApp();
    a.run(`r={start:new Date(),reading:new Date(),initial:{temperature:[68,69],rh:[50,48]},occupancy:'staying'};
        finishRunLog(prepareRunLog(r,null),{request:r,winner:{suitable:false,ready:false}},Infinity);
        finishRunLog(prepareRunLog(r,null),null);`);
    assert.equal(a.run("readLogQueue().map(item=>item.event.run_status).join(',')"), 'none,error');
});

test('EasyTouch logging records the displayed value, paired time and adjustment without applying it twice', () => {
    const a = loggingApp();
    a.element('easyLogTemp').value = '67';
    a.element('easyLogOutdoor').value = '45';
    a.element('easyLogAdjustment').value = 'confirmed';
    a.element('easyLogOffset').value = '-4';
    a.run('editEasyLogAdjustment()');
    a.run(`r={reading:new Date(),initial:{temperature:[60,60.2],rh:[50,48]},occupancy:'staying'};
        e=captureLogEvent('readings_only',r);`);
    assert.equal(a.run('e.easytouch_display_f'), 67);
    assert.equal(a.run('e.easytouch_outdoor_f'), 45);
    assert.equal(a.run('e.easytouch_time'), a.run('r.reading.toISOString()'));
    assert.equal(a.run('e.easytouch_adjustment'), -4);
    assert.equal(a.run('e.bias_obs_f'), 6.8);

    const reloaded = app();
    reloaded.ctx.localStorage = a.ctx.localStorage;
    reloaded.run('initializeLogging()');
    assert.equal(reloaded.element('easyLogOffset').value, '-4');
    assert.equal(reloaded.element('easyLogTemp').value, '');
});

test('parking confirmation persists and both a location move and parking reset invalidate it', () => {
    const a = loggingApp();
    a.element('parkingHeading').value = 'ENE';
    a.element('tree_driver').value = 'Partial';
    a.run(`forecast={...forecast,fetched:true,_lat:41.3,_lon:-94};confirmParkingLog();`);
    assert.equal(a.run('captureParkingLog().heading_confirmed'), true);
    assert.equal(a.run('captureParkingLog().tree_driver'), 'Partial');
    const reloaded = app();
    reloaded.ctx.localStorage = a.ctx.localStorage;
    reloaded.run(`forecast={...forecast,fetched:true,_lat:41.305,_lon:-94};initializeLogging();`);
    assert.equal(reloaded.element('parkingHeading').value, 'ENE');
    assert.equal(reloaded.run('captureParkingLog().heading_confirmed'), true);
    reloaded.run('forecast._lat=41.32;refreshParkingLogStatus()');
    assert.match(reloaded.element('parkingStatus').textContent, /more than 1 mile/);
    assert.equal(reloaded.run('captureParkingLog().heading_confirmed'), false);
    reloaded.run('confirmParkingLog();newParkingPosition()');
    assert.equal(reloaded.run('captureParkingLog().heading_confirmed'), false);
    assert.equal(reloaded.run('captureParkingLog().heading'), 'ENE');
});

test('readings log keeps separate YoLink timestamps and records the reported vote setup', () => {
    const a = loggingApp();
    a.element('bedLastUpdated').value = '2026-10-21T11:55';
    a.element('frontLastUpdated').value = '2026-10-21T11:57';
    a.element('voteBedroom').value = 'Too warm';
    a.element('voteContext').value = 'Awake in bed';
    a.element('voteTime').value = '2026-10-21T11:59';
    a.element('voteMode').value = 'ac';
    a.element('voteCool').value = '70';
    a.element('voteFan').value = 'Low';
    a.run(`forecast={...forecast,fetched:true,timeZone:'America/Chicago'};
        e=captureLogEvent('readings_only',{reading:new Date(),initial:{temperature:[68,69],rh:[50,48]},occupancy:'staying'});`);
    assert.equal(a.run('e.bed_last_updated'), '2026-10-21T16:55:00.000Z');
    assert.equal(a.run('e.front_last_updated'), '2026-10-21T16:57:00.000Z');
    assert.equal(a.run('e.vote_time'), '2026-10-21T16:59:00.000Z');
    assert.equal(a.run('e.vote_bedroom'), 'Too warm');
    assert.equal(a.run('e.actual_mode'), 'ac');
    assert.equal(a.run('e.actual_cool_to'), 70);
    assert.equal(a.run('e.actual_fan'), 'Low');
});
test('phone compass heading wraps, averages across north and snaps to the 16 points',()=>{
    const a=app();
    assert.equal(a.run('compassHeading(0)'),0);assert.equal(a.run('compassHeading(90)'),270);assert.equal(a.run('compassHeading(359)'),1);
    const across=a.run('circularHeading([350,355,5,10])');
    assert.ok(Math.min(across.mean,360-across.mean)<1e-9,'mean near north');assert.ok(across.spread<10);
    assert.ok(a.run('circularHeading([0,90,180,270]).spread')>60);
    assert.equal(a.run('snapHeading(0)'),'N');assert.equal(a.run('snapHeading(11.24)'),'N');assert.equal(a.run('snapHeading(11.26)'),'NNE');
    assert.equal(a.run('snapHeading(337.5)'),'NNW');assert.equal(a.run('snapHeading(348.76)'),'N');assert.equal(a.run('snapHeading(-22.5)'),'NNW');
    assert.equal(a.run('snapHeading(247)'),'WSW');
});
test('an app upgrade keeps a non-empty queue and retries each entry with its original ID and version',async()=>{
    const a=loggingApp();
    for(const [id,v] of [['bedTemp','68'],['frontTemp','69'],['bedRH','50'],['frontRH','48']])a.element(id).value=v;
    a.run('logReadingsOnly()');
    // Simulate an entry written by an older release (v6.6.6) still waiting in storage.
    const queue=JSON.parse(a.ctx.localStorage.getItem(a.run('LOG_QUEUE_KEY')));
    queue[0].event.app_version='6.6.6';a.ctx.localStorage.setItem(a.run('LOG_QUEUE_KEY'),JSON.stringify(queue));
    const id=queue[0].event.event_id;
    const upgraded=app();upgraded.ctx.localStorage=a.ctx.localStorage;upgraded.ctx.AbortSignal=AbortSignal;
    upgraded.run('initializeLogging()');
    assert.equal(upgraded.run('readLogQueue().length'),1);
    let sent=null;
    upgraded.ctx.fetch=async(url,options)=>{sent=JSON.parse(options.body).event;return {ok:true,json:async()=>({ok:true,event_id:id,row:7})};};
    await upgraded.run('flushLogQueue()');
    assert.equal(sent.event_id,id);assert.equal(sent.app_version,'6.6.6');
    assert.equal(upgraded.run('readLogQueue().length'),0);
});
test('worker messages carry simulation inputs only, never logging credentials',()=>{
    const a=loggingApp();let payload=null;
    a.ctx.Blob=class{};a.ctx.URL={createObjectURL:()=>'blob:worker',revokeObjectURL:()=>{}};
    a.ctx.Worker=class{postMessage(message){payload=message;}terminate(){}};
    a.ctx.document.querySelector=()=>({textContent:''});
    a.run(`calculateInWorker({start:new Date('2026-10-21T13:45Z')},{timeZone:'America/Chicago'}).catch(()=>{})`);
    assert.ok(payload);
    const text=JSON.stringify(payload);
    assert.equal(text.includes(token),false);assert.equal(text.includes('script.google.com'),false);
    assert.deepEqual(Object.keys(payload).sort(),['envelope','forecast','request','state']);
});
// v6.6.23 (logging only): ensemble_pass_count is the logged plan's joint pass count, logged only when the page shows
// that plan's ensemble box ("Works in X of 32 tested conditions"), so the log and the card cannot disagree.
// Labeled synthetic weather. Each result goes through the Worker's trim and structured clone, as on the page.
const H=3600000;
function loggedRun(a,setup){
    a.ctx.structuredClone=structuredClone;
    a.run(`forecast.timeZone='America/Chicago';state.dehumidifierEnabled=true;${setup}
        result=structuredClone(trimPlanResult(runUnifiedPlan(r,e)));html=renderPlan(result);
        complete=result.winner.suitable&&result.winner.ready;
        logged=complete?result.winner:result.current||result.stages?.current?.recommended||result.stages?.departure?.recommended;
        cards=[...html.matchAll(/data-ensemble="([0-9]+)[/]([0-9]+)"/g)].map(m=>m[1]+'/'+m[2]);
        finishRunLog(prepareRunLog(r,null),result,Infinity);ev=readLogQueue().at(-1).event;`);
}
function overnight(temps,enabled=true){
    const start=Date.parse('2026-11-12T04:00:00Z');
    return `ENSEMBLE.enabled=${enabled};
        r={occupancy:'staying',start:new Date(${start}),reading:new Date(${start}),initial:{temperature:[67,66],rh:[45,45]}};
        points=${JSON.stringify(temps)}.map((tOut,i)=>({time:new Date(${start}+i*${H}),tOut,rh:45,cloud:1,wind:4,precip:'none'}));
        e={windowStart:r.start,windowEnd:new Date(${start}+${temps.length}*${H}),timeZone:'America/Chicago',lat:41.3358,lon:-94.0136,points,cloud:1,wind:4,precip:'none'};`;
}
function assertLoggedCountShown(a){
    assert.equal(a.run('ev.event_type'),'plan');
    assert.equal(a.run('logged.ensemble.evaluated'),32,'every member evaluated for the logged plan');
    const count=a.run('ev.ensemble_pass_count');
    assert.ok(Number.isInteger(count)&&count>=0&&count<=32,'integer 0–32: '+count);
    assert.equal(count,a.run('logged.ensemble.passes'));
    assert.ok(a.run(`cards.includes('${count}/32')`),'the rendered plan shows "Works in '+count+' of 32"');
    assert.match(a.run('ensembleResultHTML(logged)'),new RegExp('Works in '+count+' of 32 tested conditions'));
}
test('a complete plan logs the pass count its plan card shows',()=>{
    const a=loggingApp();loggedRun(a,overnight([55,55,55,55,55]));
    assert.equal(a.run('complete'),true);
    assertLoggedCountShown(a);
});
test('a complete departure plan logs the winner count shown in its overnight box',()=>{
    const a=loggingApp();
    loggedRun(a,`state.temp=50;state.rh=25;state.wind=2;state.cloud=0;
        r={start:new Date('2026-10-24T04:00Z'),reading:new Date('2026-10-24T04:00Z'),initial:{temperature:[69,69],rh:[35,35]},occupancy:'leaving',remote:true,departure:new Date('2026-10-24T04:10Z'),returnTime:new Date('2026-10-24T04:30Z')};
        e=makeEnvelope(r.start,planBounds(r.start,r).end,'Synthetic clear 50F night',300000);shortlistVents=()=>[];
        planSetups=sleep=>['passive','ac','hp','furnace','auto'].map(type=>planSetup(type,sleep));`);
    assert.equal(a.run('complete&&!!result.stages'),true);
    assertLoggedCountShown(a);
});
test('partial-run current guidance, whose count the page does not show, logs null (owner decision)',()=>{
    const a=loggingApp();loggedRun(a,overnight([47,46,45,45,44]));
    assert.equal(a.run('complete'),false);
    assert.equal(a.run('logged===result.current'),true);
    assert.equal(a.run('ev.run_status'),'partial');
    assert.equal(a.run('logged.ensemble.evaluated'),32);
    assert.equal(a.run('ensembleDisplayedPlans(result).some(p=>p.ensemble===logged.ensemble)'),false,'the card shows the full-sequence winner only');
    assert.equal(a.run('ev.ensemble_pass_count'),null);
});
test('with the nine-case policy (ensemble off) or a partial summary, ensemble_pass_count is null',()=>{
    const a=loggingApp();loggedRun(a,overnight([55,55,55,55,55],false));
    assert.ok(a.run('!!logged'));
    assert.equal(a.run('logged.ensemble??null'),null);
    assert.equal(a.run('ev.ensemble_pass_count'),null);
    // A summary that does not cover all 32 members is never logged as if it were out of 32.
    assert.equal(a.run('logEnsemblePassCount({ensemble:{passes:7,evaluated:9,members:32}})'),null);
    assert.equal(a.run('logEnsemblePassCount({ensemble:{passes:30,evaluated:32,members:32}})'),30);
    assert.equal(a.run('logEnsemblePassCount(null)'),null);
});
test('readings-only events do not set ensemble_pass_count',()=>{
    const a=loggingApp();
    for(const [id,v] of [['bedTemp','68'],['frontTemp','69'],['bedRH','50'],['frontRH','48']])a.element(id).value=v;
    a.run('logReadingsOnly()');
    assert.equal(a.run('readLogQueue()[0].event.event_type'),'readings_only');
    assert.equal(a.run("'ensemble_pass_count' in readLogQueue()[0].event"),false);
});
