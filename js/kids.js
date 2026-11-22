// 새김 — 놀이·탐험·도전 모드에서 쓰는 그림과 보상
// 그림은 모두 새로 그린 것입니다 (어와나 공식 그림·로고를 쓰지 않습니다)

/* ───────── 어린 양 '새김이' ───────── */
export function lambSVG(size = 96, mood = 'happy') {
  const mouth = mood === 'oops'
    ? '<path d="M54 76 q6 -5 12 0" fill="none" stroke="#6B3B2E" stroke-width="3" stroke-linecap="round"/><path d="M84 46 q4 6 0 9 q-4 -3 0 -9z" fill="#8FD3FF"/>'
    : mood === 'wow'
    ? '<ellipse cx="60" cy="74" rx="4.5" ry="5.5" fill="#6B3B2E"/>'
    : mood === 'think'
      ? '<path d="M55 74 h10" stroke="#6B3B2E" stroke-width="3" stroke-linecap="round"/>'
      : '<path d="M53 71 q7 7 14 0" fill="none" stroke="#6B3B2E" stroke-width="3" stroke-linecap="round"/>';
  const eyes = mood === 'cheer'
    ? '<path d="M44 60 q5 -6 10 0 M66 60 q5 -6 10 0" fill="none" stroke="#2B211C" stroke-width="3.2" stroke-linecap="round"/>'
    : '<circle cx="49" cy="60" r="4.2" fill="#2B211C"/><circle cx="71" cy="60" r="4.2" fill="#2B211C"/><circle cx="50.5" cy="58.5" r="1.4" fill="#fff"/><circle cx="72.5" cy="58.5" r="1.4" fill="#fff"/>';
  const puff = [[30, 40, 15], [46, 28, 16], [64, 26, 16], [82, 32, 15], [92, 50, 13], [26, 58, 13], [30, 82, 15], [50, 94, 15], [72, 94, 15], [90, 80, 15], [96, 64, 12]];
  return `<svg class="lamb ${mood}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="60" cy="112" rx="34" ry="5" fill="rgba(0,0,0,.08)"/>
    <rect x="40" y="96" width="9" height="14" rx="4.5" fill="#5A463C"/><rect x="71" y="96" width="9" height="14" rx="4.5" fill="#5A463C"/>
    ${puff.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#EADFD3" stroke-width="2"/>`).join('')}
    <circle cx="60" cy="62" r="34" fill="#fff"/>
    <ellipse cx="29" cy="58" rx="11" ry="6.5" transform="rotate(-25 29 58)" fill="#F5C9B0"/>
    <ellipse cx="91" cy="58" rx="11" ry="6.5" transform="rotate(25 91 58)" fill="#F5C9B0"/>
    <ellipse cx="60" cy="64" rx="24" ry="22" fill="#FFE8D6"/>
    <circle cx="48" cy="40" r="9" fill="#fff" stroke="#EADFD3" stroke-width="2"/><circle cx="60" cy="36" r="10" fill="#fff" stroke="#EADFD3" stroke-width="2"/><circle cx="72" cy="40" r="9" fill="#fff" stroke="#EADFD3" stroke-width="2"/>
    <g class="eyes">${eyes}</g>
    <circle cx="42" cy="70" r="4.5" fill="#FFB4A2" opacity=".75"/><circle cx="78" cy="70" r="4.5" fill="#FFB4A2" opacity=".75"/>
    ${mouth}
  </svg>`;
}

// 받침에 따라 '아/야'
export function callName(name) {
  const n = (name || '').trim(); const ch = n.charCodeAt(n.length - 1);
  if (ch >= 0xAC00 && ch <= 0xD7A3) return n + ((ch - 0xAC00) % 28 ? '아' : '야');
  return n;
}

/* ───────── 별 ───────── */
export const starsOf = (score) => (score >= 90 ? 3 : score >= 70 ? 2 : 1);
export function starSVG(on = true, size = 22) {
  return `<svg class="star ${on ? 'on' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
}
export const starsHTML = (n, size = 22) => `<span class="stars">${[0, 1, 2].map((i) => starSVG(i < n, size)).join('')}</span>`;

