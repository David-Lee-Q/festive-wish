'use strict';

const $ = (id) => document.getElementById(id);

const state = {
  festivals: [],
  festival: null,
  festivalGroup: 'cn',
  gender: '',
  profile: null,
  blessing: null,
  image: null,
  cardDataUrl: null,
  busy: false,
  genToken: 0
};

const GROUP_ORDER = ['cn', 'world', 'minority'];
const GROUP_TITLE = { cn: '中国节日', world: '世界节日', minority: '少数民族节日' };

/* ---------------- 主题配色 ---------------- */

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function heartPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.95);
  ctx.bezierCurveTo(cx - s * 1.45, cy - s * 0.05, cx - s * 0.75, cy - s * 1.05, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.75, cy - s * 1.05, cx + s * 1.45, cy - s * 0.05, cx, cy + s * 0.95);
  ctx.closePath();
}

function drawFavicon(theme) {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, theme.primary);
  g.addColorStop(1, theme.deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const c0 = size * 0.245, c1 = size * 0.755, off = size * 0.022, r = size * 0.10;
  roundRectPath(ctx, c0 + off * 0.4, c0 + off, c1 + off * 0.4, c1 + off, r);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();
  roundRectPath(ctx, c0, c0, c1, c1, r);
  ctx.fillStyle = '#fffdf9';
  ctx.fill();
  ctx.fillStyle = theme.gold;
  heartPath(ctx, size / 2, size * 0.385, size * 0.078);
  ctx.fill();
  ctx.fillStyle = theme.primary;
  const barH = size * 0.034;
  const bars = [[0.315, 0.685, 0.495], [0.355, 0.645, 0.575], [0.375, 0.625, 0.655]];
  bars.forEach(([x0, x1, y0]) => {
    roundRectPath(ctx, size * x0, size * y0, size * (x1 - x0), barH, barH / 2);
    ctx.fill();
  });
  return c.toDataURL('image/png');
}

function mixHex(hex, target, t) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const tr = parseInt(target.slice(1, 3), 16);
  const tg = parseInt(target.slice(3, 5), 16);
  const tb = parseInt(target.slice(5, 7), 16);
  const f = (a, c) => Math.round(a * (1 - t) + c * t).toString(16).padStart(2, '0');
  return '#' + f(r, tr) + f(g, tg) + f(b, tb);
}

function applyTheme(theme) {
  const root = document.documentElement.style;
  root.setProperty('--primary', theme.primary);
  root.setProperty('--primary-deep', theme.deep);
  root.setProperty('--primary-soft', theme.soft);
  root.setProperty('--amber', theme.amber);
  root.setProperty('--gold', theme.gold);
  root.setProperty('--bg1', theme.bg1);
  root.setProperty('--bg2', theme.bg2);
  root.setProperty('--bg3', theme.bg3);
  root.setProperty('--ink', theme.ink);
  root.setProperty('--line', theme.line);
  root.setProperty('--ink-soft', mixHex(theme.ink, '#ffffff', 0.28));
  root.setProperty('--ink-muted', mixHex(theme.ink, '#ffffff', 0.48));
  syncChrome(theme);
}

function syncChrome(theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.primary);
  const dyn = $('dyn-icon');
  if (dyn) dyn.setAttribute('href', drawFavicon(theme));
}

/* ---------------- 节日选择 ---------------- */

/* 鼠标按住左右拖动滚动（触摸/触控板走原生滑动） */
function setupDragScroll(el) {
  let down = false, moved = false, startX = 0, startScroll = 0;
  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    down = true;
    moved = false;
    startX = e.pageX;
    startScroll = el.scrollLeft;
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!down) return;
    const dx = e.pageX - startX;
    if (Math.abs(dx) > 5) { moved = true; el.classList.add('festival-grid--dragging'); }
    if (moved) el.scrollLeft = startScroll - dx;
  });
  window.addEventListener('mouseup', () => {
    if (!down) return;
    down = false;
    el.classList.remove('festival-grid--dragging');
    setTimeout(() => { moved = false; }, 0);
  });
  el.addEventListener('click', (e) => {
    if (moved) { e.stopPropagation(); e.preventDefault(); }
  }, true);
}

