// Ships, weapons, upgrades, enemies, biomes
export const SHIPS = [
  {id:'drifter', name:'DRIFTER', desc:'Сбалансирован. +1 оружие на старте.', color:'#3ef0ff',
   mods: p=>{ p.stats.fireRate *= 1.08 }},
  {id:'nova', name:'NOVA-X', desc:'Быстрый. Дэш чаще. Слабый корпус.', color:'#ff3e9a',
   mods: p=>{ p.stats.moveSpeed *= 1.22; p.stats.dashCd *= 0.62; p.stats.maxHp -= 18; }},
  {id:'tank', name:'BULWARK', desc:'Танк. +60 HP, медленный.', color:'#ffe64c',
   mods: p=>{ p.stats.maxHp += 60; p.stats.moveSpeed *= 0.84; }},
  {id:'sniper', name:'LANCER', desc:'Рейлган с самого начала. Криты.', color:'#8cffb1',
   mods: p=>{ p.weapon='rail'; p.stats.crit += .15 }},
  {id:'swarm', name:'HORNET', desc:'Начинает с дроном.', color:'#b56aff',
   mods: p=>{ p.drones = 1 }},
  {id:'gambler', name:'JOKER', desc:'Рандомные стартовые перки x3', color:'#ff8a3e',
   mods: p=>{ p.gambler=true }},
];

export const WEAPONS = {
  blaster:  {name:'BLASTER', rate:5.7, dmg:1.0, speed:1, spread:0.035, bullets:1},
  spread:   {name:'SCATTER', rate:4.9, dmg:0.78, speed:1, spread:0.30, bullets:5},
  laser:    {name:'PULSE LASER', rate:9.8, dmg:0.60, speed:1.38, spread:0.012, bullets:1, pierce:2},
  rail:     {name:'RAILGUN', rate:2.18, dmg:3.45, speed:1.72, spread:0.005, bullets:1, pierce:99},
  rockets:  {name:'ROCKETS', rate:3.25, dmg:1.88, speed:0.9, spread:0.07, bullets:1, explosive:true},
  plasma:   {name:'PLASMA', rate:6.6, dmg:0.92, speed:1.12, spread:0.05, bullets:1, dot: true},
  shard:    {name:'SHARD THROWER', rate:7.3, dmg:0.55, speed:1.25, spread:0.18, bullets:3, pierce:1},
  tesla:    {name:'TESLA ARC', rate:5.15, dmg:0.84, speed:1.45, spread:0.09, bullets:1, chain:3},
  minigun:  {name:'MINIGUN', rate:14.5, dmg:0.41, speed:1.35, spread:0.11, bullets:1},
  beam:     {name:'FOCUS BEAM', rate:11.2, dmg:0.48, speed:2.2, spread:0.004, bullets:1, pierce:5},
  boomerang:{name:'BOOMERANG', rate:3.7, dmg:1.55, speed:0.95, spread:0.02, bullets:1, boomerang:true},
  flak:     {name:'FLAK CANNON', rate:2.9, dmg:2.3, speed:0.82, spread:0.14, bullets:7, explosive:true},
};

