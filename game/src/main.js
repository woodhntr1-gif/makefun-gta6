// Port Meridian — an original open-world crime game (2D top-down, canvas, no libraries, no network).
// You are Rook Vane, a bike courier in the fictional harbour city of Port Meridian. A bungled
// delivery pulls you into Mara Kestrel's crew; five jobs take you from courier to harbour heist.
// All names, places, story, art and sound here are original. Nothing is from Rockstar / GTA.
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const statusEl = document.getElementById('status');
const W = () => cv.width, H = () => cv.height;
function resize(){ cv.width = innerWidth; cv.height = innerHeight; }
addEventListener('resize', resize); resize();

// --- deterministic RNG so the city is the same every run ---
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const rnd = mulberry32(20261118);
const pick = a => a[Math.floor(rnd()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v, dist=(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
const angDiff=(a,b)=>{ let d=a-b; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; return d; };

// --- world: 4800x3600 city, roads every 400px, blocks with buildings / parks / lots ---
const WW=4800, WH=3600, ROAD=84;
const roadsX=[], roadsY=[];
for(let x=400;x<WW;x+=400) roadsX.push(x);
for(let y=400;y<WH;y+=400) roadsY.push(y);
const buildings=[], parks=[], lots=[];
const bColors=['#5b6b7f','#6b5b7f','#7f6b5b','#4f6b5b','#6b7a8a','#8a6b5b','#556b8a','#7a556b'];
for(let ix=0;ix<roadsX.length-1;ix++) for(let iy=0;iy<roadsY.length-1;iy++){
  const x0=roadsX[ix]+ROAD/2+14, y0=roadsY[iy]+ROAD/2+14, x1=roadsX[ix+1]-ROAD/2-14, y1=roadsY[iy+1]-ROAD/2-14;
  const r=rnd();
  if(r<0.16){ parks.push({x:x0,y:y0,w:x1-x0,h:y1-y0}); continue; }
  if(r<0.26){ lots.push({x:x0,y:y0,w:x1-x0,h:y1-y0}); continue; }
  const bw=(x1-x0)/2-10, bh=(y1-y0)/2-10;
  buildings.push({x:x0+4,y:y0+4,w:bw,h:bh,c:pick(bColors),hgt:6+Math.floor(rnd()*18)});
  buildings.push({x:x0+bw+16,y:y0+4,w:bw,h:bh,c:pick(bColors),hgt:6+Math.floor(rnd()*18)});
  buildings.push({x:x0+4,y:y0+bh+16,w:bw,h:bh,c:pick(bColors),hgt:6+Math.floor(rnd()*18)});
  buildings.push({x:x0+bw+16,y:y0+bh+16,w:bw,h:bh,c:pick(bColors),hgt:6+Math.floor(rnd()*18)});
}
function onRoad(x,y){ return roadsX.some(rx=>Math.abs(x-rx)<ROAD/2+6)||roadsY.some(ry=>Math.abs(y-ry)<ROAD/2+6); }
function hitBuilding(x,y,rad){
  for(const b of buildings){ if(x+rad>b.x&&x-rad<b.x+b.w&&y+rad>b.y&&y-rad<b.y+b.h) return b; } return null;
}
function collideCircle(o,rad){ const b=hitBuilding(o.x,o.y,rad); if(!b) return;
  const cx=clamp(o.x,b.x,b.x+b.w), cy=clamp(o.y,b.y,b.y+b.h);
  const dx=o.x-cx, dy=o.y-cy, d=Math.hypot(dx,dy)||1;
  if(d<rad){ o.x=cx+dx/d*rad; o.y=cy+dy/d*rad; } }

// --- audio: WebAudio synth only, no files ---
let AC=null, soundOn=true, engineOsc=null, engineGain=null;
function audio(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC&&AC.state==='suspended') AC.resume(); return AC; }
function beep(f=440,d=0.08,type='square',v=0.06){ if(!soundOn) return; const a=audio(); if(!a) return;
  const o=a.createOscillator(), g=a.createGain(); o.type=type; o.frequency.value=f;
  g.gain.setValueAtTime(v,a.currentTime); g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+d);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime+d); }
function engineStart(){ const a=audio(); if(!a||engineOsc) return;
  engineOsc=a.createOscillator(); engineGain=a.createGain(); engineOsc.type='sawtooth'; engineOsc.frequency.value=55;
  engineGain.gain.value=0.0; engineOsc.connect(engineGain).connect(a.destination); engineOsc.start(); }
function engineStop(){ if(engineOsc){ try{engineOsc.stop();}catch(e){} engineOsc=null; engineGain=null; } }

// --- input ---
const keys={}; let mouse={x:0,y:0,down:false};
addEventListener('keydown',e=>{ keys[e.key.toLowerCase()]=true;
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
  if(e.key.toLowerCase()==='m'){ soundOn=!soundOn; if(!soundOn) engineStop(); }
  if(e.key.toLowerCase()==='p'||e.key.toLowerCase()==='escape'){ if(state==='play'||state==='pause') togglePause(); }
  if(e.key.toLowerCase()==='e') tryEnterExitCar();
  if(e.key.toLowerCase()==='f') shoot();
});
addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });
cv.addEventListener('mousemove',e=>{ mouse.x=e.clientX; mouse.y=e.clientY; });
cv.addEventListener('mousedown',e=>{ mouse.down=true; if(state==='play') shoot(); });
addEventListener('mouseup',()=>{ mouse.down=false; });
cv.addEventListener('click',e=>{ if(state!=='play') handleClick(e.clientX,e.clientY); });

