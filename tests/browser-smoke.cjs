const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),cp=require('node:child_process');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..');
const screenshotDir=process.env.QC_SCREENSHOT_DIR;
if(screenshotDir)fs.mkdirSync(screenshotDir,{recursive:true});
const original=cp.execFileSync('git',['show','5deb371:index.html'],{cwd:repo,encoding:'utf8'});
const oldSW=cp.execFileSync('git',['show','5deb371:sw.js'],{cwd:repo,encoding:'utf8'}).replace(/https:\/\/fonts.googleapis.com[^']+/,'/fonts.css');
let legacy=false;
const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const name=pathname.startsWith('/hvac-advisor/')?pathname.slice('/hvac-advisor/'.length)||'index.html':legacy?pathname.slice(1)||'index.html':null;
    if(name==='fonts.css'){res.writeHead(200,{'Content-Type':'text/css'});return res.end('');}
    if(!name||name.includes('..')){res.writeHead(404);return res.end('missing');}
    const file=path.join(repo,name);
    if(!fs.existsSync(file)){res.writeHead(404);return res.end('missing');}
    const body=legacy&&name==='index.html'?original:legacy&&name==='sw.js'?oldSW:fs.readFileSync(file);
    res.writeHead(200,{'Content-Type':name.endsWith('.js')?'application/javascript':name.endsWith('.json')?'application/json':name.endsWith('.png')?'image/png':'text/html','Cache-Control':'no-store'});res.end(body);
});
function weather(url){
    if(url.includes('zippopotam'))return{places:[{latitude:'41.3',longitude:'-94','place name':'Winterset','state abbreviation':'IA'}]};
    if(url.includes('/points/'))return{properties:{forecast:'https://api.weather.gov/forecast-fixture',forecastGridData:'https://api.weather.gov/grid-fixture',timeZone:'America/Chicago'}};
    if(url.includes('forecast-fixture'))return{properties:{updateTime:'2026-10-21T16:00Z',periods:[{name:'Today',isDaytime:true,startTime:'2026-10-21T00:00Z',endTime:'2026-10-22T00:00Z',temperature:60,temperatureUnit:'F',windSpeed:'5 mph',shortForecast:'Mostly Clear',probabilityOfPrecipitation:{value:0}},{name:'Tonight',isDaytime:false,startTime:'2026-10-22T00:00Z',endTime:'2026-10-24T00:00Z',temperature:50,temperatureUnit:'F',windSpeed:'8 mph',shortForecast:'Rain',probabilityOfPrecipitation:{value:70}}]}};
    return{properties:{updateTime:'2026-10-21T16:00Z',temperature:{uom:'wmoUnit:degC',values:[{validTime:'2026-10-21T00:00Z/P3D',value:10}]},relativeHumidity:{uom:'wmoUnit:percent',values:[{validTime:'2026-10-21T00:00Z/P3D',value:50}]}}};
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/hvac-advisor/`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']});
 const results={};
 try{
  const context=await browser.newContext({viewport:{width:448,height:950},timezoneId:'America/Los_Angeles',colorScheme:'light'});
  await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
  let requests=0;
  await context.route(/https:\/\/(api.weather.gov|api.zippopotam.us)\//,r=>{requests++;return r.fulfill({json:weather(r.request().url()),headers:{'Access-Control-Allow-Origin':'*'}});});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-21T17:00Z')});
  await page.goto(base);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  await page.locator('#analyzeBtn').click();assert.match(await page.locator('#results').innerText(),/Daytime Recommendation/i);
  await page.locator('#zipInput').fill('50273');await page.locator('#retrieveBtn').click();
  await page.waitForFunction(()=>forecast.fetched&&!weatherLoading);
  assert.match(await page.locator('#weatherContext').innerText(),/America\/Chicago/);
  await page.locator('#results.visible').waitFor();
  if(screenshotDir){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(screenshotDir,'v43-forecast-light.png'),fullPage:true});}
  const hits=requests;await page.locator('#retrieveBtn').click();await page.waitForFunction(()=>forecast.fetched&&!weatherLoading);
  assert.ok(requests>=hits+4,'second retrieve reaches services');
  await page.locator('button[onclick="step(\'temp\',1)"]').click();
  assert.equal(await page.locator('#weatherMode').inputValue(),'manual');assert.equal(await page.locator('#results').innerText(),'');
  await page.locator('#analyzeBtn').click();assert.match(await page.locator('#resultStatus').innerText(),/Manual weather/);
  await page.locator('#weatherMode').selectOption('forecast');await page.locator('#analyzeBtn').click();
  await page.evaluate(()=>{forecast.fetchedAt=Date.now()-2*3600000;checkResultValidity();});assert.equal(await page.locator('#results').innerText(),'');
  await page.locator('#analyzeBtn').click();assert.match(await page.locator('#resultStatus').innerText(),/two hours/);
  await page.locator('#weatherMode').selectOption('manual');
  await context.setOffline(true);await page.reload();await page.locator('#analyzeBtn').click();
  assert.match(await page.locator('#results').innerText(),/Daytime Recommendation/i);
  await context.setOffline(false);
  const widths=[];
  for(const width of [390,448,480]){await page.setViewportSize({width,height:950});widths.push(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})));}
  assert.ok(widths.every(x=>x.width===x.scroll),JSON.stringify(widths));
  await page.emulateMedia({colorScheme:'dark'});await page.setViewportSize({width:390,height:900});if(screenshotDir){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(screenshotDir,'v43-manual-dark.png'),fullPage:true});}
  assert.deepEqual(errors,[]);results.app={weatherRequests:requests,offlineManual:true,widths,errors};await context.close();
  // Reproduce an active legacy cache-first worker and verify upgrade under a project path.
  legacy=true;
  const oldContext=await browser.newContext();await oldContext.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
  const oldPage=await oldContext.newPage();await oldPage.goto(base);await oldPage.evaluate(()=>navigator.serviceWorker.ready);await oldPage.reload();
  assert.match(await oldPage.title(),/v4.2/);
  await oldPage.evaluate(async()=>{await caches.open('unrelated-app-cache');});
  legacy=false;
  await oldPage.evaluate(async()=>{
    const previous=navigator.serviceWorker.controller;
    const changed=new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
    const r=await navigator.serviceWorker.getRegistration();await r.update();
    if(navigator.serviceWorker.controller===previous)await changed;
  });
  await oldPage.waitForFunction(async()=>!(await caches.keys()).includes('hvac-advisor-v1'));
  await oldPage.reload();assert.match(await oldPage.title(),/v4.3.0/);
  assert.ok(await oldPage.evaluate(async()=>(await caches.keys()).includes('unrelated-app-cache')));
  results.upgrade={legacyTo43:true,unrelatedCachePreserved:true};await oldContext.close();
  console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
