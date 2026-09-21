const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
let browser;
before(async () => { browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true}); });
after(async () => { await browser?.close(); });
async function pageFor(t, init, viewport = {width: 1280, height: 900}) {
  const context = await browser.newContext({viewport, timezoneId: 'Asia/Shanghai'});
  await context.route(/^https?:/, r => r.abort());
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.setDefaultTimeout(5000);
  if (init) await page.addInitScript(init);
  await page.clock.install({time: new Date('2026-09-16T08:59:59+08:00')});
  await page.clock.pauseAt(new Date('2026-09-16T09:00:00+08:00'));
  await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href);
  t.after(async () => { await context.close(); assert.deepEqual(errors, []); });
  return page;
}
const state = p => p.evaluate(() => ({currentMode, customDuration, sessionDuration, remainingMs, timerDeadline, isRunning, completedSessions}));
const time = p => p.locator('#time').textContent();
async function duration(p, value) { await p.locator('#durationInput').fill(String(value)); await p.locator('#durationInput').press('Tab'); }
const settingsOpen = p => p.locator('#settingsPanel').evaluate(e => e.matches(':popover-open'));
const near = (a,b) => assert(Math.abs(a-b)<0.0001, `${a} != ${b}`);

test('clock style switches by click and keyboard without changing the countdown or alarm', async t => {
  const p=await pageFor(t),clock=p.getByRole('button',{name:'Use numeral clock style',exact:true});
  assert.equal(await clock.getAttribute('aria-pressed'),'false');
  assert.equal(await p.locator('#clockNumerals').textContent(),'09:00:00');
  await p.locator('#alarmOpen').click();
  await p.locator('#alarmHour [data-value="10"]').click();await p.locator('#alarmMinute [data-value="30"]').click();await p.locator('#alarmSet').click();
  await p.locator('#mainBtn').click();await p.clock.runFor(1250);
  const before=await state(p),audio=await p.evaluate(()=>audioContext?.state||null);
  await clock.click();
  assert.equal(await clock.getAttribute('data-style'),'numerals');
  assert.equal(await clock.getAttribute('aria-pressed'),'true');
  assert.deepEqual(await state(p),before);
  assert.equal(await p.locator('#alarmSummaryTime').textContent(),'10:30');
  assert.equal(await p.evaluate(()=>audioContext?.state||null),audio);
  await p.clock.fastForward(62000);
  assert.equal(await p.locator('#clockNumerals').textContent(),'09:01:03');
  assert.equal(await p.locator('#clockReading').textContent(),'Current time 09:01:03.');
  await clock.focus();await clock.press('Space');
  assert.equal(await clock.getAttribute('data-style'),'segments');
  await clock.press('Enter');assert.equal(await clock.getAttribute('data-style'),'numerals');
  assert.equal((await state(p)).timerDeadline,before.timerDeadline);
  await p.reload();assert.equal(await clock.getAttribute('data-style'),'segments');
});

test('countdown style is independent and changes by click or keyboard without changing timer state', async t => {
  const p=await pageFor(t),button=p.getByRole('button',{name:'Use seven-segment timer style',exact:true});
  assert.equal(await button.getAttribute('data-style'),'numerals');
  await p.locator('#alarmOpen').click();
  await p.locator('#alarmHour [data-value="10"]').click();await p.locator('#alarmMinute [data-value="30"]').click();await p.locator('#alarmSet').click();
  await duration(p,100);await p.locator('#mainBtn').click();await p.clock.runFor(1250);
  const running=await state(p);assert.equal(await time(p),'99:59');
  await button.click();
  assert.equal(await button.getAttribute('data-style'),'segments');
  assert.equal(await button.getAttribute('aria-pressed'),'true');
  assert.deepEqual(await state(p),running);
  assert.equal(await p.locator('#timerSegments').getAttribute('data-value'),'99:59');
  assert.equal(await p.locator('#clockStyleToggle').getAttribute('data-style'),'segments');
  await p.locator('#clockStyleToggle').click();
  assert.equal(await p.locator('#clockStyleToggle').getAttribute('data-style'),'numerals');
  assert.equal(await button.getAttribute('data-style'),'segments');
  await button.focus();await button.press('Space');assert.equal(await button.getAttribute('data-style'),'numerals');
  await button.press('Enter');assert.equal(await button.getAttribute('data-style'),'segments');
  assert.deepEqual(await state(p),running);
  assert.equal(await p.locator('#alarmSummaryTime').textContent(),'10:30');
  await p.locator('#mainBtn').click();const paused=await state(p);await button.click();
  assert.deepEqual(await state(p),paused);
  await p.reload();assert.equal(await button.getAttribute('data-style'),'numerals');
});

test('seven-segment countdown remains current through completion, mode changes, and reset', async t => {
  const p=await pageFor(t),button=p.locator('#timerStyleToggle'),segments=p.locator('#timerSegments');
  await duration(p,1);await button.click();await p.locator('#mainBtn').click();await p.clock.fastForward(59000);
  assert.equal(await segments.getAttribute('data-value'),'00:01');
  await p.clock.runFor(1000);assert.equal(await segments.getAttribute('data-value'),'00:00');
  await p.clock.runFor(15000);assert.equal(await segments.getAttribute('data-value'),'00:00');
  assert.equal(await p.locator('#modeLabel').textContent(),'CUSTOM FOCUS');
  await p.mouse.click(5,5);assert.equal(await segments.getAttribute('data-value'),'05:00');
  assert.equal(await button.getAttribute('data-style'),'segments');
  assert.equal(await p.locator('#modeLabel').textContent(),'BREAK');
  await p.locator('[data-mode="hour"]').click();assert.equal(await segments.getAttribute('data-value'),'60:00');
  await p.locator('#mainBtn').click();await p.clock.runFor(1250);await p.locator('#resetBtn').click();
  assert.equal(await segments.getAttribute('data-value'),'60:00');
  assert.equal(await button.getAttribute('data-style'),'segments');
});

