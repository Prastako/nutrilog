/* First start (brief first-start): one page per module; nothing is saved before the last page. */
const START = { page: 0, mods: null };

function startReset() {
  START.page = 0;
  START.mods = {logging:false, goals:false, supplements:false, assistant:false};
}

async function needsStart() {
  if (S.prefs.modules !== undefined && S.prefs.modules !== null) return false;
  if (S.profile) return false;
  return (await dbAll('records')).length === 0;
}

function renderStart() {
  if (START.mods === null) startReset();
  var name = MODULES[START.page];
  var h = '';
  if (START.page === 0) {
    h += '<div class="seg" style="margin-bottom:14px">';
    h += '<button type="button" class="' + (S.lang==='cs'?'on':'') + '" data-act="lang" data-v="cs" aria-pressed="' + (S.lang==='cs'?'true':'false') + '">Čeština</button>';
    h += '<button type="button" class="' + (S.lang==='en'?'on':'') + '" data-act="lang" data-v="en" aria-pressed="' + (S.lang==='en'?'true':'false') + '">English</button>';
    h += '</div>';
  }
  h += '<p class="eyebrow">' + esc(t('fs_step', {i: START.page + 1, n: MODULES.length})) + '</p>';
  h += '<h2>' + esc(t('mod_' + name)) + '</h2>';
  h += '<p class="muted" style="margin:10px 0 22px">' + esc(t('mod_' + name + '_d')) + '</p>';
  h += '<div class="btnrow"><button class="btn" type="button" id="startOn">' + esc(t('fs_on')) + '</button><button class="btn quiet" type="button" id="startSkip">' + esc(t('fs_skip')) + '</button></div>';
  $('#s-start').innerHTML = h;
  $('#startOn').addEventListener('click', () => startChoose(true));
  $('#startSkip').addEventListener('click', () => startChoose(false));
  refreshChrome();
}

function startChoose(on) {
  var name = MODULES[START.page];
  START.mods[name] = on;
  if (name === 'goals' && on && !START.mods.logging) {
    START.mods.logging = true;
    toast(t('mod_needs_logging'));
  }
  if (name === 'logging' && !on && START.mods.goals) {
    START.mods.goals = false;
    toast(t('mod_goals_off'));
  }
  START.page += 1;
  if (START.page < MODULES.length) {
    renderStart();
  } else {
    finishStart();
  }
}

function startBack() {
  if (START.page > 0) {
    START.page -= 1;
    renderStart();
  }
}

async function finishStart() {
  S.prefs.modules = Object.assign({}, START.mods);
  await savePrefs();
  START.mods = null;
  START.page = 0;
  try { history.replaceState({screen:'recipes'}, '', '#recipes'); } catch(e){}
  if (moduleOn('goals')) {
    S.draft = null;
    S.afterStart = true;
    go('profile');
  } else {
    S.recipeTab = 'all';
    go('recipes');
  }
}
