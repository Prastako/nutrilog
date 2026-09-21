/* ============================================================
   Recipes: archive, starter recipes, Claude recipes, your own.
   A recipe record has the same envelope as the workout exercise
   archive (id, type, sources, tags, extraction), so the two archives
   can later live side by side and be read by one platform.
   ============================================================ */

const RECIPES = { list: [], byId: {}, loaded: false, notes: {} };

async function loadRecipes(){
  const all = await dbAll('recipes');
  RECIPES.list = all.filter(r => !r.deleted);
  RECIPES.byId = {};
  RECIPES.list.forEach(r => { RECIPES.byId[r.id] = r; r._search = fold([r.title, r.titleEn, (r.ingredients||[]).map(i => i.item).join(' '), (r.tags||[]).join(' ')].join(' ')); });
  const notes = await recByType('recipe_note');
  RECIPES.notes = {};
  notes.forEach(n => { RECIPES.notes[n.recipeId] = n; });
  RECIPES.loaded = true;
}

function visibleRecipes(){
  return RECIPES.list.filter(r => r.origin !== 'starter' || S.prefs.archive.showStarter);
}

function recipeNote(id){ return RECIPES.notes[id] || null; }

async function saveRecipeNote(id, patch){
  let n = RECIPES.notes[id];
  if (!n) n = {id: 'rn-' + id, type: 'recipe_note', recipeId: id, favorite: false, rating: null, notes: '', cookedDates: []};
  Object.assign(n, patch);
  await recPut(n);
  RECIPES.notes[id] = n;
  return n;
}

/* Normalise a recipe from Claude (tool output) into a record. */
function recipeFromAi(r, origin){
  const id = 'rcp-' + ulid();
  const tags = (r.tags || []).map(x => String(x).toLowerCase().trim()).filter(Boolean);
  return {
    id, type: 'recipe', schema: 1, origin: origin || 'claude', lang: S.lang,
    title: r.title || r.titleEn || '?', titleEn: r.titleEn || '', summary: r.summary || '',
    servings: Number(r.servings) || 1,
    time: {prepMin: (r.time||{}).prepMin || null, cookMin: (r.time||{}).cookMin || null, totalMin: (r.time||{}).totalMin || null},
    difficulty: r.difficulty || null,
    ingredients: (r.ingredients || []).map(i => ({group: i.group || null, item: i.item, qty: i.qty == null ? null : Number(i.qty), unit: i.unit || null,
      grams: i.grams == null ? null : Number(i.grams), prep: i.prep || null, optional: !!i.optional})),
    steps: (r.steps || []).map(s => ({text: s.text, minutes: s.minutes == null ? null : Number(s.minutes)})),
    tips: (r.tips || []).map(x => typeof x === 'string' ? {text: x} : x),
    variations: (r.variations || []).map(v => ({label: v.label, text: v.text})),
    storage: r.storage || null,
    nutrition: {perServing: nutRound(r.nutritionPerServing || {}), basis: 'estimated', confidence: 'medium'},
    tags,
    sources: [{platform: 'claude', model: S.prefs.models.chat, createdAt: nowIso()}],
    extraction: null,
    thumb: null,
    createdAt: nowIso(), updatedAt: nowIso()
  };
}

async function saveRecipe(rec){
  rec.updatedAt = nowIso();
  await dbPut('recipes', rec);
  if (rec.origin === 'claude' || rec.origin === 'own') markDirty('recipe saved');
  await loadRecipes();
  return rec;
}

/* Starter recipes ship with the app so suggestions work before the
   archive exists. They are marked and can be hidden in settings. */
async function ensureStarterRecipes(){
  const have = await kvGet('starterVersion', null);
  if (have === VERSION) return;
  try {
    const res = await fetch('data/recipes-starter.json?v=' + encodeURIComponent(VERSION));
    if (!res.ok) return;
    const j = await res.json();
    const recs = (j.recipes || []).map(r => Object.assign({}, r, {origin: 'starter'}));
    await dbPutMany('recipes', recs);
    await kvSet('starterVersion', VERSION);
  } catch(e){ /* offline on first run: try next time */ }
}

/* ---------- Archive sync ----------
   The archive index lives in your private GitHub data repository at
   <path>/index.json (the same repository as the backup). The overnight
   extraction writes it there and to Google Drive. */