test('weather hides missing or invalid readings and recovers with a colored symbol', async t => {
  const p=await pageFor(t,()=>{
    window.weatherPayload={current:{temperature_2m:22.4,weather_code:2}};window.weatherOffline=false;
    window.fetch=async url=>{
      if(String(url).includes('open-meteo'))return {ok:!window.weatherOffline,json:async()=>window.weatherPayload};
      return {ok:true,json:async()=>({status:'success',lat:31.2,lon:121.5,city:'Shanghai'})};
    };
  });
  const weather=p.locator('#weather');await weather.waitFor({state:'visible'});
  assert.equal(await p.locator('#weatherTemp').textContent(),'22°C');
  assert.match(await weather.getAttribute('aria-label'),/Partly cloudy.*Shanghai/);
  assert.equal(await p.locator('#weatherIcon').textContent(),'⛅');
  await p.locator('#weatherIcon').click();
  assert.equal(await p.locator('#weatherIcon svg').count(),1);
  const iconColors=await p.locator('#weatherIcon svg > path').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));
  assert.notEqual(iconColors[0],iconColors[1]);
  await p.evaluate(async()=>{weatherOffline=true;await fetchWeather()});
  assert.equal(await weather.isVisible(),false);assert.equal(await p.locator('#weatherTemp').textContent(),'');
  await p.evaluate(async()=>{weatherOffline=false;weatherPayload={current:{temperature_2m:null,weather_code:0}};await fetchWeather()});
  assert.equal(await weather.isVisible(),false);
  await p.evaluate(async()=>{weatherPayload={current:{temperature_2m:0,weather_code:95}};await fetchWeather()});
  assert.equal(await weather.isVisible(),true);assert.equal(await p.locator('#weatherTemp').textContent(),'0°C');
  assert.match(await weather.getAttribute('aria-label'),/Thunderstorm/);
  await p.evaluate(async()=>{weatherPayload={current:{temperature_2m:-3.2,weather_code:999}};await fetchWeather()});
  assert.equal(await p.locator('#weatherTemp').textContent(),'-3°C');
  assert.match(await weather.getAttribute('aria-label'),/Current temperature/);
});

test('weather units convert unrounded Celsius readings by click and keyboard without affecting the timer or alarm', async t => {
  const p=await pageFor(t,()=>{
    window.weatherPayload={current:{temperature_2m:22.4,weather_code:2}};window.weatherCalls=0;
    window.fetch=async url=>{
      window.weatherCalls++;
      if(String(url).includes('open-meteo'))return {ok:true,json:async()=>window.weatherPayload};
      return {ok:true,json:async()=>({status:'success',lat:31.2,lon:121.5,city:'Shanghai'})};
    };
  });
  const button=p.locator('#weatherTemp');await button.waitFor({state:'visible'});
  await p.locator('#alarmOpen').click();
  await p.locator('#alarmHour [data-value="10"]').click();await p.locator('#alarmMinute [data-value="30"]').click();await p.locator('#alarmSet').click();
  await p.locator('#mainBtn').click();await p.clock.runFor(1250);
  const before=await state(p),calls=await p.evaluate(()=>weatherCalls);
  for(const [celsius,celsiusText,fahrenheitText]of [[0,'0°C','32°F'],[100,'100°C','212°F'],[-40,'-40°C','-40°F'],[-3.2,'-3°C','26°F'],[0.49,'0°C','33°F']]){
    await p.evaluate(value=>renderWeather({temperature_2m:value,weather_code:0},'Shanghai'),celsius);
    assert.equal(await button.textContent(),celsiusText);
    for(let i=0;i<3;i++){
      await button.click();assert.equal(await button.textContent(),fahrenheitText);
      assert.match(await button.getAttribute('aria-label'),/degrees Fahrenheit.*Switch to Celsius/);
      assert.match(await p.locator('#weather').getAttribute('title'),/°F, Shanghai/);
      await button.click();assert.equal(await button.textContent(),celsiusText);
    }
  }
  await button.focus();await button.press('Space');assert.equal(await button.textContent(),'33°F');
  await p.evaluate(async()=>{weatherPayload={current:{temperature_2m:10,weather_code:61}};await fetchWeather()});
  assert.equal(await button.textContent(),'50°F');
  await button.press('Enter');assert.equal(await button.textContent(),'10°C');
  assert.deepEqual(await state(p),before);
  assert.equal(await p.locator('#alarmSummaryTime').textContent(),'10:30');
  assert.equal(await p.evaluate(()=>weatherCalls),calls+2,'Only the explicit weather refresh should fetch');
  await button.click();await p.evaluate(()=>renderWeather(null));
  assert.equal(await button.isVisible(),false);
  await p.evaluate(()=>renderWeather({temperature_2m:20,weather_code:0},'Shanghai'));
  assert.equal(await button.textContent(),'68°F');
  await p.reload();assert.equal(await button.textContent(),'22°C');
});

test('weather icons switch independently by click and keyboard and retain the chosen set during updates', async t => {
  const p=await pageFor(t,()=>{
    window.weatherPayload={current:{temperature_2m:22.4,weather_code:2}};window.weatherCalls=0;
    window.fetch=async url=>{
      window.weatherCalls++;
      if(String(url).includes('open-meteo'))return {ok:true,json:async()=>window.weatherPayload};
      return {ok:true,json:async()=>({status:'success',lat:31.2,lon:121.5,city:'Shanghai'})};
    };
  });
  const button=p.getByRole('button',{name:'Use outline weather icons',exact:true});await button.waitFor({state:'visible'});
  assert.equal(await button.getAttribute('data-style'),'emoji');assert.equal(await button.getAttribute('aria-pressed'),'false');
  await p.locator('#alarmOpen').click();
  await p.locator('#alarmHour [data-value="10"]').click();await p.locator('#alarmMinute [data-value="30"]').click();await p.locator('#alarmSet').click();
  await p.locator('#mainBtn').click();await p.clock.runFor(1250);
  const before=await state(p),calls=await p.evaluate(()=>weatherCalls),box=await button.boundingBox();
  for(const [code,emoji,outline]of [[0,'☀️','sun'],[1,'🌤️','partly'],[2,'⛅','partly'],[3,'☁️','cloud'],[45,'🌫️','fog'],[61,'🌧️','rain'],[71,'🌨️','snow'],[75,'❄️','snow'],[80,'🌦️','rain'],[82,'⛈️','rain'],[95,'⛈️','thunder'],[999,'🌡️','temperature']]){
    await p.evaluate(code=>renderWeather({temperature_2m:22.4,weather_code:code},'Shanghai'),code);
    assert.equal(await button.textContent(),emoji);
    await button.click();assert.equal(await button.getAttribute('data-style'),'outline');
    assert.equal(await button.getAttribute('aria-pressed'),'true');
    assert.equal(await button.locator('svg').getAttribute('data-icon'),outline);
    assert.deepEqual(await button.boundingBox(),box);
    await button.click();assert.equal(await button.textContent(),emoji);
    assert.equal(await p.locator('#weatherTemp').textContent(),'22°C');
  }
  await button.focus();await button.press('Space');assert.equal(await button.getAttribute('data-style'),'outline');
  await button.press('Enter');assert.equal(await button.getAttribute('data-style'),'emoji');
  await button.click();await p.locator('#weatherTemp').click();
  assert.equal(await button.getAttribute('data-style'),'outline');assert.equal(await p.locator('#weatherTemp').textContent(),'72°F');
  assert.equal(await p.evaluate(()=>weatherCalls),calls,'Style and unit changes do not fetch');
  await p.evaluate(async()=>{weatherPayload={current:{temperature_2m:10,weather_code:61}};await fetchWeather()});
  assert.equal(await button.locator('svg').getAttribute('data-icon'),'rain');assert.equal(await p.locator('#weatherTemp').textContent(),'50°F');
  await p.evaluate(()=>renderWeather(null));assert.equal(await button.isVisible(),false);
  await p.evaluate(()=>renderWeather({temperature_2m:0,weather_code:71},'Shanghai'));
  assert.equal(await button.locator('svg').getAttribute('data-icon'),'snow');
  assert.deepEqual(await state(p),before);assert.equal(await p.locator('#alarmSummaryTime').textContent(),'10:30');
});

