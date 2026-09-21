const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
let browser;
before(async()=>{browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true})});
after(async()=>{await browser?.close()});
async function setup(t,options={}){
  const context=await browser.newContext({viewport:{width:1280,height:900},timezoneId:'Asia/Shanghai',...options});
  await context.route(/^https?:/,r=>r.abort());
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(5000);
  await p.clock.install({time:new Date('2026-09-21T08:59:59+08:00')});await p.clock.pauseAt(new Date('2026-09-21T09:00:00+08:00'));
  await p.goto(pathToFileURL(path.join(__dirname,'..','index.html')).href);
  t.after(async()=>{await context.close();assert.deepEqual(errors,[])});return p;
}
async function resize(p,width,height){await p.setViewportSize({width,height});await p.waitForTimeout(30);await p.clock.runFor(50)}
async function capture(p,name){if(process.env.TEST_ARTIFACTS){fs.mkdirSync(process.env.TEST_ARTIFACTS,{recursive:true});await p.screenshot({path:path.join(process.env.TEST_ARTIFACTS,name+'.png'),animations:'disabled',fullPage:true})}}
async function armAlarm(p){await p.locator('#alarmOpen').click();await p.locator('#alarmHour [data-value="10"]').click();await p.locator('#alarmMinute [data-value="30"]').click();await p.locator('#alarmSet').click()}
async function geometry(p){return p.evaluate(()=>{
  const rect=id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
  return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,layout:document.body.dataset.layout,
    main:rect('mainBtn'),reset:rect('resetBtn'),gear:rect('settingsBtn'),alarm:rect('alarmOpen'),time:rect('time'),
    clippedButtons:[...document.querySelectorAll('.mode-btn')].filter(e=>e.getBoundingClientRect().width>0).filter(e=>e.scrollWidth>e.clientWidth).map(e=>e.textContent)};
})}
function checkGeometry(g,{allVisible=false}={}){
  assert(!g.overflow,JSON.stringify(g));assert.deepEqual(g.clippedButtons,[],JSON.stringify(g));
  for(const key of ['main','reset','gear','alarm','time']){
    const r=g[key];assert(r.x>=-1&&r.right<=g.width+1,`${key} outside ${JSON.stringify(g)}`);
    if(allVisible)assert(r.y>=-1&&r.bottom<=g.height+1,`${key} below window ${JSON.stringify(g)}`);
  }
}

test('each preset contains a clickable icon and keeps its accessible name',async t=>{
  const p=await setup(t);
  assert.deepEqual(await p.locator('.mode-btn').allTextContents(),['Long','Default','Long','Short']);
  assert.equal(await p.getByRole('group',{name:'Focus',exact:true}).count(),1);
  assert.equal(await p.getByRole('group',{name:'Break',exact:true}).count(),1);
  assert.equal(await p.locator('.mode-btn > .mode-symbol[aria-hidden="true"]').count(),4);
  assert.equal(await p.locator('.mode-group > .mode-symbol').count(),0);
  const colors=await p.locator('.mode-btn').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));
  assert.equal(colors[0],colors[1]);assert.equal(colors[2],colors[3]);assert.notEqual(colors[0],colors[2]);
  const labels=await p.locator('#focusGroupLabel,#breakGroupLabel').evaluateAll(es=>es.map(e=>getComputedStyle(e).clipPath));
  assert(labels.every(c=>c==='inset(50%)'));
  for(const [mode,time,label]of [['hour','60:00','Long Focus'],['work','40:00','Default Focus'],['long','15:00','Long Break'],['short','05:00','Short Break']]){
    const button=p.locator(`[data-mode="${mode}"]`);
    await button.locator('svg').click();
    assert.equal(await p.locator('#time').textContent(),time);
    assert.equal(await button.getAttribute('aria-pressed'),'true');
    assert.match(await button.getAttribute('aria-label'),new RegExp(label));
  }
});

