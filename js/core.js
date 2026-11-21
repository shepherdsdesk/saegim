// 새김 INSCRIBE — 공용 기능 (Firebase 연결, 설정, 채점, 복습 계산)
// 만든 곳: AI목양지원센터
import * as F from '../vendor/firebase.js';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBVqAP5WDusHcaB8EIyzW5JJ48YY7IOkXI',
  authDomain: 'saegim-inscribe.firebaseapp.com',
  projectId: 'saegim-inscribe',
  storageBucket: 'saegim-inscribe.firebasestorage.app',
  messagingSenderId: '397014239263',
  appId: '1:397014239263:web:fa29107c1aebd3ea2ded2a'
};
export const ADMIN_EMAIL = 'bear4jesus@gmail.com';
export const MOCK = new URLSearchParams(location.search).has('mock');

/* ───────── 데이터 계층 ───────── */
let app, auth, fs;
const listeners = new Set();
export const DB = {};

if (!MOCK) {
  app = F.initializeApp(FIREBASE_CONFIG);
  auth = F.getAuth(app);
  try {
    fs = F.initializeFirestore(app, { ignoreUndefinedProperties: true, localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  } catch (e) {
    fs = F.initializeFirestore(app, { ignoreUndefinedProperties: true });
  }
  const ref = (p) => F.doc(fs, p);
  const col = (p) => F.collection(fs, p);
  const conv = (data) => {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (v && v.__op === 'inc') out[k] = F.increment(v.n);
      else if (v && v.__op === 'del') out[k] = F.deleteField();
      else if (v && v.__op === 'now') out[k] = F.serverTimestamp();
      else out[k] = v;
    }
    return out;
  };
  const snapDoc = (s) => (s.exists() ? { id: s.id, ...s.data() } : null);
  const buildQuery = (p, opt = {}) => {
    const parts = [];
    (opt.where || []).forEach((w) => parts.push(F.where(w[0], w[1], w[2])));
    if (opt.orderBy) parts.push(F.orderBy(opt.orderBy[0], opt.orderBy[1] || 'asc'));
    if (opt.limit) parts.push(F.limit(opt.limit));
    return parts.length ? F.query(col(p), ...parts) : col(p);
  };
  Object.assign(DB, {
    async get(p) { return snapDoc(await F.getDoc(ref(p))); },
    async list(p, opt) { const s = await F.getDocs(buildQuery(p, opt)); return s.docs.map((d) => ({ id: d.id, ...d.data() })); },
    set(p, data, merge = true) { return F.setDoc(ref(p), conv(data), { merge }); },
    update(p, data) { return F.updateDoc(ref(p), conv(data)); },
    del(p) { return F.deleteDoc(ref(p)); },
    async add(p, data) { const r = await F.addDoc(col(p), conv(data)); return r.id; },
    onDoc(p, cb) { return F.onSnapshot(ref(p), (s) => cb(snapDoc(s)), (e) => console.warn(p, e)); },
    onCol(p, cb, opt) { return F.onSnapshot(buildQuery(p, opt), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => console.warn(p, e)); },
    async batch(ops) {
      for (let i = 0; i < ops.length; i += 400) {
        const b = F.writeBatch(fs);
        ops.slice(i, i + 400).forEach((o) => {
          if (o.del) b.delete(ref(o.path)); else b.set(ref(o.path), conv(o.data), { merge: o.merge !== false });
        });
        await b.commit();
      }
    },
    toMillis(t) { return t && t.toMillis ? t.toMillis() : (typeof t === 'number' ? t : null); }
  });
} else {
  // 화면 점검용 가상 저장소 (?mock)
  const store = JSON.parse(localStorage.getItem('saegim-mock') || '{}');
  const save = () => localStorage.setItem('saegim-mock', JSON.stringify(store));
  window.addEventListener('storage', (e) => { if (e.key === 'saegim-mock' && e.newValue) { const n = JSON.parse(e.newValue); Object.keys(store).forEach((k) => delete store[k]); Object.assign(store, n); notify(); } });
  const notify = () => listeners.forEach((l) => l());
  const apply = (obj, data, deep = true) => {
    for (const [k, v] of Object.entries(data)) {
      const path = k.split('.'); let o = obj;
      for (let i = 0; i < path.length - 1; i++) { o[path[i]] = o[path[i]] || {}; o = o[path[i]]; }
      const last = path[path.length - 1];
      if (v && v.__op === 'inc') o[last] = (o[last] || 0) + v.n;
      else if (v && v.__op === 'del') delete o[last];
      else if (v && v.__op === 'now') o[last] = Date.now();
      else if (deep && v && typeof v === 'object' && !Array.isArray(v) && o[last] && typeof o[last] === 'object' && !Array.isArray(o[last])) apply(o[last], v, true);
      else o[last] = v;
    }
  };
  const children = (p) => Object.keys(store).filter((k) => k.startsWith(p + '/') && k.slice(p.length + 1).indexOf('/') < 0);
  const filt = (p, opt = {}) => {
    let rows = children(p).map((k) => ({ id: k.slice(p.length + 1), ...store[k] }));
    (opt.where || []).forEach(([f, op, v]) => { rows = rows.filter((r) => (op === '==' ? r[f] === v : op === 'in' ? v.includes(r[f]) : true)); });
    if (opt.orderBy) { const [f, d] = opt.orderBy; rows.sort((a, b) => (a[f] > b[f] ? 1 : -1) * (d === 'desc' ? -1 : 1)); }
    return rows;
  };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  Object.assign(DB, {
    async get(p) { return store[p] ? { id: p.split('/').pop(), ...clone(store[p]) } : null; },
    async list(p, opt) { return clone(filt(p, opt)); },
    async set(p, data, merge = true) { if (!merge || !store[p]) store[p] = {}; apply(store[p], data); save(); notify(); },
    async update(p, data) { if (!store[p]) throw new Error('not found'); apply(store[p], data, false); save(); notify(); },
    async del(p) { delete store[p]; save(); notify(); },
    async add(p, data) { const id = Math.random().toString(36).slice(2, 12); await this.set(p + '/' + id, data); return id; },
    onDoc(p, cb) { const l = () => cb(store[p] ? { id: p.split('/').pop(), ...clone(store[p]) } : null); listeners.add(l); setTimeout(l); return () => listeners.delete(l); },
    onCol(p, cb, opt) { const l = () => cb(clone(filt(p, opt))); listeners.add(l); setTimeout(l); return () => listeners.delete(l); },
    async batch(ops) { ops.forEach((o) => { if (o.del) delete store[o.path]; else { if (o.merge === false || !store[o.path]) store[o.path] = {}; apply(store[o.path], o.data); } }); save(); notify(); },
    toMillis(t) { return typeof t === 'number' ? t : null; }
  });
}

export const op = {
  inc: (n) => ({ __op: 'inc', n }),
  del: () => ({ __op: 'del' }),
  now: () => ({ __op: 'now' })
};

/* ───────── 로그인 ───────── */
export function whenAuthed() {
  if (MOCK) return Promise.resolve({ uid: sessionStorage.getItem('saegim-mock-uid') || (() => { const u = 'u' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('saegim-mock-uid', u); return u; })(), email: new URLSearchParams(location.search).get('mock') === 'admin' ? ADMIN_EMAIL : null });
  return new Promise((resolve) => {
    const off = F.onAuthStateChanged(auth, async (u) => {
      if (u) { off(); resolve(u); } else { try { await F.signInAnonymously(auth); } catch (e) { console.error(e); } }
    });
  });
}
export function currentUser() { return MOCK ? null : auth.currentUser; }
export async function adminSignIn() {
  if (MOCK) return { email: ADMIN_EMAIL };
  const p = new F.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  try { const r = await F.signInWithPopup(auth, p); return r.user; }
  catch (e) { if (String(e.code).includes('popup')) { await F.signInWithRedirect(auth, p); return null; } throw e; }
}
export async function adminCheck() {
  if (MOCK) return new URLSearchParams(location.search).get('mock') === 'admin' || sessionStorage.getItem('saegim-mock-admin') === '1';
  try { await F.getRedirectResult(auth); } catch (e) { /* 무시 */ }
  const u = await whenAuthed();
  if (u.email === ADMIN_EMAIL) return true;
  try {
    const sess = await DB.get('adminSessions/' + u.uid);
    if (!sess) return false;
    await DB.list('users', { limit: 1 }); // 관리자만 읽을 수 있음
    return true;
  } catch (e) { return false; }
}
// 관리자 코드로 들어가기
export async function adminCodeSignIn(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (MOCK) { if (code === 'MOCKADMIN1') { sessionStorage.setItem('saegim-mock-admin', '1'); return true; } return false; }
  const u = await whenAuthed();
  try { await DB.set('adminSessions/' + u.uid, { code, at: Date.now() }, false); return true; }
  catch (e) { return false; }
}
export async function adminSignOut() {
  if (MOCK) { sessionStorage.removeItem('saegim-mock-admin'); return; }
  const u = auth.currentUser;
  if (u && !u.email) { try { await DB.del('adminSessions/' + u.uid); } catch (e) {} }
  return F.signOut(auth);
}

/* ───────── 기본 설정 ───────── */
export const DEFAULTS = {
  appName: '새김',
  churchName: '',
  theme: '새벽', verseFont: '고운바탕', uiFont: 'IBM Plex', textSize: '보통',
  bgOpacity: 0.85,
  stages: { read: true, order: true, blank: true, chosung: true, full: true, review: true },
  dailyNew: 1,
  intervals: [1, 3, 7, 14, 30],
  ttsRate: 1.0,
  easyDefault: false,
  rule: '보통',
  battle: { time: 20, count: 10, scoring: 'speed', theme: '여리고 성벽', sound: true, bgm: true, volume: 0.7 },
  weeklyVerse: null
};
export const THEMES = ['새벽', '감람산', '성막', '광야', '별밤'];
export const VERSE_FONTS = { '고운바탕': "'Gowun Batang', serif", '함렛': "'Hahmlet', serif", '나눔명조': "'Nanum Myeongjo', serif", '노토 세리프': "'Noto Serif KR', serif" };
export const UI_FONTS = { 'IBM Plex': "'IBM Plex Sans KR', 'Apple SD Gothic Neo', sans-serif", '노토 산스': "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif", '고딕 A1': "'Gothic A1', 'Apple SD Gothic Neo', sans-serif" };
export const SIZES = ['작게', '보통', '크게', '아주 크게'];
export const STAGES = [
  ['read', '읽고 듣기'], ['order', '순서 맞추기'], ['blank', '빈칸 채우기'], ['chosung', '초성 보고 쓰기'], ['full', '통째로 쓰기'], ['review', '복습']
];

export async function loadSettings() {
  let cfg = null;
  try { cfg = await DB.get('config/app'); } catch (e) { console.warn(e); }
  const s = deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), cfg || {});
  return s;
}
function deepMerge(a, b) {
  for (const [k, v] of Object.entries(b || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deepMerge(a[k], v);
    else a[k] = v;
  }
  return a;
}
const FONT_Q = {
  '고운바탕': 'Gowun+Batang:wght@400;700', '함렛': 'Hahmlet:wght@400;500;600;700', '나눔명조': 'Nanum+Myeongjo:wght@400;700', '노토 세리프': 'Noto+Serif+KR:wght@400;600',
  'IBM Plex': 'IBM+Plex+Sans+KR:wght@400;500;600;700', '노토 산스': 'Noto+Sans+KR:wght@400;500;700', '고딕 A1': 'Gothic+A1:wght@400;500;700'
};
// 고른 글꼴만 불러와 첫 화면을 빠르게
function loadFonts(s) {
  const fams = [...new Set(['Hahmlet:wght@400;500;600;700', FONT_Q[s.verseFont] || FONT_Q['고운바탕'], FONT_Q[s.uiFont] || FONT_Q['IBM Plex']])];
  try { localStorage.setItem('saegim-fonts', JSON.stringify(fams)); } catch (e) {}
  const link = document.getElementById('gf'); if (!link) return;
  const href = 'https://fonts.googleapis.com/css2?family=' + fams.join('&family=') + '&display=swap';
  if (link.href !== href) link.href = href;
}
// 배경·로고 사진은 바뀌었을 때만 새로 받기
export async function getAsset(key, version) {
  const ck = 'saegim-asset-' + key;
  try { const c = JSON.parse(localStorage.getItem(ck) || 'null'); if (c && version && c.v === version) return c.data; } catch (e) {}
  let data = null;
  try { const d = await DB.get('assets/' + key); data = d && d.data ? d.data : null; } catch (e) {}
  try { if (data) localStorage.setItem(ck, JSON.stringify({ v: version || 0, data })); else localStorage.removeItem(ck); } catch (e) {}
  return data;
}
export function cachedSettings() { try { return JSON.parse(localStorage.getItem('saegim-settings') || 'null'); } catch (e) { return null; } }
export function applyLook(s) {
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.dataset.size = s.textSize;
  root.style.setProperty('--f-verse', VERSE_FONTS[s.verseFont] || VERSE_FONTS['고운바탕']);
  root.style.setProperty('--f-ui', UI_FONTS[s.uiFont] || UI_FONTS['IBM Plex']);
  loadFonts(s);
}
export async function applySettings(s, { bgKey = 'bg' } = {}) {
  const root = document.documentElement;
  applyLook(s);
  try { localStorage.setItem('saegim-settings', JSON.stringify(s)); } catch (e) {}
  const bg = await getAsset(bgKey, s.assetsVersion);
  if (bg) {
    document.body.classList.add('has-bg');
    root.style.setProperty('--bg-img', `url(${bg})`);
    const c = getComputedStyle(root).getPropertyValue('--bg').trim();
    root.style.setProperty('--bg-veil', hexA(c, s.bgOpacity ?? 0.85));
  } else document.body.classList.remove('has-bg');
}
export async function loadLogo(s) { return getAsset('logo', s && s.assetsVersion); }
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* ───────── 로고 ───────── */
export function markSVG(size = 32, color = 'var(--ac)', fg = '#FFFFFF') {
  return `<svg class="mark" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="새김 로고"><rect width="64" height="64" rx="15" fill="${color}"/><path d="M32 8.5 34.6 12.6 32 16.7 29.4 12.6Z" fill="${fg}"/><path d="M14 21.5C21.5 18.8 27.4 19.2 31 22.8V47C27.4 43.9 21.5 43.4 14 45.6Z" fill="${fg}"/><path d="M50 21.5C42.5 18.8 36.6 19.2 33 22.8V47C36.6 43.9 42.5 43.4 50 45.6Z" fill="${fg}"/><path d="M18.5 28.2C21.8 27.2 24.8 27.3 27 28.5M18.5 34.2C21.8 33.2 24.8 33.3 27 34.5M37 28.5C39.2 27.3 42.2 27.2 45.5 28.2M37 34.5C39.2 33.3 42.2 33.2 45.5 34.2" stroke="${color}" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>`;
}
export function brandHTML(size = 30, sub = '', name = '새김') {
  return `<span class="brand">${markSVG(size)}<span style="display:flex;flex-direction:column;gap:3px"><span class="brand-name" style="font-size:${Math.round(size * 0.66)}px">${esc(name)}</span>${sub ? `<span class="brand-sub">${esc(sub)}</span>` : ''}</span></span>`;
}

/* ───────── 아이콘 ───────── */
export const IC = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  review: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  battle: 'M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2',
  me: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  close: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  flame: 'M12 22c4 0 7-2.8 7-7 0-3.5-2.5-6-4-8-.5 2-1.5 3-3 3 .5-3-1-6-3-8 0 4-4 7-4 13 0 4.2 3 7 7 7z',
  play: 'M8 5v14l11-7z',
  sound: 'M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 18l6-6-6-6',
  down: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  up: 'M12 21V9M7 14l5-5 5 5M5 3h14',
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  grid: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  team: 'M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 22a8 8 0 0 1 16 0',
  tv: 'M2 7h20v12H2zM8 3l4 4 4-4',
  chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
  out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.2 13.9 7 22l5-3 5 3-1.2-8.1',
  bulb: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z',
  pin: 'M12 17v5M5 17h14l-2-4V4H7v9z',
  phone: 'M7 2h10v20H7zM11 18h2',
  image: 'M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
  key: 'M15 7a4 4 0 1 1-3.5 6L4 20.5V17h3v-3h3l1.5-1.5A4 4 0 0 1 15 7z',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4z'
};
export const icon = (name, size = 20, extra = '') => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" ${extra}><path d="${IC[name] || ''}"/></svg>`;

