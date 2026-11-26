const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../christmas.js'),'utf8');
function harness(query='',missingDance=false,hour=12) {
  let now=0, callback, handle=0, calls=[], created=[], translations=[], scales=[];
  const alphaStack=[];
  const rectangles={bg:[260,100,410,240],side:[710,170,180,170],age:[715,305,100,28],chartwrap:[35,440,954,160],clock:[880,20,110,40],status:[35,20,160,30],controls:[550,540,440,45]};
  const context={globalAlpha:1,setTransform(){},clearRect(){},rotate(){},
    save(){alphaStack.push(this.globalAlpha);},restore(){this.globalAlpha=alphaStack.pop();},
    beginPath(){},arc(...args){calls.push(['prop',...args]);},fill(){},
    translate(...p){translations.push(p);},scale(...p){scales.push(p);},
    drawImage(...args){calls.push([...args,this.globalAlpha]);},fillRect(...args){calls.push(['erase',...args,this.globalAlpha]);}};
  const canvas={style:{},dataset:{},setAttribute(){},getContext(){return context;}};
  const elements=Object.fromEntries(Object.entries(rectangles).map(([id,[left,top,width,height]])=>[id,{getBoundingClientRect(){return {left,top,width,height};}}]));
  const listeners={};
  const document={currentScript:{src:'https://example.test/christmas.js'},hidden:false,
    createElement(tag){assert.equal(tag,'canvas');created.push(tag);return canvas;},
    getElementById(id){return elements[id];},body:{insertBefore(){}},addEventListener(event,fn){listeners[event]=fn;}};
  class Image {
    constructor(){this.complete=true;this.naturalWidth=1536;this.naturalHeight=1536;}
    set src(value){this.url=value;if(missingDance && value.includes('-dance'))this.naturalWidth=0;}
  }
  class Clock extends Date {getHours(){return hour;}getMinutes(){return 0;}}
  const scope={window:{addEventListener(){}},document,Image,Date:Clock,URL,URLSearchParams,
    location:{search:query},innerWidth:1024,innerHeight:600,devicePixelRatio:1,
    Math:Object.assign(Object.create(Math),{random:()=>.5}),performance:{now:()=>now},
    requestAnimationFrame(fn){callback=fn;return ++handle;},cancelAnimationFrame(){callback=null;}};
  vm.runInNewContext(source,scope);
  return {api:scope.window.GD_CHRISTMAS,canvas,context,calls,created,document,listeners,rectangles,translations,scales,
    step(t){now=t;const fn=callback;callback=null;if(fn)fn(t);},
    clearCalls(){calls.length=0;},get running(){return !!callback;}};
}
const healthy={v:123,low:70,stale:false,fresh:true};
test('each authored scene animates, including the sixteen-frame walk',async()=>{
  const names=harness().api.sceneNames;
  assert.equal(names.length,8);
  for(const name of names) {
    const h=harness('?fast&xscene='+name); h.api.reading(healthy); await h.api.setEnabled(true);
    const seen=[new Set(),new Set()];
    for(let t=0;t<37000;t+=40) {
      h.step(t);
      const d=h.canvas.dataset;
      if(d.millieFrame!==undefined)seen[0].add(+d.millieFrame);
      if(d.winstonFrame!==undefined)seen[1].add(+d.winstonFrame);
    }
    assert.ok(seen.every(frames=>frames.size>=4),name+' gives both animals distinct actions');
    if(name==='crossing-paths') {
      for(let i=0;i<16;i++)assert.ok(seen[0].has(i),'missing walk frame '+i);
      for(let i=0;i<8;i++)assert.ok(seen[1].has(i),'missing hop frame '+i);
    }
    assert.deepEqual(h.created,['canvas']);
    assert.ok(h.calls.some(c=>c[0]==='erase'&&c[1]===33&&c[2]===438),'graph must be erased from overlay');
    if(name.startsWith('snow'))assert.ok(h.calls.some(c=>c[0]==='prop'),'snow interaction needs a prop');
  }
});
test('a walking dog advances continuously and masks stay outside the reading details',async()=>{
  const h=harness('?fast&xscene=crossing-paths'); h.api.reading(healthy); await h.api.setEnabled(true);
  let previous=-Infinity;
  for(let t=0;t<7500;t+=40){
    h.clearCalls();h.step(t);
    if(h.canvas.dataset.millieSheet!=='walk')continue;
    const x=h.translations.at(-2)[0];
    assert.ok(x>=previous,'outbound walk must never step backward');
    previous=x;
    assert.equal(h.calls.filter(c=>typeof c[0]==='object').length,2);
    const erasures=h.calls.filter(c=>c[0]==='erase');
    assert.ok(erasures.some(c=>c[1]===33 && c[2]===438),'chart is protected');
    assert.ok(erasures.every(c=>c[2]>=438 || c[2]<20),'reading details do not erase sprites');
  }
  assert.ok(previous>390,'test exercised the outbound walk');
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
  const h=harness('?fast&xscene=rabbit-lookout');h.api.reading(healthy);await h.api.setEnabled(true);
  let start=0;
  while(h.canvas.dataset.scene!=='rabbit-lookout' && start<15000){start+=40;h.step(start);}
  assert.equal(h.canvas.dataset.scene,'rabbit-lookout');
  const samples=[];
  samples.push(h.translations.at(-1));
  for(let t=start+40;t<=start+520;t+=40){h.step(t);samples.push(h.translations.at(-1));}
  assert.equal(samples[0][0],samples[1][0]);
  assert.ok(Math.max(...samples.map(p=>p[1]))-Math.min(...samples.map(p=>p[1]))>20);
  assert.ok(Math.abs(samples.at(-1)[1]-samples[0][1])<.01);
  assert.ok(samples.at(-1)[0]<samples[0][0]);
});
test('dance preview starts promptly and the animals travel, hop, and dance on different cues',async()=>{
  const h=harness('?demo&fast&xscene=babydoll-dance');h.api.reading(healthy);await h.api.setEnabled(true);
  const first=[null,null],last=[0,0],frames=[new Set(),new Set()],x=[new Set(),new Set()];
  let different=0, duet=0;
  for(let t=0;t<15000;t+=40) {
    h.step(t);const d=h.canvas.dataset;
    if(d.scene!=='babydoll-dance')continue;
    if(d.millieSheet==='dance' && d.winstonSheet==='dance'){
      duet++;
      if(d.millieFrame!==d.winstonFrame)different++;
    }
    for(const [i,name] of ['millie','winston'].entries()){
      if(d[name+'Sheet']!=='dance')continue;
      first[i]??=t;
      last[i]=t;
      frames[i].add(+d[name+'Frame']);
      x[i].add(Math.round(h.translations.at(i-2)[0]));
    }
  }
  assert.ok(first[0]<=1200,'proof link gets to Millie’s first dance step promptly');
  assert.ok(first[1]-first[0]>1500,'Winston has a later entrance');
  assert.equal(last[0]-first[0]+40,10000);
  assert.ok(last[1]>last[0],'Winston finishes separately');
  assert.ok(frames.every(set=>set.size>=14));
  assert.ok(x.every(set=>set.size>=20),'both dancers travel beyond their idle marks');
  assert.ok(duet>100 && different/duet>.85,'overlapping dance beats rarely share a frame index');
});
test('missing dance artwork leaves every original vignette and animal working',async()=>{
  const h=harness('?fast&xscene=babydoll-dance',true);h.api.reading(healthy);await h.api.setEnabled(true);
  for(let t=0;t<160000;t+=100) {
    h.step(t);assert.notEqual(h.canvas.dataset.scene,'babydoll-dance');
    if(t>0) {
      assert.ok(['original','walk','acting'].includes(h.canvas.dataset.millieSheet));
      assert.notEqual(h.canvas.dataset.winstonSheet,'dance');
      assert.notEqual(h.canvas.dataset.winstonSheet,'rise');
    }
  }
  assert.equal(h.canvas.style.display,'block');
});
test('low, stale, missing and the sleep demo suppress scenes; turning off stops drawing',async()=>{
  for(const reading of [null,{...healthy,v:60},{...healthy,stale:true}]) {
    const h=harness('?fast'); h.api.reading(reading); await h.api.setEnabled(true);
    for(let t=0;t<160000;t+=1000)h.step(t);
    assert.equal(h.canvas.dataset.scene,undefined);
    assert.equal(h.canvas.dataset.millieFrame,'14');
    await h.api.setEnabled(false); assert.equal(h.running,false); assert.equal(h.canvas.style.display,'none');
  }
  const h=harness('?demo&night&fast');h.api.reading(healthy);await h.api.setEnabled(true);
  for(let t=0;t<160000;t+=1000)h.step(t);
  assert.equal(h.canvas.dataset.millieFrame,'15');assert.equal(h.canvas.dataset.winstonFrame,'15');
  assert.equal(h.canvas.dataset.scene,undefined);
});
test('the regular display starts a full scene after bedtime and before dawn',async()=>{
  for(const [query,hour] of [['',21],['',2],['?night',23]]){
    const h=harness(query,false,hour);
    h.api.reading(healthy);await h.api.setEnabled(true);
    h.step(300);
    assert.equal(h.canvas.dataset.millieFrame,'14');
    assert.equal(h.canvas.dataset.winstonFrame,'8');
    for(let t=400;t<=15000;t+=100)h.step(t);
    assert.ok(h.api.sceneNames.includes(h.canvas.dataset.scene));
  }
});
test('both Christmas animals draw fully opaque in every reading state and at night',async()=>{
  for(const [query,reading] of [
    ['',healthy],['',{...healthy,v:65}],['',{...healthy,stale:true}],['',null],['?demo&night',healthy]
  ]){
    const h=harness(query);
    h.api.reading(reading);
    await h.api.setEnabled(true);
    h.step(100);
    const spriteDraws=h.calls.filter(c=>typeof c[0]==='object');
    assert.deepEqual(spriteDraws.map(call=>call.at(-1)),[1,1]);
  }
});
test('both animals breathe gently at rest even when full scenes are paused',async()=>{
  for(const [query,reading] of [['',null],['',{...healthy,v:65}],['?demo&night',healthy]]){
    const h=harness(query);
    h.api.reading(reading);await h.api.setEnabled(true);
    const stretch=[new Set(),new Set()];
    for(let t=100;t<=6000;t+=100){
      h.step(t);
      const [millie,winston]=h.scales.slice(-2);
      stretch[0].add(millie[1]);stretch[1].add(winston[1]);
    }
    for(const samples of stretch){
      assert.ok(samples.size>2);
      assert.ok([...samples].every(n=>n>=1 && n<=1.018));
    }
    assert.equal(h.canvas.dataset.scene,undefined);
    assert.equal(new Set(h.translations.map(p=>p[1])).size,1,'breathing does not move the feet');
  }
});
test('normal scenes are spaced about a minute apart and do not repeat recent picks',async()=>{
  const h=harness();h.api.reading(healthy);await h.api.setEnabled(true);
  const starts=[];let previous;
  for(let t=0;t<720000;t+=100) {
    h.step(t);const name=h.canvas.dataset.scene;
    if(name&&name!=='rest'&&name!==previous) {starts.push({t,name});previous=name;}
  }
  assert.ok(starts.length>=8);
  assert.ok(starts[0].t>=8000 && starts[0].t<=15000,'first daytime scene starts promptly');
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
test('all eight Thanksgiving scenes share the Christmas timing and use opaque illustrated sprites',async()=>{
  const h=harness('',false,23);
  h.api.reading(healthy);
  await h.api.setEnabled(true,'thanksgiving');
  const starts=[], frames=new Map();
  let previous;
  for(let t=0;t<750000;t+=40){
    h.clearCalls();
    h.step(t);
    const {scene,millieFrame,winstonFrame}=h.canvas.dataset;
    const sprites=h.calls.filter(c=>c.length===10 && c[0]?.url);
    assert.ok(sprites.every(c=>c[0].url.includes('/thanksgiving/') && c.at(-1)===1));
    if(!scene || scene==='rest')continue;
    if(scene!==previous){starts.push({t,scene});previous=scene;}
    if(!frames.has(scene))frames.set(scene,[new Set(),new Set()]);
    frames.get(scene)[0].add(millieFrame);
    frames.get(scene)[1].add(winstonFrame);
  }
  assert.equal(h.api.thanksgivingSceneNames.length,8);
  assert.equal(frames.size,8);
  assert.ok(starts[0].t>=8000 && starts[0].t<=15000);
  for(let i=1;i<starts.length;i++)assert.ok(starts[i].t-starts[i-1].t>=55000 && starts[i].t-starts[i-1].t<=85000);
  for(const [name,poses] of frames)assert.ok(poses.every(p=>p.size>=4),name);
  await h.api.setEnabled(true,'christmas');
  h.clearCalls();
  h.step(751000);
  assert.ok(h.calls.some(c=>c[0]?.url?.includes('/christmas/')));
  assert.ok(!h.calls.some(c=>c[0]?.url?.includes('/thanksgiving/')));
});
test('Winston lands on the pumpkin before returning to the ground and settles next to Millie in the cuddle',async()=>{
  for(const name of ['pumpkin-perch','harvest-cuddle']){
    const h=harness('?demo&fast&xscene='+name);
    h.api.reading(healthy);
    await h.api.setEnabled(true,'thanksgiving');
    h.step(40);
    const ground=h.translations.at(-1)[1];
    let perched=0, cuddled=0, backOnGround=false;
    for(let t=80;t<=14000;t+=40){
      h.clearCalls();
      h.step(t);
      const [millie,winston]=h.translations.slice(-2);
      const {millieFrame,winstonFrame}=h.canvas.dataset;
      if(name==='pumpkin-perch'){
        const pumpkin=h.calls.find(c=>c[0]?.url?.includes('/pumpkin.png'));
        if(Math.abs(winston[0]-1024*.82)<20 && winston[1]<ground-40 && pumpkin){
          assert.equal(pumpkin.at(-1),1);
          assert.ok(h.calls.indexOf(pumpkin)<h.calls.findIndex(c=>c[0]?.url?.includes('/winston.png')));
          perched++;
        }
        if(perched && Math.abs(winston[1]-ground)<.01)backOnGround=true;
      }else if(Math.abs(millie[0]-winston[0])<115 && millieFrame==='15' && ['14','15'].includes(winstonFrame)){
        cuddled++;
      }
    }
    if(name==='pumpkin-perch')assert.ok(perched>75 && backOnGround);
    else assert.ok(cuddled>50);
  }
});
test('the pumpkin rolls in once, stays through both scenes, and rolls off fully opaque',async()=>{
  const h=harness('?demo&fast&xscene=pumpkin-perch');
  h.api.reading(healthy);
  await h.api.setEnabled(true,'thanksgiving');
  const starts=[], travel=[];
  let previous;
  for(let t=40;t<60000;t+=40){
    h.clearCalls();
    h.step(t);
    const {scene}=h.canvas.dataset;
    const prop=h.calls.find(c=>c[0]?.url?.includes('/pumpkin.png'));
    if(scene!==previous){starts.push(scene);previous=scene;}
    if(travel.length && !prop)break;
    if(!prop)continue;
    assert.equal(prop.at(-1),1);
    const first=h.calls.find(c=>c[0]?.url);
    const x=h.translations.at(first===prop?-3:-1)[0];
    travel.push({t,x});
  }
  assert.deepEqual(starts.slice(0,4),['pumpkin-perch','rest','pumpkin-hide-and-seek','rest']);
  assert.ok(travel[0].x>1024 && travel.at(-1).x>1024);
  assert.ok(travel.some(p=>Math.abs(p.x-1024*.82)<.01));
  assert.ok(travel.every((p,i)=>!i || p.t-travel[i-1].t===40),'the pumpkin remains between scenes');
});
test('the roast drops, travels in a full stride cycle, and is eaten slowly at the edge',async()=>{
  const h=harness('?demo&fast&xscene=turkey-dinner');
  h.api.reading(healthy);
  await h.api.setEnabled(true,'thanksgiving');
  const drop=[], carry=[], eaten=[];
  let attached=false;
  for(let t=40;t<35000;t+=40){
    h.clearCalls();
    h.step(t);
    if(attached && h.canvas.dataset.scene==='rest')break;
    const prop=h.calls.find(c=>c[0]?.url?.includes('/roast-turkey.png'));
    const dog=h.calls.find(c=>c[0]?.url?.includes('/millie-turkey.png'));
    const walking=h.calls.find(c=>c[0]?.url?.includes('/millie-turkey-walk.png'));
    if(prop){assert.equal(attached,false);drop.push(h.translations.at(-3));}
    if(!dog && !walking)continue;
    attached=true;
    const frame=+h.canvas.dataset.millieFrame, x=h.translations.at(-2)[0];
    if(walking)carry.push({frame,x});
    else if(frame>=9)eaten.push({frame,x,t});
  }
  assert.ok(drop[0][1]<0);
  assert.ok(drop.some(p=>p[0]===512 && p[1]>300));
  assert.equal(new Set(carry.map(p=>p.frame)).size,16);
  assert.ok(carry.every((p,i)=>!i || p.x<=carry[i-1].x) && carry[0].x-carry.at(-1).x>300);
  assert.ok(eaten.every(p=>p.x<200));
  assert.ok(eaten.every((p,i)=>!i || p.frame>=eaten[i-1].frame),'portions get smaller without regrowing');
  assert.ok(eaten.at(-1).t-eaten[0].t>12000);
  assert.deepEqual([...new Set(eaten.map(p=>p.frame))],[9,10,11,12,13,14,15]);
});