test('refreshing and reopening start fresh without saving preferences or restoring legacy storage', async t => {
  function init(){
    const setItem=Storage.prototype.setItem;
    setItem.call(localStorage,'pomodoro-config',JSON.stringify({darkMode:true,work:55,uiLocked:true}));
    window.storageWrites=[];
    Storage.prototype.setItem=function(...args){window.storageWrites.push(args[0]);return setItem.apply(this,args)};
    window.fetch=async url=>String(url).includes('open-meteo')
      ? {ok:true,json:async()=>({current:{temperature_2m:22.4,weather_code:2}})}
      : {ok:true,json:async()=>({status:'success',lat:31.2,lon:121.5,city:'Shanghai'})};
  }
  async function defaults(p){
    await p.locator('#weatherTemp').waitFor({state:'visible'});
    assert.equal(await time(p),'40:00');assert.equal((await state(p)).isRunning,false);
    assert.equal((await state(p)).completedSessions,0);
    assert.deepEqual(await p.evaluate(()=>config),{hour:60,work:40,short:5,long:15,sound:true,notificationSound:'chime',darkMode:false,keepAwake:false,uiLocked:false});
    assert.equal(await p.locator('html').getAttribute('data-theme'),null);
    assert.equal(await p.locator('#clockStyleToggle').getAttribute('data-style'),'segments');
    assert.equal(await p.locator('#timerStyleToggle').getAttribute('data-style'),'numerals');
    assert.equal(await p.locator('#weatherIcon').getAttribute('data-style'),'emoji');
    assert.equal(await p.locator('#weatherIcon').textContent(),'⛅');
    assert.equal(await p.locator('#weatherTemp').textContent(),'22°C');
    assert.equal(await p.locator('#alarmSummaryTime').isVisible(),false);
    assert.deepEqual(await p.evaluate(()=>storageWrites),[]);
    assert.equal(await p.evaluate(()=>localStorage.length),1);assert.equal(await p.evaluate(()=>sessionStorage.length),0);
  }
  const p=await pageFor(t,init);await defaults(p);
  await p.locator('#weatherIcon').click();await p.locator('#weatherTemp').click();await p.locator('#clockStyleToggle').click();await p.locator('#timerStyleToggle').click();
  await p.locator('#themeToggle').click();await duration(p,55);
  await p.locator('#alarmOpen').click();await p.locator('#alarmHour [data-value="10"]').click();await p.locator('#alarmMinute [data-value="30"]').click();await p.locator('#alarmSet').click();
  await p.locator('#mainBtn').click();await p.clock.runFor(1250);await p.locator('#lockBtn').click();
  assert.deepEqual(await p.evaluate(()=>storageWrites),[]);
  await p.reload();await defaults(p);
  await p.locator('#weatherIcon').click();await p.locator('#weatherTemp').click();
  const url=p.url(),context=p.context();await p.close();
  const reopened=await context.newPage();await reopened.addInitScript(init);await reopened.goto(url);await defaults(reopened);
});

const hasCompletionPulse = locator => locator.evaluate(e=>e.classList.contains('completion-pulse'));
async function nextMinuteAlarm(p,sound=false){
  await p.locator('#alarmOpen').click();await p.locator('#alarmHour [data-value="9"]').click();await p.locator('#alarmMinute [data-value="1"]').click();
  if(!sound)await p.locator('#alarmSound').uncheck();await p.locator('#alarmSet').click();
}