/* ───────── 도구 ───────── */
export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export function toast(msg, ms = 2200) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms);
}
export function modal(html, { onMount } = {}) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal fade-in" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  back.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  if (onMount) onMount(back.firstElementChild, close);
  return close;
}
export function confirmBox(title, body, okText = '확인', danger = false) {
  return new Promise((resolve) => {
    modal(`<h3>${esc(title)}</h3><p class="muted" style="margin:0;line-height:1.7">${body}</p><div class="actions"><button class="btn md" data-close>취소</button><button class="btn md ${danger ? 'ac' : 'pr'}" id="cb-ok">${esc(okText)}</button></div>`, {
      onMount(el, close) { el.querySelector('#cb-ok').onclick = () => { close(); resolve(true); }; el.parentElement.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target === el.parentElement) resolve(false); }); }
    });
  });
}
export const today = (d = new Date()) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
export const addDays = (ymd, n) => { const d = new Date(ymd + 'T00:00:00'); d.setDate(d.getDate() + n); return today(d); };
export const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const fmt = (n) => Number(n || 0).toLocaleString('ko-KR');
export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCode = (n = 8) => Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
export const roomCode = () => String(Math.floor(100000 + Math.random() * 900000));

/* ───────── 한글·채점 ───────── */
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
export function chosung(w) {
  let o = '';
  for (const ch of w) { const c = ch.charCodeAt(0) - 0xac00; o += c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch; }
  return o;
}
export const words = (text) => text.trim().split(/\s+/).filter(Boolean);
export const norm = (s) => String(s || '').normalize('NFC').replace(/[\s.,;:!?'"“”‘’·…\-–—()\[\]{}「」『』<>]/g, '');
export function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
// 구절 전체 채점
export function gradeText(answer, target, rule = '보통') {
  const a = norm(answer), t = norm(target);
  const d = lev(a, t);
  const acc = t.length ? Math.max(0, 1 - d / t.length) : 0;
  let ok;
  if (rule === '엄격') ok = d === 0;
  else if (rule === '느슨') ok = acc >= 0.9;
  else ok = d <= (t.length >= 30 ? 2 : 1);
  return { ok, acc, dist: d };
}
// 단어 채점
export function gradeWord(answer, target, rule = '보통') {
  const a = norm(answer), t = norm(target);
  if (a === t) return true;
  if (rule === '엄격') return false;
  const d = lev(a, t);
  if (rule === '느슨') return d <= Math.max(1, Math.floor(t.length / 3));
  return t.length >= 3 && d <= 1;
}
// 틀린 글자 표시 (목표 본문 기준)
function diffMarks(answer, target) {
  const A = [...norm(answer)];
  const T = [...target];
  const tIdx = []; T.forEach((c, i) => { if (norm(c)) tIdx.push(i); });
  const t = tIdx.map((i) => T[i]);
  const m = A.length, n = t.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i][j] = A[i] === t[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const okSet = new Set(); let i = 0, j = 0;
  while (i < m && j < n) { if (A[i] === t[j]) { okSet.add(tIdx[j]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return T.map((c, k) => (!norm(c) ? null : okSet.has(k)));
}
export function diffHTML(answer, target) {
  const T = [...target]; const mk = diffMarks(answer, target);
  return T.map((c, k) => (mk[k] === null ? esc(c) : mk[k] ? `<span class="diff-ok">${esc(c)}</span>` : `<span class="diff-miss">${esc(c)}</span>`)).join('');
}
// 틀린 글자가 들어 있는 단어 번호
export function missedWords(answer, target) {
  const T = [...target]; const mk = diffMarks(answer, target); const out = new Set(); let wi = 0;
  T.forEach((c, k) => { if (/\s/.test(c)) { if (k > 0 && !/\s/.test(T[k - 1])) wi++; return; } if (mk[k] === false) out.add(wi); });
  return [...out];
}
export const GRADE = (n) => (n >= 90 ? '깊이 새김' : n >= 80 ? '잘 새김' : n >= 60 ? '조금 더' : '다시 새겨요');
export const WEAK_LINE = 80;

/* ───────── 복습 일정 ───────── */
export function scheduleNext(item, correct, intervals) {
  const iv = intervals && intervals.length ? intervals : DEFAULTS.intervals;
  const box = correct ? Math.min((item.box || 0) + 1, iv.length) : 1;
  return { ...item, box, due: addDays(today(), iv[Math.max(0, box - 1)]), lastAt: Date.now(), reviews: (item.reviews || 0) + 1, mastered: box >= iv.length };
}

/* ───────── 이미지 줄이기 (배경·로고 올리기) ───────── */
export function shrinkImage(file, maxW = 1600, type = 'image/jpeg', q = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, maxW / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const g = c.getContext('2d'); if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL(type, q));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* ───────── 대전 테마 ───────── */
export const BATTLE_MODES = {
  speed: { name: '스피드 빈칸', desc: '빨리 맞힐수록 높은 점수' },
  order: { name: '순서 레이스', desc: '어절 묶음 순서 맞추기' },
  ref: { name: '주소 맞히기', desc: '본문 보고 장절 찾기' },
  full: { name: '통째로 쓰기', desc: '정확도와 시간 합산' },
  survival: { name: '서바이벌', desc: '틀리면 탈락' },
  relay: { name: '사랑방 릴레이', desc: '팀원이 나눠 이어 쓰기' }
};
export const BATTLE_THEMES = ['여리고 성벽', '다윗과 골리앗', '홍해 건너기', '갈멜산 제단', '노아의 방주', '아케이드'];
export const TEAM_COLORS = ['#C0563F', '#4F86C6', '#5BA37A', '#C9973B', '#8A6BBE', '#3E9C9C', '#C2678F', '#6B7A8F'];

export function registerSW() {
  if ('serviceWorker' in navigator && !MOCK && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
