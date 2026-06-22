import { WEAPONS, SHIPS } from './content.js';

export function makePlayer(id, x, y, shipId='drifter', meta={}){
  const ship = SHIPS.find(s=>s.id===shipId) || SHIPS[0];
  const p = {
    id, x, y, vx:0, vy:0, r:6,
    hp:100, maxHp:100, alive:true,
    angle: -Math.PI/2,
    fireCooldown:0, dashCooldown:0, dashTime:0, iframes:0,
    special: 65,
    color: ship.color,
    shipId,
    level:1, xp:0, xpNeed:18,
    weapon: 'blaster',
    weaponSlots: new Set(['blaster']),
    stats: {
      moveSpeed: 156,
      fireRate: 5.7,
      bulletSpeed: 352,
      bulletDmg: 12,
      spread: 0.035,
      bullets: 1,
      pickupRadius: 34,
      maxHp: 100,
      dashCd: 1.32,
      crit: 0.08,
    },
    perks: new Set(),
    drones: 0,
    pierceBonus: 0,
    luck: 0,
    secondWindUsed: false,
    outOfCombat: 0,
  };
  // meta bonuses
  const mhp = meta.m_hp || 0; p.stats.maxHp += mhp*14;
  const mdmg = meta.m_dmg || 0; p.stats.bulletDmg *= (1 + mdmg*0.06);
  p.maxHp = p.stats.maxHp; p.hp = p.maxHp;
  if(meta.m_drone_start) p.drones = (p.drones||0)+1;
  p.luck += (meta.m_luck || 0)*0.10;

  ship.mods(p);
  p.maxHp = p.stats.maxHp; p.hp = Math.min(p.hp, p.maxHp);

  if(p.gambler){
    p.gambler = false;
    // handled in main after creation
  }
  return p;
}

export function getWeaponStats(p){
  const w = WEAPONS[p.weapon] || WEAPONS.blaster;
  const adrenaline = p.perks.has('adrenaline') ? (1 + (1 - p.hp/p.maxHp)*0.75) : 1;
  return {
    rate: p.stats.fireRate * (w.rate/5.7) * adrenaline,
    dmg: p.stats.bulletDmg * w.dmg,
    speed: p.stats.bulletSpeed * w.speed,
    spread: p.stats.spread + w.spread,
    bullets: Math.max(w.bullets, p.stats.bullets),
    pierce: (w.pierce||0) + (p.pierceBonus||0),
    explosive: !!w.explosive,
    chain: w.chain||0,
    dot: !!w.dot,
    boomerang: !!w.boomerang,
    name: w.name
  };
}

export function cycleWeapon(p, dir=1){
  const list = Array.from(p.weaponSlots);
  if(list.length < 2) return;
  const idx = list.indexOf(p.weapon);
  p.weapon = list[(idx + dir + list.length) % list.length];
}
