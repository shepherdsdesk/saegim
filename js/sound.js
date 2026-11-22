// 새김 — 대전 소리 (음원 파일 없이 브라우저에서 직접 만드는 효과음·배경 음악)
let ctx = null, master = null, bgmGain = null, sfxGain = null;
let opts = { sfx: true, bgm: true, volume: 0.7 };
let muted = (() => { try { return localStorage.getItem('saegim-mute') === '1'; } catch (e) { return false; } })();
let bgmTimer = null, bgmState = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.connect(ctx.destination);
  sfxGain = ctx.createGain(); sfxGain.connect(master);
  bgmGain = ctx.createGain(); bgmGain.connect(master);
  applyVol();
  return ctx;
}
function applyVol() {
  if (!master) return;
  master.gain.value = muted ? 0 : opts.volume;
  sfxGain.gain.value = opts.sfx ? 1 : 0;
  bgmGain.gain.value = opts.bgm ? 0.55 : 0;
}
export const Sound = {
  configure(o) { opts = { ...opts, ...(o || {}) }; applyVol(); },
  unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); },
  get muted() { return muted; },
  toggleMute() { muted = !muted; try { localStorage.setItem('saegim-mute', muted ? '1' : '0'); } catch (e) {} ensure(); applyVol(); return muted; },
  vibrate(p) { try { if (navigator.vibrate && opts.sfx && !muted) navigator.vibrate(p); } catch (e) {} },

  /* ── 효과음 ── */
  join() { blip(880, 1320, 0.09, 'sine', 0.25); },
  start() { [523, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.3, i * 0.11)); },
  tick(fast) { tone(fast ? 1400 : 1000, 0.05, 'square', fast ? 0.12 : 0.08); },
  click() { tone(1600, 0.03, 'square', 0.12); },
  correct() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'triangle', 0.22, i * 0.07)); },
  wrong() { [330, 262].forEach((f, i) => tone(f, 0.26, 'sawtooth', 0.12, i * 0.14, 1800)); },
  reveal(rate) { rate >= 0.5 ? this.correct() : this.wrong(); },
  fanfare() {
    const seq = [[392, 0], [523, 0.16], [659, 0.32], [784, 0.48], [659, 0.72], [784, 0.86]];
    seq.forEach(([f, t]) => brass(f, t === 0.86 ? 0.9 : 0.2, t));
    [523, 659, 784].forEach((f) => tone(f, 1.4, 'triangle', 0.12, 0.86));
  },
  theme(t, strong = false) {
    if (t === '여리고 성벽') { trumpet(strong); setTimeout(() => crash(strong ? 1.6 : 0.7), strong ? 900 : 500); }
    else if (t === '다윗과 골리앗') { whoosh(); setTimeout(() => thud(strong), 380); }
    else if (t === '홍해 건너기') wave(strong ? 2.4 : 1.4);
    else if (t === '갈멜산 제단') fire(strong ? 2.2 : 1.0);
    else if (t === '노아의 방주') rain(strong ? 2.6 : 1.4);
    else coin(strong);
  },

  /* ── 배경 음악 ── */
  bgm(theme, mode = 'play') {
    const c = ensure(); if (!c) return;
    const key = theme + '|' + mode; if (bgmState === key) return;
    this.stopBgm(); bgmState = key;
    const sc = SCALES[theme] || SCALES['아케이드'];
    const bpm = mode === 'lobby' ? sc.bpm * 0.8 : sc.bpm;
    const step = 60 / bpm / 2; let next = c.currentTime + 0.1; let n = 0;
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const schedule = () => {
      while (next < c.currentTime + 0.4) {
        const bar = Math.floor(n / 8) % sc.prog.length; const root = sc.prog[bar];
        if (n % 8 === 0) pad(midi(sc.base + root), step * 8, next);
        if (n % 2 === 0 || rnd() > 0.55) {
          const deg = sc.scale[Math.floor(rnd() * sc.scale.length)];
          pluck(midi(sc.base + 12 + root + deg), step * (rnd() > 0.7 ? 2 : 1), next, sc.wave);
        }
        if (mode === 'play' && n % 4 === 0) tick2(next);
        next += step; n++;
      }
    };
    schedule(); bgmTimer = setInterval(schedule, 120);
  },
  stopBgm() { clearInterval(bgmTimer); bgmTimer = null; bgmState = null; }
};

