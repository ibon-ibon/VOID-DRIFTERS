import { rand, clamp, dist, dmgFloat, toast } from './util.js';
import { ENEMY_DEFS, BOSS_DEFS, BIOMES, WEAPONS } from './content.js';
import { getWeaponStats } from './player.js';
import { sfx } from './audio.js';

export function createGameState(){
  return {
    players: [],
    bullets: [],
    enemyBullets: [],
    enemies: [],
    particles: [],
    pickups: [],
    drones: [],
    time: 0,
    shake: 0,
    hitstop: 0,
    wave: 1,
    sector: 1,
    biomeIdx: 0,
    enemiesToSpawn: 0,
    waveTimer: 0,
    score: 0,
    kills: 0,
    coins: 0,
    runSeed: Math.floor(Math.random()*1e9),
    arenaTime: 120,
  };
}

export function spawnWave(G){
  const waveInSector = ((G.wave-1) % 4) + 1;
  const isBoss = waveInSector === 4;
  if(isBoss){
    spawnBoss(G);
    G.enemiesToSpawn = 0;
    return;
  }
  const count = 10 + G.wave*3;
  G.enemiesToSpawn = count;
  G.waveTimer = 0;
}

function spawnEnemy(G, forcedType=null){
  const biome = BIOMES[G.biomeIdx % BIOMES.length];
  const pool = biome.enemies;
  const type = forcedType || pool[Math.floor(Math.random()*pool.length)];
  const def = ENEMY_DEFS[type];
  const edge = Math.floor(Math.random()*4);
  let x,y;
  const W=640, H=360;
  if(edge===0){ x=rand(20,W-20); y=-18; }
  else if(edge===1){ x=W+18; y=rand(20,H-20); }
  else if(edge===2){ x=rand(20,W-20); y=H+18; }
  else { x=-18; y=rand(20,H-20); }
  const hpScale = 1 + (G.wave-1)*0.22;
  const e = {
    type, x, y, vx:0, vy:0,
    hp: def.hp * hpScale, maxHp: def.hp * hpScale,
    r: def.r, speed: def.speed, dmg: def.dmg, color: def.color,
    cd: rand(0.35,1.4), t:0, behavior: def.behavior,
  };
  G.enemies.push(e);
}

function spawnBoss(G){
  const idx = Math.floor((G.wave)/4 - 1) % BOSS_DEFS.length;
  const bdef = BOSS_DEFS[idx < 0 ? 0 : idx];
  const boss = {
    type:'boss', bossId:bdef.id,
    x:320, y:72, vx:0, vy:0, r:26,
    hp: bdef.hp + G.wave*84, maxHp: bdef.hp + G.wave*84,
    speed: 35, cd:0, t:0,
    color:'#ffe64c',
    twin: !!bdef.twin
  };
  G.enemies.push(boss);
  if(boss.twin){
    const b2 = {...boss, x: boss.x+80};
    G.enemies.push(b2);
  }
  sfx('boss');
}

export function playerShoot(p, aimX, aimY, G, canvasEl){
  if(p.fireCooldown > 0) return;
  const w = getWeaponStats(p);
  p.fireCooldown = 1 / w.rate;
  const baseAng = Math.atan2(aimY - p.y, aimX - p.x);
  for(let i=0;i<w.bullets;i++){
    const spread = (i - (w.bullets-1)/2) * w.spread + rand(-w.spread*0.5, w.spread*0.5);
    const ang = baseAng + spread;
    const crit = Math.random() < p.stats.crit;
    G.bullets.push({
      x: p.x + Math.cos(ang)*10, y: p.y + Math.sin(ang)*10,
      vx: Math.cos(ang)*w.speed, vy: Math.sin(ang)*w.speed,
      dmg: w.dmg * (crit?2.45:1),
      pierce: w.pierce,
      explosive: w.explosive || p.perks.has('explosive_all'),
      chain: w.chain,
      dot: w.dot,
      boomerang: w.boomerang,
      boomerangT: 0,
      owner: p.id,
      life: 1.45,
      crit,
      bounce: p.perks.has('bounce') ? 1 : 0,
      homing: p.perks.has('homing'),
    });
  }
  sfx(p.weapon === 'minigun' ? 'shoot2' : 'shoot');
  muzzle(G, p.x, p.y, baseAng, p.color);
}

