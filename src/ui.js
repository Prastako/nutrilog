/* ============================================================
   Shared UI: sheets, confirmations, slot chips, nutrient tables.
   ============================================================ */

const sheetCleanups = [];

function openSheet(titleHtml, bodyHtml, footHtml, opts){
  runSheetCleanups();
  const root = $('#sheetRoot');
  root.innerHTML =
    '<div class="sheetbg" role="dialog" aria-modal="true">' +
      '<div class="sheet'+(opts && opts.tall ? ' tall' : '')+(opts && opts.full ? ' full' : '')+'">' +
        '<div class="sheethead"><h2>'+titleHtml+'</h2>' +
        '<button class="iconbtn" type="button" data-sheet-close="1" aria-label="'+esc(t('close'))+'">'+icon('close')+'</button></div>' +
        '<div class="sheetbody">' + bodyHtml + '</div>' +
        (footHtml ? '<div class="btnrow sheetfoot">'+footHtml+'</div>' : '') +
      '</div>' +
    '</div>';
  root.querySelector('.sheetbg').addEventListener('click', e => {
    if (e.target.classList.contains('sheetbg')) closeSheet();
  });
  root.querySelectorAll('[data-sheet-close]').forEach(b => b.addEventListener('click', closeSheet));
  if (!S.sheetOpen){ try { history.pushState({screen: S.screen, sheet: true}, '', location.hash); } catch(e){} }
  S.sheetOpen = true;
  return root.querySelector('.sheet');
}
function runSheetCleanups(){
  while (sheetCleanups.length){ try { sheetCleanups.pop()(); } catch(e){} }
}
/* Closing a sheet steps back over the history entry the sheet added, so
   the Android back gesture closes sheets first. The screen underneath is
   redrawn afterwards to show whatever the sheet changed. */
function sheetCloseMs(){
  if (document.body.classList.contains('quickmode')) return 0;
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--t-base'));
  return isFinite(v) ? v : 260;
}
function closeSheet(fromPop){
  const bg = $('#sheetRoot').querySelector('.sheetbg');
  if (bg && bg.classList.contains('closing')) return;
  runSheetCleanups();
  const wasOpen = S.sheetOpen;
  S.sheetOpen = false;
  if (wasOpen && !fromPop){
    try { if (history.state && history.state.sheet){ S.swallowPop = true; history.back(); } } catch(e){}
  }
  const f = S.afterSheet; S.afterSheet = null;
  const finish = () => {
    if (bg && bg.parentNode) bg.remove();
    else if (!bg) $('#sheetRoot').innerHTML = '';
    if (f) f();
    else if (fromPop || !S.swallowPop) refreshScreenSoon();
  };
  const ms = sheetCloseMs();
  if (!bg || ms <= 0) finish();
  else { bg.classList.add('closing'); setTimeout(finish, ms); }
}
function refreshScreenSoon(){
  clearTimeout(refreshScreenSoon._t);
  refreshScreenSoon._t = setTimeout(() => { if (S.sheetOpen) return; if ($('#sheetRoot').querySelector('.sheetbg.closing')) { refreshScreenSoon(); return; } renderScreen(S.screen); }, 30);
}

function confirmSheet(title, bodyHtml, confirmLabel, danger){
  return new Promise(resolve => {
    let done = false;
    const sheet = openSheet(esc(title), bodyHtml,
      '<button class="btn quiet" type="button" data-c="0">'+esc(t('cancel'))+'</button>' +
      '<button class="btn '+(danger?'danger':'')+'" type="button" data-c="1">'+esc(confirmLabel)+'</button>');
    sheetCleanups.push(() => { if (!done){ done = true; resolve(false); } });
    sheet.querySelector('[data-c="0"]').addEventListener('click', () => { done = true; closeSheet(); resolve(false); });
    sheet.querySelector('[data-c="1"]').addEventListener('click', () => { done = true; closeSheet(); resolve(true); });
  });
}

function guessSlot(d){
  const x = d || new Date();
  const m = x.getHours()*60 + x.getMinutes();
  if (m < 10*60+30) return 'breakfast';
  if (m < 14*60+30) return 'lunch';
  if (m < 17*60+30) return 'snack';
  return 'dinner';
}

function slotChips(sel){
  return '<div class="chips" data-slotchips="1">' + SLOTS.map(s =>
    '<button class="chip" type="button" data-slot="'+s+'" aria-pressed="'+(s===sel)+'">'+esc(t('slot_'+s))+'</button>').join('') + '</div>';
}
function bindSlotChips(root, cb){
  const box = root.querySelector('[data-slotchips]');
  if (!box) return;
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-slot]');
    if (!b) return;
    $$('[data-slot]', box).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    cb(b.getAttribute('data-slot'));
  });
}

function macroLine(n){
  if (!n) return '';
  return t('mac_p') + ' ' + fmtNum(n.prot) + ' · ' + t('mac_f') + ' ' + fmtNum(n.fat) + ' · ' + t('mac_c') + ' ' + fmtNum(n.carb) + ' g';
}

/* A compact table of all known nutrients, grouped. */
function nutrientTable(n, opts){
  n = n || {};
  opts = opts || {};
  const row = x => {
    let v = n[x.k], unit = x.unit;
    if ((x.k === 'epa' || x.k === 'dha' || x.k === 'ala') && v < 1){ v = v * 1000; unit = 'mg'; }
    return '<div class="kv"><span class="k">'+esc(L(x))+'</span><span class="v num">'+esc(fmtAmt(v))+' '+esc(unit)+'</span></div>';
  };
  const known = NUTRIENTS.filter(x => x.grp !== 'hidden' && n[x.k] != null && isFinite(n[x.k]));
  if (!known.length) return '<div class="ntable"><p class="tiny">'+esc(t('nt_none'))+'</p></div>';
  const main = ['kcal','prot','fat','carb','fib','sug','sfa','na'];
  let h = '<div class="ntable">' + known.filter(x => main.indexOf(x.k) >= 0).map(row).join('');
  const rest = known.filter(x => main.indexOf(x.k) < 0);
  if (rest.length) h += (opts.compact ? '<details><summary class="linkbtn">'+esc(t('nt_more', {n: rest.length}))+'</summary>' : '') +
    rest.map(row).join('') + (opts.compact ? '</details>' : '');
  return h + '</div>';
}

