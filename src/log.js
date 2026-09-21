/* ============================================================
   Today, the diary, adding food, supplements.
   ============================================================ */

/* ---------- Today ---------- */

async function renderToday(){
  const host = $('#s-today');
  const now = new Date();
  const today = localDateKey();
  let h = '<p class="eyebrow">'+esc(fmtLongDate(now))+'</p>';

  if (!S.profile){
    h += '<div class="card"><h2>'+esc(t('today_noprofile_h'))+'</h2>' +
         '<p class="muted">'+esc(t('today_noprofile_p'))+'</p>' +
         '<div class="btnrow" style="margin-top:12px"><button class="btn" type="button" data-act="go-profile">'+esc(t('today_setup_btn'))+'</button></div></div>';
  }
  const g = computeTargets(S.profile);
  const d = await dayTotals(today);
  const tot = d.total;
  const eaten = tot.kcal || 0;

  h += '<div class="band">';
  h += '<p class="eyebrow">'+esc(t('td_eaten'))+'</p>';
  h += '<div class="val num">'+esc(fmtNum(eaten))+'<span class="unit">'+esc(t('kcal'))+'</span></div>';
  if (g){
    h += rangeBar(eaten, g.low, g.high, 'progress');
    const left = g.low - eaten, leftHigh = g.high - eaten;
    h += '<p class="tiny num" style="margin-top:6px">' + esc(t('td_range', {a: fmtNum(g.low), b: fmtNum(g.high)})) + ' · ' +
      esc(left > 0 ? t('td_left', {a: fmtNum(left), b: fmtNum(leftHigh)}) : leftHigh >= 0 ? t('td_inrange', {b: fmtNum(leftHigh)}) : t('td_over', {n: fmtNum(-leftHigh)})) + '</p>';
    h += '<button class="linkbtn" type="button" data-act="why-range">'+esc(t('why_range_btn'))+'</button>';
  }
  h += '</div>';

  if (g){
    h += '<div class="macro">';
    [['p','prot','macro_p'],['f','fat','macro_f'],['c','carb','macro_c']].forEach(([m, k, lab]) => {
      const v = tot[k] || 0, lo = g.macros[m].low, hi = g.macros[m].high;
      h += '<div class="m '+m+'"><div class="k">'+esc(t(lab))+'</div><div class="v num">'+esc(fmtNum(v))+'</div>' +
        '<div class="u num">'+esc(fmtNum(lo))+'–'+esc(fmtNum(hi))+' g</div>'+rangeBar(v, lo, hi, 'progress')+'</div>';
    });
    h += '</div>';
    /* v0.1 protein notes, kept */
    if (S.profile.goals && S.profile.goals.direction === 'lose' && g.proteinPerKg.low < 1.2)
      h += '<div class="notice" style="margin-top:8px">'+esc(t('protein_low_note'))+'</div>';
    if (g.proteinPerKg.high > 2.2)
      h += '<div class="notice" style="margin-top:8px">'+esc(t('protein_high_note'))+'</div>';
    const fib = tot.fib || 0;
    h += '<div class="card flat" style="margin-top:12px;padding:12px 14px"><div class="kv" style="border:0;padding:0 0 6px"><span class="k">'+esc(t('nut_fib'))+'</span><span class="v num">'+esc(fmtNum(fib))+' / 25 g</span></div>'+rangeBar(fib, 25, 40, 'progress')+'</div>';
  }

  /* meals */
  h += '<div class="orn"><i></i></div><div class="card"><h3 style="margin-bottom:6px">'+esc(t('td_meals'))+'</h3>';
  SLOTS.forEach(s => {
    const n = d.bySlot[s];
    const cnt = d.entries.filter(e => e.slot === s).length;
    h += '<button class="rowbtn" type="button" data-act="add-food" data-slot="'+s+'"><span class="k">'+esc(t('slot_'+s))+'</span>' +
      '<span class="v num">'+(cnt ? esc(fmtNum(n.kcal||0))+' kcal' : '<span class="tiny">'+esc(t('td_add'))+'</span>')+'</span><span class="plus">+</span></button>';
  });
  h += '</div>';

  /* supplements */
  h += '<div id="todaySupps"></div>';

  /* next meal */
  h += '<div id="todayNext"></div>';

  host.innerHTML = h;
  renderSuppChecklist($('#todaySupps'), today);
  renderNextMeal($('#todayNext'), d);
}

async function renderNextMeal(el, d){
  if (!el || !RECIPES.loaded) return;
  const slotNow = guessSlot();
  let slot = slotNow;
  const order = SLOTS.slice(SLOTS.indexOf(slotNow));
  for (const s of order){ if (!d.entries.some(e => e.slot === s)){ slot = s; break; } }
  const res = await suggestFor(slot, localDateKey(), 2);
  if (!res.items.length){ el.innerHTML = ''; return; }
  el.innerHTML = '<div class="card"><div class="sheethead" style="align-items:baseline;margin-bottom:8px"><h3 style="flex:1">'+esc(t('td_next', {slot: t('slot_'+slot).toLowerCase()}))+'</h3>' +
    '<button class="linkbtn" type="button" data-go="recipes">'+esc(t('td_more'))+'</button></div><div class="rlist">' +
    res.items.map(x => recipeCard(x.r, x.serv !== 1 ? esc(t('sg_servings', {n: fmtQty(x.serv), k: fmtNum(x.kcal)})) : '')).join('') + '</div></div>';
  fillThumbs(el);
}

