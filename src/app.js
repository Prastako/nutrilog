/* ============================================================
   Routing, events, boot.
   Five tabs plus profile, settings and the recipe page.
   The Android back gesture closes a sheet first, then goes back a screen.
   ============================================================ */

const TABS = [
  {id:'recipes', icon:'suggest', key:'nav_recipes'},
  {id:'log',     icon:'log',     key:'nav_log'},
  {id:'review',  icon:'review',  key:'nav_review'}
];
const SUBSCREENS = ['profile','settings','recipe','cook'];
/* Modules: a screen exists only while its module is on. Recipes, the recipe page, Profile and Settings always exist. */
function screenOn(screen){
  if (screen === 'today' || screen === 'log' || screen === 'quick') return moduleOn('logging');
  if (screen === 'review') return moduleOn('goals');
  if (screen === 'chat') return false;  /* the chat is a sheet (brief tabs-log-today) */
  return true;
}

function renderTabs(){
  const cur = S.screen === 'recipe' ? 'recipes' : S.screen;
  $('#tabbar').innerHTML = TABS.filter(tab => screenOn(tab.id)).map(tab =>
    '<button class="tab" type="button" data-go="'+tab.id+'"'+(cur===tab.id?' aria-current="page"':'')+'>'+
      icon(tab.icon)+'<span>'+esc(t(tab.key))+'</span><span class="dot"></span>'+
    '</button>').join('');
  const nTabs = TABS.filter(tab => screenOn(tab.id)).length;
  $('#tabbar').setAttribute('data-n', String(nTabs));
  const noTabs = ['start','profile','settings','cook'].indexOf(S.screen) >= 0 || nTabs < 2;
  $('#tabbar').classList.toggle('hide', noTabs);
  document.body.classList.toggle('notabs', noTabs);
}

function go(screen, push){
  if (screen === 'today'){ screen = 'log'; S.logDate = localDateKey(); }
  if (push !== false) S.settingsCat = null;
  if (S.screen === 'cook' && screen !== 'cook') cookLeave();
  if (quickOn() && ['quick','settings','profile'].indexOf(screen) < 0){
    screen = 'quick';
    if (push === false){ try { history.replaceState({screen:'quick'}, '', '#quick'); } catch(e){} }
  }
  if (!screenOn(screen)) screen = 'recipes';
  if (S.sheetOpen) closeSheet(true);
  S.screen = screen;
  $$('.screen').forEach(s => s.classList.remove('on'));
  const target = $('#s-'+screen);
  if (target) target.classList.add('on');
  refreshChrome();
  renderTabs();
  renderScreen(screen);
  renderBackupBar();
  renderTimerPill();
  window.scrollTo(0, 0);
  if (push !== false){
    try { history.pushState({screen}, '', '#'+screen); } catch(e){}
  }
}

function goBack(){
  if (S.screen === 'start'){ startBack(); return; }
  if (history.state && history.state.screen && history.state.screen !== 'recipes') history.back();
  else go('recipes');
}

/* Header label: the screen name; Quick mode has no navigator, so it keeps the short date. */
function headerLabel(){
  if (S.screen === 'quick') return fmtShortDate(localDateKey());
  if (S.screen === 'settings' && S.settingsCat) return t('st_' + S.settingsCat);
  if (S.screen === 'cook'){ const r = RECIPES.byId[COOK.recipeId]; return r ? r.title : ''; }
  return t('t_' + S.screen);
}

function refreshChrome(){
  const isSub = SUBSCREENS.indexOf(S.screen) >= 0;
  $('#btnBack').classList.toggle('hide', !(isSub || (S.screen === 'start' && START.page > 0)));
  $('#btnSettings').classList.toggle('hide', S.screen === 'settings' || S.screen === 'start' || S.screen === 'cook');
  const bc = $('#btnChat'); if (bc){ bc.classList.toggle('hide', S.screen === 'quick' || S.screen === 'start' || !moduleOn('assistant')); bc.classList.toggle('solo', S.screen === 'settings'); bc.setAttribute('aria-label', t('t_chat')); }
  $('#screenTitle').textContent = headerLabel();

  document.body.classList.toggle('chatmode', S.screen === 'chat');
  document.body.classList.toggle('quickmode', quickOn() && S.screen === 'quick');
  document.body.classList.toggle('quickpref', quickOn());
}

