/* ============================================================
   Photo: a dish, a product or a nutrition label, evaluated by Claude
   against your profile and what you ate today.
   ============================================================ */

const PHOTO = { dataUrl: null, hint: 'auto', slot: null, date: null, barcode: null, result: null };

function openPhotoSheet(opts){
  opts = opts || {};
  PHOTO.dataUrl = null; PHOTO.result = null;
  PHOTO.hint = opts.hint || 'auto';
  PHOTO.slot = opts.slot || guessSlot();
  PHOTO.date = opts.date || localDateKey();
  PHOTO.barcode = opts.barcode || null;
  const hints = ['auto','dish','nutrition_label','packaged_product'];
  const b = '<p class="tiny" style="margin-bottom:10px">'+esc(t('ph_intro'))+'</p>' +
    '<div class="chips" id="phHints">' + hints.map(h => '<button class="chip" type="button" data-hint="'+h+'" aria-pressed="'+(h===PHOTO.hint)+'">'+esc(t('ph_h_'+h))+'</button>').join('') + '</div>' +
    '<div class="btnrow" style="margin:12px 0">' +
      '<label class="btn">'+icon('camera')+esc(t('ph_take'))+'<input type="file" accept="image/*" capture="environment" class="hide" id="phCam"></label>' +
      '<label class="btn quiet">'+esc(t('ph_upload'))+'<input type="file" accept="image/*" class="hide" id="phFile"></label></div>' +
    '<div id="phPrev"></div>' +
    '<div class="field"><label for="phNote">'+esc(t('ph_note'))+'</label><input id="phNote" type="text" placeholder="'+esc(t('ph_note_ph'))+'"></div>' +
    '<div class="btnrow"><button class="btn" type="button" id="phGo" disabled>'+esc(t('ph_go'))+'</button></div>' +
    '<div id="phOut"></div>';
  const sheet = openSheet(esc(t('ph_title')), b, null, {tall:true});
  $('#phHints').addEventListener('click', e => {
    const bt = e.target.closest('[data-hint]'); if (!bt) return;
    PHOTO.hint = bt.getAttribute('data-hint');
    $$('#phHints [data-hint]').forEach(x => x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'));
  });
  const onFile = async (inp) => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    try {
      PHOTO.dataUrl = await fileToDownscaledJpeg(f, 1568, 0.85);
      $('#phPrev').innerHTML = '<img class="phimg" src="'+PHOTO.dataUrl+'" alt="">';
      $('#phGo').disabled = false;
    } catch(e){ toast(t('ph_bad')); }
  };
  $('#phCam').addEventListener('change', e => onFile(e.target));
  $('#phFile').addEventListener('change', e => onFile(e.target));
  $('#phGo').addEventListener('click', runPhotoEval);
  return sheet;
}

async function runPhotoEval(){
  if (!PHOTO.dataUrl) return;
  if (!(await ensureAiReady())) return;
  const btn = $('#phGo');
  btn.disabled = true; btn.textContent = t('ai_working');
  $('#phOut').innerHTML = '<div class="notice">'+esc(t('ph_working'))+'</div>';
  try {
    const r = await aiEvaluatePhoto(PHOTO.dataUrl, PHOTO.hint, ($('#phNote')||{}).value || '');
    PHOTO.result = r;
    /* the local exclusion check runs too, independent of the model */
    const local = exclusionHits([r.name, r.description, (r.ingredientsSeen||[]).join(' ')].join(' '));
    const warn = (r.exclusionWarnings || []).slice();
    local.forEach(x => { if (!warn.some(w => fold(w).indexOf(fold(x.label)) >= 0)) warn.push(x.label + ' (' + t('ph_local_check') + ')'); });
    const thumb = await shrinkDataUrl(PHOTO.dataUrl, 360);
    const rec = await recPut({type:'photo_eval', date: PHOTO.date, hint: PHOTO.hint, result: r, warnings: warn});
    await dbPut('media', {id: 'photo:' + rec.id, dataUrl: thumb, at: nowIso()});
    renderPhotoResult(r, warn);
  } catch(err){
    $('#phOut').innerHTML = '<div class="notice bad">'+esc(t('err_prefix'))+'<div class="verbatim">'+esc(String(err.message||err))+'</div></div>';
  }
  btn.disabled = false; btn.textContent = t('ph_again');
}

function shrinkDataUrl(dataUrl, side){
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const sc = Math.min(1, side / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width*sc); c.height = Math.round(img.height*sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => res(null);
    img.src = dataUrl;
  });
}

