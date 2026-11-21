// 새김 INSCRIBE — TV 대전
import {
  DB, op, whenAuthed, loadSettings, applySettings, markSVG, icon, esc, $, $$, toast, shuffle, fmt, words, norm, gradeText,
  BATTLE_MODES, BATTLE_THEMES, roomCode, MOCK
} from './core.js';
import { qrcode } from '../vendor/qrcode.mjs';
import { Sound } from './sound.js';

const root = $('#root');
const H = { settings: null, courses: [], teams: [], sel: null, code: null, room: null, players: [], offs: [], timer: null, adv: null, rates: [], localStart: 0 };
const SHAPES = ['M12 3 22 21H2z', 'M12 2 22 12 12 22 2 12z', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M3 3h18v18H3z'];
const CCOL = ['#A8432F', '#2E5D8A', '#8A6519', '#36664E'];

(async function boot() {
  const [u, settings] = await Promise.all([whenAuthed(), loadSettings()]);
  H.uid = u.uid; H.settings = settings;
  const [, cs, ts] = await Promise.all([applySettings(H.settings, { bgKey: 'tvbg' }), DB.list('courses'), DB.list('teams')]);
  H.courses = cs.filter((c) => c.published !== false && (c.count || 0) > 0).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  H.teams = ts.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const b = H.settings.battle || {};
  H.sel = { courses: new Set(H.courses.slice(0, 1).map((c) => c.id)), mode: 'speed', theme: b.theme || '여리고 성벽', teamMode: false, count: b.count || 10, time: b.time || 20, rule: H.settings.rule || '보통', scoring: b.scoring || 'speed' };
  Sound.configure({ sfx: b.sound !== false, bgm: b.bgm !== false, volume: b.volume ?? 0.7 });
  muteButton();
  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });
  setup();
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') { const n = $('[data-next]'); if (n && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); n.click(); } }
  });
})();

const setBTheme = (t) => { document.body.dataset.btheme = t; };
const head = (right = '') => `<header class="tv-head">${`<span class="brand">${markSVG(Math.round(innerWidth * 0.033))}<span style="display:flex;flex-direction:column;gap:.35vw"><span class="brand-name">${esc(H.settings.appName || '새김')} 말씀 대전</span><span class="brand-sub">INSCRIBE BATTLE</span></span></span>`}${right}</header>`;

/* ───────── 1. 설정 ───────── */
function setup() {
  Sound.stopBgm();
  setBTheme(H.sel.theme);
  const S = H.sel;
  const seg = (key, opts, cur, label = (x) => x) => `<div class="tv-seg" data-seg="${key}">${opts.map((o) => `<button class="${String(o) === String(cur) ? 'on' : ''}" data-v="${o}">${label(o)}</button>`).join('')}</div>`;
  root.innerHTML = `<div class="tvw fade-in">${head(`<div style="display:flex;align-items:center;gap:1.6vw"><span class="tv-credit">만든 곳 <b>AI목양지원센터</b></span><button class="tv-btn pr" id="mk">${icon('play', 18)}방 만들기</button></div>`)}
    <div class="setup">
      <div class="setup-col">
        <div><h2>대전 방식</h2><div class="cards">${Object.entries(BATTLE_MODES).map(([k, m]) => `<button class="card ${S.mode === k ? 'on' : ''}" data-mode="${k}"><b>${m.name}</b><span>${m.desc}</span></button>`).join('')}</div></div>
        <div><h2>대전 테마</h2><div class="cards">${BATTLE_THEMES.map((t) => `<button class="card ${S.theme === t ? 'on' : ''}" data-bt="${t}"><b>${t}</b><span>${themeDesc(t)}</span></button>`).join('')}</div></div>
      </div>
      <div class="setup-col">
        <div><h2>말씀 코스</h2><div class="course-list">${H.courses.map((c) => `<label><input type="checkbox" data-c="${c.id}" ${S.courses.has(c.id) ? 'checked' : ''}><b style="font-weight:600;white-space:nowrap">${esc(c.name)}</b><span class="tv-eyebrow" style="letter-spacing:.06em">${c.count}구절</span></label>`).join('') || '<p class="tv-credit">공개된 코스가 없습니다. 관리자 화면에서 말씀을 넣어 주세요.</p>'}</div></div>
        <div style="display:flex;flex-direction:column;gap:1vw">
          <div class="opt-row"><span>참여 방식</span>${seg('teamMode', ['개인전', '팀전'], S.teamMode ? '팀전' : '개인전')}</div>
          <div class="opt-row"><span>문제 수</span>${seg('count', [5, 7, 10, 15, 20], S.count, (x) => x + '문제')}</div>
          <div class="opt-row"><span>제한 시간</span>${seg('time', [10, 15, 20, 30, 45, 60], S.time, (x) => x + '초')}</div>
          <div class="opt-row"><span>정답 규칙</span>${seg('rule', ['엄격', '보통', '느슨'], S.rule)}</div>
          <div class="opt-row"><span>점수</span>${seg('scoring', ['correct', 'speed'], S.scoring, (x) => (x === 'speed' ? '정답 + 속도' : '정답만'))}</div>
        </div>
        ${S.mode === 'relay' && !H.teams.length ? '<p class="tv-credit" style="color:var(--ac)">사랑방 릴레이는 팀이 있어야 합니다. 관리자 화면에서 팀을 만들어 주세요.</p>' : ''}
      </div>
    </div></div>`;
  $$('[data-mode]').forEach((b) => b.onclick = () => { S.mode = b.dataset.mode; if (S.mode === 'relay') S.teamMode = true; if (S.mode === 'survival' && S.theme === '여리고 성벽') S.theme = '노아의 방주'; setup(); });
  $$('[data-bt]').forEach((b) => b.onclick = () => { S.theme = b.dataset.bt; setup(); });
  $$('[data-c]').forEach((b) => b.onchange = () => { b.checked ? S.courses.add(b.dataset.c) : S.courses.delete(b.dataset.c); });
  $$('[data-seg]').forEach((g) => $$('button', g).forEach((b) => b.onclick = () => {
    const k = g.dataset.seg, v = b.dataset.v;
    if (k === 'teamMode') S.teamMode = v === '팀전'; else if (k === 'count' || k === 'time') S[k] = Number(v); else S[k] = v;
    if (S.mode === 'relay') S.teamMode = true;
    setup();
  }));
  $('#mk').onclick = createRoom;
}
function themeDesc(t) {
  return { '여리고 성벽': '정답이 쌓이면 성벽이 무너짐', '다윗과 골리앗': '모두의 정답으로 거인을 쓰러뜨림', '홍해 건너기': '맞힐수록 바다 길을 달려감', '갈멜산 제단': '팀마다 제단을 쌓고 불이 내림', '노아의 방주': '살아남은 사람이 방주에 오름', '아케이드': '네온 게임쇼 분위기' }[t] || '';
}

