/* Cooking timers (brief cook-timers): stored on the device in S.meta.timers, always counted from endsAt. */
const TIMERS = { iv: null, open: false };

function stepTimerSec(step) {
  if (step && Number(step.timerSec) > 0) return Math.round(Number(step.timerSec));
  if (step && Number(step.minutes) > 0) return Math.round(Number(step.minutes) * 60);
  return 0;
}

function fmtTimer(sec) {
  var s = Math.max(0, Math.round(sec));
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var x = s % 60;
  function p(n) { return (n < 10 ? '0' : '') + n; }
  if (h > 0) return h + ':' + p(m) + ':' + p(x);
  return m + ':' + p(x);
}

function timersAll() {
  if (Array.isArray(S.meta.timers)) return S.meta.timers;
  return [];
}

function timerLeft(tm, now) {
  if (now === undefined || now === null) now = Date.now();
  return Math.max(0, Math.ceil((Date.parse(tm.endsAt) - now) / 1000));
}

function timerFor(recipeId, stepIndex) {
  var list = timersAll();
  for (var i = 0; i < list.length; i++) {
    if (list[i].recipeId === recipeId && list[i].stepIndex === stepIndex) return list[i];
  }
  return null;
}

function timersSoonest() {
  var list = timersAll();
  var copy = list.slice();
  copy.sort(function(a, b) { return Date.parse(a.endsAt) - Date.parse(b.endsAt); });
  return copy;
}

async function timerStart(recipeId, stepIndex, sec, label) {
  var existing = timerFor(recipeId, stepIndex);
  if (existing) return existing;
  var tm = {
    id: 'tm' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    recipeId: recipeId,
    stepIndex: stepIndex,
    endsAt: new Date(Date.now() + sec * 1000).toISOString(),
    label: String(label || '').slice(0, 40)
  };
  S.meta.timers = timersAll().concat([tm]);
  await saveMeta();
  if (typeof timersTick === 'function') timersTick();
  return tm;
}

async function timerCancel(id) {
  S.meta.timers = timersAll().filter(function(x) { return x.id !== id; });
  await saveMeta();
  if (typeof timersTick === 'function') timersTick();
}

function stepTimerHtml(recipeId, i, step) {
  var sec = stepTimerSec(step);
  if (sec === 0) return '';
  var tm = timerFor(recipeId, i);
  if (!tm) {
    return ' <button class="btn quiet sm steptimer" type="button" data-act="timer-start" data-step="' + i + '" data-sec="' + sec + '" data-label="' + esc(String(step.text || '').slice(0, 40)) + '">' + esc(t('tm_start', {m: Math.max(1, Math.round(sec / 60))})) + '</button>';
  }
  var left = timerLeft(tm);
  return ' <span class="steptimer run' + (left === 0 ? ' ended' : '') + '" data-timer-id="' + tm.id + '"><button class="tm-count" type="button" data-act="timer-dismiss" data-id="' + tm.id + '"><span class="num">' + fmtTimer(left) + '</span></button><button class="iconbtn sm" type="button" data-act="timer-cancel" data-id="' + tm.id + '" aria-label="' + esc(t('tm_cancel')) + '">' + icon('close') + '</button></span>';
}

function timersTick() {
  var now = Date.now();
  var list = timersAll();
  var changed = false;
  for (var i = 0; i < list.length; i++) {
    var tm = list[i];
    if (!tm.rang && timerLeft(tm, now) === 0) {
      tm.rang = true;
      changed = true;
      timerAlarm(tm);
    }
  }
  if (changed) saveMeta();
  var els = document.querySelectorAll('[data-timer-id]');
  for (var j = 0; j < els.length; j++) {
    var el = els[j];
    var id = el.getAttribute('data-timer-id');
    var match = null;
    for (var k = 0; k < list.length; k++) {
      if (list[k].id === id) { match = list[k]; break; }
    }
    var n = el.querySelector('.num');
    if (match && n) {
      n.textContent = fmtTimer(timerLeft(match, now));
      el.classList.toggle('ended', timerLeft(match, now) === 0);
    }
  }
  renderTimerPill();
  if (list.length > 0 && !TIMERS.iv) {
    TIMERS.iv = setInterval(timersTick, 1000);
  }
  if (list.length === 0 && TIMERS.iv) {
    clearInterval(TIMERS.iv);
    TIMERS.iv = null;
  }
}