/* ───────── 스티커 (말씀마다 하나) ───────── */
const ST = [
  ['별', '#FFC83D', '<path d="M32 12l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L32 40.7l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8z" fill="#fff"/>'],
  ['하트', '#FF7A8A', '<path d="M32 47s-15-9-15-20a8 8 0 0 1 15-4 8 8 0 0 1 15 4c0 11-15 20-15 20z" fill="#fff"/>'],
  ['무지개', '#7CC6FE', '<path d="M14 42a18 18 0 0 1 36 0" fill="none" stroke="#FF7A6B" stroke-width="5"/><path d="M20 42a12 12 0 0 1 24 0" fill="none" stroke="#FFD15C" stroke-width="5"/><path d="M26 42a6 6 0 0 1 12 0" fill="none" stroke="#7BD389" stroke-width="5"/>'],
  ['해', '#FFA94D', '<circle cx="32" cy="32" r="9" fill="#fff"/><g stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M32 13v5M32 46v5M13 32h5M46 32h5M18.6 18.6l3.5 3.5M41.9 41.9l3.5 3.5M18.6 45.4l3.5-3.5M41.9 22.1l3.5-3.5"/></g>'],
  ['물고기', '#4DABF7', '<path d="M14 32c6-10 22-12 30 0-8 12-24 10-30 0z" fill="#fff"/><path d="M44 32l8-7v14z" fill="#fff"/><circle cx="23" cy="30" r="2" fill="#4DABF7"/>'],
  ['방주', '#B07D4F', '<path d="M12 36h40l-6 10H18z" fill="#fff"/><rect x="22" y="24" width="20" height="12" rx="2" fill="#fff"/><rect x="29" y="28" width="6" height="5" fill="#B07D4F"/>'],
  ['비둘기', '#91A7FF', '<path d="M16 34c8-1 12-8 20-8 5 0 8 3 9 6l6 1-6 3c-3 7-12 10-21 6l-8 4 3-7z" fill="#fff"/><path d="M30 30c-2-6 2-12 8-13-1 6-3 9-8 13z" fill="#fff" opacity=".8"/><circle cx="41" cy="31" r="1.6" fill="#91A7FF"/>'],
  ['등불', '#F59F00', '<path d="M24 44h16l-2-14c-1-6-11-6-12 0z" fill="#fff"/><path d="M32 22c3 3 3 6 0 8-3-2-3-5 0-8z" fill="#FFE066"/><rect x="22" y="44" width="20" height="4" rx="2" fill="#fff"/>'],
  ['왕관', '#FCC419', '<path d="M16 42l-2-18 10 8 8-12 8 12 10-8-2 18z" fill="#fff"/><rect x="16" y="43" width="32" height="5" rx="2" fill="#fff"/>'],
  ['꽃', '#F783AC', '<g fill="#fff"><circle cx="32" cy="22" r="7"/><circle cx="42" cy="30" r="7"/><circle cx="38" cy="41" r="7"/><circle cx="26" cy="41" r="7"/><circle cx="22" cy="30" r="7"/></g><circle cx="32" cy="32" r="5" fill="#FFD43B"/>'],
  ['구름', '#74C0FC', '<path d="M20 42a8 8 0 0 1 1-16 11 11 0 0 1 21-2 9 9 0 0 1 2 18z" fill="#fff"/>'],
  ['어린 양', '#A9E34B', '<g fill="#fff"><circle cx="24" cy="30" r="7"/><circle cx="32" cy="25" r="8"/><circle cx="40" cy="30" r="7"/><circle cx="26" cy="39" r="7"/><circle cx="38" cy="39" r="7"/></g><ellipse cx="32" cy="34" rx="7" ry="6.5" fill="#FFE8D6"/><circle cx="29.5" cy="33" r="1.4" fill="#2B211C"/><circle cx="34.5" cy="33" r="1.4" fill="#2B211C"/>']
];
export const STICKER_COUNT = ST.length;
export function stickerSVG(i, size = 64, on = true) {
  const [name, color, art] = ST[((i % ST.length) + ST.length) % ST.length];
  return `<svg class="sticker ${on ? '' : 'off'}" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="${name} 스티커"><circle cx="32" cy="32" r="29" fill="${on ? color : 'var(--line)'}"/><circle cx="32" cy="32" r="29" fill="none" stroke="#fff" stroke-width="3"/>${on ? art : '<text x="32" y="38" text-anchor="middle" font-size="18" font-weight="700" fill="var(--sub)">?</text>'}</svg>`;
}
export const stickerName = (i) => ST[((i % ST.length) + ST.length) % ST.length][0];

