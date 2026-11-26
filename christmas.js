/* Millie & Winston: illustrated holiday frame animation.
   Decorative overlay; never changes the measurement layout or reads credentials. */
window.GD_CHRISTMAS = (() => {
  'use strict';
  const scriptBase = new URL('.', document.currentScript.src);
  const Q = new URLSearchParams(location.search);
  const fast = Q.has('fast') ? .12 : 1;
  const demoScene = Q.has('demo') && Q.has('xscene');
  const sleeping = Q.has('demo') && Q.has('night');
  const WALK = [0,1,2,3,4,5,6,7];
  const WALK_FINE = Array.from({length:16},(_,i)=>i);
  const DANCE = 'babydoll-dance';
  const images = (names,folder='christmas') => names.map(name => {
    const image = new Image();
    const revision=folder==='thanksgiving'?'20261126':'20261122';
    image.src = new URL(`assets/${folder}/${name}.png?v=${revision}`, scriptBase).href;
    return image;
  });
  const assets = images(['millie','winston']);
  const danceAssets = images(['millie-dance-v2','winston-dance-v2']);
  const riseAssets = images(['millie-dance','winston-dance']);
  const duetAssets = images(['millie-dance-v3','winston-dance-v3']);
  const actingAssets = images(['millie-acting']);
  const rabbitBehaviors = images(['winston-behaviors']);
  const extras = images(['millie-walk-v3','winston-play']);
  const waitForImages = list => Promise.all(list.map(image => new Promise(resolve => {
    if (image.complete) return resolve(image.naturalWidth > 0);
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  })));
  const loaded = waitForImages(assets);
  let activeTheme='christmas', thanksgivingArt;
  const harvest = () => activeTheme==='thanksgiving';
  function loadThanksgiving() {
    if (!thanksgivingArt) {
      const [dog,rabbit,pumpkin,leaf]=images(['millie','winston','pumpkin','leaf'],'thanksgiving');
      thanksgivingArt={sheets:[dog,rabbit],pumpkin,leaf,pumpkinReady:false,leafReady:false,propsPending:true};
      waitForImages([pumpkin,leaf]).then(([p,l])=>{
        thanksgivingArt.pumpkinReady=p;
        thanksgivingArt.leafReady=l;
        thanksgivingArt.propsPending=false;
      });
      thanksgivingArt.loaded=waitForImages(thanksgivingArt.sheets);
    }
    return thanksgivingArt.loaded;
  }
  let danceReady = false, duetReady = false, dancePending = true, actingReady = false;
  Promise.all([waitForImages(riseAssets),waitForImages(duetAssets),waitForImages(danceAssets)])
    .then(([rise,duet,fallback])=>{
      duetReady=duet.every(Boolean);
      danceReady=rise.every(Boolean) && (duetReady || fallback.every(Boolean));
      dancePending=false;
    });
  waitForImages(actingAssets).then(([acting]) => { actingReady = acting; });
  let behaviorReady=false;
  waitForImages(rabbitBehaviors).then(results=>{behaviorReady=results.every(Boolean);});
  let walkReady=false, playReady=false;
  waitForImages(extras).then(([walk,play])=>{walkReady=walk;playReady=play;});
  let canvas, ctx, enabled = false, ready = false, raf = 0, lastDraw = 0;
  let width = 0, height = 0, floor = 0, sizes = [], protectedRects = [];
  let homePositions = [.105,.90];
  let state = 'none', scene = null, nextScene = 0;
  let recent = [], readingUntil = 0, lastMode = '', generation = 0;
  let scenesUntilDance = 2 + Math.floor(Math.random()*3);
  const rnd = (a,b) => a + Math.random() * (b-a);
  const firstSceneDelay = () => demoScene ? 400 : rnd(8000,15000)*fast;
  const homes = () => homePositions;
  const box = (id,pad = 0) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {x:r.left-pad,y:r.top-pad,w:r.width+pad*2,h:r.height+pad*2};
  };
  function layout() {
    if (!canvas) return;
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1,2);
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    layoutBounds();
  }
  function init() {
    if (canvas) return;
    canvas = document.createElement('canvas'); canvas.id = 'christmas-animals';
    canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:none';
    document.body.insertBefore(canvas,document.getElementById('controls'));
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', () => { scene = null; layout(); });
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf); raf = 0;
      if (!document.hidden && enabled && ready) {
        scene = null; nextScene = performance.now()+firstSceneDelay();
        layout(); loop(performance.now());
      }
    });
    layout();
  }
  // Segments carry their own frame sequences, rather than translating still photos.
  function track(who) {
    let x = homes()[who], t = 0, dir = who?-1:1, elevation = 0;
    const segments = [];
    const api = {
      segments,
      hold(frames,ms,fps = 6,sheet = 0) {
        segments.push({t,d:ms,x0:x,x1:x,dir,frames:Array.isArray(frames)?frames:[frames],fps,sheet,elevation});
        t += ms; return api;
      },
      dance(frames,ms,to,lift=0) {
        const edge=sizes[who]*.45/width;
        to=Math.max(edge,Math.min(1-edge,to));
        segments.push({t,d:ms,x0:x,x1:to,dir,frames,fps:frames.length*1000/ms,sheet:duetReady?6:1,lift});
        t+=ms; x=to; return api;
      },
      act(frames,ms,fallback) {
        return api.hold(actingReady?frames:fallback,ms,frames.length*1000/ms,actingReady?7:0);
      },
      face(d) { dir = d; return api; },
      leap(to,height,ms) {
        dir=to>x?1:-1;
        segments.push({t,d:ms,x0:x,x1:to,dir,frames:WALK,fps:WALK.length*1000/ms,
          elevation,landing:height});
        t+=ms; x=to; elevation=height;
        return api;
      },
      go(to,pace=1) {
        const edge=sizes[who]*.45/width;
        to=Math.max(edge,Math.min(1-edge,to));
        if (Math.abs(to-x)*width<1) return api;
        const hops=Math.max(1,Math.ceil(Math.abs(to-x)*width/(sizes[who]*.75)));
        const duration = who?hops*520:Math.max(350,Math.abs(to-x)*34000/pace);
        const nextDirection = to>x ? 1 : -1;
        if (!who && dir!==nextDirection) {
          api.hold(harvest()?14:12,180);
        }
        dir = to>x ? 1 : -1;
        const fineWalk = !who && !harvest() && walkReady;
        segments.push({t,d:duration,x0:x,x1:to,dir,frames:fineWalk?WALK_FINE:WALK,
          fps:who?1000/65:(fineWalk?20:10)*pace,hop:!!who,hops,sheet:fineWalk?4:0});
        t += duration; x = to; return api;
      },
      home() { api.go(homes()[who]); dir = who?-1:1; return api; },
      get duration() { return t; }
    };
    return api;
  }
  // Each scene gives the animals separate cues and a distinct interaction.
  const SCENES = [
    ['snowball-takeover',(m,w) => {
      m.go(.23,1.35).face(1).act([0,1,1,2],850,[8,10,10,8]);
      const push = m.duration;
      m.act([3,2,0],650,[10,8,8]).act([8,12,0],1850,[11,12,8]).home();
      w.hold(8,push+900).go(.93).face(-1).hold([13,10,8],1000,3).home();
      return {kind:'ball',start:push-500,roll:push,duration:3100};
    }],
    ['snowflake-sneeze',(m,w) => {
      m.act([0,8,8,9,9],2150,[8,11,11,11,11])
        .act([10,10,11,12,0],1250,[10,9,8,12,8]);
      w.hold(8,2150).go(.83).face(1).hold([13,12,8],1100,3).home();
      return {kind:'flake',start:0,duration:2600};
    }],
    ['crossing-paths',(m,w) => {
      m.go(.43,1.45).act([0,12,14],1500,[8,12,11]).home();
      w.hold(8,1400).go(.53).face(-1).hold([13,10,8],1600,2).home();
    }],
    ['rabbit-lookout',(m,w)=>{
      w.go(.84).face(-1).hold([0,1,2,3],800,5,2).hold([4,4,5,6,6,7,5],2800,2.5,2)
        .hold([3,2,1,0],700,1000/175,2).home();
      m.hold(14,1250).go(.23).face(1).act([8,9,12,0],1800,[11,11,12,8]).home();
    }],
    ['rabbit-face-wash',(m,w)=>{
      w.hold(8,450).face(-1).hold([15,8,9,10,11,9,10,12,13,14,15],2750,4,2)
        .hold(8,1050).go(.84).home();
      m.hold(14,1900).act([0,12,12,13,14,0],2100,[8,12,12,11,12,8]).home();
    }],
    ['playful-follow',(m,w)=>{
      w.go(.55).face(1).hold([0,1,2,3,4,5,7,3,2,1,0],2200,5,2)
        .go(.76).face(-1).hold(13,650).home();
      m.hold(14,1150).go(.38,1.5).face(1).act([4,5,6,7],1100,[10,10,11,8])
        .go(.45,1.5).home();
    }],
    ['binky-and-bow',(m,w) => {
      w.go(.84).hold(WALK,520,1000/65,5).hold(8,1050,6,5)
        .hold([9,10,11,12,13,14,15],1750,4,5).home();
      m.hold(14,1300).face(1).act([0,4,5,5,6,7,0],2100,[8,10,10,10,11,8,8]).home();
    }],
    [DANCE,(m,w) => {
      const [left,right]=homes();
      // Millie starts the two-step. Winston watches, then makes his own entrance.
      m.face(1).hold([0,1,2,3],700,1000/175,3)
        .dance([0,1,2,2,3,0],1600,left+.05)
        .dance([3,4,5,5,6,7],1600,left)
        .dance([8,8,9,10,10,11],1700,left+.03,.07)
        .dance([12,13,14,14,15],1450,left+.045,.08)
        .dance([4,5,6,7,10,11],1750,left)
        .dance([0,1,2,3,13,14,15],1900,left,.06)
        .hold([3,2,1,0],800,5,3);
      w.face(-1).hold([8,12,13,8],1700,1000/425).hold([0,1,2,3],950,1000/237.5,3)
        .dance([0,1,2,3,4,5,6],1750,right-.06,.13)
        .dance([6,7,8,9,10,11],1600,right-.025)
        .dance([4,5,6,7,12,13,14],1750,right,.14)
        .dance([12,13,14,5,6,15],1550,right-.035,.12)
        .dance([10,11,12,9,12,15,15],2050,right)
        .hold([3,2,1,0],1150,1000/287.5,3);
    }]
  ];
  const THANKSGIVING_SCENES = [
    ['pumpkin-perch',(m,w)=>{
      const perch=.80;
      w.go(.885).face(-1).hold([8,10,10,11],920,4)
        .leap(perch,.62,760).face(-1).hold([8,11,12,11,8,9,8],3650,2)
        .leap(.89,0,780).home();
      m.hold(8,1400).go(.24,1.4).face(1).hold([14,11,11,12,14],2340,2).home();
      return {kind:'pumpkin',x:perch,duration:w.duration};
    },'pumpkin'],
    ['harvest-cuddle',(m,w)=>{
      const besideMillie=homes()[0]+sizes[0]*.29/width;
      w.hold(8,400).go(besideMillie).face(-1).hold([10,10,8],800,4);
      const cuddle=w.duration;
      w.hold([14,14,15,15,15,14,8],3950,1.8).home();
      m.hold(8,700).hold([10,11,8],cuddle-340,1.2)
        .hold(15,2950).hold([9,8],700,2.8);
    }],
    ['leaf-chase',(m,w)=>{
      m.hold(8,450).go(.34,1.4).face(1).hold([10,13,12,11,14],1500,3).home();
      w.hold(8,1800).go(.59).hold([10,11,12,11,8],1150,4).go(.68).face(-1).hold(8,650).home();
      return {kind:'leaf',start:200,duration:4200,x0:.23,x1:.66};
    }],
    ['pilgrim-greeting',(m,w)=>{
      m.go(.28,1.25).face(1).hold([14,12,12,13,14],1700,3).home();
      w.hold(8,1700).go(.63).face(-1).hold([11,12,12,8],1400,3).home();
    }],
    ['pumpkin-hide-and-seek',(m,w)=>{
      const pumpkin=.81;
      w.go(.77).face(1).hold(10,410).go(pumpkin);
      const hiding=w.duration;
      w.hold([14,14,14,11,12,12,8],2600,2.7);
      const revealed=w.duration;
      w.go(.69).face(1).hold([8,11,8],1000,3).home();
      m.hold(8,680).go(.30,1.4).face(1).hold([14,10,11,14],1700,2.5).home();
      return {kind:'pumpkin',x:pumpkin,duration:w.duration,foreground:[hiding,revealed]};
    },'pumpkin'],
    ['windblown-hat',(m,w)=>{
      m.hold([8,11,11],1000,3).hold([11,12,10,14],1100,4).hold(8,1100);
      w.hold(8,960).go(.83).face(-1).hold([11,13,13,13,8],1550,3).home();
      return {kind:'leaf',start:0,duration:2000,x0:.125,x1:.35};
    }],
    ['orchard-parade',(m,w)=>{
      w.go(.67).face(-1).hold([8,11,12,8],1050,4).go(.53).face(1).hold(11,500).home();
      m.hold(8,800).go(.38,1.35).face(1).hold([13,13,12,14],1250,3).home();
    }]
  ];
  function startScene(now) {
    const forced = Q.get('xscene');
    const available = harvest()
      ? THANKSGIVING_SCENES.filter(([, ,prop])=>prop!=='pumpkin' || thanksgivingArt.pumpkinReady)
      : SCENES.filter(s => (s[0] !== DANCE || danceReady) &&
      (s[0] !== 'binky-and-bow' || playReady) &&
      (!['rabbit-lookout','rabbit-face-wash','playful-follow'].includes(s[0]) || behaviorReady));
    if (demoScene && !harvest() && forced===DANCE && dancePending) return;
    if (demoScene && harvest() && thanksgivingArt.propsPending &&
        THANKSGIVING_SCENES.some(([name,,prop])=>name===forced && prop==='pumpkin')) return;
    const regular = available.filter(s=>s[0]!==DANCE);
    const choices = regular.filter(s=>!recent.includes(s[0]));
    const pool = choices.length ? choices : regular.filter(s=>s[0]!==recent[recent.length-1]);
    const selected = available.find(s => s[0] === forced) ||
      (!harvest() && danceReady && scenesUntilDance<=0 && !recent.includes(DANCE)
        ? available.find(s=>s[0]===DANCE)
        : pool[Math.floor(Math.random()*pool.length)]);
    if (!harvest()) {
      if (selected[0]===DANCE) scenesUntilDance=6+Math.floor(Math.random()*3);
      else scenesUntilDance--;
    }
    const m = track(0), w = track(1);
    const prop = selected[1](m,w);
    m.face(1).hold(harvest()?8:14,500); w.face(-1).hold(8,500);
    scene = {name:selected[0],start:now,tracks:[m.segments,w.segments],duration:Math.max(m.duration,w.duration),prop};
    canvas.dataset.scene = selected[0];
    recent.push(selected[0]); if (recent.length>6) recent.shift();
    nextScene = now+Math.max(scene.duration+10000,rnd(55000,85000)*fast);
  }
  function sample(who,now) {
    const home = homes()[who];
    const idleFrame = who || harvest() ? 8 : 14;
    // A small, foot-anchored breath keeps the resting pose alive in quiet modes.
    const breath = (1-Math.cos(now/(who?4300:5600)*2*Math.PI))/2;
    const base = {x:home,dir:who?-1:1,frame:idleFrame,hop:0,stretch:1+.018*breath};
    if (sleeping) { base.frame = harvest()&&!who ? 9 : 15; return base; }
    if (state !== 'ok') return base;
    if (scene) {
      const elapsed = now-scene.start;
      const seg = scene.tracks[who].find(s => elapsed>=s.t && elapsed<s.t+s.d);
      if (seg) {
        const age = elapsed-seg.t, index = Math.floor(age*seg.fps/1000)%seg.frames.length;
        const phase=(age%520)/520, air=Math.max(0,Math.min(1,(phase-.13)/.65));
        const stride=air*air*(3-2*air);
        const u=Math.min(1,age/seg.d);
        if (seg.landing!==undefined) {
          const travel=u*u*(3-2*u);
          const lift=seg.elevation+(seg.landing-seg.elevation)*travel+Math.sin(u*Math.PI)*.35;
          return {x:seg.x0+(seg.x1-seg.x0)*travel,dir:seg.dir,frame:seg.frames[index],hop:lift*sizes[who]};
        }
        const progress=seg.hop?(Math.floor(age/520)+stride)/seg.hops:seg.lift!==undefined?u*u*(3-2*u):u;
        return {x:seg.x0+(seg.x1-seg.x0)*progress,dir:seg.dir,
          frame:seg.frames[index],sheet:seg.sheet||0,
          hop:seg.hop ? Math.sin(air*Math.PI)*sizes[who]*.23 :
            seg.sheet===5 && seg.frames.length===8 && seg.frames[0]===0
              ? Math.sin(air*Math.PI)*sizes[who]*.28 :
                ((seg.elevation||0)+(seg.lift||0)*Math.sin(u*Math.PI))*sizes[who]};
      }
    }
    if (who && (readingUntil>now || (now+2500)%12000<850)) base.frame = 11;
    else if ((now+who*3100)%9200<220) base.frame = who||harvest()?9:15;
    return base;
  }
  const sheetNames=['original','dance','behavior','rise','walk','play','dance','acting'];
  function paint(who,s) {
    const image=harvest()?thanksgivingArt.sheets[who]:[assets[who],danceAssets[who],rabbitBehaviors[0],riseAssets[who],extras[0],extras[1],
      duetAssets[who],actingAssets[0]][s.sheet||0];
    const size=sizes[who],tileW=image.naturalWidth/4,tileH=image.naturalHeight/4;
    ctx.save();
    try {
      ctx.translate(s.x*width,floor-s.hop);
      ctx.scale(s.dir,s.stretch||1);
      // The sprite's foot baseline is at 90% of its tile.
      ctx.drawImage(image,(s.frame%4)*tileW,Math.floor(s.frame/4)*tileH,tileW,tileH,-size/2,-size*.9,size,size);
    } finally {
      ctx.restore();
    }
  }
  function paintHarvestProp(now,foreground) {
    const prop=scene?.prop;
    if(!prop)return;
    const age=now-scene.start;
    const u=(age-(prop.start||0))/prop.duration;
    if(u<0 || u>1)return;
    const hidesRabbit=prop.foreground && age>=prop.foreground[0] && age<prop.foreground[1];
    if(Boolean(hidesRabbit)!==foreground)return;
    ctx.save();
    ctx.globalAlpha=Math.min(1,u*14,(1-u)*12);
    if(prop.kind==='pumpkin' && thanksgivingArt.pumpkinReady){
      const image=thanksgivingArt.pumpkin;
      const h=sizes[1]*.77,w=h*image.naturalWidth/image.naturalHeight;
      ctx.drawImage(image,prop.x*width-w/2,floor-h,w,h);
    }else if(prop.kind==='leaf' && thanksgivingArt.leafReady){
      const image=thanksgivingArt.leaf;
      const size=Math.max(9,height*.024);
      const x=(prop.x0+(prop.x1-prop.x0)*u+Math.sin(u*3*Math.PI)*.016)*width;
      ctx.translate(x,floor-height*(.43-.4*u));
      ctx.rotate(Math.sin(u*4*Math.PI)*.7+u*2.2);
      ctx.drawImage(image,-size/2,-size/2,size,size);
    }
    ctx.restore();
  }
  function paintProp(now) {
    const prop=scene?.prop;
    if(!prop)return;
    const elapsed=now-scene.start;
    if(elapsed<prop.start || elapsed>prop.start+prop.duration)return;
    const u=(elapsed-prop.start)/prop.duration;
    let x,y,radius;
    if(prop.kind==='ball'){
      const rolled=Math.max(0,Math.min(1,(elapsed-prop.roll)/2100));
      x=(.34+.49*(1-(1-rolled)**2))*width;
      radius=Math.max(4,Math.min(12,height*.017));
      y=floor-radius-Math.abs(Math.sin(rolled*3*Math.PI))*(1-rolled)*radius;
    }else{
      x=(.23+Math.sin(u*2*Math.PI)*.022)*width;
      y=floor-height*(.47-.27*u);
      radius=Math.max(2.5,Math.min(5,height*.008));
    }
    ctx.save();
    ctx.globalAlpha=Math.min(1,u*12,(1-u)*10);
    ctx.beginPath();
    ctx.arc(x,y,radius,0,2*Math.PI);
    ctx.fillStyle='#c9ddf2';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x-radius*.25,y-radius*.26,radius*.52,0,2*Math.PI);
    ctx.fillStyle='#eef6ff';
    ctx.fill();
    ctx.restore();
  }
  function draw(now) {
    ctx.clearRect(0,0,width,height);
    if (!enabled || !ready) return;
    // Use the live DOM boxes, including the existing slow burn-in drift/pulse.
    // Refresh at most once per second, keeping the tablet's drawing cost low.
    if (now-lastBounds>1000) { layoutBounds(); lastBounds = now; }
    // Reading and bedtime states select poses, without fading the animals.
    ctx.globalAlpha = 1;
    if (harvest()) paintHarvestProp(now,false);
    for (let who=0;who<2;who++) {
      const s=sample(who,now);
      paint(who,s);
      canvas.dataset[who?'winstonFrame':'millieFrame']=String(s.frame);
      canvas.dataset[who?'winstonSheet':'millieSheet']=sheetNames[s.sheet||0];
    }
    if (harvest()) paintHarvestProp(now,true);
    else paintProp(now);
    // Keep the chart and header clear. Reading details paint above the animals.
    ctx.save();
    ctx.globalCompositeOperation='destination-out';
    protectedRects.forEach(r => ctx.fillRect(r.x,r.y,r.w,r.h));
    ctx.restore();
  }
  let lastBounds=0;
  function layoutBounds() {
    protectedRects=[
      box('chartwrap',2),box('clock',8),box('status',8),box('controls',8)
    ].filter(Boolean);
    floor=box('chartwrap').y-3;
    // Lock scale to viewport geometry, never to the pulsing number's bounds.
    const headroom=Math.max(12,floor-Math.max(...protectedRects.slice(1,3).map(r=>r.y+r.h))-12);
    sizes=[Math.min(height*.56,width*.38,headroom/.84),Math.min(height*.221,width*.195,headroom/.84)];
    homePositions=width<height?[.20,.85]:[.16,.90];
    // Millie's head faces the clear left edge at rest; her body may pass behind
    // the number. Keep the full larger silhouette within the screen edges.
    homePositions[0]=Math.min(.45*sizes[0]/width,1-.45*sizes[0]/width);
    homePositions[1]=Math.min(homePositions[1],1-.45*sizes[1]/width);
    // The number is painted above the animals by #app's existing z-index:1.
    // Its actual glyphs cover the fur naturally, avoiding rectangular cutouts.
    // Keep the graph, header and controls fully clear.
  }
  function loop(now) {
    raf=0;
    if (!enabled || document.hidden || !ready) return;
    const mode=sleeping?'night':state;
    if (lastMode!==mode) {
      lastMode=mode; scene=null; nextScene=now+firstSceneDelay();
    }
    if (!sleeping && state==='ok') {
      if (scene && now-scene.start>scene.duration) { scene=null; canvas.dataset.scene='rest'; }
      if (!scene && now>=nextScene) startScene(now);
    }
    if (now-lastDraw>=40) { draw(now); lastDraw=now; }
    raf=requestAnimationFrame(loop);
  }
  async function setEnabled(value,themeId='christmas') {
    enabled=!!value; const token=++generation;
    cancelAnimationFrame(raf); raf=0;
    if (!enabled) {
      if (canvas) { canvas.style.display='none'; ctx.clearRect(0,0,width,height); }
      scene=null; return;
    }
    init();
    if (activeTheme!==themeId) {
      activeTheme=themeId;
      canvas.style.display='none';
      ctx.clearRect(0,0,width,height);
      delete canvas.dataset.scene;
      recent=[];
    }
    const available=(await (harvest()?loadThanksgiving():loaded)).every(Boolean);
    if (!enabled || token!==generation) return;
    ready=available;
    // Failed decorative assets never interrupt glucose display or polling.
    if (!ready) { canvas.style.display='none'; return; }
    canvas.style.display='block'; layout(); scene=null; lastMode='';
    loop(performance.now());
  }
  function reading(o) {
    const previous=state;
    state=!o?'none':o.stale?'stale':o.v<o.low?'low':'ok';
    if (state!=='ok') { scene=null; readingUntil=0; }
    else if (o.fresh && previous==='ok' && !scene) readingUntil=performance.now()+1800;
  }
  return {setEnabled,reading,sceneNames:SCENES.map(s=>s[0]),thanksgivingSceneNames:THANKSGIVING_SCENES.map(s=>s[0])};
})();