function showWhyRange(){
  const g = computeTargets(S.profile);
  if (!g) return;
  let b = '<p class="muted">'+esc(t('wr_intro'))+'</p><ol class="reasons">';
  ['wr_r1','wr_r2','wr_r3','wr_r4','wr_r5'].forEach(k => { b += '<li>'+esc(t(k))+'</li>'; });
  b += '</ol><div class="orn"><i></i></div>';
  b += '<h3>'+esc(t('wr_math_h'))+'</h3><p class="muted">'+esc(t('wr_math_p', {rmr:fmtNum(g.rmr), tdee:fmtNum(g.tdee), pct:fmtNum(g.relPct,1)}))+'</p>';
  b += '<h3 style="margin-top:14px">'+esc(t('wr_floor_h'))+'</h3><p class="muted">'+esc(t('wr_floor_p', {floor:fmtNum(g.floor), rmr:fmtNum(g.rmr), abs:fmtNum(g.floorAbs)}))+'</p>';
  b += '<h3 style="margin-top:14px">'+esc(t('wr_fix_h'))+'</h3><p class="muted">'+esc(t('wr_fix_p'))+'</p>';
  b += '<div class="notice" style="margin-top:14px">'+esc(t('wr_notmed'))+'</div>';
  openSheet(esc(t('wr_title')), b);
}

/* ---------- Diary ---------- */

async function renderLog(){
  const host = $('#s-log');
  const day = S.logDate || localDateKey();
  const d = await dayTotals(day);
  const g = computeTargets(S.profile);
  let h = '<div class="daynav"><button class="iconbtn sm" type="button" data-act="ldate" data-d="-1" aria-label="'+esc(t('lg_prev'))+'">'+icon('back')+'</button>' +
    '<label class="datepick"><span class="num">'+esc(day === localDateKey() ? t('today') : fmtLongDate(dateFromKey(day)))+'</span><input type="date" id="logDateInp" value="'+esc(day)+'"></label>' +
    '<button class="iconbtn sm flip" type="button" data-act="ldate" data-d="1" aria-label="'+esc(t('lg_next'))+'">'+icon('back')+'</button></div>';
  h += '<div class="card flat totals"><div class="num"><b>'+esc(fmtNum(d.total.kcal||0))+'</b> kcal'+(g ? ' <span class="tiny">/ '+esc(fmtNum(g.low))+'–'+esc(fmtNum(g.high))+'</span>' : '')+'</div>' +
    '<div class="tiny num">'+esc(macroLine(d.total))+' · '+esc(t('nut_fib'))+' '+esc(fmtNum(d.total.fib||0))+' g</div></div>';
  const slots = SLOTS.slice();
  if (d.entries.some(e => SLOTS.indexOf(e.slot) < 0)) slots.push('other');
  slots.forEach(s => {
    const list = d.entries.filter(e => (SLOTS.indexOf(e.slot) < 0 ? 'other' : e.slot) === s).sort((a,b) => (a.time||'') < (b.time||'') ? -1 : 1);
    const n = d.bySlot[s] || {};
    h += '<div class="card"><div class="sheethead" style="align-items:center;margin-bottom:4px"><h3 style="flex:1">'+esc(t('slot_'+s))+'</h3>' +
      '<span class="tiny num">'+(list.length ? esc(fmtNum(n.kcal||0))+' kcal' : '')+'</span>' +
      (s !== 'other' ? '<button class="iconbtn sm" type="button" data-act="add-food" data-slot="'+s+'" aria-label="'+esc(t('td_add'))+'">+</button>' : '') + '</div>';
    if (!list.length) h += '<p class="tiny">'+esc(t('lg_empty_slot'))+'</p>';
    list.forEach(e => {
      h += '<button class="entry" type="button" data-act="edit-entry" data-id="'+esc(e.id)+'">' +
        '<span class="en">'+esc(e.name)+(e.basis === 'estimate' ? ' <span class="pill">'+esc(t('lg_est'))+'</span>' : '')+'</span>' +
        '<span class="ek num">'+esc(fmtNum((e.nutrients||{}).kcal))+' <span class="tiny">kcal</span></span>' +
        '<span class="em tiny num">'+esc([(e.amount && e.amount.label) || '', macroLine(e.nutrients)].filter(Boolean).join(' · '))+'</span></button>';
    });
    h += '</div>';
  });
  h += '<div id="logSupps"></div>';
  h += '<div class="btnrow" style="margin:6px 0 16px"><button class="btn quiet" type="button" data-act="copy-day">'+esc(t('lg_copy_prev'))+'</button></div>';
  host.innerHTML = h;
  renderSuppChecklist($('#logSupps'), day, true);
  $('#logDateInp').addEventListener('change', e => { if (e.target.value){ S.logDate = e.target.value; renderLog(); } });
}

async function copyPreviousDay(){
  const day = S.logDate || localDateKey();
  const prev = addDays(day, -1);
  const entries = await recByTypeDate('food_entry', prev, prev);
  if (!entries.length){ toast(t('lg_copy_none')); return; }
  const ok = await confirmSheet(t('lg_copy_prev'), '<p class="muted">'+esc(t('lg_copy_q', {n: entries.length}))+'</p>', t('confirm'));
  if (!ok) return;
  for (const e of entries){
    const c = deepCopy(e); delete c.id; delete c.createdAt; c.date = day;
    await recPut(c);
  }
  toast(t('lg_saved'));
  renderLog();
}

/* ---------- Adding food ---------- */

const ADD = { slot:null, date:null, mode:'search', food:null, grams:100 };

function openAddSheet(slot, date){
  ADD.slot = slot || guessSlot();
  ADD.date = date || S.logDate || localDateKey();
  ADD.food = null;
  const modes = ['search','scan','photo','describe','recipe','manual'];
  const b = '<div class="seg small" id="addModes">' + modes.map(m =>
      '<button type="button" data-mode="'+m+'" class="'+(m==='search'?'on':'')+'">'+esc(t('am_'+m))+'</button>').join('') + '</div>' +
    '<div id="addBody"></div>';
  const sheet = openSheet(esc(t('add_title', {slot: t('slot_'+ADD.slot).toLowerCase()})), b, null, {tall:true});
  $('#addModes').addEventListener('click', e => {
    const bt = e.target.closest('[data-mode]');
    if (!bt) return;
    if (bt.getAttribute('data-mode') === 'photo'){ closeSheet(); openPhotoSheet({slot: ADD.slot, date: ADD.date}); return; }
    $$('#addModes button').forEach(x => x.classList.toggle('on', x === bt));
    runSheetCleanups();
    addMode(bt.getAttribute('data-mode'));
  });
  addMode('search');
  return sheet;
}

