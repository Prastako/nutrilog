/* ============================================================
   Weekly and monthly review. Everything is computed on the phone from
   the diary; Claude only writes the optional commentary.
   Honest by design: a nutrient is judged only when enough of what you
   ate has a known value for it (coverage), otherwise it says so.
   ============================================================ */

function periodRange(mode, anchor){
  const a = dateFromKey(anchor || localDateKey());
  if (mode === 'month'){
    const from = new Date(a.getFullYear(), a.getMonth(), 1, 12);
    const to = new Date(a.getFullYear(), a.getMonth() + 1, 0, 12);
    return {from: localDateKey(from), to: localDateKey(to), key: 'month:' + localDateKey(from).slice(0,7)};
  }
  const dow = (a.getDay() + 6) % 7; /* Monday first */
  const from = new Date(a); from.setDate(a.getDate() - dow);
  const to = new Date(from); to.setDate(from.getDate() + 6);
  return {from: localDateKey(from), to: localDateKey(to), key: 'week:' + localDateKey(from)};
}

function periodLabel(mode, r){
  const f = dateFromKey(r.from), tt = dateFromKey(r.to);
  if (mode === 'month') return new Intl.DateTimeFormat(locale(), {month:'long', year:'numeric'}).format(f);
  const o = {day:'numeric', month:'numeric'};
  return new Intl.DateTimeFormat(locale(), o).format(f) + ' – ' + new Intl.DateTimeFormat(locale(), o).format(tt);
}

async function periodData(mode, anchor){
  const r = periodRange(mode, anchor);
  const entries = await recByTypeDate('food_entry', r.from, r.to);
  const intakes = S.prefs.review.includeSupplements ? await recByTypeDate('supplement_intake', r.from, r.to) : [];
  const days = {};
  entries.forEach(e => {
    if (!days[e.date]) days[e.date] = {total:{}, known:{}, kcal:0};
    const d = days[e.date];
    const n = e.nutrients || {};
    nutAdd(d.total, n);
    const kc = n.kcal || 0;
    d.kcal += kc;
    NUT_KEYS.forEach(k => { if (n[k] != null) d.known[k] = (d.known[k] || 0) + kc; });
  });
  const logged = Object.keys(days).sort();
  const nDays = logged.length;
  const sum = {}, known = {};
  let kcalAll = 0;
  logged.forEach(dk => { nutAdd(sum, days[dk].total); kcalAll += days[dk].kcal; NUT_KEYS.forEach(k => { known[k] = (known[k]||0) + (days[dk].known[k]||0); }); });
  /* supplements count only on logged days, so they do not inflate averages */
  const suppSum = {};
  intakes.filter(i => days[i.date]).forEach(i => nutAdd(suppSum, i.nutrients));
  const avg = {}, cov = {};
  NUT_KEYS.forEach(k => {
    const s = (sum[k] || 0) + (suppSum[k] || 0);
    avg[k] = nDays ? s / nDays : null;
    cov[k] = kcalAll ? (known[k] || 0) / kcalAll : 0;
    if (suppSum[k]) cov[k] = Math.max(cov[k], 0.99);
  });
  avg.o3ld = nDays ? (((sum.epa||0) + (sum.dha||0) + (suppSum.epa||0) + (suppSum.dha||0)) * 1000) / nDays : null;
  cov.o3ld = Math.min(cov.epa || 0, cov.dha || 0);
  if (suppSum.epa || suppSum.dha) cov.o3ld = 0.99;
  const totalDays = Math.round((dateFromKey(r.to) - dateFromKey(r.from)) / 86400000) + 1;
  return {range: r, entries, intakes, days, logged, nDays, totalDays, avg, cov, suppSum};
}

function nutrientStatus(k, avg, cov, ref){
  const R = ref[k];
  if (!R || R.kind === 'info') return {st:'info'};
  if (avg == null) return {st:'nodata'};
  if (R.kind === 'range'){
    if (R.low == null) return {st:'info'};
    return {st: avg < R.low * 0.9 ? 'low' : avg > R.high * 1.1 ? 'high' : 'ok', pct: avg / ((R.low + R.high)/2)};
  }
  if (cov < 0.6 && R.kind === 'min') return {st:'nodata', pct: avg / R.v};
  const pct = avg / R.v;
  if (R.kind === 'min') return {st: pct < 0.5 ? 'low2' : pct < 0.8 ? 'low' : pct < 1 ? 'close' : 'ok', pct};
  if (R.kind === 'max') return {st: pct > 1 ? 'high' : pct > 0.9 ? 'near' : 'ok', pct};
  return {st:'info'};
}

const REVIEW_KEYS = ['fib','prot','sfa','na','o3ld','ala','k','ca','mg','fe','zn','se','iod','vita','vitd','vite','vitk','vitc','b1','b2','b3','b6','fol','b12','choline','p','cu','mn','sug','alc','caff'];

