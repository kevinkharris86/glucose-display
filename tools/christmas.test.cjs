const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../christmas.js'),'utf8');
function harness(query='',missingDance=false) {
  let now=0, callback, handle=0, calls=[], created=[], translations=[];
  const rectangles={bg:[260,100,410,240],side:[710,170,180,170],age:[715,305,100,28],chartwrap:[35,440,954,160],clock:[880,20,110,40],status:[35,20,160,30],controls:[550,540,440,45]};
  const context={globalAlpha:1,setTransform(){},clearRect(){},save(){},restore(){},translate(...p){translations.push(p);},scale(){},
    drawImage(...args){calls.push(args);},fillRect(...args){calls.push(['erase',...args,this.globalAlpha]);}};
  const canvas={style:{},dataset:{},setAttribute(){},getContext(){return context;}};
  const elements=Object.fromEntries(Object.entries(rectangles).map(([id,[left,top,width,height]])=>[id,{getBoundingClientRect(){return {left,top,width,height};}}]));
  const listeners={};
  const document={currentScript:{src:'https://example.test/christmas.js'},hidden:false,
    createElement(tag){assert.equal(tag,'canvas');created.push(tag);return canvas;},
    getElementById(id){return elements[id];},body:{insertBefore(){}},addEventListener(event,fn){listeners[event]=fn;}};
  class Image {
    constructor(){this.complete=true;this.naturalWidth=1536;this.naturalHeight=1536;}
    set src(value){if(missingDance && value.includes('-dance'))this.naturalWidth=0;}
  }
  class Day extends Date {getHours(){return 12;}getMinutes(){return 0;}}
  const scope={window:{addEventListener(){}},document,Image,Date:Day,URL,URLSearchParams,
    location:{search:query},innerWidth:1024,innerHeight:600,devicePixelRatio:1,
    Math:Object.assign(Object.create(Math),{random:()=>.5}),performance:{now:()=>now},
    requestAnimationFrame(fn){callback=fn;return ++handle;},cancelAnimationFrame(){callback=null;}};
  vm.runInNewContext(source,scope);
  return {api:scope.window.GD_CHRISTMAS,canvas,context,calls,created,document,listeners,rectangles,translations,
    step(t){now=t;const fn=callback;callback=null;if(fn)fn(t);},
    clearCalls(){calls.length=0;},get running(){return !!callback;}};
}
const healthy={v:123,low:70,stale:false,fresh:true};
test('all seventeen vignettes animate, including the sixteen-frame walk',async()=>{
  const names=harness().api.sceneNames;
  assert.equal(names.length,17);
  for(const name of names) {
    const h=harness('?fast&xscene='+name); h.api.reading(healthy); await h.api.setEnabled(true);
    const seen=[new Set(),new Set()];
    for(let t=0;t<37000;t+=40) {
      h.step(t);
      const d=h.canvas.dataset;
      if(d.millieFrame!==undefined)seen[0].add(+d.millieFrame);
      if(d.winstonFrame!==undefined)seen[1].add(+d.winstonFrame);
    }
    assert.ok(seen[0].size>1 || seen[1].size>1,name+' must use different drawings');
    if(name==='crossing-paths') {
      for(let i=0;i<16;i++)assert.ok(seen[0].has(i),'missing walk frame '+i);
      for(let i=0;i<8;i++)assert.ok(seen[1].has(i),'missing hop frame '+i);
    }
    assert.deepEqual(h.created,['canvas']);
    assert.ok(h.calls.some(c=>c[0]==='erase'&&c[1]===33&&c[2]===438),'graph must be erased from overlay');
  }
});
test('a walking dog advances continuously and information dimming cannot erase the animal',async()=>{
  const h=harness('?fast&xscene=crossing-paths'); h.api.reading(healthy); await h.api.setEnabled(true);
  let previous=-Infinity;
  for(let t=0;t<20000;t+=40){
    h.clearCalls();h.step(t);
    if(h.canvas.dataset.millieSheet!=='walk')continue;
    const x=h.translations.at(-2)[0];
    assert.ok(x>=previous,'outbound walk must never step backward');
    previous=x;
    assert.equal(h.calls.filter(c=>typeof c[0]==='object').length,2);
    assert.ok(h.calls.some(c=>c[0]==='erase' && c[1]===713 && c.at(-1)===.55));
    assert.ok(!h.calls.some(c=>c[0]==='erase' && c[1]===698),'no full side rectangle');
  }
  assert.ok(previous>500,'test exercised the outbound walk');
});
test('number pulses and changing digit widths cannot resize any sprite pack',async()=>{
  const h=harness('?fast&xscene=babydoll-dance');h.api.reading(healthy);await h.api.setEnabled(true);
  const widths=[new Set(),new Set()];
  for(let t=100;t<23000;t+=100){
    h.rectangles.bg[0]=t%300?260:140;h.rectangles.bg[2]=t%300?410:650;
    h.clearCalls();h.step(t);
    const draws=h.calls.filter(c=>typeof c[0]==='object');
    for(const c of draws) {const who=c[8]>200?0:1;widths[who].add(c[8]);}
  }
  assert.equal(widths[0].size,1);assert.equal(widths[1].size,1);
});
test('rabbit pushes off in discrete fast hops and rests on the ground between hops',async()=>{
  const h=harness('?fast&xscene=winston-short-hop');h.api.reading(healthy);await h.api.setEnabled(true);
  for(let t=0;t<7200;t+=40)h.step(t);
  const samples=[];
  for(let t=7200;t<=7720;t+=40){h.step(t);samples.push(h.translations.at(-1));}
  assert.equal(samples[0][0],samples[1][0]);
  assert.ok(Math.max(...samples.map(p=>p[1]))-Math.min(...samples.map(p=>p[1]))>20);
  assert.ok(Math.abs(samples.at(-1)[1]-samples[0][1])<.01);
  assert.ok(samples.at(-1)[0]<samples[0][0]);
});
test('both animals dance in sync for exactly ten seconds, with separate rise and settle',async()=>{
  const h=harness('?fast&xscene=babydoll-dance');h.api.reading(healthy);await h.api.setEnabled(true);
  let start=null,firstDance=null,lastDance=null;const frames=new Set();
  for(let t=0;t<21000;t+=100) {
    h.step(t);const d=h.canvas.dataset;
    if(d.scene==='babydoll-dance' && start===null)start=t;
    if(d.scene!=='babydoll-dance')continue;
    assert.equal(d.millieSheet,d.winstonSheet);
    if(d.millieSheet==='dance') {
      assert.equal(d.millieFrame,d.winstonFrame);
      frames.add(+d.millieFrame);
      if(firstDance===null)firstDance=t;lastDance=t;
    }
  }
  assert.equal(firstDance-start,800);
  assert.equal(lastDance-firstDance+100,10000);
  assert.equal(frames.size,16);
});
test('missing dance artwork leaves every original vignette and animal working',async()=>{
  const h=harness('?fast&xscene=babydoll-dance',true);h.api.reading(healthy);await h.api.setEnabled(true);
  for(let t=0;t<160000;t+=100) {
    h.step(t);assert.notEqual(h.canvas.dataset.scene,'babydoll-dance');
    if(t>0) {
      assert.ok(['original','walk'].includes(h.canvas.dataset.millieSheet));
      assert.notEqual(h.canvas.dataset.winstonSheet,'dance');
      assert.notEqual(h.canvas.dataset.winstonSheet,'rise');
    }
  }
  assert.equal(h.canvas.style.display,'block');
});
test('low, stale, missing and night suppress scenes; turning off stops drawing',async()=>{
  for(const reading of [null,{...healthy,v:60},{...healthy,stale:true}]) {
    const h=harness('?fast'); h.api.reading(reading); await h.api.setEnabled(true);
    for(let t=0;t<160000;t+=1000)h.step(t);
    assert.equal(h.canvas.dataset.scene,undefined);
    assert.equal(h.canvas.dataset.millieFrame,'14');
    await h.api.setEnabled(false); assert.equal(h.running,false); assert.equal(h.canvas.style.display,'none');
  }
  const h=harness('?night&fast');h.api.reading(healthy);await h.api.setEnabled(true);
  for(let t=0;t<160000;t+=1000)h.step(t);
  assert.equal(h.canvas.dataset.millieFrame,'15');assert.equal(h.canvas.dataset.winstonFrame,'15');
  assert.equal(h.canvas.dataset.scene,undefined);
});
test('normal scenes are spaced about a minute apart and do not repeat recent picks',async()=>{
  const h=harness();h.api.reading(healthy);await h.api.setEnabled(true);
  const starts=[];let previous;
  for(let t=0;t<720000;t+=100) {
    h.step(t);const name=h.canvas.dataset.scene;
    if(name&&name!=='rest'&&name!==previous) {starts.push({t,name});previous=name;}
  }
  assert.ok(starts.length>=8);
  assert.ok(starts.slice(2,5).some(s=>s.name==='babydoll-dance'),'surprise dance appears early in rotation');
  for(let i=1;i<starts.length;i++) {
    assert.ok(starts[i].t-starts[i-1].t>=55000);
    assert.ok(starts[i].t-starts[i-1].t<=85000);
    assert.ok(!starts.slice(Math.max(0,i-6),i).some(s=>s.name===starts[i].name));
  }
});
test('hide/show and rapid toggles do not leave background loops running',async()=>{
  const h=harness('?fast');h.api.reading(healthy);
  const first=h.api.setEnabled(true);await h.api.setEnabled(false);await first;assert.equal(h.running,false);
  await h.api.setEnabled(true);h.document.hidden=true;h.listeners.visibilitychange();assert.equal(h.running,false);
  h.document.hidden=false;h.listeners.visibilitychange();assert.equal(h.running,true);
  await h.api.setEnabled(false);assert.equal(h.running,false);
});
