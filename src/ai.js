/* ============================================================
   Claude. Every call goes through API.anthropic or claudeStream, so the
   endpoint can move to a server proxy later without touching anything
   else. The key lives only on this phone (IndexedDB "secrets").
   ============================================================ */

const API = {
  anthropicBase: 'https://api.anthropic.com',
  headers(){
    return {
      'x-api-key': S.secrets.anthropic,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json'
    };
  },
  async anthropic(path, init){
    const headers = Object.assign(API.headers(), (init && init.headers) || {});
    const res = await fetch(API.anthropicBase + path, Object.assign({}, init || {}, {headers}));
    const txt = await res.text();
    let body = null;
    try { body = txt ? JSON.parse(txt) : null; } catch(e){ body = {raw: txt}; }
    if (body && body.usage) trackUsage(body.model, body.usage);
    else { S.meta.usage.calls++; saveMeta(); }
    if (!res.ok){
      const msg = (body && body.error && body.error.message) || (body && body.raw) || txt || '';
      throw new Error(res.status + ' ' + res.statusText + (msg ? ': ' + String(msg).slice(0,400) : ''));
    }
    return body;
  }
};

function priceFor(model){
  const p = S.prefs.prices[model];
  if (p) return {in: Number(p.in)||0, out: Number(p.out)||0};
  const m = String(model||'');
  if (m.indexOf('opus') >= 0) return {in:5, out:25};
  if (m.indexOf('haiku') >= 0) return {in:1, out:5};
  if (m.indexOf('fable') >= 0) return {in:10, out:50};
  return {in:2, out:10};
}

function monthKey(){ return localDateKey().slice(0,7); }

function trackUsage(model, usage){
  const u = S.meta.usage;
  const inn = (usage.input_tokens || 0), out = (usage.output_tokens || 0);
  const cw = usage.cache_creation_input_tokens || 0, cr = usage.cache_read_input_tokens || 0;
  const pr = priceFor(model);
  const cost = (inn/1e6)*pr.in + (cw/1e6)*pr.in*1.25 + (cr/1e6)*pr.in*0.1 + (out/1e6)*pr.out;
  u.calls++;
  u.inTok += inn + cw + cr;
  u.outTok += out;
  const mid = model || 'unknown';
  if (!u.byModel[mid]) u.byModel[mid] = {in:0, out:0};
  u.byModel[mid].in += inn + cw + cr;
  u.byModel[mid].out += out;
  if (!u.byMonth) u.byMonth = {};
  const mk = monthKey();
  if (!u.byMonth[mk]) u.byMonth[mk] = {calls:0, cost:0};
  u.byMonth[mk].calls++;
  u.byMonth[mk].cost += cost;
  saveMeta();
}

function monthCost(){
  const b = (S.meta.usage.byMonth || {})[monthKey()];
  return b ? b.cost : 0;
}

let budgetOkThisSession = false;
async function ensureAiReady(){
  if (!S.secrets.anthropic){
    const go2 = await confirmSheet(t('ai_nokey_h'), '<p class="muted">'+esc(t('ai_nokey_p'))+'</p>', t('open_settings'));
    if (go2) go('settings');
    return false;
  }
  if (!navigator.onLine){ toast(t('err_offline')); return false; }
  const lim = Number(S.prefs.budget.monthlyUsd) || 0;
  if (lim > 0 && monthCost() >= lim && !budgetOkThisSession){
    const ok = await confirmSheet(t('ai_budget_h'),
      '<p class="muted">'+esc(t('ai_budget_p', {spent: fmtNum(monthCost(),2), lim: fmtNum(lim,2)}))+'</p>', t('ai_budget_go'));
    if (!ok) return false;
    budgetOkThisSession = true;
  }
  return true;
}

/* Streaming call. onText gets each piece of text as it arrives.
   Returns the finished message with content blocks, like the plain API. */