function muzzle(G,x,y,ang,color){
  for(let i=0;i<5;i++){
    G.particles.push({x,y, vx:Math.cos(ang)*rand(20,92), vy:Math.sin(ang)*rand(20,92), life:.14, col:color, sz:1.6});
  }
}

export function explode(G,x,y,color='#ffdf7a', n=18, power=130){
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const sp = rand(power*0.45, power);
    G.particles.push({x,y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:rand(.33,.62), col:color, sz:rand(1.3,2.6)});
  }
}

export function doDash(p, mx, my, G){
  p.dashCooldown = p.stats.dashCd;
  p.dashTime = 0.18;
  p.iframes = 0.32;
  sfx('dash');
  explode(G, p.x, p.y, p.color, 10, 60);
}

export function doNova(p, G){
  sfx('boom');
  G.shake += 12;
  explode(G, p.x, p.y, '#ffffff', 42, 220);
  G.enemies.forEach(e=>{
    const d = dist(p,e);
    if(d < 158){ e.hp -= 105 * (1 - d/158); e.burn = (e.burn||0)+1.2; }
  });
  G.enemyBullets.length = 0;
  G.enemies.forEach(e=>{
    const dx = e.x - p.x, dy = e.y - p.y; const dl = Math.hypot(dx,dy)||1;
    e.x += dx/dl*26; e.y += dy/dl*26;
  });
  toast('NOVA BURST!');
}

export function hurtPlayer(p, dmg, G){
  if(p.iframes>0) return false;
  p.hp -= dmg;
  p.iframes = 0.88;
  p.outOfCombat = 0;
  sfx('hit');
  G.shake = Math.min(22, G.shake + 7);
  if(p.hp <= 0){
    if(p.perks.has('second_wind') && !p.secondWindUsed){
      p.secondWindUsed = true;
      p.hp = p.maxHp * 0.42;
      p.iframes = 1.8;
      explode(G, p.x, p.y, '#8affff', 28, 150);
      toast(`P${p.id+1} SECOND WIND!`);
      return false;
    }
    p.hp = 0; p.alive = false;
    explode(G, p.x, p.y, p.color, 34, 170);
    toast(`P${p.id+1} DOWN!`, 1400);
    return true;
  }
  return false;
}