/* ───────── 탐험 지도: 10구절마다 한 곳 ───────── */
export const PLACES = ['에덴 동산', '아라랏 산', '갈대아 우르', '벧엘', '애굽', '홍해', '시내 산', '광야', '요단 강', '여리고', '실로', '베들레헴', '예루살렘', '갈릴리 바다', '가버나움', '골고다', '안디옥', '로마'];
export const PLACE_SIZE = 10;
export const placeOf = (idx) => PLACES[Math.floor(idx / PLACE_SIZE) % PLACES.length];
export function badgeSVG(i, size = 56, on = true) {
  const hue = (i * 47) % 360;
  const fill = on ? `hsl(${hue} 55% 46%)` : 'var(--line)';
  return `<svg class="badge ${on ? '' : 'off'}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4l24 10v18c0 14-10 24-24 28C18 56 8 46 8 32V14z" fill="${fill}"/><path d="M32 10l18 7.5V32c0 10.5-7.5 18-18 21-10.5-3-18-10.5-18-21V17.5z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>${on ? `<path d="M22 40l10-18 10 18z" fill="#fff"/><path d="M32 22v-6l7 3-7 3" fill="#fff"/>` : `<text x="32" y="39" text-anchor="middle" font-size="16" font-weight="700" fill="var(--sub)">?</text>`}</svg>`;
}

/* ───────── 레벨 ───────── */
// 1→2: 60점, 2→3: 120점 … (한 단계마다 60점씩 더)
export function levelOf(xp = 0) {
  let lv = 1, need = 60, base = 0;
  while (xp >= base + need) { base += need; lv++; need = 60 * lv; }
  return { lv, into: xp - base, need, pct: Math.round(((xp - base) / need) * 100) };
}
const EXPLORE_TITLES = ['새내기 탐험가', '길 찾는 탐험가', '지도 읽는 탐험가', '용감한 탐험가', '지혜로운 탐험가', '말씀 탐험 대장'];
export const exploreTitle = (lv) => EXPLORE_TITLES[Math.min(EXPLORE_TITLES.length - 1, Math.floor((lv - 1) / 2))];
const CHALLENGE_TITLES = ['Rookie', 'Runner', 'Climber', 'Keeper', 'Master', 'Legend'];
export const challengeTitle = (lv) => CHALLENGE_TITLES[Math.min(CHALLENGE_TITLES.length - 1, Math.floor((lv - 1) / 3))];

/* ───────── 색종이 ───────── */
export function confetti(n = 70) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const colors = ['#FF7A45', '#FFC83D', '#4CAF6A', '#4DABF7', '#F783AC', '#9775FA'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + '%';
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = Math.random() * 0.4 + 's';
    s.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
    s.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
    s.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    if (i % 3 === 0) s.style.borderRadius = '50%';
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3400);
}