/* ───────── 2. 방 만들기 ───────── */
async function createRoom() {
  const S = H.sel;
  if (!S.courses.size) return toast('말씀 코스를 하나 이상 골라 주세요');
  if (S.teamMode && !H.teams.length) return toast('팀이 없습니다. 관리자 화면에서 팀을 먼저 만들어 주세요');
  let code; for (let i = 0; i < 10; i++) { code = roomCode(); const ex = await DB.get('rooms/' + code).catch(() => null); if (!ex || ex.status === 'end') break; }
  H.code = code;
  await DB.set('rooms/' + code, {
    hostUid: H.uid, status: 'lobby', mode: S.mode, theme: S.theme, time: S.time, count: S.count, rule: S.rule, scoring: S.scoring,
    teamMode: S.teamMode, teams: S.teamMode ? H.teams.map((t) => ({ id: t.id, name: t.name, color: t.color })) : [],
    qi: -1, createdAt: Date.now(), scores: {}, results: {}, ranks: {}, alive: {}
  }, false);
  H.offs.forEach((f) => f()); H.offs = [];
  H.offs.push(DB.onCol(`rooms/${code}/players`, (ps) => { H.players = ps; onPlayers(); }));
  H.offs.push(DB.onDoc('rooms/' + code, (r) => { H.room = r; }));
  H.rates = []; H.lastCount = 0;
  Sound.unlock(); Sound.bgm(S.theme, 'lobby');
  lobby();
}
function joinURL() {
  const base = new URL('./', location.href).href.split('?')[0];
  return `${base}${MOCK ? 'index.html?mock&' : '?'}room=${H.code}`;
}
function qrSVG(text) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}
function lobby() {
  H.view = 'lobby';
  const S = H.sel;
  root.innerHTML = `<div class="tvw fade-in">${head(`<div style="display:flex;flex-direction:column;align-items:flex-end;gap:.4vw"><span class="tv-eyebrow">이번 판</span><span class="tv-title" style="font-size:1.6vw">${BATTLE_MODES[S.mode].name} <span style="color:var(--ac)">·</span> ${esc(S.theme)}</span></div>`)}
    <div class="lobby">
      <section class="lobby-left">
        <div style="display:grid;grid-template-columns:15.6vw 1fr;column-gap:2vw;align-items:end">
          <div class="qr">${qrSVG(joinURL())}</div>
          <div style="display:flex;flex-direction:column;gap:.8vw;padding-bottom:.3vw"><span class="tv-eyebrow ac">입장 방법</span><span style="font-size:1.3vw;line-height:1.6">휴대폰 카메라로<br>QR을 찍어 주세요</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:.7vw">
          <span class="tv-eyebrow">또는 대전 메뉴에서 방 코드 입력</span>
          <span class="room-code">${H.code.slice(0, 3)} ${H.code.slice(3)}</span>
          <span style="font-size:1.1vw;color:var(--sub);white-space:nowrap">${esc(new URL('./', location.href).host + new URL('./', location.href).pathname)}</span>
        </div>
      </section>
      <section class="people">
        <div class="people-head"><span class="tv-title" style="font-size:1.8vw">들어온 사람</span><span class="tv-title" id="pc" style="font-size:1.8vw;color:var(--ac)">0</span></div>
        <div class="people-grid" id="pg"></div>
        <div id="tsum" style="margin-top:auto;display:flex;gap:2vw;font-size:1.05vw;color:var(--sub);padding-top:1vw"></div>
      </section>
    </div>
    <footer class="mode-strip">${Object.entries(BATTLE_MODES).map(([k, m]) => `<div class="${S.mode === k ? 'on' : ''}"><b>${m.name}</b><span>${m.desc}</span></div>`).join('')}
      <div style="flex-direction:row;align-items:center;gap:1vw;border:none"><button class="tv-btn" id="bk">처음으로</button><button class="tv-btn pr" id="st" data-next>${icon('play', 18)}시작하기</button></div></footer>
  </div>`;
  $('#st').onclick = start;
  $('#bk').onclick = async () => { await DB.set('rooms/' + H.code, { status: 'end' }); H.offs.forEach((f) => f()); setup(); };
  onPlayers();
}
function teamOf(id) { return (H.room && H.room.teams || []).find((t) => t.id === id); }
function onPlayers() {
  if (H.view === 'lobby') {
    const pg = $('#pg'); if (!pg) return;
    if (H.players.length > (H.lastCount || 0)) Sound.join();
    H.lastCount = H.players.length;
    $('#pc').textContent = H.players.length;
    pg.innerHTML = H.players.slice(0, 40).map((p) => `<div class="person"><i style="background:${(teamOf(p.team) || {}).color || 'var(--ac)'}"></i><span>${esc(p.name)}</span></div>`).join('');
    if (H.room && H.room.teamMode) $('#tsum').innerHTML = H.room.teams.map((t) => `<span style="display:flex;align-items:center;gap:.6vw;white-space:nowrap"><i style="width:.65vw;height:.65vw;border-radius:50%;background:${t.color}"></i>${esc(t.name)} ${H.players.filter((p) => p.team === t.id).length}명</span>`).join('');
  }
  if (H.view === 'q') { updateAnswered(); maybeEarly(); }
}