test('timer completion pulses faster for ten seconds, then keeps pulsing slowly until acknowledged', async t => {
  const p=await pageFor(t),ring=p.locator('.timer-container'),edge=p.locator('#completionEdge');
  await p.locator('#settingsBtn').click();await p.locator('#soundToggle').uncheck();await p.keyboard.press('Escape');
  await duration(p,1);await p.locator('#mainBtn').click();await p.clock.fastForward(60000);
  assert(await hasCompletionPulse(ring));assert(await hasCompletionPulse(edge));
  for(const cue of [ring,edge])assert.equal(await cue.evaluate(e=>e.style.getPropertyValue('--completion-color')),'var(--accent-work)');
  for(const [locator,pseudo]of [[ring,'::after'],[edge,null]]){
    assert.deepEqual(await locator.evaluate((e,pseudo)=>{const s=getComputedStyle(e,pseudo);return [s.animationDuration,s.animationDelay,s.animationIterationCount]},pseudo),['2s, 3s','0s, 10s','5, infinite']);
  }
  assert.equal(await edge.evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  await p.clock.runFor(500);assert.equal(await time(p),'00:00');
  assert.equal((await state(p)).currentMode,'work');
  assert.equal(await p.locator('#timerEnd').textContent(),'Focus complete');assert(await hasCompletionPulse(ring));
  for(const cue of [ring,edge])assert.equal(await cue.evaluate(e=>e.style.getPropertyValue('--completion-color')),'var(--accent-work)');
  await p.clock.runFor(9500);assert(await hasCompletionPulse(ring));assert(await hasCompletionPulse(edge));
  await p.clock.fastForward(60000);assert(await hasCompletionPulse(ring));assert(await hasCompletionPulse(edge));
  assert.equal(await p.locator('#timerEnd').textContent(),'Focus complete');assert.equal((await state(p)).completedSessions,1);
  assert.equal(await time(p),'00:00');assert.equal((await state(p)).currentMode,'work');
  assert.equal(await p.locator('#mainBtn').getAttribute('aria-label'),'Start short break');
  await p.mouse.click(5,5);
  assert.equal(await time(p),'05:00');assert.equal((await state(p)).currentMode,'short');assert.equal((await state(p)).isRunning,false);
  assert.equal(await hasCompletionPulse(ring),false);assert.equal(await hasCompletionPulse(edge),false);
  await duration(p,1);assert.equal(await p.locator('#timerEnd').isVisible(),false);
  await p.locator('#mainBtn').click();await p.clock.fastForward(60000);
  assert(await hasCompletionPulse(ring));
  for(const cue of [ring,edge])assert.equal(await cue.evaluate(e=>e.style.getPropertyValue('--completion-color')),'var(--accent-break)');
  await p.clock.runFor(15000);assert.equal(await time(p),'00:00');assert.equal(await p.locator('#timerEnd').textContent(),'Break complete');
  assert.equal((await state(p)).currentMode,'short');
  for(const cue of [ring,edge])assert.equal(await cue.evaluate(e=>e.style.getPropertyValue('--completion-color')),'var(--accent-break)');
  await p.locator('#mainBtn').click();assert.equal(await hasCompletionPulse(edge),false);assert.match(await p.locator('#timerEnd').textContent(),/Ends/);
  assert.equal((await state(p)).currentMode,'work');assert.equal((await state(p)).isRunning,true);assert.equal(await time(p),'40:00');
});

test('reset readies the next phase and manual presets take precedence after acknowledgment', async t => {
  const p=await pageFor(t),edge=p.locator('#completionEdge');
  for(const action of ['#resetBtn','[data-mode="hour"]']){
    await duration(p,1);await p.locator('#mainBtn').click();await p.clock.fastForward(60000);assert(await hasCompletionPulse(edge));
    await p.locator(action).click();assert.equal(await hasCompletionPulse(edge),false);
    const text=await time(p);await p.clock.runFor(1000);assert.equal(await time(p),text);
    assert.equal(text,action==='#resetBtn'?'05:00':'60:00');
    assert.equal(await p.locator('#timerStatus').textContent(),action==='#resetBtn'?'Short Break reset.':'Long Focus. Ready to start.');
    assert.equal(await p.locator('#timerEnd').isVisible(),false);
  }
});

test('all four presets keep their completed phase and color until acknowledged', async t => {
  const p=await pageFor(t);
  for(const mode of ['work','hour','short','long']){
    await p.locator('[data-mode="'+mode+'"]').click();await duration(p,1);await p.locator('#mainBtn').click();
    await p.clock.fastForward(60000);await p.clock.runFor(12000);
    const focus=mode==='work'||mode==='hour';
    assert.equal((await state(p)).currentMode,mode);assert.equal(await time(p),'00:00');
    assert.equal(await p.locator('#modeLabel').textContent(),focus?'CUSTOM FOCUS':'CUSTOM BREAK');
    assert.equal(await p.locator('#timerEnd').textContent(),focus?'Focus complete':'Break complete');
    assert.equal(await p.locator('#progress').evaluate(e=>e.style.stroke),focus?'var(--accent-work)':'var(--accent-break)');
    assert.equal(await p.locator('#completionEdge').evaluate(e=>e.style.getPropertyValue('--completion-color')),focus?'var(--accent-work)':'var(--accent-break)');
    await p.mouse.click(5,5);
    assert.equal((await state(p)).currentMode,focus?'short':'work');assert.equal((await state(p)).isRunning,false);
    assert.equal(await p.locator('#timerEnd').isVisible(),false);assert.equal(await p.locator('.completion-pulse').count(),0);
  }
});

test('Start, keyboard activation, and duration adjustments act once on the next phase', async t => {
  for(const action of ['click','Enter','Space','increase','decrease','duration','timerStyle']){
    const p=await pageFor(t);
    if(action==='timerStyle')await p.locator('#timerStyleToggle').click();
    await duration(p,1);await p.locator('#mainBtn').click();await p.clock.fastForward(60000);
    if(action==='click')await p.locator('#mainBtn').click();
    else if(action==='Enter'||action==='Space')await p.locator('#mainBtn').press(action);
    else if(action==='duration'){await p.locator('#durationInput').click();await duration(p,7)}
    else if(action==='timerStyle')await p.locator('#timerSegments rect').first().click();
    else await p.locator(action==='increase'?'#increaseTime':'#decreaseTime').click();
    const next=await state(p),running=['click','Enter','Space'].includes(action);
    assert.equal(next.currentMode,'short');assert.equal(next.isRunning,running);assert.equal(next.completedSessions,1);
    assert.equal(next.sessionDuration,action==='increase'?360:action==='decrease'?240:action==='duration'?420:300);
    assert.equal(next.remainingMs,next.sessionDuration*1000);assert.equal(await p.locator('.completion-pulse').count(),0);
    if(running)assert.equal(await p.locator('#timerStatus').textContent(),'Short Break started.');
    if(action==='timerStyle')assert.equal(await p.locator('#timerStyleToggle').getAttribute('data-style'),'numerals');
    await p.clock.runFor(1000);
    assert.equal((await state(p)).remainingMs,next.remainingMs-(running?1000:0));
  }
});

test('acknowledging while the duration field is focused replaces the completed phase value', async t => {
  const p=await pageFor(t);
  await duration(p,1);await p.locator('#mainBtn').click();await p.locator('#durationInput').focus();
  await p.clock.fastForward(60000);assert.equal(await p.locator('#durationInput').inputValue(),'1');
  await p.locator('#durationInput').press('Tab');
  assert.equal(await p.locator('#durationInput').inputValue(),'5');assert.equal(await time(p),'05:00');
  assert.equal((await state(p)).customDuration,null);assert.equal((await state(p)).isRunning,false);
});

test('alarm pulses persist with sound off and a background click acknowledges visuals without dismissing the alarm', async t => {
  const p=await pageFor(t),dialog=p.locator('#alarmDialog');await nextMinuteAlarm(p);
  await p.locator('#mainBtn').click();const before=await state(p);await p.clock.fastForward(60000);
  assert(await hasCompletionPulse(dialog));assert.equal(await dialog.isVisible(),true);
  assert.equal(await dialog.evaluate(e=>getComputedStyle(e).animationName),'completion-alarm-halo, completion-alarm-halo');
  assert.equal(await dialog.evaluate(e=>getComputedStyle(e,'::backdrop').animationName),'completion-alarm-edge, completion-alarm-edge');
  for(const pseudo of [null,'::backdrop'])assert.deepEqual(await dialog.evaluate((e,pseudo)=>{const s=getComputedStyle(e,pseudo);return [s.animationDuration,s.animationDelay,s.animationIterationCount]},pseudo),['2s, 3s','0s, 10s','5, infinite']);
  assert.equal((await state(p)).timerDeadline,before.timerDeadline);
  await p.clock.runFor(11000);assert(await hasCompletionPulse(dialog));assert.equal(await dialog.isVisible(),true);
  await p.mouse.click(5,5);assert.equal(await hasCompletionPulse(dialog),false);assert.equal(await dialog.isVisible(),true);
  assert.equal((await state(p)).timerDeadline,before.timerDeadline);
  await p.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);
  assert.equal(await p.evaluate(()=>completionEffects.size),0);
});