async function claudeStream(body, onText){
  const payload = Object.assign({}, body, {stream: true});
  const res = await fetch(API.anthropicBase + '/v1/messages', {method:'POST', headers: API.headers(), body: JSON.stringify(payload)});
  if (!res.ok){
    const txt = await res.text();
    let msg = txt;
    try { const j = JSON.parse(txt); msg = (j.error && j.error.message) || txt; } catch(e){}
    S.meta.usage.calls++; saveMeta();
    throw new Error(res.status + ' ' + res.statusText + ': ' + String(msg).slice(0,400));
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  const msg = {content: [], usage: {}, stop_reason: null, model: body.model};
  const handle = (ev, data) => {
    if (ev === 'message_start'){ msg.model = data.message.model; msg.usage = Object.assign({}, data.message.usage || {}); }
    else if (ev === 'content_block_start'){
      const b = Object.assign({}, data.content_block);
      if (b.type === 'tool_use'){ b._json = ''; b.input = {}; }
      if (b.type === 'text') b.text = b.text || '';
      msg.content[data.index] = b;
    }
    else if (ev === 'content_block_delta'){
      const b = msg.content[data.index];
      if (!b) return;
      if (data.delta.type === 'text_delta'){ b.text += data.delta.text; if (onText) onText(data.delta.text); }
      else if (data.delta.type === 'input_json_delta'){ b._json += data.delta.partial_json; }
    }
    else if (ev === 'content_block_stop'){
      const b = msg.content[data.index];
      if (b && b.type === 'tool_use'){ try { b.input = b._json ? JSON.parse(b._json) : {}; } catch(e){ b.input = {}; } delete b._json; }
    }
    else if (ev === 'message_delta'){
      if (data.delta && data.delta.stop_reason) msg.stop_reason = data.delta.stop_reason;
      if (data.usage) Object.assign(msg.usage, data.usage);
    }
    else if (ev === 'error'){ throw new Error((data.error && data.error.message) || 'stream error'); }
  };
  for (;;){
    const {value, done} = await reader.read();
    if (done) break;
    buf += dec.decode(value, {stream:true});
    let cut;
    while ((cut = buf.indexOf('\n\n')) >= 0){
      const chunk = buf.slice(0, cut); buf = buf.slice(cut + 2);
      let ev = '', data = '';
      chunk.split('\n').forEach(line => {
        if (line.startsWith('event:')) ev = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      });
      if (!data) continue;
      let parsed; try { parsed = JSON.parse(data); } catch(e){ continue; }
      handle(ev || parsed.type, parsed);
    }
  }
  msg.content = msg.content.filter(Boolean);
  trackUsage(msg.model, msg.usage);
  return msg;
}

/* Ask for one forced tool call and return its input: reliable JSON. */
async function claudeTool(opts){
  const body = {
    model: opts.model || S.prefs.models.chat,
    max_tokens: opts.max_tokens || 2000,
    system: opts.system ? [{type:'text', text: opts.system, cache_control:{type:'ephemeral'}}] : undefined,
    messages: opts.messages,
    tools: [opts.tool],
    tool_choice: {type:'tool', name: opts.tool.name}
  };
  const msg = await API.anthropic('/v1/messages', {method:'POST', body: JSON.stringify(body)});
  const tu = (msg.content || []).find(b => b.type === 'tool_use');
  if (!tu) throw new Error(t('ai_bad_reply'));
  return tu.input;
}

function langInstruction(){
  return S.lang === 'cs'
    ? 'Write every user facing text in Czech (natural, everyday Czech). Keep numbers with metric units.'
    : 'Write every user facing text in English. Use metric units.';
}

/* ---------- Context about the person, sent with every request ---------- */

function exclusionText(){
  const ex = (S.profile && S.profile.food && S.profile.food.exclusions) || [];
  if (!ex.length) return 'none';
  return ex.map(x => x.label + ' (' + (x.type === 'allergy' ? 'ALLERGY' : 'does not eat') + (x.syn && x.syn.length ? '; also: ' + x.syn.slice(0,14).join(', ') : '') + ')').join('; ');
}

async function dayTotals(dateKey){
  const entries = await recByTypeDate('food_entry', dateKey, dateKey);
  const bySlot = {};
  const total = {};
  entries.forEach(e => {
    const s = e.slot || 'other';
    if (!bySlot[s]) bySlot[s] = {};
    nutAdd(bySlot[s], e.nutrients);
    nutAdd(total, e.nutrients);
  });
  return {entries, bySlot, total};
}

async function buildContext(opts){
  opts = opts || {};
  const P = S.profile;
  const lines = [];
  if (!P || !P.person){ lines.push('The person has not filled in a profile yet.'); return lines.join('\n'); }
  const p = P.person, G = P.goals || {}, F = P.food || {}, K = P.kitchen || {};
  const g = computeTargets(P);
  lines.push('PROFILE: ' + [p.sex === 'female' ? 'female physiology' : 'male physiology', p.age + ' years', p.heightCm + ' cm', p.weightKg + ' kg',
    'activity level ' + p.activityLevel + ' of 4', 'direction: ' + (G.direction || 'maintain')].join(', '));
  if (g) lines.push('DAILY TARGETS (ranges): energy ' + g.low + ' to ' + g.high + ' kcal; protein ' + g.macros.p.low + ' to ' + g.macros.p.high +
    ' g; fat ' + g.macros.f.low + ' to ' + g.macros.f.high + ' g; carbohydrate ' + g.macros.c.low + ' to ' + g.macros.c.high + ' g; fibre at least 25 g.');
  const shares = slotShares();
  lines.push('MEAL SLOTS share of the day: ' + SLOTS.map(s => s + ' ' + Math.round(shares[s]*100) + '%').join(', '));
  if ((G.dietStyle||[]).length) lines.push('DIET STYLE: ' + G.dietStyle.map(x => t('ds_'+x)).join(', '));
  if ((G.aims||[]).length) lines.push('AIMS: ' + G.aims.map(x => t('aim_'+x)).join(', '));
  if ((G.focusNutrients||[]).length) lines.push('NUTRIENTS TO FOCUS ON: ' + G.focusNutrients.map(nutLabel).join(', '));
  if (G.notes) lines.push('NOTES FROM THE PERSON (their own words): ' + G.notes);
  lines.push('HARD EXCLUSIONS, never include them, check every ingredient and hidden sources such as sauces and stock: ' + exclusionText());
  if (F.dislikes) lines.push('DISLIKES (avoid when possible): ' + F.dislikes);
  const cz = (F.cuisines||[]).map(id => { const c = CUISINES.find(x => x.id === id); return c ? c.en : id; });
  if (F.cuisineOther) cz.push(F.cuisineOther);
  if (cz.length) lines.push('LIKES CUISINES: ' + cz.join(', '));
  lines.push('KITCHEN: weekday cooking time up to ' + TIME_MAX_MIN[K.timeWeekday||2] + ' min, weekend up to ' + TIME_MAX_MIN[K.timeWeekend||3] +
    ' min; equipment: ' + ((K.equipment||[]).map(e => t('eq_'+e)).join(', ') || 'basic hob') + '; weekly food budget: ' + t(K.budget || 'bud3') +
    '; meal prep: cooks about ' + ((K.mealPrep||{}).cookDaysPerWeek || 3) + ' days a week, batches of about ' + ((K.mealPrep||{}).batchServings || 3) + ' servings.');
  if (opts.today){
    const d = await dayTotals(opts.date || localDateKey());
    const parts = SLOTS.concat(['other']).filter(s => d.bySlot[s]).map(s => s + ' ' + Math.round(d.bySlot[s].kcal||0) + ' kcal (P ' + Math.round(d.bySlot[s].prot||0) + ' g)');
    lines.push('EATEN ' + (opts.date || 'TODAY') + ': ' + (parts.length ? parts.join('; ') : 'nothing logged yet') +
      '. Total ' + Math.round(d.total.kcal||0) + ' kcal, protein ' + Math.round(d.total.prot||0) + ' g, fat ' + Math.round(d.total.fat||0) + ' g, carbohydrate ' + Math.round(d.total.carb||0) + ' g, fibre ' + Math.round(d.total.fib||0) + ' g.');
    if (g) lines.push('REMAINING TO THE MIDDLE OF THE TARGET: ' + Math.max(0, Math.round(g.mid - (d.total.kcal||0))) + ' kcal.');
  }
  if (opts.pantry){
    const items = await recByType('pantry_item');
    const have = items.filter(i => i.have).map(i => i.name);
    const out = items.filter(i => !i.have).map(i => i.name);
    lines.push('PANTRY, AT HOME: ' + (have.length ? have.join(', ') : 'unknown, nothing listed'));
    if (out.length) lines.push('PANTRY, RAN OUT OF: ' + out.join(', '));
  }
  if (opts.recipes){
    const idx = await recipeIndexForAi(opts.recipes === true ? 160 : opts.recipes);
    if (idx) lines.push('RECIPE ARCHIVE (id | title | kcal per serving | protein g | minutes | tags):\n' + idx);
  }
  return lines.join('\n');
}

/* ---------- Image helper ---------- */

function fileToDownscaledJpeg(file, maxSide, quality){
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, (maxSide || 1568) / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality || 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
    img.src = url;
  });
}

