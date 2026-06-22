import { initAudio, resume, sfx, toggleMusic } from './audio.js';
import { keys, mouse, getPad, initMouse, initTouch } from './input.js';
import { toast, saveJSON, loadJSON } from './util.js';
import { SHIPS, UPGRADE_POOL, WEAPONS, BIOMES, META_UPGRADES } from './content.js';
import { makePlayer, getWeaponStats, cycleWeapon } from './player.js';
import { createGameState, playerShoot, doDash, doNova, hurtPlayer, updateGame, explode } from './game.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const W = canvas.width, H = canvas.height;

initMouse(canvas, W, H);

const touchState = { tMoveX:0, tMoveY:0, tAimX:0, tAimY:0, tDash:false, tNova:false };
initTouch(touchState);

let G = createGameState();
let gameState = 'title'; // title, play, levelup, shop, over, pause
let selectedShip = 'drifter';

let save = loadJSON('void_drifters_v2', { frags:0, meta:{}, best:0, shipsUnlocked:['drifter','nova'] });
save.meta ||= {}; save.frags ||= 0;

// ---- Hangar UI ----
function refreshHangar(){
  const wrap = document.getElementById('shipSelect');
  wrap.innerHTML='';
  SHIPS.forEach(s=>{
    const unlocked = (save.shipsUnlocked||[]).includes(s.id);
    const div = document.createElement('div');
    div.className = 'ship-card' + (s.id===selectedShip ? ' active':'' ) + (unlocked?'':' locked');
    div.innerHTML = `<h3 style="color:${s.color}">${s.name}</h3><div>${s.desc}</div><div class="tag">${unlocked ? 'ГОТОВ' : 'Разблокируй за 6 ⬢'}</div>`;
    div.onclick = ()=>{
      if(!unlocked){
        if(save.frags >= 6){ save.frags -=6; save.shipsUnlocked.push(s.id); saveJSON('void_drifters_v2', save); refreshHangar(); toast('Корабль разблокирован!'); sfx('buy'); }
        else { sfx('no'); toast('Нужно 6 фрагментов');}
        return;
      }
      selectedShip = s.id;
      refreshHangar();
    };
    wrap.appendChild(div);
  });

  document.getElementById('fragsCount').textContent = save.frags;
  // meta upgrades
  const metaEl = document.getElementById('metaUpgrades');
  metaEl.innerHTML='';
  META_UPGRADES.forEach(m=>{
    const lvl = save.meta[m.id]||0;
    const atMax = lvl >= m.max;
    const cost = atMax ? '-' : m.cost(lvl);
    const btn = document.createElement('button');
    btn.className='btn small ghost';
    btn.style.margin='3px';
    btn.textContent = `${m.name} [${lvl}/${m.max}] ${atMax?'MAX':'('+cost+'⬢)'}`;
    btn.onclick = ()=>{
      if(atMax) return;
      if(save.frags >= cost){ save.frags -= cost; save.meta[m.id] = lvl+1; saveJSON('void_drifters_v2', save); refreshHangar(); sfx('buy'); toast('Мета-ап улучшен'); }
      else { sfx('no'); toast('Мало фрагментов'); }
    };
    metaEl.appendChild(btn);
  });

  const rec = document.getElementById('recordsList');
  rec.innerHTML = `Лучший счёт: ${save.best||0}<br>Разблокировано кораблей: ${save.shipsUnlocked.length}/${SHIPS.length}<br>Фрагменты: ${save.frags} ⬢`;
}
refreshHangar();