test('simultaneous timer and alarm completion prioritizes amber; snooze and dismiss clear alarm effects', async t => {
  const p=await pageFor(t),dialog=p.locator('#alarmDialog'),edge=p.locator('#completionEdge');
  await nextMinuteAlarm(p);await duration(p,1);await p.locator('#mainBtn').click();await p.clock.fastForward(60000);
  assert(await hasCompletionPulse(dialog));assert(await hasCompletionPulse(edge));
  assert.equal(await time(p),'00:00');assert.equal((await state(p)).currentMode,'work');
  assert.equal(await edge.evaluate(e=>getComputedStyle(e).visibility),'hidden');
  assert.equal(await p.locator('.timer-container').evaluate(e=>getComputedStyle(e,'::after').visibility),'hidden');
  await p.locator('#alarmSnooze').click();assert.equal(await hasCompletionPulse(dialog),false);assert.equal(await dialog.isVisible(),false);
  assert.equal(await hasCompletionPulse(edge),false);
  assert.equal(await edge.evaluate(e=>getComputedStyle(e).visibility),'visible');
  await p.clock.runFor(500);assert.equal(await time(p),'05:00');
  await p.clock.fastForward(300000);assert(await hasCompletionPulse(dialog));assert.equal(await hasCompletionPulse(edge),false);
  await p.locator('#alarmDismiss').click();assert.equal(await dialog.isVisible(),false);assert.equal(await hasCompletionPulse(dialog),false);
  assert.equal(await p.evaluate(()=>completionEffects.size),0);assert.equal(await time(p),'05:00');
});

test('background completion waits for visibility and refreshing removes every cue', async t => {
  const p=await pageFor(t),dialog=p.locator('#alarmDialog'),edge=p.locator('#completionEdge');
  await nextMinuteAlarm(p);await duration(p,1);await p.locator('#mainBtn').click();
  await p.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'}));
  await p.clock.fastForward(60000);await p.clock.runFor(5000);
  assert.equal(await hasCompletionPulse(dialog),false);assert.equal(await hasCompletionPulse(edge),false);
  assert.equal(await p.evaluate(()=>completionEffects.size),2);
  assert.equal(await p.evaluate(()=>[...completionEffects.values()].every(e=>e.pending)),true);
  assert.equal(await time(p),'00:00');assert.equal((await state(p)).currentMode,'work');
  await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'))});
  assert(await hasCompletionPulse(dialog));assert(await hasCompletionPulse(edge));
  assert.equal(await time(p),'00:00');assert.equal((await state(p)).currentMode,'work');
  await p.reload();assert.equal(await p.locator('.completion-pulse').count(),0);assert.equal(await dialog.isVisible(),false);
  assert.equal(await p.locator('#timerEnd').isVisible(),false);assert.equal(await time(p),'40:00');
});

test('reduced motion uses steady halos and edge glows without blocking the controls', async t => {
  const p=await pageFor(t),dialog=p.locator('#alarmDialog'),edge=p.locator('#completionEdge');
  await p.emulateMedia({reducedMotion:'reduce'});await nextMinuteAlarm(p);await duration(p,1);await p.locator('#mainBtn').click();
  await p.clock.fastForward(60000);
  assert.equal(await dialog.evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await dialog.evaluate(e=>getComputedStyle(e,'::backdrop').animationName),'none');
  assert.notEqual(await dialog.evaluate(e=>getComputedStyle(e,'::backdrop').boxShadow),'none');
  assert.equal(await edge.evaluate(e=>getComputedStyle(e).animationName),'none');assert.equal(await edge.evaluate(e=>getComputedStyle(e).opacity),'1');
  assert.equal(await p.locator('.timer-container').evaluate(e=>getComputedStyle(e,'::after').animationName),'none');
  await p.clock.runFor(15000);assert(await hasCompletionPulse(dialog));assert(await hasCompletionPulse(edge));
  assert.equal(await time(p),'00:00');assert.equal((await state(p)).currentMode,'work');
  await p.locator('#alarmDismiss').click();assert.equal(await hasCompletionPulse(edge),false);assert.equal(await hasCompletionPulse(dialog),false);
  assert.equal(await time(p),'05:00');assert.equal((await state(p)).isRunning,false);
});

test('acknowledging a completion preserves the clicked control and ignores synthetic or held-key events', async t => {
  const p=await pageFor(t),edge=p.locator('#completionEdge'),clock=p.locator('#clockStyleToggle');
  await duration(p,1);await p.locator('#mainBtn').click();await p.keyboard.down('a');await p.clock.fastForward(60000);
  await p.keyboard.down('a');assert(await hasCompletionPulse(edge));await p.keyboard.up('a');
  await p.evaluate(()=>document.body.click());assert(await hasCompletionPulse(edge));
  await clock.click();assert.equal(await hasCompletionPulse(edge),false);assert.equal(await clock.getAttribute('data-style'),'numerals');
  await p.clock.runFor(12000);assert.equal(await hasCompletionPulse(edge),false);assert.equal(await p.locator('#timerEnd').isVisible(),false);
  assert.equal(await time(p),'05:00');assert.equal((await state(p)).isRunning,false);
  await duration(p,1);await p.locator('#mainBtn').click();await p.clock.fastForward(60000);
  await p.keyboard.press('ArrowRight');assert.equal(await hasCompletionPulse(edge),false);
  assert.equal(await p.locator('#timerEnd').isVisible(),false);assert.equal(await time(p),'40:00');
  await p.clock.runFor(500);await duration(p,1);await p.locator('#mainBtn').click();await p.locator('#lockBtn').click();await p.clock.fastForward(60000);
  assert(await hasCompletionPulse(edge));assert.equal(await p.locator('#mainBtn').isDisabled(),true);
  const box=await p.locator('#mainBtn').boundingBox();await p.mouse.click(box.x+box.width/2,box.y+box.height/2);
  assert.equal(await hasCompletionPulse(edge),false);assert.equal(await p.locator('#mainBtn').isDisabled(),true);
  assert.equal(await time(p),'05:00');assert.equal((await state(p)).isRunning,false);
});

