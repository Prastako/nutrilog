/* ============================================================
   Routing, events, boot.
   Five tabs plus profile, settings and the recipe page.
   The Android back gesture closes a sheet first, then goes back a screen.
   ============================================================ */

const TABS = [
  {id:'today',   icon:'today',   key:'nav_today'},
  {id:'log',     icon:'log',     key:'nav_log'},
  {id:'recipes', icon:'suggest', key:'nav_recipes'},
  {id:'chat',    icon:'chat',    key:'nav_chat'},
  {id:'review',  icon:'review',  key:'nav_review'}
];
const SUBSCREENS = ['profile','settings','recipe'];

function renderTabs(){
  const cur = S.screen === 'recipe' ? 'recipes' : S.screen;
  $('#tabbar').innerHTML = TABS.map(tab =>
    '<button class="tab" type="button" data-go="'+tab.id+'"'+(cur===tab.id?' aria-current="page"':'')+'>'+
      icon(tab.icon)+'<span>'+esc(t(tab.key))+'</span><span class="dot"></span>'+
    '</button>').join('');
}

function go(screen, push){
  if (S.sheetOpen) closeSheet(true);
  S.screen = screen;
  $$('.screen').forEach(s => s.classList.remove('on'));
  const target = $('#s-'+screen);
  if (target) target.classList.add('on');
  refreshChrome();
  renderTabs();
  renderScreen(screen);
  renderBackupBar();
  window.scrollTo(0, 0);
  if (push !== false){
    try { history.pushState({screen}, '', '#'+screen); } catch(e){}
  }
}

function goBack(){
  if (history.state && history.state.screen && history.state.screen !== 'today') history.back();
  else go('today');
}

function refreshChrome(){
  const isSub = SUBSCREENS.indexOf(S.screen) >= 0;
  $('#btnBack').classList.toggle('hide', !isSub);
  $('#btnSettings').classList.toggle('hide', S.screen === 'settings');
  $('#screenTitle').textContent = isSub ? t('t_'+S.screen) : (S.screen === 'today' ? t('app_name') : t('t_'+S.screen));
  $('#fab').classList.toggle('hide', !(S.screen === 'today' || S.screen === 'log'));
  document.body.classList.toggle('chatmode', S.screen === 'chat');
}

function renderScreen(name){
  if (name === 'today') renderToday();
  else if (name === 'log') renderLog();
  else if (name === 'recipes') renderRecipes();
  else if (name === 'recipe') renderRecipe();
  else if (name === 'chat') renderChat();
  else if (name === 'review') renderReview();
  else if (name === 'profile') renderProfile();
  else if (name === 'settings') renderSettings();
}

function renderAll(){
  renderTabs();
  refreshChrome();
  renderScreen(S.screen);
  renderBackupBar();
}