function addMode(mode){
  ADD.mode = mode;
  const body = $('#addBody');
  if (mode === 'search') addSearchUI(body);
  else if (mode === 'scan') addScanUI(body);
  else if (mode === 'describe') addDescribeUI(body);
  else if (mode === 'recipe') addRecipeUI(body);
  else if (mode === 'manual') addManualUI(body);
}

async function addSearchUI(body){
  body.innerHTML = '<div class="field" style="margin-top:12px"><input type="search" id="fq" placeholder="'+esc(t('fs_ph'))+'" autocomplete="off"></div>' +
    '<div id="fres"></div>';
  const inp = $('#fq');
  const out = $('#fres');
  const showRecent = async () => {
    const rec = await recentFoods(45, 12);
    if (!rec.length){ out.innerHTML = '<p class="tiny">'+esc(t('fs_hint'))+'</p>'; return; }
    out.innerHTML = '<p class="eyebrow" style="margin-top:6px">'+esc(t('fs_recent'))+'</p>' + rec.map((x,i) => foodRow(x.food, 'r'+i, x.lastGrams)).join('');
    FOOD_ROWS = {}; rec.forEach((x,i) => FOOD_ROWS['r'+i] = {food:x.food, grams:x.lastGrams});
  };
  let seq = 0;
  const run = async () => {
    const q = inp.value.trim();
    const my = ++seq;
    if (q.length < 2){ showRecent(); return; }
    const res = await searchLocalFoods(q, 30);
    if (my !== seq) return;
    FOOD_ROWS = {};
    res.forEach((f,i) => FOOD_ROWS['s'+i] = {food:f});
    out.innerHTML = (res.length ? res.map((f,i) => foodRow(f, 's'+i)).join('') : '<p class="tiny">'+esc(t('fs_none'))+'</p>') +
      '<div class="btnrow" style="margin:12px 0"><button class="btn quiet" type="button" id="offBtn">'+esc(t('fs_off'))+'</button>' +
      '<button class="btn quiet" type="button" id="estBtn">'+esc(t('fs_est'))+'</button></div><div id="offRes"></div>';
    $('#offBtn').addEventListener('click', async () => {
      const box = $('#offRes');
      box.innerHTML = '<p class="tiny">'+esc(t('loading'))+'</p>';
      try {
        const offs = await offSearch(q);
        offs.forEach((f,i) => FOOD_ROWS['o'+i] = {food:f});
        box.innerHTML = offs.length ? '<p class="eyebrow">Open Food Facts</p>' + offs.map((f,i) => foodRow(f, 'o'+i)).join('') : '<p class="tiny">'+esc(t('fs_none'))+'</p>';
      } catch(err){ box.innerHTML = '<div class="notice bad">'+esc(String(err.message||err))+'</div>'; }
    });
    $('#estBtn').addEventListener('click', () => { $$('#addModes button').forEach(x => x.classList.toggle('on', x.getAttribute('data-mode')==='describe')); addMode('describe'); const ta = $('#dq'); if (ta) ta.value = q; });
  };
  inp.addEventListener('input', () => { clearTimeout(addSearchUI._t); addSearchUI._t = setTimeout(run, 180); });
  out.addEventListener('click', e => {
    const row = e.target.closest('[data-food]');
    if (!row) return;
    const x = FOOD_ROWS[row.getAttribute('data-food')];
    if (x) amountStep(x.food, x.grams);
  });
  showRecent();
  loadFoodDb().catch(() => {});
  setTimeout(() => inp.focus(), 50);
}
let FOOD_ROWS = {};

function foodRow(f, key, grams){
  const k = f.per100 && f.per100.kcal;
  const src = f.kind === 'custom' ? t('fs_mine') : f.kind === 'off' ? 'OFF' : 'USDA';
  return '<button class="frow" type="button" data-food="'+esc(key)+'"><span class="fn">'+esc(foodName(f))+'</span>' +
    '<span class="fm tiny num">'+(k != null ? esc(fmtNum(k))+' kcal/100 g' : '')+(grams ? ' · '+esc(t('fs_last', {g: fmtNum(grams)})) : '')+' · '+esc(src)+'</span></button>';
}