function renderScreen(name){
  meterSeq = 0;
  if (name === 'log') renderLog();
  else if (name === 'recipes') renderRecipes();
  else if (name === 'recipe') renderRecipe();
  else if (name === 'chat') renderChat();
  else if (name === 'review') renderReview();
  else if (name === 'profile') renderProfile();
  else if (name === 'settings') renderSettings();
  else if (name === 'quick') renderQuick();
  else if (name === 'start') renderStart();
  else if (name === 'cook') renderCook();
}

function renderAll(){
  renderTabs();
  refreshChrome();
  renderScreen(S.screen);
  renderBackupBar();
}

function applyTheme(){
  const look = lookOf(S.look);
  document.documentElement.setAttribute('data-theme', S.theme);
  document.documentElement.setAttribute('data-look', look.id);
  document.documentElement.setAttribute('data-type', typeOf(S.type).id);
  const dark = S.theme === 'dark' ||
    (S.theme === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = $('#metaThemeColor');
  if (meta) meta.setAttribute('content', dark ? look.dark.ground : look.light.ground);
}

function applyLang(){
  document.documentElement.setAttribute('lang', S.lang);
  renderAll();
}

/* ---------- Events ---------- */

function bindEvents(){
  bindQuick();
  $('#btnBack').addEventListener('click', goBack);
  $('#btnSettings').addEventListener('click', () => go('settings'));
  $('#btnChat').addEventListener('click', () => openChatSheet(''));
  const dateHintUpd = (e) => { const el = e.target; if (!el || !el.matches || !el.id || !el.matches('input[type="date"]')) return;
    const h = document.querySelector('[data-hint-for="' + el.id + '"]'); if (h) h.textContent = el.value ? numDate(el.value, true) : ''; };
  document.addEventListener('input', dateHintUpd); document.addEventListener('change', dateHintUpd);
  document.addEventListener('pointerup', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('.btn') : null;
    if (!b || b.classList.contains('quiet') || b.classList.contains('ghost') || b.classList.contains('danger')) return;
    b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
    b.addEventListener('animationend', () => b.classList.remove('pulse'), {once: true});
  });


  document.addEventListener('click', async (e) => {
    const goBtn = e.target.closest('[data-go]');
    if (goBtn){ go(goBtn.getAttribute('data-go')); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.getAttribute('data-act');
    const id = b.getAttribute('data-id');

    if (act === 'go-profile'){ S.draft = null; go('profile'); }
    else if (act === 'set-cat'){ openSettingsCat(b.getAttribute('data-v')); }
    else if (act === 'go-settings'){ go('settings'); }
    else if (act === 'why-range'){ showWhyRange(); }
    else if (act === 'profile-save'){ saveProfile().then(() => requestPersist()); }
    else if (act === 'theme'){ S.theme = b.getAttribute('data-v'); await savePrefs(); applyTheme(); renderSettings(); }
    else if (act === 'look'){ S.look = lookOf(b.getAttribute('data-v')).id; await savePrefs(); applyTheme(); renderSettings(); }
    else if (act === 'type'){ S.type = typeOf(b.getAttribute('data-v')).id; await savePrefs(); applyTheme(); renderSettings(); }
    else if (act === 'lang'){ S.lang = b.getAttribute('data-v'); await savePrefs(); applyLang(); }
    else if (act === 'toggle-secret'){
      const inp = document.getElementById(b.getAttribute('data-for'));
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      b.textContent = show ? t('k_hide') : t('k_show');
    }
    else if (act === 'test-anthropic'){ testAnthropic(); }
    else if (act === 'test-github'){ testGithub(); }
    else if (act === 'export'){ exportManually(); }
    else if (act === 'import'){ $('#importFile').click(); }
    else if (act === 'restore-cloud'){ restoreFromCloud(); }
    else if (act === 'backup-now'){
      const r = await runBackup('manual', {force:true});
      toast(r.ok ? (r.same ? t('backup_same') : t('backup_ok'))
                 : (r.why === 'empty' ? t('backup_empty') : r.why === 'offline' ? t('err_offline')
                 : r.why === 'unconfigured' ? t('b_target_none') : t('backup_fail')), 5000);
    }
    else if (act === 'snap-restore'){
      const rec = await dbGet('snapshots', b.getAttribute('data-date'));
      if (rec) await restoreFromPayload(rec.payload, t('b_snapshot_restore') + ' ' + rec.date);
    }
    else if (act === 'erase'){ eraseEverything(); }
    else if (act === 'diag-copy'){ await copyDiagnostics(); }
    /* brief nutrilog-260930-money-spend: no usage counter to reset */
    else if (act === 'update-check'){ checkUpdate(); }
    else if (act === 'install'){ if (S.installPrompt){ S.installPrompt.prompt(); S.installPrompt = null; renderSettings(); } }
    else if (act === 'arch-sync'){ await syncArchive({force:true}); renderSettings(); }
    /* brief nutrilog-260930-recipe-file-button: no arch-import action */

    /* profile */
    else if (act === 'excl-add'){
      const inp = $('#exNew');
      const label = (inp.value||'').trim();
      if (!label) return;
      S.draft.food.exclusions.push({id:null, label, type: b.getAttribute('data-type'), syn: []});
      renderProfile();
    }
    else if (act === 'excl-del'){ S.draft.food.exclusions.splice(Number(b.getAttribute('data-i')), 1); renderProfile(); }
    else if (act === 'excl-quick'){
      const a = ALLERGENS.find(x => x.id === id);
      const list = S.draft.food.exclusions;
      const at = list.findIndex(x => x.id === id);
      if (at >= 0) list.splice(at, 1);
      else list.push({id: a.id, label: L(a), type:'allergy', syn: a.syn.slice()});
      renderProfile();
    }
    else if (act === 'slot-preset'){
      const preset = SLOT_PRESETS.find(p => p.id === id);
      if (preset) S.draft.goals.slots = {...preset.slots};
      renderProfile();
    }
    else if (act.indexOf('pchip-') === 0){
      const field = act.slice(6);
      const holder = field === 'equipment' ? S.draft.kitchen : ['cuisines','conditions','rules','prefs'].indexOf(field) >= 0 ? S.draft.food : S.draft.goals;
      const arr = holder[field] || (holder[field] = []);
      const at = arr.indexOf(id);
      if (at >= 0) arr.splice(at, 1); else arr.push(id);
      /* brief nutrilog-260930-equipment-chips: choosing None of these unchooses the tools, choosing a tool unchooses None */
      if (field === 'equipment' && at < 0){ const keep = id === 'none' ? ['none'] : arr.filter(x => x !== 'none'); arr.length = 0; keep.forEach(x => arr.push(x)); }
      b.setAttribute('aria-pressed', at >= 0 ? 'false' : 'true');
      if (field === 'equipment' && b.parentElement) b.parentElement.querySelectorAll('[data-act="pchip-equipment"]').forEach(c => c.setAttribute('aria-pressed', String(arr.indexOf(c.getAttribute('data-id')) >= 0)));
      if (field === 'conditions') renderProfile();
    }

    /* diary */
    else if (act === 'add-food'){ openAddSheet(b.getAttribute('data-slot'), S.screen === 'log' ? (S.logDate || localDateKey()) : localDateKey()); }
    else if (act === 'edit-entry'){ editEntry(id || b.getAttribute('data-id')); }
    else if (act === 'ldate'){ S.logDate = addDays(S.logDate || localDateKey(), Number(b.getAttribute('data-d'))); renderLog(); }
    else if (act === 'copy-day'){ copyPreviousDay(); }
    else if (act === 'supp-manage'){ openSuppManager(); }

    /* recipes */
    else if (act === 'rtab'){ S.recipeTab = b.getAttribute('data-v'); renderRecipes(); }
    else if (act === 'rchip'){
      const v = b.getAttribute('data-v'), c = S.recipeFilter.chips, at = c.indexOf(v);
      if (at >= 0) c.splice(at, 1); else c.push(v);
      renderRecipeList();
    }
    else if (act === 'rtags'){ openTagBrowser(); }
    else if (act === 'rtag-toggle'){
      const v = b.getAttribute('data-v'), c = S.recipeFilter.tags, at = c.indexOf(v);
      if (at >= 0) c.splice(at, 1); else c.push(v);
      b.setAttribute('aria-pressed', at >= 0 ? 'false' : 'true');
    }
    else if (act === 'rtag-off'){ const c = S.recipeFilter.tags; c.splice(c.indexOf(b.getAttribute('data-v')), 1); renderRecipeList(); }
    else if (act === 'open-recipe'){ S.recipeId = id; S.recipeServings = null; S.recipeAxis = null; go('recipe'); }
    else if (act === 'recipe-log'){ recipeLogSheet(id); }
    else if (act === 'recipe-cook'){ cookOpen(id); }
    else if (act === 'cook-next'){ cookGo(1); }
    else if (act === 'cook-prev'){ cookGo(-1); }
    else if (act === 'cook-read'){ cookRead(); }
    else if (act === 'timer-start'){ await timerStart(S.recipeId, Number(b.getAttribute('data-step')), Number(b.getAttribute('data-sec')), b.getAttribute('data-label') || ''); if (S.screen === 'cook') renderCook(); else renderRecipe(); }
    else if (act === 'timer-cancel'){ await timerCancel(id); if (S.screen === 'recipe') renderRecipe(); else if (S.screen === 'cook') renderCook(); }
    else if (act === 'timer-dismiss'){ const tm = timersAll().find(x => x.id === id); if (tm && timerLeft(tm) === 0){ await timerCancel(id); if (S.screen === 'recipe') renderRecipe(); else if (S.screen === 'cook') renderCook(); } }
    else if (act === 'recipe-fav'){ const n = recipeNote(id) || {}; await saveRecipeNote(id, {favorite: !n.favorite}); renderRecipe(); }
    else if (act === 'recipe-missing'){ recipeMissing(id); }
    else if (act === 'recipe-ask'){ const r = RECIPES.byId[id]; openChatSheet(t('rc_ask_seed', {t: r ? r.title : ''})); }
    else if (act === 'recipe-del'){
      const ok = await confirmSheet(t('rc_delete'), '<p class="muted">'+esc((RECIPES.byId[id]||{}).title||'')+'</p>', t('rc_delete'), true);
      if (ok){ const rec = await dbGet('recipes', id); if (rec){ rec.deleted = true; rec.updatedAt = nowIso(); await dbPut('recipes', rec); } markDirty('recipe deleted'); await loadRecipes(); go('recipes'); }
    }
    else if (act === 'recipe-new'){ newOwnRecipeSheet(); }
    else if (act === 'rserv'){
      const r = RECIPES.byId[S.recipeId];
      const base = Number(r.servings) || 1;
      const cur = S.recipeServings || base;
      const step = cur < 2 ? 0.5 : 1;
      S.recipeServings = Math.max(0.5, cur + Number(b.getAttribute('data-d')) * step);
      renderRecipe();
    }
    else if (act === 'sdate'){ S.suggestDate = addDays(S.suggestDate || localDateKey(), Number(b.getAttribute('data-d'))); renderSuggestions(); }
    else if (act === 'ai-recipes'){ aiRecipesSheet(b.getAttribute('data-slot'), Number(b.getAttribute('data-kcal')) || null, false); }
    else if (act === 'ai-mealprep'){ aiRecipesSheet(null, null, true); }

    /* chat */
    else if (act === 'pantry'){ openPantry(false); }
    else if (act === 'shopping'){ openPantry(true); }
    else if (act === 'chat-new'){ S.meta.chatThread = ulid(); await saveMeta(); renderChat(); }

    /* review */
    else if (act === 'rmode'){ S.reviewMode = b.getAttribute('data-v'); renderReview(); }
    else if (act === 'rnav'){
      const d = Number(b.getAttribute('data-d'));
      const cur = S.reviewAnchor || localDateKey();
      if (S.reviewMode === 'month'){ const x = dateFromKey(cur); x.setMonth(x.getMonth() + d, 1); S.reviewAnchor = localDateKey(x); }
      else S.reviewAnchor = addDays(cur, 7 * d);
      renderReview();
    }
    else if (act === 'rv-ai'){ reviewWithClaude(); }
  });

  /* supplement check boxes, anywhere */
  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-supp')){
      await toggleSuppIntake(el.getAttribute('data-supp'), el.getAttribute('data-date'), el.checked);
      toast(el.checked ? t('sp_taken') : t('sp_untaken'));
    }
  });

  /* profile inputs */
  const prof = $('#s-profile');
  prof.addEventListener('input', (e) => {
    const el = e.target;
    if (el.hasAttribute('data-bind')){
      setPath(S.draft, el.getAttribute('data-bind'), el.value);
      if (/^(goals\.macroSplit\.|goals\.slots\.|person\.)/.test(el.getAttribute('data-bind'))) updateProfilePreview();
      if (el.getAttribute('data-bind').indexOf('goals.macroSplit.') === 0){
        const m = S.draft.goals.macroSplit;
        const sum = Number(m.proteinPct)+Number(m.fatPct)+Number(m.carbPct);
        const out = $('#splitSum');
        if (out) out.textContent = t('ms_sum',{n:sum}) + (sum !== 100 ? ' ' + t('ms_sum_err') : '');
      }
    } else if (el.hasAttribute('data-syn')){
      const i = Number(el.getAttribute('data-syn'));
      S.draft.food.exclusions[i].syn = el.value.split(',').map(s => s.trim()).filter(Boolean);
    }
  });
  prof.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.name) return;
    const v = el.value;
    if (el.name === 'kitchen.equipment'){
      let eq = S.draft.kitchen.equipment;
      const at = eq.indexOf(v);
      if (el.checked && at < 0) eq.push(v);
      if (!el.checked && at >= 0) eq.splice(at,1);
      if (el.checked && v === 'none') S.draft.kitchen.equipment = ['none'];
      else if (el.checked) S.draft.kitchen.equipment = eq.filter(x => x !== 'none');
      renderProfile();
    }
    /* brief nutrilog-260930-week-detail-finetune: the switch sits in Fine-tune, which stays open */
    else if (el.name === 'person.activityDetail.on') { setPath(S.draft, el.name, el.checked); S.ftOpen = true; renderProfile(); }
    else if (el.name === 'person.activityLevel' || el.name === 'person.activityDetail.base' || el.name === 'kitchen.timeWeekday' || el.name === 'kitchen.timeWeekend') setPath(S.draft, el.name, Number(v));
    else if (el.name === 'goals.macroSplit.preset'){ setPath(S.draft, el.name, v); renderProfile(); }
    else if (el.name === 'food.pattern'){ setPath(S.draft, el.name, v); renderProfile(); }
    else if (el.name.indexOf('food.patternOpts.') === 0){ setPath(S.draft, el.name, el.checked); renderProfile(); }
    else setPath(S.draft, el.name, v);
    updateProfilePreview();
  });
  prof.addEventListener('toggle', (e) => { if (e.target.id === 'ftBox') S.ftOpen = e.target.open; }, true);

  /* settings inputs */
  const set = $('#s-settings');
  set.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.id === 'importFile' && el.files && el.files[0]){
      const text = await el.files[0].text();
      let obj = null;
      try { obj = JSON.parse(text); } catch(err){ toast(t('import_bad_file'), 6000); el.value = ''; return; }
      await restoreFromPayload(obj, t('b_import'));
      el.value = '';
      return;
    }
    /* brief nutrilog-260930-recipe-file-button: no #archFile handler */
    const path = el.getAttribute('data-set');
    if (!path) return;
    const val = el.value.trim();
    if (path.indexOf('secret.') === 0){
      const which = path.slice(7);
      S.secrets[which] = val;
      await secretSet(which, val);
    } else {
      const parts = path.replace(/^prefs\./,'').split('.');
      let o = S.prefs;
      for (let i = 0; i < parts.length-1; i++){ if (!o[parts[i]]) o[parts[i]] = {}; o = o[parts[i]]; }
      o[parts[parts.length-1]] = (el.type === 'number') ? Number(val) : val;
      await savePrefs();
    }
    renderBackupBar();
    renderBackupPanel();
  });

  window.addEventListener('popstate', (e) => {
    if ((location.hash || '').indexOf('#join=') === 0) return;
    if (S.swallowPop){ S.swallowPop = false; refreshScreenSoon(); return; }
    if (S.sheetOpen){ closeSheet(true); return; }
    if (S.screen === 'start'){ startPop(e.state); return; }
    let scr = (e.state && e.state.screen) || 'recipes';
    if (scr === 'start') scr = 'recipes';
    S.settingsCat = (e.state && e.state.cat) || null;
    go(scr, false);
  });
  window.addEventListener('hashchange', () => {
    const h = location.hash || '';
    if (h.indexOf('#join=') !== 0) return;
    try { history.replaceState({screen:S.screen}, '', '#'+S.screen); } catch(e){}
    syncHandleJoinLink(syncKeyFromInput(h));
  });
  window.addEventListener('online', () => {
    if (S.meta.backup.state === 'offline' || S.meta.backup.state === 'error') runBackup('back online');
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  window.matchMedia('(min-width: 900px)').addEventListener('change', () => { if (!S.sheetOpen && (S.screen === 'today' || S.screen === 'log')) renderScreen(S.screen); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.sheetOpen) closeSheet(); });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); S.installPrompt = e;
    if (S.screen === 'settings') renderSettings();
  });
  /* coming back to the app after midnight shows the new day */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (S.screen === 'today' || S.screen === 'log' || S.screen === 'quick') && !S.sheetOpen) renderScreen(S.screen);
    if (document.visibilityState === 'visible') syncRun('foreground');
    else syncFlush();
  });
  window.addEventListener('pagehide', () => syncFlush());
}