const NAV_SVG = {
  '-1': '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  '1': '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

function makeNavBtn(dir, grid) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'festival-nav-btn';
  btn.dataset.dir = dir;
  btn.setAttribute('aria-label', dir < 0 ? '向左滚动' : '向右滚动');
  btn.innerHTML = NAV_SVG[String(dir)];
  btn.addEventListener('click', () => {
    const step = Math.max(grid.clientWidth - 258, 516);
    grid.scrollBy({ left: Number(dir) * step, behavior: 'smooth' });
  });
  return btn;
}

function festivalCardEl(f) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'festival-card';
  btn.dataset.id = f.id;
  btn.setAttribute('role', 'radio');
  btn.setAttribute('aria-checked', f.id === (state.festival && state.festival.id) ? 'true' : 'false');
  btn.setAttribute('aria-label', f.name + ' ' + f.date + (f.ethnic ? '（' + f.ethnic + '）' : ''));
  const ICONS = window.FestivalIcons;
  const iconName =
    (ICONS && ICONS.sets[f.id] && ICONS.sets[f.id][0]) || 'star';
  const iconSrc = ICONS ? ICONS.img(iconName) : '/elements/' + iconName + '.png';
  btn.innerHTML =
    '<img class="festival-icon" src="' + iconSrc + '" alt="" aria-hidden="true" loading="lazy">' +
    '<span class="festival-char">' + f.keyChar + '</span>' +
    '<span class="festival-name">' + f.name + '</span>' +
    '<span class="festival-date">' + f.date + '</span>' +
    (f.ethnic ? '<span class="festival-ethnic">' + f.ethnic + '</span>' : '');
  btn.addEventListener('click', () => selectFestival(f.id));
  return btn;
}

function renderFestivals() {
  const wrap = $('festival-groups');
  wrap.innerHTML = '';

  // 三段式胶囊切换（居中）
  const tabs = document.createElement('div');
  tabs.className = 'festival-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', '节日分类');
  GROUP_ORDER.forEach((group) => {
    if (!state.festivals.some((f) => f.group === group)) return;
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'festival-tab';
    tab.dataset.group = group;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', group === state.festivalGroup ? 'true' : 'false');
    tab.textContent = GROUP_TITLE[group] || group;
    tab.addEventListener('click', () => {
      if (state.festivalGroup === group) return;
      state.festivalGroup = group;
      renderFestivals();
    });
    tabs.appendChild(tab);
  });

  // 当前分组的卡片行（左右按钮夹在两侧）
  const grid = document.createElement('div');
  grid.className = 'festival-grid';
  grid.setAttribute('role', 'presentation');
  setupDragScroll(grid);
  state.festivals.filter((f) => f.group === state.festivalGroup).forEach((f) => {
    grid.appendChild(festivalCardEl(f));
  });

  const row = document.createElement('div');
  row.className = 'festival-row';
  const prev = makeNavBtn(-1, grid);
  const next = makeNavBtn(1, grid);
  row.appendChild(prev);
  row.appendChild(grid);
  row.appendChild(next);

  const updateNav = () => {
    const atStart = grid.scrollLeft <= 2;
    const atEnd = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 2;
    prev.disabled = atStart;
    next.disabled = atEnd;
  };
  grid.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('resize', updateNav);
  updateNav();

  wrap.appendChild(tabs);
  wrap.appendChild(row);
  revealSelectedCard();
}

/* 让当前选中的节日卡片在卡片行内完整可见（移动端一屏一张时尤其重要） */
function revealSelectedCard() {
  const grid = document.querySelector('#festival-groups .festival-grid');
  const card = grid && grid.querySelector('.festival-card[aria-checked="true"]');
  if (!grid || !card) return;
  const pad = parseFloat(getComputedStyle(grid).paddingLeft) || 0;
  const gr = grid.getBoundingClientRect();
  const cr = card.getBoundingClientRect();
  const left = gr.left + pad;
  const right = gr.right - pad;
  if (cr.left < left - 1) grid.scrollLeft += cr.left - left;
  else if (cr.right > right + 1) grid.scrollLeft += cr.right - right;
}

