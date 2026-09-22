/* ============================================================
   Foods: the bundled database, search in Czech and English,
   Open Food Facts for barcodes and branded products, your own foods.
   All values are per 100 g unless stated.
   ============================================================ */

const FOODDB = { ready:false, loading:null, foods:[], byId:{}, nutrients:[], source:'' };

async function loadFoodDb(){
  if (FOODDB.ready) return FOODDB;
  if (FOODDB.loading) return FOODDB.loading;
  FOODDB.loading = (async () => {
    const res = await fetch('data/foods.json?v=' + encodeURIComponent(VERSION));
    if (!res.ok) throw new Error('foods.json ' + res.status);
    const j = await res.json();
    FOODDB.nutrients = j.nutrients;
    FOODDB.source = j.source;
    FOODDB.foods = j.foods.map(f => {
      const per100 = {};
      j.nutrients.forEach((k, i) => { per100[k] = f.n[i]; });
      const food = {
        ref: 'usda:' + f.i, kind: 'usda', en: f.en, cs: f.cs || null, cat: f.c,
        per100, portions: (f.p || []).map(p => ({label: p[0], g: p[1]}))
      };
      food._tok = tokensOf(food.en + ' ' + (food.cs || ''));
      food._head = fold(food.en.split(',')[0]);
      return food;
    });
    FOODDB.foods.forEach(f => { FOODDB.byId[f.ref] = f; });
    FOODDB.ready = true;
    return FOODDB;
  })();
  try { return await FOODDB.loading; }
  catch(e){ FOODDB.loading = null; throw e; }
}

function tokensOf(s){
  return fold(s).replace(/[^a-z0-9%]+/g,' ').split(' ').filter(Boolean);
}

/* Czech search words (folded, as prefixes) to English words in the database.
   The database itself is in English; this lets you type in Czech.
   Every database food also carries a Czech name (field cs), searched too. */