export const UPGRADE_POOL = [
  {id:'firerate', name:'УСКОРИТЕЛЬ', desc:'+22% скорострельность', rarity:'common', apply:p=>p.stats.fireRate*=1.22},
  {id:'dmg', name:'КРИСТАЛЛ УРОНА', desc:'+18% урон', rarity:'common', apply:p=>p.stats.bulletDmg*=1.18},
  {id:'speed', name:'ИОННЫЕ ДВИГАТЕЛИ', desc:'+14% скорость', rarity:'common', apply:p=>p.stats.moveSpeed*=1.14},
  {id:'hp', name:'НАНО-КОРПУС', desc:'+28 HP, полное лечение', rarity:'common', apply:p=>{p.stats.maxHp+=28; p.maxHp=p.stats.maxHp; p.hp=p.maxHp;}},
  {id:'magnet', name:'ГРАВ-МАГНИТ', desc:'Радиус подбора x1.85', rarity:'common', apply:p=>p.stats.pickupRadius*=1.85},
  {id:'multishot', name:'ДВОЙНОЙ СТВОЛ', desc:'+1 снаряд', rarity:'rare', apply:p=>p.stats.bullets++},
  {id:'crit', name:'ТАРГЕТ-КОМП', desc:'+18% крит шанс', rarity:'rare', apply:p=>p.stats.crit+=0.18},
  {id:'dashplus', name:'ФАЗОВЫЙ ДЭШ', desc:'-35% КД дэша', rarity:'rare', apply:p=>p.stats.dashCd*=0.65},
  {id:'bouncer', name:'РИКОШЕТ', desc:'Пули отскакивают', rarity:'rare', apply:p=>p.perks.add('bounce')},
  {id:'vamp', name:'ВАМПИРИЗМ', desc:'4% урона → HP', rarity:'epic', apply:p=>p.perks.add('vamp')},
  {id:'drone', name:'ДРОН-ТУРЕЛЬ', desc:'+1 боевой дрон', rarity:'epic', apply:p=>p.drones=(p.drones||0)+1},
  {id:'overclock', name:'ОВЕРКЛОК • ЛЕГЕНДА', desc:'+55% ROF, +30% DMG, -12 HP', rarity:'legendary', apply:p=>{p.stats.fireRate*=1.55; p.stats.bulletDmg*=1.30; p.stats.maxHp=Math.max(44,p.stats.maxHp-12); p.maxHp=p.stats.maxHp; p.hp=Math.min(p.hp,p.maxHp);}},
  {id:'adrenaline', name:'АДРЕНАЛИН', desc:'Чем меньше HP, тем быстрее стреляешь', rarity:'epic', apply:p=>p.perks.add('adrenaline')},
  {id:'shield_regen', name:'ЩИТ-РЕГЕН', desc:'Регенерация 3 HP/с вне боя', rarity:'rare', apply:p=>p.perks.add('regen')},
  {id:'explosive_rounds', name:'ВЗРЫВНЫЕ', desc:'Все пули взрываются (маленький AOE)', rarity:'epic', apply:p=>p.perks.add('explosive_all')},
  {id:'homing', name:'САМОНАВЕДЕНИЕ', desc:'Пули слабо наводятся', rarity:'epic', apply:p=>p.perks.add('homing')},
  {id:'ghost', name:'ФАНТОМНЫЕ', desc:'Пули проходят сквозь врагов (pierce+1)', rarity:'rare', apply:p=>p.pierceBonus=(p.pierceBonus||0)+1},
  {id:'luck', name:'СЧАСТЛИВЧИК', desc:'+15% к редкости дропа апгрейдов', rarity:'rare', apply:p=>p.luck=(p.luck||0)+0.15},
  {id:'thorns', name:'ШИПЫ', desc:'Контактный урон по врагам', rarity:'common', apply:p=>p.perks.add('thorns')},
  {id:'second_wind', name:'ВТОРОЕ ДЫХАНИЕ', desc:'1 раз за бой воскресаешь с 40% HP', rarity:'legendary', apply:p=>p.perks.add('second_wind')},
  // Weapon unlocks
  {id:'w_spread', name:'ОРУЖИЕ: SCATTER', desc:'Дробовик', rarity:'rare', apply:p=>{p.weapon='spread'; p.weaponSlots.add('spread')}},
  {id:'w_laser', name:'ОРУЖИЕ: PULSE LASER', desc:'Быстрый пробивной', rarity:'epic', apply:p=>{p.weapon='laser'; p.weaponSlots.add('laser')}},
  {id:'w_rail', name:'ОРУЖИЕ: RAILGUN', desc:'Пробивает всё', rarity:'epic', apply:p=>{p.weapon='rail'; p.weaponSlots.add('rail')}},
  {id:'w_rockets', name:'ОРУЖИЕ: ROCKETS', desc:'AOE ракеты', rarity:'epic', apply:p=>{p.weapon='rockets'; p.weaponSlots.add('rockets')}},
  {id:'w_plasma', name:'ОРУЖИЕ: PLASMA', desc:'DOT горение', rarity:'rare', apply:p=>{p.weapon='plasma'; p.weaponSlots.add('plasma')}},
  {id:'w_tesla', name:'ОРУЖИЕ: TESLA', desc:'Цепные молнии', rarity:'epic', apply:p=>{p.weapon='tesla'; p.weaponSlots.add('tesla')}},
  {id:'w_minigun', name:'ОРУЖИЕ: MINIGUN', desc:'Безумный ROF', rarity:'rare', apply:p=>{p.weapon='minigun'; p.weaponSlots.add('minigun')}},
  {id:'w_beam', name:'ОРУЖИЕ: FOCUS BEAM', desc:'Луч, pierce 5', rarity:'epic', apply:p=>{p.weapon='beam'; p.weaponSlots.add('beam')}},
  {id:'w_shard', name:'ОРУЖИЕ: SHARD', desc:'3 осколка, pierce', rarity:'rare', apply:p=>{p.weapon='shard'; p.weaponSlots.add('shard')}},
  {id:'w_boomerang', name:'ОРУЖИЕ: BOOMERANG', desc:'Возвратные диски', rarity:'epic', apply:p=>{p.weapon='boomerang'; p.weaponSlots.add('boomerang')}},
  {id:'w_flak', name:'ОРУЖИЕ: FLAK', desc:'7 взрывных осколков', rarity:'legendary', apply:p=>{p.weapon='flak'; p.weaponSlots.add('flak')}},
];