test('changing clock style retains its frame and readable time through resizing',async t=>{
  const p=await setup(t),clock=p.locator('#clockStyleToggle');
  for(const [w,h]of [[280,600],[320,568],[390,844],[500,500],[640,360],[768,1024],[1440,900],[1920,1080],[2560,1080],[3440,1440]]){
    await resize(p,w,h);checkGeometry(await geometry(p),{allVisible:true});
    const before=await clock.boundingBox(),timer=await p.locator('.timer-container').boundingBox();
    await clock.click();await p.clock.runFor(200);
    assert.equal(await clock.getAttribute('data-style'),'numerals');
    assert.deepEqual(await clock.boundingBox(),before);
    assert.deepEqual(await p.locator('.timer-container').boundingBox(),timer);
    assert.equal(await p.locator('#clockNumerals').evaluate(e=>e.scrollWidth<=e.clientWidth),true,`${w}x${h}`);
    await capture(p,`${w}x${h}-numerals`);
    await clock.click();assert.equal(await clock.getAttribute('data-style'),'segments');
  }
});

test('both countdown styles fit small windows and long durations without shifting the ring',async t=>{
  const p=await setup(t),button=p.locator('#timerStyleToggle');
  for(const minutes of [40,100,10000]){
    await resize(p,1440,900);await p.locator('#durationInput').fill(String(minutes));await p.locator('#durationInput').press('Tab');await button.focus();
    for(const [width,height]of [[240,200],[320,360],[480,360],[390,844],[768,1024],[1440,900],[2560,1080]]){
      await resize(p,width,height);checkGeometry(await geometry(p),{allVisible:true});
      const before=await button.boundingBox(),ring=await p.locator('.timer-container').boundingBox();
      await button.click();await p.clock.runFor(200);
      assert.equal(await button.getAttribute('data-style'),'segments');
      assert.deepEqual(await button.boundingBox(),before);
      assert.deepEqual(await p.locator('.timer-container').boundingBox(),ring);
      const svg=await p.locator('#timerSegments').boundingBox();
      assert(svg.x>=before.x-1&&svg.x+svg.width<=before.x+before.width+1,JSON.stringify({width,height,minutes,before,svg}));
      assert(svg.y>=before.y-1&&svg.y+svg.height<=before.y+before.height+1,JSON.stringify({width,height,minutes,before,svg}));
      assert.equal(await p.locator('#timerSegments').getAttribute('data-value'),minutes+':00');
      await capture(p,`${width}x${height}-${minutes}-timer-segments`);
      await button.click();
    }
  }
});

test('portrait stays the default and the clock, text, and ring scale together',async t=>{
  const p=await setup(t);
  let previousRing=0,previousDigit=0,previousFont=0;
  for(const [w,h]of [[1440,900],[1920,1080],[2560,1440]]){
    await resize(p,w,h);checkGeometry(await geometry(p),{allVisible:true});
    const ring=await p.locator('.timer-container').boundingBox(),clock=await p.locator('.clock-display').boundingBox();
    const digit=await p.locator('.digit').first().boundingBox(),font=await p.locator('#time').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
    assert.equal(await p.locator('body').getAttribute('data-layout'),'regular');
    assert(clock.y+clock.height<ring.y,'Clock should stay above the countdown in ordinary desktop windows');
    assert(ring.width>previousRing&&digit.width>previousDigit&&font>previousFont);
    assert(Math.abs(digit.width/ring.width-28/240)<.001,'Clock must scale with the ring');
    assert(Math.abs(font/ring.width-44/240)<.001,'Countdown text must scale with the ring');
    previousRing=ring.width;previousDigit=digit.width;previousFont=font;
    await capture(p,`${w}x${h}-portrait`);
  }
  for(const [w,h]of [[500,500],[960,720],[1280,800],[390,844]]){
    await resize(p,w,h);checkGeometry(await geometry(p),{allVisible:true});
    assert.equal(await p.locator('body').getAttribute('data-layout'),'regular');
    assert((await p.locator('.timer-container').boundingBox()).width<=240);
  }
});