export function updateGame(G, dt, playersInput, onKill, canvasEl){
  G.time += dt;
  G.arenaTime -= dt;

  // spawn logic
  if(G.enemiesToSpawn > 0){
    G.waveTimer -= dt;
    if(G.waveTimer <= 0){
      spawnEnemy(G);
      G.enemiesToSpawn--;
      G.waveTimer = Math.max(0.16, 0.68 - G.wave*0.032);
    }
  } else if(G.enemies.length===0){
    // wave clear
    G.wave++;
    const waveInSector = ((G.wave-1) % 4) + 1;
    if(waveInSector===1 && G.wave>1){
      // sector clear -> shop
      return { shop: true };
    }
    spawnWave(G);
    G.players.forEach(p=>{ if(p.alive){ p.hp = Math.min(p.maxHp, p.hp + 16); }});
  }

  // update players is done externally (movement/shooting)
  // Bullets
  G.bullets.forEach(b=>{
    if(b.homing){
      // find nearest enemy
      let best=null, bd=1e9;
      for(const e of G.enemies){ const d = dist(b,e); if(d<120 && d<bd){ bd=d; best=e; }}
      if(best){
        const ang = Math.atan2(best.y-b.y, best.x-b.x);
        const cur = Math.atan2(b.vy,b.vx);
        let diff = Math.atan2(Math.sin(ang-cur), Math.cos(ang-cur));
        const turn = clamp(diff, -2.8*dt, 2.8*dt);
        const spd = Math.hypot(b.vx,b.vy);
        const na = cur + turn;
        b.vx = Math.cos(na)*spd; b.vy = Math.sin(na)*spd;
      }
    }
    if(b.boomerang){
      b.boomerangT += dt;
      if(b.boomerangT > 0.38){
        // pull back toward owner
        const owner = G.players.find(pp=>pp.id===b.owner);
        if(owner){
          const ang = Math.atan2(owner.y - b.y, owner.x - b.x);
          b.vx += Math.cos(ang)*420*dt;
          b.vy += Math.sin(ang)*420*dt;
        }
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  });
  G.bullets = G.bullets.filter(b=> b.life>0 && b.x>-22 && b.x < 662 && b.y>-22 && b.y < 382);

  // enemy bullets
  G.enemyBullets.forEach(b=>{ b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt; });
  G.enemyBullets = G.enemyBullets.filter(b=> b.life>0);

  // Enemies
  const alivePlayers = G.players.filter(p=>p.alive);
  G.enemies.forEach(e=>{
    e.t += dt;
    // target nearest
    let target = alivePlayers[0];
    let best = 1e9;
    alivePlayers.forEach(p=>{ const d=dist(e,p); if(d<best){best=d; target=p;} });
    if(!target) return;
    const dx = target.x - e.x, dy = target.y - e.y;
    const dlen = Math.hypot(dx,dy) || 1;

    if(e.type==='boss'){
      e.x += Math.sin(G.time*1.15 + e.t)*30*dt;
      e.cd -= dt;
      const btype = e.bossId || 'eye';
      if(btype==='eye'){
        if(e.cd<=0){ e.cd=0.52; for(let k=0;k<12;k++){ const ang=(Math.PI*2/12)*k + G.time*0.9; G.enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*118,vy:Math.sin(ang)*118,life:3.4,dmg:13}); }}
      } else if(btype==='hive'){
        if(e.cd<=0){ e.cd=1.65; spawnEnemy(G, Math.random()<.6?'grub':'dasher'); spawnEnemy(G,'shooter'); }
      } else if(btype==='ram'){
        const ang=Math.atan2(dy,dx); e.vx=Math.cos(ang)*e.speed*1.95; e.vy=Math.sin(ang)*e.speed*1.95; e.x+=e.vx*dt; e.y+=e.vy*dt;
      } else if(btype==='weaver_lord'){
        if(e.cd<=0){ e.cd=0.95; for(let k=0;k<3;k++){ const ang=Math.atan2(dy,dx)+ (k-1)*0.22; G.enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*136,vy:Math.sin(ang)*136,life:3.2,dmg:14}); } }
      } else { // twin
        if(e.cd<=0){ e.cd=0.68; const ang=Math.atan2(dy,dx)+rand(-0.15,0.15); G.enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*142,vy:Math.sin(ang)*142,life:3.1,dmg:12}); }
      }
    } else {
      // normal behaviors
      let spd = e.speed;
      if(e.behavior==='dasher' && dlen < 140) spd *= 1.72;
      e.vx = dx/dlen * spd;
      e.vy = dy/dlen * spd;
      if(e.behavior==='spinner'){ e.vx += Math.cos(G.time*6 + e.t)*40*dt; e.vy += Math.sin(G.time*6 + e.t)*40*dt; }
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      e.cd -= dt;
      if((e.behavior==='shooter' || e.behavior==='tank' || e.behavior==='weaver') && e.cd<=0 && dlen < 240){
        e.cd = e.behavior==='tank' ? 1.2 : e.behavior==='weaver' ? 1.05 : 1.5;
        const shots = e.behavior==='weaver' ? 3 : 1;
        for(let s=0;s<shots;s++){
          const ang = Math.atan2(dy,dx) + (s- (shots-1)/2)*0.18 + rand(-0.06,0.06);
          const sp = e.behavior==='tank' ? 150 : 140;
          G.enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp, life:3.2, dmg: Math.round(e.dmg*0.72)});
        }
      }
    }

    // burn dot
    if(e.burn > 0){ e.burn -= dt; e.hp -= 18 * dt; if(Math.random()<.25) G.particles.push({x:e.x+rand(-4,4),y:e.y+rand(-4,4),vx:0,vy:-22,life:.28,col:'#ff8a3e',sz:1.3}); }

    // contact
    alivePlayers.forEach(p=>{
      if(p.iframes>0) return;
      if(dist(e,p) < e.r + p.r){
        hurtPlayer(p, e.dmg || 15, G);
        if(p.perks.has('thorns')){ e.hp -= 22; }
        const ang = Math.atan2(p.y - e.y, p.x - e.x);
        p.x += Math.cos(ang)*9; p.y += Math.sin(ang)*9;
        if(e.type!=='boss' && e.behavior!=='tank'){ e.hp -= 13; }
      }
    });
  });

  // bullets -> enemies
  for(const b of G.bullets){
    if(b.life<=0) continue;
    for(let i=G.enemies.length-1;i>=0;i--){
      const e = G.enemies[i];
      if(Math.hypot(b.x-e.x, b.y-e.y) < e.r + 3.2){
        e.hp -= b.dmg;
        if(b.dot) e.burn = (e.burn||0)+1.35;
        sfx('hit');
        if(canvasEl) dmgFloat(e.x, e.y-10, Math.round(b.dmg).toString(), b.crit, canvasEl);
        G.particles.push({x:b.x,y:b.y,vx:rand(-28,28),vy:rand(-28,28),life:.2,col:b.crit?'#fff68a':'#ffd27a',sz: b.crit?2.3:1.7});

        // vamp
        const owner = G.players.find(pp=>pp.id===b.owner);
        if(owner && owner.perks.has('vamp')){ owner.hp = Math.min(owner.maxHp, owner.hp + b.dmg*0.04); }
        if(owner) owner.special = Math.min(100, owner.special + 1.85);

        let hitConsumed = true;
        if(b.chain>0){
          // find next target
          let next=null, nd=999;
          G.enemies.forEach((e2,ii)=>{ if(ii===i) return; const d=dist(b,e2); if(d<88 && d<nd){nd=d; next=e2;}});
          if(next){
            const ang = Math.atan2(next.y - b.y, next.x - b.x);
            const spd = Math.hypot(b.vx,b.vy);
            b.vx = Math.cos(ang)*spd; b.vy=Math.sin(ang)*spd;
            b.chain--; hitConsumed = false;
            // lightning visual
            G.particles.push({x:(b.x+next.x)/2,y:(b.y+next.y)/2,vx:0,vy:0,life:.11,col:'#8cfdff',sz:2.2});
          }
        }
        if(b.explosive){
          explode(G, b.x, b.y, '#ff9a3e', 13, 108);
          G.enemies.forEach(e2=>{ if(dist({x:b.x,y:b.y}, e2) < 46) e2.hp -= b.dmg*0.52; });
        }
        if(b.pierce > 0){ b.pierce--; hitConsumed = false; }
        if(hitConsumed){
          if(b.bounce>0){
            b.vx *= -0.96; b.vy *= -0.96; b.life = 0.52; b.bounce--;
            hitConsumed = false;
          } else {
            b.life = 0;
          }
        }
        if(e.hp <= 0){
          killEnemy(G, e, b.owner, onKill);
          G.enemies.splice(i,1);
        }
        if(hitConsumed) break;
      }
    }
  }

  // enemy bullets -> players
  G.enemyBullets.forEach(b=>{
    alivePlayers.forEach(p=>{
      if(p.iframes>0) return;
      if(dist(b,p) < p.r + 3){
        hurtPlayer(p, b.dmg||12, G);
        b.life = 0;
      }
    });
  });

  // pickups
  G.pickups.forEach(pk=>{
    G.players.forEach(p=>{
      if(!p.alive) return;
      const d = dist(pk,p);
      if(d < p.stats.pickupRadius){
        const pull=195; pk.x += (p.x-pk.x)/Math.max(6,d) * pull * dt; pk.y += (p.y-pk.y)/Math.max(6,d) * pull * dt;
      }
      if(d < 9.5){
        pk.collected = true;
        if(pk.kind==='xp'){ p.xp += pk.val; sfx('pickup'); }
        else if(pk.kind==='hp'){ p.hp = Math.min(p.maxHp, p.hp + 28); sfx('heal'); }
        else if(pk.kind==='coin'){ G.coins++; sfx('buy'); }
      }
    });
    pk.t += dt;
    pk.y += Math.sin((pk.t+pk.x)*3.6)*11*dt;
  });
  G.pickups = G.pickups.filter(pk=>!pk.collected);

  // drones
  updateDrones(G, dt);

  // particles
  G.particles.forEach(pt=>{ pt.x += pt.vx*dt; pt.y += pt.vy*dt; pt.vx *= (1-dt*2.4); pt.vy *= (1-dt*2.4); pt.life -= dt; });
  G.particles = G.particles.filter(pt=>pt.life>0);

  return {};
}