/* Amount and slot for one food, then save. */
function amountStep(food, grams){
  ADD.food = food;
  const body = $('#addBody') || openAddSheet(ADD.slot, ADD.date) && $('#addBody');
  const portions = (food.portions || []).slice(0, 5);
  let g = grams || (portions[0] && portions[0].g) || 100;
  const ex = exclusionHits(food.en + ' ' + (food.cs||'') + ' ' + (food.ingredients||''));
  let h = '<div class="card flat" style="margin-top:12px"><h3>'+esc(foodName(food))+'</h3>' +
    '<p class="tiny">'+esc(t('am_per100'))+': '+esc(fmtNum(food.per100.kcal))+' kcal · '+esc(macroLine(food.per100))+'</p>' +
    (food.nutriscore ? '<p class="tiny">Nutri-Score '+esc(food.nutriscore.toUpperCase())+(food.nova ? ' · NOVA '+esc(food.nova) : '')+'</p>' : '') + '</div>';
  if (ex.length) h += '<div class="notice bad"><b>'+esc(t('rc_excl_h'))+'</b> '+esc(ex.map(x=>x.label).join(', '))+'</div>';
  h += '<div class="chips" style="margin:10px 0">' +
    ['100 g'].concat(portions.map(p => p.label)).map((lab, i) =>
      '<button class="chip" type="button" data-g="'+(i === 0 ? 100 : portions[i-1].g)+'">'+esc(lab)+(i ? ' · '+fmtNum(portions[i-1].g)+' g' : '')+'</button>').join('') + '</div>';
  h += '<div class="inline"><div class="field"><label for="amG">'+esc(t('am_grams'))+'</label><input id="amG" type="number" inputmode="decimal" step="1" min="1" value="'+esc(Math.round(g))+'"></div>' +
    '<div class="field"><label for="amDate">'+esc(t('lg_date'))+'</label><input id="amDate" type="date" value="'+esc(ADD.date)+'"></div></div>';
  h += '<div class="field"><span class="flabel">'+esc(t('lg_slot'))+'</span>'+slotChips(ADD.slot)+'</div>';
  h += '<div class="card flat" id="amPrev"></div>';
  h += '<div class="btnrow" style="margin:12px 0"><button class="btn" type="button" id="amSave">'+esc(t('save'))+'</button>' +
    '<button class="btn quiet" type="button" id="amBack">'+esc(t('back'))+'</button></div>';
  body.innerHTML = h;
  const upd = () => {
    const gg = Number($('#amG').value) || 0;
    const n = nutrientsFor(food, gg);
    $('#amPrev').innerHTML = '<div class="num"><b>'+esc(fmtNum(n.kcal))+'</b> kcal · '+esc(macroLine(n))+'</div>';
  };
  upd();
  $('#amG').addEventListener('input', upd);
  $$('[data-g]', body).forEach(b => b.addEventListener('click', () => { $('#amG').value = Math.round(Number(b.getAttribute('data-g'))); upd(); }));
  bindSlotChips(body, v => ADD.slot = v);
  $('#amBack').addEventListener('click', () => addMode(ADD.mode === 'scan' ? 'scan' : 'search'));
  $('#amSave').addEventListener('click', async () => {
    const gg = Number($('#amG').value) || 0;
    if (gg <= 0){ toast(t('am_need_g')); return; }
    let f = food;
    if (f.kind === 'off') f = await saveOffAsCustom(f);
    const portion = (f.portions||[]).find(p => Math.abs(p.g - gg) < 0.5);
    await recPut({type:'food_entry', date: $('#amDate').value || ADD.date, time: localTime(), slot: ADD.slot,
      name: foodName(f), source: {kind: f.kind === 'custom' ? 'custom' : f.kind, ref: f.ref},
      amount: {qty: gg, unit: 'g', grams: gg, label: portion ? portion.label + ' (' + fmtNum(gg) + ' g)' : fmtNum(gg) + ' g'},
      nutrients: nutrientsFor(f, gg), basis: f.kind === 'usda' ? 'database' : 'label'});
    closeSheet(); toast(t('lg_saved'));
  });
}

/* Barcode scanner. Chrome on Android has a built in barcode reader. */
async function addScanUI(body){
  body.innerHTML = '<div class="scanbox" style="margin-top:12px"><video id="scanVid" playsinline muted></video><div class="scanline"></div></div>' +
    '<p class="tiny" id="scanMsg" style="margin:8px 0">'+esc(t('sc_hint'))+'</p>' +
    '<div class="inline"><div class="field"><input id="scanCode" type="text" inputmode="numeric" placeholder="'+esc(t('sc_manual_ph'))+'"></div>' +
    '<button class="btn quiet none" type="button" id="scanGo">'+esc(t('sc_lookup'))+'</button></div><div id="scanRes"></div>';
  const lookup = async (code) => {
    code = String(code).replace(/\D/g,'');
    if (code.length < 6){ toast(t('sc_bad')); return; }
    $('#scanRes').innerHTML = '<p class="tiny">'+esc(t('loading'))+' '+esc(code)+'</p>';
    const mine = (await recByType('food')).find(r => r.barcode === code);
    if (mine){ amountStep(customFoodView(mine)); return; }
    try {
      const f = await offByBarcode(code);
      if (f && f.per100.kcal != null){ amountStep(f); return; }
      $('#scanRes').innerHTML = '<div class="notice warn">'+esc(t('sc_notfound', {c: code}))+'</div>' +
        '<div class="btnrow"><button class="btn" type="button" id="scanPhoto">'+esc(t('sc_photo_label'))+'</button></div>';
      $('#scanPhoto').addEventListener('click', () => { closeSheet(); openPhotoSheet({slot: ADD.slot, date: ADD.date, hint:'nutrition_label', barcode: code}); });
    } catch(err){
      $('#scanRes').innerHTML = '<div class="notice bad">'+esc(String(err.message||err))+'</div>';
    }
  };
  $('#scanGo').addEventListener('click', () => lookup($('#scanCode').value));
  if (!('BarcodeDetector' in window) || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)){
    $('#scanMsg').textContent = t('sc_unsupported');
    $('.scanbox').classList.add('hide');
    return;
  }
  let stream = null, timer = null, stopped = false;
  const stop = () => { stopped = true; if (timer) clearInterval(timer); if (stream) stream.getTracks().forEach(tr => tr.stop()); };
  sheetCleanups.push(stop);
  try {
    const det = new BarcodeDetector({formats: ['ean_13','ean_8','upc_a','upc_e','code_128']});
    stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}, audio: false});
    if (stopped){ stop(); return; }
    const v = $('#scanVid');
    v.srcObject = stream; await v.play();
    timer = setInterval(async () => {
      if (stopped || v.readyState < 2) return;
      try {
        const codes = await det.detect(v);
        if (codes && codes.length){ const c = codes[0].rawValue; stop(); if (navigator.vibrate) navigator.vibrate(60); $('#scanCode').value = c; lookup(c); }
      } catch(e){}
    }, 300);
  } catch(err){
    $('#scanMsg').textContent = t('sc_nocam') + ' ' + String(err.message || err);
  }
}