function contributors(P, k, limit){
  const by = {};
  P.entries.forEach(e => {
    const n = e.nutrients || {};
    const v = k === 'o3ld' ? ((n.epa||0)+(n.dha||0))*1000 : n[k];
    if (!v) return;
    by[entryName(e)] = (by[entryName(e)] || 0) + v;
  });
  return Object.keys(by).map(name => ({name, v: by[name]})).sort((a,b) => b.v - a.v).slice(0, limit || 5);
}

async function renderReview(){
  const host = $('#s-review');
  await foodDbForNames();
  const mode = S.reviewMode;
  const P = await periodData(mode, S.reviewAnchor);
  const ref = referenceValues();
  let h = '<div class="seg" role="tablist">' +
    '<button type="button" class="'+(mode==='week'?'on':'')+'" data-act="rmode" data-v="week">'+esc(t('rv_week'))+'</button>' +
    '<button type="button" class="'+(mode==='month'?'on':'')+'" data-act="rmode" data-v="month">'+esc(t('rv_month'))+'</button></div>';
  h += '<div class="daynav" style="margin-top:12px"><button class="iconbtn sm" type="button" data-act="rnav" data-d="-1">'+icon('back')+'</button>' +
    '<span class="num">'+esc(periodLabel(mode, P.range))+'</span><button class="iconbtn sm flip" type="button" data-act="rnav" data-d="1">'+icon('back')+'</button></div>';
  if (!P.nDays){
    h += '<div class="card flat"><p class="muted">'+esc(t('rv_empty'))+'</p></div>';
    host.innerHTML = h; return;
  }
  const g = computeTargets(S.profile);
  h += '<div class="card"><p class="eyebrow">'+esc(t('rv_logged', {n: P.nDays, m: P.totalDays}))+'</p>' +
    '<div class="kv"><span class="k">'+esc(t('rv_avg_kcal'))+'</span><span class="v num">'+esc(fmtNum(P.avg.kcal))+' kcal'+(g ? ' <span class="tiny">('+fmtNum(g.low)+'–'+fmtNum(g.high)+')</span>' : '')+'</span></div>' +
    (g ? rangeBar(P.avg.kcal, g.low, g.high) : '');
  if (g){
    [['p','prot','macro_p'],['f','fat','macro_f'],['c','carb','macro_c']].forEach(([m,k,lab]) => {
      h += '<div class="kv"><span class="k">'+esc(t(lab))+'</span><span class="v num">'+esc(fmtNum(P.avg[k]))+' g <span class="tiny">('+fmtNum(g.macros[m].low)+'–'+fmtNum(g.macros[m].high)+')</span></span></div>' + rangeBar(P.avg[k], g.macros[m].low, g.macros[m].high);
    });
  }
  if (P.nDays < Math.min(4, P.totalDays)) h += '<div class="notice warn" style="margin-top:10px">'+esc(t('rv_few_days'))+'</div>';
  h += dailyChart(P, g) + '</div>';

  /* flags */
  const rows = REVIEW_KEYS.map(k => Object.assign({k, avg: P.avg[k], cov: P.cov[k]}, nutrientStatus(k, P.avg[k], P.cov[k], ref)));
  const lacking = rows.filter(r => r.st === 'low2' || r.st === 'low');
  const high = rows.filter(r => r.st === 'high');
  const nodata = rows.filter(r => r.st === 'nodata');
  h += '<div class="card"><h3>'+esc(t('rv_flags'))+'</h3>';
  if (!lacking.length && !high.length) h += '<p class="muted">'+esc(t('rv_all_ok'))+'</p>';
  if (lacking.length) h += '<p class="eyebrow" style="margin-top:8px">'+esc(t('rv_lacking'))+'</p>' + lacking.map(r => flagRow(r, ref)).join('');
  if (high.length) h += '<p class="eyebrow" style="margin-top:12px">'+esc(t('rv_high'))+'</p>' + high.map(r => flagRow(r, ref)).join('');
  if (nodata.length) h += '<p class="tiny" style="margin-top:10px">'+esc(t('rv_nodata', {list: nodata.map(r => nutLabel(r.k)).join(', ')}))+'</p>';
  h += '</div>';

  /* what to add / reduce */
  h += '<div id="rvAdd"></div>';
  if (high.length){
    h += '<div class="card"><h3>'+esc(t('rv_reduce_h'))+'</h3>';
    high.forEach(r => {
      const c = contributors(P, r.k, 4);
      h += '<p style="margin-top:8px"><b>'+esc(nutLabel(r.k))+'</b></p><ul class="tips">' + c.map(x => '<li>'+esc(x.name)+' <span class="tiny num">'+esc(fmtAmt(x.v / P.nDays))+' '+esc(nutUnit(r.k))+' '+esc(t('rv_per_day'))+'</span></li>').join('') + '</ul>';
    });
    h += '</div>';
  }

  /* all nutrients */
  h += '<details class="card"><summary><h3 style="display:inline">'+esc(t('rv_all'))+'</h3></summary><div style="margin-top:10px">';
  rows.forEach(r => {
    const R = ref[r.k];
    const target = R && (R.v || R.low);
    h += '<div class="nrow"><div class="kv" style="border:0;padding:6px 0 2px"><span class="k">'+esc(nutLabel(r.k))+'</span>' +
      '<span class="v num">'+esc(fmtAmt(r.avg))+' '+esc(nutUnit(r.k))+(target ? ' <span class="tiny">/ '+esc(fmtAmt(target))+'</span>' : '')+'</span></div>' +
      (target ? rangeBar(r.avg || 0, target, R.kind === 'max' ? target : target * 1.6, R.kind) : '') +
      '<div class="tiny">'+esc(t('rv_st_'+r.st))+(r.cov != null && r.st !== 'info' ? ' · '+esc(t('rv_cov', {p: Math.round((r.cov||0)*100)})) : '')+'</div></div>';
  });
  h += '<p class="tiny" style="margin-top:10px">'+esc(t('rv_ref_note'))+'</p></div></details>';

  h += '<label class="opt sq" style="margin:4px 0 12px"><input type="checkbox" id="rvSupp" '+(S.prefs.review.includeSupplements ? 'checked' : '')+'><span class="mark"></span><span class="txt"><span class="t1">'+esc(t('rv_incl_supp'))+'</span></span></label>';

  /* Claude commentary */
  const saved = (await recByType('summary')).filter(s => s.periodKey === P.range.key).sort((a,b) => a.updatedAt < b.updatedAt ? 1 : -1)[0];
  h += '<div class="card"><h3>'+esc(t('rv_ai_h'))+'</h3>' +
    (saved ? '<div class="aitext">'+mdLite(saved.text)+'</div><p class="tiny" style="margin-top:8px">'+esc(t('rv_ai_when', {d: fmtDateTime(saved.updatedAt)}))+'</p>' : '<p class="tiny">'+esc(t('rv_ai_p'))+'</p>') +
    '<div class="btnrow" style="margin-top:10px"><button class="btn quiet" type="button" data-act="rv-ai" id="rvAi">'+icon('chat')+esc(saved ? t('rv_ai_again') : t('rv_ai_btn'))+'</button></div></div>';
  host.innerHTML = h;
  $('#rvSupp').addEventListener('change', async e => { S.prefs.review.includeSupplements = e.target.checked; await savePrefs(); renderReview(); });
  renderAddSuggestions($('#rvAdd'), lacking);
  REVIEW_LAST = {P, rows, lacking, high, nodata, ref};
}
let REVIEW_LAST = null;

