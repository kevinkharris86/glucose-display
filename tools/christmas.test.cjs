const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../christmas.js'),'utf8');
function harness(query='',missingDance=false) {
  let now=0, callback, handle=0, calls=[], created=[];
  const rectangles={bg:[260,100,410,240],side:[710,170,180,170],chartwrap:[35,440,954,160],clock:[880,20,110,40],status:[35,20,160,30],controls:[550,540,440,45]};
  const context={setTransform(){},clearRect(){},save(){},restore(){},translate(){},scale(){},
    drawImage(...args){calls.push(args);},fillRect(...args){calls.push(['erase',...args]);}};
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
  return {api:scope.window.GD_CHRISTMAS,canvas,context,calls,created,document,listeners,
    step(t){now=t;const fn=callback;callback=null;if(fn)fn(t);},
    clearCalls(){calls.length=0;},get running(){return !!callback;}};
}
const healthy={v:123,low:70,stale:false,fresh:true};
test('all thirteen vignettes animate, preserving the original eight-frame gaits',async()=>{
  const names=harness().api.sceneNames;
  assert.equal(names.length,13);
  for(const name of names) {
    const h=harness('?fast&xscene='+name); h.api.reading(healthy); await h.api.setEnabled(true);
    const seen=[new Set(),new Set()];
    for(let t=0;t<37000;t+=90) {
      h.step(t);
      const d=h.canvas.dataset;
      if(d.millieFrame!==undefined)seen[0].add(+d.millieFrame);
      if(d.winstonFrame!==undefined)seen[1].add(+d.winstonFrame);
    }
    assert.ok(seen[0].size>1 || seen[1].size>1,name+' must use different drawings');
    if(name==='crossing-paths') for(const frames of seen) for(let i=0;i<8;i++)assert.ok(frames.has(i),'missing gait frame '+i);
    assert.deepEqual(h.created,['canvas']);
    assert.ok(h.calls.some(c=>c[0]==='erase'&&c[1]===33&&c[2]===438),'graph must be erased from overlay');
  }
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
      if(+d.millieFrame>=4) {if(firstDance===null)firstDance=t;lastDance=t;}
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
      assert.equal(h.canvas.dataset.millieSheet,'original');
      assert.equal(h.canvas.dataset.winstonSheet,'original');
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