function addDescribeUI(body){
  body.innerHTML = '<div class="field" style="margin-top:12px"><label for="dq">'+esc(t('ds_label'))+'</label><textarea id="dq" placeholder="'+esc(t('ds_ph'))+'"></textarea></div>' +
    '<div class="btnrow"><button class="btn" type="button" id="dqGo">'+esc(t('ds_go'))+'</button></div><div id="dqRes"></div>';
  $('#dqGo').addEventListener('click', async () => {
    const txt = $('#dq').value.trim();
    if (!txt) return;
    if (!(await ensureAiReady())) return;
    const btn = $('#dqGo'); btn.disabled = true; btn.textContent = t('ai_working');
    try {
      const est = await aiEstimateText(txt);
      const items = est.items || [];
      let h = '<p class="tiny" style="margin:10px 0">'+esc(t('conf_'+(est.confidence||'medium')))+(est.assumptions ? ' · '+esc(est.assumptions) : '')+'</p>';
      items.forEach((it, i) => {
        h += '<div class="card flat"><div class="inline" style="align-items:center"><b>'+esc(it.name)+'</b>' +
          '<input class="none" style="width:92px" type="number" inputmode="decimal" data-eg="'+i+'" value="'+esc(Math.round(it.grams))+'"> <span class="none tiny">g</span></div>' +
          '<p class="tiny num" data-ep="'+i+'">'+esc(fmtNum(it.nutrients.kcal))+' kcal · '+esc(macroLine(it.nutrients))+'</p></div>';
      });
      h += '<div class="field"><span class="flabel">'+esc(t('lg_slot'))+'</span>'+slotChips(ADD.slot)+'</div>';
      h += '<div class="btnrow" style="margin:10px 0"><button class="btn" type="button" id="dqSave">'+esc(t('ds_save_all'))+'</button></div>';
      $('#dqRes').innerHTML = h;
      bindSlotChips($('#dqRes'), v => ADD.slot = v);
      $$('[data-eg]').forEach(inp => inp.addEventListener('input', () => {
        const i = Number(inp.getAttribute('data-eg')); const it = items[i];
        const n = nutScale(it.nutrients, (Number(inp.value)||0) / (it.grams || 1));
        $('[data-ep="'+i+'"]').textContent = fmtNum(n.kcal) + ' kcal · ' + macroLine(n);
      }));
      $('#dqSave').addEventListener('click', async () => {
        for (let i = 0; i < items.length; i++){
          const it = items[i];
          const gg = Number($('[data-eg="'+i+'"]').value) || it.grams;
          await recPut({type:'food_entry', date: ADD.date, time: localTime(), slot: ADD.slot, name: it.name,
            source: {kind:'estimate', ref:null, text: txt}, amount: {qty: gg, unit:'g', grams: gg, label: fmtNum(gg)+' g'},
            nutrients: nutRound(nutScale(it.nutrients, gg / (it.grams || 1))), basis:'estimate'});
        }
        closeSheet(); toast(t('lg_saved'));
      });
    } catch(err){
      $('#dqRes').innerHTML = '<div class="notice bad">'+esc(t('err_prefix'))+'<div class="verbatim">'+esc(String(err.message||err))+'</div></div>';
    }
    btn.disabled = false; btn.textContent = t('ds_go');
  });
}

function addRecipeUI(body){
  body.innerHTML = '<div class="field" style="margin-top:12px"><input type="search" id="rq2" placeholder="'+esc(t('rl_search_ph'))+'"></div><div id="rres" class="rlist"></div>';
  const run = () => {
    const q = fold($('#rq2').value);
    const list = visibleRecipes().filter(r => !q || q.split(/\s+/).every(w => r._search.indexOf(w) >= 0)).slice(0, 30);
    $('#rres').innerHTML = list.map(r => '<button class="frow" type="button" data-rid="'+esc(r.id)+'"><span class="fn">'+esc(r.title)+'</span>' +
      '<span class="fm tiny">'+esc(fmtNum(recipeKcal(r)))+' kcal / '+esc(t('rc_serv_short'))+'</span></button>').join('') || '<p class="tiny">'+esc(t('rl_empty'))+'</p>';
  };
  $('#rq2').addEventListener('input', run);
  $('#rres').addEventListener('click', e => { const b = e.target.closest('[data-rid]'); if (b){ closeSheet(); S.logDate = ADD.date; recipeLogSheet(b.getAttribute('data-rid')); } });
  run();
}

function addManualUI(body){
  body.innerHTML = '<div class="field" style="margin-top:12px"><label for="mn">'+esc(t('mn_name'))+'</label><input id="mn" type="text"></div>' +
    '<div class="inline"><div class="field"><label for="mk">kcal</label><input id="mk" type="number" inputmode="decimal"></div>' +
    '<div class="field"><label for="mg">'+esc(t('am_grams'))+'</label><input id="mg" type="number" inputmode="decimal" placeholder="'+esc(t('mn_opt'))+'"></div></div>' +
    '<div class="inline"><div class="field"><label for="mp">'+esc(t('macro_p'))+' g</label><input id="mp" type="number" inputmode="decimal"></div>' +
    '<div class="field"><label for="mf">'+esc(t('macro_f'))+' g</label><input id="mf" type="number" inputmode="decimal"></div>' +
    '<div class="field"><label for="mc">'+esc(t('macro_c'))+' g</label><input id="mc" type="number" inputmode="decimal"></div></div>' +
    '<div class="field"><label for="mfib">'+esc(t('nut_fib'))+' g</label><input id="mfib" type="number" inputmode="decimal" placeholder="'+esc(t('mn_opt'))+'"></div>' +
    '<label class="opt sq" style="margin-bottom:12px"><input type="checkbox" id="msave"><span class="mark"></span><span class="txt"><span class="t1">'+esc(t('mn_save_food'))+'</span><span class="t2">'+esc(t('mn_save_food_d'))+'</span></span></label>' +
    '<div class="field"><span class="flabel">'+esc(t('lg_slot'))+'</span>'+slotChips(ADD.slot)+'</div>' +
    '<div class="btnrow" style="margin:10px 0"><button class="btn" type="button" id="mnSave">'+esc(t('save'))+'</button></div>';
  bindSlotChips(body, v => ADD.slot = v);
  $('#mnSave').addEventListener('click', async () => {
    const name = $('#mn').value.trim();
    const num = id => { const v = $(id).value; return v === '' ? null : Number(v); };
    const n = {kcal: num('#mk'), prot: num('#mp'), fat: num('#mf'), carb: num('#mc'), fib: num('#mfib')};
    if (!name || n.kcal == null){ toast(t('mn_need')); return; }
    const g = num('#mg');
    let ref = null;
    if ($('#msave').checked && g){
      const rec = await recPut({type:'food', name, per100: nutRound(nutScale(n, 100/g)), portions:[{label: t('mn_portion'), g}], basis:'manual', source:'manual'});
      ref = 'food:' + rec.id;
    }
    await recPut({type:'food_entry', date: ADD.date, time: localTime(), slot: ADD.slot, name,
      source: {kind: ref ? 'custom' : 'manual', ref}, amount: {qty: g || 1, unit: g ? 'g' : 'portion', grams: g, label: g ? fmtNum(g)+' g' : t('mn_portion')},
      nutrients: n, basis: 'manual'});
    closeSheet(); toast(t('lg_saved'));
  });
}