/* ───────── 3. 문제 만들기 ───────── */
function chunkVerse(ws, n) {
  n = Math.max(2, Math.min(n, ws.length)); const size = Math.ceil(ws.length / n); const out = [];
  for (let i = 0; i < ws.length; i += size) out.push(ws.slice(i, i + size).join(' '));
  return out;
}
async function buildQuestions() {
  const S = H.sel; let pool = [];
  for (const cid of S.courses) pool = pool.concat(await DB.list('verses', { where: [['courseId', '==', cid]] }));
  const allWords = [...new Set(pool.flatMap((v) => words(v.text)).map(norm).filter((w) => w.length >= 2))];
  const pick = shuffle(pool).slice(0, S.count);
  const qs = pick.map((v) => {
    const ws = words(v.text);
    if (S.mode === 'speed' || S.mode === 'survival') {
      const cand = ws.map((w, i) => i).filter((i) => norm(ws[i]).length >= 2);
      const bi = shuffle(cand.sort((a, b) => norm(ws[b]).length - norm(ws[a]).length).slice(0, Math.max(3, Math.ceil(cand.length / 2))))[0] ?? 0;
      const ans = norm(ws[bi]);
      const ds = shuffle(allWords.filter((w) => w !== ans).sort((a, b) => Math.abs(a.length - ans.length) - Math.abs(b.length - ans.length)).slice(0, 12)).slice(0, 3);
      const choices = shuffle([ans, ...ds]);
      return { kind: 'choice', prompt: '빈칸에 들어갈 말씀은?', display: ws.map((w, i) => (i === bi ? '＿＿＿' : w)).join(' '), blankIndex: bi, words: ws, sub: v.ref, choices, answer: choices.indexOf(ans), text: v.text, ref: v.ref };
    }
    if (S.mode === 'ref') {
      const others = shuffle([...new Set(pool.filter((x) => x.ref !== v.ref).map((x) => x.ref))]).slice(0, 3);
      const choices = shuffle([v.ref, ...others]);
      return { kind: 'choice', refChoices: true, prompt: '이 말씀의 장절은?', display: v.text, sub: v.topic || '', choices, answer: choices.indexOf(v.ref), text: v.text, ref: v.ref };
    }
    if (S.mode === 'order') {
      const chunks = chunkVerse(ws, Math.min(6, Math.max(4, Math.ceil(ws.length / 3))));
      let sh = shuffle(chunks.map((c, i) => i)); if (sh.every((x, i) => x === i)) sh = sh.reverse();
      return { kind: 'order', chunks, shuffled: sh, answer: chunks.map((c, i) => i).join(','), sub: v.ref, display: v.ref, text: v.text, ref: v.ref };
    }
    if (S.mode === 'full') return { kind: 'write', display: v.ref, sub: v.topic || '', text: v.text, ref: v.ref };
    // relay
    const maxTeam = Math.max(2, ...H.sel._teamSizes || [2]);
    return { kind: 'relay', chunks: chunkVerse(ws, Math.min(6, Math.max(2, maxTeam))), display: v.ref, sub: v.topic || '', text: v.text, ref: v.ref };
  });
  return qs;
}