test('landscape is reserved for extra-wide space and keeps the clock in proportion',async t=>{
  const p=await setup(t);
  for(const [w,h,layout]of [[1439,719,'regular'],[1440,720,'landscape'],[1999,1000,'regular'],[2000,1000,'landscape'],[2560,1080,'landscape'],[3440,1440,'landscape'],[500,400,'wide'],[500,479,'wide'],[500,480,'regular'],[500,500,'regular'],[640,480,'wide']]){
    await resize(p,w,h);checkGeometry(await geometry(p),{allVisible:true});
    assert.equal(await p.locator('body').getAttribute('data-layout'),layout,`${w}x${h}`);
    if(layout==='landscape'){
      const ring=await p.locator('.timer-container').boundingBox(),clock=await p.locator('.digital-clock').boundingBox();
      assert(clock.x+clock.width<ring.x);
      assert(clock.width/ring.width>.75&&clock.width/ring.width<.9,'Clock should visually balance the ring');
      await capture(p,`${w}x${h}-landscape`);
    }
  }
});

test('representative sizes retain timer controls and alarm time in both appearances',async t=>{
  const p=await setup(t);await armAlarm(p);
  const sizes=[[240,200],[240,320],[280,600],[320,360],[320,568],[390,844],[420,480],[480,360],[500,500],[568,320],[640,180],[640,360],[640,450],[768,1024],[1024,600],[1440,900],[2560,1080],[3440,1440]];
  for(const theme of ['light','dark']){
    await p.evaluate(dark=>{config.darkMode=dark;applyTheme()},theme==='dark');
    for(const [w,h]of sizes){
      await resize(p,w,h);checkGeometry(await geometry(p),{allVisible:true});
      assert.equal(await p.locator('#alarmSummaryTime').textContent(),'10:30');
      await capture(p,`${w}x${h}-${theme}`);
      await p.locator('#settingsBtn').click();
      const box=await p.locator('#settingsPanel').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=w+1&&box.y+box.height<=h+1,JSON.stringify({w,h,box}));
      assert.equal(await p.locator('#settingsPanel').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
      if(await p.locator('body').getAttribute('data-layout')==='mini'){
        assert.equal(await p.locator('#settingsQuickControls .mode-btn').count(),4);
        await p.locator('#durationInput').scrollIntoViewIfNeeded();
        assert.equal(await p.locator('#durationInput').isVisible(),true);
      }
      await p.locator('#settingsPanel').evaluate(e=>{e.scrollTop=e.scrollHeight});
      const close=await p.locator('#closeSettings').boundingBox();assert(close.y>=0&&close.y+close.height<=h+1);
      await p.locator('#settingsBtn').click();assert.equal(await p.locator('#settingsPanel').evaluate(e=>e.matches(':popover-open')),false);
    }
  }
});

test('continuous resizing across transitions preserves countdown state and input reachability',async t=>{
  const p=await setup(t);await p.locator('#durationInput').fill('25');await p.locator('#durationInput').press('Tab');
  await p.locator('#mainBtn').click();await p.clock.runFor(60250);await p.locator('#mainBtn').click();
  const initial=await p.evaluate(()=>({currentMode,customDuration,sessionDuration,remainingMs,completedSessions}));
  let count=0;
  // Sweep through intermediate widths and the heights around each structural transition.
  for(const h of [240,319,320,479,480,520,521,700])for(let w=240;w<=1040;w+=40){
    await resize(p,w,h);checkGeometry(await geometry(p));count++;
    assert.deepEqual(await p.evaluate(()=>({currentMode,customDuration,sessionDuration,remainingMs,completedSessions})),initial);
  }
  assert.equal(count,168);
  await resize(p,320,300);await p.locator('#settingsBtn').click();await p.locator('#increaseTime').click();
  assert.equal(await p.locator('#time').textContent(),'25:00');
  await p.keyboard.press('Escape');await resize(p,1280,900);
  assert.equal(await p.locator('.container > .mode-picker').count(),1);
  assert.equal(await p.locator('.container > .timer-adjust').count(),1);
});

