// 새김 — TV 대전 움직임 (배경 입자, 색종이, 문제 등장, 순위 이동)
// 외부 라이브러리 없이 캔버스와 CSS로만 움직입니다
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────── 배경 입자: 테마마다 다른 움직임 ───────── */
const AMB = {
  '여리고 성벽': { n: 70, kind: 'dust', color: ['rgba(233,185,94,', 'rgba(255,220,160,'] },
  '다윗과 골리앗': { n: 26, kind: 'leaf', color: ['rgba(216,194,122,', 'rgba(155,211,165,'] },
  '홍해 건너기': { n: 60, kind: 'bubble', color: ['rgba(160,210,255,', 'rgba(240,184,104,'] },
  '갈멜산 제단': { n: 80, kind: 'ember', color: ['rgba(255,170,70,', 'rgba(255,110,50,'] },
  '노아의 방주': { n: 120, kind: 'rain', color: ['rgba(46,109,158,'] },
  '아케이드': { n: 90, kind: 'star', color: ['rgba(56,225,255,', 'rgba(255,79,163,', 'rgba(255,255,255,'] },
  '어린 양 달리기': { n: 30, kind: 'petal', color: ['rgba(255,143,163,', 'rgba(255,209,92,', 'rgba(255,255,255,'] }
};
let amb = null;
export function ambient(theme) {
  stopAmbient();
  if (reduce) return;
  const cfg = AMB[theme]; if (!cfg) return;
  const cv = document.createElement('canvas'); cv.className = 'fx-amb'; cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const ctx = cv.getContext('2d'); let W = 0, H = 0; const dpr = Math.min(2, devicePixelRatio || 1);
  const size = () => { W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; };
  size(); addEventListener('resize', size);
  const R = (a, b) => a + Math.random() * (b - a);
  const mk = (init) => {
    const k = cfg.kind; const p = { c: cfg.color[Math.floor(Math.random() * cfg.color.length)], x: R(0, W), y: init ? R(0, H) : (k === 'bubble' || k === 'ember' ? H + 10 : -10), t: R(0, 6.28) };
    if (k === 'dust') Object.assign(p, { r: R(1, 3.2) * dpr, vx: R(-.15, .35) * dpr, vy: R(-.12, .12) * dpr, a: R(.15, .5) });
    if (k === 'leaf' || k === 'petal') Object.assign(p, { r: R(4, 8) * dpr, vx: R(.2, .8) * dpr, vy: R(.4, 1) * dpr, a: R(.35, .75), rot: R(0, 6.28), vr: R(-.03, .03) });
    if (k === 'bubble') Object.assign(p, { r: R(2, 9) * dpr, vx: 0, vy: -R(.3, 1.1) * dpr, a: R(.15, .45) });
    if (k === 'ember') Object.assign(p, { r: R(1, 3) * dpr, vx: R(-.3, .3) * dpr, vy: -R(.5, 1.6) * dpr, a: R(.5, 1), life: R(.6, 1) });
    if (k === 'rain') Object.assign(p, { r: R(10, 22) * dpr, vx: -1.2 * dpr, vy: R(7, 11) * dpr, a: R(.12, .3) });
    if (k === 'star') Object.assign(p, { r: R(.6, 2.2) * dpr, vx: 0, vy: R(.05, .25) * dpr, a: R(.2, 1) });
    return p;
  };
  const ps = Array.from({ length: cfg.n }, () => mk(true));
  let raf = 0; let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(3, (now - last) / 16.7); last = now;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]; p.t += 0.02 * dt;
      p.x += (p.vx + (cfg.kind === 'bubble' ? Math.sin(p.t) * .4 * dpr : 0)) * dt; p.y += p.vy * dt;
      let a = p.a;
      if (cfg.kind === 'star') a = p.a * (0.5 + 0.5 * Math.sin(p.t * 3));
      if (cfg.kind === 'ember') { p.life -= 0.004 * dt; a = Math.max(0, p.life); }
      ctx.fillStyle = p.c + a + ')'; ctx.strokeStyle = p.c + a + ')';
      if (cfg.kind === 'rain') { ctx.lineWidth = 1.2 * dpr; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 2, p.y + p.r); ctx.stroke(); }
      else if (cfg.kind === 'bubble') { ctx.lineWidth = 1.2 * dpr; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke(); }
      else if (cfg.kind === 'leaf' || cfg.kind === 'petal') { p.rot += p.vr * dt; ctx.save(); ctx.translate(p.x + Math.sin(p.t) * 12 * dpr, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .5, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
      if (p.y < -30 || p.y > H + 30 || p.x < -40 || p.x > W + 40 || (cfg.kind === 'ember' && p.life <= 0)) ps[i] = mk(false);
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  amb = { stop() { cancelAnimationFrame(raf); removeEventListener('resize', size); cv.remove(); } };
}
export function stopAmbient() { if (amb) { amb.stop(); amb = null; } }

/* ───────── 색종이 (터지기 · 쏟아지기) ───────── */
let top = null;
function topLayer() {
  if (top) return top;
  const cv = document.createElement('canvas'); cv.className = 'fx-top'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv);
  const ctx = cv.getContext('2d'); const dpr = Math.min(2, devicePixelRatio || 1);
  const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }; size(); addEventListener('resize', size);
  const parts = []; let running = false;
  const loop = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.vy += p.g; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, p.life / 30);
      ctx.fillStyle = p.c;
      if (p.shape === 0) ctx.fillRect(-p.s, -p.s * .45, p.s * 2, p.s * .9);
      else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.s * .7, 0, 6.283); ctx.fill(); }
      else { ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = k * 1.2566 - 1.5708; ctx.lineTo(Math.cos(a) * p.s, Math.sin(a) * p.s); ctx.lineTo(Math.cos(a + .628) * p.s * .45, Math.sin(a + .628) * p.s * .45); } ctx.fill(); }
      ctx.restore();
      if (p.life <= 0 || p.y > cv.height + 40) parts.splice(i, 1);
    }
    if (parts.length) requestAnimationFrame(loop); else { running = false; ctx.clearRect(0, 0, cv.width, cv.height); }
  };
  top = { dpr, add(list) { parts.push(...list); if (!running) { running = true; requestAnimationFrame(loop); } } };
  return top;
}
const PALETTE = ['#FFC83D', '#FF7A45', '#4CAF6A', '#4DABF7', '#F783AC', '#9775FA', '#FFFFFF'];
export function burst(x, y, n = 90, colors = PALETTE) {
  if (reduce) return;
  const L = topLayer(); const d = L.dpr; const list = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283; const sp = (4 + Math.random() * 10) * d;
    list.push({ x: x * d, y: y * d, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6 * d, g: .28 * d, s: (4 + Math.random() * 6) * d, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, c: colors[i % colors.length], shape: i % 3, life: 90 + Math.random() * 60 });
  }
  L.add(list);
}
export function rain(sec = 4, colors = PALETTE) {
  if (reduce) return;
  const L = topLayer(); const d = L.dpr; const end = Date.now() + sec * 1000;
  const drop = () => {
    const list = [];
    for (let i = 0; i < 14; i++) list.push({ x: Math.random() * innerWidth * d, y: -20 * d, vx: (Math.random() - .5) * 2 * d, vy: (2 + Math.random() * 3) * d, g: .05 * d, s: (5 + Math.random() * 6) * d, rot: Math.random() * 6, vr: (Math.random() - .5) * .2, c: colors[Math.floor(Math.random() * colors.length)], shape: i % 3, life: 400 });
    L.add(list);
    if (Date.now() < end) setTimeout(drop, 120);
  };
  drop();
}
export function burstAt(el, n) { if (!el) return; const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, n); }

