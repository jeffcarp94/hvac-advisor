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
