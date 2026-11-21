// 새김 INSCRIBE — 사용자 앱
import {
  DB, op, whenAuthed, loadSettings, applySettings, loadLogo, markSVG, icon, esc, $, $$, toast, modal,
  today, addDays, shuffle, fmt, chosung, words, norm, gradeText, gradeWord, diffHTML, scheduleNext,
  BATTLE_MODES, registerSW, MOCK, missedWords, GRADE, WEAK_LINE, applyLook, cachedSettings
} from './core.js';
import { Sound } from './sound.js';

const root = $('#root');
const S = { settings: null, user: null, prog: null, courses: [], verses: {}, course: null, logo: null, uid: null, installEvt: null };
const LS = { get: (k) => { try { return JSON.parse(localStorage.getItem('saegim-' + k)); } catch (e) { return null; } }, set: (k, v) => localStorage.setItem('saegim-' + k, JSON.stringify(v)), del: (k) => localStorage.removeItem('saegim-' + k) };
let cleanup = [];
const addCleanup = (f) => cleanup.push(f);
function runCleanup() { cleanup.forEach((f) => { try { f(); } catch (e) {} }); cleanup = []; window.speechSynthesis && speechSynthesis.cancel(); }

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; });

// 자판이 올라오면 화면을 자판 위 공간에 맞춰 줄이기
(function keyboardFit() {
  const vv = window.visualViewport; if (!vv) return;
  const html = document.documentElement; let base = window.innerHeight;
  const upd = () => {
    if (!document.activeElement || !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) base = Math.max(base, vv.height);
    const open = vv.height < base - 120 && /INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '');
    html.classList.toggle('kb-open', open);
    html.style.setProperty('--vvh', vv.height + 'px');
    html.style.setProperty('--vvt', vv.offsetTop + 'px');
    if (open) { const cur = document.querySelector('.w.cur, .w.blank.cur'); if (cur) cur.scrollIntoView({ block: 'nearest' }); }
  };
  vv.addEventListener('resize', upd); vv.addEventListener('scroll', upd);
  document.addEventListener('focusin', () => setTimeout(upd, 300));
  document.addEventListener('focusout', () => setTimeout(upd, 300));
  window.addEventListener('orientationchange', () => { base = 0; setTimeout(() => { base = window.innerHeight; upd(); }, 400); });
})();

/* ───────── 시작 ───────── */
(async function boot() {
  const cs = cachedSettings(); if (cs) applyLook(cs);
  const saved = LS.get('user');
  const [u, settings] = await Promise.all([whenAuthed(), loadSettings()]);
  S.uid = u.uid; S.settings = settings;
  const [, logo] = await Promise.all([applySettings(S.settings), loadLogo(S.settings)]);
  S.logo = logo;
  registerSW();
  const params = new URLSearchParams(location.search);
  if (params.get('room')) { location.hash = '#battle/' + params.get('room'); history.replaceState(null, '', location.pathname + (MOCK ? location.search.replace(/[?&]room=\d+/, '') : '') + location.hash); }
  if (saved) {
    const doc = await DB.get('users/' + saved.code).catch(() => null);
    if (doc && doc.active !== false) { S.user = { code: saved.code, name: doc.name, team: doc.team || null }; await loadUserData(); }
    else LS.del('user');
  }
  window.addEventListener('hashchange', route);
  route();
})();

async function loadUserData() {
  const [cs, prog, wv] = await Promise.all([
    DB.list('courses'),
    DB.get('progress/' + S.user.code),
    S.settings.weeklyVerse ? DB.get('verses/' + S.settings.weeklyVerse).catch(() => null) : Promise.resolve(null)
  ]);
  S.courses = cs.filter((c) => c.published !== false).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  S.prog = prog || {};
  S.prog.v = S.prog.v || {}; S.prog.notes = S.prog.notes || {};
  const pick = S.prog.course && S.courses.find((c) => c.id === S.prog.course) ? S.prog.course : (S.courses[0] && S.courses[0].id);
  S.course = pick || null;
  if (S.course) await loadVerses(S.course);
  S.weekly = wv;
}
// 말씀은 코스가 바뀌었을 때만 새로 받기 (나머지는 이 기기에 보관)
async function loadVerses(cid) {
  if (S.verses[cid]) return S.verses[cid];
  const c = S.courses.find((x) => x.id === cid) || {}; const ver = c.updatedAt || c.count || 0;
  try { const k = JSON.parse(localStorage.getItem('saegim-v-' + cid) || 'null'); if (k && k.ver === ver && k.list.length) { S.verses[cid] = k.list; return k.list; } } catch (e) {}
  const vs = await DB.list('verses', { where: [['courseId', '==', cid]] });
  vs.sort((a, b) => a.no - b.no);
  S.verses[cid] = vs;
  try { localStorage.setItem('saegim-v-' + cid, JSON.stringify({ ver, list: vs })); } catch (e) {}
  return vs;
}
const easy = () => (S.prog && S.prog.easy != null ? S.prog.easy : S.settings.easyDefault);
const courseRule = (cid) => { const c = S.courses.find((x) => x.id === cid); return (c && c.rule) || S.settings.rule; };

function route() {
  runCleanup();
  const h = location.hash.replace(/^#/, '');
  const [page, arg] = h.split('/');
  if (page === 'battle') return viewBattle(arg);
  if (!S.user) return viewLogin();
  if (page === 'learn' && arg) return viewLearn(arg);
  if (page === 'review') return viewReview();
  if (page === 'me') return viewMe();
  return viewHome();
}
const go = (h) => { if (location.hash === h) route(); else location.hash = h; };

/* ───────── 공통 틀 ───────── */
function topbar(right = '') {
  const name = S.settings.appName || '새김';
  const logo = S.logo ? `<img src="${S.logo}" alt="" style="height:30px;width:auto;display:block">` : markSVG(30);
  return `<header class="top"><a class="brand" href="#home" aria-label="홈">${logo}<span class="brand-name" style="font-size:20px">${esc(name)}</span></a>${right}</header>`;
}
function tabbar(on) {
  const t = [['home', '홈', 'home'], ['review', '복습', 'review'], ['battle', '대전', 'battle'], ['me', '내 기록', 'me']];
  return `<nav class="tabs" aria-label="주 메뉴">${t.map(([h, l, i]) => `<a href="#${h}" class="${on === h ? 'on' : ''}">${icon(i, 22)}${l}</a>`).join('')}</nav>`;
}
function streakHTML() {
  const n = currentStreak();
  return `<div class="streak">${icon('flame', 16)}<span class="num">${n}일 연속</span></div>`;
}
function currentStreak() {
  const p = S.prog || {}; if (!p.lastDay) return 0;
  if (p.lastDay === today() || p.lastDay === addDays(today(), -1)) return p.streak || 0;
  return 0;
}
async function touchDay(xp = 0) {
  const p = S.prog; const t = today();
  let streak = p.streak || 0;
  if (p.lastDay !== t) streak = p.lastDay === addDays(t, -1) ? streak + 1 : 1;
  p.streak = streak; p.lastDay = t; p.xp = (p.xp || 0) + xp;
  await DB.set('progress/' + S.user.code, { streak, lastDay: t, xp: op.inc(xp), name: S.user.name, team: S.user.team || null, updatedAt: Date.now() });
}
const credit = () => `<p class="credit">만든 곳 <b>AI목양지원센터</b></p>`;

/* ───────── 로그인 ───────── */
function viewLogin() {
  root.innerHTML = `
  <main class="login"><div class="login-card fade-in">
    <div class="login-brand">
      ${S.logo ? `<img src="${S.logo}" alt="" style="height:72px;width:auto">` : markSVG(72)}
      <div style="display:flex;flex-direction:column;gap:10px"><span class="nm">${esc(S.settings.appName || '새김')}</span><span class="en">INSCRIBE</span></div>
    </div>
    <form id="lf" style="display:flex;flex-direction:column;gap:16px" autocomplete="off">
      <div class="field"><label for="ln">이름</label><input class="input" id="ln" required placeholder="홍길동"></div>
      <div class="field"><label for="lc">입장 코드</label><input class="input num" id="lc" required maxlength="8" placeholder="8자리 코드" style="letter-spacing:.14em;text-transform:uppercase"></div>
      <button class="btn pr block" type="submit">들어가기</button>
      <a class="btn ghost block" href="#battle">코드 없이 대전만 참여하기</a>
    </form>
    <p class="login-verse">그들의 마음에 이것을 기록하리라 <span style="font-family:var(--f-ui);font-size:12px">· 히브리서 8:10</span></p>
    ${credit()}
  </div></main>`;
  $('#lf').onsubmit = async (e) => {
    e.preventDefault();
    const name = $('#ln').value.trim(); const code = $('#lc').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 8) return toast('입장 코드는 8자리입니다');
    const btn = e.submitter || $('#lf button'); btn.disabled = true;
    try {
      const d = await DB.get('users/' + code);
      if (!d || d.active === false) { toast('코드를 다시 확인해 주세요'); btn.disabled = false; return; }
      if (norm(d.name) !== norm(name)) { toast('이름과 코드가 맞지 않습니다'); btn.disabled = false; return; }
      LS.set('user', { code });
      S.user = { code, name: d.name, team: d.team || null };
      await loadUserData();
      go('#home');
    } catch (err) { console.error(err); toast('연결이 원활하지 않습니다'); btn.disabled = false; }
  };
}