function selectFestival(id) {
  const festival = state.festivals.find((f) => f.id === id);
  if (!festival) return;
  state.festival = festival;
  state.festivalGroup = festival.group;
  document.querySelectorAll('.festival-card').forEach((el) => {
    el.setAttribute('aria-checked', el.dataset.id === id ? 'true' : 'false');
  });
  document.querySelectorAll('.festival-tab').forEach((el) => {
    el.setAttribute('aria-selected', el.dataset.group === festival.group ? 'true' : 'false');
  });
  applyTheme(festival.theme);
  renderDoodles(festival);
  $('festival-hint').textContent = '已绑定风格：' + festival.styleName;
  $('festival-badge-text').textContent = festival.date + ' · ' + festival.name;
  $('hero-title').textContent = '「' + festival.name + '」专属祝福';
  $('submit-btn').querySelector('span').textContent = state.blessing ? '重新生成' : '生成' + festival.name + '祝福';
  $('r-caption').textContent = 'AI 手绘风' + festival.name + '插画';
  revealSelectedCard();
}

/* ---------------- 背景节日元素（随机分布） ---------------- */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderDoodles(festival) {
  const field = $('doodle-field');
  const ICONS = window.FestivalIcons;
  if (!field || !ICONS) return;
  const names = ICONS.sets[festival.id] || ICONS.sets.default;

  // 4 列 x 3 行网格，每格随机落 0/1 个，保证分布均匀又不重叠
  const COLS = 4;
  const ROWS = 3;
  const slots = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) slots.push({ r, c });
  }
  shuffle(slots);
  const count = 9 + Math.floor(Math.random() * 4); // 9-12 个
  const cellW = 100 / COLS;
  const cellH = 100 / ROWS;

  field.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const slot = slots[i % slots.length];
    const name = names[i % names.length];
    const el = document.createElement('div');
    el.className = 'doodle-item';

    const size = 68 + Math.random() * 80; // 68-148px（约为线稿时期 2 倍）
    const jx = (Math.random() - 0.5) * cellW * 0.55;
    const jy = (Math.random() - 0.5) * cellH * 0.55;
    const left = 2 + (slot.c + 0.5) * cellW + jx;
    const top = 3 + (slot.r + 0.5) * cellH + jy;

    el.style.left = left.toFixed(2) + '%';
    el.style.top = top.toFixed(2) + '%';
    el.style.width = size.toFixed(0) + 'px';
    el.style.height = size.toFixed(0) + 'px';
    el.style.opacity = '0.5';
    el.style.setProperty('--rot', (Math.random() * 24 - 12).toFixed(1) + 'deg');
    el.style.setProperty('--dx', ((Math.random() - 0.5) * 26).toFixed(1) + 'px');
    el.style.setProperty('--dy', (-(10 + Math.random() * 16)).toFixed(1) + 'px');
    el.style.setProperty('--spin', ((Math.random() - 0.5) * 14).toFixed(1) + 'deg');
    el.style.setProperty('--dur', (7 + Math.random() * 6).toFixed(1) + 's');
    el.style.setProperty('--delay', (-Math.random() * 8).toFixed(1) + 's');
    const img = document.createElement('img');
    img.src = ICONS.img(name);
    img.alt = '';
    img.draggable = false;
    img.onerror = () => el.remove();
    el.appendChild(img);
    field.appendChild(el);
  }
}

async function loadFestivals() {
  try {
    const resp = await fetch('/api/festivals');
    const data = await resp.json();
    state.festivals = data.festivals || [];
  } catch (e) {
    state.festivals = [];
  }
  if (!state.festivals.length) {
    $('festival-groups').textContent = '节日列表加载失败，请刷新页面重试。';
    return;
  }
  renderFestivals();
  const active = pickActiveByDate();
  const preferred =
    (active && state.festivals.find((f) => f.id === active.selectId)) ||
    state.festivals.find((f) => f.id === 'teachers-day') ||
    state.festivals[0];
  selectFestival(preferred.id);
  if (active && active.next) showTodayHint(active);
}