/* ───────── 큰 글씨 등장 (문제 번호 · 카운트다운) ───────── */
export function intro(big, small = '', ms = 1100) {
  return new Promise((res) => {
    if (reduce) return res();
    const el = document.createElement('div'); el.className = 'fx-intro';
    el.innerHTML = `<div class="fi-card"><span class="fi-small">${small}</span><b class="fi-big">${big}</b></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('out'), ms - 280);
    setTimeout(() => { el.remove(); res(); }, ms);
  });
}
export async function countdown(onTick) {
  for (const n of ['3', '2', '1']) { onTick && onTick(n); await intro(n, '준비', 760); }
  onTick && onTick('go'); await intro('시작!', '말씀 대전', 820);
}

/* ───────── 떠오르는 점수 ───────── */
export function floatText(el, text, cls = '') {
  if (!el || reduce) return;
  const r = el.getBoundingClientRect(); const f = document.createElement('span');
  f.className = 'fx-float ' + cls; f.textContent = text;
  f.style.left = r.right - 10 + 'px'; f.style.top = r.top + r.height / 2 + 'px';
  document.body.appendChild(f); setTimeout(() => f.remove(), 1600);
}

/* ───────── 순위 자리 바꾸기 (FLIP) ───────── */
export function flipCapture(sel) {
  const m = new Map(); document.querySelectorAll(sel).forEach((e) => m.set(e.dataset.id, e.getBoundingClientRect().top)); return m;
}
export function flipPlay(sel, before) {
  if (reduce || !before) return;
  document.querySelectorAll(sel).forEach((e) => {
    const was = before.get(e.dataset.id); const now = e.getBoundingClientRect().top;
    if (was == null) { e.animate([{ opacity: 0, transform: 'translateX(2vw)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'ease-out' }); return; }
    const dy = was - now; if (Math.abs(dy) < 2) return;
    if (dy > 0) e.classList.add('up');
    e.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 900, delay: 350, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    setTimeout(() => e.classList.remove('up'), 2400);
  });
}

/* ───────── 숫자 올라가기 ───────── */
export function countUp(el, from, to, ms = 900) {
  if (!el) return; if (reduce || from === to) { el.textContent = to.toLocaleString('ko-KR'); return; }
  const t0 = performance.now();
  const step = (now) => { const k = Math.min(1, (now - t0) / ms); const e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e).toLocaleString('ko-KR'); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
