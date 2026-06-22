export const keys = {};
export const mouse = {x:320,y:180,down:false};

window.addEventListener('keydown', e=>{
  keys[e.code]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e=> keys[e.code]=false);

export function initMouse(canvas, W, H){
  canvas.addEventListener('mousemove', e=>{
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (W / r.width);
    mouse.y = (e.clientY - r.top) * (H / r.height);
  });
  canvas.addEventListener('mousedown', ()=> mouse.down=true);
  window.addEventListener('mouseup', ()=> mouse.down=false);
  canvas.addEventListener('contextmenu', e=> e.preventDefault());
}

// Gamepads
export function getPad(i=0){ const gp=navigator.getGamepads?.()[i]; return gp && gp.connected ? gp : null; }

// Touch
export function initTouch(state){
  const touchWrap = document.getElementById('touch');
  const isTouch = ('ontouchstart' in window) || window.innerWidth < 860;
  if(isTouch) touchWrap.classList.remove('hidden');

  function makeStick(stickEl, nubEl, onMove){
    let activeId = null;
    let cx=0,cy=0,r=0;
    function updateRect(){ const b=stickEl.getBoundingClientRect(); cx=b.left+b.width/2; cy=b.top+b.height/2; r=b.width/2-10; }
    updateRect(); window.addEventListener('resize', updateRect);
    function handle(touch){
      const dx = touch.clientX - cx, dy = touch.clientY - cy;
      const len = Math.hypot(dx,dy);
      const k = len > r ? r/len : 1;
      const nx = dx*k, ny = dy*k;
      nubEl.style.transform = `translate(${nx}px, ${ny}px)`;
      onMove(nx/r, ny/r);
    }
    stickEl.addEventListener('touchstart', e=>{
      updateRect();
      const t = e.changedTouches[0]; activeId = t.identifier;
      handle(t); e.preventDefault();
    }, {passive:false});
    stickEl.addEventListener('touchmove', e=>{
      for(const t of e.changedTouches){ if(t.identifier===activeId){ handle(t); break; } }
      e.preventDefault();
    }, {passive:false});
    function end(e){
      for(const t of e.changedTouches){ if(t.identifier===activeId){
        activeId=null; nubEl.style.transform='translate(0,0)'; onMove(0,0); break;
      }}
    }
    stickEl.addEventListener('touchend', end);
    stickEl.addEventListener('touchcancel', end);
  }

  makeStick(document.getElementById('stickL'), document.getElementById('nubL'), (x,y)=>{ state.tMoveX=x; state.tMoveY=y; });
  makeStick(document.getElementById('stickR'), document.getElementById('nubR'), (x,y)=>{ state.tAimX=x; state.tAimY=y; });

  document.getElementById('tDash').addEventListener('touchstart', e=>{ state.tDash=true; e.preventDefault(); });
  document.getElementById('tDash').addEventListener('touchend', e=>{ state.tDash=false; e.preventDefault(); });
  document.getElementById('tNova').addEventListener('touchstart', e=>{ state.tNova=true; e.preventDefault(); });
  const novaEnd = e=>{ state.tNova=false; e.preventDefault(); };
  document.getElementById('tNova').addEventListener('touchend', novaEnd);
  document.getElementById('tNova').addEventListener('touchcancel', novaEnd);
}