test('rendered halo and edge stay synchronized across the ten-second slowdown', async t => {
  const p=await pageFor(t);await duration(p,1);await p.locator('#mainBtn').click();await p.clock.fastForward(60000);await p.clock.runFor(500);
  await p.evaluate(()=>{window.effectAnimations=document.getAnimations().filter(a=>a.animationName?.startsWith('completion-'));effectAnimations.forEach(a=>a.pause())});
  for(const [milliseconds,opacity]of [[0,0],[1000,1],[2000,0],[9000,1],[9999,0],[10000,0],[11500,1],[13000,0],[14500,1],[70000,0]]){
    const values=await p.evaluate(milliseconds=>{
      effectAnimations.forEach(a=>a.currentTime=milliseconds);
      return [getComputedStyle(document.getElementById('completionEdge')).opacity,getComputedStyle(document.querySelector('.timer-container'),'::after').opacity].map(Number);
    },milliseconds);
    values.forEach(value=>near(value,opacity));near(values[0],values[1]);
  }
  await p.mouse.click(5,5);assert.equal(await p.locator('#completionEdge').evaluate(e=>getComputedStyle(e).opacity),'0');
});

test('acknowledging alarm visuals leaves its repeating sound active until Dismiss', async t => {
  const p=await pageFor(t,()=>{
    window.alarmNotes=0;const Audio=window.AudioContext;
    window.AudioContext=class extends Audio{createOscillator(){const oscillator=super.createOscillator(),start=oscillator.start.bind(oscillator);oscillator.start=(...args)=>{window.alarmNotes++;return start(...args)};return oscillator}};
  });
  await nextMinuteAlarm(p,true);await p.clock.fastForward(60000);
  const dialog=p.locator('#alarmDialog');assert(await hasCompletionPulse(dialog));
  await p.locator('#alarmRingTime').click();assert.equal(await hasCompletionPulse(dialog),false);assert.equal(await dialog.isVisible(),true);
  const before=await p.evaluate(()=>alarmNotes);assert(before>0);
  await p.clock.runFor(2100);assert((await p.evaluate(()=>alarmNotes))>before);assert.equal(await hasCompletionPulse(dialog),false);
  await p.locator('#alarmDismiss').click();const stopped=await p.evaluate(()=>alarmNotes);
  await p.clock.runFor(4000);assert.equal(await p.evaluate(()=>alarmNotes),stopped);assert.equal(await dialog.isVisible(),false);
});

test('gear stays an icon and closes by second click, outside click, Escape, and close button', async t => {
  const p = await pageFor(t), gear = p.locator('#settingsBtn');
  assert.equal(await gear.locator('svg').count(), 1);
  assert.equal((await gear.textContent()).trim(), '');
  assert.equal(await settingsOpen(p), false);
  await gear.click(); assert.equal(await settingsOpen(p), true);
  assert.equal(await gear.getAttribute('aria-expanded'), 'true');
  await gear.click(); assert.equal(await settingsOpen(p), false);
  await gear.click(); await p.mouse.click(20,20); assert.equal(await settingsOpen(p), false);
  await gear.focus(); await p.keyboard.press('Enter'); assert.equal(await settingsOpen(p), true);
  await p.keyboard.press('Escape'); assert.equal(await settingsOpen(p), false);
  assert.equal(await gear.evaluate(e => e === document.activeElement), true);
  await gear.click(); await p.locator('#closeSettings').click(); assert.equal(await settingsOpen(p), false);
  assert.equal(await gear.getAttribute('aria-expanded'), 'false');
});

test('four stable preset names, accessible groups, custom state, and editable preset minutes', async t => {
  const p = await pageFor(t);
  assert.deepEqual(await p.locator('.mode-btn').allTextContents(), ['Long', 'Default', 'Long', 'Short']);
  assert.equal(await p.getByRole('group', {name:'Focus', exact:true}).count(), 1);
  assert.equal(await p.getByRole('group', {name:'Break', exact:true}).count(), 1);
  await p.locator('#settingsBtn').click();
  await p.locator('[data-target="hour"][data-action="increase"]').click();
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('[data-mode="hour"]').getAttribute('title'), 'Long Focus · 61 min');
  await p.locator('[data-mode="hour"]').click(); assert.equal(await time(p), '61:00');
  await p.locator('#increaseTime').click();
  assert.equal(await time(p), '62:00');
  assert.equal(await p.locator('#modeLabel').textContent(), 'CUSTOM FOCUS');
  assert.equal(await p.locator('.mode-btn[aria-pressed="true"]').count(), 0);
  assert.equal(await p.locator('.mode-picker').evaluate(e=>getComputedStyle(e).opacity), '1');
  await p.locator('[data-mode="short"]').click(); await p.locator('#increaseTime').click();
  assert.equal(await p.locator('#modeLabel').textContent(), 'CUSTOM BREAK');
});

test('running +, −, and typed total preserve elapsed time, deadlines, and progress', async t => {
  const p = await pageFor(t);
  await p.locator('#mainBtn').click(); await p.clock.fastForward(600000);
  assert.equal(await time(p), '30:00');
  const deadline = (await state(p)).timerDeadline;
  await p.locator('#increaseTime').click(); assert.equal(await time(p), '31:00');
  let s = await state(p); assert.equal(s.timerDeadline, deadline+60000); assert.equal(s.sessionDuration, 2460);
  assert.equal(s.sessionDuration*1000-s.remainingMs, 600000);
  const fraction = await p.locator('#progress').evaluate(e=>Number(e.style.strokeDashoffset)/(2*Math.PI*96));
  near(fraction, 10/41);
  await p.locator('#decreaseTime').click(); assert.equal(await time(p), '30:00');
  await duration(p, 45); assert.equal(await time(p), '35:00');
  assert.equal(await p.locator('#timerEnd').textContent(), 'Ends at 09:45');
  s = await state(p);
  await duration(p, 10); assert.deepEqual(await state(p), s);
  assert.equal(await p.locator('#durationInput').inputValue(), '45');
  assert.match(await p.locator('#timerStatus').textContent(), /already elapsed/);
  for (const invalid of [0, -5, 1.5, '']) { await duration(p, invalid); assert.deepEqual(await state(p), s); }
});