const CS_EN = [
  ['kurec','chicken'],['kure','chicken'],['kurat','chicken'],['kuret','chicken'],['krut','turkey'],['hovez','beef'],['hovad','beef'],
  ['vepr','pork'],['jehne','lamb'],['jehnec','lamb'],['telec','veal'],['tele','veal'],['kachn','duck'],['husa','goose'],['husi','goose'],
  ['kralik','rabbit'],['kralic','rabbit'],['zverin','venison'],['jelen','venison'],['slanin','bacon'],['sunk','ham'],['parek','frankfurter'],
  ['park','frankfurter'],['klobas','sausage'],['salam','salami'],['mlet','ground'],['prsa','breast'],['prsni','breast'],['prs','breast'],
  ['stehn','thigh'],['kridl','wing'],['kridel','wing'],['palick','drumstick'],['jatr','liver'],['srdc','heart'],['ledvin','kidney'],
  ['jazyk','tongue'],['svickov','tenderloin'],['kotlet','chop'],['plec','shoulder'],['krkovic','shoulder'],['bocek','belly'],['zebr','ribs'],
  ['ryb','fish'],['losos','salmon'],['tunak','tuna'],['tresk','cod'],['makrel','mackerel'],['sardink','sardine'],['sled','herring'],
  ['pstruh','trout'],['kapr','carp'],['tilapi','tilapia'],['krevet','shrimp'],['garnat','shrimp'],['musl','mussel'],['slavk','mussel'],
  ['chobotnic','octopus'],['olihen','squid'],['kalamar','squid'],['ancovic','anchovy'],['platyz','flatfish'],['halibut','halibut'],
  ['mlek','milk'],['mlec','milk'],['jogurt','yogurt'],['recky','greek'],['syr','cheese'],['tvaroh','cottage'],['smetan','cream'],
  ['zakys','sour'],['masl','butter'],['vejc','egg'],['vajic','egg'],['vajec','egg'],['bilek','white'],['bilk','white'],['zloutek','yolk'],
  ['zloutk','yolk'],['kefir','kefir'],['mozzarel','mozzarella'],['parmaz','parmesan'],['eidam','edam'],['gouda','gouda'],['ricott','ricotta'],
  ['feta','feta'],['hermelin','camembert'],['niva','blue'],['emental','swiss'],['cedar','cheddar'],['podmasl','buttermilk'],['syrovatk','whey'],
  ['skyr','yogurt'],['ryz','rice'],['oves','oat'],['vlock','oats'],['psenic','wheat'],['psenicn','wheat'],['zitn','rye'],['zito','rye'],
  ['jecmen','barley'],['kroup','barley'],['pohank','buckwheat'],['jahl','millet'],['quinoa','quinoa'],['kinoa','quinoa'],['kuskus','couscous'],
  ['bulgur','bulgur'],['testovin','pasta'],['spaget','spaghetti'],['nudl','noodles'],['chleb','bread'],['chlebic','bread'],['rohlik','rolls'],
  ['housk','rolls'],['bage','french'],['toust','toasted'],['knedl','dumpling'],['mouk','flour'],['kukuric','corn'],['krupic','semolina'],
  ['musli','granola'],['granol','granola'],['tortil','tortillas'],['palacink','pancakes'],['livan','pancakes'],['celozrn','whole'],
  ['fazol','beans'],['cock','lentils'],['cizrn','chickpeas'],['hrach','peas'],['hrasek','peas'],['hrask','peas'],['soj','soy'],['tofu','tofu'],
  ['tempeh','tempeh'],['edamame','edamame'],['arasid','peanut'],['orech','nuts'],['orisk','nuts'],['vlassk','walnuts'],['lisk','hazelnuts'],
  ['mandl','almonds'],['kesu','cashew'],['pistac','pistachio'],['makadam','macadamia'],['pekan','pecans'],['semin','seeds'],['seminek','seeds'],
  ['slunecnic','sunflower'],['dyn','pumpkin'],['lnen','flaxseed'],['chia','chia'],['sezam','sesame'],['mak','poppy'],['konopn','hemp'],
  ['kokos','coconut'],['brambor','potatoes'],['batat','sweet'],['mrkev','carrots'],['mrkv','carrots'],['cibul','onions'],['cesnek','garlic'],
  ['cesnk','garlic'],['rajc','tomatoes'],['okurk','cucumber'],['paprik','peppers'],['chilli','hot'],['chili','hot'],['salat','lettuce'],
  ['ledov','iceberg'],['spenat','spinach'],['brokolic','broccoli'],['kvetak','cauliflower'],['zeli','cabbage'],['kapust','cabbage'],
  ['kaden','kale'],['kedluben','kohlrabi'],['cuket','squash'],['lilek','eggplant'],['dyne','pumpkin'],['celer','celery'],['porek','leeks'],
  ['redkvic','radishes'],['repa','beets'],['houb','mushrooms'],['zampion','mushrooms'],['hliv','oyster'],['fazolk','snap'],['chrest','asparagus'],
  ['artycok','artichokes'],['avokad','avocados'],['oliv','olives'],['petrzel','parsley'],['kopr','dill'],['bazal','basil'],['zazvor','ginger'],
  ['rukol','arugula'],['klick','sprouts'],['kysane','sauerkraut'],['kimchi','kimchi'],['jablk','apples'],['jablek','apples'],['hrusk','pears'],
  ['banan','bananas'],['pomeranc','oranges'],['mandarink','tangerines'],['citron','lemon'],['limet','lime'],['grep','grapefruit'],
  ['hrozn','grapes'],['hrozen','grapes'],['jahod','strawberries'],['malin','raspberries'],['boruvk','blueberries'],['ostruzin','blackberries'],
  ['rybiz','currants'],['tresn','cherries'],['visn','cherries'],['svestk','plums'],['slivk','plums'],['merunk','apricots'],['broskv','peaches'],
  ['nektarink','nectarines'],['ananas','pineapple'],['mango','mangos'],['kiwi','kiwifruit'],['meloun','melons'],['granatov','pomegranates'],
  ['fik','figs'],['datl','dates'],['rozink','raisins'],['brusink','cranberries'],['kdoul','quinces'],['olej','oil'],['olivov','olive'],
  ['repkov','canola'],['sadlo','lard'],['margarin','margarine'],['ghi','ghee'],['cukr','sugar'],['med','honey'],['cokolad','chocolate'],
  ['kakao','cocoa'],['sirup','syrup'],['javor','maple'],['marmelad','jams'],['dzem','jams'],['susenk','cookies'],['dort','cake'],['zmrzlin','ice'],
  ['kav','coffee'],['kafe','coffee'],['caj','tea'],['dzus','juice'],['stav','juice'],['piv','beer'],['vino','wine'],['vina','wine'],['vod','water'],
  ['limonad','carbonated'],['kol','cola'],['syrov','raw'],['varen','cooked'],['vareny','boiled'],['pecen','roasted'],['smazen','fried'],
  ['grilov','grilled'],['dusen','steamed'],['susen','dried'],['mrazen','frozen'],['konzerv','canned'],['uzen','smoked'],['nakladan','pickled'],
  ['odtucn','nonfat'],['nizkotucn','lowfat'],['polotucn','reduced'],['plnotucn','whole'],['omack','sauce'],['polevk','soup'],['vyvar','broth'],
  ['kecup','catsup'],['horcic','mustard'],['majonez','mayonnaise'],['ocet','vinegar'],['sul','salt'],['pepr','pepper'],['skoric','cinnamon'],
  ['kurkum','turmeric'],['kmin','caraway'],['oregano','oregano'],['tymian','thyme'],['rozmaryn','rosemary'],['drozd','yeast'],['prasek','powder'],
  ['bilkovin','protein'],['sojova','soy'],['pudink','pudding'],['popcorn','popcorn'],['chips','chips'],['lupin','chips'],['krekr','crackers']
];

