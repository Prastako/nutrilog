/* ============================================================
   Profile (body data, diet goals, food preferences, kitchen) and
   settings (keys, models, budget, archive, backup, diagnostics).
   ============================================================ */

/* ---------- Profile ---------- */

function blankProfile(){
  return {
    id:'profile', type:'profile', schema:2,
    person:{ sex:'', age:null, ageRecordedOn:null, heightCm:null, weightKg:null, bodyFatPct:null, periods:'skip', activityLevel:2, activityDetail:{ on:false, base:1, sessions:0, minutes:60, type:'strength', attendance:'usually' } },
    goals:{ direction:'maintain', macroSplit:{preset:'balanced', proteinPct:25, fatPct:30, carbPct:45},
      dietStyle:[], aims:[], focusNutrients:[], notes:'', slots: deepCopy(DEFAULT_SLOTS), focus:[], hints:[] },
    food:{ exclusions:[], cuisines:[], cuisineOther:'', dislikes:'',
      pattern:'everything', patternOpts:{noEggs:false, noMilk:false}, conditions:[], rules:[], prefs:[] },
    kitchen:{ timeWeekday:2, timeWeekend:3, equipment:[], mealPrep:{cookDaysPerWeek:3, batchServings:3} }
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

/* Live preview of macro and slot splits from splitPreview() */
function previewParts(d){
  const x = splitPreview(d);
  if (!x) return { macro: '', slots: '' };
  var macro = '<p class="tiny">' + esc(t('ms_preview', {kcal: fmtNum(x.kcal, 0), p: fmtNum(x.p, 0), pkg: fmtNum(x.pkg, 1), f: fmtNum(x.f, 0), c: fmtNum(x.c, 0)})) + '</p>';
  if (x.fatHigh) macro += '<div class="notice warn">' + esc(t('ms_fat_high')) + '</div>';
  if (x.pkg > 2.2) macro += '<div class="notice warn">' + esc(t('ms_prot_high')) + '</div>';
  var list = x.slots.map(function(s){ return t('slot_'+s.slot) + ' ' + fmtNum(s.kcal, 0) + ' kcal'; });
  var slots = '<p class="tiny">' + esc(t('slot_preview', {kcal: fmtNum(x.kcal, 0), list: list.join(', ')})) + '</p>';
  return { macro, slots };
}

const AD_TYPES = ['strength','heavy','cycling','cyclinghard','circuits','hiit','climbing','yoga'];
function adResultText(d){
  var a = d.person.activityDetail || {};
  var n = Math.round(Math.round(trainingPerDay(Object.assign({}, a, {on:true}), d.person.weightKg) * 1e6) / 1e6);
  return t('ad_result', {kcal: n});
}

function updateProfilePreview(){
  var box = document.getElementById('adResultBox');
  if (box) box.textContent = adResultText(S.draft);
  var x = previewParts(S.draft);
  var mb = document.getElementById('macroPreviewBox');
  if (mb) mb.innerHTML = x.macro;
  var sb = document.getElementById('slotPreviewBox');
  if (sb) sb.innerHTML = x.slots;
  var chips = document.querySelectorAll('[data-act="slot-preset"]');
  for (var i = 0; i < chips.length; i++){
    chips[i].setAttribute('aria-pressed', String(slotPresetId(S.draft.goals.slots) === chips[i].getAttribute('data-id')));
  }
}

function slotPresetChips(G){
  var current = slotPresetId(G.slots);
  var h = '<p class="tiny">'+esc(t('slp_intro'))+'</p><div class="chips" style="margin-bottom:10px">';
  for (var i = 0; i < SLOT_PRESETS.length; i++){
    var p = SLOT_PRESETS[i];
    h += '<button class="chip" type="button" data-act="slot-preset" data-id="'+p.id+'" aria-pressed="'+(current === p.id)+'">'+esc(t('slp_'+p.id))+'</button>';
  }
  h += '</div>';
  return h;
}

function renderProfile(){
  const d = S.draft || (S.draft = S.profile ? mergeDefaults(migrateDietV3(S.profile), blankProfile()) : blankProfile());
  const P = d.person, G = d.goals, F = d.food, K = d.kitchen;
  const num = (path, id, label, attrs, hint) => '<div class="field"><label for="'+id+'">'+esc(label)+'</label><input id="'+id+'" type="number" '+attrs+' data-bind="'+path+'" value="'+esc(getPath(d, path) == null ? '' : getPath(d, path))+'">'+(hint ? '<span class="fhint">'+esc(hint)+'</span>' : '')+'</div>';
  let h = '<p class="muted">'+esc(t('p_intro'))+'</p><div class="orn"><i></i></div>';

  const goalsFrom = h.length;
  h += '<div class="card"><h3>'+esc(t('p_basics'))+'</h3>';
  h += '<div class="inline">' + num('person.age','f-age',t('p_age'),'inputmode="numeric" min="10" max="100"',t('p_years')) +
       num('person.heightCm','f-height',t('p_height'),'inputmode="numeric" min="100" max="250"',t('p_hint_height')) +
       num('person.weightKg','f-weight',t('p_weight_short'),'inputmode="decimal" step="0.1" min="30" max="300"',t('p_kg')) + '</div>';
  h += num('person.bodyFatPct','f-bf',t('p_bf'),'inputmode="decimal" step="0.5" min="3" max="60"');
  h += '<p class="tiny" style="margin-top:6px">'+esc(t('p_bf_note'))+'</p>';
  h += '<p class="tiny" style="margin-top:10px">'+esc(t('p_energy_note'))+'</p>';
  h += '</div>';

  h += '<div class="card"><h3>'+esc(t('p_direction'))+'</h3><div class="opts">' +
       ['lose','maintain','gain'].map(v => optRow('goals.direction', v, G.direction===v, t('dir_'+v), t('dir_'+v+'_d'))).join('') + '</div></div>';

  var AD = P.activityDetail || {};
  var on = AD.on === true;
  h += '<div class="card"><h3>'+esc(t('p_activity'))+'</h3><p class="tiny" style="margin-bottom:9px">'+esc(t('p_activity_note'))+'</p>';
  if (!on){
    h += '<div class="opts">';
    ACTIVITY.forEach(a => { h += optRow('person.activityLevel', String(a.id), Number(P.activityLevel)===a.id, t(a.k+'_t'), t(a.k+'_d')); });
    h += '</div>';
  }
  h += '<div class="opts" style="margin-top:10px"><label class="opt sq"><input type="checkbox" role="switch" name="person.activityDetail.on" value="1"' + (on ? ' checked' : '') + '><span class="mark"></span><span class="txt"><span class="t1">'+esc(t('ad_toggle'))+'</span></span></label></div>';
  if (on){
    h += '<p class="tiny" style="margin-top:10px">'+esc(t('ad_note'))+'</p>';
    var b = Number(AD.base);
    if (b < 1 || b > 4) b = 1;
    h += '<p class="flabel" style="margin-top:12px">'+esc(t('ad_base'))+'</p><div class="opts">';
    for (var n = 1; n <= 4; n++) { h += optRow('person.activityDetail.base', String(n), b === n, t('ad_b'+n)); }
    h += '</div>';
    h += '<div class="inline" style="margin-top:12px">' +
      num('person.activityDetail.sessions','ad-sessions',t('ad_sessions'),'inputmode="numeric" step="1" min="0" max="14"') +
      num('person.activityDetail.minutes','ad-minutes',t('ad_minutes'),'inputmode="numeric" step="5" min="10" max="240"') + '</div>';
    var ty = AD.type;
    if (AD_TYPES.indexOf(ty) === -1) ty = 'strength';
    h += '<div class="field"><label for="ad-type">'+esc(t('ad_type'))+'</label><select id="ad-type" data-bind="person.activityDetail.type">';
    for (var ti = 0; ti < AD_TYPES.length; ti++) {
      var k = AD_TYPES[ti];
      h += '<option value="'+k+'"'+(k === ty ? ' selected' : '')+'>'+esc(t('at_'+k))+'</option>';
    }
    h += '</select></div>';
    var at = AD.attendance;
    if (at !== 'always' && at !== 'usually' && at !== 'sometimes') at = 'usually';
    h += '<p class="flabel" style="margin-top:12px">'+esc(t('ad_att'))+'</p><div class="opts">';
    ['always','usually','sometimes'].forEach(function(v) { h += optRow('person.activityDetail.attendance', v, v === at, t('aa_'+v)); });
    h += '</div>';
    h += '<p class="tiny" id="adResultBox" style="margin-top:10px">'+esc(adResultText(d))+'</p>';
  }
  h += '</div>';

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
  h += '<div id="macroPreviewBox">' + previewParts(d).macro + '</div>';
  h += '</div>';

  /* What you eat card */
  h += '<div class="card"><h3>' + esc(t('pw_h')) + '</h3><p class="tiny" style="margin-bottom:10px">' + esc(t('pw_intro')) + '</p><div class="opts">' +
    PATTERNS.map(v => optRow('food.pattern', v, F.pattern === v, t('fp_' + v), t('fp_' + v + '_d'))).join('') + '</div>';
  if (F.pattern === 'vegetarian'){
    h += '<div class="opts two" style="margin-top:10px">' +
      optRow('food.patternOpts.noEggs', '1', !!(F.patternOpts || {}).noEggs, t('fpo_noeggs'), '', true) +
      optRow('food.patternOpts.noMilk', '1', !!(F.patternOpts || {}).noMilk, t('fpo_nomilk'), '', true) + '</div>';
  }
  if (F.pattern === 'carnivore'){
    h += '<div class="notice warn" style="margin-top:10px">' + esc(t('fp_carnivore_warn')) + '</div>';
  }
  h += '</div>';

  /* Meals through the day card */
  h += '<div class="card"><h3>' + esc(t('pm_h')) + '</h3>' + slotPresetChips(G) + '<div class="inline">' +
    SLOTS.map(s => num('goals.slots.'+s, 'sl-'+s, t('slot_'+s), 'inputmode="numeric" min="0" max="80"')).join('') + '</div>' +
    '<p class="tiny">' + esc(t('pg_slots_note')) + '</p>' +
    '<div id="slotPreviewBox">' + previewParts(d).slots + '</div></div>';

  if (!moduleOn('goals')) h = h.slice(0, goalsFrom);
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

  /* Health conditions & Food rules card */
  h += '<div class="card"><h3>' + esc(t('fc_h')) + '</h3>' +
    chipSet('pchip-conditions', CONDITIONS, F.conditions || [], v => t('fc_' + v));
  (F.conditions || []).forEach(function(c){
    h += '<p class="tiny" style="margin-top:8px">' + esc(t('fc_note_' + c)) + '</p>';
  });
  h += '<p class="flabel" style="margin-top:14px">' + esc(t('fr_h')) + '</p>' +
    chipSet('pchip-rules', FOOD_RULES, F.rules || [], v => t('fr_' + v)) +
    '<p class="tiny" style="margin-top:8px">' + esc(t('fr_note')) + '</p></div>';

  /* Fine-tune section */
  const cur = (P.periods === 'yes' || P.periods === 'no' || P.periods === 'skip') ? P.periods : 'skip';
  h += '<details class="card" id="ftBox"' + (S.ftOpen ? ' open' : '') + '><summary><h3 style="display:inline">' + esc(t('ft_summary')) + '</h3></summary>' +
    '<p class="flabel" style="margin-top:12px">' + esc(t('p_periods')) + '</p><div class="opts">' +
    optRow('person.periods','yes',cur==='yes',t('p_periods_yes')) +
    optRow('person.periods','no',cur==='no',t('p_periods_no')) +
    optRow('person.periods','skip',cur==='skip',t('p_periods_skip')) +
    '</div><p class="tiny" style="margin-top:6px">' + esc(t('p_periods_note')) + '</p>' +
    '<p class="flabel" style="margin-top:14px">' + esc(t('ft_focus')) + '</p>' +
    chipSet('pchip-focus', HEALTH_FOCUS, G.focus || [], v => v === 'mediterranean' ? t('ds_mediterranean') : t('aim_' + v)) +
    '<p class="flabel" style="margin-top:14px">' + esc(t('ft_hints')) + '</p>' +
    chipSet('pchip-hints', SOFT_HINTS, G.hints || [], v => t('aim_' + v)) +
    '<p class="flabel" style="margin-top:14px">' + esc(t('ft_prefs')) + '</p>' +
    chipSet('pchip-prefs', FOOD_PREFS, F.prefs || [], v => t('pf_' + v)) +
    '<p class="flabel" style="margin-top:14px">' + esc(t('pg_focus')) + '</p>' +
    chipSet('pchip-focusNutrients', FOCUS_CHOICES, G.focusNutrients, nutLabel) +
    '<div class="field" style="margin-top:14px"><label for="g-notes">'+esc(t('pg_notes'))+'</label><textarea id="g-notes" data-bind="goals.notes" placeholder="'+esc(t('pg_notes_ph'))+'">'+esc(G.notes||'')+'</textarea></div>' +
    '</details>';

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

  /* brief nutrilog-260930-money-profile: no Food budget card; Kitchen equipment is followed by Save profile */

  h += '<div class="btnrow" style="margin:18px 0 8px"><button class="btn wide" type="button" data-act="profile-save">'+esc(t('p_save'))+'</button></div>';
  $('#s-profile').innerHTML = h;
}

function profileMissing(d){
  const miss = [];
  if (!moduleOn('goals')) return miss;
  const P = d.person, G = d.goals;
  if (!P.age) miss.push(t('p_age'));
  if (!P.weightKg) miss.push(t('p_weight'));
  const inRange = (v,a,b) => Number(v) >= a && Number(v) <= b;
  if (P.age && !inRange(P.age,10,100)) miss.push(t('p_age')+' (10 '+t('range_to')+' 100)');
  if (P.heightCm && !inRange(P.heightCm,100,250)) miss.push(t('p_height')+' (100 '+t('range_to')+' 250)');
  if (P.weightKg && !inRange(P.weightKg,30,300)) miss.push(t('p_weight')+' (30 '+t('range_to')+' 300)');
  if (P.bodyFatPct != null && P.bodyFatPct !== '' && !inRange(P.bodyFatPct,3,60)) miss.push(t('p_bf')+' (3 '+t('range_to')+' 60)');
  if (G.macroSplit.preset === 'custom'){
    const sum = Number(G.macroSplit.proteinPct)+Number(G.macroSplit.fatPct)+Number(G.macroSplit.carbPct);
    if (sum !== 100) miss.push(t('ms_sum_err'));
  }
  if (P.activityDetail && P.activityDetail.on === true){
    var adS = P.activityDetail.sessions;
    if (adS != null && adS !== '' && !(Number(adS) >= 0 && Number(adS) <= 14)) miss.push(t('ad_sessions')+' (0 '+t('range_to')+' 14)');
    var adM = P.activityDetail.minutes;
    if (adM != null && adM !== '' && !(Number(adM) >= 10 && Number(adM) <= 240)) miss.push(t('ad_minutes')+' (10 '+t('range_to')+' 240)');
  }
  return miss;
}

async function saveProfile(){
  const d = S.draft;
  const miss = profileMissing(d);
  if (miss.length){ toast(t('p_missing', {list: miss.join(', ')}), 5000); return; }
  const rec = deepCopy(d);
  ['age','heightCm','weightKg','bodyFatPct','activityLevel'].forEach(k => { rec.person[k] = rec.person[k] === '' || rec.person[k] == null ? null : Number(rec.person[k]); });
  if (rec.person.periods !== 'yes' && rec.person.periods !== 'no' && rec.person.periods !== 'skip') { rec.person.periods = 'skip'; }
  if (rec.person.activityDetail){
    var ad = rec.person.activityDetail;
    ad.on = ad.on === true;
    ad.base = Number(ad.base);
    if (ad.base < 1 || ad.base > 4) ad.base = 1;
    if (ad.sessions === '' || ad.sessions == null) ad.sessions = 0; else ad.sessions = Number(ad.sessions);
    if (ad.minutes === '' || ad.minutes == null) ad.minutes = 60; else ad.minutes = Number(ad.minutes);
  }
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
  if (S.afterStart){ S.afterStart = false; S.recipeTab = 'all'; go('recipes'); }
  else go('today');
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
  h += '<!--cat:look-->';
  h += '<div class="card"><h3>'+esc(t('set_look'))+'</h3>' +
    '<div class="field"><span class="flabel">'+esc(t('set_lookpick'))+'</span><div class="looks">' +
      LOOKS.map(l => '<button class="looktile" type="button" data-act="look" data-v="'+l.id+'" aria-pressed="'+(lookOf(S.look).id===l.id)+'" style="background:'+l.dark.ground+';color:'+l.dark.ink+';--lk-accent:'+l.dark.accent+'">' +
        '<span class="lk-dots"><i style="background:'+l.dark.ground+'"></i><i style="background:'+l.dark.ink+'"></i><i style="background:'+l.dark.accent+'"></i></span>' +
        '<span class="lk-name">'+esc(l.name)+'</span></button>').join('') +
    '</div></div>' +
    '<div class="field"><span class="flabel">'+esc(t('set_type'))+'</span><div class="looks">' +
      TYPES.map(ty => '<button class="looktile" type="button" data-act="type" data-v="'+ty.id+'" aria-pressed="'+(typeOf(S.type).id===ty.id)+'" style="background:var(--bg);color:var(--ink);--lk-accent:var(--accent)">' +
        '<span class="lk-name" style="font-family:\''+ty.display+'\'">'+esc(t('type_'+ty.id))+'</span>' +
        '<span class="tiny" style="font-family:\''+ty.body+'\'">'+esc(t('type_sample'))+'</span></button>').join('') +
    '</div></div>' +
    '<div class="field"><span class="flabel">'+esc(t('set_theme'))+'</span><div class="seg">' +
      ['device','light','dark'].map(v => '<button type="button" class="'+(S.theme===v?'on':'')+'" data-act="theme" data-v="'+v+'" aria-pressed="'+(S.theme===v)+'">'+esc(t('th_'+v))+'</button>').join('') +
    '</div></div>' +
    '<div class="field" style="margin-bottom:0"><span class="flabel">'+esc(t('set_lang'))+'</span><div class="seg">' +
      '<button type="button" class="'+(S.lang==='cs'?'on':'')+'" data-act="lang" data-v="cs" aria-pressed="'+(S.lang==='cs')+'">Čeština</button>' +
      '<button type="button" class="'+(S.lang==='en'?'on':'')+'" data-act="lang" data-v="en" aria-pressed="'+(S.lang==='en')+'">English</button>' +
    '</div></div>' +
    (moduleOn('logging') ? '<label class="opt sq" style="margin-top:12px"><input type="checkbox" id="qmSwitch" '+(quickSaved() ? 'checked' : '')+'><span class="mark"></span><span class="txt"><span class="t1">'+esc(t('qm_title'))+'</span><span class="t2">'+esc(t('qm_note'))+'</span></span></label>' : '') + '</div>';

  h += '<!--cat:features-->';
  h += featuresCardHtml();
  h += '<!--cat:supps--><div class="card" id="suppScreen"></div>';

  h += '<!--cat:claude-->';
  h += '<div class="card"><h3>'+esc(t('set_keys_h'))+'</h3>' +
    '<p class="tiny" style="margin-bottom:12px">'+esc(t('set_keys_note'))+'</p>' +
    (moduleOn('assistant') ? keyField('k-anthropic','k_anthropic', S.secrets.anthropic, 'test-anthropic', 'r-anthropic') + '<p class="tiny" style="margin:-4px 0 14px">'+esc(t('k_anthropic_tip'))+'</p>' : '') +
    '</div>';

  /* archive */
  h += '<!--cat:recipes-->';
  const A = S.meta.archive;
  const counts = {archive:0, starter:0, claude:0, own:0};
  RECIPES.list.forEach(r => { counts[r.origin] = (counts[r.origin]||0) + 1; });
  h += '<div class="card"><h3>'+esc(t('arch_h'))+'</h3><p class="tiny" style="margin-bottom:10px">'+esc(t('arch_intro'))+'</p>' +
    '<div class="kv"><span class="k">'+esc(t('orig_catalog'))+'</span><span class="v num">'+(S.meta.catalog.count || counts.catalog || 0)+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('arch_last'))+'</span><span class="v">'+esc(S.meta.catalog.lastOkAt ? fmtDateTime(S.meta.catalog.lastOkAt) : t('never'))+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('orig_archive'))+'</span><span class="v num">'+counts.archive+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('orig_claude'))+' / '+esc(t('orig_own'))+'</span><span class="v num">'+counts.claude+' / '+counts.own+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('orig_starter'))+'</span><span class="v num">'+counts.starter+'</span></div>' +
    '<div class="btnrow">' +
    '<button class="btn quiet" type="button" data-act="arch-import">'+icon('up')+esc(t('arch_load'))+'</button></div>' +
    '<input type="file" id="archFile" accept="application/json,.json" class="hide">' +
    '<label class="opt sq" style="margin-top:12px"><input type="checkbox" id="a-starter" '+(P.archive.showStarter ? 'checked' : '')+'><span class="mark"></span><span class="txt"><span class="t1">'+esc(t('arch_starter'))+'</span><span class="t2">'+esc(t('arch_starter_d'))+'</span></span></label></div>';

  /* models (brief nutrilog-260930-money-spend: the Spend card is gone) */
  const aiFrom = h.length;
  h += '<!--cat:claude-->';
  h += '<div class="card"><h3>'+esc(t('set_models_h'))+'</h3>' +
    ['chat','vision','analysis'].map(role =>
      '<div class="field"><label for="m-'+role+'">'+esc(t('m_'+role))+'</label>' +
      '<input id="m-'+role+'" type="text" autocapitalize="off" spellcheck="false" data-set="prefs.models.'+role+'" value="'+esc(P.models[role])+'"></div>').join('') +
    '<p class="tiny">'+esc(t('m_note'))+'</p></div>';


  if (!moduleOn('assistant')) h = h.slice(0, aiFrom);
  h += '<!--cat:sync-->';
  h += syncCardHtml();
  h += '<!--cat:backup-->';
  h += '<div class="card"><h3>'+esc(t('set_data_h'))+'</h3>' +
    '<div class="btnrow" style="margin-top:12px">' +
      '<button class="btn quiet" type="button" data-act="export">'+icon('down')+esc(t('b_export'))+'</button>' +
    '</div><p class="tiny" style="margin-top:8px">'+esc(navigator.share ? t('b_export_note') : t('b_export_note_dl'))+'</p>' +
    '<div class="btnrow" style="margin-top:12px">' +
      '<button class="btn quiet" type="button" data-act="import">'+icon('up')+esc(t('b_import'))+'</button>' +
    '</div>' +
    '<input type="file" id="importFile" accept="application/json,.json" class="hide">' +
    '<div class="notice warn" style="margin-top:10px">'+esc(t('b_restore_warn'))+'</div>' +
    '<div class="orn"><i></i></div>' +
    '<p class="eyebrow">'+esc(t('b_snapshots_h'))+'</p>' +
    '<p class="tiny" style="margin-bottom:8px">'+esc(t('b_snapshots_note'))+'</p>' +
    '<div id="snapList"></div>' +
    '<p class="tiny" style="margin-top:12px">'+esc(t('b_secrets_note'))+'</p>' +
    '<p class="tiny" style="margin-top:8px">'+esc(t('b_format_note'))+'</p></div>';

  h += '<!--cat:diag-->';
  h += '<div class="card"><h3>'+esc(t('dg_h'))+'</h3><p class="muted">'+esc(t('dg_p'))+'</p>' +
    '<div id="diagPanel" style="margin-top:10px"></div>' +
    '<div class="btnrow" style="margin-top:12px">' +
      '<button class="btn quiet" type="button" data-act="diag-copy">'+icon('down')+esc(t('dg_copy'))+'</button>' +
    '</div></div>';

  h += '<!--cat:danger-->';
  h += '<div class="card"><h3>'+esc(t('danger_h'))+'</h3><p class="muted">'+esc(t('danger_p'))+'</p>' +
    '<div class="field" style="margin-top:12px"><label for="eraseWord">'+esc(t('danger_type',{word:t('danger_word')}))+'</label>' +
    '<input id="eraseWord" type="text" autocapitalize="characters" autocomplete="off"></div>' +
    '<div class="btnrow"><button class="btn danger" type="button" data-act="erase">'+icon('trash')+esc(t('danger_btn'))+'</button></div></div>';

  h += '<!--cat:about-->';
  h += '<div class="card"><h3>'+esc(t('about_h'))+'</h3>' +
    '<div class="kv"><span class="k">'+esc(t('about_version'))+'</span><span class="v num">'+esc(VERSION)+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('about_schema'))+'</span><span class="v num">'+esc(SCHEMA)+'</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('about_fooddb'))+'</span><span class="v tiny">USDA FoodData Central, SR Legacy</span></div>' +
    '<div class="kv"><span class="k">'+esc(t('about_products'))+'</span><span class="v tiny">Open Food Facts (openfoodfacts.org), ODbL</span></div>' +
    '<div class="btnrow" style="margin-top:12px">' +
      '<button class="btn quiet" type="button" data-act="update-check">'+icon('refresh')+esc(t('about_update'))+'</button>' +
      (S.installPrompt ? '<button class="btn quiet" type="button" data-act="install">'+esc(t('about_install'))+'</button>' : '') +
    '</div>' +
    '<div class="orn"><i></i></div>' +
    '<p class="eyebrow">'+esc(t('about_clear_h'))+'</p><p class="tiny">'+esc(t('about_clear_p'))+'</p>' +
    '</div>';

  h = settingsLayout(h);
  $('#s-settings').innerHTML = h;
  bindFeatures();
  if (S.settingsCat === 'supps') openSuppManager($('#suppScreen'));
  bindSyncCard();
  renderBackupPanel();
  fillStorageInfo();
  fillSnapshots();
  renderDiagnostics();
  $('#a-starter').addEventListener('change', async e => { S.prefs.archive.showStarter = e.target.checked; await savePrefs(); });
  if ($('#qmSwitch')) $('#qmSwitch').addEventListener('change', e => setQuickMode(e.target.checked));
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