function applyTheme(){
  document.documentElement.setAttribute('data-theme', S.theme);
  const dark = S.theme === 'dark' ||
    (S.theme === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = $('#metaThemeColor');
  if (meta) meta.setAttribute('content', dark ? '#17150F' : '#F2EADC');
}

function applyLang(){
  document.documentElement.setAttribute('lang', S.lang);
  renderAll();
}

function openFabSheet(){
  const b = '<div class="fabgrid">' +
    '<button class="btn" type="button" data-fab="add">'+icon('log')+esc(t('fab_add'))+'</button>' +
    '<button class="btn quiet" type="button" data-fab="photo">'+icon('camera')+esc(t('fab_photo'))+'</button>' +
    '<button class="btn quiet" type="button" data-fab="scan">'+esc(t('fab_scan'))+'</button>' +
    '<button class="btn quiet" type="button" data-fab="describe">'+esc(t('fab_describe'))+'</button>' +
    '<button class="btn quiet" type="button" data-fab="supp">'+esc(t('fab_supp'))+'</button>' +
    '</div>';
  const sheet = openSheet(esc(t('fab_title')), b);
  sheet.addEventListener('click', e => {
    const f = e.target.closest('[data-fab]');
    if (!f) return;
    const v = f.getAttribute('data-fab');
    const date = S.screen === 'log' ? (S.logDate || localDateKey()) : localDateKey();
    if (v === 'photo'){ closeSheet(); openPhotoSheet({date}); return; }
    if (v === 'supp'){ S.afterSheet = openSuppManager; closeSheet(); return; }
    closeSheet();
    openAddSheet(guessSlot(), date);
    if (v === 'scan' || v === 'describe'){
      $$('#addModes button').forEach(x => x.classList.toggle('on', x.getAttribute('data-mode') === v));
      addMode(v);
    }
  });
}

/* ---------- Events ---------- */

function bindEvents(){
  $('#btnBack').addEventListener('click', goBack);
  $('#btnSettings').addEventListener('click', () => go('settings'));
  $('#fab').addEventListener('click', openFabSheet);

  document.addEventListener('click', async (e) => {
    const goBtn = e.target.closest('[data-go]');
    if (goBtn){ go(goBtn.getAttribute('data-go')); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.getAttribute('data-act');
    const id = b.getAttribute('data-id');

    if (act === 'go-profile'){ S.draft = null; go('profile'); }
    else if (act === 'go-settings'){ go('settings'); }
    else if (act === 'why-range'){ showWhyRange(); }
    else if (act === 'profile-save'){ saveProfile().then(() => requestPersist()); }
    else if (act === 'theme'){ S.theme = b.getAttribute('data-v'); await savePrefs(); applyTheme(); renderSettings(); }
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
    else if (act === 'usage-reset'){ S.meta.usage = {calls:0,inTok:0,outTok:0,byModel:{},byMonth:S.meta.usage.byMonth||{}}; await saveMeta(); renderSettings(); }
    else if (act === 'update-check'){ checkUpdate(); }
    else if (act === 'install'){ if (S.installPrompt){ S.installPrompt.prompt(); S.installPrompt = null; renderSettings(); } }
    else if (act === 'arch-sync'){ await syncArchive({force:true}); renderSettings(); }
    else if (act === 'arch-import'){ $('#archFile').click(); }

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
    else if (act.indexOf('pchip-') === 0){
      const field = act.slice(6);
      const holder = field === 'cuisines' ? S.draft.food : S.draft.goals;
      const arr = holder[field] || (holder[field] = []);
      const at = arr.indexOf(id);
      if (at >= 0) arr.splice(at, 1); else arr.push(id);
      b.setAttribute('aria-pressed', at >= 0 ? 'false' : 'true');
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
    else if (act === 'open-recipe'){ S.recipeId = id; S.recipeServings = null; go('recipe'); }
    else if (act === 'recipe-log'){ recipeLogSheet(id); }
    else if (act === 'recipe-fav'){ const n = recipeNote(id) || {}; await saveRecipeNote(id, {favorite: !n.favorite}); renderRecipe(); }
    else if (act === 'recipe-missing'){ recipeMissing(id); }
    else if (act === 'recipe-ask'){ const r = RECIPES.byId[id]; S.chatSeed = t('rc_ask_seed', {t: r ? r.title : ''}); go('chat'); }
    else if (act === 'recipe-del'){
      const ok = await confirmSheet(t('rc_delete'), '<p class="muted">'+esc((RECIPES.byId[id]||{}).title||'')+'</p>', t('rc_delete'), true);
      if (ok){ await dbDel('recipes', id); markDirty('recipe deleted'); await loadRecipes(); go('recipes'); }
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
    else if (el.name === 'person.activityLevel' || el.name === 'kitchen.timeWeekday' || el.name === 'kitchen.timeWeekend') setPath(S.draft, el.name, Number(v));
    else if (el.name === 'goals.macroSplit.preset'){ setPath(S.draft, el.name, v); renderProfile(); }
    else setPath(S.draft, el.name, v);
  });

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
    if (el.id === 'archFile' && el.files && el.files[0]){
      try {
        const out = await importRecipeIndex(JSON.parse(await el.files[0].text()), 'file');
        toast(t('arch_synced', {n: out.count}));
      } catch(err){ toast(t('err_prefix') + ': ' + String(err.message||err), 6000); }
      el.value = '';
      renderSettings();
      return;
    }
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
    if (S.swallowPop){ S.swallowPop = false; refreshScreenSoon(); return; }
    if (S.sheetOpen){ closeSheet(true); return; }
    const scr = (e.state && e.state.screen) || 'today';
    go(scr, false);
  });
  window.addEventListener('online', () => {
    if (S.meta.backup.state === 'offline' || S.meta.backup.state === 'error') runBackup('back online');
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); S.installPrompt = e;
    if (S.screen === 'settings') renderSettings();
  });
  /* coming back to the app after midnight shows the new day */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (S.screen === 'today' || S.screen === 'log') && !S.sheetOpen) renderScreen(S.screen);
  });
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

async function boot(){
  await loadState();
  applyTheme();
  document.documentElement.setAttribute('lang', S.lang);
  bindEvents();
  await ensureStarterRecipes();
  await loadRecipes();

  const hash = (location.hash || '').replace('#','');
  const known = TABS.map(x => x.id).concat(['profile','settings']);
  go(known.indexOf(hash) >= 0 ? hash : 'today', false);
  try { history.replaceState({screen:S.screen}, '', '#'+S.screen); } catch(e){}

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