// ---- Game flow ----
function startRun(coop=false, daily=false){
  initAudio(); resume();
  G = createGameState();
  if(daily){ G.runSeed = Math.floor(Date.now()/86400000); Math.random = mulberry32(G.runSeed); }
  G.players = [ makePlayer(0, W*0.38, H*0.58, selectedShip, save.meta) ];
  if(coop) G.players.push( makePlayer(1, W*0.62, H*0.58, 'nova', save.meta) );

  // gambler ship bonus
  G.players.forEach(p=>{
    const ship = SHIPS.find(s=>s.id===p.shipId);
    if(ship?.id==='gambler'){
      // grant 3 random upgrades
      for(let i=0;i<3;i++){
        const c = UPGRADE_POOL[Math.floor(Math.random()*UPGRADE_POOL.length)];
        try{ c.apply(p); }catch(e){}
      }
    }
  });

  gameState='play';
  hideOverlays();
  document.getElementById('hud-p2').style.opacity = coop ? '1' : '.38';
  updateHUD();
  // spawn first wave
  spawnWaveWrap();
  toast('ВЫЛЕТ! УДАЧИ, ДРИФТЕР');
}

function spawnWaveWrap(){
  const { spawnWave } = awaitImportGame();
  // actually we already imported spawnWave via createGameState? no, call via updateGame path
  // Simpler: let updateGame handle first spawn
  import('./game.js').then(m=> m.spawnWave(G));
}

async function awaitImportGame(){ return import('./game.js'); }