function flagRow(r, ref){
  const R = ref[r.k];
  const target = R.v || R.low;
  return '<div class="flag '+(r.st === 'high' ? 'hi' : r.st === 'low2' ? 'lo2' : 'lo')+'"><span class="k">'+esc(nutLabel(r.k))+'</span>' +
    '<span class="v num">'+esc(fmtAmt(r.avg))+' / '+esc(fmtAmt(target))+' '+esc(nutUnit(r.k))+' <b>'+esc(Math.round((r.pct||0)*100))+' %</b></span></div>';
}

function dailyChart(P, g){
  const days = [];
  for (let k = P.range.from; k <= P.range.to; k = addDays(k, 1)) days.push(k);
  const vals = days.map(k => P.days[k] ? P.days[k].total.kcal || 0 : null);
  const max = Math.max(g ? g.high * 1.15 : 0, ...vals.filter(v => v != null), 1);
  const W = 320, H = 90, bw = W / days.length;
  let s = '<svg class="daychart" viewBox="0 0 '+W+' '+(H+14)+'" role="img" aria-label="'+esc(t('rv_chart'))+'">';
  if (g) s += '<rect x="0" y="'+(H - g.high/max*H)+'" width="'+W+'" height="'+((g.high-g.low)/max*H)+'" fill="var(--teal-soft)"/>';
  vals.forEach((v, i) => {
    if (v == null) return;
    const hgt = v / max * H;
    const cls = g ? (v < g.low ? 'var(--ochre)' : v > g.high ? 'var(--garnet)' : 'var(--teal)') : 'var(--teal)';
    s += '<rect x="'+(i*bw + bw*0.18)+'" y="'+(H - hgt)+'" width="'+(bw*0.64)+'" height="'+hgt+'" rx="2" fill="'+cls+'"/>';
  });
  if (days.length <= 7) days.forEach((k, i) => { s += '<text x="'+(i*bw + bw/2)+'" y="'+(H+11)+'" text-anchor="middle" font-size="8.5" fill="var(--ink3)">'+esc(new Intl.DateTimeFormat(locale(), {weekday:'short'}).format(dateFromKey(k)))+'</text>'; });
  return s + '</svg>';
}