/* ───────── 4. 진행 ───────── */
async function start() {
  if (!H.players.length) return toast('아직 들어온 사람이 없습니다');
  if (H.sel.mode === 'relay') H.sel._teamSizes = H.room.teams.map((t) => H.players.filter((p) => p.team === t.id).length);
  const questions = await buildQuestions();
  if (!questions.length) return toast('문제를 만들 말씀이 없습니다');
  const alive = {}; H.players.forEach((p) => (alive[p.id] = true));
  H.questions = questions;
  await DB.update('rooms/' + H.code, { questions, alive, scores: {}, results: {}, ranks: {}, teamScores: {}, startedAt: Date.now() });
  ask(0);
}
function relayMap(q) {
  const map = {};
  (H.room.teams || []).forEach((t) => {
    const mem = H.players.filter((p) => p.team === t.id && (!H.room.alive || H.room.alive[p.id] !== false));
    mem.forEach((p, i) => { if (i < q.chunks.length) map[p.id] = i; });
    // 팀원이 조각보다 적으면 앞사람이 이어서 맡음
    for (let k = mem.length; k < q.chunks.length && mem.length; k++) map[mem[k % mem.length].id + '#' + k] = k;
  });
  return map;
}
async function ask(qi) {
  clearInterval(H.timer); clearTimeout(H.adv);
  const q = H.questions[qi];
  const patch = { status: 'q', qi, qStart: op.now(), results: {} };
  if (q.kind === 'relay') patch.relay = Object.fromEntries(Object.entries(relayMap(q)).filter(([k]) => !k.includes('#')));
  H.localStart = Date.now(); H.view = 'q'; H.qi = qi;
  await DB.update('rooms/' + H.code, patch);
  renderQuestion();
  Sound.start(); Sound.bgm(H.sel.theme, 'play');
  const dur = H.sel.time * 1000; let lastSec = null;
  H.timer = setInterval(() => {
    const left = Math.max(0, dur - (Date.now() - H.localStart));
    const sec = Math.ceil(left / 1000); if (left > 0 && sec <= 5 && sec !== lastSec) { lastSec = sec; Sound.tick(sec <= 3); }
    const t = $('.timer'); if (t) { t.style.setProperty('--deg', (left / dur) * 360 + 'deg'); $('span', t).textContent = Math.ceil(left / 1000); }
    if (left <= 0) { clearInterval(H.timer); reveal(); } else maybeEarly();
  }, 200);
}
function aliveIds() { return H.players.filter((p) => !H.room || !H.room.alive || H.room.alive[p.id] !== false).map((p) => p.id); }
function answeredCount() { const k = 'q' + H.qi; return H.players.filter((p) => p.ans && p.ans[k] != null && aliveIds().includes(p.id)).length; }
function updateAnswered() { const el = $('#ac'); if (el) el.innerHTML = `답변 <b>${answeredCount()}</b> / ${aliveIds().length}`; }
function maybeEarly() {
  const q = H.questions && H.questions[H.qi]; if (!q || H.view !== 'q') return;
  let need = aliveIds().length;
  if (q.kind === 'relay') need = Object.keys((H.room && H.room.relay) || {}).length;
  if (need && answeredCount() >= need && Date.now() - H.localStart > 1500) { clearInterval(H.timer); reveal(); }
}

function sideHTML(final = false) {
  const r = H.room || {}; const scores = r.scores || {};
  const ranked = H.players.map((p) => ({ ...p, sc: scores[p.id] || 0 })).sort((a, b) => b.sc - a.sc);
  const teamHTML = r.teamMode ? (() => {
    const ts = r.teams.map((t) => ({ ...t, sc: teamScore(t.id) })).sort((a, b) => b.sc - a.sc); const mx = Math.max(1, ...ts.map((t) => t.sc));
    return `<span class="tv-eyebrow" style="margin-top:2vw">팀 순위</span><div style="display:flex;flex-direction:column;gap:1.1vw;margin-top:1vw">${ts.map((t) => `<div class="team-bar"><div class="tb-h"><span style="font-weight:600;white-space:nowrap">${esc(t.name)}</span><b>${fmt(t.sc)}</b></div><div class="tb"><i style="width:${(t.sc / mx) * 100}%;background:${t.color}"></i></div></div>`).join('')}</div>`;
  })() : '';
  return `<aside class="side"><span class="tv-eyebrow">개인 순위</span><div style="margin-top:.6vw">${ranked.slice(0, r.teamMode ? 5 : 8).map((p, i) => `<div class="rank-row ${i < 3 ? 'top' : ''} ${r.alive && r.alive[p.id] === false ? 'out' : ''}"><span class="n num">${i + 1}</span><span class="nm">${esc(p.name)}</span><span class="sc">${fmt(p.sc)}</span></div>`).join('') || '<p class="tv-credit">아직 점수가 없습니다</p>'}</div>${teamHTML}
    <span class="tv-credit" style="margin-top:auto">만든 곳 <b>AI목양지원센터</b></span></aside>`;
}
function teamScore(tid) {
  const r = H.room || {}; const sc = r.scores || {};
  return H.players.filter((p) => p.team === tid).reduce((s, p) => s + (sc[p.id] || 0), 0) + ((r.teamScores || {})[tid] || 0);
}
function playTop(label) {
  return `<div class="play-top"><div class="l"><span class="tv-title" style="font-size:1.6vw">문제 ${H.qi + 1} <span style="color:var(--sub)">/ ${H.questions.length}</span></span><span class="answered">${esc(BATTLE_MODES[H.sel.mode].name)} · 정답 규칙 ${esc(H.sel.rule)}</span></div>
    <div style="display:flex;align-items:center;gap:1.6vw">${label}</div></div>`;
}
function headRight() { return `<span class="tv-eyebrow">방 ${H.code.slice(0, 3)} ${H.code.slice(3)} · ${esc(H.sel.theme)}</span>`; }