function fitBadge(score){
  const s = Math.round(Number(score) || 0);
  const cls = s >= 4 ? 'ok' : s === 3 ? 'wait' : 'err';
  return '<span class="fit '+cls+'">'+s+'/5</span>';
}

const METER_LAST = {};
let meterSeq = 0;
let meterObs = null;

function growMeters(root){
  for (const el of (root || document).querySelectorAll('.rfill[data-w], .rend[data-w]')){
    void el.offsetWidth;
    const w = el.getAttribute('data-w') + '%';
    if (el.classList.contains('rend')) el.style.left = w;
    else el.style.width = w;
    el.removeAttribute('data-w');
  }
}

function ensureMeterObserver(){
  if (meterObs || typeof MutationObserver === 'undefined' || !document.body) return;
  meterObs = new MutationObserver(() => growMeters(document));
  meterObs.observe(document.body, {childList: true, subtree: true});
}

/* Horizontal bar with a target range drawn in. */
function rangeBar(value, low, high, kind){
  ensureMeterObserver();
  const max = Math.max(high || low || 1, value || 0) * 1.15 || 1;
  const pct = v => clamp((v / max) * 100, 0, 100);
  let cls = 'ok';
  /* progress through a day: neutral until it passes the top of the range */
  if (kind === 'progress'){ cls = high != null && value > high*1.1 ? 'bad' : high != null && value > high ? 'warn' : 'ok'; }
  else if (kind === 'max'){ cls = value > (low||0) ? 'bad' : value > (low||0)*0.9 ? 'warn' : 'ok'; }
  else if (low != null){ cls = value < low*0.5 ? 'bad' : value < low ? 'warn' : (high != null && value > high*1.1 ? 'warn' : 'ok'); }
  const key = S.screen + ':' + (meterSeq++);
  const target = pct(value||0);
  const from = (key in METER_LAST) ? METER_LAST[key] : 0;
  METER_LAST[key] = target;
  return '<div class="rbar"><div class="rzone" style="left:'+pct(low||0)+'%;width:'+Math.max(1, pct(high||low||0) - pct(low||0))+'%"></div>' +
    '<div class="rfill '+cls+'" style="width:'+from+'%" data-w="'+target+'"></div><span class="rend" style="left:'+from+'%" data-w="'+target+'"></span></div>';
}

/* brief nutrilog-260930-select-comet-only: after a choice only the option just chosen draws its comet. Options chosen
   before get cm-keep (no redraw, also when the screen is drawn again); an option that was chosen and is not any more
   gets cm-out (its thread runs back). The check runs right after the DOM changes (MutationObserver) and after the tap. */
const COMET_SEL = '.chip[aria-pressed], .seg button, label.opt, .looktile';
const COMET = { at: 0, before: null };
function cometOn(el){
  if (el.matches('label.opt')){ const i = el.querySelector('input'); return !!(i && i.checked); }
  if (el.matches('.seg button')) return el.classList.contains('on');
  return el.getAttribute('aria-pressed') === 'true';
}
function cometKey(el){
  if (el.matches('label.opt')){ const i = el.querySelector('input'); return 'o|' + (i ? i.name + '|' + i.value : el.textContent); }
  const at = ['data-act', 'data-id', 'data-v', 'data-mode', 'data-k', 'id'].map(a => el.getAttribute(a) || '');
  return 'b|' + at.join('|') + '|' + (at.join('') ? '' : String(el.textContent || '').trim());
}
function cometPick(target){
  const before = new Set();
  document.querySelectorAll(COMET_SEL).forEach(el => { if (cometOn(el)) before.add(cometKey(el)); });
  /* a click straight on a checkbox or radio arrives after the browser switched it: count its old state */
  if (target && target.matches && target.matches('input[type=checkbox], input[type=radio]')){
    const lab = target.closest('label.opt');
    if (lab){ const k = cometKey(lab); if (target.type === 'radio' || target.checked) before.delete(k); else before.add(k); }
  }
  COMET.before = before; COMET.at = Date.now();
  setTimeout(cometSettle, 0); setTimeout(cometSettle, 150); setTimeout(cometSettle, 600);
}
function cometSettle(){
  if (!COMET.before || Date.now() - COMET.at > 1500) return;
  document.querySelectorAll(COMET_SEL).forEach(el => {
    const k = cometKey(el), was = COMET.before.has(k), on = cometOn(el);
    if (on && was) el.classList.add('cm-keep');
    else if (on){ el.classList.remove('cm-keep'); el.classList.remove('cm-out'); }
    else if (was) el.classList.add('cm-out');
  });
}
if (typeof document !== 'undefined' && document.addEventListener){
  document.addEventListener('click', e => {
    const t = e.target;
    if (!t || !t.closest || !t.closest(COMET_SEL)) return;
    /* the click a label passes on to its input is part of the same tap */
    if (t.tagName === 'INPUT' && Date.now() - COMET.at < 80) return;
    cometPick(t);
  }, true);
  if (typeof MutationObserver === 'function' && document.body)
    new MutationObserver(() => cometSettle()).observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed']});
}