function timerStepVisible(tm) {
  if (!((S.screen === 'recipe' && S.recipeId === tm.recipeId) || (S.screen === 'cook' && COOK.recipeId === tm.recipeId))) return false;
  var el = document.querySelector('[data-timer-id="' + tm.id + '"]');
  if (!el || !el.getBoundingClientRect) return false;
  var r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

function renderTimerPill() {
  var el = $('#timerPill');
  if (!el) return;
  var now = Date.now();
  var list = timersSoonest();
  var hide = list.length === 0 || S.screen === 'quick' || timerStepVisible(list[0]);
  el.classList.toggle('hide', hide);
  if (hide) {
    TIMERS.open = false;
    el.innerHTML = '';
    return;
  }
  var first = list[0];
  var left = timerLeft(first, now);
  el.classList.toggle('ended', left === 0);
  if (!TIMERS.open) {
    el.innerHTML = '<button type="button" class="tp-main" data-tp="main"' + (left === 0 ? ' aria-label="' + esc(t('tm_done')) + '"' : '') + '>' + icon('timer') + '<span class="num">' + fmtTimer(left) + '</span>' + (list.length > 1 ? '<span class="tp-more">+' + (list.length - 1) + '</span>' : '') + '</button>';
  } else {
    var rows = '';
    for (var i = 0; i < list.length; i++) {
      var tm = list[i];
      var tLeft = timerLeft(tm, now);
      var ended = tLeft === 0;
      var title = (RECIPES.byId[tm.recipeId] || {}).title || '';
      rows += '<div class="tp-row' + (ended ? ' ended' : '') + '"><button type="button" class="tp-open" data-tp="open" data-id="' + tm.id + '"><span class="tp-title">' + esc(title) + '</span><span class="tiny">' + esc(t('tm_step', {n: tm.stepIndex + 1})) + ' · ' + esc(tm.label || '') + '</span></button><span class="num">' + fmtTimer(tLeft) + '</span><button type="button" class="iconbtn sm" data-tp="cancel" data-id="' + tm.id + '" aria-label="' + esc(t('tm_cancel')) + '">' + icon('close') + '</button></div>';
    }
    el.innerHTML = '<div class="tp-list">' + rows + '</div>';
  }
}

function timerAlarm() {
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]); } catch(e) {}
  try {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    var ac = new C();
    [0, 0.3, 0.6].forEach(function(t0) {
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.frequency.value = 880;
      g.gain.value = 0.2;
      o.connect(g);
      g.connect(ac.destination);
      o.start(ac.currentTime + t0);
      o.stop(ac.currentTime + t0 + 0.15);
    });
  } catch(e) {}
}

async function timerPillClick(e) {
  var b = e.target.closest('[data-tp]');
  if (!b) return;
  var k = b.getAttribute('data-tp');
  var id = b.getAttribute('data-id');
  if (k === 'main') {
    var first = timersSoonest()[0];
    if (first && timerLeft(first) === 0) {
      await timerCancel(first.id);
    } else {
      TIMERS.open = true;
      renderTimerPill();
    }
  } else if (k === 'cancel') {
    await timerCancel(id);
  } else if (k === 'open') {
    var tm = null;
    var all = timersAll();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) { tm = all[i]; break; }
    }
    TIMERS.open = false;
    if (tm) {
      S.recipeId = tm.recipeId;
      S.recipeServings = null;
      S.recipeAxis = null;
      S.scrollToStep = tm.stepIndex;
      go('recipe');
    }
  }
}

function timersInit() {
  var all = timersAll();
  for (var i = 0; i < all.length; i++) {
    if (timerLeft(all[i]) === 0) all[i].rang = true;
  }
  var el = $('#timerPill');
  if (el) el.addEventListener('click', function(e) { e.stopPropagation(); timerPillClick(e); });
  document.addEventListener('click', function(e) {
    if (TIMERS.open && !(e.target.closest && e.target.closest('#timerPill'))) {
      TIMERS.open = false;
      renderTimerPill();
    }
  });
  timersTick();
}
