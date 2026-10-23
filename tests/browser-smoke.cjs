const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),cp=require('node:child_process');
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),screens=process.env.QC_SCREENSHOT_DIR||path.join(repo,'test-output');
fs.mkdirSync(screens,{recursive:true});
function baseline(file){return process.env.BASELINE_DIR?fs.readFileSync(path.join(process.env.BASELINE_DIR,file),'utf8'):cp.execFileSync('git',['show','450f8b65012c6fd5766653cf858a1c5ebd0b29c0:'+file],{cwd:repo,encoding:'utf8'});}
const oldHTML=baseline('index.html'),oldSW=baseline('sw.js');let legacy=false;
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(!pathname.startsWith('/hvac-advisor/')){res.writeHead(404);return res.end('missing');}
 const name=pathname.slice('/hvac-advisor/'.length)||'index.html';if(name.includes('..')){res.writeHead(400);return res.end();}
 const file=path.join(repo,name);if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
 const body=legacy&&name==='index.html'?oldHTML:legacy&&name==='sw.js'?oldSW:fs.readFileSync(file);
 res.writeHead(200,{'Content-Type':name.endsWith('.js')?'application/javascript':name.endsWith('.json')?'application/json':name.endsWith('.png')?'image/png':'text/html','Cache-Control':'no-store'});res.end(body);
});
function weather(url){
 if(url.includes('zippopotam'))return{places:[{latitude:'41.3',longitude:'-94','place name':'Winterset','state abbreviation':'IA'}]};
 if(url.includes('/points/'))return{properties:{forecast:'https://api.weather.gov/forecast-fixture',forecastGridData:'https://api.weather.gov/grid-fixture',timeZone:'America/Chicago'}};
 if(url.includes('forecast-fixture'))return{properties:{updateTime:'2026-10-21T13:00Z',periods:[{name:'Fixture',isDaytime:true,startTime:'2026-10-21T00:00Z',endTime:'2026-10-24T00:00Z',temperature:58,temperatureUnit:'F',windSpeed:'2 mph',shortForecast:'Cloudy',probabilityOfPrecipitation:{value:0}}]}};
 return{properties:{updateTime:'2026-10-21T13:00Z',temperature:{uom:'wmoUnit:degF',values:[{validTime:'2026-10-21T00:00Z/P3D',value:58}]},relativeHumidity:{uom:'wmoUnit:percent',values:[{validTime:'2026-10-21T00:00Z/P3D',value:25}]}}};
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/hvac-advisor/`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:448,height:950},timezoneId:'America/Los_Angeles',colorScheme:'light'});
  await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));let requests=0;
  await context.route(/https:\/\/(api.weather.gov|api.zippopotam.us)\//,r=>{requests++;return r.fulfill({json:weather(r.request().url()),headers:{'Access-Control-Allow-Origin':'*'}});});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message);});
  await page.clock.install({time:new Date('2026-10-21T13:45Z')});await page.goto(base);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  await page.screenshot({path:path.join(screens,'v6-initial.png'),fullPage:true});console.log('INITIAL',await page.evaluate(()=>({remote:document.getElementById('remoteAccess')?.checked,away:document.getElementById('awayOption')?.disabled,heading:document.getElementById('indoorHeading')?.textContent,loaded:typeof initializePlan})));assert.deepEqual(errors,[]);
  assert.equal(await page.locator('.period-toggle').count(),0);assert.equal(await page.locator('#awayOption').evaluate(e=>e.disabled),true);
  assert.equal(await page.locator('#departureFields').isVisible(),false);
  await page.locator('#analyzeBtn').click();assert.match(await page.locator('#resultStatus').innerText(),/both indoor temperatures/);
  for(const id of ['bedTemp','frontTemp'])await page.locator('#'+id).fill('68');for(const id of ['bedRH','frontRH'])await page.locator('#'+id).fill('35');
  await page.locator('#analyzeBtn').click();await page.locator('#results.visible').waitFor({timeout:180000});
  assert.match(await page.locator('#results').innerText(),/Your HVAC plan/i);assert.match(await page.locator('#resultStatus').innerText(),/Manual weather/);
  await page.screenshot({path:path.join(screens,'v6-manual-light.png'),fullPage:true});
  const before=await page.locator('#readingTime').inputValue();
  await page.locator('#zipInput').fill('50273');await page.locator('#retrieveBtn').click();await page.waitForFunction(()=>forecast.fetched&&!weatherLoading);
  assert.match(await page.locator('#weatherContext').innerText(),/America\/Chicago/);
  assert.notEqual(await page.locator('#readingTime').inputValue(),before,'measurement timestamp preserves its instant across location zones');
  assert.equal(requests,4);
  // Choose an explicit future start near dawn to exercise the forecast plan without assuming future measurements.
  await page.locator('#planningOptions').evaluate(e=>e.open=true);
  await page.locator('#planningMode').selectOption('future');await page.locator('#futureStart').fill('2026-10-22T06:45');
  await page.locator('#analyzeBtn').click();await page.locator('#results.visible').waitFor({timeout:180000});
  assert.match(await page.locator('#resultStatus').innerText(),/NWS forecast.*Projected/);
  assert.match(await page.locator('#indoorHeading').innerText(),/Projected/i);
  assert.match(await page.locator('#results').innerText(),/Other Viable HVAC Options/i);
  assert.equal(await page.locator('#results details').first().getAttribute('open'),null);
  await page.screenshot({path:path.join(screens,'v6-forecast-plan.png'),fullPage:true});
  await page.locator('#occupancyMode').selectOption('leaving');assert.equal(await page.locator('#departureFields').isVisible(),true);assert.equal(await page.locator('#returnFields').isVisible(),true);
  await page.locator('#departureTime').fill('2026-10-22T06:50');await page.locator('#returnTime').fill('2026-10-22T08:30');
  await page.locator('#analyzeBtn').click();await page.locator('#results.visible').waitFor({timeout:180000});
  await page.locator('#remoteAccess').check();assert.equal(await page.locator('#awayOption').evaluate(e=>e.disabled),false);
  await page.locator('#occupancyMode').selectOption('away');assert.equal(await page.locator('#actualSetup').isVisible(),true);
  await page.locator('#analyzeBtn').click();assert.match(await page.locator('#resultStatus').innerText(),/Confirm/);
  await page.locator('#setupConfirmed').check();await page.locator('#actualMode').selectOption('ac');await page.locator('#actualWindow3').selectOption('4');
  await page.locator('#analyzeBtn').click();assert.match(await page.locator('#resultStatus').innerText(),/open windows/);
  await page.locator('#remoteAccess').uncheck();assert.equal(await page.locator('#occupancyMode').inputValue(),'staying');assert.equal(await page.locator('#awayOption').evaluate(e=>e.disabled),true);
  await page.locator('#planningMode').selectOption('now');await page.locator('#dehumidifierMode').selectOption('off');assert.equal(await page.evaluate(()=>state.dehumidifierEnabled),false);
  await page.locator('#weatherMode').selectOption('manual');await context.setOffline(true);await page.reload();
  await page.locator('#analyzeBtn').click();assert.match(await page.locator('#resultStatus').innerText(),/both indoor temperatures/);
  for(const id of ['bedTemp','frontTemp'])await page.locator('#'+id).fill('68');for(const id of ['bedRH','frontRH'])await page.locator('#'+id).fill('35');
  await page.locator('#analyzeBtn').click();await page.locator('#results.visible').waitFor({timeout:180000});assert.match(await page.locator('#results').innerText(),/Your HVAC plan/i);
  await context.setOffline(false);
  // Real evening calculation: no 9 PM target switch, fixed thermostat settings,
  // a computed preparation time or an explicit complete-plan failure.
  await page.clock.setFixedTime(new Date('2026-10-22T04:30Z'));
  await page.evaluate(()=>{state.temp=60;state.rh=20;state.wind=2;state.cloud=0;freshReadings();});
  await page.locator('#analyzeBtn').click();await page.locator('#results.visible').waitFor({timeout:180000});
  assert.match(await page.locator('#setpointDisplay').innerText(),/Day: heat 70°F \/ cool 72°F/);
  const text=await page.locator('#results').innerText();assert.match(text,/Next action|No suitable complete plan/i);assert.doesNotMatch(text,/Preparing for Sleep from 9|Not chosen|weighted/);
  await page.screenshot({path:path.join(screens,'v6-evening-plan.png'),fullPage:true});
  const widths=[];for(const width of [390,448,480]){await page.setViewportSize({width,height:950});widths.push(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})));}
  assert.ok(widths.every(x=>x.width===x.scroll),JSON.stringify(widths));
  await page.emulateMedia({colorScheme:'dark'});await page.screenshot({path:path.join(screens,'v6-dark.png'),fullPage:true});
  await page.evaluate(()=>{resultContext.expires=Date.now();checkResultValidity();});assert.equal(await page.locator('#results').innerText(),'');
  assert.deepEqual(errors,[]);await context.close();
  // Upgrade an actual v5.0 cache under the GitHub Pages project scope.
  legacy=true;const oldContext=await browser.newContext();await oldContext.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
  const oldPage=await oldContext.newPage();await oldPage.goto(base);await oldPage.evaluate(()=>navigator.serviceWorker.ready);await oldPage.reload();assert.match(await oldPage.title(),/v5.0.0/);
  await oldPage.evaluate(async()=>{await caches.open('unrelated-app-cache');});legacy=false;
  // v5 itself reloads on controllerchange; wait for the new document rather than
  // keeping an evaluation pending in a destroyed execution context.
  await oldPage.evaluate(()=>navigator.serviceWorker.getRegistration().then(r=>r.update()));
  await oldPage.waitForFunction(()=>document.title.includes('v6.0.0'),{timeout:30000});
  assert.equal(await oldPage.locator('.period-toggle').count(),0);assert.ok(await oldPage.evaluate(async()=>(await caches.keys()).includes('unrelated-app-cache')));
  assert.equal(await oldPage.evaluate(async()=>(await caches.keys()).some(k=>k.endsWith(':5.0.0'))),false);
  await oldContext.close();console.log(JSON.stringify({passed:true,weatherRequests:requests,widths,offline:true,upgrade:'5.0.0 → 6.0.0',errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
