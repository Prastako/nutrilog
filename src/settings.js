/* ============================================================
   Profile (body data, diet goals, food preferences, kitchen) and
   settings (keys, models, budget, archive, backup, diagnostics).
   ============================================================ */

/* ---------- Profile ---------- */

function blankProfile(){
  return {
    id:'profile', type:'profile', schema:2,
    person:{ sex:'', age:null, ageRecordedOn:null, heightCm:null, weightKg:null, activityLevel:2 },
    goals:{ direction:'maintain', macroSplit:{preset:'balanced', proteinPct:25, fatPct:30, carbPct:45},
      dietStyle:[], aims:[], focusNutrients:[], notes:'', slots: deepCopy(DEFAULT_SLOTS) },
    food:{ exclusions:[], cuisines:[], cuisineOther:'', dislikes:'' },
    kitchen:{ timeWeekday:2, timeWeekend:3, equipment:[], budget:'bud3', mealPrep:{cookDaysPerWeek:3, batchServings:3} }
  };
}

function optRow(name, value, checked, title, desc, square){
  return '<label class="opt'+(square?' sq':'')+'">' +
    '<input type="'+(square?'checkbox':'radio')+'" name="'+name+'" value="'+esc(value)+'"'+(checked?' checked':'')+'>' +
    '<span class="mark"></span><span class="txt"><span class="t1">'+esc(title)+'</span>' +
    (desc ? '<span class="t2">'+esc(desc)+'</span>' : '') + '</span></label>';
}

function chipSet(act, list, selected, labelFn){
  return '<div class="chips">' + list.map(v =>
    '<button class="chip" type="button" data-act="'+act+'" data-id="'+esc(v)+'" aria-pressed="'+(selected.indexOf(v)>=0)+'">'+esc(labelFn(v))+'</button>').join('') + '</div>';
}

function getPath(o, path){ return path.split('.').reduce((a,k) => a == null ? a : a[k], o); }
function setPath(o, path, value){
  const parts = path.split('.');
  let x = o;
  for (let i = 0; i < parts.length-1; i++){ if (x[parts[i]] == null) x[parts[i]] = {}; x = x[parts[i]]; }
  x[parts[parts.length-1]] = value;
}