function renderQuestion() {
  const q = H.questions[H.qi];
  let body = '';
  if (q.kind === 'choice') {
    const disp = q.refChoices ? esc(q.display) : q.words.map((w, i) => (i === q.blankIndex ? '<span class="q-blank">?</span>' : esc(w))).join(' ');
    body = `<span class="tv-eyebrow ac">${esc(q.prompt)}</span><p class="q-text ${q.display.length > 90 ? 'small' : ''}">${disp}</p>${q.sub ? `<span class="q-sub">${esc(q.sub)}</span>` : ''}
      <div class="q-choices">${q.choices.map((c, i) => `<div class="q-choice ${q.refChoices ? 'ref' : ''}" style="background:${CCOL[i]}"><svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="${SHAPES[i]}"/></svg><span>${esc(c)}</span><em></em></div>`).join('')}</div>`;
  } else if (q.kind === 'order') {
    body = `<span class="tv-eyebrow ac">말씀 조각을 순서대로</span><h2 class="tv-title" style="font-size:3.4vw;margin:1vw 0 0">${esc(q.ref)}</h2><div class="q-chunks">${q.shuffled.map((i) => `<span class="q-chunk">${esc(q.chunks[i])}</span>`).join('')}</div>`;
  } else if (q.kind === 'write') {
    body = `<span class="tv-eyebrow ac">말씀 전체를 적어 주세요</span><h2 class="tv-title" style="font-size:4.6vw;margin:1vw 0 0">${esc(q.display)}</h2>${q.sub ? `<span class="q-sub">${esc(q.sub)}</span>` : ''}`;
  } else {
    body = `<span class="tv-eyebrow ac">사랑방 릴레이 · 팀원이 한 조각씩</span><h2 class="tv-title" style="font-size:3.4vw;margin:1vw 0 0">${esc(q.ref)}</h2>${q.sub ? `<span class="q-sub">${esc(q.sub)}</span>` : ''}
      <div class="q-chunks">${q.chunks.map((c, i) => `<span class="q-chunk">${i + 1}번 조각 · ${esc(c.split(' ').map((w) => [...w].map(() => '○').join('')).join(' '))}</span>`).join('')}</div>`;
  }
  root.innerHTML = `<div class="tvw">${head(headRight())}<div class="play">
    <div class="play-main">${playTop(`<span class="answered" id="ac"></span><div class="timer" style="--deg:360deg"><span>${H.sel.time}</span></div><button class="tv-btn" id="sk" data-next>바로 정답</button><button class="tv-btn" id="qt">끝내기</button>`)}
      <div class="q-area fade-in">${body}</div><div class="scene"><div class="sc-inner">${sceneHTML()}</div></div></div>${sideHTML()}</div></div>`;
  updateAnswered(); fitScene();
  $('#sk').onclick = () => { clearInterval(H.timer); reveal(); };
  $('#qt').onclick = () => { if (confirm('대전을 여기서 끝내고 결과를 보여 줄까요?')) { clearInterval(H.timer); finish(); } };
}