function renderPhotoResult(r, warn){
  const pg = r.portionGrams || null;
  let h = '<div class="card" style="margin-top:12px"><div class="sheethead" style="align-items:center">' + fitBadge(r.fitScore) +
    '<h3 style="flex:1">'+esc(r.name)+(r.brand ? ' <span class="tiny">'+esc(r.brand)+'</span>' : '')+'</h3></div>' +
    '<p><b>'+esc(r.verdict)+'</b></p>' +
    (r.description ? '<p class="muted">'+esc(r.description)+'</p>' : '') +
    '<p class="tiny">'+esc(t('ph_basis_'+r.nutritionBasis))+' · '+esc(t('conf_'+(r.confidence||'medium')))+'</p></div>';
  if (warn.length) h += '<div class="notice bad"><b>'+esc(t('rc_excl_h'))+'</b><ul class="tips">'+warn.map(w => '<li>'+esc(w)+'</li>').join('')+'</ul></div>';
  if ((r.reasons||[]).length) h += '<div class="card flat"><h3>'+esc(t('ph_why'))+'</h3><ul class="tips">'+r.reasons.map(x => '<li>'+esc(x)+'</li>').join('')+'</ul></div>';
  if ((r.suggestions||[]).length) h += '<div class="card flat"><h3>'+esc(t('ph_tweaks'))+'</h3><ul class="tips">'+r.suggestions.map(x => '<li>'+esc(x)+'</li>').join('')+'</ul></div>';
  h += '<div class="card"><h3>'+esc(t('ph_portion'))+'</h3>' +
    '<div class="inline"><div class="field"><label for="phG">'+esc(t('am_grams'))+'</label><input id="phG" type="number" inputmode="decimal" value="'+esc(pg ? Math.round(pg) : 100)+'"></div>' +
    '<div class="field"><label for="phD">'+esc(t('lg_date'))+'</label><input id="phD" type="date" value="'+esc(PHOTO.date)+'"></div></div>' +
    '<div class="field"><span class="flabel">'+esc(t('lg_slot'))+'</span>'+slotChips(PHOTO.slot)+'</div>' +
    '<div id="phN"></div>' +
    '<div class="btnrow" style="margin-top:10px"><button class="btn" type="button" id="phLog">'+esc(t('ph_log'))+'</button>' +
    (r.kind === 'nutrition_label' || r.kind === 'packaged_product' ? '<button class="btn quiet" type="button" id="phSave">'+esc(t('ph_save_food'))+'</button>' : '') +
    '<button class="btn quiet" type="button" id="phChat">'+icon('chat')+esc(t('rc_ask'))+'</button></div></div>';
  $('#phOut').innerHTML = h;
  setTimeout(() => { const o = $('#phOut'); if (o) o.scrollIntoView({behavior:'smooth', block:'start'}); }, 60);
  bindSlotChips($('#phOut'), v => PHOTO.slot = v);
  const per100 = r.per100g && r.per100g.kcal != null ? r.per100g : (pg && r.perPortion ? nutScale(r.perPortion, 100 / pg) : null);
  const nutFor = (g) => per100 ? nutRound(nutScale(per100, g/100)) : (r.perPortion || {});
  const upd = () => { const g = Number($('#phG').value) || 0; $('#phN').innerHTML = '<p class="num"><b>'+esc(fmtNum(nutFor(g).kcal))+'</b> kcal · '+esc(macroLine(nutFor(g)))+'</p>'; };
  upd();
  $('#phG').addEventListener('input', upd);
  $('#phLog').addEventListener('click', async () => {
    const g = Number($('#phG').value) || pg || 100;
    await recPut({type:'food_entry', date: $('#phD').value || PHOTO.date, time: localTime(), slot: PHOTO.slot, name: r.name + (r.brand ? ' · ' + r.brand : ''),
      source: {kind:'photo', ref:null}, amount: {qty: g, unit:'g', grams: g, label: fmtNum(g) + ' g'},
      nutrients: nutFor(g), basis: r.nutritionBasis === 'read_from_label' ? 'label' : 'estimate'});
    closeSheet(); toast(t('lg_saved'));
  });
  const sv = $('#phSave');
  if (sv) sv.addEventListener('click', async () => {
    if (!per100){ toast(t('ph_no100')); return; }
    await recPut({type:'food', name: r.name, brand: r.brand || '', barcode: PHOTO.barcode || '', per100: nutRound(per100),
      portions: pg ? [{label: r.servingLabel || t('mn_portion'), g: pg}] : [], basis: r.nutritionBasis === 'read_from_label' ? 'label' : 'estimate',
      source: 'photo'});
    sv.disabled = true; sv.textContent = t('sg_saved');
  });
  $('#phChat').addEventListener('click', () => {
    closeSheet();
    S.chatSeed = t('ph_chat_seed', {name: r.name, verdict: r.verdict});
    go('chat');
  });
}