function renderProfile(){
  const d = S.draft || (S.draft = S.profile ? mergeDefaults(deepCopy(S.profile), blankProfile()) : blankProfile());
  const P = d.person, G = d.goals, F = d.food, K = d.kitchen;
  const num = (path, id, label, attrs) => '<div class="field"><label for="'+id+'">'+esc(label)+'</label><input id="'+id+'" type="number" '+attrs+' data-bind="'+path+'" value="'+esc(getPath(d, path) == null ? '' : getPath(d, path))+'"></div>';
  let h = '<p class="muted">'+esc(t('p_intro'))+'</p><div class="orn"><i></i></div>';

  h += '<div class="card"><h3>'+esc(t('p_basics'))+'</h3>';
  h += '<div class="field"><span class="flabel">'+esc(t('p_sex'))+'</span><div class="opts two">' +
       optRow('person.sex','male',P.sex==='male',t('p_male')) + optRow('person.sex','female',P.sex==='female',t('p_female')) +
       '</div><p class="tiny" style="margin-top:6px">'+esc(t('p_sex_note'))+'</p></div>';
  h += '<div class="inline">' + num('person.age','f-age',t('p_age')+' ('+t('p_years')+')','inputmode="numeric" min="10" max="100"') +
       num('person.heightCm','f-height',t('p_height')+' ('+t('p_cm')+')','inputmode="numeric" min="100" max="250"') +
       num('person.weightKg','f-weight',t('p_weight')+' ('+t('p_kg')+')','inputmode="decimal" step="0.1" min="30" max="300"') + '</div></div>';

  h += '<div class="card"><h3>'+esc(t('p_direction'))+'</h3><div class="opts">' +
       ['lose','maintain','gain'].map(v => optRow('goals.direction', v, G.direction===v, t('dir_'+v), t('dir_'+v+'_d'))).join('') + '</div></div>';

  h += '<div class="card"><h3>'+esc(t('p_activity'))+'</h3><p class="tiny" style="margin-bottom:9px">'+esc(t('p_activity_note'))+'</p><div class="opts">';
  ACTIVITY.forEach(a => { h += optRow('person.activityLevel', String(a.id), Number(P.activityLevel)===a.id, t(a.k+'_t'), t(a.k+'_d')); });
  h += '</div></div>';

  h += '<div class="card"><h3>'+esc(t('p_macro'))+'</h3><div class="opts">' +
       ['balanced','protein','lowcarb','custom'].map(v => optRow('goals.macroSplit.preset', v, G.macroSplit.preset===v, t('ms_'+v), t('ms_'+v+'_d'))).join('') + '</div>';
  if (G.macroSplit.preset === 'custom'){
    const sum = Number(G.macroSplit.proteinPct)+Number(G.macroSplit.fatPct)+Number(G.macroSplit.carbPct);
    h += '<div class="inline" style="margin-top:12px">' +
      num('goals.macroSplit.proteinPct','c-p',t('macro_p')+' %','inputmode="numeric" min="5" max="60"') +
      num('goals.macroSplit.fatPct','c-f',t('macro_f')+' %','inputmode="numeric" min="10" max="70"') +
      num('goals.macroSplit.carbPct','c-c',t('macro_c')+' %','inputmode="numeric" min="0" max="70"') +
      '</div><p class="tiny" id="splitSum">'+esc(t('ms_sum',{n:sum}))+(sum!==100 ? ' '+esc(t('ms_sum_err')) : '')+'</p>';
  }
  h += '</div>';

  /* diet goals: new in v0.2 */
  h += '<div class="card"><h3>'+esc(t('pg_h'))+'</h3><p class="tiny" style="margin-bottom:10px">'+esc(t('pg_intro'))+'</p>' +
    '<p class="flabel">'+esc(t('pg_style'))+'</p>' + chipSet('pchip-dietStyle', DIET_STYLES, G.dietStyle, v => t('ds_'+v)) +
    '<p class="flabel" style="margin-top:14px">'+esc(t('pg_aims'))+'</p>' + chipSet('pchip-aims', AIMS, G.aims, v => t('aim_'+v)) +
    '<p class="flabel" style="margin-top:14px">'+esc(t('pg_focus'))+'</p>' + chipSet('pchip-focusNutrients', FOCUS_CHOICES, G.focusNutrients, nutLabel) +
    '<div class="field" style="margin-top:14px"><label for="g-notes">'+esc(t('pg_notes'))+'</label><textarea id="g-notes" data-bind="goals.notes" placeholder="'+esc(t('pg_notes_ph'))+'">'+esc(G.notes||'')+'</textarea></div>' +
    '<p class="flabel">'+esc(t('pg_slots'))+'</p><div class="inline">' +
      SLOTS.map(s => num('goals.slots.'+s, 'sl-'+s, t('slot_'+s)+' %', 'inputmode="numeric" min="0" max="80"')).join('') + '</div>' +
    '<p class="tiny">'+esc(t('pg_slots_note'))+'</p></div>';

  /* exclusions */
  h += '<div class="card"><h3>'+esc(t('p_allergy_h'))+'</h3>' +
       '<p class="tiny" style="margin-bottom:10px">'+esc(t('p_allergy_intro'))+'</p>';
  if (!F.exclusions.length) h += '<p class="muted">'+esc(t('p_allergy_none'))+'</p>';
  else {
    h += '<div style="margin-bottom:12px">';
    F.exclusions.forEach((x, i) => {
      h += '<div class="notice" style="margin-bottom:8px">' +
        '<div style="display:flex;gap:8px;align-items:center">' +
        '<b style="flex:1">'+esc(exclLabel(x))+'</b>' +
        '<span class="pill '+(x.type==='allergy'?'err':'')+'">'+esc(t(x.type==='allergy'?'p_type_allergy':'p_type_refuse'))+'</span>' +
        '<button class="iconbtn sm" type="button" data-act="excl-del" data-i="'+i+'" aria-label="'+esc(t('p_remove'))+'">'+icon('trash')+'</button></div>' +
        '<div class="field" style="margin:8px 0 0"><span class="flabel">'+esc(t('p_synonyms'))+'</span>' +
        '<input type="text" data-syn="'+i+'" value="'+esc((x.syn||[]).join(', '))+'" placeholder="'+esc(t('p_synonyms_ph'))+'"></div></div>';
    });
    h += '</div><p class="tiny" style="margin-bottom:10px">'+esc(t('p_syn_note'))+'</p>';
  }
  h += '<div class="field"><span class="flabel">'+esc(t('p_add'))+'</span>' +
       '<input type="text" id="exNew" placeholder="'+esc(t('p_item_ph'))+'">' +
       '<div class="btnrow" style="margin-top:8px">' +
       '<button class="btn" type="button" data-act="excl-add" data-type="allergy">'+esc(t('p_type_allergy'))+'</button>' +
       '<button class="btn quiet" type="button" data-act="excl-add" data-type="refuse">'+esc(t('p_type_refuse'))+'</button></div></div>';
  h += '<p class="tiny" style="margin-bottom:7px">'+esc(t('p_allergy_common'))+'</p><div class="chips">';
  ALLERGENS.forEach(a => {
    const on = F.exclusions.some(x => x.id === a.id);
    h += '<button class="chip" type="button" aria-pressed="'+(on?'true':'false')+'" data-act="excl-quick" data-id="'+a.id+'">'+esc(L(a))+'</button>';
  });
  h += '</div><div class="field" style="margin-top:14px"><label for="f-dis">'+esc(t('pf_dislikes'))+'</label><input id="f-dis" type="text" data-bind="food.dislikes" value="'+esc(F.dislikes||'')+'" placeholder="'+esc(t('pf_dislikes_ph'))+'"></div></div>';

  h += '<div class="card"><h3>'+esc(t('p_cuisines'))+'</h3>' + chipSet('pchip-cuisines', CUISINES.map(c => c.id), F.cuisines, id => L(CUISINES.find(c => c.id === id))) +
    '<div class="field" style="margin-top:12px"><input type="text" data-bind="food.cuisineOther" value="'+esc(F.cuisineOther||'')+'" placeholder="'+esc(t('p_cuisine_free_ph'))+'"></div></div>';

  h += '<div class="card"><h3>'+esc(t('p_time'))+'</h3>';
  [['kitchen.timeWeekday','p_time_weekday'],['kitchen.timeWeekend','p_time_weekend']].forEach(([path, lab]) => {
    h += '<div class="field"><span class="flabel">'+esc(t(lab))+'</span><div class="opts two">';
    TIMES.forEach(n => { h += optRow(path, String(n), Number(getPath(d, path))===n, t('tm'+n)); });
    h += '</div></div>';
  });
  h += '<p class="flabel">'+esc(t('pk_prep'))+'</p><div class="inline">' +
    num('kitchen.mealPrep.cookDaysPerWeek','mp-days',t('pk_days'),'inputmode="numeric" min="0" max="7"') +
    num('kitchen.mealPrep.batchServings','mp-serv',t('pk_batch'),'inputmode="numeric" min="1" max="12"') + '</div></div>';

  h += '<div class="card"><h3>'+esc(t('p_equipment'))+'</h3><div class="opts two">';
  EQUIPMENT.forEach(e => { h += optRow('kitchen.equipment', e, K.equipment.indexOf(e)>=0, t('eq_'+e), '', true); });
  h += '</div></div>';

  h += '<div class="card"><h3>'+esc(t('p_budget'))+'</h3><p class="tiny" style="margin-bottom:9px">'+esc(t('p_budget_note'))+'</p><div class="opts two">';
  BUDGETS.forEach(b => { h += optRow('kitchen.budget', b, K.budget===b, t(b)); });
  h += '</div></div>';

  h += '<div class="btnrow" style="margin:18px 0 8px"><button class="btn wide" type="button" data-act="profile-save">'+esc(t('p_save'))+'</button></div>';
  $('#s-profile').innerHTML = h;
}

