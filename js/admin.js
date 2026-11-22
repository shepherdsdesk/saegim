// 새김 INSCRIBE — 관리자
import {
  DB, op, whenAuthed, adminSignIn, adminCheck, adminSignOut, adminCodeSignIn, loadSettings, applySettings, markSVG, icon, esc, $, $$, toast, modal, confirmBox,
  fmt, newCode, today, THEMES, VERSE_FONTS, UI_FONTS, SIZES, STAGES, BATTLE_THEMES, TEAM_COLORS, shrinkImage, DEFAULTS, MOCK,
  CLUBS, MODES, GRADES, gradeToClub, clubOf, clubName
} from './core.js';
import { qrcode } from '../vendor/qrcode.mjs';

const root = $('#root');
const A = { settings: null, courses: [], teams: [], users: [], progress: [] };
const APP_URL = () => new URL('./', location.href).href.replace(/\?.*$/, '');

(async function boot() {
  const ok = await adminCheck();
  A.settings = await loadSettings();
  await applySettings(A.settings);
  if (!ok) return gate();
  window.addEventListener('hashchange', route);
  route();
})();

function gate(msg = '') {
  root.innerHTML = `<main class="gate"><div class="card fade-in">
    <span class="brand">${markSVG(56)}<span style="display:flex;flex-direction:column;gap:6px"><span class="brand-name" style="font-size:36px">새김</span><span class="brand-sub">관리자</span></span></span>
    <form id="cf" style="display:flex;flex-direction:column;gap:16px" autocomplete="off">
      <div class="field"><label for="ac">관리자 코드</label><input class="input code-pill" id="ac" maxlength="10" placeholder="10자리 코드" style="text-transform:uppercase;letter-spacing:.16em"></div>
      <button class="btn pr block" type="submit">관리자로 들어가기</button>
    </form>
    ${msg ? `<p style="margin:0;color:var(--bad);font-weight:600;font-size:14px">${esc(msg)}</p>` : ''}
    <div style="display:flex;align-items:center;gap:12px;color:var(--sub);font-size:12px"><span class="hair" style="flex:1"></span>또는<span class="hair" style="flex:1"></span></div>
    <button class="btn block" id="gl">구글 계정으로 들어가기</button>
    <a class="btn ghost block" href="./">사용자 화면으로</a>
    <p style="margin:0;text-align:center;font-size:12px;color:var(--sub)">만든 곳 <b style="color:var(--ink)">AI목양지원센터</b></p></div></main>`;
  $('#ac').focus();
  $('#cf').onsubmit = async (e) => {
    e.preventDefault(); const b = $('#cf button'); b.disabled = true; b.textContent = '확인 중…';
    const ok = await adminCodeSignIn($('#ac').value);
    if (ok && (await adminCheck())) location.reload(); else gate('코드를 다시 확인해 주세요');
  };
  $('#gl').onclick = async () => {
    try {
      const u = await adminSignIn();
      if (u && u.email && u.email !== 'bear4jesus@gmail.com') { await adminSignOut(); return gate('관리자로 등록된 구글 계정이 아닙니다. 관리자 코드로 들어가 주세요.'); }
      if (u) location.reload();
    } catch (e) { console.error(e); gate('로그인하지 못했습니다. 팝업 차단을 풀고 다시 눌러 주세요.'); }
  };
}

const MENU = [
  ['dash', '대시보드', 'grid'], ['courses', '코스와 말씀', 'book'], ['users', '사용자와 코드', 'users'], ['teams', '팀', 'team'],
  ['battle', '대전 열기', 'tv'], ['report', '진도 리포트', 'chart'], ['admins', '관리자', 'key'], ['settings', '환경 설정', 'gear']
];
function shell(page, head, body) {
  root.innerHTML = `<div class="ad">
    <aside class="ad-side">
      <span class="brand">${markSVG(34)}<span style="display:flex;flex-direction:column;gap:3px"><span class="brand-name" style="font-size:19px">${esc(A.settings.appName || '새김')}</span><span class="brand-sub">관리자</span></span></span>
      <nav class="ad-nav">${MENU.map(([k, l, i]) => k === 'battle' ? `<a href="tv.html${MOCK ? '?mock' : ''}" target="_blank" rel="noopener">${icon(i, 18)}${l}</a>` : `<a href="#${k}" class="${page === k ? 'on' : ''}">${icon(i, 18)}${l}</a>`).join('')}</nav>
      <div class="ad-foot"><span>만든 곳</span><b>AI목양지원센터</b><a href="#" id="lo" style="margin-top:12px;color:var(--sub)">로그아웃</a></div>
    </aside>
    <main class="ad-main"><div class="ad-wrap fade-in">${head}${body}</div></main></div>`;
  const lo = $('#lo'); if (lo) lo.onclick = async (e) => { e.preventDefault(); await adminSignOut(); location.reload(); };
}
const pageHead = (eyebrow, title, acts = '') => `<div class="ad-head"><div><span class="eyebrow ac">${eyebrow}</span><h1 class="head">${title}</h1></div><div class="acts">${acts}</div></div>`;

async function refresh() {
  const [cs, ts] = await Promise.all([DB.list('courses'), DB.list('teams')]);
  A.courses = cs.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  A.teams = ts.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}
async function route() {
  const page = (location.hash.replace('#', '') || 'dash').split('/')[0];
  await refresh();
  if (page === 'battle') { location.href = 'tv.html' + (MOCK ? '?mock' : ''); return; }
  ({ dash, courses, users, teams, report, admins, settings }[page] || dash)();
}

/* ───────── 대시보드 ───────── */
async function dash() {
  const [users, progress, hist] = await Promise.all([DB.list('users'), DB.list('progress'), DB.list('history', { orderBy: ['endedAt', 'desc'], limit: 8 }).catch(() => [])]);
  const verses = A.courses.reduce((s, c) => s + (c.count || 0), 0);
  const learned = progress.reduce((s, p) => s + Object.keys(p.v || {}).length, 0);
  const t = today();
  const active = progress.filter((p) => p.lastDay === t).length;
  let wv = null; if (A.settings.weeklyVerse) wv = await DB.get('verses/' + A.settings.weeklyVerse).catch(() => null);
  shell('dash', pageHead('대시보드', '오늘의 새김', `<a class="btn md" href="./" target="_blank">${icon('phone', 16)}사용자 화면</a><a class="btn md pr" href="tv.html${MOCK ? '?mock' : ''}" target="_blank">${icon('tv', 16)}대전 열기</a>`),
    `<div class="kpis"><div><b>${fmt(users.length)}</b><span>사용자</span></div><div><b>${fmt(active)}</b><span>오늘 들어온 사람</span></div><div><b>${fmt(verses)}</b><span>등록된 말씀</span></div><div><b>${fmt(learned)}</b><span>모두가 새긴 말씀</span></div></div>
    <section class="ad-sec"><h2>이번 주 암송</h2><p class="muted small" style="margin:0">고른 말씀이 모든 사용자 홈 맨 위에 올라갑니다.</p>
      <div class="set-row"><div class="lab"><b>${wv ? esc(wv.ref) : '정하지 않음'}</b><span>${wv ? esc(wv.topic || '') : '코스 순서대로 진행합니다'}</span></div>
      <div class="inline"><select class="input" id="wc" style="min-width:200px">${A.courses.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><select class="input" id="wvsel" style="min-width:220px"></select><button class="btn md pr" id="wset">정하기</button>${wv ? '<button class="btn md" id="wclr">해제</button>' : ''}</div></div>
    </section>
    <section class="ad-sec"><h2>최근 대전</h2>
      ${hist.length ? `<div class="tbl"><div class="tr th" style="grid-template-columns:140px 1fr 1fr 120px"><span>날짜</span><span>방식 · 테마</span><span>우승</span><span>참여</span></div>${hist.map((h) => `<div class="tr" style="grid-template-columns:140px 1fr 1fr 120px"><span class="num">${new Date(h.endedAt).toLocaleDateString('ko-KR')}</span><span class="nowrap">${esc(h.modeName || '')} · ${esc(h.theme || '')}</span><b class="nowrap">${esc(h.winner || '-')}</b><span class="num">${h.players || 0}명</span></div>`).join('')}</div>` : '<p class="muted">아직 대전 기록이 없습니다.</p>'}
    </section>
    <section class="ad-sec"><h2>입장 주소</h2><div class="set-row"><div class="lab"><b>사용자 앱</b><span>성도들에게 이 주소와 입장 코드를 알려 주세요</span></div><div class="inline"><span class="num" style="font-weight:600">${esc(APP_URL())}</span><button class="btn sm" id="cp">${icon('copy', 16)}복사</button></div></div></section>`);
  const fill = async () => {
    const cid = $('#wc').value; const vs = (await DB.list('verses', { where: [['courseId', '==', cid]] })).sort((a, b) => a.no - b.no);
    $('#wvsel').innerHTML = vs.map((v) => `<option value="${v.id}">${v.no}. ${esc(v.ref)} ${esc(v.topic ? '· ' + v.topic : '')}</option>`).join('');
  };
  if (A.courses.length) { $('#wc').onchange = fill; fill(); }
  $('#wset').onclick = async () => { const id = $('#wvsel').value; if (!id) return; await DB.set('config/app', { weeklyVerse: id }); A.settings.weeklyVerse = id; toast('이번 주 암송을 정했습니다'); dash(); };
  const clr = $('#wclr'); if (clr) clr.onclick = async () => { await DB.set('config/app', { weeklyVerse: null }); A.settings.weeklyVerse = null; dash(); };
  $('#cp').onclick = () => { navigator.clipboard.writeText(APP_URL()); toast('주소를 복사했습니다'); };
}