/* ───────── 길 옆 장식 · 배경 장면 ───────── */
const DECO = {
  tree: '<svg viewBox="0 0 64 80" width="56" height="70"><rect x="28" y="50" width="8" height="24" rx="3" fill="#A0714F"/><circle cx="32" cy="34" r="22" fill="#58C26E"/><circle cx="20" cy="40" r="12" fill="#4CAF62"/><circle cx="44" cy="40" r="12" fill="#4CAF62"/><circle cx="26" cy="26" r="5" fill="#7AD98C"/></svg>',
  bush: '<svg viewBox="0 0 64 40" width="58" height="36"><circle cx="18" cy="26" r="13" fill="#5BBE70"/><circle cx="34" cy="20" r="16" fill="#6CCB80"/><circle cx="48" cy="27" r="12" fill="#5BBE70"/><circle cx="30" cy="16" r="3" fill="#FF8FA3"/><circle cx="44" cy="22" r="3" fill="#FFD15C"/></svg>',
  flower: '<svg viewBox="0 0 48 64" width="40" height="54"><path d="M24 30v30" stroke="#4CAF62" stroke-width="4" stroke-linecap="round"/><path d="M24 48c-8-2-12-8-12-12 6 0 11 4 12 12z" fill="#58C26E"/><g fill="#FF8FA3"><circle cx="24" cy="14" r="7"/><circle cx="34" cy="21" r="7"/><circle cx="30" cy="32" r="7"/><circle cx="18" cy="32" r="7"/><circle cx="14" cy="21" r="7"/></g><circle cx="24" cy="24" r="6" fill="#FFD15C"/></svg>',
  cloud: '<svg viewBox="0 0 80 44" width="72" height="40"><path d="M18 38a12 12 0 0 1 2-24 16 16 0 0 1 30-4 13 13 0 0 1 14 28z" fill="#fff" stroke="#E3EEF7" stroke-width="2"/></svg>',
  sheep: '<svg viewBox="0 0 64 50" width="56" height="44"><g fill="#fff" stroke="#EADFD3" stroke-width="1.5"><circle cx="20" cy="22" r="10"/><circle cx="32" cy="17" r="11"/><circle cx="44" cy="22" r="10"/><circle cx="26" cy="30" r="10"/><circle cx="40" cy="30" r="10"/></g><rect x="24" y="36" width="5" height="10" rx="2.5" fill="#5A463C"/><rect x="37" y="36" width="5" height="10" rx="2.5" fill="#5A463C"/><ellipse cx="52" cy="22" rx="8" ry="7" fill="#5A463C"/><circle cx="54" cy="21" r="1.4" fill="#fff"/></svg>',
  chest: '<svg viewBox="0 0 64 56" width="58" height="50"><rect x="8" y="22" width="48" height="28" rx="5" fill="#C98A3D"/><path d="M8 26c0-10 8-16 24-16s24 6 24 16z" fill="#E0A24F"/><rect x="8" y="24" width="48" height="5" fill="#9C6727"/><rect x="28" y="24" width="8" height="12" rx="2" fill="#FFD15C"/><path d="M14 14l3-5M50 14l-3-5M32 8V3" stroke="#FFD15C" stroke-width="2.5" stroke-linecap="round"/></svg>',
  mountain: '<svg viewBox="0 0 80 56" width="74" height="52"><path d="M2 54L30 12l12 18 8-10 28 34z" fill="#B9A77F"/><path d="M30 12l8 12-5-2-4 4-4-5-4 3z" fill="#fff"/><path d="M42 30l8-10 10 12z" fill="#A69369"/></svg>',
  palm: '<svg viewBox="0 0 64 80" width="54" height="68"><path d="M33 78c-2-18 0-34 3-46" stroke="#9C6B3F" stroke-width="5" fill="none" stroke-linecap="round"/><g fill="#3E9C74"><path d="M36 30c-10-10-24-8-30 0 10-4 20-2 30 0z"/><path d="M36 30c8-12 22-12 26-4-10-2-18 0-26 4z"/><path d="M36 30c-4-12 2-22 10-24-4 8-6 16-10 24z"/><path d="M36 30c-12 0-20 8-20 16 6-8 12-12 20-16z"/></g></svg>',
  tent: '<svg viewBox="0 0 72 52" width="66" height="48"><path d="M4 48L36 6l32 42z" fill="#D9A15B"/><path d="M36 6l-8 42h16z" fill="#8C5A2B"/><path d="M36 6v-4" stroke="#8C5A2B" stroke-width="2"/><path d="M37 2l8 3-8 3z" fill="#E0573F"/></svg>',
  scroll: '<svg viewBox="0 0 64 48" width="54" height="40"><rect x="10" y="8" width="44" height="32" rx="3" fill="#F6E7C6" stroke="#D8C08E" stroke-width="2"/><rect x="4" y="6" width="10" height="36" rx="5" fill="#C9A86A"/><rect x="50" y="6" width="10" height="36" rx="5" fill="#C9A86A"/><path d="M20 18h24M20 25h20M20 32h16" stroke="#B39A66" stroke-width="2" stroke-linecap="round"/></svg>'
};
export const decoSVG = (k) => `<span class="deco" aria-hidden="true">${DECO[k] || ''}</span>`;
export const PLAY_DECO = ['tree', 'flower', 'cloud', 'sheep', 'bush', 'flower', 'cloud', 'tree'];
export const EXPLORE_DECO = ['mountain', 'palm', 'tent', 'scroll', 'mountain', 'palm'];
export const UNIT_COLORS = [['#3DAA5C', '#2E8C4A'], ['#9B6BE8', '#7A4FCB'], ['#FF8A3D', '#D96A22'], ['#2F9BE0', '#1F7CB8'], ['#E8578E', '#C23B71'], ['#20A79A', '#16837A']];
// 홈 위쪽 장면: 하늘, 해, 구름, 언덕
export function sceneSVG() {
  return `<svg class="scene-bg" viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ED8FF"/><stop offset="1" stop-color="#DDF2FF"/></linearGradient></defs>
    <rect width="400" height="180" fill="url(#sky)"/>
    <g class="sun"><circle cx="350" cy="38" r="30" fill="#FFD95C" opacity=".25" class="halo"/><circle cx="350" cy="38" r="20" fill="#FFD95C"/></g>
    <g class="cl1"><path d="M60 46a10 10 0 0 1 2-20 14 14 0 0 1 26-3 11 11 0 0 1 10 23z" fill="#fff"/></g>
    <g class="cl2"><path d="M230 30a8 8 0 0 1 1-16 11 11 0 0 1 21-2 9 9 0 0 1 8 18z" fill="#fff" opacity=".9"/></g>
    <g class="bird"><path d="M150 56q6-6 12 0q6-6 12 0" fill="none" stroke="#5A7A8C" stroke-width="2" stroke-linecap="round"/></g>
    <path d="M0 140c60-40 120-40 190-10s140 20 210-14v64H0z" fill="#8FD6A0"/>
    <path d="M0 160c80-28 150-20 220 0s120 10 180-6v26H0z" fill="#6CC584"/>
  </svg>`;
}