// --- story / missions ---
const MISSIONS=[
 {id:1,name:'First Delivery',boss:'Mara Kestrel',brief:'Courier job, no questions. Take the package from the North Docks to the Blue Lantern club. 90 seconds. Don\'t scratch the paint.',
  lines:['MARA: "Rook. Package, Blue Lantern, ninety seconds. Move."','ROOK: "Ninety seconds across town? You hiring a courier or a miracle?"','MARA: "Both. Go."'],
  type:'drive', reward:150, time:90, target:{x:400,y:3200,label:'Blue Lantern Club'}},
 {id:2,name:'Lose the Heat',boss:'Mara Kestrel',brief:'You were spotted. The harbour police are on you — 2 stars. Break line of sight and stay hidden until the heat dies.',
  lines:['MARA: "Cops made your plates. Lose them before you come back."','ROOK: "Great. First day and I\'m already a fugitive."'],
  type:'loseheat', reward:200, time:120, target:{x:2400,y:1800,label:'Hideout — Kestrel Garage'}},
 {id:3,name:'Three Drops',boss:'Dex "Fingers" Marlowe',brief:'Dex left three cash drops around the city. Collect all three. Watch the streets — the drops are hot.',
  lines:['DEX: "Three envelopes, three corners. Grab \'em, don\'t get chatty."','ROOK: "And if someone else wants them?"','DEX: "Then run faster."'],
  type:'collect', reward:250, time:180, target:{x:1200,y:800,label:'Drop 1 / 3'}},
 {id:4,name:'The Getaway',boss:'Mara Kestrel',brief:'The crew hit a courier van. You drive. Get to the hideout with 3 stars on you and the whole harbour force behind you.',
  lines:['MARA: "Van\'s ours. You\'re driving. Don\'t stop for anything."','ROOK: "Anything includes red lights, right?"','MARA: "Especially red lights."'],
  type:'getaway', reward:400, time:120, target:{x:2400,y:1800,label:'Hideout — Kestrel Garage'}},
 {id:5,name:'The Harbour Heist',boss:'Mara Kestrel',brief:'Final job: lift the Meridian Shipping payroll from the harbour vault, then escape to the hideout. Bring a fast car. Bring nerve.',
  lines:['MARA: "Payroll vault, harbour office. In, out, gone. This is the one, Rook."','ROOK: "After this, I\'m out. A boat, a beach, no sirens."','MARA: "After this, you\'re family. Go."'],
  type:'heist', reward:600, time:180, target:{x:4400,y:3200,label:'Harbour Vault'}},
];
const carColors=['#c0392b','#2980b9','#27ae60','#f39c12','#8e44ad','#e67e22','#16a085','#d35400','#ecf0f1','#2c3e50'];
const carNames=['Vesper','Kestrel GT','Harborline','Mule','Comet','Dune Runner','Osprey','Cobalt'];
function mkCar(x,y,angle,police=false,parked=false){
  return {x,y,angle,speed:0,color:police?'#1a1a2e':pick(carColors),name:police?'Interceptor':pick(carNames),
    police,parked,driver:!parked&&!police,ai:!police,axis:rnd()<0.5?'x':'y',dir:rnd()<0.5?1:-1,
    turnAt:0,health:100,w:46,h:24,skid:0};
}
function mkPed(x,y){ return {x,y,angle:rnd()*Math.PI*2,speed:28+rnd()*30,state:'walk',panic:0,axis:rnd()<0.5?'x':'y',dir:rnd()<0.5?1:-1,color:pick(['#e74c3c','#3498db','#f1c40f','#2ecc71','#9b59b6','#e67e22','#1abc9c','#fd79a8'])}; }

// --- game state ---
let state='title'; // title | play | pause | busted | wasted | complete
let saveData=null; try{ saveData=JSON.parse(localStorage.getItem('port-meridian-save')||'null'); }catch(e){}
let player, cars=[], peds=[], police=[], bullets=[], particles=[], pickups=[], skids=[], floats=[];
let cam={x:0,y:0}, shake=0, wanted=0, heat=0, cash=0, health=100, ammo=24, clockMin=9*60;
let missionIdx=0, mission=null, missionTimer=0, missionState='idle', drops=[], dialogue=[], dialogueT=0;
let kills=0, carsStolen=0, missionsDone=0, playT=0, arrestT=0, hideT=0, shotFlash=0, message='', messageT=0, bustedReason='';
function resetWorld(){
  player={x:400,y:400,angle:0,speed:0,health:100,onFoot:true,car:null,aim:0};
  cars=[]; peds=[]; police=[]; bullets=[]; particles=[]; pickups=[]; skids=[]; floats=[];
  // traffic on roads
  for(let i=0;i<14;i++){ const rx=pick(roadsX), ry=pick(roadsY);
    cars.push(mkCar(rnd()<0.5?rx:400+Math.floor(rnd()*11)*400, rnd()<0.5?ry:400+Math.floor(rnd()*11)*400, 0)); }
  // parked stealable cars near roads
  for(let i=0;i<10;i++){ const rx=pick(roadsX), ry=pick(roadsY);
    const c=mkCar(rx+60+(rnd()*40-20), ry+50, Math.PI/2, false, true); c.driver=false; cars.push(c); }
  for(let i=0;i<26;i++){ let x,y,tries=0; do{ x=200+rnd()*(WW-400); y=200+rnd()*(WH-400); tries++; }while((!onRoad(x,y)||hitBuilding(x,y,14))&&tries<40); peds.push(mkPed(x,y)); }
  // ammo + health pickups
  pickups=[{x:800,y:1200,kind:'ammo'},{x:3600,y:800,kind:'health'},{x:2000,y:2800,kind:'ammo'},{x:3200,y:2000,kind:'health'},{x:1200,y:2400,kind:'ammo'}];
  wanted=0; heat=0; health=100; ammo=24; clockMin=9*60; missionIdx=saveData?saveData.missionIdx||0:0;
  cash=saveData?saveData.cash||0:0; missionsDone=saveData?saveData.missionsDone||0:0;
  mission=null; missionState='idle'; dialogue=[]; cam.x=player.x-W()/2; cam.y=player.y-H()/2;
}
function saveGame(){ try{ localStorage.setItem('port-meridian-save', JSON.stringify({cash,missionIdx,missionsDone,savedAt:Date.now()})); }catch(e){} }
function showMsg(t){ message=t; messageT=3.5; }
function addFloat(x,y,t,c='#ffd54a'){ floats.push({x,y,t,c,life:1.4}); }
function burst(x,y,c,n=12){ for(let i=0;i<n;i++) particles.push({x,y,vx:(rnd()-0.5)*260,vy:(rnd()-0.5)*260,life:0.5+rnd()*0.4,c}); }
function startMission(i){
  mission=JSON.parse(JSON.stringify(MISSIONS[i])); missionIdx=i; missionState='active'; missionTimer=mission.time;
  dialogue=mission.lines.slice(); dialogueT=0;
  drops=[];
  if(mission.type==='collect'){ drops=[{x:1200,y:800,got:false},{x:3600,y:2400,got:false},{x:800,y:2800,got:false}]; mission.target={...drops[0],label:'Drop 1 / 3'}; }
  if(mission.type==='loseheat'){ wanted=2; heat=60; spawnPolice(2); }
  if(mission.type==='getaway'){ wanted=3; heat=90; spawnPolice(3); }
  if(mission.type==='heist'){ mission.target={x:4400,y:3200,label:'Harbour Vault'}; }
  showMsg('MISSION: '+mission.name+' — '+mission.brief);
  statusEl.textContent='Mission started: '+mission.name;
  beep(660,0.12,'square',0.08); setTimeout(()=>beep(880,0.12,'square',0.08),130);
}
function completeMission(){
  cash+=mission.reward; missionsDone++; missionState='done';
  addFloat(player.x,player.y-30,'+$'+mission.reward+'  '+mission.name+' COMPLETE');
  showMsg('MISSION COMPLETE: '+mission.name+'  +$'+mission.reward);
  burst(player.x,player.y,'#ffd54a',26); beep(523,0.1); setTimeout(()=>beep(659,0.1),110); setTimeout(()=>beep(784,0.18),220);
  missionIdx++; saveGame();
  if(missionIdx>=MISSIONS.length){ state='complete'; saveGame(); }
  else setTimeout(()=>{ if(state==='play') startMission(missionIdx); },2500);
  mission=null;
}
function failMission(reason){ missionState='failed'; showMsg('MISSION FAILED: '+reason); if(mission) mission=null; setTimeout(()=>{ if(state==='play'&&missionIdx<MISSIONS.length) startMission(missionIdx); },2500); }
function spawnPolice(n){ for(let i=0;i<n;i++){ const a=rnd()*Math.PI*2, d=420+rnd()*200;
    const c=mkCar(clamp(player.x+Math.cos(a)*d,60,WW-60), clamp(player.y+Math.sin(a)*d,60,WH-60), 0, true);
    c.ai=false; police.push(c); } }