/* ---------- Service worker and updates ---------- */

function registerSW(){
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(
    () => { S.swRegistered = true; renderDiagnostics(); },
    () => { S.swRegistered = false; renderDiagnostics(); }
  );
}

async function checkUpdate(){
  try {
    if ('serviceWorker' in navigator){
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    }
    const res = await fetch('index.html?ts=' + Date.now(), {cache:'no-store'});
    const txt = await res.text();
    const m = txt.match(/const VERSION = '([^']+)'/);
    if (m && m[1] !== VERSION){
      toast(t('about_update_yes'));
      setTimeout(() => location.reload(), 1300);
    } else {
      toast(t('about_update_none'));
    }
  } catch(err){
    toast(t('err_prefix')+': '+String(err.message||err), 5000);
  }
}

async function requestPersist(){
  if (!navigator.storage || !navigator.storage.persist) return;
  try {
    let ok = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    if (!ok) ok = await navigator.storage.persist();
    S.meta.persistGranted = !!ok;
    await saveMeta();
    renderDiagnostics();
  } catch(e){}
}

/* ---------- Boot ---------- */

/* brief nutrilog-260930-storage-blocked: storage that cannot be opened at start gets one plain screen, nothing is written */
function bootNoStore(){
  const cs = String(navigator.language || '').toLowerCase().indexOf('cs') === 0;
  const T = cs ? STR.cs : STR.en;
  try {
    S.prefs = mergeDefaults(null, DEFAULT_PREFS);
    S.theme = S.prefs.theme; S.look = lookOf(S.prefs.look).id; S.type = typeOf(S.prefs.type).id;
    applyTheme();
  } catch(e){}
  document.documentElement.setAttribute('lang', cs ? 'cs' : 'en');
  const host = document.getElementById('app') || document.body;
  host.innerHTML = '<main id="noStore" style="max-width:560px;margin:0 auto;padding:calc(env(safe-area-inset-top) + 48px) 20px 32px">' +
    '<h1 class="brand" style="margin-bottom:14px">NutriLog</h1><p>' + esc(T.boot_nostore) + '</p>' +
    '<div class="btnrow" style="margin-top:18px"><button class="btn" type="button" id="bootReload">' + esc(T.boot_reload) + '</button></div></main>';
  const b = document.getElementById('bootReload');
  if (b) b.addEventListener('click', () => location.reload());
}

