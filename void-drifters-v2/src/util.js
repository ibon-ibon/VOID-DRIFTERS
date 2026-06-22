export const rand = (a,b)=> a + Math.random()*(b-a);
export const clamp = (v,a,b)=> Math.max(a,Math.min(b,v));
export const dist = (a,b)=> Math.hypot(a.x-b.x, a.y-b.y);
export const TAU = Math.PI*2;

let toastTimer=0;
export function toast(msg, ms=1300){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('show'), ms);
}

export function dmgFloat(x,y,txt,crit=false, canvasEl){
  const layer = document.getElementById('dmg-floats');
  const rect = canvasEl.getBoundingClientRect();
  const sx = rect.left + (x / canvasEl.width) * rect.width;
  const sy = rect.top + (y / canvasEl.height) * rect.height;
  const d = document.createElement('div');
  d.className = 'dmg-float' + (crit ? ' crit':'');
  d.textContent = txt;
  d.style.left = sx+'px';
  d.style.top = sy+'px';
  layer.appendChild(d);
  setTimeout(()=>d.remove(),700);
}

export function saveJSON(key, obj){ localStorage.setItem(key, JSON.stringify(obj)); }
export function loadJSON(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback }catch(e){ return fallback } }
