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
  await p.clock.runFor(1000); assert.equal(await time(p), '05:00');
  await p.clock.fastForward(60000); assert.equal((await state(p)).completedSessions, 1);
});

test('completion transition, late callbacks, and four-session long break still work', async t => {
  const p = await pageFor(t);
  for (let i=1;i<=4;i++) {
    await p.locator('[data-mode="work"]').click(); await duration(p,1); await p.locator('#mainBtn').click();
    await p.clock.fastForward(90000); assert.equal((await state(p)).completedSessions, i);
    await p.clock.runFor(500); assert.equal(await time(p), i===4?'15:00':'05:00');
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