test('resizing with a focused duration field keeps the edit accessible',async t=>{
  const p=await setup(t);await p.locator('#durationInput').focus();await resize(p,320,300);
  assert.equal(await p.locator('#settingsPanel').evaluate(e=>e.matches(':popover-open')),true);
  assert.equal(await p.locator('#durationInput').evaluate(e=>e===document.activeElement),true);
  await p.locator('#durationInput').fill('27');await p.locator('#durationInput').press('Tab');
  assert.equal(await p.locator('#time').textContent(),'27:00');
  await p.locator('#durationInput').focus();await resize(p,1280,900);
  assert.equal(await p.locator('#durationInput').evaluate(e=>e===document.activeElement),true);
  await p.keyboard.press('Escape');
  await p.locator('.container #durationInput').waitFor({state:'visible'});
  assert.equal(await p.locator('.container #durationInput').count(),1);
});

test('the rendered ring shows the remaining fraction at small and large sizes',async t=>{
  const p=await setup(t);
  for(const [w,h]of [[320,568],[1440,900],[2560,1080]])for(const fraction of [1,.5,0]){
    await resize(p,w,h);
    const samples=await p.evaluate(async fraction=>{
      remainingMs=sessionDuration*1000*fraction;timeRemaining=Math.ceil(remainingMs/1000);updateDisplay();
      // Rasterize the actual circle geometry and styling, including how SVG scales its dashes.
      await document.getAnimations().filter(a=>a.effect?.target===progress).forEach(a=>a.finish());
      const svg=document.querySelector('.timer-svg'),size=Math.ceil(svg.getBoundingClientRect().width);
      const circles=[...svg.querySelectorAll('circle')].map(e=>{
        const copy=e.cloneNode(false),style=getComputedStyle(e);
        for(const name of ['fill','stroke','stroke-width','stroke-linecap','stroke-dasharray','stroke-dashoffset','vector-effect'])copy.style.setProperty(name,style.getPropertyValue(name));
        return copy.outerHTML;
      }).join('');
      const markup=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200"><g transform="rotate(-90 100 100)">${circles}</g></svg>`;
      const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(markup)});
      const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
      const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
      return Array.from({length:8},(_,i)=>{
        const angle=(i+.5)*Math.PI/4-Math.PI/2,radius=size*96/200;
        const [r,g,b,a]=ctx.getImageData(Math.round(size/2+radius*Math.cos(angle)),Math.round(size/2+radius*Math.sin(angle)),1,1).data;
        return a>0&&r>g*2&&r>b*2;
      });
    },fraction);
    assert.deepEqual(samples,Array.from({length:8},(_,i)=>i<8*fraction),`${w}x${h}, ${fraction} remaining`);
  }
});

test('a running countdown keeps its deadline through layout changes and the mini progress bar stays accurate',async t=>{
  const p=await setup(t);await p.locator('#mainBtn').click();
  const deadline=await p.evaluate(()=>timerDeadline);
  await p.clock.fastForward(1200000);
  for(const [w,h]of [[240,200],[240,240],[320,300],[640,180],[480,400],[390,844],[1920,1080],[2560,1080]]){
    await resize(p,w,h);
    checkGeometry(await geometry(p),{allVisible:true});
    assert.equal(await p.evaluate(()=>timerDeadline),deadline);
    assert.equal(await p.evaluate(()=>isRunning),true);
    assert.equal(await p.locator('#mainBtn').getAttribute('aria-label'),'Pause timer');
  }
  await resize(p,320,200);await p.clock.runFor(250);
  const progress=await p.evaluate(()=>({fraction:Number(getComputedStyle(document.documentElement).getPropertyValue('--remaining-fraction')),expected:remainingMs/(sessionDuration*1000)}));
  assert.equal(progress.fraction,progress.expected);
  await p.locator('#mainBtn').click();
  await p.locator('#settingsBtn').click();await p.locator('[data-mode="short"]').click();await p.keyboard.press('Escape');
  const toast=await p.locator('#undoToast').boundingBox(),controls=await p.locator('.controls').boundingBox();
  assert(toast.y>=controls.y+controls.height,'Undo obscures compact timer controls');
  await p.locator('#undoTimer').click();assert.equal(await p.locator('#modeLabel').textContent(),'FOCUS');
});