function profileMissing(d){
  const miss = [];
  const P = d.person, G = d.goals;
  if (!P.sex) miss.push(t('p_sex'));
  if (!P.age) miss.push(t('p_age'));
  if (!P.heightCm) miss.push(t('p_height'));
  if (!P.weightKg) miss.push(t('p_weight'));
  const inRange = (v,a,b) => Number(v) >= a && Number(v) <= b;
  if (P.age && !inRange(P.age,10,100)) miss.push(t('p_age')+' (10 '+t('range_to')+' 100)');
  if (P.heightCm && !inRange(P.heightCm,100,250)) miss.push(t('p_height')+' (100 '+t('range_to')+' 250)');
  if (P.weightKg && !inRange(P.weightKg,30,300)) miss.push(t('p_weight')+' (30 '+t('range_to')+' 300)');
  if (G.macroSplit.preset === 'custom'){
    const sum = Number(G.macroSplit.proteinPct)+Number(G.macroSplit.fatPct)+Number(G.macroSplit.carbPct);
    if (sum !== 100) miss.push(t('ms_sum_err'));
  }
  return miss;
}

async function saveProfile(){
  const d = S.draft;
  const miss = profileMissing(d);
  if (miss.length){ toast(t('p_missing', {list: miss.join(', ')}), 5000); return; }
  const rec = deepCopy(d);
  ['age','heightCm','weightKg','activityLevel'].forEach(k => { rec.person[k] = rec.person[k] === '' || rec.person[k] == null ? null : Number(rec.person[k]); });
  ['proteinPct','fatPct','carbPct'].forEach(k => { rec.goals.macroSplit[k] = Number(rec.goals.macroSplit[k]); });
  SLOTS.forEach(s => { rec.goals.slots[s] = Number(rec.goals.slots[s]) || 0; });
  rec.kitchen.timeWeekday = Number(rec.kitchen.timeWeekday); rec.kitchen.timeWeekend = Number(rec.kitchen.timeWeekend);
  rec.kitchen.mealPrep.cookDaysPerWeek = Number(rec.kitchen.mealPrep.cookDaysPerWeek) || 0;
  rec.kitchen.mealPrep.batchServings = Number(rec.kitchen.mealPrep.batchServings) || 1;
  const prevWeight = S.profile && S.profile.person ? S.profile.person.weightKg : null;
  const prevAge = S.profile && S.profile.person ? S.profile.person.age : null;
  if (rec.person.age !== prevAge || !rec.person.ageRecordedOn) rec.person.ageRecordedOn = localDateKey();
  await recPut(rec);
  S.profile = rec;
  if (rec.person.weightKg !== prevWeight){
    const today = localDateKey();
    const w = (await recByTypeDate('body_weight', today, today))[0];
    if (w){ w.kg = rec.person.weightKg; await recPut(w); }
    else await recPut({type:'body_weight', date: today, kg: rec.person.weightKg, source:'profile'});
  }
  await writeLocalSnapshot();
  toast(t('p_saved'));
  S.draft = null;
  go('today');
}

