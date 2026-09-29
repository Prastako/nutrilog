/* Cook mode (brief cook-mode): one step at a time, the screen kept awake, the step read aloud. */
const COOK = { recipeId: null, step: 0, dir: 0, lock: null, speaking: false, bound: false };

function cookOpen(recipeId) {
  COOK.recipeId = recipeId;
  COOK.step = 0;
  COOK.dir = 0;
  go('cook');
}

function cookData() {
  var r = RECIPES.byId[COOK.recipeId];
  if (!r) return null;
  return { r: r, v: recipeView(r, { axis: S.recipeAxis || undefined, servings: S.recipeServings || undefined }) };
}

function cookStepIngredients(r, v, i) {
  var step = v.steps[i];
  var keys;
  if (Array.isArray(step.uses) && step.uses.length > 0) {
    keys = step.uses;
  } else {
    var stepText = r.steps[i] && r.steps[i].text;
    keys = [];
    if (stepText) {
      var re = /\{([A-Za-z0-9_-]+)\}/g;
      var m;
      while ((m = re.exec(stepText)) !== null) {
        keys.push(m[1]);
      }
    }
  }
  var result = [];
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    for (var j = 0; j < v.ingredients.length; j++) {
      if (v.ingredients[j].slot === key) {
        result.push(v.ingredients[j]);
        break;
      }
    }
  }
  return result;
}

function cookCanSpeak() {
  return !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
}

function renderCook() {
  var host = $('#s-cook');
  var d = cookData();
  if (!d) { host.innerHTML = ''; return; }
  var r = d.r, v = d.v, n = v.steps.length;
  COOK.step = Math.max(0, Math.min(COOK.step, n - 1));
  var i = COOK.step;
  var step = v.steps[i];
  var ings = cookStepIngredients(r, v, i);
  var h = '<div class="cook-step' + (COOK.dir > 0 ? ' cook-in-next' : COOK.dir < 0 ? ' cook-in-prev' : '') + '">';
  h += '<p class="eyebrow">' + esc(t('ck_step', { i: i + 1, n: n })) + '</p>';
  h += '<p class="cook-text">' + esc(step.text) + '</p>';
  if (ings.length) {
    h += '<ul class="cook-ings">';
    for (var g = 0; g < ings.length; g++) {
      h += '<li>' + esc(ings[g].name + ' ' + ingAmount(ings[g], v.schema2)) + '</li>';
    }
    h += '</ul>';
  }
  h += '<div class="cook-timer">' + stepTimerHtml(r.id, i, step) + '</div>';
  h += '</div>';
  h += '<div class="btnrow cook-nav">';
  if (i > 0) {
    h += '<button class="btn quiet" type="button" data-act="cook-prev">' + esc(t('ck_prev')) + '</button>';
  }
  h += '<button class="btn quiet" type="button" data-act="cook-next">' + esc(i === n - 1 ? t('ck_finish') : t('ck_next')) + '</button>';
  if (cookCanSpeak()) {
    h += '<button class="iconbtn" type="button" data-act="cook-read" aria-label="' + esc(t('ck_read')) + '">' + icon('speaker') + '</button>';
  }
  h += '</div>';
  host.innerHTML = h;
  cookBind(host);
  if (!COOK.lock) cookLock();
}

function cookGo(delta) {
  cookStopSpeech();
  var d = cookData();
  if (!d) return;
  var next = COOK.step + delta;
  if (next < 0) return;
  if (next >= d.v.steps.length) { cookFinish(); return; }
  COOK.step = next;
  COOK.dir = delta;
  renderCook();
}

async function cookFinish() {
  cookStopSpeech();
  var d = cookData();
  if (!d) return;
  var s = await startCookingSession(d.r.id, { axis: d.v.axis, flags: d.v.flagsApplied, servings: d.v.servings });
  await finishCookingSession(s);
  toast(t('ck_done'));
  if (moduleOn('logging')) S.afterCookLog = d.r.id;
  goBack();
}

async function cookLock() {
  if (!(navigator.wakeLock && navigator.wakeLock.request)) return;
  try { COOK.lock = await navigator.wakeLock.request('screen'); }
  catch (e) { COOK.lock = null; }
}

function cookUnlock() {
  if (COOK.lock) {
    try { COOK.lock.release(); } catch (e) {}
    COOK.lock = null;
  }
}

function cookRead() {
  if (!cookCanSpeak()) return;
  if (COOK.speaking) { cookStopSpeech(); return; }
  var d = cookData();
  if (!d) return;
  var u = new SpeechSynthesisUtterance(d.v.steps[COOK.step].text);
  u.lang = S.lang === 'cs' ? 'cs-CZ' : 'en-GB';
  u.onend = function () { COOK.speaking = false; };
  COOK.speaking = true;
  window.speechSynthesis.speak(u);
}

function cookStopSpeech() {
  if (cookCanSpeak()) {
    window.speechSynthesis.cancel();
    COOK.speaking = false;
  }
}

function cookLeave() {
  cookStopSpeech();
  cookUnlock();
}

function cookBind(host) {
  if (COOK.bound) return;
  COOK.bound = true;
  var x0 = null;
  host.addEventListener('touchstart', function (e) {
    x0 = e.touches && e.touches[0] ? e.touches[0].clientX : null;
  });
  host.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var x = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : x0;
    var dx = x - x0;
    x0 = null;
    if (Math.abs(dx) > 50) cookGo(dx < 0 ? 1 : -1);
  });
  document.addEventListener('visibilitychange', function () {
    if (S.screen !== 'cook') return;
    if (document.visibilityState === 'visible') cookLock();
    else cookUnlock();
  });
}