function addWanted(n){ wanted=clamp(wanted+n,0,5); heat=clamp(heat+n*30,0,150);
  const need=Math.ceil(wanted*1.2)-police.length; if(need>0) spawnPolice(need); }

// --- actions ---
function nearestCar(maxD){ let best=null,bd=maxD; for(const c of [...cars,...police]){ if(c.police) continue; const d=dist(player.x,player.y,c.x,c.y); if(d<bd){bd=d;best=c;} } return best; }
function tryEnterExitCar(){
  if(state!=='play') return;
  if(player.car){ const c=player.car; player.car=null; player.onFoot=true; player.x=c.x+Math.cos(c.angle+Math.PI/2)*36; player.y=c.y+Math.sin(c.angle+Math.PI/2)*36; player.speed=0; engineStop(); showMsg('You got out of the '+c.name); return; }
  const c=nearestCar(70); if(!c) return;
  if(c.parked||c.driver){ if(c.driver){ c.driver=false; const d=mkPed(c.x+30,c.y+20); d.panic=3; d.state='flee'; peds.push(d); showMsg('You pulled the driver out of the '+c.name+'!'); }
    else showMsg('You stole the parked '+c.name+'!');
    c.parked=false; carsStolen++; addWanted(1); player.car=c; player.onFoot=false; engineStart(); beep(220,0.15,'sawtooth',0.07); }
}
function shoot(){
  if(state!=='play') return; audio();
  if(player.car){ beep(180,0.06,'square',0.05); return; } // no drive-by in this build; punch/shoot on foot
  if(ammo<=0){ showMsg('Out of ammo — find a green ammo pickup'); beep(120,0.15,'square',0.06); return; }
  ammo--; shotFlash=0.08;
  const a=player.aim; bullets.push({x:player.x+Math.cos(a)*18,y:player.y+Math.sin(a)*18,vx:Math.cos(a)*720,vy:Math.sin(a)*720,life:0.7});
  beep(900,0.05,'square',0.07); if(wanted<1) addWanted(1);
}
function damagePlayer(n,src){ if(state!=='play') return; health-=n; shake=Math.max(shake,6); burst(player.x,player.y,'#e74c3c',8);
  if(health<=0){ health=0; state='wasted'; bustedReason='You were wasted'+(src?' by '+src:'')+'.'; engineStop(); } }
function bustPlayer(){ state='busted'; bustedReason='Busted! The Port Meridian police hauled you in. Cash lost: $'+Math.min(cash,100)+'.'; cash=Math.max(0,cash-100); saveGame(); engineStop(); }