/* ---------- Connection tests (from v0.1) ---------- */

function testOut(id, cls, msg, verbatim){
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '<div class="notice '+cls+'">'+esc(msg)+(verbatim ? '<div class="verbatim">'+esc(verbatim)+'</div>' : '')+'</div>';
}

async function testAnthropic(){
  const fld = $('#k-anthropic');
  const key = String((fld ? fld.value : S.secrets.anthropic) || '');
  if (!key.trim()){ testOut('r-anthropic','warn', t('test_need_key')); return; }
  S.secrets.anthropic = key.trim(); await secretSet('anthropic', S.secrets.anthropic);
  testOut('r-anthropic','', t('test_running'));
  try {
    const body = await API.anthropic('/v1/models?limit=100', {method:'GET'});
    const ids = (body.data || []).map(m => m.id);
    let msg = t('anthropic_ok', {n: ids.length});
    const want = [S.prefs.models.chat, S.prefs.models.vision, S.prefs.models.analysis].filter((v,i,a) => a.indexOf(v) === i);
    const missing = want.filter(m => ids.indexOf(m) < 0 && !ids.some(id => id.indexOf(m) === 0));
    msg += ' ' + (missing.length ? t('m_check_bad', {list: missing.join(', ')}) : t('m_check_ok'));
    testOut('r-anthropic', missing.length ? 'warn' : 'good', msg);
  } catch(err){
    testOut('r-anthropic','bad', t('err_prefix'), String(err.message || err));
  }
}

function pagesRepoGuess(){
  const host = location.hostname;
  if (!/\.github\.io$/i.test(host)) return null;
  const user = host.replace(/\.github\.io$/i,'');
  const seg = location.pathname.split('/').filter(Boolean)[0];
  return {owner: user, repo: seg || host};
}

async function testGithub(){
  const fldK = $('#k-github'), fldR = $('#k-repo'), fldB = $('#k-branch');
  const key = String((fldK ? fldK.value : S.secrets.github) || '');
  if (fldR) S.prefs.backup.repo = String(fldR.value || '').trim();
  if (fldB && String(fldB.value || '').trim()) S.prefs.backup.branch = String(fldB.value).trim();
  S.secrets.github = key.trim();
  await secretSet('github', S.secrets.github);
  await savePrefs();
  const r = parseRepo();
  if (!S.secrets.github || !r){ testOut('r-github','warn', t('test_need_repo')); return; }
  testOut('r-github','', t('test_running'));
  const lines = [];
  let worst = 'good';
  try {
    const info = await ghFetch('/repos/'+r.owner+'/'+r.repo);
    if (!info.res.ok) throw new Error(ghErrorText(info));
    if (info.body.private) lines.push(t('repo_private_ok'));
    else { lines.push(t('repo_public_warn')); worst = 'bad'; }
    const pages = pagesRepoGuess();
    if (pages && pages.owner.toLowerCase() === r.owner.toLowerCase() && pages.repo.toLowerCase() === r.repo.toLowerCase()){
      lines.push(t('repo_is_pages_warn')); worst = 'bad';
    }
    await backupTarget().putFile('nutrilog-write-test.txt', 'NutriLog write test ' + new Date().toISOString() + '\n', 'NutriLog: write test');
    lines.push(t('write_ok'));
    try { await backupTarget().deleteFile('nutrilog-write-test.txt'); }
    catch(e){ lines.push(t('delete_fail')); if (worst === 'good') worst = 'warn'; }
    const existing = await backupTarget().getFile(BACKUP_LATEST);
    if (existing && !S.profile) lines.push(t('b_restore_cloud') + ': ' + BACKUP_LATEST);
    testOut('r-github', worst, lines.join(' '));
  } catch(err){
    testOut('r-github','bad', t('write_fail'), String(err.message || err));
  }
  renderBackupBar();
}