// HUD
function updateHUD(){
  const p1 = G.players[0];
  if(p1){
    document.getElementById('hp1').style.width = (100*p1.hp/p1.maxHp)+'%';
    document.getElementById('sp1').style.width = p1.special+'%';
    const ws = getWeaponStats(p1);
    document.getElementById('p1stats').textContent = `LVL ${p1.level} • ${ws.name} • x${p1.weaponSlots.size}`;
  }
  const p2 = G.players[1];
  if(p2){
    document.getElementById('hp2').style.width = (100*p2.hp/p2.maxHp)+'%';
    document.getElementById('sp2').style.width = p2.special+'%';
    document.getElementById('p2stats').textContent = `LVL ${p2.level} • ${getWeaponStats(p2).name}`;
  }
  const xpTarget = G.players.find(p=>p.alive) || G.players[0];
  if(xpTarget){
    document.getElementById('xpFill').style.width = (100 * xpTarget.xp / xpTarget.xpNeed) + '%';
    document.getElementById('xpLabel').textContent = 'LV ' + xpTarget.level;
  }
  const waveInSector = ((G.wave-1)%4)+1;
  const sector = Math.floor((G.wave-1)/4)+1;
  document.getElementById('waveText').textContent = `СЕКТОР ${sector}-${waveInSector}  ${BIOMES[G.biomeIdx % BIOMES.length].name}`;
  const t = Math.max(0, Math.ceil(G.arenaTime));
  document.getElementById('timerText').textContent = `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
}

// Level up
let levelupPlayer=null, pendingChoices=[], rerollsLeft=1;
function offerLevelUp(p){
  gameState='levelup';
  levelupPlayer=p;
  rerollsLeft = (save.meta.m_reroll ? 1 : 0);
  rollChoices();
  showLevelup();
}
function rollChoices(){
  const pool = [...UPGRADE_POOL];
  // filter out weapon duplicates already owned (still allow but lower)
  pendingChoices=[];
  const luck = (levelupPlayer.luck||0);
  for(let i=0;i<3;i++){
    let rarityRoll = Math.random() - luck*0.12;
    let rarity = rarityRoll < 0.56 ? 'common' : rarityRoll < 0.84 ? 'rare' : rarityRoll < 0.965 ? 'epic' : 'legendary';
    let candidates = pool.filter(u=>u.rarity===rarity);
    if(candidates.length===0) candidates = pool;
    const choice = candidates[Math.floor(Math.random()*candidates.length)];
    pendingChoices.push(choice);
    const idx = pool.indexOf(choice); if(idx>=0) pool.splice(idx,1);
  }
}
function showLevelup(){
  document.getElementById('ov-levelup').classList.remove('hidden');
  document.getElementById('luSubtitle').textContent = `P${levelupPlayer.id+1} • Уровень ${levelupPlayer.level} → ${levelupPlayer.level+1}`;
  document.getElementById('rerollInfo').textContent = rerollsLeft>0 ? `R - реролл (${rerollsLeft})` : '';
  const wrap = document.getElementById('upgradeCards');
  wrap.innerHTML='';
  pendingChoices.forEach((u,i)=>{
    const div=document.createElement('div');
    div.className='card rarity-'+u.rarity;
    div.innerHTML=`<div class="tag">${u.rarity.toUpperCase()} • [${i+1}]</div><h3>${u.name}</h3><p>${u.desc}</p>`;
    div.onclick=()=>pickUpgrade(i);
    wrap.appendChild(div);
  });
}
function pickUpgrade(idx){
  const p = levelupPlayer;
  const up = pendingChoices[idx];
  if(!up) return;
  up.apply(p);
  // track perk set already handled
  sfx('levelup');
  document.getElementById('ov-levelup').classList.add('hidden');
  gameState='play';
  updateHUD();
}

// Shop
function openShop(){
  gameState='shop';
  document.getElementById('ov-shop').classList.remove('hidden');
  const el = document.getElementById('shopItems');
  el.innerHTML='';
  const offers = [
    {name:'Ремкомплект', desc:'+55 HP', cost:2, buy:(ps)=>{ps.forEach(p=>p.hp=Math.min(p.maxHp,p.hp+55)); sfx('heal')}},
    {name:'Боезапас', desc:'+18% урон', cost:3, buy:(ps)=>{ps.forEach(p=>p.stats.bulletDmg*=1.18)}},
    {name:'Дрон', desc:'+1 дрон-турель', cost:4, buy:(ps)=>{ps[0].drones=(ps[0].drones||0)+1}},
    {name:'Смена оружия', desc:'Случайное новое оружие', cost:2, buy:(ps)=>{
      const keys = Object.keys(WEAPONS);
      const w = keys[Math.floor(Math.random()*keys.length)];
      ps.forEach(p=>{ p.weapon=w; p.weaponSlots.add(w); });
    }},
  ];
  offers.forEach(o=>{
    const div=document.createElement('div');
    div.className='card rarity-rare';
    div.innerHTML=`<div class="tag">${o.cost} ⬢ COIN</div><h3>${o.name}</h3><p>${o.desc}</p>`;
    div.onclick=()=>{
      if(G.coins >= o.cost){ G.coins -= o.cost; o.buy(G.players.filter(p=>p.alive)); sfx('buy'); toast('Куплено!'); openShop(); }
      else { sfx('no'); toast('Не хватает монет'); }
    };
    el.appendChild(div);
  });
}

function nextSector(){
  document.getElementById('ov-shop').classList.add('hidden');
  G.sector++;
  G.biomeIdx = (G.biomeIdx + 1) % BIOMES.length;
  G.arenaTime = 120;
  gameState='play';
  import('./game.js').then(m=> m.spawnWave(G));
  toast('Следующий сектор: ' + BIOMES[G.biomeIdx].name);
}

// Over
function endRun(won){
  gameState='over';
  const fragsEarned = Math.floor(G.kills/22) + (won?5:0) + Math.floor(G.wave/3);
  save.frags = (save.frags||0) + fragsEarned;
  if(G.score > (save.best||0)) save.best = G.score;
  saveJSON('void_drifters_v2', save);
  document.getElementById('ov-over').classList.remove('hidden');
  document.getElementById('overTitle').textContent = won ? 'СЕКТОР ЗАЧИЩЕН!' : 'КОРАБЛЬ УНИЧТОЖЕН';
  document.getElementById('overStats').innerHTML = `Волна ${G.wave} • Убито ${G.kills} • Счёт ${G.score} • Монет ${G.coins}`;
  document.getElementById('overRewards').textContent = `Получено фрагментов: +${fragsEarned} ⬢   Всего: ${save.frags}`;
  refreshHangar();
}

// Input helpers
function handleGlobalKeys(e){
  if(e.code==='KeyM'){ const on = toggleMusic(); toast(on?'MUSIC ON':'MUSIC OFF'); }
  if(e.code==='KeyF'){ const el=document.getElementById('app'); if(document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.(); }
  if(gameState==='title' && e.code==='Enter'){ startRun(false); }
  if(gameState==='over' && e.code==='KeyR'){ startRun(G.players.length>1); }
  if(gameState==='shop' && e.code==='Space'){ nextSector(); }
  if(gameState==='play' && e.code==='KeyP'){ togglePause(); }
  if(gameState==='levelup'){
    if(e.code==='Digit1') pickUpgrade(0);
    if(e.code==='Digit2') pickUpgrade(1);
    if(e.code==='Digit3') pickUpgrade(2);
    if(e.code==='KeyR' && rerollsLeft>0){ rerollsLeft--; rollChoices(); showLevelup(); }
  }
}
window.addEventListener('keydown', handleGlobalKeys);

function togglePause(){
  if(gameState==='play'){ gameState='pause'; toast('ПАУЗА - P чтобы продолжить'); }
  else if(gameState==='pause'){ gameState='play'; }
}

function hideOverlays(){
  document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden'));
}

// UI buttons
document.getElementById('btnPlay').onclick = ()=> startRun(false);
document.getElementById('btnCoop').onclick = ()=> startRun(true);
document.getElementById('btnDaily').onclick = ()=> startRun(false, true);
document.getElementById('btnRetry').onclick = ()=> startRun(G.players.length>1);
document.getElementById('btnToHangar').onclick = ()=> { hideOverlays(); document.getElementById('ov-title').classList.remove('hidden'); gameState='title'; refreshHangar(); };
document.getElementById('btnNextSector').onclick = nextSector;

// ---- Main loop ----
let last = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  let dt = Math.min(0.033, (now-last)/1000);
  last = now;
  if(G.hitstop>0){ G.hitstop -= dt; render(ctx,G,W,H); return; }
  if(gameState==='play'){
    // join P2
    if(G.players.length===1 && (keys['ArrowUp']||keys['ArrowDown']||keys['ArrowLeft']||keys['ArrowRight'])){
      G.players.push(makePlayer(1, G.players[0].x+30, G.players[0].y, 'nova', save.meta));
      document.getElementById('hud-p2').style.opacity='1';
      toast('P2 JOINED!');
    }
    updatePlayers(dt);
    const res = updateGame(G, dt, {}, (ev)=>{
      if(ev==='boss'){ G.coins += 2; }
    }, canvas);
    if(res && res.shop){ openShop(); }

    // level up check (xp pickup triggers)
    G.players.forEach(p=>{
      if(!p.alive) return;
      // regen perk
      if(p.perks.has('regen')){
        p.outOfCombat = (p.outOfCombat||0) + dt;
        if(p.outOfCombat > 1.2) p.hp = Math.min(p.maxHp, p.hp + 3*dt);
      }
      while(p.xp >= p.xpNeed){
        p.xp -= p.xpNeed;
        p.level++;
        p.xpNeed = Math.floor(p.xpNeed * (save.meta.m_xp ? 1.30 : 1.38) + 6);
        offerLevelUp(p);
        break; // pause for pick
      }
    });

    updateHUD();

    if(G.players.every(p=>!p.alive)) endRun(false);
    if(G.wave > 14) endRun(true); // win
    if(G.arenaTime <= 0){
      // time over, spawn boss rush
      G.arenaTime = 999;
      toast('ВРЕМЯ ВЫШЛО - БОСС РАШ!');
    }
  }
  render(ctx, G, W, H);
}
requestAnimationFrame(frame);

function updatePlayers(dt){
  G.players.forEach((p, pi)=>{
    if(!p.alive) return;
    const pad = getPad(pi);
    let mx=0,my=0;
    if(pi===0){
      if(keys['KeyW']) my-=1; if(keys['KeyS']) my+=1;
      if(keys['KeyA']) mx-=1; if(keys['KeyD']) mx+=1;
      if(pad){ mx += pad.axes[0]||0; my += pad.axes[1]||0; }
      mx += touchState.tMoveX; my += touchState.tMoveY;
    } else {
      if(keys['ArrowUp']) my-=1; if(keys['ArrowDown']) my+=1;
      if(keys['ArrowLeft']) mx-=1; if(keys['ArrowRight']) mx+=1;
      if(pad){ mx += pad.axes[0]||0; my += pad.axes[1]||0; }
    }
    const len = Math.hypot(mx,my) || 1;
    if(len>0.15){ mx/=len; my/=len; } else { mx=0; my=0; }
    p.vx = mx * p.stats.moveSpeed;
    p.vy = my * p.stats.moveSpeed;
    if(p.dashTime>0){ p.dashTime -= dt; p.vx*=3.45; p.vy*=3.45; }
    p.x += p.vx*dt; p.y += p.vy*dt;
    p.x = Math.max(12, Math.min(W-12, p.x));
    p.y = Math.max(12, Math.min(H-12, p.y));

    // Aim
    let aimX=p.x+1, aimY=p.y-1, shooting=false;
    let weaponSwap = false;
    if(pi===0){
      aimX = mouse.x; aimY = mouse.y;
      shooting = mouse.down || keys['Space'];
      if(touchState.tAimX || touchState.tAimY){
        aimX = p.x + touchState.tAimX*150;
        aimY = p.y + touchState.tAimY*150;
        shooting = true;
      }
      if(keys['KeyE'] || touchState.tNova){ if(p.special>=100){ doNova(p,G); p.special=0; } }
      if((keys['ShiftLeft'] || touchState.tDash) && p.dashCooldown<=0 && (mx||my)){ doDash(p,mx,my,G); }
      if(keys['KeyQ'] && !p._qHeld){ cycleWeapon(p,1); toast(getWeaponStats(p).name); updateHUD(); }
      p._qHeld = !!keys['KeyQ'];
    } else {
      let ax=0, ay=0;
      if(keys['KeyI']) ay-=1; if(keys['KeyK']) ay+=1; if(keys['KeyJ']) ax-=1; if(keys['KeyL']) ax+=1;
      if(pad){ ax = pad.axes[2]||ax; ay = pad.axes[3]||ay; }
      if(Math.hypot(ax,ay)>0.28){ aimX = p.x + ax*140; aimY = p.y + ay*140; }
      else {
        let nearest=null, nd=9999;
        G.enemies.forEach(e=>{ const d=Math.hypot(e.x-p.x, e.y-p.y); if(d<nd){nd=d; nearest=e;}});
        if(nearest){ aimX=nearest.x; aimY=nearest.y; } else { aimX=p.x+mx*40||p.x+1; aimY=p.y+my*40; }
      }
      shooting = keys['Numpad0'] || (pad && pad.buttons[0]?.pressed);
      if((keys['Enter'] || (pad && pad.buttons[1]?.pressed)) && p.special>=100){ doNova(p,G); p.special=0; }
      if((keys['ShiftRight'] || (pad && pad.buttons[2]?.pressed)) && p.dashCooldown<=0 && (mx||my)){ doDash(p,mx,my,G); }
    }

    p.angle = Math.atan2(aimY - p.y, aimX - p.x);
    p.fireCooldown -= dt;
    p.dashCooldown -= dt;
    if(p.iframes>0) p.iframes -= dt;
    p.special = Math.min(100, p.special + dt*6.8);

    if(shooting && p.fireCooldown <= 0){
      playerShoot(p, aimX, aimY, G, canvas);
      p.outOfCombat = 0;
    } else {
      p.outOfCombat = (p.outOfCombat||0) + dt;
    }
  });
}

// simple seeded rng for daily
function mulberry32(a){ return function(){ let t=a+=0x6D2B79F5; t=Math.imul(t ^ t>>>15, t | 1); t ^= t + Math.imul(t ^ t>>>7, t |61); return ((t ^ t>>>14) >>>0) / 4294967296; } }

toast('VOID DRIFTERS v2 загружена', 1400);
</script>
</body>
</html>