async function boot(){
  try { await loadState(); } catch(e){ bootNoStore(); return; }
  applyTheme();
  initOrnaments();
  document.documentElement.setAttribute('lang', S.lang);
  bindEvents();
  timersInit();
  await ensureStarterRecipes();
  await loadRecipes();

  const hash = (location.hash || '').replace('#','');
  const known = TABS.map(x => x.id).concat(['today','profile','settings','quick']);
  const fresh = await needsStart();
  /* brief nutrilog-260930-quick-shortcut: #quick opens Quick mode for this launch only; nothing is saved */
  if (hash === 'quick' && !fresh && !quickOn() && moduleOn('logging')) S.quickLaunch = true;
  go(fresh ? 'start' : known.indexOf(hash) >= 0 ? hash : 'recipes', false);
  try { history.replaceState({screen:S.screen}, '', '#'+S.screen); } catch(e){}
  syncRun('app open');
  if (!S.secrets.sync || S.meta.sync.state === 'revoked') catalogRun(!S.meta.catalog.cursor).catch(() => {});
  if (hash.indexOf('join=') === 0) syncHandleJoinLink(syncKeyFromInput('#' + hash));
  else maybeOfferQuick();

  requestPersist();
  registerSW();
  loadFoodDb().catch(() => {});

  if (backupConfigured() && backupHoursStale() > 6){
    setTimeout(() => runBackup('app open'), 3000);
  }
  /* pick up newly extracted recipes once a day */
  if (backupConfigured()){
    const last = S.meta.archive.lastSyncAt;
    if (!last || (Date.now() - new Date(last).getTime()) > 20*3600*1000){
      setTimeout(() => syncArchive({quiet:true}).then(() => { if (S.screen === 'recipes') renderRecipes(); }), 5000);
    }
  }
}

boot();