test('paused adjustments retain exact fractional elapsed time; reset restarts the new total', async t => {
  const p = await pageFor(t);
  await duration(p, 2); await p.locator('#mainBtn').click(); await p.clock.runFor(1250); await p.locator('#mainBtn').click();
  await p.clock.fastForward(60000); await p.locator('#increaseTime').click();
  assert.equal((await state(p)).remainingMs, 178750);
  assert.equal(await p.locator('#timerEnd').textContent(), 'Paused');
  assert.equal(await p.locator('#mainBtn').getAttribute('aria-label'), 'Resume timer');
  await p.locator('#mainBtn').click(); await p.clock.runFor(750); assert.equal(await time(p), '02:58');
  await p.locator('#resetBtn').click(); assert.equal(await time(p), '03:00');
  assert.equal((await state(p)).isRunning, false);
});

test('Undo restores running, paused, and custom sessions without adding elapsed time back', async t => {
  const p = await pageFor(t);
  await duration(p, 25); await p.locator('#mainBtn').click(); await p.clock.runFor(1250);
  const saved = await state(p);
  await p.locator('[data-mode="long"]').click(); assert.equal(await time(p), '15:00');
  await p.clock.runFor(3750); await p.locator('#undoTimer').click();
  let restored = await state(p);
  assert.equal(restored.timerDeadline, saved.timerDeadline); assert.equal(restored.customDuration, 25);
  assert.equal(restored.remainingMs, 1495000); assert.equal(restored.isRunning, true);
  assert.equal(await p.locator('#modeLabel').textContent(), 'CUSTOM FOCUS');
  await p.locator('#mainBtn').click(); const paused = await state(p);
  await p.locator('[data-mode="short"]').click(); await p.clock.runFor(5000); await p.locator('#undoTimer').click();
  assert.deepEqual(await state(p), paused);
});

test('Undo expiry, successive changes, and later actions cannot restore stale state', async t => {
  const p = await pageFor(t);
  await p.locator('#mainBtn').click(); await p.clock.runFor(1000);
  const original = await state(p);
  await p.locator('[data-mode="work"]').click(); assert.deepEqual(await state(p), original);
  await p.locator('[data-mode="hour"]').click();
  await p.locator('[data-mode="short"]').click(); await p.locator('#undoTimer').click();
  assert.equal(await time(p), '60:00');
  await p.locator('[data-mode="long"]').click(); await p.mouse.move(0,0); await p.clock.runFor(8100);
  assert.equal(await p.locator('#undoToast').isVisible(), false);
  await p.locator('[data-mode="short"]').click(); await p.locator('#increaseTime').click();
  assert.equal(await p.locator('#undoToast').isVisible(), false);
  await p.locator('[data-mode="hour"]').click(); await p.locator('#mainBtn').click();
  assert.equal(await p.locator('#undoToast').isVisible(), false);
});

test('expired original deadline completes exactly once when restored', async t => {
  const p = await pageFor(t);
  await duration(p, 1); await p.locator('#mainBtn').click(); await p.clock.runFor(59000);
  await p.locator('[data-mode="hour"]').click(); await p.clock.runFor(2000); await p.locator('#undoTimer').click();
  assert.equal((await state(p)).completedSessions, 1);
  await p.clock.runFor(1000); assert.equal(await time(p), '00:00');
  assert.equal((await state(p)).currentMode,'work');
  assert.match(await p.locator('#timerStatus').textContent(),/Focus complete/);
  await p.clock.fastForward(60000); assert.equal((await state(p)).completedSessions, 1);
  await p.mouse.click(5,5);assert.equal(await time(p),'05:00');assert.equal((await state(p)).isRunning,false);
});

test('late callbacks count each completed session once and acknowledgment readies the fourth-session long break', async t => {
  const p = await pageFor(t);
  for (let i=1;i<=4;i++) {
    await p.locator('[data-mode="work"]').click(); await duration(p,1); await p.locator('#mainBtn').click();
    await p.clock.fastForward(90000); assert.equal((await state(p)).completedSessions, i);
    await p.clock.runFor(15000);assert.equal(await time(p),'00:00');assert.equal((await state(p)).currentMode,'work');
    await p.mouse.click(5,5);assert.equal(await time(p),i===4?'15:00':'05:00');assert.equal((await state(p)).isRunning,false);
  }
  await p.locator('[data-mode="work"]').click(); await duration(p,1); await p.locator('#mainBtn').click();
  await p.clock.runFor(60000); await p.locator('[data-mode="hour"]').click();
  await p.clock.runFor(1000); assert.equal(await time(p), '60:00');
});

test('toolbar and settings work by keyboard; locking disables mouse and keyboard changes', async t => {
  const p = await pageFor(t);
  const lightIcon = await p.locator('#themeToggle svg').innerHTML();
  await p.locator('#themeToggle').focus(); await p.keyboard.press('Space');
  assert.equal(await p.locator('html').getAttribute('data-theme'), 'dark');
  assert.notEqual(await p.locator('#themeToggle svg').innerHTML(), lightIcon);
  await p.locator('#settingsBtn').click(); await p.locator('#darkModeToggle').focus(); await p.keyboard.press('Space');
  assert.equal(await p.locator('html').getAttribute('data-theme'), null);
  await p.keyboard.press('Escape');
  const unlocked = await p.locator('#lockBtn svg').innerHTML();
  await p.locator('#lockBtn').focus(); await p.keyboard.press('Space');
  assert.equal(await p.locator('#mainBtn').isDisabled(), true);
  assert.equal(await p.locator('#durationInput').isDisabled(), true);
  assert.equal(await p.locator('#alarmOpen').isDisabled(), true);
  assert.notEqual(await p.locator('#lockBtn svg').innerHTML(), unlocked);
  await p.locator('#settingsBtn').click(); assert.equal(await p.locator('.setting-btn').first().isDisabled(), true);
  await p.keyboard.press('Escape'); await p.locator('#lockBtn').click();
  assert.equal(await p.locator('#mainBtn').isDisabled(), false);
  assert.equal(await p.locator('#alarmOpen').isDisabled(), false);
});