async function renderAddSuggestions(el, lacking){
  if (!el || !lacking.length){ if (el) el.innerHTML = ''; return; }
  let h = '<div class="card"><h3>'+esc(t('rv_add_h'))+'</h3>';
  for (const r of lacking.slice(0, 5)){
    const foods = await foodsRichIn(r.k, 5);
    const recs = visibleRecipes().filter(x => !recipeExclusions(x).length).map(x => {
      const ps = (x.nutrition||{}).perServing || {};
      const v = r.k === 'o3ld' ? ((ps.epa||0)+(ps.dha||0))*1000 : ps[r.k];
      return {x, v};
    }).filter(o => o.v).sort((a,b) => b.v - a.v).slice(0, 2);
    h += '<p style="margin-top:10px"><b>'+esc(nutLabel(r.k))+'</b> <span class="tiny">'+esc(t('rv_add_per100'))+'</span></p>' +
      '<p class="tiny">' + foods.map(f => esc(foodName(f.food).split(',').slice(0,2).join(',')) + ' <span class="num">(' + esc(fmtAmt(f.per100)) + ' ' + esc(nutUnit(r.k)) + ')</span>').join(' · ') + '</p>';
    if (recs.length) h += '<div class="rlist" style="margin-top:6px">' + recs.map(o => recipeCard(o.x, esc(nutLabel(r.k)) + ' ' + esc(fmtAmt(o.v)) + ' ' + esc(nutUnit(r.k)) + ' / ' + esc(t('rc_serv_short')))).join('') + '</div>';
  }
  h += '<p class="tiny" style="margin-top:10px">'+esc(t('rv_add_note'))+'</p></div>';
  el.innerHTML = h;
  fillThumbs(el);
}

async function reviewWithClaude(){
  if (!REVIEW_LAST) return;
  if (!(await ensureAiReady())) return;
  const {P, rows, ref} = REVIEW_LAST;
  const btn = $('#rvAi'); if (btn){ btn.disabled = true; btn.textContent = t('ai_working'); }
  const g = computeTargets(S.profile);
  const lines = [];
  lines.push('Days logged: ' + P.nDays + ' of ' + P.totalDays + '. Supplements included: ' + (S.prefs.review.includeSupplements ? 'yes' : 'no') + '.');
  if (g) lines.push('Average energy ' + Math.round(P.avg.kcal) + ' kcal (target ' + g.low + ' to ' + g.high + '); protein ' + Math.round(P.avg.prot) + ' g (' + g.macros.p.low + ' to ' + g.macros.p.high + '); fat ' + Math.round(P.avg.fat) + ' g; carbohydrate ' + Math.round(P.avg.carb) + ' g.');
  lines.push('Per nutrient (average per logged day / reference / status / data coverage):');
  rows.forEach(r => {
    const R = ref[r.k];
    const name = NUT[r.k] ? NUT[r.k].en : NUT_DERIVED[r.k].en;
    lines.push('- ' + name + ': ' + (r.avg == null ? '?' : fmtAmt(r.avg)) + ' ' + nutUnit(r.k) + ' / ' + (R ? (R.v || R.low || '-') : '-') + ' / ' + r.st + ' / ' + Math.round((r.cov||0)*100) + '%');
  });
  const top = {};
  P.entries.forEach(e => { const n = entryName(e); top[n] = (top[n] || 0) + 1; });
  lines.push('Most logged items: ' + Object.keys(top).sort((a,b) => top[b] - top[a]).slice(0, 15).map(n => n + ' (' + top[n] + 'x)').join(', '));
  const supp = Object.keys(P.suppSum).length ? 'Supplement contribution per period: ' + Object.keys(P.suppSum).map(k => nutLabel(k) + ' ' + fmtAmt(P.suppSum[k])).join(', ') : 'No supplements logged.';
  lines.push(supp);
  try {
    const text = await aiReview((S.reviewMode === 'month' ? 'month ' : 'week ') + periodLabel(S.reviewMode, P.range), lines.join('\n'));
    await recPut({type:'summary', periodKey: P.range.key, date: P.range.from, mode: S.reviewMode, text, model: S.prefs.models.analysis});
    renderReview();
  } catch(err){
    toast(t('err_prefix') + ': ' + String(err.message || err), 7000);
    if (btn){ btn.disabled = false; btn.textContent = t('rv_ai_btn'); }
  }
}