/* English alternatives for one Czech (or English) query word. */
function expandToken(tok){
  const alts = [tok];
  for (const [cs, en] of CS_EN){
    if (tok.startsWith(cs) || (cs.length >= 4 && cs.startsWith(tok) && tok.length >= 3)) alts.push(en);
  }
  return alts;
}

const PROCESSED = ['breaded','batter','tenders','nugget','patty','patties','fried','frozen','canned','prepared','with added','dehydrated','imitation','sweetened','flavored','mix,','powder','stick','substitute'];

/* Category weights: everyday groups first. */
const CAT_WEIGHT = {1:3,2:1,4:1,5:3,6:0,7:1,8:1,9:3,10:2,11:3,12:2,13:2,14:0,15:2,16:3,17:1,18:1,19:0,20:3,22:0,23:0};

function scoreFood(food, qTokens){
  let score = 0;
  for (let qi = 0; qi < qTokens.length; qi++){
    const alts = qTokens[qi];
    let best = -1;
    for (const a of alts){
      for (let i = 0; i < food._tok.length; i++){
        if (food._tok[i].startsWith(a)){
          const s = (food._tok[i] === a ? 3 : 2) + (i < 3 ? 2 : 0);
          if (s > best) best = s;
          break;
        }
      }
    }
    if (best < 0) return -1;
    score += best;
    if (qi === 0 && alts.some(a => food._head.startsWith(a))) score += 4;
  }
  score += (CAT_WEIGHT[food.cat] || 0);
  const en = food.en.toLowerCase();
  if (/\braw\b/.test(en)) score += 0.5;
  /* processed variants sink unless you asked for them */
  const q = qTokens.map(a => a.join(' ')).join(' ');
  PROCESSED.forEach(w => { if (en.indexOf(w) >= 0 && q.indexOf(w.slice(0, 4)) < 0) score -= 3; });
  if (/skinless|boneless|meat only|lean only/.test(en)) score += 0.8;
  score -= food.en.length / 90;
  return score;
}

/* Search everything local: your foods first, then the database. */
async function searchLocalFoods(q, limit){
  const qt = tokensOf(q);
  if (!qt.length) return [];
  const qTokens = qt.map(expandToken);
  const mine = (await recByType('food')).map(customFoodView);
  const out = [];
  mine.forEach(f => {
    f._tok = tokensOf(f.en + ' ' + (f.cs||'') + ' ' + (f.brand||''));
    f._head = fold((f.cs || f.en || '').split(',')[0]);
    const s = scoreFood(f, qTokens);
    if (s >= 0) out.push({food:f, s: s + 20});
  });
  try { await loadFoodDb(); } catch(e){ /* offline and never loaded: only own foods */ }
  FOODDB.foods.forEach(f => {
    const s = scoreFood(f, qTokens);
    if (s >= 0) out.push({food:f, s});
  });
  out.sort((a,b) => b.s - a.s);
  return out.slice(0, limit || 40).map(x => x.food);
}

/* Your own foods are records of type "food"; this gives them the same
   shape as database foods so the rest of the app treats them alike. */
function customFoodView(r){
  return {
    ref: 'food:' + r.id, kind: 'custom', id: r.id, en: r.name, cs: null, brand: r.brand || '',
    barcode: r.barcode || '', per100: r.per100 || {}, portions: r.portions || [], cat: -1,
    basis: r.basis || 'label', source: r.source || 'manual'
  };
}