function mockWakeLock() {
  window.wakeCalls=0;
  Object.defineProperty(navigator, 'wakeLock', {configurable:true,value:{async request(){
    window.wakeCalls++;
    if(window.rejectWake) throw new Error('Denied');
    const lock=new EventTarget(); lock.released=false;
    lock.release=async()=>{lock.released=true;lock.dispatchEvent(new Event('release'));};
    window.testWake=lock; return lock;
  }}});
}
test('Keep Awake indicates real acquisition, release, and permission failure', async t => {
  const p = await pageFor(t, mockWakeLock);
  await p.locator('#keepAwakeBtn').click();
  assert.equal(await p.locator('#keepAwakeBtn').getAttribute('aria-pressed'), 'true');
  await p.evaluate(()=>testWake.release());
  assert.equal(await p.locator('#keepAwakeBtn').getAttribute('aria-pressed'), 'false');
  await p.evaluate(()=>{window.rejectWake=true}); await p.locator('#keepAwakeBtn').click();
  assert.equal(await p.locator('#keepAwakeBtn').getAttribute('aria-pressed'), 'false');
  assert.match(await p.locator('#wakeStatus').textContent(), /could not be enabled/);
  assert.equal(await p.locator('#keepAwakeBtn').isDisabled(), false);
  await p.evaluate(()=>{window.rejectWake=false}); await p.locator('#keepAwakeBtn').click(); await p.locator('#keepAwakeBtn').click();
  assert.equal(await p.locator('#keepAwakeBtn').getAttribute('aria-pressed'), 'false');
  assert.equal(await p.evaluate(()=>testWake.released), true);
});

test('Keep Awake reacquires after visibility returns, even while the timer is idle', async t => {
  const p = await pageFor(t, mockWakeLock);
  await p.locator('#keepAwakeBtn').click();
  await p.evaluate(async()=>{
    Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
    await testWake.release();
    Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await p.evaluate(()=>wakeCalls), 2);
  assert.equal(await p.locator('#keepAwakeBtn').getAttribute('aria-pressed'), 'true');
});

test('unsupported Keep Awake stays off and explains why', async t => {
  const p = await pageFor(t, ()=>{ delete Navigator.prototype.wakeLock; });
  await p.locator('#keepAwakeBtn').click();
  assert.equal(await p.locator('#keepAwakeBtn').getAttribute('aria-pressed'), 'false');
  assert.match(await p.locator('#keepAwakeBtn').getAttribute('title'), /unavailable/);
  assert.match(await p.locator('#timerStatus').textContent(), /unavailable/);
});

test('sound preview uses selected tone; keyboard sound switch disables preview; errors stay visible', async t => {
  const p = await pageFor(t, ()=>{
    window.audioNotes=[];
    const Audio=window.AudioContext;
    window.AudioContext=class extends Audio {
      createOscillator(){const o=super.createOscillator(),start=o.start.bind(o);o.start=(...args)=>{audioNotes.push(o.frequency.value);return start(...args)};return o;}
    };
  });
  await p.locator('#settingsBtn').click(); await p.locator('[data-sound="bell"]').click(); await p.locator('#soundPreview').click();
  assert.deepEqual(await p.evaluate(()=>audioNotes), [440,880,1320]);
  await p.locator('#soundToggle').focus(); await p.keyboard.press('Space');
  assert.equal(await p.locator('#soundPreview').isDisabled(), true);
  assert.equal(await p.locator('[data-sound="chime"]').isDisabled(), true);
  await p.keyboard.press('Space'); assert.equal(await p.locator('#soundPreview').isDisabled(), false);
  await p.evaluate(async()=>{await audioContext.close()}); await p.locator('#soundPreview').click();
  assert.match(await p.locator('#timerSoundStatus').textContent(), /unavailable/);
});

test('alarm editor and saved alarm remain independent of timer controls and undo', async t => {
  const p = await pageFor(t);
  await p.locator('#alarmOpen').click();
  await p.locator('#alarmHour [data-value="10"]').click(); await p.locator('#alarmMinute [data-value="30"]').click();
  await p.locator('#alarmSet').click(); assert.equal(await p.locator('#alarmSummaryTime').textContent(), '10:30');
  await p.locator('[data-mode="hour"]').click(); await p.locator('#undoTimer').click();
  await p.locator('#settingsBtn').click(); await p.locator('#settingsBtn').click();
  assert.equal(await p.locator('#alarmSummaryTime').textContent(), '10:30');
  await p.locator('#alarmOpen').click(); await p.keyboard.press('Escape');
  assert.equal(await p.locator('#alarmEditor').isVisible(), false);
});

test('light/dark layouts fit phone, landscape, tablet, desktop and ultrawide screens', async t => {
  const sizes = [[320,568],[390,844],[568,320],[844,390],[768,1024],[1280,720],[1440,900],[2560,1080]];
  for (const [width,height] of sizes) {
    const p = await pageFor(t,null,{width,height});
    for (const theme of ['light','dark']) {
      if(theme==='dark') await p.locator('#themeToggle').click();
      const home = await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,
        clipped:[...document.querySelectorAll('.mode-btn')].some(e=>e.scrollWidth>e.clientWidth),
        buttons:[...document.querySelectorAll('.mode-btn')].map(e=>{const r=e.getBoundingClientRect();return {y:r.y,h:r.height,w:r.width}})}));
      assert.equal(home.overflow,false,`${width}x${height} ${theme} page overflow`);
      assert.equal(home.clipped,false,`${width}x${height} ${theme} preset clipping`);
      assert(home.buttons.every(b=>Math.abs(b.y-home.buttons[0].y)<1));
      if(process.env.TEST_ARTIFACTS) {
        fs.mkdirSync(process.env.TEST_ARTIFACTS,{recursive:true});
        await p.screenshot({path:path.join(process.env.TEST_ARTIFACTS,`${width}x${height}-${theme}.png`),fullPage:true,animations:'disabled'});
      }
      await p.locator('#settingsBtn').click();
      const panel = await p.locator('#settingsPanel').evaluate(e=>{
        const r=e.getBoundingClientRect(),g=document.getElementById('settingsBtn').getBoundingClientRect();
        return {left:r.left,right:r.right,bottom:r.bottom,top:r.top,gearBottom:g.bottom,overflow:e.scrollWidth>e.clientWidth};
      });
      assert(panel.left>=0&&panel.right<=width&&panel.bottom<=height,JSON.stringify({width,height,panel}));
      assert(panel.top>=panel.gearBottom,'Settings covers its gear'); assert.equal(panel.overflow,false);
      if(process.env.TEST_ARTIFACTS) await p.screenshot({path:path.join(process.env.TEST_ARTIFACTS,`${width}x${height}-${theme}-settings.png`),fullPage:true,animations:'disabled'});
      await p.locator('#settingsPanel').evaluate(e=>{e.scrollTop=e.scrollHeight});
      assert.equal(await p.locator('#darkModeToggle').isVisible(), true);
      await p.locator('#settingsBtn').click(); assert.equal(await settingsOpen(p), false);
    }
    await p.close();
  }
});
