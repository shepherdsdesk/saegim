// 새김 — 휴대폰 학습·복습·대전의 움직임 (가볍게, 라이브러리 없이)
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const isKid = () => !!document.documentElement.dataset.mode;

// 단추 자리에서 작은 색종이 터지기
export function sparkle(el, n) {
  if (!el || reduce()) return;
  const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
  const kid = isKid(); n = n ?? (kid ? 26 : 14);
  const cs = getComputedStyle(document.documentElement);
  const colors = kid ? ['#FFC83D', '#FF7A45', '#4CAF6A', '#4DABF7', '#F783AC', '#9775FA'] : [cs.getPropertyValue('--ac').trim() || '#B5693B', cs.getPropertyValue('--ok').trim() || '#2E6A4F', '#E8C9A0'];
  const box = document.createElement('div'); box.className = 'mo-burst'; box.style.left = cx + 'px'; box.style.top = cy + 'px';
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'); const a = (i / n) * 6.283 + Math.random() * .4; const d = (kid ? 70 : 46) + Math.random() * (kid ? 60 : 30);
    s.style.setProperty('--x', Math.cos(a) * d + 'px'); s.style.setProperty('--y', Math.sin(a) * d - 18 + 'px');
    s.style.background = colors[i % colors.length]; if (i % 3 === 0) s.style.borderRadius = '50%';
    s.style.animationDelay = Math.random() * 60 + 'ms';
    box.appendChild(s);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 900);
}
// 글자 떠오르기 (+점수, 3연속!)
export function floatUp(el, text, cls = '') {
  if (!el || reduce()) return;
  const r = el.getBoundingClientRect(); const f = document.createElement('span');
  f.className = 'mo-float ' + cls; f.textContent = text;
  f.style.left = r.left + r.width / 2 + 'px'; f.style.top = r.top + 'px';
  document.body.appendChild(f); setTimeout(() => f.remove(), 1300);
}
// 위쪽에 잠깐 나타나는 칭찬 띠
export function cheer(text, sub = '') {
  if (reduce()) return;
  document.querySelectorAll('.mo-cheer').forEach((x) => x.remove());
  const c = document.createElement('div'); c.className = 'mo-cheer';
  c.innerHTML = `<span class="ck"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span><b>${text}</b>${sub ? `<em>${sub}</em>` : ''}`;
  document.body.appendChild(c); setTimeout(() => c.remove(), 1500);
}
// 숫자 올라가기
export function countUp(el, to, ms = 900, from = 0) {
  if (!el) return;
  if (reduce()) { el.textContent = to; return; }
  const t0 = performance.now(); el.textContent = from;
  const step = (now) => { const k = Math.min(1, (now - t0) / ms); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
// 말씀 단어를 하나씩 떠오르게 (이미 그려진 .w / .tile 에 순서값 넣기)
export function stagger(sel, root = document, gap = 28, max = 900) {
  if (reduce()) return;
  const els = root.querySelectorAll(sel); const g = Math.min(gap, max / Math.max(1, els.length));
  els.forEach((e, i) => { e.style.setProperty('--si', i); e.style.setProperty('--sg', g + 'ms'); e.classList.add('mo-in'); });
}