/* ---------- Settings ---------- */

function keyField(id, labelKey, value, testAct, resultId, ph){
  return '<div class="field"><label for="'+id+'">'+esc(t(labelKey))+'</label>' +
    '<div class="inline"><input id="'+id+'" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" ' +
      'data-set="secret.'+id.slice(2)+'" value="'+esc(value)+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'>' +
      '<button class="btn quiet none" type="button" data-act="toggle-secret" data-for="'+id+'">'+esc(t('k_show'))+'</button></div>' +
    (testAct ? '<div class="btnrow" style="margin-top:8px"><button class="btn quiet" type="button" data-act="'+testAct+'">'+esc(t('test_btn'))+'</button></div>' : '') +
    (resultId ? '<div id="'+resultId+'"></div>' : '') +
    '</div>';
}

function renderSettings(){
  const P = S.prefs;
  let h = '';
  h += '<div class="card"><h3>'+esc(t('set_look'))+'</h3>' +
    '<div class="field"><span class="flabel">'+esc(t('set_theme'))+'</span><div class="chips">' +
      ['device','light','dark'].map(v => '<button class="chip" type="button" data-act="theme" data-v="'+v+'" aria-pressed="'+(S.theme===v)+'">'+esc(t('th_'+v))+'</button>').join('') +
    '</div></div>' +
    '<div class="field" style="margin-bottom:0"><span class="flabel">'+esc(t('set_lang'))+'</span><div class="chips">' +
      '<button class="chip" type="button" data-act="lang" data-v="cs" aria-pressed="'+(S.lang==='cs')+'">Čeština</button>' +
      '<button class="chip" type="button" data-act="lang" data-v="en" aria-pressed="'+(S.lang==='en')+'">English</button>' +
    '</div></div></div>';

  h += '<div class="card"><h3>'+esc(t('set_profile_h'))+'</h3>' +
    '<div class="btnrow"><button class="btn quiet" type="button" data-act="go-profile">'+esc(t('set_profile_open'))+'</button></div></div>';

  h += '<div class="card"><h3>'+esc(t('set_keys_h'))+'</h3>' +
    '<p class="tiny" style="margin-bottom:12px">'+esc(t('set_keys_note'))+'</p>' +
    keyField('k-anthropic','k_anthropic', S.secrets.anthropic, 'test-anthropic', 'r-anthropic') +
    '<p class="tiny" style="margin:-4px 0 14px">'+esc(t('k_anthropic_tip'))+'</p>' +
    keyField('k-github','k_github', S.secrets.github, null, null) +
    '<div class="field"><label for="k-repo">'+esc(t('k_repo'))+'</label>' +
      '<input id="k-repo" type="text" autocapitalize="off" spellcheck="false" data-set="prefs.backup.repo" value="'+esc(P.backup.repo)+'" placeholder="'+esc(t('k_repo_ph'))+'"></div>' +
    '<div class="field"><label for="k-branch">'+esc(t('k_branch'))+'</label>' +
      '<input id="k-branch" type="text" autocapitalize="off" spellcheck="false" data-set="prefs.backup.branch" value="'+esc(P.backup.branch)+'"></div>' +
    '<div class="btnrow"><button class="btn quiet" type="button" data-act="test-github">'+esc(t('test_btn'))+'</button></div>' +
    '<div id="r-github"></div></div>';

  /* archive */
  const A = S.meta.archive;
  const counts = {archive:0, starter:0, claude:0, own:0};
  RECIPES.list.forEach(r => { counts[r.origin] = (counts[r.origin]||0) + 1; });
  h += '<div class="card"><h3>'+esc(t('arch_h'))+'</h3><p class="tiny" style="margin-bottom:10px">'+esc(t('arch_intro'))+'</p>' +
    '<div class="kv"><span class="k">'+esc(t('orig_archive'))+'</span><span class="v num">'+counts.archive+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('orig_claude'))+' / '+esc(t('orig_own'))+'</span><span class="v num">'+counts.claude+' / '+counts.own+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('orig_starter'))+'</span><span class="v num">'+counts.starter+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('arch_last'))+'</span><span class="v">'+esc(A.lastSyncAt ? fmtDateTime(A.lastSyncAt) : t('never'))+'</span></div>' +
    (A.lastError ? '<div class="notice bad" style="margin-top:8px"><div class="verbatim">'+esc(A.lastError)+'</div></div>' : '') +
    '<div class="field" style="margin-top:10px"><label for="a-path">'+esc(t('arch_path'))+'</label><input id="a-path" type="text" autocapitalize="off" spellcheck="false" data-set="prefs.archive.path" value="'+esc(P.archive.path)+'"></div>' +
    '<div class="btnrow"><button class="btn quiet" type="button" data-act="arch-sync">'+icon('refresh')+esc(t('arch_sync'))+'</button>' +
    '<button class="btn quiet" type="button" data-act="arch-import">'+icon('up')+esc(t('arch_import'))+'</button></div>' +
    '<input type="file" id="archFile" accept="application/json,.json" class="hide">' +
    '<label class="opt sq" style="margin-top:12px"><input type="checkbox" id="a-starter" '+(P.archive.showStarter ? 'checked' : '')+'><span class="mark"></span><span class="txt"><span class="t1">'+esc(t('arch_starter'))+'</span><span class="t2">'+esc(t('arch_starter_d'))+'</span></span></label></div>';

  /* models and spend */
  h += '<div class="card"><h3>'+esc(t('set_models_h'))+'</h3>' +
    ['chat','vision','analysis'].map(role =>
      '<div class="field"><label for="m-'+role+'">'+esc(t('m_'+role))+'</label>' +
      '<input id="m-'+role+'" type="text" autocapitalize="off" spellcheck="false" data-set="prefs.models.'+role+'" value="'+esc(P.models[role])+'"></div>').join('') +
    '<p class="tiny">'+esc(t('m_note'))+'</p></div>';

  const models = [P.models.chat, P.models.vision, P.models.analysis].filter((v,i,a) => a.indexOf(v) === i);
  h += '<div class="card"><h3>'+esc(t('set_price_h'))+'</h3>' +
    '<div class="field"><label for="bud">'+esc(t('bud_label'))+'</label><input id="bud" type="number" inputmode="decimal" step="1" min="0" data-set="prefs.budget.monthlyUsd" value="'+esc(P.budget.monthlyUsd)+'"></div>' +
    '<div class="kv"><span class="k">'+esc(t('bud_month'))+'</span><span class="v num">'+esc(fmtNum(monthCost(),2))+' USD</span></div>' +
    '<p class="tiny" style="margin:8px 0 10px">'+esc(t('bud_note'))+'</p>';
  models.forEach(m => {
    const pr = priceFor(m);
    h += '<p class="eyebrow" style="margin-top:6px">'+esc(m)+'</p><div class="inline">' +
      '<div class="field"><label for="pi-'+m+'">'+esc(t('price_in'))+'</label><input id="pi-'+m+'" type="number" inputmode="decimal" step="0.01" data-set="prefs.prices.'+m+'.in" value="'+esc(pr.in)+'"></div>' +
      '<div class="field"><label for="po-'+m+'">'+esc(t('price_out'))+'</label><input id="po-'+m+'" type="number" inputmode="decimal" step="0.01" data-set="prefs.prices.'+m+'.out" value="'+esc(pr.out)+'"></div>' +
      '</div>';
  });
  h += '<p class="tiny">'+esc(t('price_note'))+'</p>';
  const u = S.meta.usage;
  let cost = 0;
  for (const mid in (u.byModel || {})){
    const pr = priceFor(mid);
    cost += (u.byModel[mid].in/1e6) * pr.in + (u.byModel[mid].out/1e6) * pr.out;
  }
  h += '<div class="orn"><i></i></div><p class="eyebrow">'+esc(t('usage_h'))+'</p>' +
    '<div class="kv"><span class="k">'+esc(t('usage_calls'))+'</span><span class="v num">'+esc(fmtNum(u.calls))+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('usage_tokens_in'))+'</span><span class="v num">'+esc(fmtNum(u.inTok))+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('usage_tokens_out'))+'</span><span class="v num">'+esc(fmtNum(u.outTok))+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('usage_cost'))+'</span><span class="v num">'+esc(fmtNum(cost,2))+' USD</span></div>' +
    '<div class="btnrow" style="margin-top:8px"><button class="btn quiet" type="button" data-act="usage-reset">'+esc(t('usage_reset'))+'</button></div></div>';

  h += '<div class="card"><h3>'+esc(t('set_data_h'))+'</h3><div id="backupPanel"></div>' +
    '<div class="btnrow" style="margin-top:12px">' +
      '<button class="btn quiet" type="button" data-act="backup-now">'+icon('cloud')+esc(t('b_run_now'))+'</button>' +
      '<button class="btn quiet" type="button" data-act="export">'+icon('down')+esc(t('b_export'))+'</button>' +
    '</div><p class="tiny" style="margin-top:8px">'+esc(navigator.share ? t('b_export_note') : t('b_export_note_dl'))+'</p>' +
    '<div class="btnrow" style="margin-top:12px">' +
      '<button class="btn quiet" type="button" data-act="import">'+icon('up')+esc(t('b_import'))+'</button>' +
      '<button class="btn quiet" type="button" data-act="restore-cloud">'+icon('cloud')+esc(t('b_restore_cloud'))+'</button>' +
    '</div>' +
    '<input type="file" id="importFile" accept="application/json,.json" class="hide">' +
    '<div class="notice warn" style="margin-top:10px">'+esc(t('b_restore_warn'))+'</div>' +
    '<div class="orn"><i></i></div>' +
    '<p class="eyebrow">'+esc(t('b_snapshots_h'))+'</p>' +
    '<p class="tiny" style="margin-bottom:8px">'+esc(t('b_snapshots_note'))+'</p>' +
    '<div id="snapList"></div>' +
    '<p class="tiny" style="margin-top:12px">'+esc(t('b_secrets_note'))+'</p>' +
    '<p class="tiny" style="margin-top:8px">'+esc(t('b_format_note'))+'</p></div>';

  h += '<div class="card"><h3>'+esc(t('dg_h'))+'</h3><p class="muted">'+esc(t('dg_p'))+'</p>' +
    '<div id="diagPanel" style="margin-top:10px"></div>' +
    '<div class="btnrow" style="margin-top:12px">' +
      '<button class="btn quiet" type="button" data-act="diag-copy">'+icon('down')+esc(t('dg_copy'))+'</button>' +
    '</div></div>';

  h += '<div class="card"><h3>'+esc(t('danger_h'))+'</h3><p class="muted">'+esc(t('danger_p'))+'</p>' +
    '<div class="field" style="margin-top:12px"><label for="eraseWord">'+esc(t('danger_type',{word:t('danger_word')}))+'</label>' +
    '<input id="eraseWord" type="text" autocapitalize="characters" autocomplete="off"></div>' +
    '<div class="btnrow"><button class="btn danger" type="button" data-act="erase">'+icon('trash')+esc(t('danger_btn'))+'</button></div></div>';

  h += '<div class="card"><h3>'+esc(t('about_h'))+'</h3>' +
    '<div class="kv"><span class="k">'+esc(t('about_version'))+'</span><span class="v num">'+esc(VERSION)+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('about_schema'))+'</span><span class="v num">'+esc(SCHEMA)+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('about_fooddb'))+'</span><span class="v tiny">USDA FoodData Central, SR Legacy</span></div>' +
    '<div class="btnrow" style="margin-top:12px">' +
      '<button class="btn quiet" type="button" data-act="update-check">'+icon('refresh')+esc(t('about_update'))+'</button>' +
      (S.installPrompt ? '<button class="btn quiet" type="button" data-act="install">'+esc(t('about_install'))+'</button>' : '') +
    '</div>' +
    '<div class="orn"><i></i></div>' +
    '<p class="eyebrow">'+esc(t('about_clear_h'))+'</p><p class="tiny">'+esc(t('about_clear_p'))+'</p>' +
    '<p class="eyebrow" style="margin-top:12px">'+esc(t('about_token_h'))+'</p><p class="tiny">'+esc(t('about_token_p'))+'</p>' +
    '<p style="margin-top:10px"><a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noopener">'+esc(t('about_revoke'))+'</a></p>' +
    '</div>';

  $('#s-settings').innerHTML = h;
  renderBackupPanel();
  fillStorageInfo();
  fillSnapshots();
  renderDiagnostics();
  $('#a-starter').addEventListener('change', async e => { S.prefs.archive.showStarter = e.target.checked; await savePrefs(); });
}