/* ---------- Shared schemas ---------- */

const NUTRIENT_SCHEMA = {
  type:'object',
  description:'Nutrients. Energy in kcal; prot, fat, carb, fib, sug, sfa in g; na (sodium), k, ca, mg, fe, zn in mg; vitc in mg; vitd, b12 in micrograms. Use null when you cannot estimate.',
  properties: { kcal:{type:['number','null']}, prot:{type:['number','null']}, fat:{type:['number','null']}, carb:{type:['number','null']},
    fib:{type:['number','null']}, sug:{type:['number','null']}, sfa:{type:['number','null']}, na:{type:['number','null']},
    k:{type:['number','null']}, ca:{type:['number','null']}, mg:{type:['number','null']}, fe:{type:['number','null']},
    zn:{type:['number','null']}, vitc:{type:['number','null']}, vitd:{type:['number','null']}, b12:{type:['number','null']} },
  required:['kcal','prot','fat','carb']
};

const RECIPE_SCHEMA = {
  type:'object',
  properties:{
    title:{type:'string', description:'Recipe name in the user language'},
    titleEn:{type:'string', description:'Recipe name in English'},
    summary:{type:'string', description:'One sentence: what it is and why it fits'},
    servings:{type:'number'},
    time:{type:'object', properties:{prepMin:{type:'number'}, cookMin:{type:'number'}, totalMin:{type:'number'}}, required:['totalMin']},
    difficulty:{type:'string', enum:['easy','medium','hard']},
    ingredients:{type:'array', items:{type:'object', properties:{
      group:{type:['string','null'], description:'Section such as Sauce, or null'},
      item:{type:'string'}, qty:{type:['number','null']}, unit:{type:['string','null'], description:'g, ml, tbsp, tsp, pcs, pinch, clove...'},
      grams:{type:['number','null'], description:'Weight in grams if you can estimate it'},
      prep:{type:['string','null']}, optional:{type:'boolean'}}, required:['item']}},
    steps:{type:'array', items:{type:'object', properties:{text:{type:'string'}, minutes:{type:['number','null']}}, required:['text']}},
    tips:{type:'array', items:{type:'string'}},
    variations:{type:'array', items:{type:'object', properties:{label:{type:'string'}, text:{type:'string'}}, required:['label','text']}},
    storage:{type:'object', properties:{fridgeDays:{type:['number','null']}, freezer:{type:['boolean','null']}, reheat:{type:['string','null']}}},
    nutritionPerServing: NUTRIENT_SCHEMA,
    tags:{type:'array', items:{type:'string'}, description:'Namespaced tags, generous: meal:breakfast|lunch|snack|dinner, ing:<main ingredient>, cuisine:<x>, time:under-15|under-30|under-60|over-60, prep:meal-prep|freezer-friendly|one-pot|no-cook, diet:high-protein|vegetarian|vegan|low-carb|high-fibre, method:<technique>, equip:<tool>, flavor:<x>'}
  },
  required:['title','servings','time','ingredients','steps','nutritionPerServing','tags']
};