/* 根据当前日期智能挑选应景节日（今日节日 / 7 天内将至的节日） */
function pickActiveByDate() {
  try {
    if (window.FestivalDate && state.festivals.length) {
      return FestivalDate.findActiveFestival(state.festivals, new Date(), 7);
    }
  } catch (e) {
    console.warn('festival date detect failed', e);
  }
  return null;
}

function showTodayHint(active) {
  const hint = $('today-hint');
  if (!hint) return;
  const name = active.next.name;
  if (active.mode === 'today') {
    hint.textContent = '今日「' + name + '」，页面背景已应景切换';
  } else if (active.mode === 'upcoming') {
    hint.textContent = '「' + name + '」' + (active.daysUntil === 1 ? '明天' : '还有 ' + active.daysUntil + ' 天') + '，页面背景已应景切换';
  }
  hint.hidden = false;
}

/* ---------------- 性别选择 ---------------- */

function setupRadioGroup(containerId, onPick) {
  const group = $(containerId);
  group.querySelectorAll('[role="radio"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('[role="radio"]').forEach((b) => b.setAttribute('aria-checked', 'false'));
      btn.setAttribute('aria-checked', 'true');
      onPick(btn.dataset.value);
    });
  });
}
setupRadioGroup('gender', (v) => { state.gender = v; });

document.querySelectorAll('.step-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = $('age');
    const next = (parseInt(input.value, 10) || 35) + parseInt(btn.dataset.step, 10);
    input.value = Math.min(120, Math.max(1, next));
  });
});

/* ---------------- 校验 ---------------- */

function collectProfile() {
  const name = $('name').value.trim();
  const age = parseInt($('age').value, 10);
  const occupation = $('occupation') ? $('occupation').value.trim() : '';
  const giver = $('giver') ? $('giver').value.trim() : '';
  if (!state.festival) return { error: '请选择节日' };
  if (!name) return { error: '请填写受赠人' };
  if (name.length > 24) return { error: '受赠人请控制在 24 个字以内' };
  if (!Number.isInteger(age) || age < 1 || age > 120) return { error: '年龄需在 1-120 岁之间' };
  if (!state.gender) return { error: '请选择性别' };
  if (!giver) return { error: '请填写敬赠人' };
  if (giver.length > 24) return { error: '敬赠人请控制在 24 个字以内' };
  return { profile: { name, age, gender: state.gender, occupation, giver, festival: state.festival.id } };
}

function showError(msg) { const el = $('form-error'); el.textContent = msg; el.hidden = false; }
function hideError() { $('form-error').hidden = true; }

/* ---------------- 生成流程 ---------------- */

const submitBtn = $('submit-btn');
const result = $('result');

async function generate() {
  const collected = collectProfile();
  if (collected.error) { showError(collected.error); return; }
  hideError();

  if (state.busy) return;
  state.busy = true;
  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = '正在生成…';

  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  hideTip();

  state.profile = collected.profile;
  state.blessing = null;
  state.image = null;
  state.cardDataUrl = null;

  const token = ++state.genToken;

  showTextLoading();
  showImageLoading();

  await loadBlessing(collected.profile, token);
  loadImage(collected.profile, token);

  state.busy = false;
  submitBtn.disabled = false;
  submitBtn.querySelector('span').textContent = '重新生成';
  loadStats();
}