/* ---------- Diagnostics (from v0.1) ---------- */

function diagRows(){
  const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches)
    || (window.matchMedia && matchMedia('(display-mode: fullscreen)').matches)
    || navigator.standalone === true;
  let sw;
  if (!('serviceWorker' in navigator)) sw = t('dg_sw_no');
  else if (navigator.serviceWorker.controller) sw = t('dg_sw_on');
  else if (S.swRegistered === true) sw = t('dg_sw_reg');
  else if (S.swRegistered === false) sw = t('dg_sw_fail');
  else sw = t('d_unknown');
  const yn = (v) => v ? t('dg_yes') : t('dg_no');
  const cam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  return [
    [t('dg_mode'), standalone ? t('dg_mode_app') : t('dg_mode_tab'), standalone ? 'ok' : 'warn'],
    [t('dg_sw'), sw, (sw === t('dg_sw_on') || sw === t('dg_sw_reg')) ? 'ok' : 'warn'],
    [t('d_persist'), S.meta.persistGranted === null ? t('d_unknown') : (S.meta.persistGranted ? t('d_persist_yes') : t('d_persist_no')), S.meta.persistGranted ? 'ok' : 'warn'],
    [t('dg_barcode'), yn('BarcodeDetector' in window), ('BarcodeDetector' in window) ? 'ok' : 'warn'],
    [t('dg_camera'), yn(cam), cam ? 'ok' : 'warn'],
    [t('dg_share'), yn(!!navigator.share), navigator.share ? 'ok' : 'warn'],
    [t('dg_fooddb'), FOODDB.ready ? t('dg_fooddb_ok', {n: FOODDB.foods.length}) : t('dg_fooddb_no'), FOODDB.ready ? 'ok' : 'warn'],
    [t('dg_engine'), navigator.userAgent, '']
  ];
}

