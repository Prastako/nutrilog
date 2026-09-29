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