// --- update ---
function update(dt){
  playT+=dt; clockMin+=dt*0.5; if(clockMin>=1440) clockMin-=1440;
  if(messageT>0) messageT-=dt; if(shotFlash>0) shotFlash-=dt; if(shake>0) shake=Math.max(0,shake-dt*22);
  if(dialogue.length&&dialogueT<6){ dialogueT+=dt; if(dialogueT>=6){ dialogue.shift(); dialogueT=0; } }
  const px=player.x, py=player.y;
  // player aim from mouse
  player.aim=Math.atan2(mouse.y-H()/2, mouse.x-W()/2);
  const up=keys['w']||keys['arrowup'], down=keys['s']||keys['arrowdown'], left=keys['a']||keys['arrowleft'], right=keys['d']||keys['arrowright'];
  if(player.car){
    const c=player.car, accel=(up?260:0)-(down?180:0);
    c.speed=clamp(c.speed+accel*dt, -140, 430);
    if(!up&&!down) c.speed*=Math.pow(0.4,dt);
    if(keys[' ']) c.speed*=Math.pow(0.05,dt); // handbrake
    const steer=(left?-1:0)+(right?1:0);
    c.angle+=steer*clamp(Math.abs(c.speed)/140,0,1)*2.1*dt*Math.sign(c.speed||1);
    const nx=c.x+Math.cos(c.angle)*c.speed*dt, ny=c.y+Math.sin(c.angle)*c.speed*dt;
    const b=hitBuilding(nx,ny,22);
    if(b){ c.speed*=-0.35; shake=Math.max(shake,5); burst(c.x,c.y,'#95a5a6',6); if(Math.abs(c.speed)>120) beep(90,0.12,'sawtooth',0.06); }
    else { c.x=nx; c.y=ny; }
    c.x=clamp(c.x,40,WW-40); c.y=clamp(c.y,40,WH-40);
    if(Math.abs(c.speed)>60&&Math.abs(steer)>0&&rnd()<0.3) skids.push({x:c.x,y:c.y,a:c.angle,life:1.2});
    player.x=c.x; player.y=c.y; player.angle=c.angle;
    if(engineGain) engineGain.gain.value=0.02+Math.abs(c.speed)/430*0.05;
    if(engineOsc) engineOsc.frequency.value=50+Math.abs(c.speed)/430*90;
    // hit pedestrians while driving
    for(const p of peds){ if(p.state!=='down'&&dist(c.x,c.y,p.x,p.y)<30&&Math.abs(c.speed)>60){ p.state='down'; p.panic=0; burst(p.x,p.y,'#e74c3c',14); addWanted(1); showMsg('You hit a pedestrian! Wanted up.'); shake=8; c.speed*=0.6; } }
    // crash into traffic
    for(const o of cars){ if(o!==c&&dist(c.x,c.y,o.x,o.y)<44){ const push=angDiff(Math.atan2(o.y-c.y,o.x-c.x),c.angle); o.x+=Math.cos(Math.atan2(o.y-c.y,o.x-c.x))*30*dt*10; o.y+=Math.sin(Math.atan2(o.y-c.y,o.x-c.x))*30*dt*10; c.speed*=0.7; shake=Math.max(shake,4); } }
  } else {
    const sp=185, mx=(right?1:0)-(left?1:0), my=(down?1:0)-(up?1:0), ml=Math.hypot(mx,my)||1;
    player.x+=mx/ml*sp*dt; player.y+=my/ml*sp*dt;
    if(mx||my) player.angle=Math.atan2(my,mx);
    collideCircle(player,14); player.x=clamp(player.x,30,WW-30); player.y=clamp(player.y,30,WH-30);
    // pickups
    for(const pk of pickups){ if(!pk.got&&dist(player.x,player.y,pk.x,pk.y)<30){ pk.got=true;
      if(pk.kind==='ammo'){ ammo+=24; showMsg('+24 ammo'); } else { health=Math.min(100,health+40); showMsg('+40 health'); } beep(880,0.1,'sine',0.08); } }
    // punch with mouse held near? shooting covers combat; Space punches nearby ped
    if(keys[' ']){ for(const p of peds){ if(dist(player.x,player.y,p.x,p.y)<34&&p.state!=='down'){ p.state='flee'; p.panic=2; burst(p.x,p.y,'#f1c40f',6); } } }
  }
  // traffic AI: follow roads, turn at intersections
  for(const c of cars){
    if(c===player.car) continue;
    if(c.parked) continue;
    const roadX=roadsX.reduce((a,b)=>Math.abs(b-c.x)<Math.abs(a-c.x)?b:a);
    const roadY=roadsY.reduce((a,b)=>Math.abs(b-c.y)<Math.abs(a-c.y)?b:a);
    const onX=Math.abs(c.y-roadY)<ROAD/2, onY=Math.abs(c.x-roadX)<ROAD/2;
    if(!onX&&!onY){ c.angle+=angDiff(Math.atan2(roadY-c.y,roadX-c.x),c.angle)*dt*2; c.speed=clamp(c.speed+120*dt,0,150); }
    else {
      if(c.axis==='x'){ c.y+=(roadY-c.y)*dt*2; c.angle+=angDiff(c.dir>0?0:Math.PI,c.angle)*dt*3; }
      else { c.x+=(roadX-c.x)*dt*2; c.angle+=angDiff(c.dir>0?Math.PI/2:-Math.PI/2,c.angle)*dt*3; }
      c.speed=clamp(c.speed+90*dt,0,150);
      // slow for a car ahead
      for(const o of cars){ if(o!==c&&dist(c.x,c.y,o.x,o.y)<70&&Math.abs(angDiff(Math.atan2(o.y-c.y,o.x-c.x),c.angle))<0.5) c.speed=40; }
      // turn at intersections
      const nearIX=roadsX.some(rx=>Math.abs(c.x-rx)<26), nearIY=roadsY.some(ry=>Math.abs(c.y-ry)<26);
      if(nearIX&&nearIY&&rnd()<0.008){ c.axis=c.axis==='x'?'y':'x'; if(rnd()<0.5) c.dir*=-1; }
    }
    c.x+=Math.cos(c.angle)*c.speed*dt; c.y+=Math.sin(c.angle)*c.speed*dt;
    c.x=clamp(c.x,40,WW-40); c.y=clamp(c.y,40,WH-40);
    if(hitBuilding(c.x,c.y,20)){ c.angle+=Math.PI/2; c.x-=Math.cos(c.angle)*20; c.y-=Math.sin(c.angle)*20; }
  }
  // pedestrians
  for(const p of peds){
    if(p.state==='down') continue;
    if(p.panic>0){ p.panic-=dt; p.state='flee'; const a=Math.atan2(p.y-py,p.x-px); p.x+=Math.cos(a)*150*dt; p.y+=Math.sin(a)*150*dt; collideCircle(p,12); continue; }
    p.state='walk';
    if(p.axis==='x'){ p.x+=p.dir*p.speed*dt; if(rnd()<0.002) p.dir*=-1; }
    else { p.y+=p.dir*p.speed*dt; if(rnd()<0.002) p.dir*=-1; }
    if(!onRoad(p.x,p.y)){ // wander back to a road
      const rx=roadsX.reduce((a,b)=>Math.abs(b-p.x)<Math.abs(a-p.x)?b:a), ry=roadsY.reduce((a,b)=>Math.abs(b-p.y)<Math.abs(a-p.y)?b:a);
      if(Math.abs(p.x-rx)<Math.abs(p.y-ry)) p.x+=(rx-p.x)*dt*0.8; else p.y+=(ry-p.y)*dt*0.8;
    }
    p.x=clamp(p.x,30,WW-30); p.y=clamp(p.y,30,WH-30); collideCircle(p,12);
  }
  // bullets
  for(const b of bullets){ b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    for(const p of peds){ if(p.state!=='down'&&dist(b.x,b.y,p.x,p.y)<16){ p.state='down'; burst(p.x,p.y,'#e74c3c',12); b.life=0; addWanted(1); kills++; } }
    for(const c of [...cars,...police]){ if(dist(b.x,b.y,c.x,c.y)<26){ c.health-=34; burst(b.x,b.y,'#f39c12',8); b.life=0; if(c.health<=0&&!c.police){ burst(c.x,c.y,'#e74c3c',20); c.parked=true; c.speed=0; } } }
    if(hitBuilding(b.x,b.y,2)) b.life=0;
  }
  bullets=bullets.filter(b=>b.life>0);
  // police AI
  const wantTarget=player;
  for(const pc of police){
    const d=dist(pc.x,pc.y,wantTarget.x,wantTarget.y);
    const ta=Math.atan2(wantTarget.y-pc.y,wantTarget.x-pc.x);
    pc.angle+=angDiff(ta,pc.angle)*dt*2.2;
    pc.speed=clamp(pc.speed+260*dt,0,d<120?180:380);
    pc.x+=Math.cos(pc.angle)*pc.speed*dt; pc.y+=Math.sin(pc.angle)*pc.speed*dt;
    if(hitBuilding(pc.x,pc.y,22)){ pc.angle+=0.6; pc.speed*=0.5; }
    if(d<46){ // ram / arrest
      if(player.car){ player.car.speed*=0.55; shake=Math.max(shake,7); burst(pc.x,pc.y,'#95a5a6',8); if(rnd()<dt*0.5) damagePlayer(4,'a police ram'); }
      else { arrestT+=dt; if(arrestT>1.4){ bustPlayer(); return; } showMsg('POLICE ARE ARRESTING YOU — RUN!'); }
    } else arrestT=Math.max(0,arrestT-dt);
    if(d<300&&rnd()<dt*0.4){ // police shoot at you on foot
      if(!player.car) damagePlayer(3,'police fire'); else { player.car.health-=2; if(player.car.health<=0){ burst(player.car.x,player.car.y,'#e74c3c',24); player.car=null; player.onFoot=true; damagePlayer(20,'your car exploding'); } }
    }
  }
  // on-foot officers when wanted high and player on foot
  // wanted decay: hidden = far from all police
  const nearestPolice=police.length?Math.min(...police.map(p=>dist(p.x,p.y,player.x,player.y))):9999;
  if(wanted>0){
    if(nearestPolice>650){ hideT+=dt; if(hideT>7){ wanted--; heat=Math.max(0,heat-30); hideT=0; showMsg(wanted>0?'You lost a star — stay hidden.':'You lost the cops. Heat is off.'); if(wanted===0){ police=[]; } } }
    else hideT=0;
    if(wanted>0&&police.length<Math.ceil(wanted*1.2)) spawnPolice(1);
  }
  // mission logic
  if(mission&&missionState==='active'){
    missionTimer-=dt;
    if(missionTimer<=0){ failMission('Out of time on "'+mission.name+'".'); }
    else if(mission.type==='drive'||mission.type==='getaway'||mission.type==='heist'){
      const t=mission.target;
      if(dist(player.x,player.y,t.x,t.y)<70){
        if(mission.type==='heist'&&!mission.gotCash){ mission.gotCash=true; cash+=0; mission.target={x:2400,y:1800,label:'Hideout — Escape!'}; addWanted(2); showMsg('PAYROLL GRABBED! Now escape to the hideout!'); burst(player.x,player.y,'#2ecc71',24); }
        else if(mission.type!=='heist') completeMission();
        else if(mission.gotCash) completeMission();
      }
    } else if(mission.type==='loseheat'){
      if(wanted===0){ completeMission(); }
    } else if(mission.type==='collect'){
      for(const dr of drops){ if(!dr.got&&dist(player.x,player.y,dr.x,dr.y)<44){ dr.got=true; cash+=25; addFloat(player.x,player.y-24,'+$25 drop'); beep(990,0.1,'sine',0.08);
        const left=drops.filter(d=>!d.got); if(left.length){ mission.target={...left[0],label:'Drop '+(3-left.length+1)+' / 3'}; showMsg('Drop collected! '+(3-left.length)+' / 3'); } } }
      if(drops.every(d=>d.got)) completeMission();
    }
  }
  // particles / floats / skids
  for(const pt of particles){ pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.life-=dt; }
  particles=particles.filter(p=>p.life>0);
  for(const f of floats){ f.y-=30*dt; f.life-=dt; }
  floats=floats.filter(f=>f.life>0);
  for(const s of skids) s.life-=dt; skids=skids.filter(s=>s.life>0);
  // camera follows player
  const tx=player.x-W()/2, ty=player.y-H()/2;
  cam.x+=(tx-cam.x)*Math.min(1,dt*5); cam.y+=(ty-cam.y)*Math.min(1,dt*5);
  cam.x=clamp(cam.x,-40,WW-W()+40); cam.y=clamp(cam.y,-40,WH-H()+40);
  if(state==='play'&&playT>2&&!mission&&missionIdx<MISSIONS.length&&missionState==='idle'){ startMission(missionIdx); }
}
function togglePause(){ if(state==='play'){ state='pause'; engineStop(); } else if(state==='pause'){ state='play'; if(player&&player.car) engineStart(); } }
function startGame(fresh){
  audio(); resetWorld();
  if(fresh){ cash=0; missionIdx=0; missionsDone=0; try{localStorage.removeItem('port-meridian-save');}catch(e){} saveData=null; }
  state='play'; playT=0; showMsg('Welcome to Port Meridian. Press M for a mission — or just drive. E steals a car.');
  setTimeout(()=>{ if(state==='play'&&!mission) startMission(missionIdx); },1200);
}
function handleClick(mx,my){
  const cx=W()/2, cy=H()/2;
  const btn=(x,y,w,h)=>mx>x-w/2&&mx<x+w/2&&my>y-h/2&&my<y+h/2;
  if(state==='title'){
    if(btn(cx,cy+116,280,52)) startGame(false);
    else if(btn(cx,cy+182,280,52)&&saveData) startGame(false); // Continue loads save in resetWorld
    else if(btn(cx,saveData?cy+248:cy+182,280,52)) startGame(true);
  } else if(state==='pause'){ if(btn(cx,cy+56,280,52)) togglePause(); else if(btn(cx,cy+126,280,52)){ state='title'; engineStop(); } }
  else if(state==='busted'||state==='wasted'){ if(btn(cx,cy+56,280,52)){ resetWorld(); state='play'; health=100; player.health=100; wanted=0; police=[]; if(missionIdx<MISSIONS.length) startMission(missionIdx); } else if(btn(cx,cy+126,280,52)) state='title'; }
  else if(state==='complete'){ if(btn(cx,cy+56,300,52)) startGame(true); }
}