/* ───────── 홈 ───────── */
function verseState(v) { const it = S.prog.v[v.id]; if (!it) return 'new'; return 'done'; }
function nextVerse() {
  const vs = S.verses[S.course] || [];
  return vs.find((v) => verseState(v) === 'new') || null;
}
function dueList() {
  const t = today();
  return Object.entries(S.prog.v).filter(([, it]) => it.due && it.due <= t).map(([id]) => id);
}
function learnedToday() { const t = today(); return Object.values(S.prog.v).filter((it) => it.learnedAt === t).length; }

async function viewHome() {
  const vs = S.verses[S.course] || [];
  const learned = vs.filter((v) => S.prog.v[v.id]).length;
  const nv = nextVerse();
  const due = new Set([...dueList(), ...Object.entries(S.prog.v).filter(([, it]) => (it.score ?? 100) < WEAK_LINE).map(([id]) => id)]).size;
  const weekly = S.weekly && !S.prog.v[S.weekly.id] ? S.weekly : null;
  const focus = weekly || nv;
  const limitHit = !weekly && learnedToday() >= (S.settings.dailyNew || 1);
  const d = new Date();
  const dateTxt = `${d.getMonth() + 1}.${d.getDate()} ${'일월화수목금토'[d.getDay()]}요일`;

  const focusHTML = focus ? `
    <section class="sec today fade-in">
      <div class="sec-head"><span class="eyebrow ${weekly ? 'ac' : ''}">${weekly ? `<span class="pin-tag">${icon('pin', 14)}이번 주 암송</span>` : (limitHit ? '오늘 분량을 마쳤어요' : '오늘의 말씀')}</span><span class="eyebrow">${dateTxt}</span></div>
      <div class="rule-mark" style="margin-top:14px"></div>
      <h1 class="ref head">${esc(focus.ref)}</h1>
      <p class="vtext verse">${esc(focus.text)}</p>
      <div class="acts"><a class="btn pr" href="#learn/${focus.id}">${limitHit ? '한 구절 더 외우기' : '암송 시작'}</a><a class="btn" href="#review">복습 <span style="color:var(--ac)" class="num">${due}</span></a></div>
    </section>` : `
    <section class="sec today fade-in">
      <span class="eyebrow ac">${vs.length ? '코스를 모두 마쳤어요' : '아직 준비된 말씀이 없어요'}</span>
      <h1 class="ref head">${vs.length ? '수고하셨습니다' : '곧 시작합니다'}</h1>
      <p class="vtext muted" style="font-family:var(--f-ui);font-size:15px">${vs.length ? '복습으로 말씀을 오래 간직하고, 내 기록에서 수료증을 받아 보세요.' : '관리자가 말씀을 올리면 여기에 나타납니다.'}</p>
      <div class="acts"><a class="btn pr" href="#review">복습하기</a><a class="btn" href="#me">내 기록</a></div>
    </section>`;

  const chips = S.courses.length > 1 ? `<div class="course-pick" role="tablist">${S.courses.map((c) => `<button class="chip ${c.id === S.course ? 'on' : ''}" data-c="${c.id}" role="tab">${esc(c.name)}</button>`).join('')}</div>` : '';
  const nextIdx = nv ? vs.indexOf(nv) : vs.length;
  const rows = vs.map((v, i) => {
    const done = !!S.prog.v[v.id]; const now = i === nextIdx; const locked = !done && !now;
    const it = S.prog.v[v.id] || {}; const st = done ? (it.score != null ? `<span class="st score ${it.score < WEAK_LINE ? 'low' : ''}">${it.score}</span>` : `<span class="st done">${icon('check', 18)}</span>`) : now ? `<span class="st"><i class="dot"></i></span>` : `<span class="st">${icon('lock', 16)}</span>`;
    const tag = locked ? 'div' : 'a';
    return `<${tag} class="topic-row ${now ? 'now' : ''} ${locked ? 'locked' : ''}" ${locked ? '' : `href="#learn/${v.id}"`}><span class="n num">${String(v.no).padStart(2, '0')}</span><span style="display:flex;flex-direction:column;gap:3px;min-width:0"><span class="t">${esc(v.topic || v.ref)}</span><span class="r">${esc(v.ref)}</span></span>${st}</${tag}>`;
  }).join('');
  const cname = (S.courses.find((c) => c.id === S.course) || {}).name || '';

  root.innerHTML = `<div class="shell">${topbar(streakHTML())}<main class="main">
    ${focusHTML}
    <section class="sec">
      ${chips}
      <div class="sec-head" style="margin-top:${chips ? 18 : 0}px"><h2>${esc(cname)}</h2><span class="head num" style="font-size:15px">${learned}<span class="muted"> / ${vs.length}</span></span></div>
      <div class="progress"><i style="width:${vs.length ? (learned / vs.length) * 100 : 0}%"></i></div>
      <div style="margin-top:6px">${rows}</div>
    </section>
    ${credit()}
  </main>${tabbar('home')}</div>`;

  $$('.chip[data-c]').forEach((b) => b.onclick = async () => {
    S.course = b.dataset.c; await loadVerses(S.course);
    DB.set('progress/' + S.user.code, { course: S.course }); S.prog.course = S.course; viewHome();
  });
  const nowRow = $('.topic-row.now'); if (nowRow && nextIdx > 4) setTimeout(() => nowRow.scrollIntoView({ block: 'center' }), 50);
}

/* ───────── 학습 ───────── */
async function getVerse(id) {
  for (const list of Object.values(S.verses)) { const v = list.find((x) => x.id === id); if (v) return v; }
  return DB.get('verses/' + id);
}
function chunkWords(ws, max = 7) {
  if (ws.length <= max) return ws.slice();
  const n = Math.min(max, Math.ceil(ws.length / 2)); const size = Math.ceil(ws.length / n); const out = [];
  for (let i = 0; i < ws.length; i += size) out.push(ws.slice(i, i + size).join(' '));
  return out;
}
// 약한 단어를 먼저 빈칸으로
function pickBlanks(ws, ratio, prefer = []) {
  const ok = (i) => norm(ws[i]).length >= 2;
  const n = Math.max(1, Math.round(ws.length * ratio));
  const first = prefer.filter((i) => i < ws.length && ok(i));
  const rest = shuffle(ws.map((w, i) => i).filter((i) => ok(i) && !first.includes(i)));
  return [...first, ...rest].slice(0, Math.max(n, first.length)).sort((a, b) => a - b);
}
function distractors(word, pool, n = 3) {
  const w = norm(word); const cand = [...new Set(pool.map(norm).filter((x) => x && x !== w))];
  cand.sort((a, b) => Math.abs(a.length - w.length) - Math.abs(b.length - w.length) + (Math.random() - 0.5));
  return cand.slice(0, n);
}
function speak(text, rate) {
  if (!('speechSynthesis' in window)) return toast('이 기기에서는 듣기를 지원하지 않습니다');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = rate || 1;
  const ko = speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith('ko')); if (ko) u.voice = ko;
  speechSynthesis.speak(u);
}
const STAGE_W = { read: 0, order: 15, blank: 25, chosung: 25, full: 35 };
const STAGE_NAME = { read: '읽고 듣기', order: '순서 맞추기', blank: '빈칸 채우기', chosung: '초성 보고 쓰기', full: '통째로 쓰기' };
function finalScore(sc) {
  let w = 0, t = 0;
  Object.entries(sc).forEach(([k, v]) => { const ww = STAGE_W[k] ?? 0; w += ww; t += ww * v; });
  if (!w) return Object.values(sc).length ? Math.round(Object.values(sc).reduce((a, b) => a + b, 0) / Object.values(sc).length) : 100;
  return Math.round(t / w);
}