/* ---------- Editing an entry ---------- */

async function editEntry(id){
  const e = await recGet(id);
  if (!e) return;
  let slot = e.slot;
  const hasGrams = e.amount && e.amount.grams;
  const food = e.source && e.source.ref ? await getFoodByRef(e.source.ref) : null;
  const isRecipe = e.source && e.source.kind === 'recipe';
  let b = '<p class="muted">'+esc(e.name)+'</p>';
  if (hasGrams) b += '<div class="field"><label for="eg">'+esc(t('am_grams'))+'</label><input id="eg" type="number" inputmode="decimal" value="'+esc(e.amount.grams)+'"></div>';
  else if (isRecipe) b += '<div class="field"><label for="es">'+esc(t('rc_servings_eaten'))+'</label><input id="es" type="number" inputmode="decimal" step="0.25" value="'+esc(e.amount.qty)+'"></div>';
  b += '<div class="field"><label for="ed">'+esc(t('lg_date'))+'</label><input id="ed" type="date" value="'+esc(e.date)+'"></div>';
  b += '<div class="field"><span class="flabel">'+esc(t('lg_slot'))+'</span>'+slotChips(slot)+'</div>';
  b += '<details><summary class="linkbtn">'+esc(t('lg_all_nutrients'))+'</summary>'+nutrientTable(e.nutrients)+'</details>';
  if (e.basis === 'estimate') b += '<p class="tiny" style="margin-top:8px">'+esc(t('lg_est_note'))+'</p>';
  const sheet = openSheet(esc(t('lg_edit')), b,
    '<button class="btn danger" type="button" id="eDel">'+icon('trash')+esc(t('p_remove'))+'</button>' +
    '<button class="btn quiet" type="button" id="eAgain">'+esc(t('lg_again'))+'</button>' +
    '<button class="btn" type="button" id="eSave">'+esc(t('save'))+'</button>');
  bindSlotChips(sheet, v => slot = v);
  $('#eDel').addEventListener('click', async () => { await recDelete(e.id); closeSheet(); toast(t('lg_deleted')); });
  $('#eAgain').addEventListener('click', async () => {
    const c = deepCopy(e); delete c.id; delete c.createdAt; c.date = localDateKey(); c.time = localTime(); c.slot = guessSlot();
    await recPut(c); closeSheet(); toast(t('lg_saved'));
  });
  $('#eSave').addEventListener('click', async () => {
    e.slot = slot;
    e.date = $('#ed').value || e.date;
    if (hasGrams){
      const g = Number($('#eg').value) || e.amount.grams;
      if (g !== e.amount.grams){
        e.nutrients = food ? nutrientsFor(food, g) : nutRound(nutScale(e.nutrients, g / e.amount.grams));
        e.amount = Object.assign({}, e.amount, {qty: g, grams: g, label: fmtNum(g) + ' g'});
      }
    } else if (isRecipe){
      const n = Number($('#es').value) || e.amount.qty;
      if (n !== e.amount.qty){
        e.nutrients = nutRound(nutScale(e.nutrients, n / e.amount.qty));
        e.amount = Object.assign({}, e.amount, {qty: n, label: fmtQty(n) + ' ' + t('rc_serv_short')});
      }
    }
    await recPut(e); closeSheet(); toast(t('lg_saved'));
  });
}

/* ---------- Supplements ---------- */

const SUPP_PRESETS = [
  {key:'d1000', name:{cs:'Vitamin D3 1000 IU', en:'Vitamin D3 1000 IU'}, form:'capsule', per:{vitd:25}},
  {key:'d2000', name:{cs:'Vitamin D3 2000 IU', en:'Vitamin D3 2000 IU'}, form:'capsule', per:{vitd:50}},
  {key:'o3', name:{cs:'Omega 3 (rybí olej)', en:'Omega 3 (fish oil)'}, form:'capsule', per:{epa:0.18, dha:0.12}},
  {key:'mg', name:{cs:'Hořčík 300 mg', en:'Magnesium 300 mg'}, form:'tablet', per:{mg:300}},
  {key:'b12', name:{cs:'Vitamin B12 1000 µg', en:'Vitamin B12 1000 µg'}, form:'tablet', per:{b12:1000}},
  {key:'zn', name:{cs:'Zinek 15 mg', en:'Zinc 15 mg'}, form:'tablet', per:{zn:15}},
  {key:'c', name:{cs:'Vitamin C 500 mg', en:'Vitamin C 500 mg'}, form:'tablet', per:{vitc:500}},
  {key:'fe', name:{cs:'Železo 14 mg', en:'Iron 14 mg'}, form:'tablet', per:{fe:14}},
  {key:'iod', name:{cs:'Jód 150 µg', en:'Iodine 150 µg'}, form:'tablet', per:{iod:150}},
  {key:'crea', name:{cs:'Kreatin monohydrát', en:'Creatine monohydrate'}, form:'powder', unit:{cs:'odměrka 5 g', en:'5 g scoop'}, per:{}, extra:[{name:'Creatine', amount:5, unit:'g'}]},
  {key:'whey', name:{cs:'Syrovátkový protein', en:'Whey protein'}, form:'powder', unit:{cs:'odměrka 30 g', en:'30 g scoop'}, per:{kcal:120, prot:24, fat:1.5, carb:2.5}}
];
const SUPP_NUT_CHOICES = ['vitd','epa','dha','mg','b12','zn','vitc','fe','iod','ca','k','se','vita','vite','vitk','b1','b2','b3','b5','b6','biot','fol','cu','mn','kcal','prot','fat','carb','fib'];

