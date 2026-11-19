// WP2 receiver checks: tools/logging/Code.gs runs against in-memory stand-ins for
// the Apps Script services. These exercise the script's logic, not Google's runtime.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','tools','logging','Code.gs'),'utf8');
const TOKEN='a'.repeat(40),OLD='b'.repeat(40);

function receiver({properties={},failAppend=0,lockBusy=false,initialRows=null}={}){
  const rows=initialRows?initialRows.map(r=>r.slice()):[];let appendFailures=failAppend;
  const range=(r,c,h,w)=>({
    setValues:v=>{rows[0]=v[0];},
    getValues:()=>[rows[0]||[]],
    createTextFinder:text=>({matchEntireCell:()=>({matchCase:()=>({findNext:()=>{
      for(let i=1;i<rows.length;i++)if(String(rows[i][1]).toLowerCase()===text.toLowerCase())return{getRow:()=>i+1};
      return null;}})})})
  });
  const sheet={getMaxColumns:()=>60,insertColumnsAfter:()=>{},getRange:range,getLastRow:()=>rows.length,setFrozenRows:()=>{},
    appendRow:row=>{if(appendFailures>0){appendFailures--;throw new Error('interrupted');}rows.push(row);}};
  const book={getId:()=>'sheet-1',getSheetByName:()=>sheet,insertSheet:()=>sheet};
  const store={HVAC_LOG_TOKEN:TOKEN,HVAC_LOG_SPREADSHEET_ID:'sheet-1',...properties};
  const ctx={JSON,Date,Number,
    PropertiesService:{getScriptProperties:()=>({getProperties:()=>({...store}),getProperty:k=>store[k],setProperty:(k,v)=>{store[k]=v;}})},
    LockService:{getScriptLock:()=>({tryLock:()=>!lockBusy,waitLock:()=>{},releaseLock:()=>{}})},
    SpreadsheetApp:{openById:()=>book,getActiveSpreadsheet:()=>book,flush:()=>{}},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>({text})})}};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  if(!rows.length)vm.runInContext('prepareHvacLog_(SpreadsheetApp.openById("sheet-1"))',ctx);
  const post=(body)=>JSON.parse(ctx.doPost({postData:{contents:typeof body==='string'?body:JSON.stringify(body)}}).text);
  return {post,rows};
}
const event=(over={})=>({schema_version:1,event_id:'12345678-1234-1234-1234-123456789abc',event_utc:'2026-11-17T21:00:00Z',
  event_type:'readings_only',bed_temp_f:68.4,front_temp_f:'=1+1',...over});

test('receiver rejects a wrong or short token and an expired previous token',()=>{
  const r=receiver({properties:{HVAC_LOG_PREVIOUS_TOKEN:OLD,HVAC_LOG_PREVIOUS_TOKEN_UNTIL_UTC:'2000-01-01T00:00:00Z'}});
  assert.equal(r.post({token:'c'.repeat(40),event:event()}).code,'unauthorized');
  assert.equal(r.post({token:'short',event:event()}).code,'unauthorized');
  assert.equal(r.post({token:OLD,event:event()}).code,'unauthorized');
  assert.equal(r.rows.length,1,'header only');
});
test('receiver accepts the previous token during its rotation window',()=>{
  const r=receiver({properties:{HVAC_LOG_PREVIOUS_TOKEN:OLD,HVAC_LOG_PREVIOUS_TOKEN_UNTIL_UTC:'2999-01-01T00:00:00Z'}});
  assert.deepEqual(r.post({token:OLD,event:event()}),{ok:true,event_id:event().event_id,row:2});
});
test('duplicate replay returns the existing row without appending',()=>{
  const r=receiver();
  const first=r.post({token:TOKEN,event:event()}),again=r.post({token:TOKEN,event:event({event_id:event().event_id.toUpperCase()})});
  assert.equal(first.row,2);assert.equal(again.row,2);assert.equal(again.ok,true);assert.equal(r.rows.length,2);
});
test('an interrupted write reports failure and a retry with the same ID writes exactly once',()=>{
  const r=receiver({failAppend:1});
  assert.equal(r.post({token:TOKEN,event:event()}).code,'write_failed');assert.equal(r.rows.length,1);
  assert.equal(r.post({token:TOKEN,event:event()}).row,2);
  assert.equal(r.post({token:TOKEN,event:event()}).row,2);assert.equal(r.rows.length,2);
});
test('receiver guards formulas, writes missing values and validates schema and size',()=>{
  const r=receiver();r.post({token:TOKEN,event:event({bed_rh:null})});
  const header=r.rows[0],row=r.rows[1];
  assert.equal(row[header.indexOf('front_temp_f')],"'=1+1");
  assert.equal(row[header.indexOf('bed_rh')],'missing');assert.equal(row[header.indexOf('bed_temp_f')],68.4);
  assert.equal(r.post({token:TOKEN,event:event({schema_version:2})}).code,'invalid_event');
  assert.equal(r.post({token:TOKEN,event:event({event_type:'plan'})}).code,'invalid_event');
  assert.equal(r.post('x'.repeat(48001)).code,'invalid_body');
  assert.equal(r.post('{').code,'invalid_json');
  assert.equal(receiver({lockBusy:true}).post({token:TOKEN,event:event()}).code,'busy');
  assert.equal(receiver({properties:{HVAC_LOG_SPREADSHEET_ID:''}}).post({token:TOKEN,event:event()}).code,'not_initialized');
});

// v6.6.22 (WP12 Phase A): comfort_metric_json is appended to the column list; an existing Sheet with the previous
// header is extended in place and keeps its rows. Any other header still stops the write.
test('an existing Sheet with the previous header gains the new column and keeps its rows',()=>{
  const columns=vm.runInContext('HVAC_LOG_COLUMNS',(()=>{const c={};vm.createContext(c);vm.runInContext(source,c);return c;})());
  assert.equal(columns.at(-1),'comfort_metric_json');
  const previous=columns.slice(0,-1),old=previous.map((_,i)=>i===1?'aaaaaaaa-1234-1234-1234-123456789abc':'x');
  const r=receiver({initialRows:[previous,old]});
  const reply=r.post({token:TOKEN,event:event({comfort_metric_json:'{"v":1}'})});
  assert.equal(reply.ok,true);assert.equal(reply.row,3);
  assert.deepEqual([...r.rows[0]],[...columns]);assert.equal(r.rows[1].length,previous.length);
  assert.equal(r.rows[2][columns.indexOf('comfort_metric_json')],'{"v":1}');
});
test('a header that is not a prefix of the column list still stops the write',()=>{
  const c={};vm.createContext(c);vm.runInContext(source,c);const columns=vm.runInContext('HVAC_LOG_COLUMNS',c);
  const swapped=columns.slice(0,-1);[swapped[2],swapped[3]]=[swapped[3],swapped[2]];
  const r=receiver({initialRows:[swapped]});
  assert.equal(r.post({token:TOKEN,event:event()}).code,'write_failed');
});