async function loadBlessing(profile, token) {
  try {
    const resp = await fetch('/api/blessing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    const data = await resp.json();
    if (token !== state.genToken) return;
    if (!resp.ok) throw new Error(data.error || '生成失败');
    state.blessing = data.blessing;
    renderBlessing(profile, data.blessing);
  } catch (err) {
    if (token !== state.genToken) return;
    $('r-blessing').textContent = err.message || '祝福语生成失败，请重试';
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollImage(jobId, token) {
  const startedAt = Date.now();
  const statusEl = $('image-status');
  const timer = setInterval(() => {
    const sec = Math.round((Date.now() - startedAt) / 1000);
    statusEl.textContent = '正在绘制专属插画… 已用 ' + sec + ' 秒';
  }, 1000);
  try {
    const MAX_WAIT = 4 * 60 * 1000;
    while (Date.now() - startedAt < MAX_WAIT) {
      await sleep(2500);
      if (token !== state.genToken) return null;
      const resp = await fetch('/api/image/' + jobId);
      const data = await resp.json();
      if (token !== state.genToken) return null;
      if (data.status === 'done') return data.image;
      if (data.status === 'error') throw new Error(data.error || '配图生成失败');
    }
    throw new Error('配图生成超时，请稍后重试');
  } finally {
    clearInterval(timer);
  }
}

async function loadImage(profile, token) {
  try {
    const resp = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    const data = await resp.json();
    if (token !== state.genToken) return;
    if (!resp.ok) throw new Error(data.error || '配图生成失败');
    const dataUrl = await pollImage(data.jobId, token);
    if (token !== state.genToken || !dataUrl) return;
    state.image = dataUrl;
    const img = $('r-image');
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });
    if (token !== state.genToken) return;
    $('image-skeleton').hidden = true;
    img.hidden = false;
  } catch (err) {
    if (token !== state.genToken) return;
    $('image-skeleton').hidden = true;
    const sk = document.querySelector('.card-image');
    if (sk && !sk.querySelector('.image-fail')) {
      sk.insertAdjacentHTML('beforeend',
        '<p class="image-fail" style="text-align:center;color:#a32414;font-size:14px;margin-top:10px">' +
        (err.message || '配图生成失败') + '</p>');
    }
  }
}

function showTextLoading() {
  $('result-eyebrow').textContent = (state.festival ? state.festival.name + ' · ' : '') + '正在创作';
  $('result-title').textContent = '正在为你创作…';
  $('r-salutation').textContent = '亲爱的朋友';
  $('r-blessing').textContent = '正在斟酌字句，为你写一段独一无二的祝福…';
  $('r-verse').textContent = '';
  $('r-wish').textContent = '';
  $('r-name-tag').textContent = '—— 敬上';
}

function showImageLoading() {
  $('r-image').hidden = true;
  $('image-skeleton').hidden = false;
  $('image-status').textContent = '正在绘制专属插画，通常需 30–60 秒…';
  const fail = document.querySelector('.image-fail');
  if (fail) fail.remove();
}

function renderBlessing(profile, b) {
  const fname = state.festival ? state.festival.name : '';
  $('result-eyebrow').textContent = fname + ' · 专属祝福已生成';
  $('result-title').textContent = b.title || (fname + '快乐');
  $('r-salutation').textContent = b.salutation || profile.name;
  $('r-blessing').textContent = b.blessing || '';
  $('r-verse').textContent = b.verse || '';
  $('r-wish').textContent = b.wish || '';
  $('r-name-tag').textContent = '敬赠人：' + (profile.giver || '——');
}

/* ---------------- 提示 ---------------- */

let tipTimer = null;
function showTip(msg) {
  const tip = $('result-tip');
  tip.textContent = msg;
  tip.hidden = false;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => { tip.hidden = true; }, 3000);
}
function hideTip() { $('result-tip').hidden = true; }

/* ---------------- 文本与文件名 ---------------- */

function blessingToText() {
  if (!state.blessing || !state.profile) return '';
  const b = state.blessing;
  return [b.salutation, b.blessing, b.verse, b.wish].filter(Boolean).join('\n\n') +
    '\n\n—— 敬赠人：' + (state.profile.giver || '') + '（' + (state.festival ? state.festival.name : '') + '祝福）';
}