function featuresCardHtml() {
  let html = '<div class="card"><h3>' + esc(t('mod_h')) + '</h3>';
  for (const name of MODULES) {
    html += '<label class="opt sq"><input type="checkbox" id="mod-' + name + '" data-mod="' + name + '"'
        + (moduleOn(name) ? ' checked' : '') + '><span class="mark"></span>'
        + '<span class="txt"><span class="t1">' + esc(t('mod_' + name)) + '</span>'
        + '<span class="t2">' + esc(t('mod_' + name + '_d')) + '</span></span></label>';
  }
  html += '</div>';
  return html;
}

function bindFeatures() {
  for (const name of MODULES) {
    const el = $('#mod-' + name);
    if (el) {
      el.addEventListener('change', async e => {
        const keys = setModule(name, e.target.checked);
        await savePrefs();
        for (const key of keys) { toast(t(key)); }
        renderTabs(); refreshChrome(); renderSettings();
      });
    }
  }
}

/* ---------- Settings categories (brief settings-screens) ---------- */

const SETTINGS_GROUPS = [
  ['st_personal', ['look', 'profile', 'features', 'supps', 'recipes', 'sync']],
  ['st_advanced', ['claude', 'backup', 'diag', 'danger', 'about']]
];
function settingsRowOn(cat){
  if (cat === 'profile') return moduleOn('goals');
  if (cat === 'supps') return moduleOn('supplements');
  if (cat === 'claude') return moduleOn('assistant');
  if (!SETTINGS_GROUPS.some(g => g[1].indexOf(cat) >= 0)) return false;
  return true;
}
function settingsListHtml(){
  return SETTINGS_GROUPS.map(([head, cats]) => '<p class="eyebrow">'+esc(t(head))+'</p><div class="card" style="padding-top:6px;padding-bottom:6px">' +
    cats.filter(settingsRowOn).map(c => '<button class="rowbtn" type="button" ' + (c === 'profile' ? 'data-act="go-profile"' : 'data-act="set-cat" data-v="'+c+'"') + '>' +
      '<span class="k">'+esc(t('st_'+c))+'</span><span class="plus">›</span></button>').join('') + '</div>').join('');
}
/* The cards carry <!--cat:x--> marks; the list shows alone, or one category shows and the others stay hidden. */
function settingsLayout(h){
  if (S.settingsCat && !settingsRowOn(S.settingsCat)) S.settingsCat = null;
  const parts = h.split(/<!--cat:([a-z]+)-->/);
  let out = parts[0];
  for (let i = 1; i < parts.length; i += 2)
    out += '<div class="setcat'+(S.settingsCat === parts[i] ? '' : ' hide')+'" data-cat="'+parts[i]+'">' + parts[i+1] + '</div>';
  return (S.settingsCat ? '' : settingsListHtml()) + out;
}
function openSettingsCat(cat){
  S.settingsCat = cat;
  try { history.pushState({screen:'settings', cat: cat}, '', '#settings'); } catch(e){}
  refreshChrome();
  renderSettings();
  window.scrollTo(0, 0);
}