/* ───────── 5. 채점 ───────── */
function elapsed(p, k) {
  const a = p.ans[k]; const at = DB.toMillis(a.at); const st = DB.toMillis(H.room && H.room.qStart);
  if (at && st) return Math.max(0, at - st);
  return Date.now() - H.localStart;
}
let revealing = false;
async function reveal() {
  if (revealing || H.view !== 'q') return; revealing = true; H.view = 'reveal';
  try {
    const q = H.questions[H.qi]; const k = 'q' + H.qi; const dur = H.sel.time * 1000; const r = H.room || {};
    const scores = { ...(r.scores || {}) }; const results = {}; const alive = { ...(r.alive || {}) }; const teamScores = { ...(r.teamScores || {}) };
    const speed = H.sel.scoring === 'speed';
    const ids = aliveIds(); let okCount = 0; const dist = [0, 0, 0, 0];
    const relay = r.relay || {}; const relayLit = new Set();
    for (const p of H.players) {
      if (!ids.includes(p.id)) continue;
      const a = p.ans && p.ans[k];
      let ok = false, gain = 0;
      if (a) {
        const el = Math.min(dur, elapsed(p, k)); const sp = speed ? Math.max(0, 1 - el / dur) : 1;
        if (q.kind === 'choice') { ok = a.v === q.answer; if (a.v >= 0 && a.v < 4) dist[a.v]++; }
        else if (q.kind === 'order') ok = a.v === q.answer;
        else if (q.kind === 'write') { const g = gradeText(a.v, q.text, H.sel.rule); ok = g.ok; if (!ok && g.acc >= 0.6) gain = Math.round(g.acc * 400 * (speed ? 0.5 + sp / 2 : 1)); }
        else if (q.kind === 'relay') { const ci = relay[p.id]; if (ci != null) { ok = gradeText(a.v, q.chunks[ci], H.sel.rule).ok; if (ok) relayLit.add(ci); } }
        if (ok) gain = speed ? Math.round(500 + 500 * sp) : 1000;
      }
      if (ok) okCount++;
      scores[p.id] = (scores[p.id] || 0) + gain;
      results[p.id] = { ok, gain };
    }
    if (H.sel.mode === 'survival') {
      const wrong = ids.filter((id) => !results[id] || !results[id].ok);
      if (wrong.length < ids.length) wrong.forEach((id) => (alive[id] = false));
    }
    if (q.kind === 'relay') {
      // 팀이 조각을 모두 맞히면 보너스
      (r.teams || []).forEach((t) => {
        const mem = H.players.filter((p) => p.team === t.id).map((p) => p.id);
        const lit = mem.filter((id) => results[id] && results[id].ok).length;
        const need = Math.min(q.chunks.length, mem.length);
        if (need && lit >= need) teamScores[t.id] = (teamScores[t.id] || 0) + 1000;
      });
    }
    const rate = ids.length ? okCount / ids.length : 0; H.rates[H.qi] = rate;
    const ranks = {}; H.players.map((p) => ({ id: p.id, s: scores[p.id] || 0 })).sort((a, b) => b.s - a.s).forEach((x, i) => (ranks[x.id] = i + 1));
    await DB.update('rooms/' + H.code, { status: 'reveal', results, scores, alive, ranks, teamScores, progress: H.rates.reduce((s, x) => s + (x || 0), 0) / H.questions.length });
    H.room = { ...r, results, scores, alive, ranks, teamScores, status: 'reveal' };
    Sound.reveal(rate); if (rate > 0) setTimeout(() => Sound.theme(H.sel.theme, false), 450);
    renderReveal(q, dist, okCount, ids.length, relayLit);
  } finally { revealing = false; }
}
function renderReveal(q, dist, okCount, n, relayLit) {
  const last = H.qi >= H.questions.length - 1 || (H.sel.mode === 'survival' && aliveIds().length <= 1);
  let body = '';
  if (q.kind === 'choice') {
    body = `<span class="tv-eyebrow ac">정답</span><p class="q-text ${q.text.length > 90 ? 'small' : ''}">${esc(q.text)}</p><span class="q-sub">${esc(q.ref)}</span>
      <div class="q-choices">${q.choices.map((c, i) => `<div class="q-choice ${q.refChoices ? 'ref' : ''} ${i === q.answer ? '' : 'dim'}" style="background:${CCOL[i]}"><svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="${i === q.answer ? 'M20 6 9 17l-5-5' : SHAPES[i]}" ${i === q.answer ? 'fill="none" stroke="#fff" stroke-width="3"' : ''}/></svg><span>${esc(c)}</span><em>${dist[i]}명</em></div>`).join('')}</div>`;
  } else if (q.kind === 'relay') {
    body = `<span class="tv-eyebrow ac">정답</span><h2 class="tv-title" style="font-size:2.6vw;margin:1vw 0 0">${esc(q.ref)}</h2><div class="q-chunks">${q.chunks.map((c, i) => `<span class="q-chunk ${relayLit.has(i) ? 'lit' : ''}">${esc(c)}</span>`).join('')}</div>`;
  } else {
    body = `<span class="tv-eyebrow ac">정답</span><h2 class="tv-title" style="font-size:2.6vw;margin:1vw 0 0">${esc(q.ref)}</h2><p class="q-text ${q.text.length > 90 ? 'small' : ''}">${esc(q.text)}</p>`;
  }
  const best = H.players.filter((p) => H.room.results[p.id] && H.room.results[p.id].ok).sort((a, b) => H.room.results[b.id].gain - H.room.results[a.id].gain).slice(0, 3);
  root.innerHTML = `<div class="tvw">${head(headRight())}<div class="play">
    <div class="play-main">${playTop(`<span class="answered">정답 <b>${okCount}</b> / ${n}명</span><button class="tv-btn pr" id="nx" data-next>${last ? '최종 결과' : '다음 문제'} <span id="cd" class="num" style="opacity:.6"></span></button>`)}
      <div class="q-area fade-in">${body}${best.length ? `<div class="reveal-answer">${icon('check', 22)}가장 빨리: ${best.map((p) => esc(p.name)).join(' · ')}</div>` : ''}</div>
      <div class="scene"><div class="sc-inner">${sceneHTML()}</div></div></div>${sideHTML()}</div></div>`;
  fitScene();
  let sec = 9; const cd = $('#cd'); cd.textContent = sec;
  const tick = () => { sec--; if (cd) cd.textContent = sec > 0 ? sec : ''; if (sec <= 0) { $('#nx') && $('#nx').click(); } else H.adv = setTimeout(tick, 1000); };
  H.adv = setTimeout(tick, 1000);
  $('#nx').onclick = () => { clearTimeout(H.adv); last ? finish() : ask(H.qi + 1); };
}