function suppScheduledOn(s, dateKey){
  const days = (s.schedule && s.schedule.days) || [0,1,2,3,4,5,6];
  return s.active !== false && days.indexOf(dateFromKey(dateKey).getDay()) >= 0;
}

async function renderSuppChecklist(el, dateKey, showManage){
  if (!el) return;
  const supps = (await recByType('supplement')).filter(s => s.active !== false);
  const intakes = await recByTypeDate('supplement_intake', dateKey, dateKey);
  if (!supps.length && !showManage){ el.innerHTML = ''; return; }
  let h = '<div class="card"><div class="sheethead" style="align-items:center;margin-bottom:6px"><h3 style="flex:1">'+esc(t('sp_today'))+'</h3>' +
    '<button class="linkbtn" type="button" data-act="supp-manage">'+esc(t('sp_manage'))+'</button></div>';
  if (!supps.length) h += '<p class="tiny">'+esc(t('sp_none'))+'</p>';
  supps.forEach(s => {
    const taken = intakes.filter(i => i.supplementId === s.id);
    const sched = suppScheduledOn(s, dateKey);
    if (!sched && !taken.length) return;
    h += '<label class="ing supp"><input type="checkbox" data-supp="'+esc(s.id)+'" data-date="'+esc(dateKey)+'" '+(taken.length ? 'checked' : '')+'>' +
      '<span class="it">'+esc(s.name)+' <span class="tiny">'+esc(fmtQty(s.defaultUnits||1))+' × '+esc(s.unitLabel || t('sp_form_'+(s.form||'capsule')))+
      ((s.schedule && s.schedule.time) ? ' · '+esc(t('sp_time_'+s.schedule.time)) : '')+'</span></span></label>';
  });
  h += '</div>';
  el.innerHTML = h;
}

async function toggleSuppIntake(suppId, dateKey, on){
  const s = await recGet(suppId);
  if (!s) return;
  const intakes = (await recByTypeDate('supplement_intake', dateKey, dateKey)).filter(i => i.supplementId === suppId);
  if (on && !intakes.length){
    const u = Number(s.defaultUnits) || 1;
    await recPut({type:'supplement_intake', date: dateKey, time: localTime(), supplementId: s.id, name: s.name, units: u,
      nutrients: nutRound(nutScale(s.perUnit || {}, u)), extra: (s.extra||[]).map(x => Object.assign({}, x, {amount: x.amount * u}))});
  } else if (!on){
    for (const i of intakes) await recDelete(i.id);
  }
}

async function openSuppManager(){
  const supps = await recByType('supplement');
  let b = '';
  if (!supps.length) b += '<p class="muted">'+esc(t('sp_none_long'))+'</p>';
  supps.forEach(s => {
    const per = Object.keys(s.perUnit||{}).filter(k => s.perUnit[k] != null).map(k => nutLabel(k) + ' ' + fmtAmt(k==='epa'||k==='dha' ? s.perUnit[k]*1000 : s.perUnit[k]) + ' ' + (k==='epa'||k==='dha' ? 'mg' : nutUnit(k)));
    (s.extra||[]).forEach(x => per.push(x.name + ' ' + fmtAmt(x.amount) + ' ' + x.unit));
    b += '<button class="frow" type="button" data-sedit="'+esc(s.id)+'"><span class="fn">'+esc(s.name)+(s.active === false ? ' <span class="pill">'+esc(t('sp_paused'))+'</span>' : '')+'</span>' +
      '<span class="fm tiny">'+esc(per.join(', ') || '–')+'</span></button>';
  });
  b += '<p class="eyebrow" style="margin-top:16px">'+esc(t('sp_presets'))+'</p><div class="chips">' +
    SUPP_PRESETS.map(p => '<button class="chip add" type="button" data-preset="'+p.key+'">+ '+esc(L(p.name))+'</button>').join('') + '</div>' +
    '<p class="tiny" style="margin-top:8px">'+esc(t('sp_presets_note'))+'</p>';
  const sheet = openSheet(esc(t('sp_manage')), b, '<button class="btn" type="button" id="sNew">'+esc(t('sp_new'))+'</button>', {tall:true});
  $('#sNew').addEventListener('click', () => suppForm(null));
  sheet.addEventListener('click', e => {
    const ed = e.target.closest('[data-sedit]');
    if (ed){ recGet(ed.getAttribute('data-sedit')).then(s => suppForm(s)); return; }
    const pr = e.target.closest('[data-preset]');
    if (pr){
      const p = SUPP_PRESETS.find(x => x.key === pr.getAttribute('data-preset'));
      suppForm({type:'supplement', name: L(p.name), form: p.form, unitLabel: p.unit ? L(p.unit) : '', perUnit: deepCopy(p.per), extra: deepCopy(p.extra||[]),
        defaultUnits: 1, schedule: {days:[0,1,2,3,4,5,6], time:'morning'}, active: true, _new: true});
    }
  });
}

