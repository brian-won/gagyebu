/*
 * 가계부 도움말 뷰어 (화면 캡처 + 번호 설명서). index.html 의 openHelpManual() 이 지연 로드한다.
 *   window.GBHelpViewer.open({ data: window.GB_HELP_DATA, base: 'help/' })
 *
 * - 전체 화면 요소 #help-overlay.help-overlay(.active 일 때 보임). 클래스에 'overlay' 가 들어 있어
 *   안드로이드 뒤로가기(index.html closeTopOverlayIfAny)가 .active 를 떼어 닫는다.
 * - 상단: 화면별 글자 박스 탭(가로 슬라이드). 가운데: 캡처 이미지 + 번호 동그라미(이미지 폭·높이 대비 % 로
 *   absolute 배치 → 화면 폭이 달라도 위치 유지). 아래: 번호별 설명. 번호 ↔ 설명 서로 강조.
 * - 이모지 없이 앱 톤(GB·01: 배경 #F5F6FA, 포인트 #3D6BFF, 둥근 모서리)을 따른다.
 */
(function () {
  'use strict';
  var STYLE_ID = 'help-viewer-style';
  var CSS = [
    '.help-overlay{position:fixed;inset:0;z-index:70;display:none;flex-direction:column;background:var(--page,#F5F6FA);color:var(--text-primary,#1B1D29);font-family:inherit}',
    '.help-overlay.active{display:flex}',
    '.help-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 16px 8px;background:var(--card,#fff);border-bottom:1px solid var(--border,#E6E8F0)}',
    '.help-head h2{margin:0;font-size:17px;font-weight:700}',
    '.help-close{border:1px solid var(--border,#E6E8F0);background:var(--card,#fff);color:var(--text-primary,#1B1D29);border-radius:10px;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer}',
    '.help-tabs{display:flex;gap:6px;overflow-x:auto;padding:8px 16px 10px;background:var(--card,#fff);border-bottom:1px solid var(--border,#E6E8F0);scrollbar-width:none;-webkit-overflow-scrolling:touch}',
    '.help-tabs::-webkit-scrollbar{display:none}',
    '.help-tab{flex:0 0 auto;min-width:72px;padding:7px 12px;border-radius:999px;border:1px solid var(--border,#E6E8F0);background:var(--card,#fff);color:var(--text-secondary,#4A4E5E);font-size:13px;font-weight:600;white-space:nowrap;cursor:pointer;text-align:center}',
    '.help-tab.active{background:var(--series-1,#3D6BFF);border-color:var(--series-1,#3D6BFF);color:#fff}',
    '.help-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 16px 32px}',
    '.help-title{margin:2px 0 2px;font-size:16px;font-weight:700}',
    '.help-desc{margin:0 0 10px;font-size:13px;color:var(--text-secondary,#4A4E5E);line-height:1.5}',
    '.help-shot{position:relative;width:100%;max-width:420px;margin:0 auto 14px;border-radius:14px;overflow:hidden;border:1px solid var(--border,#E6E8F0);background:var(--card,#fff);box-shadow:0 2px 10px rgba(20,30,60,.08)}',
    '.help-shot img{display:block;width:100%;height:auto}',
    '.help-pin{position:absolute;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:var(--series-1,#3D6BFF);color:#fff;border:2px solid #fff;font-size:11px;font-weight:700;line-height:18px;text-align:center;padding:0;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.35)}',
    '.help-pin.on{background:#FF5B5B;transform:translate(-50%,-50%) scale(1.25);z-index:2}',
    '.help-list{list-style:none;margin:0 auto;padding:0;max-width:420px}',
    '.help-item{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;margin-bottom:8px;border-radius:12px;background:var(--card,#fff);border:1px solid var(--border,#E6E8F0);cursor:pointer}',
    '.help-item.on{border-color:var(--series-1,#3D6BFF);box-shadow:0 0 0 2px rgba(61,107,255,.18)}',
    '.help-num{flex:0 0 22px;width:22px;height:22px;border-radius:50%;background:var(--series-1,#3D6BFF);color:#fff;font-size:11px;font-weight:700;line-height:22px;text-align:center}',
    '.help-item b{display:block;font-size:14px;margin-bottom:2px}',
    '.help-item span.t{display:block;font-size:13px;line-height:1.55;color:var(--text-secondary,#4A4E5E)}',
    '.help-msg{padding:24px 8px;text-align:center;color:var(--text-secondary,#4A4E5E);font-size:14px}'
  ].join('\n');

  var state = { data: null, base: '', idx: 0, el: null };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID; st.textContent = CSS;
    document.head.appendChild(st);
  }
  function ensureEl() {
    var el = document.getElementById('help-overlay');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'help-overlay';
    el.className = 'help-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '도움말');
    el.innerHTML =
      '<div class="help-head"><h2>도움말</h2><button type="button" class="help-close" id="help-close">닫기</button></div>' +
      '<div class="help-tabs" id="help-tabs" role="tablist"></div>' +
      '<div class="help-body" id="help-body"></div>';
    document.body.appendChild(el);
    el.querySelector('#help-close').onclick = close;
    el.querySelector('#help-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('.help-tab');
      if (b) show(Number(b.dataset.i));
    });
    el.querySelector('#help-body').addEventListener('click', function (e) {
      var pin = e.target.closest('.help-pin');
      if (pin) { highlight(pin.dataset.n, 'list'); return; }
      var item = e.target.closest('.help-item');
      if (item) highlight(item.dataset.n, 'pin');
    });
    return el;
  }
  function screens() { return (state.data && state.data.screens) || []; }

  function renderTabs() {
    var tabs = state.el.querySelector('#help-tabs');
    tabs.innerHTML = screens().map(function (s, i) {
      return '<button type="button" role="tab" class="help-tab' + (i === state.idx ? ' active' : '') + '" data-i="' + i + '">' + esc(s.tab || s.title) + '</button>';
    }).join('');
  }

  function show(i) {
    var list = screens();
    if (!list.length) { state.el.querySelector('#help-body').innerHTML = '<p class="help-msg">도움말을 불러오지 못했어요.</p>'; return; }
    state.idx = Math.max(0, Math.min(i || 0, list.length - 1));
    var s = list[state.idx];
    renderTabs();
    var activeTab = state.el.querySelector('.help-tab.active');
    if (activeTab && activeTab.scrollIntoView) { try { activeTab.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { /* 무시 */ } }
    var pts = s.points || [];
    var body = state.el.querySelector('#help-body');
    body.innerHTML =
      '<p class="help-title">' + esc(s.title) + '</p>' +
      (s.desc ? '<p class="help-desc">' + esc(s.desc) + '</p>' : '') +
      '<div class="help-shot"><img alt="' + esc(s.title) + ' 화면" src="' + esc(state.base + s.image) + '">' +
      pts.map(function (p) {
        return '<button type="button" class="help-pin" data-n="' + esc(p.n) + '" style="left:' + Number(p.x) + '%;top:' + Number(p.y) + '%" aria-label="' + esc(p.n + '번 ' + p.title) + '">' + esc(p.n) + '</button>';
      }).join('') + '</div>' +
      '<ol class="help-list">' + pts.map(function (p) {
        return '<li class="help-item" data-n="' + esc(p.n) + '"><span class="help-num">' + esc(p.n) + '</span><div><b>' + esc(p.title) + '</b><span class="t">' + esc(p.text) + '</span></div></li>';
      }).join('') + '</ol>';
    body.scrollTop = 0;
    var img = body.querySelector('.help-shot img');
    img.onerror = function () {
      var shot = body.querySelector('.help-shot');
      if (shot) shot.outerHTML = '<p class="help-msg">화면 이미지를 불러오지 못했어요.</p>';
    };
  }

  function highlight(n, scrollTo) {
    var body = state.el.querySelector('#help-body');
    var pins = body.querySelectorAll('.help-pin'), items = body.querySelectorAll('.help-item');
    var pin = null, item = null, i;
    for (i = 0; i < pins.length; i++) { var on = pins[i].dataset.n === String(n); pins[i].classList.toggle('on', on); if (on) pin = pins[i]; }
    for (i = 0; i < items.length; i++) { var on2 = items[i].dataset.n === String(n); items[i].classList.toggle('on', on2); if (on2) item = items[i]; }
    var target = scrollTo === 'list' ? item : pin;
    if (target && target.scrollIntoView) { try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { target.scrollIntoView(); } }
  }

  function onKey(e) { if (e.key === 'Escape' && isOpen()) close(); }
  function isOpen() { return !!(state.el && state.el.classList.contains('active')); }

  function open(opts) {
    opts = opts || {};
    state.data = opts.data || window.GB_HELP_DATA || null;
    state.base = opts.base == null ? 'help/' : opts.base;
    ensureStyle();
    state.el = ensureEl();
    state.el.classList.add('active');
    show(typeof opts.index === 'number' ? opts.index : state.idx);
    document.addEventListener('keydown', onKey);
  }
  function close() {
    if (state.el) state.el.classList.remove('active');
    document.removeEventListener('keydown', onKey);
  }

  window.GBHelpViewer = { open: open, close: close, isOpen: isOpen, show: function (i) { if (isOpen()) show(i); } };
})();