export const BIOMES = [
  { id:'nebula', name:'ТУМАННОСТЬ V-9', bg:'#070a19', tint:'#3ef0ff', enemies:['grub','shooter','dasher'] },
  { id:'asteroids', name:'ПОЯС КРОН', bg:'#13101a', tint:'#ff8a3e', enemies:['shooter','tank','dasher','spinner'] },
  { id:'core', name:'ЯДРО ПУСТОТЫ', bg:'#0d0616', tint:'#ff3e9a', enemies:['tank','dasher','weaver','shooter','spinner'] },
];

export const ENEMY_DEFS = {
  grub:    { hp:18, speed:68, dmg:13, r:6, color:'#ff6a6a', score:30, behavior:'chase' },
  shooter: { hp:26, speed:42, dmg:9,  r:7, color:'#ffb347', score:35, behavior:'shooter' },
  dasher:  { hp:21, speed:98, dmg:16, r:6, color:'#ff3ea8', score:38, behavior:'dasher' },
  tank:    { hp:82, speed:29, dmg:22, r:10, color:'#b56aff', score:68, behavior:'tank' },
  spinner: { hp:32, speed:56, dmg:12, r:7, color:'#3effc8', score:44, behavior:'spinner' },
  weaver:  { hp:44, speed:52, dmg:14, r:8, color:'#ffe64c', score:52, behavior:'weaver' },
};

export const BOSS_DEFS = [
  {id:'eye', name:'OKO БЕЗДНЫ', hp:540},
  {id:'hive', name:'УЛЕЙ-МАТКА', hp:620},
  {id:'ram', name:'ТАРАН-ЛЕВИАФАН', hp:700},
  {id:'weaver_lord', name:'ТКАЧ', hp:780},
  {id:'twin', name:'БЛИЗНЕЦЫ VOID', hp:460, twin:true},
];

export const META_UPGRADES = [
  {id:'m_hp', name:'Усиленный корпус I-III', max:3, cost: n=> 3 + n*2, apply:(save,n)=>{}},
  {id:'m_dmg', name:'Калибровка орудий I-III', max:3, cost: n=> 3 + n*2, apply:()=>{}},
  {id:'m_xp', name:'Ускоренное обучение I-II', max:2, cost: n=> 4 + n*3, apply:()=>{}},
  {id:'m_reroll', name:'Реролл апгрейдов', max:1, cost: ()=>6, apply:()=>{}},
  {id:'m_drone_start', name:'Стартовый дрон', max:1, cost: ()=>8, apply:()=>{}},
  {id:'m_luck', name:'Интуиция пилота', max:2, cost: n=> 5 + n*3, apply:()=>{}},
];