function foodName(food){
  if (!food) return '';
  if (food.kind === 'custom' || food.kind === 'off') return food.en + (food.brand ? ' · ' + food.brand : '');
  return (S.lang === 'cs' && food.cs) ? food.cs : food.en;
}

async function getFoodByRef(ref){
  if (!ref) return null;
  if (ref.startsWith('usda:')){ await loadFoodDb(); return FOODDB.byId[ref] || null; }
  if (ref.startsWith('food:')){ const r = await recGet(ref.slice(5)); return r ? customFoodView(r) : null; }
  return null;
}

/* Foods you logged recently, most frequent first. */
async function recentFoods(days, limit){
  const to = localDateKey(), from = addDays(to, -(days || 45));
  const entries = await recByTypeDate('food_entry', from, to);
  const count = {};
  const last = {};
  entries.forEach(e => {
    const ref = e.source && e.source.ref;
    if (!ref || !(ref.startsWith('usda:') || ref.startsWith('food:'))) return;
    count[ref] = (count[ref] || 0) + 1;
    if (!last[ref] || e.updatedAt > last[ref].updatedAt) last[ref] = e;
  });
  const refs = Object.keys(count).sort((a,b) => count[b] - count[a]).slice(0, limit || 12);
  const out = [];
  for (const ref of refs){
    const f = await getFoodByRef(ref);
    if (f) out.push({food:f, lastGrams: last[ref].amount && last[ref].amount.grams});
  }
  return out;
}

/* ---------- Open Food Facts ----------
   Free, open database of packaged products, strong in Europe. Called
   directly from the phone; no key needed. */

const OFF_FIELDS = 'code,product_name,product_name_cs,product_name_en,brands,nutriments,serving_size,serving_quantity,quantity,allergens_tags,ingredients_text,ingredients_text_cs,image_front_small_url,nutriscore_grade,nova_group';

function offToFood(p){
  const n = p.nutriments || {};
  const g = (k) => (n[k] == null || n[k] === '') ? null : Number(n[k]);
  const per100 = {
    kcal: g('energy-kcal_100g') != null ? g('energy-kcal_100g') : (g('energy_100g') != null ? Math.round(g('energy_100g')/4.184) : null),
    prot: g('proteins_100g'), fat: g('fat_100g'), carb: g('carbohydrates_100g'), sug: g('sugars_100g'),
    fib: g('fiber_100g'), sfa: g('saturated-fat_100g'), mufa: g('monounsaturated-fat_100g'), pufa: g('polyunsaturated-fat_100g'),
    trans: g('trans-fat_100g'),
    na: g('sodium_100g') != null ? g('sodium_100g')*1000 : (g('salt_100g') != null ? g('salt_100g')*400 : null),
    chol: g('cholesterol_100g') != null ? g('cholesterol_100g')*1000 : null,
    ca: g('calcium_100g') != null ? g('calcium_100g')*1000 : null,
    fe: g('iron_100g') != null ? g('iron_100g')*1000 : null,
    k: g('potassium_100g') != null ? g('potassium_100g')*1000 : null,
    mg: g('magnesium_100g') != null ? g('magnesium_100g')*1000 : null,
    zn: g('zinc_100g') != null ? g('zinc_100g')*1000 : null,
    vitc: g('vitamin-c_100g') != null ? g('vitamin-c_100g')*1000 : null,
    vitd: g('vitamin-d_100g') != null ? g('vitamin-d_100g')*1e6 : null,
    vita: g('vitamin-a_100g') != null ? g('vitamin-a_100g')*1e6 : null,
    b12: g('vitamin-b12_100g') != null ? g('vitamin-b12_100g')*1e6 : null,
    caff: g('caffeine_100g') != null ? g('caffeine_100g')*1000 : null,
    alc: g('alcohol_100g') != null ? g('alcohol_100g')*0.789 : null
  };
  const name = p.product_name_cs || p.product_name || p.product_name_en || '';
  const portions = [];
  if (p.serving_quantity && Number(p.serving_quantity) > 0)
    portions.push({label: p.serving_size ? String(p.serving_size) : (S.lang === 'cs' ? '1 porce' : '1 serving'), g: Number(p.serving_quantity)});
  return {
    ref: 'off:' + p.code, kind: 'off', en: name, cs: null, brand: (p.brands || '').split(',')[0].trim(),
    barcode: p.code, per100: nutRound(per100), portions, cat: -2,
    ingredients: p.ingredients_text_cs || p.ingredients_text || '',
    allergens: (p.allergens_tags || []).map(a => a.replace(/^en:/,'')),
    image: p.image_front_small_url || '', nutriscore: p.nutriscore_grade || '', nova: p.nova_group || null
  };
}