function renderDiagnostics(){
  const host = $('#diagPanel');
  if (!host) return;
  const rows = diagRows();
  const standalone = rows[0][2] === 'ok';
  host.innerHTML = rows.map(r =>
      r[0] === t('dg_engine')
        ? '<div style="margin-top:8px"><span class="k">'+esc(r[0])+'</span><div class="verbatim">'+esc(r[1])+'</div></div>'
        : '<div class="kv"><span class="k">'+esc(r[0])+'</span><span class="v">'+esc(r[1])+'</span></div>'
    ).join('') +
    (standalone ? '' : '<div class="notice warn" style="margin-top:10px">'+esc(t('dg_note_tab'))+'</div>');
}

async function copyDiagnostics(){
  const lines = ['NutriLog ' + VERSION + ' / schema ' + SCHEMA].concat(diagRows().map(r => r[0] + ': ' + r[1]));
  const txt = lines.join('\n');
  try {
    await navigator.clipboard.writeText(txt);
    toast(t('dg_copied'));
  } catch(e) {
    openSheet(esc(t('dg_h')), '<div class="verbatim" style="user-select:text">'+esc(txt)+'</div><p class="tiny" style="margin-top:10px">'+esc(t('dg_copyfail'))+'</p>');
  }
}

function renderBackupPanel(){
  const host = $('#backupPanel');
  if (!host) return;
  const b = S.meta.backup;
  const stale = backupHoursStale() > 48;
  host.innerHTML =
    '<div class="kv"><span class="k">'+esc(t('b_target'))+'</span><span class="v">'+esc(backupConfigured() ? backupTarget().describe() : t('b_target_none'))+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('b_last'))+'</span><span class="v">'+
      (b.lastVerifiedAt ? esc(fmtDateTime(b.lastVerifiedAt)+' ('+ago(b.lastVerifiedAt)+')') : '<span class="pill '+(stale?'err':'wait')+'">'+esc(t('b_never'))+'</span>') +
    '</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('b_next'))+'</span><span class="v"><span class="pill '+(b.state==='error'?'err':b.state==='idle'?'ok':'wait')+'">'+esc(t('b_state_'+b.state))+'</span></span></div>' +
    '<div class="kv"><span class="k">'+esc(t('d_size'))+'</span><span class="v num" id="szUsed">'+esc(t('loading'))+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('d_persist'))+'</span><span class="v" id="szPersist">'+esc(t('d_unknown'))+'</span></div>' +
    (b.lastError ? '<div class="notice bad" style="margin-top:10px"><b>'+esc(t('b_last_error'))+'</b> '+esc(fmtDateTime(b.lastErrorAt))+'<div class="verbatim">'+esc(b.lastError)+'</div></div>' : '');
  fillStorageInfo();
}

