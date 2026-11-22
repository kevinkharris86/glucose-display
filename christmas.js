/* Millie & Winston: illustrated Christmas-only frame animation.
   Decorative overlay; never changes the measurement layout or reads credentials. */
window.GD_CHRISTMAS = (() => {
  'use strict';
  const scriptBase = new URL('.', document.currentScript.src);
  const Q = new URLSearchParams(location.search);
  const fast = Q.has('fast') ? .12 : 1;
  const WALK = [0,1,2,3,4,5,6,7];
  const WALK_FINE = Array.from({length:16},(_,i)=>i);
  const DANCE = 'babydoll-dance';
  const images = names => names.map(name => {
    const image = new Image();
    image.src = new URL(`assets/christmas/${name}.png?v=20261122`, scriptBase).href;
    return image;
  });
  const assets = images(['millie','winston']);
  const danceAssets = images(['millie-dance-v2','winston-dance-v2']);
  const riseAssets = images(['millie-dance','winston-dance']);
  const rabbitBehaviors = images(['winston-behaviors']);
  const extras = images(['millie-walk-v3','winston-play']);
  const waitForImages = list => Promise.all(list.map(image => new Promise(resolve => {
    if (image.complete) return resolve(image.naturalWidth > 0);
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  })));
  const loaded = waitForImages(assets);
  let danceReady = false;
  waitForImages([...danceAssets,...riseAssets]).then(results => { danceReady = results.every(Boolean); });
  let behaviorReady=false;
  waitForImages(rabbitBehaviors).then(results=>{behaviorReady=results.every(Boolean);});
  let walkReady=false, playReady=false;
  waitForImages(extras).then(([walk,play])=>{walkReady=walk;playReady=play;});
  let canvas, ctx, enabled = false, ready = false, raf = 0, lastDraw = 0;
  let width = 0, height = 0, floor = 0, sizes = [], protectedRects = [];
  let homePositions = [.105,.90];
  let state = 'none', sleeping = false, scene = null, nextScene = 0;
  let recent = [], readingUntil = 0, lastMode = '', generation = 0;
  let scenesUntilDance = 2 + Math.floor(Math.random()*3);
  const rnd = (a,b) => a + Math.random() * (b-a);
  const homes = () => homePositions;
  const night = () => {
    if (Q.has('night')) return true;
    const d = new Date(), m = d.getHours()*60 + d.getMinutes();
    return m >= 21*60 || m < 6*60+30;
  };
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
        scene = null; nextScene = performance.now()+rnd(45000,75000)*fast;
        layout(); loop(performance.now());
      }
    });
    layout();
  }
  // Segments carry their own frame sequences, rather than translating still photos.
  function track(who) {
    let x = homes()[who], t = 0, dir = who?-1:1;
    const segments = [];
    const api = {
      segments,
      hold(frames,ms,fps = 6,sheet = 0) {
        segments.push({t,d:ms,x0:x,x1:x,dir,frames:Array.isArray(frames)?frames:[frames],fps,sheet});
        t += ms; return api;
      },
      face(d) { dir = d; return api; },
      go(to) {
        const edge=sizes[who]*.45/width;
        to=Math.max(edge,Math.min(1-edge,to));
        if (Math.abs(to-x)*width<1) return api;
        const hops=Math.max(1,Math.ceil(Math.abs(to-x)*width/(sizes[who]*.75)));
        const duration = who?hops*520:Math.max(350,Math.abs(to-x)*34000);
        const nextDirection = to>x ? 1 : -1;
        if (!who && dir!==nextDirection) {
          api.hold(12,180);
        }
        dir = to>x ? 1 : -1;
        const fineWalk = !who && walkReady;
        segments.push({t,d:duration,x0:x,x1:to,dir,frames:fineWalk?WALK_FINE:WALK,
          fps:who?1000/65:fineWalk?20:10,hop:!!who,hops,sheet:fineWalk?4:0});
        t += duration; x = to; return api;
      },
      home() { api.go(homes()[who]); dir = who?-1:1; return api; },
      get duration() { return t; }
    };
    return api;
  }
  // Quiet, different vignettes. Never repeat a scene within the last six picks.
  const SCENES = [
    ['millie-stroll',(m,w) => { m.hold(8,500).go(.29).hold([8,10,10,8],2400).home(); w.hold([8,11,8],4500,2); }],
    ['winston-explores',(m,w) => { w.go(.68).hold([8,10,10,8],2600).home(); m.hold([14,14,12,14],6500,1); }],
    ['christmas-greeting',(m,w) => { m.hold(8,400).go(.35).face(1).hold([8,12,8],5000,2).home(); w.go(.55).face(-1).hold([8,11,8],9000,2).home(); }],
    ['graph-watch',(m,w) => { m.hold(8,300).go(.25).hold([8,10,8,11,8],3800,2).home(); w.hold(8,2000).go(.75).hold([10,8,11,8],3000,2).home(); }],
    ['follow-millie',(m,w) => { m.hold(8,300).go(.43).hold([8,13,8],2800,2).home(); w.hold(8,1300).go(.58).face(-1).hold([8,12,8],8500,2).home(); }],
    ['snowflake-listening',(m,w) => { m.hold([8,11,8,12,8,9,8],6500,2).hold(14,1200); w.hold([8,11,8,13,8,9,8],6800,2); }],
    ['sniff-the-present',(m,w) => { m.hold(8,300).go(.065).hold([8,10,10,8,10,8],4400,2).home(); w.hold([8,12,8],6000,1); }],
    ['tree-inspection',(m,w) => { w.go(.94).hold([8,11,11,8,13,8],4300,2).home(); m.hold([14,12,14,9,14],6000,1); }],
    ['gentle-check-in',(m,w) => { m.hold([14,12,14,8,11,8,14],6500,1).hold(14,1500); w.hold([8,12,8,11,8,9,8],6500,1); }],
    ['winston-short-hop',(m,w) => { w.go(.81).hold([8,13,8],2100,2).go(.70).hold([8,10,8],2300,2).home(); m.hold([14,12,14],8000,1); }],
    ['settling-down',(m,w) => { m.hold([8,10,8,14,14,15,14],7000,1); w.hold([8,10,8,14,15,14,8],7000,1); }],
    ['crossing-paths',(m,w) => { m.hold(8,400).go(.64).hold([8,13,8],2200,2).home(); w.hold(8,1800).go(.38).hold([8,12,8],2300,2).home(); }],
    ['rabbit-lookout',(m,w)=>{
      w.face(-1).hold([0,1,2,3],700,1000/175,2).hold([4,5,6,7,6,5],3500,3,2).hold([3,2,1,0],700,1000/175,2);
      m.face(1).hold([8,12,8,11,8],4900,2);
    }],
    ['rabbit-face-wash',(m,w)=>{
      w.face(1).hold([15,8,9,10,11,12,13,10,11,12,13,14,15],5200,2.5,2);
      m.face(1).hold([14,14,15,14],5200,1);
    }],
    ['playful-follow',(m,w)=>{
      m.go(.38).face(1).hold([8,10,8,12],2600,2).home();
      w.hold(8,800).go(.62).face(-1).hold(8,4500).hold([0,1,2,3,4,6,4,3,2,1,0],2600,4,2).home();
    }],
    ['binky-and-bow',(m,w) => {
      w.face(-1).go(.85).hold(WALK,520,1000/65,5).hold([8,9,10,11,12,13,14,15],1800,1000/225,5).home();
      m.face(1).hold(14,850).hold([8,10,10,12,8],2400,2.5).hold(14,1600);
    }],
    [DANCE,(m,w) => {
      for (const dancer of [m,w]) dancer.face(1)
        .hold([0,1,2,3],800,5,3)
        .hold(Array.from({length:16},(_,i)=>i),10000,12,1)
        .hold([3,2,1,0],800,5,3);
    }]
  ];
  function startScene(now) {
    const forced = Q.get('xscene');
    const available = SCENES.filter(s => (s[0] !== DANCE || danceReady) &&
      (s[0] !== 'binky-and-bow' || playReady) &&
      (!['rabbit-lookout','rabbit-face-wash','playful-follow'].includes(s[0]) || behaviorReady));
    const choices = available.filter(s => s[0]!==DANCE && !recent.includes(s[0]));
    const selected = available.find(s => s[0] === forced) ||
      (danceReady && scenesUntilDance<=0 && !recent.includes(DANCE)
        ? available.find(s=>s[0]===DANCE)
        : choices[Math.floor(Math.random()*choices.length)]);
    if (selected[0]===DANCE) scenesUntilDance=6+Math.floor(Math.random()*3);
    else scenesUntilDance--;
    const m = track(0), w = track(1); selected[1](m,w);
    m.face(1).hold(14,500); w.face(-1).hold(8,500);
    scene = {name:selected[0],start:now,tracks:[m.segments,w.segments],duration:Math.max(m.duration,w.duration)};
    canvas.dataset.scene = selected[0];
    recent.push(selected[0]); if (recent.length>6) recent.shift();
    nextScene = now+Math.max(scene.duration+10000,rnd(55000,85000)*fast);
  }
  function sample(who,now) {
    const home = homes()[who];
    const idleFrame = who ? 8 : 14;
    const base = {x:home,dir:who?-1:1,frame:idleFrame,hop:0};
    if (sleeping) { base.frame = who?15:15; return base; }
    if (state !== 'ok') return base;
    if (scene) {
      const elapsed = now-scene.start;
      const seg = scene.tracks[who].find(s => elapsed>=s.t && elapsed<s.t+s.d);
      if (seg) {
        const age = elapsed-seg.t, index = Math.floor(age*seg.fps/1000)%seg.frames.length;
        const phase=(age%520)/520, air=Math.max(0,Math.min(1,(phase-.13)/.65));
        const stride=air*air*(3-2*air);
        const progress=seg.hop?(Math.floor(age/520)+stride)/seg.hops:Math.min(1,age/seg.d);
        return {x:seg.x0+(seg.x1-seg.x0)*progress,dir:seg.dir,
          frame:seg.frames[index],sheet:seg.sheet||0,
          hop:seg.hop ? Math.sin(air*Math.PI)*sizes[who]*.23 :
            seg.sheet===5 && seg.frames.length===8 && seg.frames[0]===0
              ? Math.sin(air*Math.PI)*sizes[who]*.28 : 0};
      }
    }
    if (readingUntil>now && who) base.frame = 11;
    else if ((now+who*3100)%9200<160) base.frame = who?9:15;
    return base;
  }
  const sheetNames=['original','dance','behavior','rise','walk','play'];
  function paint(who,s) {
    const image=[assets[who],danceAssets[who],rabbitBehaviors[0],riseAssets[who],extras[0],extras[1]][s.sheet||0];
    const size=sizes[who],tileW=image.naturalWidth/4,tileH=image.naturalHeight/4;
    ctx.save();
    try {
      ctx.translate(s.x*width,floor+size*.10-s.hop);
      ctx.scale(s.dir,1);
      ctx.drawImage(image,(s.frame%4)*tileW,Math.floor(s.frame/4)*tileH,tileW,tileH,-size/2,-size,size,size);
    } finally {
      ctx.restore();
    }
  }
  function draw(now) {
    ctx.clearRect(0,0,width,height);
    if (!enabled || !ready) return;
    // Use the live DOM boxes, including the existing slow burn-in drift/pulse.
    // Refresh at most once per second, keeping the tablet's drawing cost low.
    if (now-lastBounds>1000) { layoutBounds(); lastBounds = now; }
    ctx.save();
    ctx.globalAlpha = sleeping ? .42 : state==='ok' ? 1 : .6;
    for (let who=0;who<2;who++) {
      const s=sample(who,now);
      paint(who,s);
      canvas.dataset[who?'winstonFrame':'millieFrame']=String(s.frame);
      canvas.dataset[who?'winstonSheet':'millieSheet']=sheetNames[s.sheet||0];
    }
    ctx.restore();
    // Keep the chart fully clear. Dim fur behind individual text elements
    // without cutting a large invisible hole through the walking path.
    ctx.save(); ctx.globalCompositeOperation='destination-out';
    protectedRects.forEach(r => ctx.fillRect(r.x,r.y,r.w,r.h));
    ctx.globalAlpha=.55;
    for(const id of ['arrow','delta','unit','age']) {
      const r=box(id,2);
      if(r && r.w>4 && r.h>4)ctx.fillRect(r.x,r.y,r.w,r.h);
    }
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
    // Keep the supporting information, graph, header and controls fully clear.
  }
  function loop(now) {
    raf=0;
    if (!enabled || document.hidden || !ready) return;
    sleeping=night();
    const mode=sleeping?'night':state;
    if (lastMode!==mode) {
      lastMode=mode; scene=null; nextScene=now+rnd(45000,75000)*fast;
    }
    if (!sleeping && state==='ok') {
      if (scene && now-scene.start>scene.duration) { scene=null; canvas.dataset.scene='rest'; }
      if (!scene && now>=nextScene) startScene(now);
    }
    if (now-lastDraw>=40) { draw(now); lastDraw=now; }
    raf=requestAnimationFrame(loop);
  }
  async function setEnabled(value) {
    enabled=!!value; const token=++generation;
    cancelAnimationFrame(raf); raf=0;
    if (!enabled) {
      if (canvas) { canvas.style.display='none'; ctx.clearRect(0,0,width,height); }
      scene=null; return;
    }
    init();
    ready=(await loaded).every(Boolean);
    if (!enabled || token!==generation) return;
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
  return {setEnabled,reading,sceneNames:SCENES.map(s=>s[0])};
})();