/* ───────── 등불 (연속 기록) ───────── */
export function bigLampSVG(level = 0) {
  const glow = ['#FFB020', '#FF8A1F', '#FF5A5F', '#B57BFF'][Math.min(3, level)];
  return `<svg class="biglamp" viewBox="0 0 160 200" aria-hidden="true">
    <defs><radialGradient id="lg" cx="50%" cy="45%" r="50%"><stop offset="0" stop-color="${glow}" stop-opacity=".55"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF7A1A"/><stop offset=".6" stop-color="#FFC23D"/><stop offset="1" stop-color="#FFF2A8"/></linearGradient></defs>
    <circle class="halo" cx="80" cy="84" r="78" fill="url(#lg)"/>
    <path d="M38 176h84" stroke="#8C5A2B" stroke-width="8" stroke-linecap="round"/>
    <path d="M50 172 42 112c-2-16 78-16 76 0l-8 60z" fill="#E8B66A" stroke="#8C5A2B" stroke-width="5" stroke-linejoin="round"/>
    <path d="M52 124h56" stroke="#C48A3E" stroke-width="4" stroke-linecap="round"/>
    <path d="M80 106v-8" stroke="#5A3D22" stroke-width="4" stroke-linecap="round"/>
    <g class="flame"><path d="M80 24c18 22 22 40 14 56-4 9-24 10-28 0-8-16-4-34 14-56z" fill="url(#fl)"/><path d="M80 52c8 10 9 18 5 26-2 4-9 4-11 0-4-8-2-16 6-26z" fill="#FFF7D6"/></g>
  </svg>`;
}