async function fillStorageInfo(){
  const used = $('#szUsed'), per = $('#szPersist');
  if (!used) return;
  try {
    const est = await navigator.storage.estimate();
    used.textContent = (est.usage/1024 < 1024) ? fmtNum(est.usage/1024,1) + ' kB' : fmtNum(est.usage/1048576,2) + ' MB';
  } catch(e){ used.textContent = t('d_unknown'); }
  if (per){
    let ok = S.meta.persistGranted;
    try { if (navigator.storage && navigator.storage.persisted) ok = await navigator.storage.persisted(); } catch(e){}
    per.textContent = ok === null ? t('d_unknown') : (ok ? t('d_persist_yes') : t('d_persist_no'));
  }
}

async function fillSnapshots(){
  const host = $('#snapList');
  if (!host) return;
  const all = await dbAll('snapshots');
  all.sort((a,b) => a.date < b.date ? 1 : -1);
  if (!all.length){ host.innerHTML = '<p class="muted">'+esc(t('b_snapshot_none'))+'</p>'; return; }
  host.innerHTML = all.map(s =>
    '<div class="kv"><span class="k num">'+esc(s.date)+'</span>' +
    '<span class="v"><button class="btn quiet" type="button" style="min-height:36px;padding:6px 14px" data-act="snap-restore" data-date="'+esc(s.date)+'">'+esc(t('b_snapshot_restore'))+'</button></span></div>').join('');
}