test('alarm editor header stays accessible through narrow, shallow and keyboard-height views',async t=>{
  const p=await setup(t);await p.locator('#alarmOpen').click();
  await p.locator('#alarmHour [data-value="10"]').click();await p.locator('#alarmMinute [data-value="30"]').click();
  for(const [w,h]of [[390,844],[390,320],[320,240],[240,200],[480,320],[640,180],[844,390],[1280,900]]){
    await resize(p,w,h);
    const box=await p.locator('#alarmEditor').boundingBox();assert(box.x>=-1&&box.y>=-1&&box.x+box.width<=w+1&&box.y+box.height<=h+1,JSON.stringify({w,h,box}));
    assert.equal(await p.locator('#alarmEditor').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
    assert.equal(await p.locator('.alarm-editor-body').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
    await p.locator('.alarm-editor-body').evaluate(e=>{e.scrollTop=e.scrollHeight});
    for(const id of ['alarmSet','alarmEditorClose']){const r=await p.locator('#'+id).boundingBox();assert(r.y>=0&&r.y+r.height<=h,JSON.stringify({id,w,h,r}))}
    assert.equal(await p.locator('#alarmTime').inputValue(),'10:30');
    await capture(p,`${w}x${h}-alarm-scrolled`);
  }
  await p.locator('#alarmSet').click();assert.equal(await p.locator('#alarmSummaryTime').textContent(),'10:30');
});

test('visual viewport changes keep the editor and Settings within the visible area',async t=>{
  const p=await setup(t);await p.locator('#alarmOpen').click();
  await p.evaluate(()=>{
    // Model a software keyboard that changes only the visual viewport, not layout dimensions.
    window.testViewport=new EventTarget();Object.assign(testViewport,{width:390,height:260,offsetTop:120,offsetLeft:0});
    Object.defineProperty(window,'visualViewport',{configurable:true,value:testViewport});syncOverlayViewport();
  });
  let r=await p.locator('#alarmEditor').boundingBox();assert(r.y>=120&&r.y+r.height<=380&&r.x+r.width<=390,JSON.stringify(r));
  await p.locator('#alarmEditorClose').click();await p.locator('#settingsBtn').click();
  r=await p.locator('#settingsPanel').boundingBox();assert(r.y>=120&&r.y+r.height<=380&&r.x+r.width<=390,JSON.stringify(r));
  await p.locator('#closeSettings').click();
});

test('touch targets and 200% zoom-equivalent window sizes keep controls usable',async t=>{
  const p=await setup(t,{hasTouch:true,isMobile:true,deviceScaleFactor:2,viewport:{width:390,height:844}});
  for(const [w,h]of [[390,844],[768,1024],[1920,1080],[2560,1080],[844,390],[640,360],[480,270],[320,240]]){
    await resize(p,w,h);checkGeometry(await geometry(p),{allVisible:true});
    await p.locator('#settingsBtn').click();
    if(await p.locator('body').getAttribute('data-layout')==='mini'){
      await p.locator('#durationInput').scrollIntoViewIfNeeded();await p.locator('#durationInput').fill('15');await p.locator('#durationInput').press('Tab');
    }
    await p.locator('#closeSettings').click();
    const heights=await p.locator('.mode-btn').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width>0).map(e=>e.getBoundingClientRect().height));
    assert(heights.every(h=>h>=44));
  }
});