function suppForm(s){
  const isNew = !s || s._new || !s.id;
  s = s || {type:'supplement', name:'', form:'capsule', unitLabel:'', perUnit:{}, extra:[], defaultUnits:1, schedule:{days:[0,1,2,3,4,5,6], time:'morning'}, active:true};
  const rows = Object.keys(s.perUnit || {}).map(k => ({k, v: (k==='epa'||k==='dha') ? s.perUnit[k]*1000 : s.perUnit[k]}));
  const dayNames = S.lang === 'cs' ? ['Ne','Po','Út','St','Čt','Pá','So'] : ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const nutRow = (r, i) => '<div class="inline" data-nr="'+i+'"><select data-nk>' +
      SUPP_NUT_CHOICES.map(k => '<option value="'+k+'"'+(k===r.k?' selected':'')+'>'+esc(nutLabel(k))+' ('+esc(k==='epa'||k==='dha' ? 'mg' : nutUnit(k))+')</option>').join('') +
      '</select><input data-nv type="number" inputmode="decimal" step="any" value="'+esc(r.v == null ? '' : r.v)+'" style="max-width:110px"></div>';
  let b = '<div class="field"><label for="sn">'+esc(t('sp_name'))+'</label><input id="sn" type="text" value="'+esc(s.name)+'"></div>' +
    '<div class="inline"><div class="field"><label for="sf">'+esc(t('sp_form'))+'</label><select id="sf">' +
      ['capsule','tablet','softgel','powder','drops','liquid'].map(f => '<option value="'+f+'"'+(s.form===f?' selected':'')+'>'+esc(t('sp_form_'+f))+'</option>').join('') + '</select></div>' +
    '<div class="field"><label for="su">'+esc(t('sp_units'))+'</label><input id="su" type="number" inputmode="decimal" step="0.5" value="'+esc(s.defaultUnits||1)+'"></div></div>' +
    '<div class="field"><label for="sul">'+esc(t('sp_unit_label'))+'</label><input id="sul" type="text" value="'+esc(s.unitLabel||'')+'" placeholder="'+esc(t('sp_unit_label_ph'))+'"></div>' +
    '<p class="flabel">'+esc(t('sp_per_unit'))+'</p><div id="nrows">' + rows.map(nutRow).join('') + '</div>' +
    '<div class="btnrow" style="margin:6px 0 12px"><button class="btn quiet" type="button" id="addNr">+ '+esc(t('sp_add_nut'))+'</button>' +
    '<button class="btn quiet" type="button" id="iuD">'+esc(t('sp_iu'))+'</button></div>' +
    '<div class="field"><label for="sx">'+esc(t('sp_extra'))+'</label><input id="sx" type="text" value="'+esc((s.extra||[]).map(x => x.name+' '+x.amount+' '+x.unit).join('; '))+'" placeholder="'+esc(t('sp_extra_ph'))+'"></div>' +
    '<div class="field"><span class="flabel">'+esc(t('sp_days'))+'</span><div class="chips" id="sdays">' +
      [1,2,3,4,5,6,0].map(d => '<button class="chip" type="button" data-day="'+d+'" aria-pressed="'+((s.schedule.days||[]).indexOf(d)>=0)+'">'+dayNames[d]+'</button>').join('') + '</div></div>' +
    '<div class="field"><span class="flabel">'+esc(t('sp_time'))+'</span><div class="chips" id="stime">' +
      ['morning','noon','evening','any'].map(x => '<button class="chip" type="button" data-time="'+x+'" aria-pressed="'+((s.schedule.time||'any')===x)+'">'+esc(t('sp_time_'+x))+'</button>').join('') + '</div></div>' +
    '<label class="opt sq"><input type="checkbox" id="sact" '+(s.active !== false ? 'checked' : '')+'><span class="mark"></span><span class="txt"><span class="t1">'+esc(t('sp_active'))+'</span></span></label>';
  const sheet = openSheet(esc(isNew ? t('sp_new') : t('sp_edit')), b,
    (!isNew ? '<button class="btn danger" type="button" id="sDel">'+icon('trash')+esc(t('p_remove'))+'</button>' : '') +
    '<button class="btn" type="button" id="sSave">'+esc(t('save'))+'</button>', {tall:true});
  let nrI = rows.length;
  $('#addNr').addEventListener('click', () => { $('#nrows').insertAdjacentHTML('beforeend', nutRow({k:'vitd', v:''}, nrI++)); });
  $('#iuD').addEventListener('click', () => {
    const iu = prompt(t('sp_iu_q'));
    if (!iu) return;
    const ug = Math.round(Number(iu) / 40 * 10) / 10;
    $('#nrows').insertAdjacentHTML('beforeend', nutRow({k:'vitd', v: ug}, nrI++));
  });
  $$('#sdays [data-day]').forEach(bt => bt.addEventListener('click', () => bt.setAttribute('aria-pressed', bt.getAttribute('aria-pressed') === 'true' ? 'false' : 'true')));
  $$('#stime [data-time]').forEach(bt => bt.addEventListener('click', () => $$('#stime [data-time]').forEach(x => x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'))));
  if (!isNew) $('#sDel').addEventListener('click', async () => { await recDelete(s.id); S.afterSheet = openSuppManager; closeSheet(); toast(t('lg_deleted')); });
  $('#sSave').addEventListener('click', async () => {
    const name = $('#sn').value.trim();
    if (!name){ toast(t('or_need_title')); return; }
    const per = {};
    $$('#nrows [data-nr]').forEach(r => {
      const k = $('[data-nk]', r).value, v = $('[data-nv]', r).value;
      if (v === '') return;
      per[k] = (k === 'epa' || k === 'dha') ? Number(v)/1000 : Number(v);
    });
    const extra = $('#sx').value.split(';').map(x => x.trim()).filter(Boolean).map(x => {
      const m = x.match(/^(.*?)\s+([\d.,]+)\s*(\S+)?$/);
      return m ? {name: m[1], amount: Number(m[2].replace(',','.')), unit: m[3] || ''} : {name: x, amount: 1, unit: ''};
    });
    const rec = Object.assign({}, s);
    delete rec._new;
    Object.assign(rec, {type:'supplement', name, form: $('#sf').value, unitLabel: $('#sul').value.trim(), defaultUnits: Number($('#su').value) || 1,
      perUnit: per, extra, active: $('#sact').checked,
      schedule: {days: $$('#sdays [data-day]').filter(x => x.getAttribute('aria-pressed') === 'true').map(x => Number(x.getAttribute('data-day'))),
                 time: ($$('#stime [data-time]').find(x => x.getAttribute('aria-pressed') === 'true') || {getAttribute:() => 'any'}).getAttribute('data-time')}});
    await recPut(rec);
    S.afterSheet = openSuppManager;
    closeSheet(); toast(t('lg_saved'));
  });
}