// focus = true 이면 약한 부분만 다시 (빈칸 → 통째로 쓰기)
async function viewLearn(vid, focus = false) {
  const v = await getVerse(vid);
  if (!v) { toast('말씀을 찾을 수 없습니다'); return go('#home'); }
  const st = S.settings.stages || {};
  let stages = Object.keys(STAGE_NAME).filter((k) => st[k] !== false);
  if (easy()) stages = stages.filter((k) => k !== 'chosung' && k !== 'full');
  if (focus) stages = easy() ? ['blank'] : ['blank', 'full'];
  if (!stages.length) stages = ['read'];
  const rule = courseRule(v.courseId);
  const ws = words(v.text);
  const pool = (S.verses[v.courseId] || []).flatMap((x) => words(x.text));
  const prevWeak = ((S.prog.v[v.id] || {}).weak) || [];
  let si = 0; const sc = {}; const weak = new Set();

  const frame = (body, foot) => {
    const k = stages[si];
    root.innerHTML = `<div class="learn">
      <header class="learn-top">
        <div class="lt-left"><button class="icon-btn" id="xq" aria-label="학습 닫기">${icon('close', 20)}</button>${si > 0 ? `<button class="icon-btn" id="bk" aria-label="이전 단계로">${icon('back', 20)}</button>` : ''}</div>
        <div class="steps">${stages.map((s, i) => `<i class="${i < si ? 'done' : i === si ? 'now' : ''}"></i>`).join('')}</div>
        <span class="head num" style="font-size:13px;text-align:right">${si + 1}/${stages.length}</span></header>
      <div class="learn-body fade-in"><div class="lb-head"><span class="eyebrow ac">${focus ? '약한 부분 다시 · ' : `${si + 1}단계 · `}${STAGE_NAME[k]}</span>${Object.keys(sc).length ? `<span class="eyebrow num">지금까지 ${finalScore(sc)}점</span>` : ''}</div><h1 class="head">${esc(v.ref)}</h1>${body}</div>
      <footer class="learn-foot ${foot.one ? 'one' : ''}">${foot.html}</footer></div>`;
    $('#xq').onclick = async () => { if (si === 0 || (await confirmLeave())) go('#home'); };
    const bk = $('#bk'); if (bk) bk.onclick = () => { si--; delete sc[stages[si]]; runStage(); };
  };
  const done = (k, score) => { sc[k] = Math.max(0, Math.min(100, Math.round(score))); si++; if (si >= stages.length) finish(); else runStage(); };

  function runStage() {
    const k = stages[si];
    if (k === 'read') {
      frame(`<p class="hint">소리 내어 천천히 읽어 보세요.</p><p class="read-verse">${esc(v.text)}</p>
        <button class="btn md tts" id="tts">${icon('sound', 18)}들려주기</button>`, { one: true, html: `<button class="btn pr" id="ok">다 읽었어요</button>` });
      $('#tts').onclick = () => speak(v.text, S.settings.ttsRate);
      $('#ok').onclick = () => done('read', 100);
    }
    if (k === 'order') {
      const chunks = chunkWords(ws); let order = shuffle(chunks.map((c, i) => i));
      if (chunks.length > 1 && order.every((x, i) => x === i)) order = order.reverse();
      const placed = []; let tries = 0;
      const draw = () => {
        frame(`<p class="hint">말씀 조각을 순서대로 눌러 보세요. 놓은 조각을 누르면 되돌아갑니다.</p>
          <div class="board" id="bd">${placed.map((i, j) => `<button class="tile placed" data-j="${j}">${esc(chunks[i])}</button>`).join('') || '<span class="muted small">여기에 순서대로 놓입니다</span>'}</div>
          <div class="pool">${order.map((i) => `<button class="tile ${placed.includes(i) ? 'used' : ''}" data-i="${i}">${esc(chunks[i])}</button>`).join('')}</div>`,
        { html: `<button class="btn" id="rs">다시 놓기</button><button class="btn pr" id="ck" ${placed.length < chunks.length ? 'disabled' : ''}>확인</button>` });
        $$('.pool .tile').forEach((b) => b.onclick = () => { placed.push(+b.dataset.i); draw(); });
        $$('#bd .tile').forEach((b) => b.onclick = () => { placed.splice(+b.dataset.j, 1); draw(); });
        $('#rs').onclick = () => { placed.length = 0; draw(); };
        $('#ck').onclick = () => {
          tries++;
          if (placed.every((x, j) => x === j)) { toast(tries === 1 ? '한 번에 맞히셨어요' : '잘하셨어요'); done('order', Math.max(40, 100 - 30 * (tries - 1))); }
          else { $('#bd').classList.add('shake'); toast('순서를 다시 확인해 보세요'); setTimeout(() => { placed.length = 0; draw(); }, 700); }
        };
      };
      draw();
    }
    if (k === 'blank') {
      const ratio = focus ? 0.3 : (S.prog.v[v.id] ? 0.5 : 0.25);
      const blanks = pickBlanks(ws, ratio, focus || S.prog.v[v.id] ? prevWeak : []);
      let bi = 0; const got = {}; let miss = 0;
      const draw = (msg = '') => {
        const cur = blanks[bi];
        const board = ws.map((w, i) => blanks.includes(i) ? (got[i] != null ? `<span class="w blank filled">${esc(w)}</span>` : `<span class="w blank ${i === cur ? 'cur' : ''}">${esc(w)}</span>`) : `<span class="w">${esc(w)}</span>`).join('');
        const after = (ok) => { got[cur] = ok ? (miss === 0 ? 1 : 0.5) : 0; if (got[cur] < 1) weak.add(cur); miss = 0; bi++; bi >= blanks.length ? done('blank', (Object.values(got).reduce((a, b) => a + b, 0) / blanks.length) * 100) : draw(); };
        if (easy()) {
          const opts = shuffle([norm(ws[cur]), ...distractors(ws[cur], pool)]);
          frame(`<p class="hint">빈칸에 들어갈 말을 골라 보세요. <span class="num">(${bi + 1}/${blanks.length})</span></p><div class="board">${board}</div>
            <div class="choices">${opts.map((o) => `<button class="choice" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`, { one: true, html: `<span class="muted small" style="text-align:center">${msg || '&nbsp;'}</span>` });
          $$('.choice').forEach((b) => b.onclick = () => {
            if (b.dataset.o === norm(ws[cur])) { b.classList.add('ok'); setTimeout(() => after(true), 350); }
            else { miss++; b.classList.add('no'); b.disabled = true; }
          });
        } else {
          frame(`<p class="hint">빈칸에 들어갈 말을 적어 보세요. <span class="num">(${bi + 1}/${blanks.length})</span></p><div class="board">${board}</div>
            <label class="eyebrow" for="bi" style="margin-top:24px">빈칸 ${bi + 1}</label>
            <div class="line-input" style="margin-top:10px"><input id="bi" autocomplete="off" autocapitalize="off" spellcheck="false"><span class="eyebrow ac">${esc(chosung(ws[cur]).slice(0, 1))}…</span></div>
            <p class="verdict no" id="vm" style="min-height:24px">${msg}</p>`,
          { html: `<button class="btn" id="hint">힌트</button><button class="btn pr" id="ck">확인</button>` });
          const inp = $('#bi'); inp.focus();
          const check = () => {
            if (gradeWord(inp.value, ws[cur], rule)) after(true);
            else { miss++; if (miss >= 3) { toast(`정답: ${ws[cur]}`); after(false); return; } inp.parentElement.classList.add('shake'); setTimeout(() => inp.parentElement.classList.remove('shake'), 500); $('#vm').textContent = '다시 한 번 해 보세요'; }
          };
          $('#ck').onclick = check; inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) check(); };
          $('#hint').onclick = () => { miss = Math.max(miss, 1); $('#vm').textContent = `초성: ${chosung(ws[cur])}`; $('#vm').className = 'verdict'; };
        }
      };
      draw();
    }
    if (k === 'chosung') {
      let wi = 0; let miss = 0; const got = [];
      const draw = (msg = '') => {
        const board = ws.map((w, i) => i < wi ? `<span class="w ${got[i] < 1 ? 'bad' : ''}">${esc(w)}</span>` : i === wi ? `<span class="w cho cur">${esc(chosung(w))}</span>` : `<span class="w cho">${esc(chosung(w))}</span>`).join('');
        frame(`<p class="hint">초성을 보고 다음 단어를 적어 보세요.</p><div class="board">${board}</div>
          <label class="eyebrow" for="ci" style="margin-top:24px">다음 단어</label>
          <div class="line-input" style="margin-top:10px"><input id="ci" autocomplete="off" autocapitalize="off" spellcheck="false"><span class="eyebrow ac" style="letter-spacing:.08em">${esc(chosung(ws[wi]))}</span></div>
          <div style="display:flex;justify-content:space-between;margin-top:12px" class="small muted"><span class="nowrap">정답 규칙 · ${esc(rule)}</span><span class="nowrap num">${wi} / ${ws.length} 단어</span></div>
          <p class="verdict no" id="vm" style="min-height:24px;margin-top:8px">${msg}</p>`,
        { html: `<button class="btn" id="hint">보기</button><button class="btn pr" id="ck">확인</button>` });
        const inp = $('#ci'); inp.focus();
        const adv = (pts) => { got[wi] = pts; if (pts < 1) weak.add(wi); wi++; miss = 0; wi >= ws.length ? done('chosung', (got.reduce((a, b) => a + b, 0) / ws.length) * 100) : draw(); };
        const check = () => {
          if (gradeWord(inp.value, ws[wi], rule)) adv(miss === 0 ? 1 : 0.5);
          else { miss++; if (miss >= 2) { toast(`정답: ${ws[wi]}`); adv(0); } else { inp.parentElement.classList.add('shake'); setTimeout(() => inp.parentElement.classList.remove('shake'), 500); $('#vm').textContent = '한 번 더 생각해 보세요'; } }
        };
        $('#ck').onclick = check; inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) check(); };
        $('#hint').onclick = () => { toast(`정답: ${ws[wi]}`); adv(0); };
      };
      draw();
    }
    if (k === 'full') {
      let best = 0; let lastAns = '';
      frame(`<p class="hint">말씀 전체를 적어 보세요. 띄어쓰기와 문장부호는 보지 않습니다.</p>
        <label class="eyebrow" for="fa" style="margin-top:24px">${esc(v.topic || '')}</label>
        <textarea class="input verse" id="fa" style="margin-top:10px;font-size:calc(19px * var(--k))" autocomplete="off" spellcheck="false"></textarea>
        <div id="fr"></div>`, { html: `<button class="btn" id="skip">건너뛰기</button><button class="btn pr" id="ck">채점하기</button>` });
      $('#fa').focus();
      const leave = () => { missedWords(lastAns, v.text).forEach((i) => weak.add(i)); done('full', best); };
      $('#skip').onclick = () => { if (!lastAns) ws.forEach((w, i) => weak.add(i)); leave(); };
      $('#ck').onclick = () => {
        const ans = $('#fa').value; const r = gradeText(ans, v.text, rule); const pts = r.ok ? Math.max(Math.round(r.acc * 100), 95) : Math.round(r.acc * 100);
        if (pts >= best) { best = pts; lastAns = ans; }
        $('#fr').innerHTML = `<p class="verdict ${r.ok ? 'ok' : 'no'}">${r.ok ? icon('check', 20) + `잘 새기셨습니다 · ${pts}점` : `${pts}점 · 빨간 글자를 확인해 보세요`}</p><div class="result-box">${diffHTML(ans, v.text)}</div>`;
        if (r.ok) { $('#ck').textContent = '다음'; $('#ck').onclick = leave; $('#skip').classList.add('hidden'); $('.learn-foot').classList.add('one'); }
        else { $('#ck').textContent = '다시 쓰기'; $('#ck').onclick = () => { $('#fa').value = ''; $('#fr').innerHTML = ''; $('#ck').textContent = '채점하기'; $('#ck').onclick = null; runStage(); }; $('#skip').textContent = '이 점수로 넘어가기'; }
      };
    }
  }

  async function finish() {
    const first = !S.prog.v[v.id];
    const total = finalScore(sc);
    const iv = S.settings.intervals || [1, 3, 7, 14, 30];
    const prev = S.prog.v[v.id] || {};
    let item = first ? { box: 1, due: addDays(today(), iv[0]), learnedAt: today(), lastAt: Date.now(), reviews: 0 } : scheduleNext(prev, total >= WEAK_LINE, iv);
    const weakArr = [...weak].sort((a, b) => a - b);
    item = { ...item, score: total, best: Math.max(prev.best || 0, total), stages: sc, weak: weakArr, tries: (prev.tries || 0) + 1 };
    if (total < WEAK_LINE) item.due = addDays(today(), 1);
    S.prog.v[v.id] = item;
    await DB.set('progress/' + S.user.code, { v: { [v.id]: item } });
    const xp = Math.max(5, Math.round(total / 4));
    await touchDay(xp);
    const rows = stages.map((k) => `<div class="score-row"><span>${STAGE_NAME[k]}</span><i><b style="width:${sc[k] ?? 0}%"></b></i><span class="num">${sc[k] ?? 0}</span></div>`).join('');
    root.innerHTML = `<div class="learn"><div class="done-hero fade-in">
      <span class="eyebrow ac">${focus ? '약한 부분 다시' : first ? '새로 새긴 말씀' : '다시 새긴 말씀'} · ${esc(v.ref)}</span>
      <div class="score-big"><span class="num">${total}</span><em>점</em><span class="grade">${GRADE(total)}</span></div>
      <div class="score-rows">${rows}</div>
      ${weakArr.length ? `<div class="weak-box"><span class="eyebrow">다시 볼 단어 · 내일 복습에 나옵니다</span><div class="weak-words">${weakArr.map((i) => `<span>${esc(ws[i])}</span>`).join('')}</div></div>` : `<p class="verdict ok" style="margin:0">${icon('check', 20)}틀린 곳 없이 새기셨습니다</p>`}
      <p class="xp num">+${xp} 은혜 점수 <span class="muted" style="font-family:var(--f-ui);font-size:14px;font-weight:500">· ${currentStreak()}일 연속</span></p>
      <div class="field"><label for="nt">이 말씀이 나에게 하는 한 줄</label><textarea class="input verse" id="nt" style="min-height:88px" placeholder="떠오르는 마음을 적어 두세요 (선택)">${esc(S.prog.notes[v.id] || '')}</textarea></div>
    </div><footer class="learn-foot ${weakArr.length ? 'three' : ''}">
      <button class="btn" id="hm">홈으로</button>
      ${weakArr.length ? `<button class="btn" id="again">약한 부분 다시</button>` : ''}
      <button class="btn pr" id="sv">${nextVerse() ? '다음 말씀' : '저장하기'}</button></footer></div>`;
    const saveNote = async () => { const t = $('#nt').value.trim(); if (t && t !== S.prog.notes[v.id]) { S.prog.notes[v.id] = t; await DB.set('progress/' + S.user.code, { notes: { [v.id]: t } }); } };
    $('#hm').onclick = async () => { await saveNote(); go('#home'); };
    const ag = $('#again'); if (ag) ag.onclick = async () => { await saveNote(); viewLearn(v.id, true); };
    $('#sv').onclick = async () => { await saveNote(); const n = nextVerse(); go(n ? '#learn/' + n.id : '#home'); };
  }
  runStage();
}
function confirmLeave() {
  return new Promise((resolve) => {
    modal(`<h3>학습을 멈출까요?</h3><p class="muted" style="margin:0;line-height:1.7">지금까지 한 단계는 저장되지 않습니다.</p><div class="actions"><button class="btn md" data-close id="no">계속하기</button><button class="btn md pr" id="yes">멈추기</button></div>`, {
      onMount(el, close) { $('#yes', el).onclick = () => { close(); resolve(true); }; $('#no', el).onclick = () => resolve(false); }
    });
  });
}

/* ───────── 복습 ───────── */
function weakList() { return Object.entries(S.prog.v).filter(([, it]) => (it.score ?? 100) < WEAK_LINE).map(([id, it]) => ({ id, ...it })); }
async function viewReview() {
  const ids = [...new Set([...weakList().map((x) => x.id), ...dueList()])];
  const all = [];
  for (const id of ids) { const v = await getVerse(id); if (v) all.push(v); }
  all.sort((a, b) => ((S.prog.v[a.id] || {}).score ?? 100) - ((S.prog.v[b.id] || {}).score ?? 100));
  const weakRows = weakList().length ? `<section class="sec"><div class="sec-head"><h2>점수가 낮은 말씀</h2><span class="small muted nowrap">${WEAK_LINE}점 아래</span></div><div style="margin-top:6px">${(await Promise.all(weakList().map(async (x) => ({ x, v: await getVerse(x.id) })))).filter((r) => r.v).map(({ x, v }) => `<a class="topic-row" href="#learn/${v.id}"><span class="n num" style="color:var(--ac)">${x.score}</span><span style="display:flex;flex-direction:column;gap:3px;min-width:0"><span class="t">${esc(v.ref)}</span><span class="r">${esc((x.weak || []).slice(0, 4).map((i) => words(v.text)[i]).filter(Boolean).join(' · ') || v.topic || '')}</span></span><span class="st">${icon('next', 18)}</span></a>`).join('')}</div></section>` : '';
  if (!all.length) {
    const upcoming = Object.values(S.prog.v).map((x) => x.due).filter(Boolean).sort()[0];
    root.innerHTML = `<div class="shell">${topbar(streakHTML())}<main class="main"><section class="sec fade-in">
      <span class="eyebrow ac">복습</span><h1 class="head" style="font-size:calc(28px * var(--k));margin:14px 0 0">오늘 복습할 말씀이 없어요</h1>
      <p class="muted" style="margin:12px 0 0;line-height:1.7">${upcoming ? `다음 복습은 <b class="num" style="color:var(--ink)">${+upcoming.slice(5, 7)}월 ${+upcoming.slice(8)}일</b>에 돌아옵니다.` : '말씀을 외우면 잊을 즈음에 다시 찾아옵니다.'}</p>
      <div style="margin-top:24px"><a class="btn pr block" href="#home">새 말씀 외우기</a></div></section>
      ${reviewSchedule()}</main>${tabbar('review')}</div>`;
    return;
  }
  root.innerHTML = `<div class="shell">${topbar(streakHTML())}<main class="main fade-in">
    <section class="sec"><span class="eyebrow ac">복습</span><h1 class="head" style="font-size:calc(28px * var(--k));margin:14px 0 0">오늘 다시 새길 말씀 <span class="num" style="color:var(--ac)">${all.length}</span></h1>
      <p class="muted" style="margin:10px 0 0;line-height:1.7">점수가 낮았던 말씀과 복습 날짜가 된 말씀입니다. 약했던 단어부터 다시 물어봅니다.</p>
      <div style="margin-top:22px"><button class="btn pr block" id="go">복습 시작</button></div></section>
    ${weakRows}${reviewSchedule()}</main>${tabbar('review')}</div>`;
  $('#go').onclick = () => runReview(all);
}
async function runReview(all) {
  let i = 0; const results = [];
  const iv = S.settings.intervals || [1, 3, 7, 14, 30];
  const step = () => {
    if (i >= all.length) return done();
    const v = all[i]; const rule = courseRule(v.courseId); const ws = words(v.text);
    const prev = S.prog.v[v.id] || {};
    const head = `<header class="learn-top"><div class="lt-left"><button class="icon-btn" id="xq" aria-label="복습 닫기">${icon('close', 20)}</button>${i > 0 ? `<button class="icon-btn" id="bk" aria-label="이전 말씀으로">${icon('back', 20)}</button>` : ''}</div><div class="steps">${all.map((x, j) => `<i class="${j < i ? 'done' : j === i ? 'now' : ''}"></i>`).join('')}</div><span class="head num" style="font-size:13px;text-align:right">${i + 1}/${all.length}</span></header>`;
    const bind = () => { $('#xq').onclick = () => go('#review'); const bk = $('#bk'); if (bk) bk.onclick = () => { i--; results.pop(); step(); }; };
    const record = async (score, weakIdx) => {
      const ok = score >= WEAK_LINE;
      let item = scheduleNext(prev, ok, iv);
      item = { ...item, score, best: Math.max(prev.best || 0, score), weak: weakIdx, stages: prev.stages || {}, tries: (prev.tries || 0) + 1 };
      if (!ok) item.due = addDays(today(), 1);
      S.prog.v[v.id] = item; results.push({ v, score });
      await DB.set('progress/' + S.user.code, { v: { [v.id]: item } });
      i++; step();
    };
    if (easy()) {
      const pool = (S.verses[v.courseId] || []).flatMap((x) => words(x.text)).concat(ws);
      const blanks = pickBlanks(ws, 0.35, prev.weak || []); let bi = 0; const got = {}; let miss = 0;
      const draw = () => {
        const cur = blanks[bi];
        root.innerHTML = `<div class="learn">${head}<div class="learn-body fade-in"><div class="lb-head"><span class="eyebrow ac">복습 · ${esc(v.topic || '')}</span>${prev.score != null ? `<span class="eyebrow num">지난번 ${prev.score}점</span>` : ''}</div><h1 class="head">${esc(v.ref)}</h1>
          <div class="board">${ws.map((w, k) => blanks.includes(k) ? `<span class="w blank ${got[k] != null ? 'filled' : k === cur ? 'cur' : ''}">${esc(w)}</span>` : `<span class="w">${esc(w)}</span>`).join('')}</div>
          <div class="choices">${shuffle([norm(ws[cur]), ...distractors(ws[cur], pool)]).map((o) => `<button class="choice" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div></div></div>`;
        bind();
        $$('.choice').forEach((b) => b.onclick = () => {
          if (b.dataset.o === norm(ws[cur])) { b.classList.add('ok'); got[cur] = miss ? 0.5 : 1; miss = 0; setTimeout(() => { bi++; if (bi >= blanks.length) { const sc = Math.round((Object.values(got).reduce((a, x) => a + x, 0) / blanks.length) * 100); record(sc, blanks.filter((k) => got[k] < 1)); } else draw(); }, 300); }
          else { miss++; b.classList.add('no'); b.disabled = true; }
        });
      };
      draw();
    } else {
      root.innerHTML = `<div class="learn">${head}<div class="learn-body fade-in"><div class="lb-head"><span class="eyebrow ac">복습 · ${esc(v.topic || '')}</span>${prev.score != null ? `<span class="eyebrow num">지난번 ${prev.score}점</span>` : ''}</div><h1 class="head">${esc(v.ref)}</h1>
        <p class="hint">기억나는 대로 말씀을 적어 보세요.${(prev.weak || []).length ? ` 지난번에 <b style="color:var(--ac)">${(prev.weak || []).length}단어</b>가 약했어요.` : ''}</p>
        <textarea class="input verse" id="fa" style="margin-top:20px;font-size:calc(19px * var(--k))" spellcheck="false"></textarea><div id="fr"></div></div>
        <footer class="learn-foot"><button class="btn" id="hint">첫머리 보기</button><button class="btn pr" id="ck">채점하기</button></footer></div>`;
      bind();
      let peek = 0;
      $('#hint').onclick = () => { peek++; toast(ws.slice(0, 2 + peek).join(' ') + ' …', 3000); };
      $('#ck').onclick = () => {
        const ans = $('#fa').value; const r = gradeText(ans, v.text, rule);
        const score = Math.max(0, (r.ok ? Math.max(95, Math.round(r.acc * 100)) : Math.round(r.acc * 100)) - peek * 10);
        $('#fr').innerHTML = `<p class="verdict ${score >= WEAK_LINE ? 'ok' : 'no'}">${score >= WEAK_LINE ? icon('check', 20) + `잘 기억하셨어요 · ${score}점` : `${score}점 · 내일 다시 나옵니다`}</p><div class="result-box">${diffHTML(ans, v.text)}</div>`;
        $('#ck').textContent = '다음'; $('#ck').onclick = () => record(score, missedWords(ans, v.text)); $('#hint').disabled = true;
      };
    }
  };
  const done = async () => {
    const avg = Math.round(results.reduce((a, r) => a + r.score, 0) / (results.length || 1));
    const xp = Math.max(5, Math.round(avg / 5) + results.length * 2);
    await touchDay(xp);
    root.innerHTML = `<div class="learn"><div class="done-hero fade-in"><span class="eyebrow ac">복습 완료 · ${results.length}구절</span>
      <div class="score-big"><span class="num">${avg}</span><em>점</em><span class="grade">${GRADE(avg)}</span></div>
      <div class="score-rows">${results.map((r) => `<div class="score-row"><span>${esc(r.v.ref)}</span><i><b style="width:${r.score}%"></b></i><span class="num" style="color:${r.score < WEAK_LINE ? 'var(--ac)' : 'inherit'}">${r.score}</span></div>`).join('')}</div>
      <p class="xp num">+${xp} 은혜 점수</p></div><footer class="learn-foot one"><button class="btn pr" id="hm">홈으로</button></footer></div>`;
    $('#hm').onclick = () => go('#home');
  };
  step();
}
function reviewSchedule() {
  const byDay = {};
  Object.values(S.prog.v).forEach((x) => { if (x.due) byDay[x.due] = (byDay[x.due] || 0) + 1; });
  const days = Object.keys(byDay).filter((d) => d > today()).sort().slice(0, 7);
  if (!days.length) return '';
  return `<section class="sec"><div class="sec-head"><h2>다가오는 복습</h2></div><div style="margin-top:6px">${days.map((d) => `<div class="list-row"><div class="l"><b class="num">${+d.slice(5, 7)}월 ${+d.slice(8)}일</b></div><span class="head num">${byDay[d]}구절</span></div>`).join('')}</div></section>`;
}

/* ───────── 내 기록 ───────── */
async function viewMe() {
  const learned = Object.keys(S.prog.v).length;
  const mastered = Object.values(S.prog.v).filter((x) => x.mastered).length;
  const scored = Object.values(S.prog.v).filter((x) => x.score != null); const avg = scored.length ? Math.round(scored.reduce((a, x) => a + x.score, 0) / scored.length) : 0;
  const courseRows = [];
  for (const c of S.courses) {
    const vs = await loadVerses(c.id);
    const n = vs.filter((v) => S.prog.v[v.id]).length;
    courseRows.push({ c, n, total: vs.length });
  }
  const notes = Object.entries(S.prog.notes || {});
  const noteVerses = [];
  for (const [id, t] of notes.slice(-20).reverse()) { const v = await getVerse(id); if (v) noteVerses.push({ v, t }); }
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  root.innerHTML = `<div class="shell">${topbar(streakHTML())}<main class="main fade-in">
    <section class="sec"><span class="eyebrow">내 기록</span><h1 class="head" style="font-size:calc(28px * var(--k));margin:12px 0 0">${esc(S.user.name)} 님</h1></section>
    <div class="stats"><div><b>${learned}</b><span>새긴 말씀</span></div><div><b>${avg}</b><span>평균 점수</span></div><div><b>${currentStreak()}</b><span>연속 일수</span></div><div><b>${fmt(S.prog.xp || 0)}</b><span>은혜 점수</span></div></div>
    <section class="sec"><div class="sec-head"><h2>코스</h2><span class="small muted nowrap">오래 기억한 말씀 ${mastered}</span></div>
      <div style="margin-top:6px">${courseRows.map(({ c, n, total }) => `<div class="list-row"><div class="l"><b>${esc(c.name)}</b><span class="num">${n} / ${total}</span></div>${n >= total && total > 0 ? `<button class="btn sm pr" data-cert="${c.id}">${icon('award', 16)}수료증</button>` : `<span class="small muted num nowrap">${total ? Math.round((n / total) * 100) : 0}%</span>`}</div>`).join('')}</div></section>
    ${noteVerses.length ? `<section class="sec"><div class="sec-head"><h2>나의 한 줄</h2></div>${noteVerses.map(({ v, t }) => `<div class="note"><span class="eyebrow">${esc(v.ref)}</span><p>${esc(t)}</p></div>`).join('')}</section>` : ''}
    <section class="sec"><div class="sec-head"><h2>설정</h2></div>
      <div class="list-row"><div class="l"><b>쉬운 모드</b><span>타자 대신 골라서 맞히기</span></div><button class="switch ${easy() ? 'on' : ''}" id="ez" aria-label="쉬운 모드" aria-pressed="${easy()}"></button></div>
      ${standalone ? '' : `<div class="list-row"><div class="l"><b>홈 화면에 설치</b><span>${iOS ? '공유 단추 → 홈 화면에 추가' : '앱처럼 바로 열기'}</span></div><button class="btn sm" id="inst">${icon('phone', 16)}설치</button></div>`}
      <div class="list-row"><div class="l"><b>입장 코드</b><span class="num" style="letter-spacing:.1em">${esc(S.user.code)}</span></div><button class="btn sm" id="out">${icon('out', 16)}나가기</button></div>
    </section>
    ${credit()}
  </main>${tabbar('me')}</div>`;
  $('#ez').onclick = async () => { const nv = !easy(); S.prog.easy = nv; await DB.set('progress/' + S.user.code, { easy: nv }); viewMe(); };
  const inst = $('#inst'); if (inst) inst.onclick = async () => {
    if (S.installEvt) { S.installEvt.prompt(); S.installEvt = null; }
    else modal(`<h3>홈 화면에 설치</h3><p class="muted" style="line-height:1.8;margin:0">${iOS ? 'Safari 아래쪽 <b>공유</b> 단추를 누르고 <b>홈 화면에 추가</b>를 고르세요.' : '브라우저 메뉴(⋮)에서 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 고르세요.'}</p><div class="actions"><button class="btn md pr" data-close>알겠어요</button></div>`);
  };
  $('#out').onclick = () => { LS.del('user'); S.user = null; S.prog = null; go('#'); };
  $$('[data-cert]').forEach((b) => b.onclick = () => certificate(S.courses.find((c) => c.id === b.dataset.cert)));
}

async function certificate(c) {
  await document.fonts.ready;
  const W = 1200, H = 1600; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const cs = getComputedStyle(document.documentElement);
  const ac = cs.getPropertyValue('--ac').trim() || '#B23A2A';
  g.fillStyle = '#FAF8F4'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#1A1D24'; g.lineWidth = 2; g.strokeRect(60, 60, W - 120, H - 120);
  g.strokeStyle = '#E8E3DA'; g.lineWidth = 1; g.strokeRect(76, 76, W - 152, H - 152);
  const img = new Image();
  const logoSrc = S.logo || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markSVG(160, ac).replace('class="mark" ', 'xmlns="http://www.w3.org/2000/svg" '));
  await new Promise((r) => { img.onload = r; img.onerror = r; img.src = logoSrc; });
  try { const s = 150 / Math.max(img.width || 150, img.height || 150); g.drawImage(img, W / 2 - (img.width * s) / 2, 190, img.width * s, img.height * s); } catch (e) {}
  g.textAlign = 'center'; g.fillStyle = '#676B74'; g.font = '600 26px "IBM Plex Sans KR", sans-serif';
  g.fillText('C E R T I F I C A T E', W / 2, 430);
  g.fillStyle = '#1A1D24'; g.font = '600 96px "Hahmlet", serif'; g.fillText('수 료 증', W / 2, 560);
  g.fillStyle = ac; g.fillRect(W / 2 - 24, 610, 48, 3);
  g.fillStyle = '#1A1D24'; g.font = '600 64px "Hahmlet", serif'; g.fillText(S.user.name, W / 2, 760);
  g.fillStyle = '#3B3F48'; g.font = '400 34px "Gowun Batang", serif';
  g.fillText(`위 성도는 「${c.name}」을`, W / 2, 880);
  g.fillText('마음에 새겨 모두 마쳤기에', W / 2, 940);
  g.fillText('이 수료증을 드립니다.', W / 2, 1000);
  g.fillStyle = '#676B74'; g.font = '400 28px "Gowun Batang", serif';
  g.fillText('“그들의 마음에 이것을 기록하리라” 히브리서 8:10', W / 2, 1120);
  const d = new Date(); g.fillStyle = '#1A1D24'; g.font = '500 30px "IBM Plex Sans KR", sans-serif';
  g.fillText(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`, W / 2, 1260);
  g.font = '600 34px "Hahmlet", serif'; g.fillText(S.settings.churchName || (S.settings.appName || '새김') + ' INSCRIBE', W / 2, 1330);
  g.fillStyle = '#676B74'; g.font = '400 22px "IBM Plex Sans KR", sans-serif'; g.fillText('만든 곳 AI목양지원센터', W / 2, 1450);
  const url = cv.toDataURL('image/png');
  modal(`<h3>수료증</h3><img src="${url}" alt="수료증" style="width:100%;border-radius:8px;border:1px solid var(--line)"><div class="actions"><button class="btn md" data-close>닫기</button><a class="btn md pr" href="${url}" download="새김_수료증_${esc(S.user.name)}.png">${icon('down', 16)}내려받기</a></div>`);
}

/* ───────── 대전 참여 ───────── */
async function viewBattle(code) {
  if (!code) {
    root.innerHTML = `<div class="${S.user ? 'shell' : ''}">${S.user ? topbar(streakHTML()) : ''}<main class="main fade-in" style="${S.user ? '' : 'padding-top:48px'}">
      <section class="sec"><span class="eyebrow ac">말씀 대전</span><h1 class="head" style="font-size:calc(28px * var(--k));margin:12px 0 0">대전에 들어가기</h1>
      <p class="muted" style="margin:10px 0 0">TV의 QR을 찍거나, 6자리 방 코드를 넣어 주세요.</p></section>
      <form id="jf" style="display:flex;flex-direction:column;gap:16px">
        ${S.user ? '' : `<div class="field"><label for="gn">이름</label><input class="input" id="gn" placeholder="대전에서 보일 이름" maxlength="10" value="${esc((LS.get('guest') || {}).name || '')}"></div>`}
        <button class="btn pr block" type="button" id="qr">${icon('qr', 20)}QR 찍어서 들어가기</button>
        <div style="display:flex;align-items:center;gap:12px;color:var(--sub);font-size:12px"><span class="hair" style="flex:1"></span>또는 방 코드<span class="hair" style="flex:1"></span></div>
        <input class="input code-input" id="rc" inputmode="numeric" maxlength="6" placeholder="000000" aria-label="방 코드" autocomplete="off">
        <button class="btn block" type="submit">코드로 들어가기</button>
        <div class="list-row" style="border-bottom:none"><div class="l"><b>대전 소리</b><span>답 보낼 때와 결과 소리·진동</span></div><button type="button" class="switch ${phoneSound() ? 'on' : ''}" id="ps" aria-label="대전 소리" aria-pressed="${phoneSound()}"></button></div>
        ${S.user ? '' : '<a class="btn ghost block" href="#">로그인 화면으로</a>'}
      </form>${S.user ? '' : credit()}</main>${S.user ? tabbar('battle') : ''}</div>`;
    const guestOk = () => { if (S.user) return true; const n = $('#gn').value.trim(); if (!n) { toast('이름을 먼저 적어 주세요'); $('#gn').focus(); return false; } LS.set('guest', { name: n }); return true; };
    $('#jf').onsubmit = (e) => {
      e.preventDefault(); const c = $('#rc').value.replace(/\D/g, '');
      if (c.length !== 6) return toast('6자리 숫자를 입력해 주세요');
      if (!guestOk()) return;
      go('#battle/' + c);
    };
    $('#qr').onclick = () => { if (guestOk()) scanQR((c) => go('#battle/' + c)); };
    $('#ps').onclick = (e) => { const on = !phoneSound(); LS.set('phone-sound', on); e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-pressed', String(on)); if (on) { Sound.unlock(); Sound.configure({ sfx: true, bgm: false, volume: 0.6 }); Sound.click(); } };
    return;
  }
  const room = await DB.get('rooms/' + code).catch(() => null);
  if (!room || room.status === 'end') { toast('열려 있는 방이 아닙니다'); return go('#battle'); }
  const name = S.user ? S.user.name : ((LS.get('guest') || {}).name);
  if (!name) return go('#battle');
  const pPath = `rooms/${code}/players/${S.uid}`;
  let me = await DB.get(pPath).catch(() => null);
  if (!me) {
    let team = S.user && S.user.team ? S.user.team : null;
    if (room.teamMode && room.teams && room.teams.length) {
      if (!team || !room.teams.find((t) => t.id === team)) team = await pickTeam(room.teams);
    }
    await DB.set(pPath, { name, team: team || null, code: S.user ? S.user.code : null, joinedAt: op.now(), ans: {} });
    me = { name, team };
  }
  let lastKey = '';
  const off = DB.onDoc('rooms/' + code, (r) => {
    if (!r) return;
    const key = `${r.status}-${r.qi}`;
    if (key === lastKey && r.status !== 'reveal') return;
    lastKey = key;
    renderBattle(code, r, me);
  });
  addCleanup(off);
}
function pickTeam(teams) {
  return new Promise((resolve) => {
    modal(`<h3>팀을 골라 주세요</h3><p class="muted" style="margin:0 0 16px">사랑방 대항전입니다.</p><div style="display:grid;gap:8px">${teams.map((t) => `<button class="btn block" data-t="${t.id}" style="justify-content:flex-start;gap:12px"><span style="width:12px;height:12px;border-radius:6px;background:${t.color}"></span>${esc(t.name)}</button>`).join('')}</div>`, {
      onMount(el, close) { $$('[data-t]', el).forEach((b) => b.onclick = () => { close(); resolve(b.dataset.t); }); }
    });
  });
}
let tickHandle = null;
function renderBattle(code, r, me) {
  clearInterval(tickHandle);
  const res = (r.results || {})[S.uid];
  const myScore = (r.scores || {})[S.uid] || 0;
  const rank = r.ranks ? r.ranks[S.uid] : null;
  const out = r.mode === 'survival' && r.alive && r.alive[S.uid] === false;
  const header = `<header class="bt-top"><button class="icon-btn bt-exit" id="bx" aria-label="대전 나가기">${icon('back', 20)}</button><div class="l"><span class="eyebrow">방 ${code.slice(0, 3)} ${code.slice(3)} · ${esc(r.theme || '')}</span><span class="head" style="font-size:17px">${r.status === 'lobby' ? esc(BATTLE_MODES[r.mode]?.name || '') : `문제 ${(r.qi || 0) + 1} <span class="muted">/ ${r.questions ? r.questions.length : ''}</span>`}</span></div>
    <div class="r"><span class="eyebrow">${esc(me.name)}${rank ? ` · ${rank}위` : ''}</span><span class="head num" style="font-size:17px;color:var(--ac)">${fmt(myScore)}점</span></div></header>`;
  const leaveTo = () => (S.user ? '#home' : '#battle');
  const bindExit = () => { const b = $('#bx'); if (b) b.onclick = async () => { if (r.status === 'end' || (await confirmExit())) go(leaveTo()); }; };
  const wait = (big, small, end = false) => {
    root.innerHTML = `<div class="bt">${header}<div class="bt-body"><div class="bt-wait fade-in"><span class="eyebrow ac">${small}</span><p class="big">${big}</p></div></div>
      ${end ? `<footer class="learn-foot"><a class="btn" href="#battle">다른 대전</a><a class="btn pr" href="${leaveTo()}">${S.user ? '홈으로' : '처음으로'}</a></footer>` : ''}
      <p class="credit" style="padding-bottom:20px">만든 곳 <b>AI목양지원센터</b></p></div>`;
    bindExit();
  };
  if (r.status === 'lobby') return wait('곧 시작합니다', `${esc(me.name)} 님 입장 완료`);
  if (r.status === 'end') return wait(rank ? `${rank}위 · ${fmt(myScore)}점` : '대전이 끝났습니다', '수고하셨습니다', true);
  if (r.status === 'reveal') {
    if (out) return wait('탈락했지만<br>끝까지 응원해 주세요', '노아의 방주 밖');
    if (res && phoneSound() && renderBattle._snd !== code + r.qi) { renderBattle._snd = code + r.qi; if (res.ok) { Sound.correct(); Sound.vibrate([40, 40, 40]); } else { Sound.wrong(); Sound.vibrate(160); } }
    return wait(res ? (res.ok ? `정답입니다<br><span class="num" style="color:var(--ac)">+${fmt(res.gain)}</span>` : '아쉽지만<br>다음 문제에서') : '답을 보내지 못했어요', '결과');
  }
  if (r.status !== 'q') return;
  if (out) return wait('탈락했어요<br>TV로 함께 보세요', '서바이벌');
  const q = r.questions[r.qi];
  const ansKey = 'ans.q' + r.qi;
  const pPath = `rooms/${code}/players/${S.uid}`;
  const send = async (val) => { Sound.configure({ sfx: phoneSound(), bgm: false, volume: 0.6 }); Sound.unlock(); Sound.click(); Sound.vibrate(25); await DB.update(pPath, { [ansKey]: { v: val, at: op.now() } }); };
  const dur = (r.time || 20) * 1000; const started = Date.now();
  const timer = `<div class="bt-timer"><div class="bar"><i id="tb" style="width:100%"></i></div><span class="head num" id="tt" style="font-size:14px;text-align:right">${r.time || 20}초</span></div>`;
  const body = (html) => { root.innerHTML = `<div class="bt">${header}${timer}<div class="bt-body fade-in">${html}</div></div>`; bindExit(); };
  const shapes = ['M12 3 22 21H2z', 'M12 2 22 12 12 22 2 12z', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M3 3h18v18H3z'];
  const sent = () => { $$('button,input,textarea', $('.bt-body')).forEach((b) => b.disabled = true); const n = document.createElement('p'); n.className = 'verdict'; n.innerHTML = icon('check', 18) + '보냈습니다 · TV를 봐 주세요'; $('.bt-body').appendChild(n); };
  if (q.kind === 'choice') {
    body(`<span class="eyebrow ac">${esc(q.prompt)}</span><p class="verse" style="margin:14px 0 0;font-size:calc(20px * var(--k));line-height:1.8">${q.words && q.blankIndex != null ? q.words.map((w, i) => (i === q.blankIndex ? '<span class="bt-blank"></span>' : esc(w))).join(' ') : esc(q.display)}</p>${q.sub ? `<span class="small muted" style="margin-top:10px;font-weight:600">${esc(q.sub)}</span>` : ''}
      <div class="bt-choices">${q.choices.map((c, i) => `<button class="bt-choice c${i} ${q.refChoices ? 'ref' : ''}" data-i="${i}"><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" fill-opacity=".85" aria-hidden="true"><path d="${shapes[i]}"/></svg><span>${esc(c)}</span></button>`).join('')}</div>`);
    $$('.bt-choice').forEach((b) => b.onclick = async () => { b.classList.add('picked'); await send(+b.dataset.i); sent(); });
  } else if (q.kind === 'order') {
    const placed = [];
    const draw = () => {
      body(`<span class="eyebrow ac">순서대로 눌러 주세요 · ${esc(q.sub || '')}</span>
        <div class="board" id="bd">${placed.map((i) => `<span class="tile placed">${esc(q.chunks[i])}</span>`).join('') || '<span class="muted small">여기에 쌓입니다</span>'}</div>
        <div class="pool">${q.shuffled.map((i) => `<button class="tile ${placed.includes(i) ? 'used' : ''}" data-i="${i}">${esc(q.chunks[i])}</button>`).join('')}</div>
        <div style="display:grid;grid-template-columns:112px 1fr;gap:12px;margin-top:20px"><button class="btn" id="rs">다시</button><button class="btn pr" id="go" ${placed.length < q.chunks.length ? 'disabled' : ''}>보내기</button></div>`);
      $$('.pool .tile').forEach((b) => b.onclick = () => { placed.push(+b.dataset.i); draw(); });
      $('#rs').onclick = () => { placed.length = 0; draw(); };
      $('#go').onclick = async () => { await send(placed.join(',')); sent(); };
    };
    draw();
  } else if (q.kind === 'write') {
    body(`<span class="eyebrow ac">말씀 전체를 적어 주세요</span><h2 class="head" style="font-size:calc(26px * var(--k));margin:12px 0 0">${esc(q.display)}</h2>${q.sub ? `<span class="small muted" style="margin-top:6px">${esc(q.sub)}</span>` : ''}
      <textarea class="input verse" id="wa" style="margin-top:20px;font-size:calc(18px * var(--k))" spellcheck="false"></textarea>
      <button class="btn pr block" id="go" style="margin-top:16px">보내기</button>`);
    $('#go').onclick = async () => { await send($('#wa').value); sent(); };
  } else if (q.kind === 'relay') {
    const myIdx = (r.relay || {})[S.uid];
    if (myIdx == null) body(`<div class="bt-wait"><span class="eyebrow ac">릴레이</span><p class="big">이번 문제는<br>팀원을 응원해 주세요</p></div>`);
    else {
      const part = q.chunks[myIdx];
      body(`<span class="eyebrow ac">내 차례 · ${myIdx + 1}번째 조각 / ${q.chunks.length}</span><h2 class="head" style="font-size:calc(26px * var(--k));margin:12px 0 0">${esc(q.display)}</h2>
        <p class="small muted" style="margin:10px 0 0">앞 조각: <span class="verse">${myIdx > 0 ? esc(q.chunks[myIdx - 1]) : '(처음)'}</span></p>
        <div class="line-input" style="margin-top:20px"><input id="ri" autocomplete="off" spellcheck="false"><span class="eyebrow ac" style="letter-spacing:.06em">${esc(part.split(' ').map(chosung).join(' '))}</span></div>
        <button class="btn pr block" id="go" style="margin-top:20px">보내기</button>`);
      $('#ri').focus();
      $('#go').onclick = async () => { await send($('#ri').value); sent(); };
    }
  }
  tickHandle = setInterval(() => {
    const left = Math.max(0, dur - (Date.now() - started)); const tb = $('#tb'); const tt = $('#tt');
    if (tb) tb.style.width = (left / dur) * 100 + '%'; if (tt) tt.textContent = Math.ceil(left / 1000) + '초';
    if (left <= 0) clearInterval(tickHandle);
  }, 250);
  addCleanup(() => clearInterval(tickHandle));
}

/* ───────── 대전 소리 · QR 찍기 ───────── */
function phoneSound() { const v = LS.get('phone-sound'); return v == null ? (S.settings.battle || {}).sound !== false : !!v; }
function loadJsQR() {
  if (window.jsQR) return Promise.resolve();
  return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'vendor/jsqr.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
}
function roomFromText(t) {
  const m = String(t).match(/[?&#]room=(\d{6})/) || String(t).match(/battle\/(\d{6})/) || String(t).match(/^\s*(\d{6})\s*$/);
  return m ? m[1] : null;
}
async function scanQR(onCode) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('이 기기에서는 카메라를 쓸 수 없습니다. 방 코드를 넣어 주세요');
  let stream = null, raf = 0, stopped = false;
  const close = modal(`<div class="scan"><div class="scan-view"><video id="sv" playsinline muted></video><i class="scan-frame"></i></div>
    <h3 style="margin-top:20px">TV의 QR을 비춰 주세요</h3><p class="muted small" id="sm" style="margin:0">카메라를 켜는 중…</p>
    <div class="actions"><button class="btn md block" data-close id="sc">닫기</button></div></div>`, {
    onMount(el) { el.classList.add('scan-modal'); el.parentElement.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target === el.parentElement) stop(); }); }
  });
  const stop = () => { stopped = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); };
  try {
    const [st] = await Promise.all([navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }), loadJsQR()]);
    stream = st; if (stopped) return stop();
    const v = $('#sv'); v.srcObject = stream; await v.play();
    $('#sm').textContent = '네모 안에 QR이 들어오면 자동으로 들어갑니다';
    const cv = document.createElement('canvas'); const g = cv.getContext('2d', { willReadFrequently: true });
    const det = 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
    const loop = async () => {
      if (stopped) return;
      if (v.readyState >= 2) {
        let text = null;
        if (det) { try { const r = await det.detect(v); if (r[0]) text = r[0].rawValue; } catch (e) {} }
        if (!text && window.jsQR) {
          const w = Math.min(640, v.videoWidth), h = Math.round(v.videoHeight * (w / v.videoWidth));
          cv.width = w; cv.height = h; g.drawImage(v, 0, 0, w, h);
          const r = window.jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' }); if (r) text = r.data;
        }
        const c = text && roomFromText(text);
        if (c) { Sound.unlock(); Sound.vibrate(40); stop(); close(); onCode(c); return; }
        if (text) $('#sm').textContent = '새김 대전 QR이 아닙니다. TV 화면의 QR을 비춰 주세요';
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
  } catch (e) {
    console.error(e); stop();
    const m = $('#sm'); if (m) m.innerHTML = '카메라를 쓸 수 없습니다. 브라우저에서 카메라 허용을 켜거나, 방 코드를 넣어 주세요.';
  }
}

function confirmExit() {
  return new Promise((resolve) => {
    modal(`<h3>대전에서 나갈까요?</h3><p class="muted" style="margin:0;line-height:1.7">지금까지 얻은 점수는 TV 순위에 남습니다. 다시 들어오려면 방 코드나 QR로 들어오시면 됩니다.</p><div class="actions"><button class="btn md" data-close id="no">계속하기</button><button class="btn md pr" id="yes">나가기</button></div>`, {
      onMount(el, close) { $('#yes', el).onclick = () => { close(); resolve(true); }; $('#no', el).onclick = () => resolve(false); }
    });
  });
}