/* ───────── 6. 마무리 ───────── */
async function finish() {
  H.view = 'end'; clearTimeout(H.adv);
  Sound.stopBgm(); Sound.fanfare(); setTimeout(() => Sound.theme(H.sel.theme, true), 1300);
  const r = H.room || {}; const sc = r.scores || {};
  const ranked = H.players.map((p) => ({ ...p, sc: sc[p.id] || 0 })).sort((a, b) => b.sc - a.sc);
  let teamWin = null;
  if (r.teamMode) teamWin = r.teams.map((t) => ({ ...t, sc: teamScore(t.id) })).sort((a, b) => b.sc - a.sc)[0];
  await DB.update('rooms/' + H.code, { status: 'end', endedAt: Date.now() });
  DB.add('history', { endedAt: Date.now(), mode: H.sel.mode, modeName: BATTLE_MODES[H.sel.mode].name, theme: H.sel.theme, winner: teamWin ? teamWin.name : (ranked[0] || {}).name || '', players: H.players.length, top: ranked.slice(0, 3).map((p) => ({ name: p.name, score: p.sc })) }).catch(() => {});
  const P = [ranked[1], ranked[0], ranked[2]]; const hgt = ['7vw', '10vw', '5vw']; const lab = ['2', '1', '3'];
  root.innerHTML = `<div class="tvw fade-in">${head(`<span class="tv-credit">만든 곳 <b>AI목양지원센터</b></span>`)}
    <div style="display:flex;align-items:flex-end;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:1.6vw">
      <div style="display:flex;flex-direction:column;gap:.8vw"><span class="tv-eyebrow ac">최종 결과 · ${esc(H.sel.theme)}</span><span class="tv-title" style="font-size:4.4vw">${teamWin ? `${esc(teamWin.name)} 우승` : ranked[0] ? `${esc(ranked[0].name)} 님 우승` : '수고하셨습니다'}</span></div>
      <div style="display:flex;gap:1vw"><button class="tv-btn" id="again">같은 설정으로 다시</button><button class="tv-btn pr" id="new" data-next>새 대전</button></div></div>
    <div class="scene" style="flex:none;height:11vw"><div class="sc-inner">${sceneHTML(true)}</div></div>
    <div class="podium">${P.map((p, i) => p ? `<div><span class="who">${esc(p.name)}</span><span class="pts">${fmt(p.sc)}점</span><div class="blk" style="height:${hgt[i]}">${lab[i]}</div></div>` : '<div></div>').join('')}</div></div>`;
  fitScene();
  $('#new').onclick = () => { H.offs.forEach((f) => f()); H.offs = []; setup(); };
  $('#again').onclick = () => { H.offs.forEach((f) => f()); H.offs = []; createRoom(); };
}