function killEnemy(G, e, ownerId, onKill){
  G.kills++;
  const isBoss = e.type==='boss';
  G.score += isBoss ? 880 : (ENEMY_DEFS[e.type]?.score || 32);
  sfx('boom');
  explode(G, e.x, e.y, e.color, isBoss?56:20, isBoss?210:135);
  G.shake = Math.min(20, G.shake + (isBoss?14:5));
  G.hitstop = isBoss ? 0.075 : 0.027;

  const xpCount = isBoss ? 26 : (e.behavior==='tank'?5:3);
  for(let i=0;i<xpCount;i++) G.pickups.push({x:e.x+rand(-13,13), y:e.y+rand(-13,13), kind:'xp', val: isBoss?3:1, t:Math.random()*5, collected:false});
  if(Math.random() < 0.18) G.pickups.push({x:e.x, y:e.y, kind:'hp', t:0, collected:false});
  if(Math.random() < (isBoss?1:0.08)) G.pickups.push({x:e.x, y:e.y, kind:'coin', t:0, collected:false});

  if(isBoss){
    G.coins += 3;
    if(onKill) onKill('boss', e);
  }
}

function updateDrones(G, dt){
  // ensure drone count
  let desired = 0;
  G.players.forEach(p=>{ if(p.alive) desired += (p.drones||0); });
  while(G.drones.length < desired){
    G.drones.push({x:320,y:180, cd:0, owner:0});
  }
  while(G.drones.length > desired) G.drones.pop();

  let di=0;
  G.players.forEach(p=>{
    if(!p.alive) return;
    for(let n=0;n<(p.drones||0);n++){
      const d = G.drones[di++];
      if(!d) break;
      const orbit = G.time*2.6 + n*2.1;
      const tx = p.x + Math.cos(orbit)*28;
      const ty = p.y + Math.sin(orbit)*28;
      d.x += (tx - d.x)*9*dt;
      d.y += (ty - d.y)*9*dt;
      d.cd -= dt;
      if(d.cd<=0 && G.enemies.length){
        // nearest
        let best=null, bd=1e9;
        G.enemies.forEach(e=>{ const dd=dist(d,e); if(dd<bd){bd=dd; best=e;}});
        if(best && bd < 190){
          d.cd = 0.28;
          const ang = Math.atan2(best.y - d.y, best.x - d.x);
          G.bullets.push({x:d.x,y:d.y,vx:Math.cos(ang)*380,vy:Math.sin(ang)*380,dmg: p.stats.bulletDmg*0.55, pierce:0, explosive:false, owner:p.id, life:0.9, crit:false, bounce:0});
          sfx('shoot2');
        }
      }
      // draw in renderer
    }
  });
}