async function offByBarcode(code){
  const url = 'https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) + '.json?fields=' + OFF_FIELDS;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Open Food Facts ' + res.status);
  const j = await res.json();
  if (!j || j.status === 0 || !j.product) return null;
  return offToFood(j.product);
}

async function offSearch(q){
  const url = 'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=25&lc=cs&search_terms=' +
    encodeURIComponent(q) + '&fields=' + OFF_FIELDS;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Open Food Facts ' + res.status);
  const j = await res.json();
  return (j.products || []).filter(p => p.product_name || p.product_name_cs).map(offToFood)
    .filter(f => f.per100.kcal != null);
}

/* Keep a product you logged as your own food, so it works offline next time. */
async function saveOffAsCustom(food){
  const existing = (await recByType('food')).find(r => r.barcode && r.barcode === food.barcode);
  if (existing) return customFoodView(existing);
  const rec = await recPut({
    type: 'food', name: food.en, brand: food.brand, barcode: food.barcode,
    per100: food.per100, portions: food.portions, basis: 'label', source: 'openfoodfacts',
    ingredients: food.ingredients || '', allergens: food.allergens || []
  });
  return customFoodView(rec);
}

/* Nutrients for an amount of a food. */
function nutrientsFor(food, grams){
  return nutRound(nutScale(food.per100 || {}, grams / 100));
}

/* A foods-rich-in list for the review: which database foods give the most
   of a nutrient per 100 kcal, ignoring anything you excluded. */
async function foodsRichIn(k, limit){
  await loadFoodDb();
  const excl = exclusionTerms().length > 0;
  const scored = [];
  if (!foodsRichIn.common){
    /* everyday foods only: the head word must be one a Czech shopper would type */
    foodsRichIn.common = new Set(CS_EN.map(x => x[1]).filter(w => ['raw','cooked','boiled','roasted','fried','grilled','steamed','dried','frozen','canned','smoked','pickled','nonfat','lowfat','reduced','whole','powder','sauce','soup','broth','ice','sweet','hot','white','blue','french','toasted','sour','greek','ground','breast','thigh','wing','drumstick','shoulder','belly','ribs','chop','tenderloin','heart','kidney','tongue','snap','oyster'].indexOf(w) < 0));
  }
  const OBSCURE = /isolate|concentrate|spirulina|grouse|game meat|seaweed|dehydrated|freeze-dried|powder|flour|bran|germ|meal,|by-products|infant|formula|substitute|imitation|fortified|restaurant|fast food/;
  FOODDB.foods.forEach(f => {
    if ([6,14,19,22,23,4,7].indexOf(f.cat) >= 0) return;
    const head = f._head.split(' ')[0];
    if (!foodsRichIn.common.has(head) && !foodsRichIn.common.has(head.replace(/s$/,'')) && !foodsRichIn.common.has(head + 's')) return;
    if (OBSCURE.test(f.en.toLowerCase())) return;
    let v;
    if (k === 'o3ld') v = (f.per100.epa == null && f.per100.dha == null) ? null : ((f.per100.epa||0) + (f.per100.dha||0)) * 1000;
    else v = f.per100[k];
    const kc = f.per100.kcal;
    if (v == null || !kc || kc < 15) return;
    if (/\bdried\b|\bpowder\b|\bdehydrated\b|\bfreeze-dried\b|\bspices?\b/.test(f.en) && k !== 'fib') return;
    if (excl && exclusionHits(f.en + ' ' + (f.cs||'')).length) return;
    scored.push({food:f, perKcal: v / kc * 100, per100: v});
  });
  scored.sort((a,b) => b.perKcal - a.perKcal);
  /* one per head word, so the list is not ten kinds of liver */
  const seen = {}, out = [];
  for (const s of scored){
    const h = s.food._head;
    if (seen[h]) continue;
    seen[h] = 1; out.push(s);
    if (out.length >= (limit || 8)) break;
  }
  return out;
}
