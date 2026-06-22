let ctx = null;
let sfxGain, musicGain;
let musicOn = true;
let musicTimer = null;

export function initAudio(){
  if(ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  sfxGain = ctx.createGain(); sfxGain.gain.value = 0.30; sfxGain.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(ctx.destination);
  startMusic();
}

export function resume(){ try{ ctx && ctx.resume(); }catch(e){} }

function beep(freq=440, time=0.09, type='square', vol=0.5, slide=0){
  if(!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(38, freq+slide), ctx.currentTime + time);
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time);
  o.connect(g); g.connect(sfxGain);
  o.start(); o.stop(ctx.currentTime + time);
}

export function sfx(name){
  if(!ctx) return;
  const F = {
    shoot: ()=> beep(800+Math.random()*90, .07, 'square', .38, -300),
    shoot2: ()=> beep(520, .08, 'sawtooth', .33, 120),
    hit: ()=> beep(170, .07, 'sawtooth', .44, -80),
    pickup: ()=> { beep(620,.078,'square',.38); setTimeout(()=>beep(940,.1,'square',.34),64); },
    levelup: ()=> [523,659,784,1046].forEach((f,i)=> setTimeout(()=>beep(f,.1,'square',.42), i*60)),
    boom: ()=> { beep(118,.22,'sawtooth',.5,-50); beep(68,.3,'triangle',.32); },
    dash: ()=> beep(330,.12,'sawtooth',.34, 440),
    boss: ()=> { for(let i=0;i<3;i++) setTimeout(()=>beep(158-i*20,.2,'sawtooth',.48), i*88)},
    heal: ()=> { beep(540,.11,'triangle',.4); setTimeout(()=>beep(720,.12,'triangle',.35),90)},
    buy: ()=> beep(880,.12,'square',.4,180),
    no: ()=> beep(210,.13,'square',.35,-60),
  };
  (F[name]||(()=>{}))();
}

function startMusic(){
  if(!ctx) return;
  const bpm = 126;
  const beat = 60/bpm;
  const steps = 32;
  const bassSeq = [36,36,43,36, 38,38,43,41, 36,36,43,36, 41,41,46,43];
  const arpSeq = [60,63,67,72, 67,63,60,67, 62,65,69,74, 69,65,72,67];
  const now = ctx.currentTime + 0.05;
  const nodes=[];
  for(let s=0;s<steps;s++){
    const t = now + s*beat*0.5;
    if(s%2===0){
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type='square';
      const midi=bassSeq[(s>>1)%bassSeq.length];
      o.frequency.value=440*Math.pow(2,(midi-69)/12);
      g.gain.setValueAtTime(0.0001,t);
      g.gain.linearRampToValueAtTime(0.7,t+0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t+beat*0.44);
      o.connect(g); g.connect(musicGain); o.start(t); o.stop(t+beat*0.48); nodes.push(o);
    }
    const o2=ctx.createOscillator(), g2=ctx.createGain();
    o2.type='triangle';
    const midi2 = arpSeq[s % arpSeq.length] + (s>15?12:0);
    o2.frequency.value=440*Math.pow(2,(midi2-69)/12);
    g2.gain.setValueAtTime(0.0001,t);
    g2.gain.linearRampToValueAtTime(0.26,t+0.01);
    g2.gain.exponentialRampToValueAtTime(0.001,t+0.16);
    o2.connect(g2); g2.connect(musicGain); o2.start(t); o2.stop(t+0.18); nodes.push(o2);
    if(s%4===0){
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type='sine'; o.frequency.setValueAtTime(108,t); o.frequency.exponentialRampToValueAtTime(41,t+0.1);
      g.gain.setValueAtTime(.85,t); g.gain.exponentialRampToValueAtTime(.001,t+.13);
      o.connect(g); g.connect(musicGain); o.start(t); o.stop(t+.14); nodes.push(o);
    }
  }
  const total = steps*beat*0.5;
  clearTimeout(musicTimer);
  musicTimer = setTimeout(()=>{ if(musicOn) startMusic(); }, total*1000 - 30);
}

export function toggleMusic(){
  musicOn = !musicOn;
  if(musicGain) musicGain.gain.value = musicOn ? 0.16 : 0;
  return musicOn;
}