async function ghRaw(path){
  const r = parseRepo();
  if (!r || !S.secrets.github) throw new Error(t('arch_need_repo'));
  const q = '?ref=' + encodeURIComponent(S.prefs.backup.branch || 'main');
  const res = await fetch(GITHUB_API + '/repos/'+r.owner+'/'+r.repo+'/contents/'+path+q, {
    headers: {'Authorization':'Bearer ' + S.secrets.github, 'Accept':'application/vnd.github.raw+json', 'X-GitHub-Api-Version':'2022-11-28'}
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
  return res;
}

async function importRecipeIndex(j, label){
  if (!j || !Array.isArray(j.recipes)) throw new Error(t('arch_bad_file'));
  const incoming = j.recipes.filter(r => r && r.id && r.title);
  const ids = {};
  incoming.forEach(r => { ids[r.id] = 1; r.origin = r.origin && r.origin !== 'starter' ? r.origin : 'archive'; if (!r.type) r.type = 'recipe'; });
  /* archive records that disappeared from the index are removed; your own
     and Claude recipes are never touched by a sync */
  const current = await dbAll('recipes');
  const gone = current.filter(r => r.origin === 'archive' && !ids[r.id]).map(r => r.id);
  for (const id of gone) await dbDel('recipes', id);
  await dbPutMany('recipes', incoming);
  S.meta.archive.lastSyncAt = nowIso();
  S.meta.archive.count = incoming.length;
  S.meta.archive.lastError = null;
  S.meta.archive.source = label;
  await saveMeta();
  await loadRecipes();
  return {count: incoming.length, removed: gone.length};
}

async function syncArchive(opts){
  opts = opts || {};
  try {
    const path = (S.prefs.archive.path || 'archive/recipes').replace(/\/+$/,'');
    const res = await ghRaw(path + '/index.json');
    if (!res){ if (!opts.quiet) toast(t('arch_none_yet'), 5000); return null; }
    const txt = await res.text();
    const h = hashString(txt);
    if (h === S.meta.archive.lastSha && !opts.force){
      S.meta.archive.lastSyncAt = nowIso(); await saveMeta();
      if (!opts.quiet) toast(t('arch_same'));
      return {same: true};
    }
    const out = await importRecipeIndex(JSON.parse(txt), 'github');
    S.meta.archive.lastSha = h; await saveMeta();
    if (!opts.quiet) toast(t('arch_synced', {n: out.count}));
    return out;
  } catch(err){
    S.meta.archive.lastError = String(err.message || err);
    await saveMeta();
    if (!opts.quiet) toast(t('err_prefix') + ': ' + S.meta.archive.lastError, 6000);
    return null;
  }
}

/* Thumbnails: fetched once from the data repository, kept in the media store. */
const thumbUrls = {};
async function recipeThumbUrl(rec){
  if (!rec || !rec.thumb) return null;
  if (rec.thumb.startsWith('data:')) return rec.thumb;
  if (thumbUrls[rec.id]) return thumbUrls[rec.id];
  const key = 'thumb:' + rec.id;
  let m = await dbGet('media', key);
  if (!m && rec.origin === 'archive' && S.secrets.github && parseRepo()){
    try {
      const path = (S.prefs.archive.path || 'archive/recipes').replace(/\/+$/,'') + '/' + rec.thumb;
      const res = await ghRaw(path);
      if (res){ const blob = await res.blob(); m = {id: key, blob, at: nowIso()}; await dbPut('media', m); }
    } catch(e){ return null; }
  }
  if (!m && rec.thumb.startsWith('data:')) return rec.thumb;
  if (!m) return null;
  thumbUrls[rec.id] = URL.createObjectURL(m.blob);
  return thumbUrls[rec.id];
}

function fillThumbs(root){
  $$('[data-thumb]', root).forEach(async el => {
    const rec = RECIPES.byId[el.getAttribute('data-thumb')];
    const url = await recipeThumbUrl(rec);
    if (url){ el.style.backgroundImage = 'url("'+url+'")'; el.classList.add('has'); }
  });
}

/* ---------- Helpers ---------- */

function recipeKcal(r){ return r && r.nutrition && r.nutrition.perServing ? r.nutrition.perServing.kcal : null; }
function recipeTime(r){ return r && r.time ? (r.time.totalMin || ((r.time.prepMin||0) + (r.time.cookMin||0)) || null) : null; }
function recipeText(r){ return [r.title, r.titleEn, (r.ingredients||[]).map(i => i.item + ' ' + (i.prep||'')).join(' ')].join(' '); }
function recipeExclusions(r){ return exclusionHits(recipeText(r)); }

function tagLabel(tag){
  const [ns, val] = String(tag).split(':');
  const key = 'tag_' + ns + '_' + (val||'').replace(/[^a-z0-9]+/g,'_');
  const tr = t(key);
  if (tr !== key) return tr;
  return (val || ns).replace(/-/g,' ');
}
function tagNs(tag){ return String(tag).split(':')[0]; }

const ORIGIN_LABEL = {archive:'orig_archive', starter:'orig_starter', claude:'orig_claude', own:'orig_own'};

function fmtQty(q){
  if (q == null || q === '') return '';
  const n = Number(q);
  if (!isFinite(n)) return String(q);
  const fr = [[0.25,'¼'],[0.5,'½'],[0.75,'¾'],[0.333,'⅓'],[0.667,'⅔']];
  const whole = Math.floor(n), rest = n - whole;
  for (const [v, s] of fr){ if (Math.abs(rest - v) < 0.04) return (whole ? whole : '') + s; }
  if (n >= 20) return fmtNum(Math.round(n));
  return fmtNum(n, 1);
}

function recipeCard(r, extra){
  const k = recipeKcal(r), tm = recipeTime(r), note = recipeNote(r.id);
  const prot = r.nutrition && r.nutrition.perServing ? r.nutrition.perServing.prot : null;
  const tags = (r.tags||[]).filter(x => ['meal','prep','diet','time'].indexOf(tagNs(x)) >= 0).slice(0,3);
  const ex = recipeExclusions(r);
  const initial = esc((r.title||'?').trim().charAt(0).toUpperCase());
  return '<button class="rcard" type="button" data-act="open-recipe" data-id="'+esc(r.id)+'">' +
    '<span class="rthumb" data-thumb="'+esc(r.id)+'"><span>'+initial+'</span></span>' +
    '<span class="rbody"><span class="rtitle">'+esc(r.title)+(note && note.favorite ? ' <span class="star">★</span>' : '')+'</span>' +
    '<span class="rmeta num">'+[tm ? tm+' min' : null, k != null ? fmtNum(k)+' kcal' : null, prot != null ? 'B '+fmtNum(prot)+' g' : null].filter(Boolean).map(esc).join(' · ')+'</span>' +
    (extra ? '<span class="rextra">'+extra+'</span>' : '') +
    '<span class="rtags">' + (ex.length ? '<span class="pill err">'+esc(t('rc_excluded'))+'</span>' : '') +
      tags.map(x => '<span class="pill">'+esc(tagLabel(x))+'</span>').join('') +
      (r.origin !== 'archive' ? '<span class="pill wait">'+esc(t(ORIGIN_LABEL[r.origin]||'orig_own'))+'</span>' : '') +
    '</span></span></button>';
}

/* ---------- Recipes screen ---------- */

function renderRecipes(){
  const host = $('#s-recipes');
  let h = '<div class="seg" role="tablist">' +
    '<button type="button" class="'+(S.recipeTab==='suggest'?'on':'')+'" data-act="rtab" data-v="suggest">'+esc(t('rt_suggest'))+'</button>' +
    '<button type="button" class="'+(S.recipeTab==='all'?'on':'')+'" data-act="rtab" data-v="all">'+esc(t('rt_all'))+'</button>' +
    '</div>';
  h += '<div id="rtabBody"></div>';
  host.innerHTML = h;
  if (S.recipeTab === 'suggest') renderSuggestions();
  else renderRecipeList();
}

function recipeMatchesFilter(r){
  const F = S.recipeFilter;
  if (F.q && fold(F.q).split(/\s+/).filter(Boolean).some(w => r._search.indexOf(w) < 0)) return false;
  for (const c of F.chips){
    if (c === 'fav'){ const n = recipeNote(r.id); if (!n || !n.favorite) return false; }
    else if (c === 'noexcl'){ if (recipeExclusions(r).length) return false; }
    else if (c === 'time:under-30'){ const tm = recipeTime(r); if (!(tm && tm <= 30)) return false; }
    else if ((r.tags||[]).indexOf(c) < 0) return false;
  }
  for (const tg of F.tags){ if ((r.tags||[]).indexOf(tg) < 0) return false; }
  if (F.origin !== 'all' && r.origin !== F.origin) return false;
  return true;
}

const QUICK_CHIPS = ['meal:breakfast','meal:lunch','meal:snack','meal:dinner','prep:meal-prep','time:under-30','diet:high-protein','fav'];

function renderRecipeList(){
  const host = $('#rtabBody');
  const F = S.recipeFilter;
  const all = visibleRecipes();
  const list = all.filter(recipeMatchesFilter).sort((a,b) => {
    const fa = (recipeNote(a.id)||{}).favorite ? 1 : 0, fb = (recipeNote(b.id)||{}).favorite ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return (a.title||'').localeCompare(b.title||'', locale());
  });
  let h = '<div class="field" style="margin:12px 0 10px"><input type="search" id="rq" placeholder="'+esc(t('rl_search_ph'))+'" value="'+esc(F.q)+'"></div>';
  h += '<div class="chips scrollx">' + QUICK_CHIPS.map(c =>
    '<button class="chip" type="button" data-act="rchip" data-v="'+esc(c)+'" aria-pressed="'+(F.chips.indexOf(c)>=0)+'">'+esc(c === 'fav' ? t('rl_fav') : tagLabel(c))+'</button>').join('') +
    '<button class="chip add" type="button" data-act="rtags">'+esc(t('rl_tags'))+(F.tags.length ? ' ('+F.tags.length+')' : '')+'</button></div>';
  if (F.tags.length) h += '<div class="chips" style="margin-top:8px">' + F.tags.map(tg => '<button class="chip" type="button" aria-pressed="true" data-act="rtag-off" data-v="'+esc(tg)+'">'+esc(tagLabel(tg))+' ×</button>').join('') + '</div>';
  h += '<p class="tiny" style="margin:10px 2px">'+esc(t('rl_count', {n: list.length, all: all.length}))+'</p>';
  if (!all.length){
    h += '<div class="card flat"><p class="muted">'+esc(t('rl_empty'))+'</p></div>';
  } else if (!list.length){
    h += '<div class="card flat"><p class="muted">'+esc(t('rl_nomatch'))+'</p></div>';
  } else {
    h += '<div class="rlist">' + list.slice(0, 200).map(r => recipeCard(r)).join('') + '</div>';
  }
  h += '<div class="btnrow" style="margin-top:14px"><button class="btn quiet" type="button" data-act="recipe-new">'+icon('log')+esc(t('rl_new'))+'</button></div>';
  host.innerHTML = h;
  fillThumbs(host);
  const inp = $('#rq');
  inp.addEventListener('input', () => { F.q = inp.value; clearTimeout(renderRecipeList._t); renderRecipeList._t = setTimeout(() => { const pos = inp.selectionStart; renderRecipeList(); const i2 = $('#rq'); i2.focus(); try { i2.setSelectionRange(pos,pos); } catch(e){} }, 250); });
}

function openTagBrowser(){
  const counts = {};
  visibleRecipes().forEach(r => (r.tags||[]).forEach(tg => { counts[tg] = (counts[tg]||0) + 1; }));
  const byNs = {};
  Object.keys(counts).forEach(tg => { const ns = tagNs(tg); (byNs[ns] = byNs[ns] || []).push(tg); });
  const order = ['meal','prep','time','diet','ing','cuisine','method','equip','flavor','course','nutri'];
  const nss = Object.keys(byNs).sort((a,b) => (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 99 : order.indexOf(b)));
  let b = '';
  if (!nss.length) b = '<p class="muted">'+esc(t('rl_empty'))+'</p>';
  nss.forEach(ns => {
    b += '<p class="eyebrow" style="margin-top:12px">'+esc(t('tagns_'+ns) !== 'tagns_'+ns ? t('tagns_'+ns) : ns)+'</p><div class="chips">' +
      byNs[ns].sort((a,c) => counts[c] - counts[a]).map(tg =>
        '<button class="chip" type="button" data-act="rtag-toggle" data-v="'+esc(tg)+'" aria-pressed="'+(S.recipeFilter.tags.indexOf(tg)>=0)+'">'+esc(tagLabel(tg))+' <span class="tiny">'+counts[tg]+'</span></button>').join('') + '</div>';
  });
  openSheet(esc(t('rl_tags')), b, '<button class="btn" type="button" data-sheet-close="1">'+esc(t('ok'))+'</button>');
}

/* ---------- Recipe detail ---------- */

function renderRecipe(){
  const host = $('#s-recipe');
  const r = RECIPES.byId[S.recipeId];
  if (!r){ host.innerHTML = '<p class="muted">'+esc(t('rc_missing'))+'</p>'; return; }
  const note = recipeNote(r.id) || {};
  const base = Number(r.servings) || 1;
  const sv = S.recipeServings || base;
  const factor = sv / base;
  const ex = recipeExclusions(r);
  const ps = (r.nutrition && r.nutrition.perServing) || {};
  let h = '';
  h += '<div class="rhero" data-thumb="'+esc(r.id)+'"><span>'+esc((r.title||'?').charAt(0).toUpperCase())+'</span></div>';
  h += '<h2 style="margin:12px 0 4px">'+esc(r.title)+'</h2>';
  if (r.titleEn && r.titleEn !== r.title) h += '<p class="tiny" style="margin-bottom:6px">'+esc(r.titleEn)+'</p>';
  if (r.summary) h += '<p class="muted">'+esc(r.summary)+'</p>';
  if (ex.length) h += '<div class="notice bad" style="margin-top:10px"><b>'+esc(t('rc_excl_h'))+'</b> '+esc(ex.map(x => x.label).join(', '))+'</div>';
  const tm = recipeTime(r);
  h += '<div class="kvgrid">' +
    '<div><span class="k">'+esc(t('rc_time'))+'</span><span class="v num">'+(tm ? esc(tm)+' min' : '–')+'</span>' +
      (r.time && (r.time.prepMin || r.time.cookMin) ? '<span class="tiny">'+esc(t('rc_prep_cook',{p:r.time.prepMin||0,c:r.time.cookMin||0}))+'</span>' : '')+'</div>' +
    '<div><span class="k">'+esc(t('rc_kcal_serv'))+'</span><span class="v num">'+esc(fmtNum(ps.kcal))+'</span><span class="tiny">B '+esc(fmtNum(ps.prot))+' · T '+esc(fmtNum(ps.fat))+' · S '+esc(fmtNum(ps.carb))+' g</span></div>' +
    '<div><span class="k">'+esc(t('rc_difficulty'))+'</span><span class="v">'+esc(r.difficulty ? t('diff_'+r.difficulty) : '–')+'</span></div>' +
    '</div>';
  h += '<div class="btnrow" style="margin:12px 0">' +
    '<button class="btn" type="button" data-act="recipe-log" data-id="'+esc(r.id)+'">'+icon('log')+esc(t('rc_log'))+'</button>' +
    '<button class="btn quiet" type="button" data-act="recipe-fav" data-id="'+esc(r.id)+'">'+(note.favorite ? '★ ' : '☆ ')+esc(t('rc_fav'))+'</button>' +
    '<button class="btn quiet" type="button" data-act="recipe-missing" data-id="'+esc(r.id)+'">'+esc(t('rc_missing_btn'))+'</button>' +
    '<button class="btn quiet" type="button" data-act="recipe-ask" data-id="'+esc(r.id)+'">'+icon('chat')+esc(t('rc_ask'))+'</button>' +
    '</div>';
  if ((r.tags||[]).length) h += '<div class="chips" style="margin-bottom:12px">' + r.tags.map(tg => '<span class="pill">'+esc(tagLabel(tg))+'</span>').join('') + '</div>';

  /* ingredients */
  h += '<div class="card"><div class="sheethead" style="align-items:center"><h3 style="flex:1">'+esc(t('rc_ingredients'))+'</h3>' +
    '<div class="stepper"><button class="iconbtn sm" type="button" data-act="rserv" data-d="-1" aria-label="-">−</button>' +
    '<span class="num">'+esc(fmtQty(sv))+' '+esc(t('rc_serv_short'))+'</span>' +
    '<button class="iconbtn sm" type="button" data-act="rserv" data-d="1" aria-label="+">+</button></div></div>';
  let group = undefined;
  (r.ingredients||[]).forEach((ing, i) => {
    if (ing.group !== group){ group = ing.group; if (group) h += '<p class="eyebrow" style="margin-top:10px">'+esc(group)+'</p>'; }
    const q = ing.qty != null ? fmtQty(ing.qty * factor) : '';
    h += '<label class="ing"><input type="checkbox"><span class="q num">'+esc([q, ing.unit||''].join(' ').trim())+'</span>' +
      '<span class="it">'+esc(ing.item)+(ing.prep ? '<span class="tiny">, '+esc(ing.prep)+'</span>' : '')+(ing.optional ? ' <span class="tiny">('+esc(t('rc_optional'))+')</span>' : '')+'</span></label>';
  });
  h += '</div>';

  /* steps */
  h += '<div class="card"><h3>'+esc(t('rc_steps'))+'</h3><ol class="steps">' +
    (r.steps||[]).map(s => '<li>'+esc(s.text)+(s.minutes ? ' <span class="pill">'+esc(s.minutes)+' min</span>' : '')+'</li>').join('') + '</ol></div>';

  if ((r.variations||[]).length || (r.tips||[]).length){
    h += '<div class="card"><h3>'+esc(t('rc_var_tips'))+'</h3>';
    (r.variations||[]).forEach(v => { h += '<p><b>'+esc(v.label)+'.</b> '+esc(v.text)+srcRefs(v.from)+'</p>'; });
    if ((r.tips||[]).length) h += '<ul class="tips">' + r.tips.map(x => '<li>'+esc(typeof x === 'string' ? x : x.text)+srcRefs(x.from)+'</li>').join('') + '</ul>';
    h += '</div>';
  }
  if (r.storage && (r.storage.fridgeDays || r.storage.freezer != null || r.storage.reheat)){
    h += '<div class="card flat"><h3>'+esc(t('rc_storage'))+'</h3>' +
      (r.storage.fridgeDays ? '<div class="kv"><span class="k">'+esc(t('rc_fridge'))+'</span><span class="v">'+esc(t('rc_days',{n:r.storage.fridgeDays}))+'</span></div>' : '') +
      (r.storage.freezer != null ? '<div class="kv"><span class="k">'+esc(t('rc_freezer'))+'</span><span class="v">'+esc(r.storage.freezer ? t('yes') : t('no'))+'</span></div>' : '') +
      (r.storage.reheat ? '<p class="tiny" style="margin-top:8px">'+esc(r.storage.reheat)+'</p>' : '') + '</div>';
  }

  /* nutrition */
  h += '<div class="card"><h3>'+esc(t('rc_nutrition'))+'</h3><p class="tiny" style="margin-bottom:8px">'+esc(t('rc_nut_basis_'+((r.nutrition||{}).basis||'estimated')))+
    ((r.nutrition||{}).confidence ? ' · '+esc(t('conf_'+r.nutrition.confidence)) : '')+'</p>' +
    ((r.nutrition||{}).stated && r.nutrition.stated.perServing ? '<div class="notice" style="margin-bottom:10px">'+esc(t('rc_stated', {v: fmtNum(r.nutrition.stated.perServing.kcal) + ' kcal · ' + macroLine(r.nutrition.stated.perServing)}))+
      (r.nutrition.stated.includes ? ' <span class="tiny">('+esc(r.nutrition.stated.includes)+')</span>' : '')+'</div>' : '') +
    nutrientTable(ps, {compact:true}) + '</div>';

  /* sources */
  if ((r.sources||[]).length){
    h += '<div class="card flat"><h3>'+esc(t('rc_sources'))+'</h3>';
    r.sources.forEach(s => {
      if (s.platform === 'instagram'){
        h += '<div class="src"><a href="'+esc(s.url)+'" target="_blank" rel="noopener">@'+esc(s.author||'instagram')+'</a>' +
          (s.postedAt ? ' <span class="tiny">'+esc(s.postedAt)+'</span>' : '') +
          (s.driveVideoUrl ? ' · <a href="'+esc(s.driveVideoUrl)+'" target="_blank" rel="noopener">'+esc(t('rc_video_drive'))+'</a>' : '') +
          (s.caption ? '<details><summary class="tiny">'+esc(t('rc_caption'))+'</summary><div class="verbatim">'+esc(s.caption)+'</div></details>' : '') + '</div>';
      } else if (s.platform === 'claude'){
        h += '<div class="src tiny">'+esc(t('rc_src_claude', {m: s.model||''}))+'</div>';
      } else {
        h += '<div class="src tiny">'+esc(s.platform || '')+' '+(s.url ? '<a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.url)+'</a>' : '')+'</div>';
      }
    });
    if (r.extraction){
      h += '<p class="tiny" style="margin-top:8px">'+esc(t('rc_extracted', {d: (r.extraction.at||'').slice(0,10), c: t('conf_'+(r.extraction.confidence||'medium'))}))+'</p>';
      if ((r.extraction.gaps||[]).length) h += '<p class="tiny">'+esc(t('rc_gaps'))+': '+esc(r.extraction.gaps.join('; '))+'</p>';
    }
    h += '</div>';
  }

  /* notes */
  h += '<div class="card flat"><h3>'+esc(t('rc_mynotes'))+'</h3><textarea id="rnote" placeholder="'+esc(t('rc_mynotes_ph'))+'">'+esc(note.notes||'')+'</textarea>' +
    ((note.cookedDates||[]).length ? '<p class="tiny" style="margin-top:8px">'+esc(t('rc_cooked', {n: note.cookedDates.length, d: note.cookedDates[note.cookedDates.length-1]}))+'</p>' : '') +
    '</div>';
  if (r.origin === 'claude' || r.origin === 'own'){
    h += '<div class="btnrow" style="margin:6px 0 14px"><button class="btn quiet" type="button" data-act="recipe-del" data-id="'+esc(r.id)+'">'+icon('trash')+esc(t('rc_delete'))+'</button></div>';
  }
  host.innerHTML = h;
  fillThumbs(host);
  const ta = $('#rnote');
  ta.addEventListener('change', () => saveRecipeNote(r.id, {notes: ta.value}));
}

function srcRefs(from){
  if (!from || !from.length) return '';
  return ' <span class="tiny">(' + from.map(f => esc(String(f).replace(/^ig:/,'@'))).join(', ') + ')</span>';
}

async function recipeLogSheet(id){
  const r = RECIPES.byId[id];
  if (!r) return;
  const ps = (r.nutrition && r.nutrition.perServing) || {};
  let slot = guessSlot();
  let b = '<p class="muted">'+esc(r.title)+'</p>' +
    '<div class="field"><span class="flabel">'+esc(t('lg_slot'))+'</span>'+slotChips(slot)+'</div>' +
    '<div class="field"><label for="rl-serv">'+esc(t('rc_servings_eaten'))+'</label><input id="rl-serv" type="number" inputmode="decimal" step="0.25" min="0.25" value="1"></div>' +
    '<div class="field"><label for="rl-date">'+esc(t('lg_date'))+'</label><input id="rl-date" type="date" value="'+esc(S.logDate || localDateKey())+'"></div>' +
    '<p class="tiny" id="rl-prev"></p>';
  if (ps.kcal == null) b += '<div class="notice warn">'+esc(t('rc_no_nutrition'))+'</div>';
  const sheet = openSheet(esc(t('rc_log')), b, '<button class="btn" type="button" id="rl-save">'+esc(t('save'))+'</button>');
  const upd = () => { const n = Number($('#rl-serv').value) || 0; $('#rl-prev').textContent = fmtNum((ps.kcal||0)*n) + ' kcal · B ' + fmtNum((ps.prot||0)*n) + ' g'; };
  upd();
  $('#rl-serv').addEventListener('input', upd);
  bindSlotChips(sheet, v => slot = v);
  $('#rl-save').addEventListener('click', async () => {
    const n = Number($('#rl-serv').value) || 1;
    const date = $('#rl-date').value || localDateKey();
    await recPut({type:'food_entry', date, time: localTime(), slot, name: r.title,
      source: {kind:'recipe', ref:'recipe:' + r.id},
      amount: {qty: n, unit: 'serving', grams: null, label: fmtQty(n) + ' ' + t('rc_serv_short')},
      nutrients: nutRound(nutScale(ps, n)), basis: (r.nutrition||{}).basis === 'label' ? 'label' : 'estimate'});
    const note = recipeNote(r.id) || {};
    const cd = (note.cookedDates || []).slice(); if (cd[cd.length-1] !== date) cd.push(date);
    await saveRecipeNote(r.id, {cookedDates: cd});
    closeSheet(); toast(t('lg_saved'));
  });
}

async function recipeMissing(id){
  const r = RECIPES.byId[id];
  const pantry = await recByType('pantry_item');
  const haveNames = pantry.filter(p => p.have).map(p => fold(p.name));
  const rows = (r.ingredients||[]).map(ing => {
    const f = fold(ing.item);
    const has = haveNames.some(n => n.length >= 3 && (f.indexOf(n) >= 0 || n.indexOf(f.split(/[ ,]/)[0]) >= 0));
    return {ing, has};
  });
  let b = '<p class="tiny" style="margin-bottom:10px">'+esc(t('rc_missing_note'))+'</p>';
  b += rows.map((x, i) => '<label class="ing"><input type="checkbox" data-mi="'+i+'" '+(x.has ? 'checked' : '')+'><span class="it">'+esc(x.ing.item)+'</span>' +
    '<span class="pill '+(x.has ? 'ok' : 'wait')+'">'+esc(x.has ? t('pt_have') : t('pt_need'))+'</span></label>').join('');
  const sheet = openSheet(esc(t('rc_missing_btn')), b,
    '<button class="btn" type="button" id="rm-save">'+esc(t('rc_missing_save'))+'</button>');
  $('#rm-save').addEventListener('click', async () => {
    const boxes = $$('[data-mi]', sheet);
    for (const bx of boxes){
      const ing = rows[Number(bx.getAttribute('data-mi'))].ing;
      const name = ing.item.split(',')[0].trim();
      const ex = pantry.find(p => fold(p.name) === fold(name));
      if (bx.checked){ if (!ex) await recPut({type:'pantry_item', name, have:true, toBuy:false}); else if (!ex.have){ ex.have = true; ex.toBuy = false; await recPut(ex); } }
      else { if (!ex) await recPut({type:'pantry_item', name, have:false, toBuy:true}); else { ex.have = false; ex.toBuy = true; await recPut(ex); } }
    }
    closeSheet(); toast(t('pt_updated'));
  });
}

/* ---------- Suggestions ---------- */

function seededRand(seed){
  let x = 0; for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}

async function suggestFor(slot, dateKey, n){
  const g = computeTargets(S.profile);
  const shares = slotShares();
  const d = await dayTotals(dateKey);
  const slotEaten = (d.bySlot[slot] && d.bySlot[slot].kcal) || 0;
  const slotTarget = g ? g.mid * shares[slot] : null;
  /* a meal that is mostly logged already gets ideas for next time at full size */
  const done = slotTarget != null && slotEaten >= slotTarget * 0.7;
  const target = g ? (done ? slotTarget : Math.max(150, slotTarget - slotEaten)) : null;
  const K = (S.profile && S.profile.kitchen) || {};
  const day = dateFromKey(dateKey).getDay();
  const limit = TIME_MAX_MIN[(day === 0 || day === 6) ? (K.timeWeekend||3) : (K.timeWeekday||2)];
  const eq = (K.equipment||[]).filter(x => x !== 'none');
  const likes = ((S.profile && S.profile.food && S.profile.food.cuisines) || []).map(id => {
    const c = CUISINES.find(x => x.id === id); return c ? c.en.toLowerCase().replace(/\s+/g,'-') : id; });
  const pantry = (await recByType('pantry_item')).filter(p => p.have).map(p => fold(p.name));
  const focus = (S.profile && S.profile.goals && S.profile.goals.focusNutrients) || [];
  const rnd = seededRand(dateKey + slot);
  const recent = {};
  Object.values(RECIPES.notes).forEach(nt => { const last = (nt.cookedDates||[]).slice(-1)[0]; if (last) recent[nt.recipeId] = last; });
  const out = [];
  visibleRecipes().forEach(r => {
    if (recipeExclusions(r).length) return;
    const tags = r.tags || [];
    const mealTags = tags.filter(x => tagNs(x) === 'meal');
    if (mealTags.length && mealTags.indexOf('meal:' + slot) < 0) return;
    const kc = recipeKcal(r);
    const reasons = [];
    let s = 0, serv = 1;
    if (kc && target){
      serv = clamp(Math.round(target / kc * 2) / 2, 0.5, 2);
      const diff = Math.abs(kc * serv - target) / target;
      s += 3 * (1 - Math.min(diff, 1));
      if (diff < 0.15) reasons.push(t('sg_r_fits'));
    }
    const ps = (r.nutrition||{}).perServing || {};
    if (kc && ps.prot){ const pd = ps.prot*4/kc; s += pd * 4; if (pd >= 0.25) reasons.push(t('sg_r_protein')); }
    const tm = recipeTime(r);
    if (tm && tm > limit){ s -= 2; } else if (tm) { s += 0.3; }
    const needEq = tags.filter(x => tagNs(x) === 'equip').map(x => x.split(':')[1]);
    if (eq.length && needEq.some(e => ['oven','airfryer','blender','pressure','micro'].indexOf(e) >= 0 && eq.indexOf(e) < 0)) s -= 3;
    if (tags.some(x => tagNs(x) === 'cuisine' && likes.indexOf(x.split(':')[1]) >= 0)) { s += 0.6; }
    if (pantry.length){
      const ings = (r.ingredients||[]).filter(i => !i.optional);
      const hit = ings.filter(i => pantry.some(p => p.length >= 3 && fold(i.item).indexOf(p) >= 0)).length;
      const frac = ings.length ? hit / ings.length : 0;
      s += frac * 2;
      if (frac >= 0.6) reasons.push(t('sg_r_pantry'));
    }
    focus.forEach(k => { const v = k === 'o3ld' ? ((ps.epa||0)+(ps.dha||0))*1000 : ps[k]; if (v && kc){ s += 0.4; } });
    if (tags.indexOf('prep:meal-prep') >= 0) s += 0.3;
    const note = recipeNote(r.id);
    if (note && note.favorite){ s += 0.8; reasons.push(t('sg_r_fav')); }
    if (recent[r.id] && recent[r.id] >= addDays(dateKey, -3)) s -= 2.5;
    if (r.origin === 'starter') s -= 0.4;
    s += rnd() * 1.2;
    out.push({r, s, serv, kcal: kc ? kc * serv : null, reasons});
  });
  out.sort((a,b) => b.s - a.s);
  return {target, done, eaten: slotEaten, items: out.slice(0, n || 3)};
}

async function renderSuggestions(){
  const host = $('#rtabBody');
  const dateKey = S.suggestDate || localDateKey();
  let h = '<div class="daynav" style="margin-top:12px"><button class="iconbtn sm" type="button" data-act="sdate" data-d="-1">'+icon('back')+'</button>' +
    '<span class="num">'+esc(dateKey === localDateKey() ? t('today') : fmtShortDate(dateKey))+'</span>' +
    '<button class="iconbtn sm flip" type="button" data-act="sdate" data-d="1">'+icon('back')+'</button></div>';
  if (!S.profile) h += '<div class="notice warn">'+esc(t('sg_noprofile'))+'</div>';
  if (!visibleRecipes().length) h += '<div class="notice">'+esc(t('sg_norecipes'))+'</div>';
  h += '<div id="sgSlots"></div>';
  h += '<div class="card flat" style="margin-top:6px"><h3>'+esc(t('sg_prep_h'))+'</h3><p class="tiny" style="margin-bottom:10px">'+esc(t('sg_prep_p'))+'</p>' +
    '<button class="btn quiet" type="button" data-act="ai-mealprep">'+icon('suggest')+esc(t('sg_prep_btn'))+'</button></div>';
  host.innerHTML = h;
  let sh = '';
  for (const slot of SLOTS){
    const res = await suggestFor(slot, dateKey, 3);
    sh += '<div class="card"><div class="sheethead" style="align-items:baseline;margin-bottom:8px"><h3 style="flex:1">'+esc(t('slot_'+slot))+'</h3>' +
      (res.target ? '<span class="tiny num">'+esc(t('sg_target', {k: fmtNum(round10(res.target))}))+'</span>' : '') + '</div>' +
      (res.done ? '<p class="tiny" style="margin:-4px 0 8px">'+esc(t('sg_done', {k: fmtNum(res.eaten)}))+'</p>' : '');
    if (!res.items.length) sh += '<p class="tiny">'+esc(t('sg_none_slot'))+'</p>';
    sh += '<div class="rlist">' + res.items.map(x => recipeCard(x.r,
      (x.serv !== 1 ? esc(t('sg_servings', {n: fmtQty(x.serv), k: fmtNum(x.kcal)})) + ' · ' : '') + esc(x.reasons.slice(0,2).join(' · ')))).join('') + '</div>';
    sh += '<div class="btnrow" style="margin-top:10px"><button class="btn ghost" type="button" data-act="ai-recipes" data-slot="'+slot+'" data-kcal="'+(res.target ? Math.round(res.target) : '')+'">'+icon('suggest')+esc(t('sg_ai_btn'))+'</button></div>';
    sh += '</div>';
  }
  const slotsEl = $('#sgSlots');
  if (slotsEl){ slotsEl.innerHTML = sh; fillThumbs(slotsEl); }
}

async function aiRecipesSheet(slot, kcal, mealPrep){
  if (!(await ensureAiReady())) return;
  let extra = '';
  const b = '<p class="muted">'+esc(mealPrep ? t('sg_prep_p') : t('sg_ai_p', {slot: t('slot_'+slot).toLowerCase()}))+'</p>' +
    '<div class="field"><label for="ai-extra">'+esc(t('sg_ai_extra'))+'</label><textarea id="ai-extra" placeholder="'+esc(t('sg_ai_extra_ph'))+'"></textarea></div>' +
    '<div id="ai-out"></div>';
  const sheet = openSheet(esc(mealPrep ? t('sg_prep_h') : t('sg_ai_btn')), b, '<button class="btn" type="button" id="ai-go">'+esc(t('sg_ai_go'))+'</button>');
  $('#ai-go').addEventListener('click', async () => {
    extra = $('#ai-extra').value.trim();
    const btn = $('#ai-go'); btn.disabled = true; btn.textContent = t('ai_working');
    $('#ai-out').innerHTML = '<div class="notice">'+esc(t('ai_working_long'))+'</div>';
    try {
      const recs = await aiRecipes({slot: mealPrep ? null : slot, kcal: kcal || null, count: 3, extra, mealPrep, date: S.suggestDate || localDateKey()});
      AI_DRAFTS.length = 0; recs.forEach(r => AI_DRAFTS.push(r));
      $('#ai-out').innerHTML = recs.map((r, i) => {
        const ex = recipeExclusions(r);
        return '<div class="card flat"><h3>'+esc(r.title)+'</h3><p class="tiny">'+esc([recipeTime(r) ? recipeTime(r)+' min' : '', recipeKcal(r) != null ? fmtNum(recipeKcal(r))+' kcal' : '', r.servings ? t('rc_servings_n',{n:r.servings}) : ''].filter(Boolean).join(' · '))+'</p>' +
          (r.summary ? '<p class="muted" style="margin-top:6px">'+esc(r.summary)+'</p>' : '') +
          (ex.length ? '<div class="notice bad">'+esc(t('rc_excl_h'))+' '+esc(ex.map(x=>x.label).join(', '))+'</div>' : '') +
          '<details><summary class="linkbtn">'+esc(t('sg_show_full'))+'</summary>' + recipeInline(r) + '</details>' +
          '<div class="btnrow" style="margin-top:8px"><button class="btn quiet" type="button" data-ai-save="'+i+'">'+esc(t('sg_save'))+'</button></div></div>';
      }).join('');
      $$('[data-ai-save]', sheet).forEach(bt => bt.addEventListener('click', async () => {
        const r = AI_DRAFTS[Number(bt.getAttribute('data-ai-save'))];
        await saveRecipe(r);
        bt.disabled = true; bt.textContent = t('sg_saved');
      }));
      btn.disabled = false; btn.textContent = t('sg_ai_again');
    } catch(err){
      $('#ai-out').innerHTML = '<div class="notice bad">'+esc(t('err_prefix'))+'<div class="verbatim">'+esc(String(err.message||err))+'</div></div>';
      btn.disabled = false; btn.textContent = t('sg_ai_go');
    }
  });
}
const AI_DRAFTS = [];

function recipeInline(r){
  return '<p class="eyebrow" style="margin-top:10px">'+esc(t('rc_ingredients'))+'</p><ul class="tips">' +
    (r.ingredients||[]).map(i => '<li>'+esc([fmtQty(i.qty), i.unit||'', i.item].join(' ').trim())+(i.prep ? ', '+esc(i.prep) : '')+'</li>').join('') + '</ul>' +
    '<p class="eyebrow" style="margin-top:10px">'+esc(t('rc_steps'))+'</p><ol class="steps">' + (r.steps||[]).map(s => '<li>'+esc(s.text)+'</li>').join('') + '</ol>';
}

/* A blank recipe you type in yourself. */
function newOwnRecipeSheet(){
  const b = '<div class="field"><label for="or-title">'+esc(t('or_title'))+'</label><input id="or-title" type="text"></div>' +
    '<div class="inline"><div class="field"><label for="or-serv">'+esc(t('rc_servings'))+'</label><input id="or-serv" type="number" inputmode="numeric" value="2"></div>' +
    '<div class="field"><label for="or-time">'+esc(t('rc_time'))+' (min)</label><input id="or-time" type="number" inputmode="numeric" value="30"></div></div>' +
    '<div class="field"><label for="or-ing">'+esc(t('or_ing'))+'</label><textarea id="or-ing" placeholder="'+esc(t('or_ing_ph'))+'" style="min-height:120px"></textarea></div>' +
    '<div class="field"><label for="or-steps">'+esc(t('or_steps'))+'</label><textarea id="or-steps" placeholder="'+esc(t('or_steps_ph'))+'" style="min-height:120px"></textarea></div>' +
    '<p class="tiny">'+esc(t('or_note'))+'</p>';
  openSheet(esc(t('rl_new')), b, '<button class="btn" type="button" id="or-save">'+esc(t('save'))+'</button>');
  $('#or-save').addEventListener('click', async () => {
    const title = $('#or-title').value.trim();
    if (!title){ toast(t('or_need_title')); return; }
    const rec = {
      id: 'rcp-' + ulid(), type:'recipe', schema:1, origin:'own', lang:S.lang, title, titleEn:'', summary:'',
      servings: Number($('#or-serv').value) || 1, time:{totalMin: Number($('#or-time').value) || null},
      ingredients: $('#or-ing').value.split('\n').map(x => x.trim()).filter(Boolean).map(parseIngredientLine),
      steps: $('#or-steps').value.split('\n').map(x => x.trim()).filter(Boolean).map(x => ({text: x.replace(/^\d+[.)]\s*/,'')})),
      tips:[], variations:[], nutrition:{perServing:{}, basis:'none'}, tags:[], sources:[{platform:'own'}], createdAt: nowIso()
    };
    await saveRecipe(rec);
    closeSheet(); S.recipeId = rec.id; S.recipeServings = null; go('recipe');
  });
}

function parseIngredientLine(line){
  const m = line.match(/^([\d.,/½¼¾]+)?\s*(g|kg|ml|l|dl|ks|lžíce|lžička|lzice|lzicka|tbsp|tsp|cup|hrnek|stroužek|pcs|pinch|špetka)?\.?\s+(.*)$/i);
  if (!m) return {item: line};
  let q = m[1] ? m[1].replace(',', '.').replace('½','.5').replace('¼','.25').replace('¾','.75') : null;
  if (q && q.indexOf('/') > 0){ const [a,b2] = q.split('/'); q = Number(a)/Number(b2); }
  return {qty: q != null ? Number(q) : null, unit: m[2] || null, item: m[3] || line};
}

/* Compact archive listing for Claude, so chat and plans can point at
   your own recipes by id. Excluded recipes are left out. */
async function recipeIndexForAi(limit){
  const list = visibleRecipes().filter(r => !recipeExclusions(r).length);
  if (!list.length) return '';
  return list.slice(0, limit || 160).map(r => {
    const ps = (r.nutrition||{}).perServing || {};
    const tags = (r.tags||[]).filter(x => ['meal','ing','prep','diet','cuisine'].indexOf(tagNs(x)) >= 0).slice(0, 9).join(' ');
    return [r.id, r.title, ps.kcal != null ? Math.round(ps.kcal) : '?', ps.prot != null ? Math.round(ps.prot) : '?', recipeTime(r) || '?', tags].join(' | ');
  }).join('\n');
}
