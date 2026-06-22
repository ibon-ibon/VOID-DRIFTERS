import { BIOMES } from './content.js';

export function render(ctx, G, W, H){
  const sx = G.shake>0 ? (Math.random()*2-1)*G.shake : 0;
  const sy = G.shake>0 ? (Math.random()*2-1)*G.shake : 0;
  G.shake *= 0.86; if(G.shake < 0.22) G.shake = 0;

  ctx.save();
  ctx.translate(sx*0.55, sy*0.55);

  const biome = BIOMES[G.biomeIdx % BIOMES.length];
  ctx.fillStyle = biome.bg;
  ctx.fillRect(0,0,W,H);

  // stars parallax
  ctx.fillStyle='#cfe2ff';
  for(let i=0;i<110;i++){
    const x = (i*137.5 + G.time* (14 + (i%3)*8)) % W;
    const y = (i*241.7) % H;
    ctx.globalAlpha = 0.30 + 0.38 * Math.sin(G.time*2 + i);
    ctx.fillRect(x|0, y|0, 1, 1);
  }
  ctx.globalAlpha=1;

  // grid tint
  ctx.strokeStyle = hexToRgba(biome.tint, 0.052);
  ctx.lineWidth=1; ctx.beginPath();
  for(let x=0;x<W;x+=32){ ctx.moveTo(x,0); ctx.lineTo(x,H); }
  for(let y=0;y<H;y+=32){ ctx.moveTo(0,y); ctx.lineTo(W,y); }
  ctx.stroke();

  // pickups
  G.pickups.forEach(pk=>{
    ctx.fillStyle = pk.kind==='hp' ? '#3eff9a' : pk.kind==='coin' ? '#ffe64c' : '#ffe64c';
    const bob = Math.sin(pk.t*4)*1.25;
    if(pk.kind==='coin'){
      ctx.fillRect((pk.x-2)|0, (pk.y+bob-2)|0, 4,4);
      ctx.fillStyle='#fff8'; ctx.fillRect((pk.x-1)|0,(pk.y+bob-1)|0,2,2);
    } else {
      ctx.fillRect((pk.x-2)|0, (pk.y+bob-2)|0, 4,4);
      ctx.fillStyle='#fff'; ctx.fillRect((pk.x-1)|0,(pk.y+bob-1)|0,2,2);
    }
  });

  // enemy bullets
  ctx.fillStyle='#ff6a7a';
  G.enemyBullets.forEach(b=> ctx.fillRect(b.x-2,b.y-2,4,4));

  // player bullets
  G.bullets.forEach(b=>{ ctx.fillStyle = b.crit ? '#fff8c2' : '#e8f8ff'; ctx.fillRect(b.x-1.5,b.y-1.5,3,3); });

  // enemies
  G.enemies.forEach(e=>{
    ctx.save(); ctx.translate(e.x|0, e.y|0);
    if(e.hp < e.maxHp){
      ctx.fillStyle='#11172c'; ctx.fillRect(-13,-e.r-8,26,3);
      ctx.fillStyle='#ff5a6a'; ctx.fillRect(-13,-e.r-8,26*(e.hp/e.maxHp),3);
    }
    ctx.fillStyle = e.color;
    if(e.type==='boss'){
      ctx.fillRect(-24,-15,48,30);
      ctx.fillStyle='#fff6'; ctx.fillRect(-11,-6,22,5);
      ctx.fillStyle='#0b1028'; ctx.fillRect(-5,-2,10,6);
      ctx.fillStyle='#ffe64c'; ctx.fillRect(-2,0,4,2);
    } else {
      const s = e.r;
      ctx.fillRect(-s,-s,s*2,s*2);
      ctx.fillStyle='#0007'; ctx.fillRect(-s+2,-s+2,s*2-4,s*2-4);
    }
    ctx.restore();
  });

  // drones
  ctx.fillStyle='#8cffb1';
  G.drones.forEach(d=>{
    ctx.fillRect(d.x-2, d.y-2, 4,4);
    ctx.fillStyle='#103030'; ctx.fillRect(d.x-1,d.y-1,2,2);
    ctx.fillStyle='#8cffb1';
  });

  // players
  G.players.forEach(p=>{
    if(!p.alive) return;
    ctx.save(); ctx.translate(p.x|0,p.y|0); ctx.rotate(p.angle);
    const flick = p.iframes>0 ? Math.floor(G.time*24)%2===0 : true;
    if(flick){
      ctx.fillStyle = p.color;
      ctx.fillRect(-6,-5,12,10);
      ctx.fillStyle='#08102a'; ctx.fillRect(0,-2,3,4);
      ctx.fillStyle='#ffffffcc'; ctx.fillRect(-4,-2,2,2); ctx.fillRect(-4,1,2,2);
    }
    if(p.dashTime>0){ ctx.globalAlpha=.44; ctx.fillStyle=p.color; ctx.fillRect(-14,-4,7,8); ctx.globalAlpha=1;}
    ctx.restore();
    if(p.special >= 100){
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.52 + 0.34*Math.sin(G.time*8);
      ctx.beginPath(); ctx.arc(p.x,p.y,13,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=1;
    }
  });

  // particles
  G.particles.forEach(pt=>{
    ctx.globalAlpha = Math.max(0, Math.min(1, pt.life*2.2));
    ctx.fillStyle = pt.col;
    ctx.fillRect(pt.x|0, pt.y|0, pt.sz, pt.sz);
  });
  ctx.globalAlpha=1;
  ctx.restore();
}

function hexToRgba(hex, a){
  const h = hex.replace('#','');
  const n = parseInt(h.length===3 ? h.split('').map(c=>c+c).join('') : h, 16);
  const r = (n>>16)&255, g=(n>>8)&255, b=n&255;
  return `rgba(${r},${g},${b},${a})`;
}