/* ── 테마별 음계 (직접 만든 단순한 반복 선율) ── */
const SCALES = {
  '여리고 성벽': { base: 50, bpm: 92, scale: [0, 2, 3, 7, 9], prog: [0, 5, 3, 7], wave: 'triangle' },
  '다윗과 골리앗': { base: 48, bpm: 100, scale: [0, 2, 4, 7, 9], prog: [0, 7, 5, 7], wave: 'triangle' },
  '홍해 건너기': { base: 53, bpm: 84, scale: [0, 2, 4, 7, 9], prog: [0, 5, 9, 7], wave: 'sine' },
  '갈멜산 제단': { base: 45, bpm: 96, scale: [0, 3, 5, 7, 10], prog: [0, 3, 5, 3], wave: 'triangle' },
  '노아의 방주': { base: 55, bpm: 76, scale: [0, 2, 4, 7, 9], prog: [0, 9, 5, 7], wave: 'sine' },
  '어린 양 달리기': { base: 60, bpm: 116, scale: [0, 2, 4, 7, 9], prog: [0, 5, 7, 5], wave: 'triangle' },
  '아케이드': { base: 57, bpm: 128, scale: [0, 3, 5, 7, 10], prog: [0, 0, 5, 7], wave: 'square' }
};
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

/* ── 소리 만들기 ── */
function env(g, t, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(f, dur, type = 'sine', vol = 0.2, delay = 0, lp = 0) {
  const c = ensure(); if (!c || !opts.sfx || muted) return;
  const t = c.currentTime + delay; const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.value = f; env(g, t, 0.01, dur, vol);
  let node = o; if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
  node.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + dur + 0.05);
}
function blip(f1, f2, dur, type, vol) {
  const c = ensure(); if (!c || !opts.sfx || muted) return;
  const t = c.currentTime; const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  env(g, t, 0.005, dur, vol); o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + dur + 0.05);
}
function brass(f, dur, delay) {
  const c = ensure(); if (!c || !opts.sfx || muted) return;
  const t = c.currentTime + delay; const o = c.createOscillator(); const g = c.createGain(); const fl = c.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(800, t); fl.frequency.linearRampToValueAtTime(2600, t + 0.08);
  const lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 4; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.1);
  env(g, t, 0.03, dur, 0.16); o.connect(fl); fl.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + dur + 0.1);
}
function noise(dur, delay, { type = 'lowpass', f = 1200, f2 = null, q = 0.7, vol = 0.3, a = 0.01 } = {}) {
  const c = ensure(); if (!c || !opts.sfx || muted) return;
  const t = c.currentTime + delay; const len = Math.ceil(c.sampleRate * (dur + 0.1));
  const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf; const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain(); env(g, t, a, dur, vol); s.connect(fl); fl.connect(g); g.connect(sfxGain); s.start(t); s.stop(t + dur + 0.1);
}
function trumpet(strong) { [[392, 0, 0.18], [392, 0.2, 0.18], [523, 0.4, strong ? 0.9 : 0.45]].forEach(([f, d, l]) => brass(f, l, d)); }
function crash(dur) { noise(dur, 0, { f: 900, f2: 120, vol: 0.5, a: 0.005 }); tone(55, dur, 'sine', 0.35, 0, 0); }
function whoosh() { noise(0.35, 0, { type: 'bandpass', f: 400, f2: 3000, q: 1.2, vol: 0.35 }); }
function thud(strong) { tone(strong ? 60 : 90, strong ? 0.8 : 0.3, 'sine', 0.5); noise(0.2, 0, { f: 300, vol: 0.25 }); }
function wave(dur) { noise(dur, 0, { f: 300, f2: 900, vol: 0.28, a: dur / 2.5 }); }
function fire(dur) { noise(dur, 0, { type: 'highpass', f: 1800, vol: 0.12, a: 0.2 }); for (let i = 0; i < dur * 14; i++) noise(0.02, Math.random() * dur, { type: 'bandpass', f: 2500 + Math.random() * 2000, q: 3, vol: 0.25 }); }
function rain(dur) { noise(dur, 0, { type: 'highpass', f: 3000, vol: 0.14, a: 0.4 }); for (let i = 0; i < dur * 10; i++) tone(2000 + Math.random() * 1500, 0.03, 'sine', 0.04, Math.random() * dur); }
function coin(strong) { blip(988, 1319, 0.08, 'square', 0.15); if (strong) setTimeout(() => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.12, 'square', 0.1, i * 0.08)), 120); }
function pad(f, dur, t) {
  const c = ensure(); if (!c || !opts.bgm || muted) return;
  [1, 1.5, 2].forEach((m) => { const o = c.createOscillator(); const g = c.createGain(); o.type = 'sine'; o.frequency.value = f * m;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035 / m, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bgmGain); o.start(t); o.stop(t + dur + 0.05); });
}
function pluck(f, dur, t, type) {
  const c = ensure(); if (!c || !opts.bgm || muted) return;
  const o = c.createOscillator(); const g = c.createGain(); const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = type === 'square' ? 1800 : 2600;
  o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(type === 'square' ? 0.03 : 0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);
  o.connect(fl); fl.connect(g); g.connect(bgmGain); o.start(t); o.stop(t + dur);
}
function tick2(t) {
  const c = ensure(); if (!c || !opts.bgm || muted) return;
  const o = c.createOscillator(); const g = c.createGain(); o.type = 'triangle'; o.frequency.value = 90;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g); g.connect(bgmGain); o.start(t); o.stop(t + 0.15);
}