/* ───────── 코스와 말씀 ───────── */
async function courses() {
  const total = A.courses.reduce((s, c) => s + (c.count || 0), 0);
  shell('courses', pageHead('코스와 말씀', `코스 ${A.courses.length}개 · ${fmt(total)}구절`, `
    <a class="btn md" href="assets/saegim-upload-template.xlsx" download="새김_말씀업로드_양식.xlsx">${icon('down', 16)}샘플 양식 받기</a>
    <a class="btn md" href="assets/saegim-awana-verses.xlsx" download="새김_어와나_클럽별_암송목록.xlsx">${icon('down', 16)}어와나 암송 목록</a>
    <button class="btn md" id="seed">${icon('book', 16)}기본 코스 넣기</button>
    <label class="btn md pr" for="xf" style="cursor:pointer">${icon('up', 16)}엑셀 업로드</label><input type="file" id="xf" accept=".xlsx,.xls,.csv" class="hidden">`),
  `<div class="tbl"><div style="min-width:940px"><div class="tr th" style="grid-template-columns:${CCOLS}"><span>순서</span><span>코스</span><span>보이는 클럽</span><span>구절</span><span>정답 규칙</span><span>공개</span><span></span></div>
    ${A.courses.map((c, i) => `<div class="tr" style="grid-template-columns:${CCOLS}">
      <span class="head num" style="color:var(--sub)">${String(i + 1).padStart(2, '0')}</span>
      <div class="cell2"><b>${esc(c.name)}</b><span>${esc(c.sample || '')}</span></div>
      <button class="btn sm clubs-btn" data-clubs="${c.id}">${esc(clubsLabel(c.clubs))}</button>
      <span class="head num">${c.count || 0}</span>
      <select class="input" data-rule="${c.id}" style="height:40px;font-size:14px"><option value="">기본 (${esc(A.settings.rule)})</option>${['엄격', '보통', '느슨'].map((r) => `<option ${c.rule === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
      <button class="btn sm ghost pub" data-pub="${c.id}" style="color:${c.published !== false ? 'var(--ok)' : 'var(--sub)'};justify-content:flex-start;padding:0"><i></i>${c.published !== false ? '공개' : '숨김'}</button>
      <div class="acts"><button class="icon-btn" data-up="${c.id}" aria-label="위로">${icon('back', 18, 'style="transform:rotate(90deg)"')}</button><button class="icon-btn" data-view="${c.id}" aria-label="말씀 보기">${icon('edit', 18)}</button><button class="icon-btn" data-del="${c.id}" aria-label="코스 삭제">${icon('trash', 18)}</button></div>
    </div>`).join('') || '<p class="muted" style="padding:24px 0">아직 코스가 없습니다. 기본 코스를 넣거나 엑셀을 올려 주세요.</p>'}
  </div></div>
  <section class="ad-sec" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
    ${[['1', '샘플 양식 받기', '코스 · 번호 · 주제 · 장절 · 본문 칸이 들어 있는 엑셀 파일입니다.'], ['2', '말씀 채우기', '개역개정 본문을 붙여 넣고, 같은 코스 이름끼리 한 묶음이 됩니다.'], ['3', '업로드하고 공개', '미리 보기로 확인한 뒤 저장하면 바로 사용자에게 보입니다.']].map(([n, t, d]) => `<div style="padding:24px 24px 24px 0;display:flex;flex-direction:column;gap:8px"><span class="head" style="font-size:22px;color:var(--ac)">${n}</span><b style="font-size:15px">${t}</b><span class="small muted" style="line-height:1.6">${d}</span></div>`).join('')}
  </section>`);

  $$('[data-rule]').forEach((s) => s.onchange = async () => { await DB.set('courses/' + s.dataset.rule, { rule: s.value || null }); toast('정답 규칙을 바꿨습니다'); });
  $$('[data-pub]').forEach((b) => b.onclick = async () => { const c = A.courses.find((x) => x.id === b.dataset.pub); await DB.set('courses/' + c.id, { published: c.published === false }); await refresh(); courses(); });
  $$('[data-up]').forEach((b) => b.onclick = async () => {
    const i = A.courses.findIndex((x) => x.id === b.dataset.up); if (i <= 0) return;
    const list = A.courses.slice(); [list[i - 1], list[i]] = [list[i], list[i - 1]];
    await DB.batch(list.map((c, k) => ({ path: 'courses/' + c.id, data: { order: k } }))); await refresh(); courses();
  });
  $$('[data-del]').forEach((b) => b.onclick = async () => {
    const c = A.courses.find((x) => x.id === b.dataset.del);
    if (!(await confirmBox('코스 삭제', `「${esc(c.name)}」와 말씀 ${c.count || 0}구절을 지웁니다. 되돌릴 수 없습니다.`, '삭제', true))) return;
    const vs = await DB.list('verses', { where: [['courseId', '==', c.id]] });
    await DB.batch([...vs.map((v) => ({ path: 'verses/' + v.id, del: true })), { path: 'courses/' + c.id, del: true }]);
    toast('삭제했습니다'); await refresh(); courses();
  });
  $$('[data-view]').forEach((b) => b.onclick = () => viewVerses(A.courses.find((x) => x.id === b.dataset.view)));
  $$('[data-clubs]').forEach((b) => b.onclick = () => {
    const c = A.courses.find((x) => x.id === b.dataset.clubs); const cur = c.clubs || [];
    modal(`<h3>보이는 클럽</h3><p class="muted small" style="margin:0;line-height:1.7">「${esc(c.name)}」를 볼 수 있는 사람을 고릅니다. 아무것도 고르지 않으면 모두에게 보입니다.</p>
      <div class="club-checks">${[['adult', '어른 · 클럽 없음', ''], ...CLUBS.map((k) => [k.id, k.name, k.age])].map(([id, n, age]) => `<label><input type="checkbox" value="${id}" ${cur.includes(id) ? 'checked' : ''}><b>${esc(n)}</b><span class="small muted">${esc(age)}</span></label>`).join('')}</div>
      <div class="actions"><button class="btn md" data-close>취소</button><button class="btn md pr" id="go">저장</button></div>`, {
      onMount(el, close) { $('#go', el).onclick = async () => { const v = $$('input:checked', el).map((x) => x.value); await DB.set('courses/' + c.id, { clubs: v }); close(); toast('저장했습니다'); await refresh(); courses(); }; }
    });
  });
  $('#xf').onchange = (e) => { const f = e.target.files[0]; if (f) importExcel(f); e.target.value = ''; };
  $('#seed').onclick = seedDialog;
}

async function viewVerses(c) {
  const vs = (await DB.list('verses', { where: [['courseId', '==', c.id]] })).sort((a, b) => a.no - b.no);
  modal(`<h3>${esc(c.name)}</h3><p class="muted small" style="margin:0">본문을 눌러 고칠 수 있습니다. ${vs.length}구절</p>
    <div class="verse-list">${vs.map((v) => `<div class="verse-item" data-id="${v.id}"><span class="head num" style="color:var(--sub)">${v.no}</span><div class="cell2" style="display:flex;flex-direction:column;gap:2px"><b class="nowrap">${esc(v.ref)}</b><span class="small muted">${esc(v.topic || '')}</span></div><div class="vt" contenteditable="true" spellcheck="false">${esc(v.text)}</div><div style="display:flex;gap:4px;justify-content:flex-end"><button class="icon-btn" data-save aria-label="저장">${icon('check', 18)}</button><button class="icon-btn" data-rm aria-label="삭제">${icon('trash', 18)}</button></div></div>`).join('')}</div>
    <div class="actions"><button class="btn md" data-close>닫기</button></div>`, {
    onMount(el) {
      el.style.maxWidth = '980px';
      $$('[data-save]', el).forEach((b) => b.onclick = async () => { const row = b.closest('.verse-item'); await DB.set('verses/' + row.dataset.id, { text: $('.vt', row).textContent.trim() }); await DB.set('courses/' + c.id, { updatedAt: Date.now() }); toast('저장했습니다'); });
      $$('[data-rm]', el).forEach((b) => b.onclick = async () => { const row = b.closest('.verse-item'); await DB.del('verses/' + row.dataset.id); row.remove(); await DB.set('courses/' + c.id, { count: op.inc(-1), updatedAt: Date.now() }); toast('지웠습니다'); });
    }
  });
}

const CCOLS = '48px 2.2fr 150px 76px 140px 92px 150px';
function clubsLabel(cl) {
  if (!cl || !cl.length) return '모두';
  const n = cl.map((x) => (x === 'adult' ? '어른' : clubName(x)));
  return n.length > 2 ? `${n.slice(0, 2).join(', ')} 외 ${n.length - 2}` : n.join(', ');
}
function cleanRef(a) { return String(a || '').trim().replace(/^([가-힣]+)\s*(\d)/, '$1 $2').replace(/,\s*/g, ', '); }
async function importExcel(file) {
  if (!window.XLSX) return toast('엑셀 도구를 불러오지 못했습니다');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const pick = (r, ...ks) => { for (const k of ks) { const hit = Object.keys(r).find((x) => x.replace(/\s|\(.*\)/g, '') === k); if (hit && String(r[hit]).trim()) return String(r[hit]).trim(); } return ''; };
  const groups = {}; const errs = []; const clubsOf = {};
  rows.forEach((r, i) => {
    const course = pick(r, '코스', '묶음'); const ref = cleanRef(pick(r, '장절', '주소')); const text = pick(r, '본문').replace(/\s+/g, ' ');
    if (!course && !ref && !text) return;
    if (!course || !ref || !text || course.startsWith('예)')) { if (!course.startsWith('예)')) errs.push(i + 2); return; }
    (groups[course] = groups[course] || []).push({ no: Number(pick(r, '번호')) || 0, topic: pick(r, '주제'), ref, text });
    const cl = pick(r, '클럽'); if (cl) { clubsOf[course] = clubsOf[course] || new Set(); cl.split(/[,·/\s]+/).map(findClub).filter(Boolean).forEach((x) => clubsOf[course].add(x)); if (/어른/.test(cl)) clubsOf[course].add('adult'); }
  });
  const names = Object.keys(groups);
  if (!names.length) return toast('올릴 말씀을 찾지 못했습니다. 양식을 확인해 주세요');
  names.forEach((n) => { const g = groups[n]; g.forEach((v, i) => { if (!v.no) v.no = i + 1; }); g.sort((a, b) => a.no - b.no); g.forEach((v, i) => v.no = i + 1); });
  modal(`<h3>업로드 미리 보기</h3><p class="muted small" style="margin:0">${esc(file.name)}</p>
    <div class="tbl" style="margin-top:16px">${names.map((n) => { const ex = A.courses.find((c) => c.name === n); return `<div class="tr" style="grid-template-columns:1fr 90px 120px"><div class="cell2"><b>${esc(n)}</b><span>${esc(groups[n][0].ref)} · ${esc(groups[n][0].text.slice(0, 30))}…</span></div><span class="head num">${groups[n].length}구절</span><span class="small" style="color:${ex ? 'var(--ac)' : 'var(--ok)'};font-weight:600">${ex ? '기존 코스 바꿈' : '새 코스'}</span></div>`; }).join('')}</div>
    ${errs.length ? `<p class="small" style="color:var(--bad);margin:12px 0 0">빈 칸이 있어 건너뛴 줄: ${errs.slice(0, 12).join(', ')}${errs.length > 12 ? ' …' : ''}</p>` : ''}
    <div class="actions"><button class="btn md" data-close>취소</button><button class="btn md pr" id="go">저장하기</button></div>`, {
    onMount(el, close) {
      $('#go', el).onclick = async () => {
        $('#go', el).disabled = true; $('#go', el).textContent = '저장 중…';
        for (const n of names) await saveCourse(n, groups[n], null, clubsOf[n] ? [...clubsOf[n]] : undefined);
        close(); toast('말씀을 올렸습니다'); await refresh(); courses();
      };
    }
  });
}
async function saveCourse(name, verses, fixedId, clubs) {
  const ex = A.courses.find((c) => c.name === name || c.id === fixedId);
  const id = ex ? ex.id : (fixedId || 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
  const ops = [];
  if (ex) { const old = await DB.list('verses', { where: [['courseId', '==', id]] }); old.forEach((v) => ops.push({ path: 'verses/' + v.id, del: true })); }
  verses.forEach((v) => ops.push({ path: `verses/${id}-${String(v.no).padStart(3, '0')}`, merge: false, data: { courseId: id, no: v.no, topic: v.topic || '', ref: v.ref, text: v.text } }));
  ops.push({ path: 'courses/' + id, data: { name, count: verses.length, sample: `${verses[0].topic ? verses[0].topic + ' · ' : ''}${verses[0].ref}`, ...(clubs ? { clubs } : {}), published: ex ? ex.published !== false : true, order: ex ? ex.order ?? A.courses.length : A.courses.length, updatedAt: Date.now() } });
  await DB.batch(ops);
}
async function seedDialog() {
  const data = await fetch('data/seed-courses.json').then((r) => r.json());
  modal(`<h3>기본 코스 넣기</h3><p class="muted small" style="margin:0 0 16px;line-height:1.7">Shepherd's Desk 말씀 자료(개역개정)와 어와나 클럽별 암송 목록(개역한글)을 넣습니다. 어와나 목록은 정해진 클럽에게만 보입니다.</p>
    ${data.map((c, i) => `<label class="tr" style="display:grid;grid-template-columns:28px 1fr 90px;align-items:center;min-height:56px;border-bottom:1px solid var(--line);cursor:pointer"><input type="checkbox" data-i="${i}" ${i === 0 ? 'checked' : ''} style="width:18px;height:18px"><div style="display:flex;flex-direction:column;gap:2px;min-width:0"><b>${esc(c.name)}</b>${c.clubs ? `<span class="small muted">${esc(c.clubs.map(clubName).join(' · '))} · 개역한글</span>` : ''}</div><span class="head num">${c.verses.length}구절</span></label>`).join('')}
    <div class="actions"><button class="btn md" data-close>취소</button><button class="btn md pr" id="go">넣기</button></div>`, {
    onMount(el, close) {
      $('#go', el).onclick = async () => {
        $('#go', el).disabled = true; $('#go', el).textContent = '넣는 중…';
        for (const cb of $$('[data-i]', el)) if (cb.checked) { const c = data[+cb.dataset.i]; await saveCourse(c.name, c.verses, c.id, c.clubs); await refresh(); }
        close(); toast('기본 코스를 넣었습니다'); courses();
      };
    }
  });
}

/* ───────── 사용자와 코드 ───────── */
async function users() {
  const [us, ps] = await Promise.all([DB.list('users'), DB.list('progress')]);
  A.users = us.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const pmap = Object.fromEntries(ps.map((p) => [p.id, p]));
  const tname = (id) => (A.teams.find((t) => t.id === id) || {}).name || '-';
  const tcol = (id) => (A.teams.find((t) => t.id === id) || {}).color || 'var(--line)';
  shell('users', pageHead('사용자와 코드', `사용자 ${A.users.length}명`, `
    <div class="searchbar">${icon('search', 18)}<input id="q" placeholder="이름으로 찾기" aria-label="이름으로 찾기"></div>
    <button class="btn md" id="xl">${icon('down', 16)}코드 목록 받기</button>
    <button class="btn md" id="inv">${icon('qr', 16)}가입 링크</button>
    <button class="btn md" id="bulk">${icon('users', 16)}여러 명 추가</button>
    <button class="btn md pr" id="add">${icon('plus', 16)}사용자 추가</button>`),
  `${pendingHTML()}<div class="club-filter" id="cf">${[['', '전체'], ['none', '클럽 없음'], ...CLUBS.map((c) => [c.id, c.name])].map(([k, l]) => `<button class="chip ${k === '' ? 'on' : ''}" data-cf="${k}">${esc(l)} <span class="num">${k === '' ? A.users.filter((u) => !u.pending).length : A.users.filter((u) => !u.pending && (clubOf(u) || 'none') === k).length}</span></button>`).join('')}</div>
  <div class="tbl"><div style="min-width:940px"><div class="tr th" style="grid-template-columns:${UCOLS}"><span>이름</span><span>팀</span><span>클럽 · 학년</span><span>화면</span><span>입장 코드</span><span>새긴 말씀</span><span></span></div>
    <div id="ul">${A.users.filter((u) => !u.pending).map((u) => `<div class="tr" data-name="${esc(u.name)}" data-club="${clubOf(u) || 'none'}" style="grid-template-columns:${UCOLS}">
      <b class="nowrap">${esc(u.name)}</b><span class="nowrap" style="display:flex;align-items:center;gap:8px"><i class="dot-color" style="background:${tcol(u.team)}"></i>${esc(tname(u.team))}</span>
      <span class="nowrap">${clubOf(u) ? `<b>${esc(clubName(clubOf(u)))}</b>${u.grade ? ` <span class="muted">· ${esc(u.grade)}</span>` : ''}${!u.club && u.grade ? ' <span class="muted small">(학년)</span>' : ''}` : `<span class="muted">${u.grade ? esc(u.grade) : '-'}</span>`}</span>
      <span class="nowrap">${modeTag(u)}</span>
      <span class="code-pill">${esc(u.id)}</span><span class="head num">${Object.keys((pmap[u.id] || {}).v || {}).length}</span>
      <div class="acts"><button class="icon-btn" data-edit="${u.id}" aria-label="고치기">${icon('edit', 18)}</button><button class="icon-btn" data-re="${u.id}" aria-label="코드 다시 발급">${icon('key', 18)}</button><button class="icon-btn" data-del="${u.id}" aria-label="삭제">${icon('trash', 18)}</button></div></div>`).join('') || '<p class="muted" style="padding:24px 0">아직 사용자가 없습니다.</p>'}</div>
  </div></div>`);
  $('#inv').onclick = () => invites();
  $$('[data-ok]').forEach((b) => b.onclick = async () => { await DB.set('users/' + b.dataset.ok, { active: true, pending: false }); toast('들어올 수 있게 했습니다'); users(); });
  $$('[data-no]').forEach((b) => b.onclick = async () => { const u = A.users.find((x) => x.id === b.dataset.no); if (!(await confirmBox('가입 거절', `${esc(u.name)} 님의 가입 신청을 지웁니다.`, '거절', true))) return; await DB.del('users/' + u.id); users(); });
  $('#okall') && ($('#okall').onclick = async () => { await DB.batch(A.users.filter((u) => u.pending).map((u) => ({ path: 'users/' + u.id, data: { active: true, pending: false } }))); toast('모두 승인했습니다'); users(); });
  let cf = '';
  const filt = () => { const q = $('#q').value.trim(); $$('#ul .tr').forEach((r) => r.classList.toggle('hidden', (!!q && !r.dataset.name.includes(q)) || (!!cf && r.dataset.club !== cf))); };
  $('#q').oninput = filt;
  $$('[data-cf]').forEach((b) => b.onclick = () => { cf = b.dataset.cf; $$('[data-cf]').forEach((x) => x.classList.toggle('on', x === b)); filt(); });
  const teamOpts = (sel) => `<option value="">팀 없음</option>${A.teams.map((t) => `<option value="${t.id}" ${sel === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}`;
  $('#add').onclick = () => modal(`<h3>사용자 추가</h3>${userFields({}, teamOpts())}<div class="actions"><button class="btn md" data-close>취소</button><button class="btn md pr" id="go">추가하고 코드 받기</button></div>`, {
    onMount(el, close) {
      $('#un', el).focus(); bindUserFields(el);
      $('#go', el).onclick = async () => {
        const f = readUser(el); const name = f.name; if (!name) return toast('이름을 적어 주세요');
        const code = await uniqueCode(); await DB.set('users/' + code, { ...f, active: true, createdAt: Date.now() }, false);
        close(); showCode(name, code); users();
      };
    }
  });
  $('#bulk').onclick = () => modal(`<h3>여러 명 추가</h3><p class="muted small" style="margin:0;line-height:1.7">한 줄에 한 사람씩 적어 주세요. 이름 뒤에 쉼표로 팀, 클럽, 학년을 아무 순서로 적을 수 있습니다.<br>예) 홍길동, 1사랑방 · 김하늘, 스팍스, 초1 · 이바다, 초5</p>
    <textarea class="input" id="bl" style="margin-top:16px;min-height:200px"></textarea>
    <div class="inline" style="margin-top:12px;gap:10px;flex-wrap:wrap"><a class="btn sm" href="#" id="ut-x">${icon('down', 16)}엑셀 양식 받기</a><label class="btn sm" for="ux" style="cursor:pointer">${icon('up', 16)}엑셀로 채우기</label><input type="file" id="ux" accept=".xlsx,.xls,.csv" class="hidden"><span class="small muted">이름 · 팀 · 클럽 · 학년 칸</span></div>
    <div class="actions"><button class="btn md" data-close>취소</button><button class="btn md pr" id="go">추가하기</button></div>`, {
    onMount(el, close) {
      $('#ut-x', el).onclick = (e) => {
        e.preventDefault();
        const ws = XLSX.utils.json_to_sheet([{ 이름: '김하늘', 팀: '', 클럽: '스팍스', 학년: '초1' }, { 이름: '이바다', 팀: '', 클럽: '', 학년: '초5' }]);
        ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 8 }];
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '사용자'); XLSX.writeFile(wb, '새김_사용자_양식.xlsx');
      };
      $('#ux', el).onchange = async (e) => {
        const f = e.target.files[0]; if (!f || !window.XLSX) return;
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        const g = (r, k) => String(r[Object.keys(r).find((x) => x.replace(/\s/g, '') === k)] ?? '').trim();
        $('#bl', el).value = rows.map((r) => [g(r, '이름'), g(r, '팀'), g(r, '클럽'), g(r, '학년')].filter(Boolean).join(', ')).filter((l) => l && !l.startsWith('예)')).join('\n');
        toast(`${rows.length}줄을 불러왔습니다`); e.target.value = '';
      };
      $('#go', el).onclick = async () => {
        const lines = $('#bl', el).value.split('\n').map((l) => l.trim()).filter(Boolean); if (!lines.length) return;
        $('#go', el).disabled = true; const ops = [];
        for (const l of lines) {
          const [name, ...rest] = l.split(/[,\t]/).map((x) => (x || '').trim());
          if (!name) continue;
          const d = { name, team: null, club: null, grade: null, mode: 'auto' };
          rest.filter(Boolean).forEach((x) => {
            const t = A.teams.find((y) => y.name === x); if (t) { d.team = t.id; return; }
            const c = findClub(x); if (c) { d.club = c; return; }
            if (GRADES.includes(x)) d.grade = x;
          });
          const code = await uniqueCode(ops.map((o) => o.path.split('/')[1]));
          ops.push({ path: 'users/' + code, merge: false, data: { ...d, active: true, createdAt: Date.now() } });
        }
        await DB.batch(ops); close(); toast(`${ops.length}명을 추가했습니다`); users();
      };
    }
  });
  $('#xl').onclick = () => {
    const rows = A.users.map((u) => ({ 이름: u.name, 팀: tname(u.team), 클럽: clubName(clubOf(u)) || '', 학년: u.grade || '', 입장코드: u.id, 주소: APP_URL() }));
    const ws = XLSX.utils.json_to_sheet(rows); ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 44 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '입장코드'); XLSX.writeFile(wb, `새김_입장코드_${today()}.xlsx`);
  };
  $$('[data-edit]').forEach((b) => b.onclick = () => {
    const u = A.users.find((x) => x.id === b.dataset.edit);
    modal(`<h3>사용자 고치기</h3>${userFields(u, teamOpts(u.team))}<div class="actions"><button class="btn md" data-close>취소</button><button class="btn md pr" id="go">저장</button></div>`, {
      onMount(el, close) { bindUserFields(el); $('#go', el).onclick = async () => { const f = readUser(el); if (!f.name) return toast('이름을 적어 주세요'); await DB.set('users/' + u.id, f); await DB.set('progress/' + u.id, { team: f.team, name: f.name, club: clubOf(f) }); close(); users(); }; }
    });
  });
  $$('[data-re]').forEach((b) => b.onclick = async () => {
    const u = A.users.find((x) => x.id === b.dataset.re);
    if (!(await confirmBox('코드 다시 발급', `${esc(u.name)} 님의 새 코드를 만듭니다. 외운 기록은 그대로 옮겨지고, 예전 코드는 더 이상 쓸 수 없습니다.`, '다시 발급'))) return;
    const code = await uniqueCode(); const p = await DB.get('progress/' + u.id);
    const { id, ...ud } = u;
    const ops = [{ path: 'users/' + code, merge: false, data: { ...ud, active: true } }, { path: 'users/' + u.id, del: true }];
    if (p) { const { id: pid, ...pd } = p; ops.push({ path: 'progress/' + code, merge: false, data: pd }, { path: 'progress/' + u.id, del: true }); }
    await DB.batch(ops); showCode(u.name, code); users();
  });
  $$('[data-del]').forEach((b) => b.onclick = async () => {
    const u = A.users.find((x) => x.id === b.dataset.del);
    if (!(await confirmBox('사용자 삭제', `${esc(u.name)} 님과 외운 기록을 지웁니다. 되돌릴 수 없습니다.`, '삭제', true))) return;
    await DB.batch([{ path: 'users/' + u.id, del: true }, { path: 'progress/' + u.id, del: true }]); users();
  });
}
function pendingHTML() {
  const ps = A.users.filter((u) => u.pending);
  if (!ps.length) return '';
  return `<section class="pending"><div class="pd-head"><b>가입 신청 ${ps.length}명</b><span class="small muted">가입 링크로 들어온 사람입니다. 승인하면 바로 들어올 수 있어요.</span>${ps.length > 1 ? '<button class="btn sm pr" id="okall">모두 승인</button>' : ''}</div>
    ${ps.map((u) => `<div class="pd-row"><b class="nowrap">${esc(u.name)}</b><span class="nowrap muted">${esc([clubName(clubOf(u)), u.grade].filter(Boolean).join(' · ') || '-')}</span><span class="small muted nowrap">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR') : ''}</span><div class="acts"><button class="btn sm" data-no="${u.id}">거절</button><button class="btn sm pr" data-ok="${u.id}">승인</button></div></div>`).join('')}</section>`;
}
const joinURL = (id) => APP_URL() + '?join=' + id + (MOCK ? '&mock' : '');
const qrSVG = (t) => { const q = qrcode(0, 'M'); q.addData(t); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); };
async function invites() {
  const list = (await DB.list('invites')).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const label = (v) => [v.club ? clubName(v.club) : '클럽 없음', v.team ? (A.teams.find((t) => t.id === v.team) || {}).name : ''].filter(Boolean).join(' · ');
  modal(`<h3>가입 링크</h3><p class="muted small" style="margin:0;line-height:1.7">링크나 QR을 단체방에 올리거나 화면에 띄우면, 각자 이름과 학년만 넣고 가입합니다. 입장 코드는 자동으로 만들어지고 그 기기에서 바로 들어갑니다.</p>
    <div class="inv-list">${list.map((v) => `<div class="inv-row ${v.on === false ? 'off' : ''}"><div class="l"><b>${esc(v.name || label(v))}</b><span class="small muted">${esc(label(v))} · ${v.auto ? '바로 입장' : '승인 후 입장'}${A.users.filter((u) => u.invite === v.id).length ? ` · ${A.users.filter((u) => u.invite === v.id).length}명 가입` : ''}</span></div>
      <div class="acts"><button class="btn sm" data-show="${v.id}">${icon('qr', 16)}QR</button><button class="switch ${v.on === false ? '' : 'on'}" data-on="${v.id}" aria-label="링크 켜기"></button><button class="icon-btn" data-rm="${v.id}" aria-label="삭제">${icon('trash', 18)}</button></div></div>`).join('') || '<p class="muted small" style="padding:18px 0;margin:0">아직 만든 링크가 없습니다.</p>'}</div>
    <div class="ufields" style="border-top:1px solid var(--line);padding-top:18px">
      <b style="font-size:15px">새 링크 만들기</b>
      <div class="two">
        <div class="field"><label for="ic">클럽</label><select class="input" id="ic"><option value="">클럽 없음 (어른)</option>${CLUBS.map((c) => `<option value="${c.id}">${esc(c.name)} · ${esc(c.age)}</option>`).join('')}</select></div>
        <div class="field"><label for="it">팀</label><select class="input" id="it"><option value="">팀 없음</option>${A.teams.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label for="in">링크 이름 (선택)</label><input class="input" id="in" placeholder="예) 2027 스팍스 봄학기"></div>
      <div class="field"><label>들어오는 방식</label><div class="seg" id="ia"><button type="button" data-v="1" class="on">바로 입장</button><button type="button" data-v="0">승인 후 입장</button></div></div>
    </div>
    <div class="actions"><button class="btn md" data-close>닫기</button><button class="btn md pr" id="mk">링크 만들기</button></div>`, {
    onMount(el, close) {
      $$('#ia button', el).forEach((b) => b.onclick = () => $$('#ia button', el).forEach((x) => x.classList.toggle('on', x === b)));
      $('#mk', el).onclick = async () => {
        const id = newCode(6);
        const v = { club: $('#ic', el).value || null, team: $('#it', el).value || null, name: $('#in', el).value.trim() || null, auto: $('#ia .on', el).dataset.v === '1', on: true, createdAt: Date.now() };
        await DB.set('invites/' + id, v, false); close(); showInvite({ id, ...v }, label);
      };
      $$('[data-show]', el).forEach((b) => b.onclick = () => { close(); showInvite(list.find((x) => x.id === b.dataset.show), label); });
      $$('[data-on]', el).forEach((b) => b.onclick = async () => { const on = !b.classList.contains('on'); await DB.set('invites/' + b.dataset.on, { on }); b.classList.toggle('on', on); b.closest('.inv-row').classList.toggle('off', !on); });
      $$('[data-rm]', el).forEach((b) => b.onclick = async () => { await DB.del('invites/' + b.dataset.rm); b.closest('.inv-row').remove(); toast('지웠습니다'); });
    }
  });
}
function showInvite(v, label) {
  const url = joinURL(v.id); const title = v.name || label(v);
  modal(`<h3>${esc(title)}</h3><p class="muted small" style="margin:0">${esc(label(v))} · ${v.auto ? '바로 입장' : '승인 후 입장'}</p>
    <div class="inv-qr">${qrSVG(url)}</div>
    <p class="inv-url num">${esc(url)}</p>
    <div class="actions"><button class="btn md" id="bk">목록</button><button class="btn md" id="pr">${icon('down', 16)}인쇄</button><button class="btn md pr" id="cp">${icon('copy', 16)}안내 문구 복사</button></div>`, {
    onMount(el, close) {
      $('#bk', el).onclick = () => { close(); invites(); };
      $('#cp', el).onclick = () => { navigator.clipboard.writeText(`[새김 말씀 암송${v.club ? ' · ' + clubName(v.club) : ''}]\n아래 주소를 눌러 이름과 학년을 넣으면 바로 시작할 수 있어요.\n${url}`); toast('복사했습니다'); };
      $('#pr', el).onclick = () => {
        const w = window.open('', '_blank'); if (!w) return toast('팝업이 막혔습니다');
        w.document.write(`<html><head><title>${esc(title)}</title><style>body{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;text-align:center;padding:60px 40px;color:#1A1D24}h1{font-size:44px;margin:0 0 8px}p{font-size:20px;color:#676B74;margin:0}svg{width:360px;height:360px;margin:48px auto 28px;display:block}small{font-size:14px;color:#676B74;word-break:break-all}</style></head><body><h1>말씀 새기러 가요!</h1><p>${esc(title)} · 휴대폰 카메라로 찍어 주세요</p>${qrSVG(url)}<small>${esc(url)}</small><p style="margin-top:40px;font-size:14px">만든 곳 AI목양지원센터</p><script>setTimeout(()=>print(),300)<\/script></body></html>`);
        w.document.close();
      };
    }
  });
}
const UCOLS = '1.3fr 1fr 1.2fr 84px 130px 84px 150px';
function findClub(x) {
  const k = String(x || '').trim().toLowerCase().replace(/\s/g, '');
  const c = CLUBS.find((c) => c.name.toLowerCase() === k || c.en.toLowerCase().replace(/\s/g, '') === k || c.id === k || (k === 'tt' && c.id === 'tnt'));
  return c ? c.id : null;
}
function modeTag(u) {
  const auto = !u.mode || u.mode === 'auto';
  const m = auto ? ((A.settings.clubModes || {})[clubOf(u)] || 'adult') : u.mode;
  return `<span class="mode-tag m-${m}">${esc(MODES[m] ? MODES[m].name : '기본')}</span>${auto ? '' : '<span class="small muted"> 고정</span>'}`;
}
function userFields(u, teamOptsHTML) {
  return `<div class="ufields">
    <div class="field"><label for="un">이름</label><input class="input" id="un" value="${esc(u.name || '')}"></div>
    <div class="field"><label for="ut">팀</label><select class="input" id="ut">${teamOptsHTML}</select></div>
    <div class="two">
      <div class="field"><label for="ug">학년</label><select class="input" id="ug"><option value="">정하지 않음</option>${GRADES.map((g) => `<option ${u.grade === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="field"><label for="uc">어와나 클럽</label><select class="input" id="uc"><option value="">학년으로 자동</option>${CLUBS.map((c) => `<option value="${c.id}" ${u.club === c.id ? 'selected' : ''}>${esc(c.name)} · ${esc(c.age)}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>화면 모드</label><div class="seg" id="um">${[['auto', '클럽 따라'], ['adult', '기본'], ['play', '놀이'], ['explore', '탐험'], ['challenge', '도전']].map(([k, l]) => `<button type="button" data-v="${k}" class="${(u.mode || 'auto') === k ? 'on' : ''}">${l}</button>`).join('')}</div><span class="small muted" id="umd"></span></div>
  </div>`;
}
function bindUserFields(el) {
  const upd = () => {
    const club = $('#uc', el).value || gradeToClub($('#ug', el).value);
    const pick = ($('#um .on', el) || {}).dataset?.v || 'auto';
    const m = pick === 'auto' ? ((A.settings.clubModes || {})[club] || 'adult') : pick;
    $('#umd', el).textContent = `${club ? clubName(club) + ' · ' : ''}${MODES[m].name} 모드 — ${MODES[m].desc}`;
  };
  $$('#um button', el).forEach((b) => b.onclick = () => { $$('#um button', el).forEach((x) => x.classList.toggle('on', x === b)); upd(); });
  $('#uc', el).onchange = upd; $('#ug', el).onchange = upd; upd();
}
function readUser(el) {
  return { name: $('#un', el).value.trim(), team: $('#ut', el).value || null, grade: $('#ug', el).value || null, club: $('#uc', el).value || null, mode: ($('#um .on', el) || {}).dataset?.v || 'auto' };
}
async function uniqueCode(taken = []) {
  for (let i = 0; i < 20; i++) { const c = newCode(); if (taken.includes(c)) continue; const ex = await DB.get('users/' + c); if (!ex) return c; }
  throw new Error('코드를 만들지 못했습니다');
}
function showCode(name, code) {
  modal(`<h3>${esc(name)} 님의 입장 코드</h3><p class="code-pill" style="font-size:44px;margin:16px 0 8px">${code.slice(0, 4)} ${code.slice(4)}</p><p class="muted small" style="margin:0;line-height:1.7">주소: ${esc(APP_URL())}<br>이름과 이 코드로 들어갑니다.</p>
    <div class="actions"><button class="btn md" id="cp">${icon('copy', 16)}안내 문구 복사</button><button class="btn md pr" data-close>확인</button></div>`, {
    onMount(el) { $('#cp', el).onclick = () => { navigator.clipboard.writeText(`[새김 말씀 암송]\n${name} 님, 아래 주소로 들어가 이름과 입장 코드를 넣어 주세요.\n주소: ${APP_URL()}\n입장 코드: ${code}`); toast('복사했습니다'); }; }
  });
}

/* ───────── 팀 ───────── */
async function teams() {
  const us = await DB.list('users');
  shell('teams', pageHead('팀', `팀 ${A.teams.length}개`, `<button class="btn md pr" id="add">${icon('plus', 16)}팀 추가</button>`),
    `<div class="tbl"><div class="tr th" style="grid-template-columns:40px 1fr 120px 150px"><span></span><span>팀 이름</span><span>인원</span><span></span></div>
    ${A.teams.map((t) => `<div class="tr" style="grid-template-columns:40px 1fr 120px 150px"><i class="dot-color" style="background:${t.color};width:16px;height:16px;border-radius:8px"></i><b>${esc(t.name)}</b><span class="head num">${us.filter((u) => u.team === t.id).length}명</span><div class="acts"><button class="icon-btn" data-edit="${t.id}" aria-label="고치기">${icon('edit', 18)}</button><button class="icon-btn" data-del="${t.id}" aria-label="삭제">${icon('trash', 18)}</button></div></div>`).join('') || '<p class="muted" style="padding:24px 0">사랑방 이름으로 팀을 만들면 팀 대항전을 할 수 있습니다.</p>'}</div>`);
  const form = (t = {}) => modal(`<h3>${t.id ? '팀 고치기' : '팀 추가'}</h3><div style="display:flex;flex-direction:column;gap:16px;margin-top:16px"><div class="field"><label for="tn">팀 이름</label><input class="input" id="tn" value="${esc(t.name || '')}" placeholder="예) 1사랑방"></div>
    <div class="field"><label>색</label><div style="display:flex;gap:10px;flex-wrap:wrap">${TEAM_COLORS.map((c) => `<button class="icon-btn" data-c="${c}" aria-label="색 ${c}" style="background:${c};width:36px;height:36px;border-radius:18px;box-shadow:${(t.color || TEAM_COLORS[A.teams.length % 8]) === c ? '0 0 0 2px var(--bg), 0 0 0 4px var(--ink)' : 'none'}"></button>`).join('')}</div></div></div>
    <div class="actions"><button class="btn md" data-close>취소</button><button class="btn md pr" id="go">저장</button></div>`, {
    onMount(el, close) {
      let color = t.color || TEAM_COLORS[A.teams.length % 8];
      $$('[data-c]', el).forEach((b) => b.onclick = () => { color = b.dataset.c; $$('[data-c]', el).forEach((x) => x.style.boxShadow = x === b ? '0 0 0 2px var(--bg), 0 0 0 4px var(--ink)' : 'none'); });
      $('#go', el).onclick = async () => { const name = $('#tn', el).value.trim(); if (!name) return; const id = t.id || 't' + Date.now().toString(36); await DB.set('teams/' + id, { name, color, order: t.order ?? A.teams.length }); close(); await refresh(); teams(); };
    }
  });
  $('#add').onclick = () => form();
  $$('[data-edit]').forEach((b) => b.onclick = () => form(A.teams.find((t) => t.id === b.dataset.edit)));
  $$('[data-del]').forEach((b) => b.onclick = async () => { if (!(await confirmBox('팀 삭제', '팀을 지워도 사용자는 그대로 남습니다.', '삭제', true))) return; await DB.del('teams/' + b.dataset.del); await refresh(); teams(); });
}

/* ───────── 진도 리포트 ───────── */
async function report() {
  const [us, ps] = await Promise.all([DB.list('users'), DB.list('progress')]);
  const pmap = Object.fromEntries(ps.map((p) => [p.id, p]));
  const tname = (id) => (A.teams.find((t) => t.id === id) || {}).name || '-';
  const rows = us.map((u) => { const p = pmap[u.id] || {}; const v = p.v || {}; return { name: u.name, team: tname(u.team), teamId: u.team, learned: Object.keys(v).length, mastered: Object.values(v).filter((x) => x.mastered).length, streak: p.lastDay && p.lastDay >= addDays(today(), -1) ? p.streak || 0 : 0, xp: p.xp || 0, last: p.lastDay || '' }; }).sort((a, b) => b.learned - a.learned || b.xp - a.xp);
  const teamRows = A.teams.map((t) => { const m = rows.filter((r) => r.teamId === t.id); return { t, n: m.length, learned: m.reduce((s, r) => s + r.learned, 0) }; }).sort((a, b) => b.learned - a.learned);
  shell('report', pageHead('진도 리포트', '누가 얼마나 새겼을까', `<button class="btn md pr" id="xl">${icon('down', 16)}엑셀로 받기</button>`),
    `${teamRows.length ? `<section style="margin-top:28px"><h2 class="head" style="font-size:22px;margin:0">팀별</h2><div class="tbl"><div class="tr th" style="grid-template-columns:1fr 100px 140px 1.4fr"><span>팀</span><span>인원</span><span>새긴 말씀</span><span></span></div>${teamRows.map((r) => `<div class="tr" style="grid-template-columns:1fr 100px 140px 1.4fr"><span style="display:flex;align-items:center;gap:8px" class="nowrap"><i class="dot-color" style="background:${r.t.color}"></i><b>${esc(r.t.name)}</b></span><span class="num">${r.n}명</span><span class="head num">${fmt(r.learned)}</span><div style="height:4px;background:var(--line)"><div style="height:100%;width:${teamRows[0].learned ? (r.learned / teamRows[0].learned) * 100 : 0}%;background:${r.t.color}"></div></div></div>`).join('')}</div></section>` : ''}
    <section class="ad-sec"><h2>사람별</h2><div class="tbl"><div style="min-width:760px"><div class="tr th" style="grid-template-columns:48px 1.2fr 1fr 100px 110px 90px 100px 120px"><span>순위</span><span>이름</span><span>팀</span><span>새긴 말씀</span><span>오래 기억</span><span>연속</span><span>점수</span><span>마지막</span></div>
    ${rows.map((r, i) => `<div class="tr" style="grid-template-columns:48px 1.2fr 1fr 100px 110px 90px 100px 120px"><span class="head num" style="color:${i < 3 ? 'var(--ac)' : 'var(--sub)'}">${i + 1}</span><b class="nowrap">${esc(r.name)}</b><span class="nowrap">${esc(r.team)}</span><span class="head num">${r.learned}</span><span class="num">${r.mastered}</span><span class="num">${r.streak}일</span><span class="num">${fmt(r.xp)}</span><span class="num muted">${r.last}</span></div>`).join('') || '<p class="muted" style="padding:24px 0">기록이 아직 없습니다.</p>'}</div></div></section>`);
  $('#xl').onclick = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows.map((r, i) => ({ 순위: i + 1, 이름: r.name, 팀: r.team, 새긴말씀: r.learned, 오래기억: r.mastered, 연속일수: r.streak, 은혜점수: r.xp, 마지막학습일: r.last })));
    XLSX.utils.book_append_sheet(wb, ws, '사람별');
    if (teamRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teamRows.map((r) => ({ 팀: r.t.name, 인원: r.n, 새긴말씀: r.learned }))), '팀별');
    XLSX.writeFile(wb, `새김_진도리포트_${today()}.xlsx`);
  };
}
function addDays(ymd, n) { const d = new Date(ymd + 'T00:00:00'); d.setDate(d.getDate() + n); const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }

/* ───────── 환경 설정 ───────── */
async function settings() {
  const s = JSON.parse(JSON.stringify(A.settings));
  const assets = {};
  for (const k of ['bg', 'logo', 'tvbg']) assets[k] = await DB.get('assets/' + k).catch(() => null);
  const P = { '새벽': ['#FAF8F4', '#B23A2A'], '감람산': ['#F3F4EE', '#4C6B35'], '성막': ['#10162A', '#D4AF5E'], '광야': ['#F6EFE6', '#A2451F'], '별밤': ['#0C0F14', '#E4806E'] };
  const seg = (key, opts, cur) => `<div class="seg" data-seg="${key}">${opts.map((o) => `<button class="${String(o) === String(cur) ? 'on' : ''}" data-v="${o}">${o}</button>`).join('')}</div>`;
  const ruleDesc = { '엄격': '글자가 모두 맞아야 정답입니다. 띄어쓰기와 문장부호만 보지 않습니다.', '보통': '오타 한두 글자까지 정답으로 인정하고, 틀린 글자는 표시해서 보여 줍니다.', '느슨': '90% 이상 맞으면 통과입니다. 조사 하나 정도 틀린 것은 넘어갑니다.' };
  const up = (k, label, ic) => `<div class="upbox">${assets[k] ? `<img src="${assets[k].data}" alt=""><button class="x" data-rmimg="${k}" aria-label="${label} 지우기">${icon('close', 14)}</button>` : ''}<label for="f-${k}" style="position:absolute;inset:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">${assets[k] ? '' : icon(ic, 20)}<span class="lb">${assets[k] ? '바꾸기' : label}</span></label><input type="file" accept="image/*" id="f-${k}" data-up="${k}" class="hidden"></div>`;

  shell('settings', pageHead('환경 설정', '앱의 모든 것을 여기서 정합니다', `<button class="btn md pr" id="save">저장하기</button>`), `
    <section class="ad-sec"><h2>기본 정보</h2>
      <div class="set-row"><div class="lab"><b>앱 이름</b><span>로고 옆과 수료증에 보입니다</span></div><input class="input" id="appName" value="${esc(s.appName)}" style="max-width:360px"></div>
      <div class="set-row"><div class="lab"><b>교회 이름</b><span>수료증 아래에 들어갑니다</span></div><input class="input" id="churchName" value="${esc(s.churchName || '')}" placeholder="예) 할렐루야교회 5교구" style="max-width:360px"></div>
    </section>
    <section class="ad-sec"><h2>화면</h2>
      <div class="set-row"><div class="lab"><b>테마</b><span>눌러서 바로 바꿔 보세요</span></div><div class="swatches">${THEMES.map((t) => `<button class="swatch ${s.theme === t ? 'on' : ''}" data-theme-pick="${t}"><span class="sw" style="background:${P[t][0]}"><span></span><i style="background:${P[t][1]}"></i></span><span>${t}</span></button>`).join('')}</div></div>
      <div class="set-row"><div class="lab"><b>말씀 글꼴</b><span>구절 본문에 쓰는 글꼴</span></div><div class="fontcards">${Object.keys(VERSE_FONTS).map((f) => `<button class="fontcard ${s.verseFont === f ? 'on' : ''}" data-vf="${f}"><span class="s" style="font-family:${VERSE_FONTS[f]}">말씀</span><span class="n">${f}</span></button>`).join('')}</div></div>
      <div class="set-row"><div class="lab"><b>화면 글꼴</b><span>메뉴와 단추에 쓰는 글꼴</span></div>${seg('uiFont', Object.keys(UI_FONTS), s.uiFont)}</div>
      <div class="set-row top"><div class="lab" style="padding-top:10px"><b>글자 크기</b><span>어르신이 많으면 ‘크게’를 권합니다</span></div><div style="display:flex;flex-direction:column;gap:16px">${seg('textSize', SIZES, s.textSize)}<p class="preview-verse">너는 내게 부르짖으라 내가 네게 응답하겠고 네가 알지 못하는 크고 비밀한 일을 네게 보이리라 <span style="font-family:var(--f-ui);font-size:13px;color:var(--sub)">렘 33:3</span></p></div></div>
      <div class="set-row top"><div class="lab" style="padding-top:10px"><b>배경과 로고</b><span>사진은 흐리게 깔립니다. 로고는 정사각형이 좋아요</span></div><div style="display:flex;flex-direction:column;gap:16px"><div class="uploads">${up('bg', '배경 사진 올리기', 'image')}${up('logo', '교회 로고 올리기', 'book')}${up('tvbg', 'TV 배경 올리기', 'tv')}</div>
        <div class="inline"><span class="small muted nowrap">배경 흐림</span><input type="range" id="bgOpacity" min="0.5" max="0.97" step="0.01" value="${s.bgOpacity}" style="flex:1;max-width:280px"><span class="small num nowrap" id="bgOv">${Math.round(s.bgOpacity * 100)}%</span></div></div></div>
    </section>
    <section class="ad-sec"><h2>학습</h2>
      <div class="set-row"><div class="lab"><b>사용할 단계</b><span>눌러서 켜고 끕니다</span></div><div class="stagegrid">${STAGES.map(([k, l]) => `<button class="stagebtn ${s.stages[k] !== false ? 'on' : ''}" data-stage="${k}"><i></i>${l}</button>`).join('')}</div></div>
      <div class="set-row"><div class="lab"><b>하루 새 구절</b><span>매일 새로 외울 구절 수</span></div><div class="stepper"><button data-step="-1" aria-label="줄이기">−</button><span id="dn" class="num">${s.dailyNew}구절</span><button data-step="1" aria-label="늘리기">+</button></div></div>
      <div class="set-row"><div class="lab"><b>복습 간격</b><span>외운 뒤 다시 나오는 날 (쉼표로 구분)</span></div><input class="input num" id="intervals" value="${s.intervals.join(', ')}" style="max-width:360px"></div>
      <div class="set-row"><div class="lab"><b>음성 듣기 속도</b><span>읽고 듣기 단계의 낭독</span></div>${seg('ttsRate', ['0.8', '0.9', '1', '1.1', '1.2'], String(s.ttsRate))}</div>
      <div class="set-row"><div class="lab"><b>처음부터 쉬운 모드</b><span>타자 대신 골라서 맞히기 · 사용자가 바꿀 수 있습니다</span></div><button class="switch ${s.easyDefault ? 'on' : ''}" id="easyDefault" aria-label="쉬운 모드 기본값"></button></div>
    </section>
    <section class="ad-sec"><h2>어와나 클럽 화면</h2>
      <p class="muted small" style="margin:0 0 8px;line-height:1.7">사용자에게 클럽이나 학년을 정해 주면 아래 표에 따라 화면이 바뀝니다. 사용자마다 따로 고정할 수도 있습니다.</p>
      <div class="mode-cards">${Object.entries(MODES).map(([k, m]) => `<div class="mode-card m-${k}"><span class="mode-tag m-${k}">${esc(m.name)}</span><span class="small muted">${esc(m.desc)}</span></div>`).join('')}</div>
      ${CLUBS.map((c) => `<div class="set-row"><div class="lab"><b>${esc(c.name)} <span class="muted" style="font-weight:500">${esc(c.en)}</span></b><span>${esc(c.age)}</span></div><div class="seg" data-club="${c.id}">${Object.entries(MODES).map(([k, m]) => `<button class="${(s.clubModes || {})[c.id] === k ? 'on' : ''}" data-v="${k}">${esc(m.name)}</button>`).join('')}</div></div>`).join('')}
      <div class="set-row"><div class="lab"><b>사용자가 모드 바꾸기</b><span>내 기록에서 스스로 화면 모드를 고를 수 있게</span></div><button class="switch ${s.modeUserPick !== false ? 'on' : ''}" id="modeUserPick" aria-label="사용자가 모드 바꾸기"></button></div>
      <div class="set-row"><div class="lab"><b>미리 보기</b><span>각 모드가 어떻게 보이는지 새 창에서 봅니다</span></div><div class="inline" style="gap:8px;flex-wrap:wrap">${['play', 'explore', 'challenge'].map((k) => `<a class="btn sm" target="_blank" rel="noopener" href="./?preview=${k}${MOCK ? '&mock' : ''}">${esc(MODES[k].name)} 모드</a>`).join('')}</div></div>
    </section>
    <section class="ad-sec"><h2>정답 규칙</h2>
      <div class="set-row top"><div class="lab" style="padding-top:10px"><b>기본 규칙</b><span>코스와 대전마다 따로 바꿀 수 있습니다</span></div><div style="display:flex;flex-direction:column;gap:14px">${seg('rule', ['엄격', '보통', '느슨'], s.rule)}<p class="muted small" id="rd" style="margin:0;line-height:1.7">${ruleDesc[s.rule]}</p></div></div>
    </section>
    <section class="ad-sec"><h2>대전</h2>
      <div class="set-row"><div class="lab"><b>제한 시간</b><span>문제 하나당</span></div>${seg('time', ['10', '15', '20', '30', '45', '60'], String(s.battle.time))}</div>
      <div class="set-row"><div class="lab"><b>문제 수</b><span>한 판에 나오는 문제</span></div>${seg('count', ['5', '7', '10', '15', '20'], String(s.battle.count))}</div>
      <div class="set-row"><div class="lab"><b>점수 방식</b><span>빨리 맞힐수록 더 받을지</span></div>${seg('scoring', ['정답만', '정답 + 속도'], s.battle.scoring === 'speed' ? '정답 + 속도' : '정답만')}</div>
      <div class="set-row"><div class="lab"><b>효과음</b><span>문제 시작, 남은 시간, 정답, 테마 소리</span></div><button class="switch ${s.battle.sound !== false ? 'on' : ''}" id="bsound" aria-label="효과음"></button></div>
      <div class="set-row"><div class="lab"><b>배경 음악</b><span>테마마다 다른 잔잔한 반복 선율</span></div><button class="switch ${s.battle.bgm !== false ? 'on' : ''}" id="bbgm" aria-label="배경 음악"></button></div>
      <div class="set-row"><div class="lab"><b>소리 크기</b><span>TV에서 나는 소리의 기본 크기</span></div>${seg('volume', ['작게', '보통', '크게'], ({ 0.4: '작게', 0.7: '보통', 1: '크게' })[s.battle.volume ?? 0.7] || '보통')}</div>
      <div class="set-row"><div class="lab"><b>기본 대전 테마</b><span>TV에 처음 뜨는 배경</span></div><select class="input" id="btheme" style="max-width:360px">${BATTLE_THEMES.map((t) => `<option ${s.battle.theme === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    </section>
    <div style="margin-top:56px;display:flex;align-items:center;justify-content:space-between;padding:22px 0;border-top:1px solid var(--ink);font-size:13px;color:var(--sub)"><span>새김 INSCRIBE 1.0</span><span>만든 곳 <b style="color:var(--ink)">AI목양지원센터</b></span></div>`);

  const live = () => applySettings(s);
  $$('[data-theme-pick]').forEach((b) => b.onclick = () => { s.theme = b.dataset.themePick; $$('[data-theme-pick]').forEach((x) => x.classList.toggle('on', x === b)); live(); });
  $$('[data-vf]').forEach((b) => b.onclick = () => { s.verseFont = b.dataset.vf; $$('[data-vf]').forEach((x) => x.classList.toggle('on', x === b)); live(); });
  $$('[data-seg]').forEach((g) => $$('button', g).forEach((b) => b.onclick = () => {
    $$('button', g).forEach((x) => x.classList.toggle('on', x === b)); const k = g.dataset.seg; const v = b.dataset.v;
    if (k === 'uiFont') s.uiFont = v; if (k === 'textSize') s.textSize = v; if (k === 'ttsRate') s.ttsRate = Number(v);
    if (k === 'rule') { s.rule = v; $('#rd').textContent = ruleDesc[v]; }
    if (k === 'volume') s.battle.volume = { '작게': 0.4, '보통': 0.7, '크게': 1 }[v]; if (k === 'time') s.battle.time = Number(v); if (k === 'count') s.battle.count = Number(v); if (k === 'scoring') s.battle.scoring = v === '정답만' ? 'correct' : 'speed';
    live();
  }));
  s.clubModes = { ...(DEFAULTS.clubModes), ...(s.clubModes || {}) };
  $$('[data-club]').forEach((g) => $$('button', g).forEach((b) => b.onclick = () => { $$('button', g).forEach((x) => x.classList.toggle('on', x === b)); s.clubModes[g.dataset.club] = b.dataset.v; }));
  $('#modeUserPick').onclick = (e) => { s.modeUserPick = s.modeUserPick === false; e.currentTarget.classList.toggle('on', s.modeUserPick !== false); };
  $$('[data-stage]').forEach((b) => b.onclick = () => { const k = b.dataset.stage; s.stages[k] = s.stages[k] === false; b.classList.toggle('on', s.stages[k] !== false); });
  $$('[data-step]').forEach((b) => b.onclick = () => { s.dailyNew = Math.max(1, Math.min(10, s.dailyNew + Number(b.dataset.step))); $('#dn').textContent = s.dailyNew + '구절'; });
  $('#bsound').onclick = (e) => { s.battle.sound = s.battle.sound === false; e.currentTarget.classList.toggle('on', s.battle.sound !== false); };
  $('#bbgm').onclick = (e) => { s.battle.bgm = s.battle.bgm === false; e.currentTarget.classList.toggle('on', s.battle.bgm !== false); };
  $('#easyDefault').onclick = (e) => { s.easyDefault = !s.easyDefault; e.currentTarget.classList.toggle('on', s.easyDefault); };
  $('#bgOpacity').oninput = (e) => { s.bgOpacity = Number(e.target.value); $('#bgOv').textContent = Math.round(s.bgOpacity * 100) + '%'; };
  $$('[data-up]').forEach((inp) => inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return; const k = inp.dataset.up;
    const data = await shrinkImage(f, k === 'logo' ? 512 : 1600, k === 'logo' ? 'image/png' : 'image/jpeg', 0.8);
    if (data.length > 900000) return toast('사진이 너무 큽니다. 더 작은 사진을 골라 주세요');
    const ver = Date.now(); await DB.set('assets/' + k, { data, updatedAt: ver }, false); await DB.set('config/app', { assetsVersion: ver }); s.assetsVersion = ver; toast('올렸습니다'); A.settings = s; settings();
  });
  $$('[data-rmimg]').forEach((b) => b.onclick = async (e) => { e.preventDefault(); e.stopPropagation(); await DB.del('assets/' + b.dataset.rmimg); const ver = Date.now(); await DB.set('config/app', { assetsVersion: ver }); s.assetsVersion = ver; A.settings = s; toast('지웠습니다'); settings(); });
  $('#save').onclick = async () => {
    s.appName = $('#appName').value.trim() || '새김'; s.churchName = $('#churchName').value.trim();
    const iv = $('#intervals').value.split(/[,\s]+/).map(Number).filter((n) => n > 0); if (iv.length) s.intervals = iv;
    s.battle.theme = $('#btheme').value;
    const { weeklyVerse, ...rest } = s;
    await DB.set('config/app', { ...rest, updatedAt: Date.now() });
    A.settings = s; toast('저장했습니다'); live();
  };
}

/* ───────── 관리자 ───────── */
async function admins() {
  const list = (await DB.list('adminCodes')).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  shell('admins', pageHead('관리자', `관리자 ${list.length + 1}명`, `<button class="btn md pr" id="add">${icon('plus', 16)}관리자 추가</button>`),
    `<p class="muted small" style="margin:20px 0 0;line-height:1.7">관리자는 이름과 함께 받은 <b style="color:var(--ink)">10자리 관리자 코드</b>로 들어갑니다. 코드를 지우면 그 관리자는 바로 들어올 수 없게 됩니다.</p>
    <div class="tbl"><div style="min-width:640px"><div class="tr th" style="grid-template-columns:1.2fr 1fr 160px 140px 100px"><span>이름</span><span>역할</span><span>관리자 코드</span><span>만든 날</span><span></span></div>
      <div class="tr" style="grid-template-columns:1.2fr 1fr 160px 140px 100px"><b class="nowrap">최고 관리자</b><span class="nowrap muted">구글 계정 · 최초 코드</span><span class="muted">—</span><span class="muted">—</span><span></span></div>
      ${list.map((a) => `<div class="tr" style="grid-template-columns:1.2fr 1fr 160px 140px 100px"><b class="nowrap">${esc(a.name)}</b><span class="nowrap">${esc(a.role || '관리자')}</span><span class="code-pill">${esc(a.id.slice(0, 5))} ${esc(a.id.slice(5))}</span><span class="num muted">${a.createdAt ? new Date(a.createdAt).toLocaleDateString('ko-KR') : ''}</span><div class="acts"><button class="icon-btn" data-copy="${a.id}" data-name="${esc(a.name)}" aria-label="안내 문구 복사">${icon('copy', 18)}</button><button class="icon-btn" data-del="${a.id}" aria-label="관리자 삭제">${icon('trash', 18)}</button></div></div>`).join('')}
    </div></div>`);
  const copy = (name, code) => { navigator.clipboard.writeText(`[새김 관리자 안내]\n${name} 님, 아래 주소에서 관리자 코드를 넣어 주세요.\n주소: ${new URL('admin.html', APP_URL()).href}\n관리자 코드: ${code}`); toast('안내 문구를 복사했습니다'); };
  $('#add').onclick = () => modal(`<h3>관리자 추가</h3><div style="display:flex;flex-direction:column;gap:16px;margin-top:16px"><div class="field"><label for="an">이름</label><input class="input" id="an" placeholder="예) 김OO 전도사"></div><div class="field"><label for="ar">역할</label><input class="input" id="ar" placeholder="예) 사랑방 담당" value="관리자"></div></div><div class="actions"><button class="btn md" data-close>취소</button><button class="btn md pr" id="go">추가하고 코드 받기</button></div>`, {
    onMount(el, close) {
      $('#an', el).focus();
      $('#go', el).onclick = async () => {
        const name = $('#an', el).value.trim(); if (!name) return toast('이름을 적어 주세요');
        let code; for (let i = 0; i < 10; i++) { code = newCode(10); if (!(await DB.get('adminCodes/' + code).catch(() => null))) break; }
        await DB.set('adminCodes/' + code, { name, role: $('#ar', el).value.trim() || '관리자', createdAt: Date.now() }, false);
        close();
        modal(`<h3>${esc(name)} 님의 관리자 코드</h3><p class="code-pill" style="font-size:40px;margin:16px 0 8px">${code.slice(0, 5)} ${code.slice(5)}</p><p class="muted small" style="margin:0;line-height:1.7">관리자 화면에서 이 코드를 넣으면 들어옵니다.</p><div class="actions"><button class="btn md" id="cp">${icon('copy', 16)}안내 문구 복사</button><button class="btn md pr" data-close>확인</button></div>`, { onMount(m) { $('#cp', m).onclick = () => copy(name, code); } });
        admins();
      };
    }
  });
  $$('[data-copy]').forEach((b) => b.onclick = () => copy(b.dataset.name, b.dataset.copy));
  $$('[data-del]').forEach((b) => b.onclick = async () => {
    if (!(await confirmBox('관리자 삭제', '이 코드로는 더 이상 관리자 화면에 들어올 수 없습니다.', '삭제', true))) return;
    await DB.del('adminCodes/' + b.dataset.del); toast('지웠습니다'); admins();
  });
}