function cardFileName(ext) {
  const fname = state.festival ? state.festival.name : '节日';
  const who = state.profile ? state.profile.name : '';
  return fname + '祝福卡-' + who + '.' + ext;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------------- 下载 ---------------- */

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

$('download-img-btn').addEventListener('click', () => {
  if (!state.image) { showTip('插画还在绘制中，请稍候'); return; }
  const who = state.profile ? state.profile.name : '';
  const fname = state.festival ? state.festival.name : '节日';
  downloadDataUrl(state.image, fname + '插画-' + who + '.png');
});

$('copy-btn').addEventListener('click', async () => {
  const text = blessingToText();
  if (!text) { showTip('祝福语还在生成中，请稍候'); return; }
  showTip((await copyText(text)) ? '祝福语已复制到剪贴板' : '复制失败，请手动选择文字复制');
});

/* ---------------- 图文卡片合成 ---------------- */

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (ch === '\n') { lines.push(line); line = ''; continue; }
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* 短诗按换行拆成行（每行一句），卡片逐行排版 */
function splitVerseLines(verse) {
  if (!verse) return [];
  return String(verse).split(/\n+/).map((s) => s.trim()).filter(Boolean);
}

async function composeCard() {
  const img = new Image();
  img.src = state.image;
  await img.decode();

  const theme = (state.festival && state.festival.theme) || {};
  const W = 1080;
  const IMG_H = 1080;
  const PAD = 72;

  const b = state.blessing || {};
  const name = state.profile ? state.profile.name : '';
  const giver = state.profile ? state.profile.giver : '';
  // 称呼：顶格并加冒号（去掉模型可能带回的尾部标点，避免重复）
  const salutation = String(b.salutation || name || '').replace(/[：:，,。.、！!？?\s]+$/g, '') + '：';
  const serif = '"Noto Serif SC", "Songti SC", "SimSun", serif';
  const hand = '"Ma Shan Zheng", "KaiTi", ' + serif;

  // 先测量文本行数，动态计算面板高度，保证短诗与落款永不重叠
  const canvas = $('compose-canvas');
  canvas.width = W;
  canvas.height = 2000;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';
  ctx.font = '400 30px ' + serif;
  // 正文首行缩进 2 个字符（全角空格），整体左对齐排版
  const bodyLines = wrapText(ctx, '　　' + (b.blessing || ''), W - PAD * 2).slice(0, 5);
  ctx.font = '400 34px ' + hand;
  const verseLines = [];
  for (const seg of splitVerseLines(b.verse)) {
    for (const wl of wrapText(ctx, seg, W - PAD * 2)) {
      verseLines.push(wl);
      if (verseLines.length >= 4) break;
    }
    if (verseLines.length >= 4) break;
  }

  const TITLE_Y = IMG_H + 74;
  const SAL_Y = TITLE_Y + 62;
  const BODY_START = SAL_Y + 54;
  const bodyEnd = BODY_START + Math.max(bodyLines.length - 1, 0) * 46;
  const verseEnd = bodyEnd + 56 + Math.max(verseLines.length - 1, 0) * 44;
  const wishY = verseEnd + 60;
  const sigY = wishY + 44;
  const PANEL_H = Math.max(470, sigY - IMG_H + 58);
  const H = IMG_H + PANEL_H;
  canvas.height = H;

  ctx.drawImage(img, 0, 0, W, IMG_H);
  ctx.fillStyle = '#fffdf9';
  ctx.fillRect(0, IMG_H, W, PANEL_H);
  ctx.fillStyle = theme.primary || '#d9482b';
  ctx.fillRect(0, IMG_H, W, 8);

  ctx.textAlign = 'center';
  ctx.fillStyle = theme.deep || '#b23018';
  ctx.font = '700 40px ' + serif;
  ctx.fillText(b.title || '节日快乐', W / 2, TITLE_Y);

  // 称呼：顶格 + 冒号
  ctx.textAlign = 'left';
  ctx.fillStyle = theme.ink || '#3b2416';
  ctx.font = '700 30px ' + serif;
  ctx.fillText(salutation, PAD, SAL_Y);

  // 正文：左对齐，首行已带 2 个字符缩进
  ctx.font = '400 30px ' + serif;
  let y = BODY_START;
  for (const line of bodyLines) { ctx.fillText(line, PAD, y); y += 46; }

  ctx.textAlign = 'center';
  if (verseLines.length) {
    y = bodyEnd + 56;
    ctx.fillStyle = theme.gold || '#c8912a';
    ctx.font = '400 34px ' + hand;
    for (const line of verseLines) { ctx.fillText(line, W / 2, y); y += 44; }
  }

  const useComputed = sigY - IMG_H + 58 > 470;
  ctx.fillStyle = theme.deep || '#6f5140';
  ctx.font = '700 28px ' + serif;
  ctx.fillText(b.wish || '', W / 2, useComputed ? wishY : H - 100);
  ctx.font = '400 26px ' + serif;
  ctx.fillText('敬赠人：' + (giver || name), W / 2, useComputed ? sigY : H - 58);

  drawCardQR(ctx, W, IMG_H, theme);

  return canvas.toDataURL('image/png');
}

/* 在卡片插画区右下角绘制网站二维码：白底卡片紧贴图片右下角，无间隙 */
function drawCardQR(ctx, W, IMG_H, theme) {
  if (typeof qrcode !== 'function' || !location.origin) return;
  const QR = 150, PADQ = 20, CAP = 38;
  const boxW = QR + PADQ * 2;
  const boxH = CAP + QR + PADQ;
  const bx = W - boxW;
  const by = IMG_H - boxH;
  try {
    const qr = qrcode(0, 'M');
    qr.addData(location.origin);
    qr.make();
    const n = qr.getModuleCount();
    const cell = QR / n;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bx, IMG_H);
    ctx.lineTo(bx, by + 22);
    ctx.arcTo(bx, by, bx + 22, by, 22);
    ctx.lineTo(W, by);
    ctx.lineTo(W, IMG_H);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.stroke();

    ctx.fillStyle = theme.ink || '#3b2416';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(bx + PADQ + c * cell, by + CAP + r * cell, cell + 0.5, cell + 0.5);
        }
      }
    }
    ctx.fillStyle = '#8a6d4f';
    ctx.font = '400 20px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('扫码打开', bx + boxW / 2, by + 27);
    ctx.restore();
  } catch (err) { /* 二维码失败时静默跳过 */ }
}