/* ---------- Tasks ---------- */

async function aiEvaluatePhoto(dataUrl, hint, note){
  const ctx = await buildContext({today:true});
  const tool = {
    name:'report_food_evaluation',
    description:'Report what the photo shows, its nutrition and how well it fits the person.',
    input_schema:{ type:'object', properties:{
      kind:{type:'string', enum:['dish','packaged_product','nutrition_label','ingredient','menu','unclear']},
      name:{type:'string'},
      description:{type:'string'},
      brand:{type:['string','null']},
      portionGrams:{type:['number','null'], description:'Estimated grams on the plate, or the package or serving size'},
      servingLabel:{type:['string','null']},
      per100g: NUTRIENT_SCHEMA,
      perPortion: NUTRIENT_SCHEMA,
      nutritionBasis:{type:'string', enum:['read_from_label','estimated_from_photo','typical_values']},
      ingredientsSeen:{type:'array', items:{type:'string'}},
      exclusionWarnings:{type:'array', items:{type:'string'}, description:'Any of the person\'s exclusions that are or might be present, with why'},
      fitScore:{type:'number', description:'1 poor fit to 5 excellent fit for this person today'},
      verdict:{type:'string', description:'One short sentence'},
      reasons:{type:'array', items:{type:'string'}},
      suggestions:{type:'array', items:{type:'string'}, description:'Concrete tweaks: swap, add, portion'},
      confidence:{type:'string', enum:['low','medium','high']}
    }, required:['kind','name','per100g','perPortion','nutritionBasis','fitScore','verdict','reasons','confidence'] }
  };
  const system = 'You are the nutrition assistant inside NutriLog, a personal food diary. ' + langInstruction() +
    ' Read labels exactly when a label is visible (per 100 g column first). For dishes, estimate portion and nutrients realistically and say so. Judge fit against the person\'s targets, remaining budget for today, aims and exclusions. Be direct, no moralising.\n\n' + ctx;
  const content = [
    {type:'image', source:{type:'base64', media_type:'image/jpeg', data: dataUrl.split(',')[1]}},
    {type:'text', text: 'Photo type hint from the person: ' + (hint || 'auto') + (note ? '. Their note: ' + note : '') + '. Evaluate it.'}
  ];
  return claudeTool({model: S.prefs.models.vision, system, messages:[{role:'user', content}], tool, max_tokens: 2500});
}