/* ───────── 장면 ───────── */
function progressRatio() { const n = (H.questions || []).length || 1; return Math.min(1, H.rates.reduce((s, x) => s + (x || 0), 0) / n); }
function sceneHTML(final = false) {
  const t = H.sel.theme; const p = final ? Math.max(progressRatio(), 0.999) : progressRatio();
  const r = H.room || {}; const sc = r.scores || {};
  const max = Math.max(1, (H.questions || []).length * 1000);
  const units = r.teamMode ? (r.teams || []).map((x) => ({ name: x.name, color: x.color, sc: teamScore(x.id) })) : H.players.map((x, i) => ({ name: x.name, color: ['#C0563F', '#4F86C6', '#5BA37A', '#C9973B', '#8A6BBE', '#3E9C9C', '#C2678F', '#6B7A8F'][i % 8], sc: sc[x.id] || 0 })).sort((a, b) => b.sc - a.sc).slice(0, 8);
  if (t === '여리고 성벽') {
    const shades = ['#A6774A', '#9A6C41', '#B08152', '#916639']; let rows = '';
    for (let rr = 0; rr < 7; rr++) {
      const n = rr % 2 ? 13 : 14; let b = '';
      for (let c = 0; c < n; c++) { const h = (rr * 31 + c * 17 + rr * c * 7) % 100; const gone = h + (6 - rr) * 14 > 175 - p * 100 * 1.3 - (final ? 60 : 0); const tilt = !gone && (rr * 5 + c * 3) % 7 === 0 && p > 0.3; b += `<i class="brick ${gone ? 'gone' : ''} ${tilt ? 'tilt' : ''}" style="background:${shades[(rr + c * 3) % 4]}"></i>`; }
      rows += `<div class="row ${rr % 2 ? 'off' : ''}">${b}</div>`;
    }
    return `<div class="sc-cap"><span>성벽 무너짐 <b class="num">${Math.round(p * 100)}%</b></span><span>${final ? '성이 무너졌습니다' : `일곱째 날까지 ${Math.max(0, (H.questions || []).length - (H.qi ?? 0) - 1)}문제`}</span></div>
      <div class="jericho"><div class="tower"></div><div class="wall">${rows}</div><div class="tower"></div></div><div class="ground" style="background:#C29C68"></div>`;
  }
  if (t === '다윗과 골리앗') {
    const stones = Math.min(48, Math.round(p * 48)); const fallen = p >= 0.999 || final;
    return `<div class="goliath"><div class="hp"><div class="sc-cap" style="padding:0"><span>거인의 힘</span><b class="num">${Math.round((1 - p) * 100)}%</b></div><div class="bar"><i style="width:${(1 - p) * 100}%"></i></div>
      <div class="stones" style="margin-top:1vw">${Array.from({ length: stones }, () => '<i></i>').join('')}</div><span class="tv-credit">모두의 정답이 물맷돌이 됩니다</span></div>
      <div class="giant ${fallen ? 'fallen' : ''}"><i class="spear"></i><i class="helm"></i><i class="head"></i><i class="body"></i><i class="legs"></i></div></div><div class="ground" style="background:#5E6B45"></div>`;
  }
  if (t === '홍해 건너기') {
    return `<div class="sc-cap"><span>갈라진 바다 길</span><span>건너편까지 먼저 가는 쪽이 승리</span></div><div class="redsea">${units.map((u) => `<div class="lane"><span class="ln">${esc(u.name)}</span><div class="track"><i class="runner" style="left:${4 + Math.min(1, u.sc / max) * 88}%;background:${u.color}"></i></div></div>`).join('')}</div>`;
  }
  if (t === '갈멜산 제단') {
    const mx = Math.max(1, ...units.map((u) => u.sc)); const lead = units.slice().sort((a, b) => b.sc - a.sc)[0];
    return `<div class="carmel">${units.slice(0, 6).map((u) => { const n = Math.round((u.sc / mx) * 12); return `<div class="altar">${final && u === lead ? '<i class="fire"></i>' : ''}<div class="stack">${Array.from({ length: n }, (_, i) => `<i style="background:${u.color};opacity:${0.55 + (i % 3) * 0.15}"></i>`).join('')}</div><span class="an">${esc(u.name)}</span></div>`; }).join('')}</div><div class="ground" style="background:#5A4636;margin-top:.6vw"></div>`;
  }
  if (t === '노아의 방주') {
    const alive = r.alive || {}; const on = H.players.filter((x) => alive[x.id] !== false); const off = H.players.filter((x) => alive[x.id] === false);
    return `<div class="sc-cap"><span>방주에 오른 사람 <b class="num">${on.length}</b></span><span>${off.length ? `물 밖 ${off.length}명` : ''}</span></div>
      <div class="ark"><div class="house"></div><div class="hull">${on.slice(0, 48).map((x) => `<i title="${esc(x.name)}" style="background:${(teamOf(x.team) || {}).color || 'rgba(255,255,255,.35)'}"></i>`).join('')}</div></div><div class="water"></div>
      ${off.length ? `<div class="out-list">${off.slice(0, 20).map((x) => `<span>${esc(x.name)}</span>`).join('')}</div>` : ''}`;
  }
  // 아케이드
  const mx = Math.max(1, ...units.map((u) => u.sc));
  return `<div class="arcade">${units.map((u) => `<div class="col" style="color:${u.color}"><span style="color:var(--ink);font-family:var(--f-head)" class="num">${fmt(u.sc)}</span><i style="height:${4 + (u.sc / mx) * 80}%;background:${u.color}"></i><span style="color:var(--sub)">${esc(u.name)}</span></div>`).join('')}</div>`;
}

function fitScene() {
  requestAnimationFrame(() => {
    const sc = $('.scene'); const inner = sc && $('.sc-inner', sc); if (!inner) return;
    inner.style.transform = 'none';
    const avail = sc.clientHeight; const need = inner.scrollHeight;
    if (need > avail && avail > 0) { const k = Math.max(0.35, avail / need); inner.style.transform = `scale(${k})`; }
  });
}
window.addEventListener('resize', fitScene);

function muteButton() {
  const b = document.createElement('button'); b.className = 'mute-btn'; b.type = 'button';
  const draw = () => { b.innerHTML = Sound.muted ? `${icon('sound', 18)}<span>소리 꺼짐</span>` : `${icon('sound', 18)}<span>소리 켜짐</span>`; b.classList.toggle('off', Sound.muted); b.setAttribute('aria-pressed', String(!Sound.muted)); };
  b.onclick = () => { Sound.unlock(); Sound.toggleMute(); draw(); };
  draw(); document.body.appendChild(b);
}