async function ensureCard() {
  if (!state.cardDataUrl) state.cardDataUrl = await composeCard();
  return state.cardDataUrl;
}

$('download-card-btn').addEventListener('click', async () => {
  if (!state.image || !state.blessing) { showTip('内容还在生成中，请稍候'); return; }
  const btn = $('download-card-btn');
  btn.disabled = true;
  try {
    downloadDataUrl(await ensureCard(), cardFileName('png'));
    showTip('图文祝福卡已下载');
  } catch (e) {
    showTip('卡片生成失败，请重试');
  } finally {
    btn.disabled = false;
  }
});

/* ---------------- 分享 ---------------- */

$('share-btn').addEventListener('click', async () => {
  if (!state.image || !state.blessing) { showTip('内容还在生成中，请稍候'); return; }
  const btn = $('share-btn');
  btn.disabled = true;
  try {
    const dataUrl = await ensureCard();
    const text = blessingToText();
    const title = (state.blessing.title || '节日祝福');
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], cardFileName('png'), { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title, text });
      showTip('已唤起系统分享');
      return;
    }
    if (navigator.share) {
      await navigator.share({ title, text });
      showTip('已唤起系统分享');
      return;
    }
    await copyText(text);
    downloadDataUrl(dataUrl, cardFileName('png'));
    showTip('已复制祝福语并下载卡片，可粘贴分享');
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    showTip('分享未成功，可先下载卡片再分享');
  } finally {
    btn.disabled = false;
  }
});

/* ---------------- 使用统计 ---------------- */

async function loadStats() {
  try {
    const resp = await fetch('/api/stats', { cache: 'no-store' });
    if (!resp.ok) return;
    const d = await resp.json();
    $('stat-gens').textContent = d.totalGenerations;
    $('stat-users').textContent = d.users;
    $('site-stats').hidden = false;
  } catch (err) { /* 统计不可用时静默 */ }
}

/* ---------------- 版本记录弹窗 ---------------- */

(function initVersionModal() {
  const modal = $('version-modal');
  const link = $('version-link');
  const closeBtn = $('version-close');
  if (!modal || !link || !closeBtn) return;
  let lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function close() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  link.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });
})();

/* ---------------- 事件绑定 ---------------- */

$('form').addEventListener('submit', (e) => { e.preventDefault(); generate(); });
$('regen-btn').addEventListener('click', () => { generate(); });
$('name').addEventListener('input', hideError);

loadFestivals();
loadStats();
setInterval(loadStats, 30000);