async function aiEstimateText(text){
  const tool = {
    name:'report_meal_estimate',
    description:'Split what the person ate into items with estimated grams and nutrients.',
    input_schema:{ type:'object', properties:{
      items:{type:'array', items:{type:'object', properties:{
        name:{type:'string'}, grams:{type:'number'}, nutrients: NUTRIENT_SCHEMA, note:{type:['string','null']}
      }, required:['name','grams','nutrients']}},
      confidence:{type:'string', enum:['low','medium','high']},
      assumptions:{type:'string'}
    }, required:['items','confidence'] }
  };
  const system = 'You estimate nutrition for a food diary. ' + langInstruction() + ' Use typical Czech and European portions and products unless told otherwise. Give each distinct item separately.';
  return claudeTool({model: S.prefs.models.chat, system, messages:[{role:'user', content: text}], tool, max_tokens: 2000});
}

async function aiRecipes(opts){
  const ctx = await buildContext({today:true, pantry:true, date: opts.date});
  const tool = {
    name:'propose_recipes',
    description:'Propose complete recipes.',
    input_schema:{type:'object', properties:{ recipes:{type:'array', items: RECIPE_SCHEMA} }, required:['recipes']}
  };
  const system = 'You are the recipe assistant inside NutriLog. ' + langInstruction() +
    ' Write complete, cookable recipes: every ingredient with quantity and unit, clear numbered steps, realistic times, per serving nutrition estimates. Never use any hard exclusion. Prefer what is in the pantry. Use ingredients easy to buy in Czech supermarkets (Lidl, Albert, Billa, Tesco, Kaufland).\n\n' + ctx;
  const ask = 'Propose ' + (opts.count || 3) + ' different ' + (opts.slot ? opts.slot + ' ' : '') + 'recipes' +
    (opts.kcal ? ' of about ' + Math.round(opts.kcal) + ' kcal per serving' : '') +
    (opts.mealPrep ? ', suitable for meal prep (keeps 3 to 4 days in the fridge, reheats well)' : '') +
    (opts.extra ? '. Extra wishes: ' + opts.extra : '') + '. Make them clearly different from each other.';
  const out = await claudeTool({model: S.prefs.models.chat, system, messages:[{role:'user', content: ask}], tool, max_tokens: 9000});
  return (out.recipes || []).map(r => recipeFromAi(r, 'claude'));
}

async function aiReview(periodLabel, digest){
  const ctx = await buildContext({});
  const system = 'You are the nutrition coach inside NutriLog. ' + langInstruction() +
    ' You get a computed summary of a period of food logging. Write a short, concrete review: 1) what went well, 2) what is lacking and exactly what to add (specific foods and amounts, prefer the person\'s recipe archive when it fits), 3) what to reduce, 4) one habit for next ' + (periodLabel.indexOf('month') >= 0 ? 'month' : 'week') + '. Respect exclusions. Say when data coverage is too low to judge. Plain text with short headings and bullet points. No medical diagnosis.\n\n' + ctx;
  const msg = await API.anthropic('/v1/messages', {method:'POST', body: JSON.stringify({
    model: S.prefs.models.analysis, max_tokens: 2500,
    system: [{type:'text', text: system}],
    messages: [{role:'user', content: 'Period: ' + periodLabel + '\n\n' + digest}]
  })});
  return (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}