// --- rendering ---
function drawCar(c){
  ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.angle);
  ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(-22,-11,46,26);
  ctx.fillStyle=c.color; roundRect(-22,-12,44,24,6); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.25)'; roundRect(-8,-11,16,22,3); ctx.fill();
  ctx.fillStyle='#222'; ctx.fillRect(14,-11,5,4); ctx.fillRect(14,7,5,4);
  ctx.fillStyle='#f7dc6f'; ctx.fillRect(-24,-10,3,5); ctx.fillRect(-24,5,3,5);
  if(c.police){ ctx.fillStyle='#fff'; ctx.font='bold 9px system-ui'; ctx.textAlign='center'; ctx.fillText('POLICE',0,3);
    const f=Math.floor(playT*4)%2===0; ctx.fillStyle=f?'#e74c3c':'#3498db'; ctx.beginPath(); ctx.arc(-14,0,4,0,7); ctx.fill(); ctx.fillStyle=f?'#3498db':'#e74c3c'; ctx.beginPath(); ctx.arc(14,0,4,0,7); ctx.fill(); }
  ctx.restore();
}
function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function drawWorld(){
  const sx=(Math.random()-0.5)*shake, sy=(Math.random()-0.5)*shake;
  ctx.save(); ctx.translate(-cam.x+sx,-cam.y+sy);
  // ground
  ctx.fillStyle='#3d7a44'; ctx.fillRect(cam.x-40,cam.y-40,W()+80,H()+80);
  // blocks (sidewalk grey)
  for(let ix=0;ix<roadsX.length-1;ix++) for(let iy=0;iy<roadsY.length-1;iy++){
    ctx.fillStyle='#9aa0a6'; ctx.fillRect(roadsX[ix]+ROAD/2,roadsY[iy]+ROAD/2,400-ROAD,400-ROAD); }
  // parks
  for(const p of parks){ ctx.fillStyle='#2e8b57'; ctx.fillRect(p.x,p.y,p.w,p.h); ctx.fillStyle='#228b22';
    for(let i=0;i<5;i++){ ctx.beginPath(); ctx.arc(p.x+30+i*55,p.y+40+(i%2)*90,16,0,7); ctx.fill(); }
    ctx.fillStyle='#7ec8e3'; ctx.fillRect(p.x+p.w/2-30,p.y+p.h/2-16,60,32); }
  // lots
  for(const l of lots){ ctx.fillStyle='#6b7280'; ctx.fillRect(l.x,l.y,l.w,l.h); ctx.strokeStyle='#f1c40f'; ctx.setLineDash([8,8]); ctx.strokeRect(l.x+8,l.y+8,l.w-16,l.h-16); ctx.setLineDash([]); }
  // roads
  ctx.fillStyle='#2f3542';
  for(const rx of roadsX) ctx.fillRect(rx-ROAD/2,cam.y-40,ROAD,H()+80);
  for(const ry of roadsY) ctx.fillRect(cam.x-40,ry-ROAD/2,W()+80,ROAD);
  // centre dashes
  ctx.fillStyle='#f5d76e';
  for(const rx of roadsX) for(let y=Math.floor(cam.y/60)*60;y<cam.y+H();y+=60) ctx.fillRect(rx-2,y,4,28);
  for(const ry of roadsY) for(let x=Math.floor(cam.x/60)*60;x<cam.x+W();x+=60) ctx.fillRect(x,ry-2,28,4);
  // harbour water at south edge
  ctx.fillStyle='#1f6fb2'; ctx.fillRect(0,WH-120,WW,120);
  ctx.fillStyle='#fff'; ctx.font='bold 28px system-ui'; ctx.textAlign='left'; ctx.fillText('MERIDIAN HARBOUR',80,WH-60);
  // buildings with roof detail + height shadow
  for(const b of buildings){ if(b.x>cam.x+W()+60||b.x+b.w<cam.x-60||b.y>cam.y+H()+60||b.y+b.h<cam.y-60) continue;
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(b.x+6,b.y+6,b.w,b.h);
    ctx.fillStyle=b.c; ctx.fillRect(b.x,b.y,b.w,b.h);
    ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.fillRect(b.x+6,b.y+6,b.w-12,10);
    ctx.fillStyle='rgba(0,0,0,0.25)';
    for(let wx=b.x+14;wx<b.x+b.w-10;wx+=28) for(let wy=b.y+22;wy<b.y+b.h-10;wy+=28) ctx.fillRect(wx,wy,14,12);
    ctx.fillStyle='#fff'; ctx.font='bold 11px system-ui'; ctx.fillText('✦',b.x+8,b.y+16); }
  // skids
  ctx.strokeStyle='rgba(20,20,20,0.5)'; ctx.lineWidth=3;
  for(const s of skids){ ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(s.x-Math.cos(s.a)*14,s.y-Math.sin(s.a)*14); ctx.stroke(); }
  // pickups
  for(const pk of pickups){ if(pk.got) continue; ctx.save(); ctx.translate(pk.x,pk.y); ctx.fillStyle=pk.kind==='ammo'?'#2ecc71':'#e74c3c';
    ctx.beginPath(); ctx.arc(0,0,13,0,7); ctx.fill(); ctx.fillStyle='#fff'; ctx.font='bold 13px system-ui'; ctx.textAlign='center'; ctx.fillText(pk.kind==='ammo'?'A':'+',0,5); ctx.restore(); }
  // mission drops
  for(const dr of drops){ if(dr.got) continue; const bob=Math.sin(playT*4)*4; ctx.save(); ctx.translate(dr.x,dr.y+bob);
    ctx.fillStyle='#f1c40f'; ctx.beginPath(); ctx.arc(0,0,14,0,7); ctx.fill(); ctx.fillStyle='#222'; ctx.font='bold 12px system-ui'; ctx.textAlign='center'; ctx.fillText('$',0,4); ctx.restore(); }
  // mission target beacon
  if(mission&&missionState==='active'){ const t=mission.target; const r=26+Math.sin(playT*5)*6;
    ctx.strokeStyle='#ffd54a'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(t.x,t.y,r,0,7); ctx.stroke();
    ctx.fillStyle='#ffd54a'; ctx.beginPath(); ctx.moveTo(t.x,t.y-34); ctx.lineTo(t.x-9,t.y-52); ctx.lineTo(t.x+9,t.y-52); ctx.closePath(); ctx.fill(); }
  // pedestrians
  for(const p of peds){ if(p.state==='down'){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(1.2); ctx.fillStyle=p.color; ctx.fillRect(-9,-5,18,10); ctx.restore(); continue; }
    ctx.save(); ctx.translate(p.x,p.y); ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(0,3,10,0,7); ctx.fill();
    ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(0,0,9,0,7); ctx.fill();
    ctx.fillStyle='#f5cba7'; ctx.beginPath(); ctx.arc(Math.cos(p.angle)*4,Math.sin(p.angle)*4,5,0,7); ctx.fill(); ctx.restore(); }
  // cars + police
  for(const c of cars) drawCar(c);
  for(const pc of police) drawCar(pc);
  // bullets
  ctx.fillStyle='#ffe14d'; for(const b of bullets){ ctx.beginPath(); ctx.arc(b.x,b.y,3,0,7); ctx.fill(); }
  // particles
  for(const pt of particles){ ctx.globalAlpha=Math.max(0,pt.life); ctx.fillStyle=pt.c; ctx.fillRect(pt.x-3,pt.y-3,6,6); } ctx.globalAlpha=1;
  // player
  if(player.onFoot){
    ctx.save(); ctx.translate(player.x,player.y);
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(0,4,11,0,7); ctx.fill();
    ctx.fillStyle='#e67e22'; ctx.beginPath(); ctx.arc(0,0,11,0,7); ctx.fill(); // jacket
    ctx.fillStyle='#2c3e50'; ctx.beginPath(); ctx.arc(Math.cos(player.aim)*5,Math.sin(player.aim)*5,6,0,7); ctx.fill(); // head toward aim
    ctx.strokeStyle='#222'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(player.aim)*20,Math.sin(player.aim)*20); ctx.stroke();
    ctx.restore();
  }
  // floating texts
  ctx.font='bold 15px system-ui'; ctx.textAlign='center';
  for(const f of floats){ ctx.globalAlpha=Math.max(0,f.life); ctx.fillStyle=f.c; ctx.fillText(f.t,f.x,f.y); } ctx.globalAlpha=1;
  ctx.restore();
  if(shotFlash>0){ ctx.fillStyle='rgba(255,220,80,'+(shotFlash*3)+')'; ctx.fillRect(0,0,W(),H()); }
}
function drawMinimap(){
  const mw=190, mh=135, mx=W()-mw-14, my=14, sx=mw/WW, sy=mh/WH;
  ctx.fillStyle='rgba(10,16,28,0.85)'; roundRect(mx-4,my-4,mw+8,mh+8,8); ctx.fill();
  ctx.strokeStyle='#5dade2'; ctx.lineWidth=1; roundRect(mx-4,my-4,mw+8,mh+8,8); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(mx,my,mw,mh); ctx.clip();
  ctx.fillStyle='#1c2b1e'; ctx.fillRect(mx,my,mw,mh);
  ctx.fillStyle='#7a828c'; for(const rx of roadsX) ctx.fillRect(mx+rx*sx-2,my,4,mh); for(const ry of roadsY) ctx.fillRect(mx,my+ry*sy-2,mw,4);
  ctx.fillStyle='#1f6fb2'; ctx.fillRect(mx,my+(WH-120)*sy,mw,120*sy);
  if(mission&&missionState==='active'){ ctx.fillStyle='#ffd54a'; ctx.beginPath(); ctx.arc(mx+mission.target.x*sx,my+mission.target.y*sy,5+Math.sin(playT*5)*2,0,7); ctx.fill(); }
  ctx.fillStyle='#e74c3c'; for(const pc of police){ ctx.beginPath(); ctx.arc(mx+pc.x*sx,my+pc.y*sy,3.5,0,7); ctx.fill(); }
  ctx.fillStyle='#fff'; for(const c of cars){ if(!c.parked) ctx.fillRect(mx+c.x*sx-1,my+c.y*sy-1,2,2); }
  ctx.fillStyle='#2ecc71'; ctx.beginPath(); ctx.arc(mx+player.x*sx,my+player.y*sy,5,0,7); ctx.fill();
  ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(mx+player.x*sx,my+player.y*sy,7,0,7); ctx.stroke();
  ctx.restore();
  ctx.fillStyle='#9fb3c8'; ctx.font='11px system-ui'; ctx.textAlign='left'; ctx.fillText('PORT MERIDIAN',mx,my+mh+16);
}
function drawHUD(){
  // top-left status panel
  ctx.fillStyle='rgba(10,16,28,0.82)'; roundRect(12,12,300,96,10); ctx.fill();
  ctx.textAlign='left'; ctx.fillStyle='#fff'; ctx.font='bold 20px system-ui';
  ctx.fillText('$'+cash.toLocaleString(),26,40);
  ctx.font='13px system-ui'; ctx.fillStyle='#9fb3c8';
  const hh=Math.floor(clockMin/60), mm=Math.floor(clockMin%60);
  ctx.fillText(String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')+'  •  AMMO '+ammo,26,62);
  // health bar
  ctx.fillStyle='#333'; roundRect(26,72,180,12,6); ctx.fill();
  ctx.fillStyle=health>50?'#2ecc71':health>25?'#f39c12':'#e74c3c'; roundRect(26,72,180*health/100,12,6); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='11px system-ui'; ctx.fillText('HP '+Math.ceil(health),212,82);
  // wanted stars top centre
  ctx.textAlign='center'; ctx.font='bold 26px system-ui';
  for(let i=0;i<5;i++){ ctx.fillStyle=i<wanted?'#ffd54a':'rgba(255,255,255,0.25)'; ctx.fillText('★',W()/2-60+i*30,44); }
  if(wanted>0){ ctx.font='bold 12px system-ui'; ctx.fillStyle='#ff8a80'; ctx.fillText(wanted>=4?'MAXIMUM HEAT — RUN':'WANTED — break line of sight to lose stars',W()/2,66); }
  // mission panel bottom-left
  if(mission&&missionState==='active'){
    ctx.fillStyle='rgba(10,16,28,0.82)'; roundRect(12,H()-118,360,106,10); ctx.fill();
    ctx.textAlign='left'; ctx.fillStyle='#ffd54a'; ctx.font='bold 15px system-ui'; ctx.fillText('◆ '+mission.name+'  —  '+mission.boss,26,H()-92);
    ctx.fillStyle='#fff'; ctx.font='13px system-ui'; ctx.fillText(mission.brief.slice(0,52),26,H()-70);
    ctx.fillStyle='#9fb3c8'; ctx.fillText('Objective: '+mission.target.label+'   •   '+Math.ceil(missionTimer)+'s left',26,H()-48);
    const d=Math.round(dist(player.x,player.y,mission.target.x,mission.target.y));
    ctx.fillStyle='#5dade2'; ctx.fillText('Distance: '+d+'m   •   Reward $'+mission.reward,26,H()-26);
  } else if(missionIdx<MISSIONS.length){
    ctx.fillStyle='rgba(10,16,28,0.7)'; roundRect(12,H()-52,360,40,10); ctx.fill();
    ctx.fillStyle='#9fb3c8'; ctx.font='13px system-ui'; ctx.textAlign='left'; ctx.fillText('Next job: '+MISSIONS[missionIdx].name+' — drive to the marker.',26,H()-27);
  }
  // controls hint bottom-right
  ctx.fillStyle='rgba(10,16,28,0.7)'; roundRect(W()-330,H()-52,318,40,10); ctx.fill();
  ctx.fillStyle='#cdd7e1'; ctx.font='12px system-ui'; ctx.textAlign='left';
  ctx.fillText(player.car?'WASD drive • Space brake • E exit • P pause':'WASD move • Click shoot • E steal • P pause',W()-318,H()-27);
  if(messageT>0){ ctx.font='bold 14px system-ui'; const words=message.split(' '), lines=['']; for(const w of words){ if((lines[lines.length-1]+' '+w).trim().length>78) lines.push(w); else lines[lines.length-1]=(lines[lines.length-1]+' '+w).trim(); }
    const w2=Math.min(W()-40,Math.max(...lines.map(l=>ctx.measureText(l).width))+36), h2=lines.length*22+14;
    ctx.fillStyle='rgba(10,16,28,0.85)'; roundRect(W()/2-w2/2,84,w2,h2,8); ctx.fill();
    ctx.fillStyle='#fff'; ctx.textAlign='center'; lines.forEach((l,i)=>ctx.fillText(l,W()/2,106+i*22)); }
  // dialogue
  if(dialogue.length){ const line=dialogue[0]; ctx.fillStyle='rgba(10,16,28,0.88)'; roundRect(W()/2-320,H()-170,640,44,10); ctx.fill(); ctx.fillStyle='#ffe9a8'; ctx.font='italic 14px system-ui'; ctx.textAlign='center'; ctx.fillText(line,W()/2,H()-142); }
  drawMinimap();
}
function drawTitle(){
  ctx.fillStyle='#0b1220'; ctx.fillRect(0,0,W(),H());
  // skyline silhouette
  ctx.fillStyle='#16233d'; for(let i=0;i<24;i++){ const bw=40+((i*37)%70), bh=90+((i*53)%190); ctx.fillRect(i*(W()/24),H()-bh-140,bw,bh); }
  ctx.fillStyle='#1f6fb2'; ctx.fillRect(0,H()-140,W(),140);
  ctx.fillStyle='#ffd54a'; ctx.font='bold 14px system-ui'; ctx.textAlign='center'; ctx.fillText('AN ORIGINAL OPEN-WORLD CRIME GAME  •  NOT AFFILIATED WITH ROCKSTAR GAMES',W()/2,64);
  ctx.fillStyle='#fff'; ctx.font='bold 72px system-ui'; ctx.fillText('PORT MERIDIAN',W()/2,170);
  ctx.fillStyle='#5dade2'; ctx.font='bold 22px system-ui'; ctx.fillText('Rook Vane • Mara Kestrel\'s crew • Five jobs. One harbour. No way back.',W()/2,210);
  ctx.fillStyle='#cdd7e1'; ctx.font='15px system-ui';
  ctx.fillText('Drive the city, steal cars, dodge the harbour police, and finish all five missions.',W()/2,250);
  ctx.fillText('WASD move / drive  •  E enter & steal cars  •  Mouse aim, Click / F shoot  •  Space handbrake / punch',W()/2,278);
  ctx.fillText('P pause  •  M sound  •  Progress saves automatically (localStorage)',W()/2,306);
  const cx=W()/2, cy=H()/2;
  ctx.fillStyle='#ffd54a'; roundRect(cx-140,cy+90,280,52,10); ctx.fill(); ctx.fillStyle='#111'; ctx.font='bold 19px system-ui'; ctx.fillText('▶  START GAME',cx,cy+123);
  if(saveData){ ctx.fillStyle='#2ecc71'; roundRect(cx-140,cy+156,280,52,10); ctx.fill(); ctx.fillStyle='#111'; ctx.fillText('↻  CONTINUE  ($'+saveData.cash+', job '+(saveData.missionIdx+1)+'/5)',cx,cy+189); }
  ctx.fillStyle='#3498db'; roundRect(cx-140,cy+(saveData?222:156),280,52,10); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillText('⟳  NEW GAME',cx,cy+(saveData?255:189));
  ctx.fillStyle='#7f8c8d'; ctx.font='12px system-ui'; ctx.fillText('Missions: First Delivery • Lose the Heat • Three Drops • The Getaway • The Harbour Heist',cx,H()-52);
  ctx.fillText('All art, names, story and sound are original creations for this bounty entry.',cx,H()-32);
}
function drawOverlay(title,sub,btn1,btn2){
  ctx.fillStyle='rgba(5,8,16,0.82)'; ctx.fillRect(0,0,W(),H());
  ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font='bold 56px system-ui'; ctx.fillText(title,W()/2,H()/2-70);
  ctx.fillStyle='#cdd7e1'; ctx.font='17px system-ui'; ctx.fillText(sub,W()/2,H()/2-24);
  const cx=W()/2, cy=H()/2;
  ctx.fillStyle='#ffd54a'; roundRect(cx-140,cy+30,280,52,10); ctx.fill(); ctx.fillStyle='#111'; ctx.font='bold 18px system-ui'; ctx.fillText(btn1,cx,cy+63);
  if(btn2){ ctx.fillStyle='#3498db'; roundRect(cx-140,cy+100,280,52,10); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillText(btn2,cx,cy+133); }
}
function render(){
  ctx.clearRect(0,0,W(),H());
  if(state==='title'){ drawTitle(); return; }
  drawWorld(); drawHUD();
  if(state==='pause') drawOverlay('PAUSED','Take a breath, Rook. The city waits.','▶  RESUME','↩  TITLE SCREEN');
  if(state==='busted') drawOverlay('BUSTED',bustedReason+'  Cash $'+cash+'  •  Jobs done '+missionsDone+'/5','↻  TRY AGAIN','↩  TITLE SCREEN');
  if(state==='wasted') drawOverlay('WASTED',bustedReason+'  Cash $'+cash+'  •  Jobs done '+missionsDone+'/5','↻  TRY AGAIN','↩  TITLE SCREEN');
  if(state==='complete') drawOverlay('CREW LEGEND','All five jobs done. The harbour is yours, Rook. Final cash $'+cash+'.','⟳  PLAY AGAIN',null);
}
// --- main loop ---
let last=performance.now();
function loop(t){ const dt=Math.min(0.05,(t-last)/1000); last=t; if(state==='play') update(dt); render(); requestAnimationFrame(loop); }

// --- screenshot / test hooks (?shot=drive|chase|mission|start|busted) ---
const qs=new URLSearchParams(location.search);
function applyShot(){
  const shot=qs.get('shot'); if(!shot) return;
  if(shot==='start'){ state='title'; return; }
  startGame(false);
  if(shot==='drive'){ const c=cars.find(x=>x.parked); if(c){ c.parked=false; player.car=c; player.onFoot=false; player.x=c.x; player.y=c.y; engineStart(); } player.x=1200; player.y=1200; if(player.car){ player.car.x=1200; player.car.y=1200; player.car.angle=0; player.car.speed=200; } }
  if(shot==='chase'){ player.x=2000; player.y=1600; wanted=3; heat=90; spawnPolice(3);
    police.forEach((pc,i)=>{ const a=i*2.1+0.5; pc.x=player.x+Math.cos(a)*300; pc.y=player.y+Math.sin(a)*300; pc.speed=200; }); }
  if(shot==='mission'){ startMission(0); player.x=800; player.y=800; const c=cars.find(x=>x.parked); if(c){ c.parked=false; player.car=c; player.onFoot=false; player.x=800; player.y=800; player.car&&(player.car.x=800,player.car.y=800); } }
  if(shot==='busted'){ state='busted'; bustedReason='Busted! The Port Meridian police hauled you in.'; }
  cam.x=player.x-W()/2; cam.y=player.y-H()/2;
}
resetWorld();
applyShot();
requestAnimationFrame(loop);
// test / automation handle (used by the entry's own play-tests, not by players)
window.__PM={ get state(){return state}, get player(){return player}, get wanted(){return wanted}, get cash(){return cash},
  get mission(){return mission}, get missionsDone(){return missionsDone}, get cars(){return cars}, get police(){return police},
  startGame, startMission, addWanted, tryEnterExitCar, shoot, saveGame, resetWorld,
  teleport(x,y){ player.x=x; player.y=y; if(player.car){ player.car.x=x; player.car.y=y; } },
  setWanted(n){ wanted=n; heat=n*30; if(n===0) police=[]; },
  setHealth(n){ health=n; } };
