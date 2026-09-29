/* ============================================================
   NutriLog core: helpers, storage, records, state, migration,
   nutrient vocabulary, reference values, goal engine.
   Plain browser JavaScript, no build step beyond concatenation.
   ============================================================ */

/* ---------- 1. Small helpers ---------- */

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function t(key, vars){
  const table = STR[S.lang] || STR.en;
  let s = table[key];
  if (s === undefined) s = (STR.en[key] !== undefined ? STR.en[key] : key);
  if (vars) for (const k in vars) s = s.split('{'+k+'}').join(String(vars[k]));
  return s;
}

/* Pick the Czech or English half of a {cs, en} pair. */
function L(obj){
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[S.lang] || obj.en || obj.cs || '';
}

/* Names that follow the app language even for records saved while the
   app was in the other language (v0.2.3). The stored text is not changed. */
function exclLabel(x){
  const k = x && x.id ? ALLERGENS.find(a => a.id === x.id) : null;
  return k ? L(k) : ((x && x.label) || '');
}

function icon(name, cls){
  return '<svg class="'+(cls||'')+'" aria-hidden="true"><use href="#i-'+name+'"/></svg>';
}

function locale(){ return S.lang === 'cs' ? 'cs-CZ' : 'en-GB'; }

function fmtNum(n, digits){
  if (n == null || !isFinite(n)) return '–';
  return new Intl.NumberFormat(locale(), {maximumFractionDigits: digits == null ? 0 : digits}).format(n);
}

/* Smart rounding for nutrient amounts: fewer decimals for bigger numbers. */
function fmtAmt(n){
  if (n == null || !isFinite(n)) return '–';
  const a = Math.abs(n);
  if (a >= 100) return fmtNum(n, 0);
  if (a >= 10) return fmtNum(n, 1);
  if (a >= 1) return fmtNum(n, 1);
  if (a === 0) return '0';
  return fmtNum(n, 2);
}

function numDate(d, withYear){
  if (typeof d === 'string') d = dateFromKey(d);
  let result = d.getDate() + '.' + (d.getMonth() + 1) + '.';
  if (withYear) result += d.getFullYear();
  return result;
}

function fmtDateTime(iso){
  if (!iso) return t('never');
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return numDate(d) + ' ' + hours + ':' + minutes;
}

function fmtLongDate(d){
  return new Intl.DateTimeFormat(locale(), {weekday:'long', day:'numeric', month:'long'}).format(d);
}

function fmtShortDate(key){
  const d = dateFromKey(key);
  return new Intl.DateTimeFormat(locale(), {weekday:'short'}).format(d) + ' ' + numDate(d);
}

function ago(iso){
  if (!iso) return t('never');
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return t('just_now');
  if (mins < 60) return t('ago_min', {n: mins});
  const h = Math.floor(mins/60);
  if (h < 48) return t('ago_hour', {n: h});
  return t('ago_day', {n: Math.floor(h/24)});
}

/* Local calendar date, not UTC. The phone is in Prague; a date taken
   from UTC would jump a day every evening. */
function localDateKey(d){
  const x = d || new Date();
  const p = n => String(n).padStart(2,'0');
  return x.getFullYear()+'-'+p(x.getMonth()+1)+'-'+p(x.getDate());
}
function dateFromKey(key){
  const [y,m,d] = key.split('-').map(Number);
  return new Date(y, m-1, d, 12, 0, 0);
}
function addDays(key, n){
  const d = dateFromKey(key); d.setDate(d.getDate()+n); return localDateKey(d);
}
/* Returns true when the number of calendar days from startKey to dateKey
   is a multiple of every (including zero), so dateKey falls on a scheduled
   day of the cycle.  Works for dates before startKey too.  Falls back to
   true when startKey is missing or every is not a number >= 2. */
function cycleDue(startKey, dateKey, every){
  if (!startKey || typeof every !== 'number' || every < 2) return true;
  const s = dateFromKey(startKey).getTime();
  const d = dateFromKey(dateKey).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.round((d - s) / dayMs);
  return Math.abs(diff % every) === 0;
}
function localTime(d){
  const x = d || new Date();
  const p = n => String(n).padStart(2,'0');
  return p(x.getHours())+':'+p(x.getMinutes());
}
/* ISO 8601 with the local offset, e.g. 2026-09-21T14:03:11+02:00.
   Other apps reading the data get both the instant and the wall clock. */
function nowIso(d){
  const x = d || new Date();
  const p = n => String(Math.floor(Math.abs(n))).padStart(2,'0');
  const off = -x.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return localDateKey(x)+'T'+p(x.getHours())+':'+p(x.getMinutes())+':'+p(x.getSeconds())+
    sign+p(off/60)+':'+p(off%60);
}
/* Parse an ISO 8601 timestamp to milliseconds since epoch.
   Returns 0 for null, undefined, empty, or unparseable input. */
function isoMs(s){
  if (!s || typeof s !== 'string') return 0;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : 0;
}
/* Sort comparator for ISO 8601 timestamps (oldest first). */
function cmpIso(a, b){
  return isoMs(a) - isoMs(b);
}

/* UTF-8 safe base64. btoa alone throws on Czech diacritics. */
function b64encode(str){
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step){
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i+step));
  }
  return btoa(bin);
}
function b64decode(b64){
  const bin = atob(String(b64).replace(/\s/g,''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* Cheap stable hash, used only to notice that nothing changed. */
function hashString(str){
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = (h + ((h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24))) >>> 0;
  }
  return h.toString(16);
}

/* Time sortable unique id (ULID layout: 10 chars time, 16 chars random).
   Safe to merge between devices and apps without collisions. */
const ULID_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function ulid(){
  let ts = Date.now(), timePart = '';
  for (let i = 0; i < 10; i++){ timePart = ULID_CHARS[ts % 32] + timePart; ts = Math.floor(ts / 32); }
  const rnd = new Uint8Array(16);
  crypto.getRandomValues(rnd);
  let r = '';
  for (let i = 0; i < 16; i++) r += ULID_CHARS[rnd[i] % 32];
  return timePart + r;
}

/* Strip diacritics and lowercase, for search. */
function fold(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function round1(n){ return Math.round(n*10)/10; }
function deepCopy(o){ return o == null ? o : JSON.parse(JSON.stringify(o)); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

function toastFadeMs(){
  if(document.body.classList.contains('quickmode')){ return 0; }
  const t = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--t-fast'));
  return isFinite(t) ? t : 160;
}
function toast(msg, ms){
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hide', 'out');
  el.classList.remove('in');
  void el.offsetWidth;
  el.classList.add('in');
  clearTimeout(toast._tm);
  toast._tm = setTimeout(function(){
    el.classList.remove('in');
    el.classList.add('out');
    toast._tm = setTimeout(function(){
      el.classList.add('hide');
      el.classList.remove('out');
    }, toastFadeMs());
  }, ms || 3200);
}

/* ---------- 2. Storage. IndexedDB, schema 2 ----------
   kv              prefs, meta (app settings, not shared data)
   secrets         API keys. Never exported, never backed up.
   records         all personal data as typed records (see RECORD TYPES)
   recipes         recipe records: archive, starter, own and Claude recipes
   media           small images (photo thumbnails, recipe thumbnails)
   profileHistory  legacy from schema 1, kept read only
   snapshots       rolling daily copies kept on the device
   ------------------------------------------------------ */

const DB_NAME = 'nutrilog';
const DB_VERSION = 2;
let _db = null;

function openDB(){
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const txu = req.transaction;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', {keyPath:'key'});
      if (!db.objectStoreNames.contains('secrets')) db.createObjectStore('secrets', {keyPath:'key'});
      if (!db.objectStoreNames.contains('profileHistory')) db.createObjectStore('profileHistory', {keyPath:'id', autoIncrement:true});
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', {keyPath:'date'});
      let rec;
      if (!db.objectStoreNames.contains('records')) rec = db.createObjectStore('records', {keyPath:'id'});
      else rec = txu.objectStore('records');
      if (!rec.indexNames.contains('type')) rec.createIndex('type', 'type');
      if (!rec.indexNames.contains('type_date')) rec.createIndex('type_date', ['type','date']);
      if (!db.objectStoreNames.contains('recipes')) db.createObjectStore('recipes', {keyPath:'id'});
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', {keyPath:'id'});
    };
    req.onsuccess = () => {
      _db = req.result;
      _db.onversionchange = () => { try { _db.close(); } catch(e){} _db = null; };
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => toast(t('db_blocked'), 8000);
  });
}

function tx(store, mode){
  return openDB().then(db => db.transaction(store, mode).objectStore(store));
}
function reqp(r){
  return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function dbGet(store, key){ return reqp((await tx(store,'readonly')).get(key)); }
async function dbAll(store){ return reqp((await tx(store,'readonly')).getAll()); }
async function dbPut(store, val){ return reqp((await tx(store,'readwrite')).put(val)); }
async function dbDel(store, key){ return reqp((await tx(store,'readwrite')).delete(key)); }
async function dbClear(store){ return reqp((await tx(store,'readwrite')).clear()); }
async function dbPutMany(store, vals){
  const db = await openDB();
  return new Promise((res, rej) => {
    const t2 = db.transaction(store, 'readwrite');
    const os = t2.objectStore(store);
    vals.forEach(v => os.put(v));
    t2.oncomplete = () => res(true);
    t2.onerror = () => rej(t2.error);
  });
}

async function kvGet(key, fallback){
  const r = await dbGet('kv', key);
  return r ? r.value : fallback;
}
async function kvSet(key, value){ return dbPut('kv', {key, value}); }

async function secretGet(key){
  const r = await dbGet('secrets', key);
  return r ? r.value : '';
}
async function secretSet(key, value){ return dbPut('secrets', {key, value}); }

/* ---------- 3. Records ----------
   Every piece of personal data is one record with the same envelope:
     id         ULID, or a fixed id for singletons ("profile")
     type       what kind of record (see RECORD_TYPES)
     schema     version of that type's body, starts at 1
     app        which app wrote it ("nutrilog")
     createdAt  ISO 8601 with offset
     updatedAt  ISO 8601 with offset, changes on every write
     deleted    true for a tombstone (kept so sync can see deletions)
     date       local calendar day YYYY-MM-DD, for dated records
   The body follows. Units are part of field names or fixed per nutrient.
   ------------------------------------------------------ */

const RECORD_TYPES = {
  profile:           {schema:2, shared:true},  /* body data, goals, food preferences */
  body_weight:       {schema:1, shared:true},  /* dated weight in kg */
  food_entry:        {schema:1, shared:true},  /* one eaten item on one day */
  supplement:        {schema:1, shared:true},  /* a supplement you take */
  supplement_intake: {schema:1, shared:true},  /* one intake on one day */
  food:              {schema:1, shared:true},  /* your own food: label, barcode, manual */
  recipe_note:       {schema:1, shared:true},  /* favourite, rating, notes, cooked dates for a recipe */
  pantry_item:       {schema:1, shared:true},  /* what is at home */
  chat_message:      {schema:1, shared:false}, /* chat history */
  photo_eval:        {schema:1, shared:false}, /* result of a photo evaluation */
  summary:           {schema:1, shared:true},  /* written weekly or monthly review */
  meal_plan:         {schema:1, shared:true},  /* saved suggestions or meal prep plan */
  cooking_session:   {schema:1, shared:true},  /* one cooking of a recipe: axis, flags, servings, changes, servings logged */
  recipe_overlay:    {schema:1, shared:true},  /* saved personal changes to one recipe */
  shopping_item:     {schema:1, shared:true}   /* one line of the shopping list */
};

let dirtyTimer = null;
function markDirty(reason){
  S.meta.dataChangedAt = nowIso();
  if (typeof scheduleSync === 'function') scheduleSync();
  if (dirtyTimer) clearTimeout(dirtyTimer);
  dirtyTimer = setTimeout(() => { dirtyTimer = null; saveMeta(); scheduleBackup(reason || 'data changed'); }, 400);
}

async function recPut(rec, opts){
  if (!rec.type || !RECORD_TYPES[rec.type]) throw new Error('Unknown record type: ' + rec.type);
  const now = nowIso();
  if (!rec.id) rec.id = ulid();
  if (!rec.createdAt) rec.createdAt = now;
  if (!rec.schema) rec.schema = RECORD_TYPES[rec.type].schema;
  if (!rec.app) rec.app = 'nutrilog';
  rec.updatedAt = now;
  if (rec.deleted === undefined) rec.deleted = false;
  await dbPut('records', rec);
  if (!opts || !opts.silent) markDirty(rec.type);
  return rec;
}
async function recGet(id){
  const r = await dbGet('records', id);
  return (r && !r.deleted) ? r : null;
}
async function recByType(type, includeDeleted){
  const os = await tx('records','readonly');
  const all = await reqp(os.index('type').getAll(type));
  return includeDeleted ? all : all.filter(r => !r.deleted);
}
async function recByTypeDate(type, from, to){
  const os = await tx('records','readonly');
  const range = IDBKeyRange.bound([type, from], [type, to]);
  const all = await reqp(os.index('type_date').getAll(range));
  return all.filter(r => !r.deleted);
}
async function recDelete(id){
  const r = await dbGet('records', id);
  if (!r) return;
  r.deleted = true;
  r.updatedAt = nowIso();
  await dbPut('records', r);
  markDirty(r.type + ' deleted');
}

/* ---------- 4. Application state ---------- */

const LOOKS = [
  {id:'ember',  name:'Ember',  light:{ground:'#F1E8DA'}, dark:{ground:'#141110', ink:'#EEE3D2', accent:'#D9A066'}},
  {id:'lichen', name:'Lichen', light:{ground:'#ECEDE2'}, dark:{ground:'#0F1411', ink:'#E3E6D8', accent:'#9FBF9C'}},
  {id:'ash',    name:'Ash',    light:{ground:'#ECEAE6'}, dark:{ground:'#15161A', ink:'#E8E4DE', accent:'#CFA3A0'}},
];
function lookOf(id) {
  const entry = LOOKS.find(l => l.id === id);
  return entry || LOOKS[2]; // Ash as fallback
}

const TYPES = [{id:'fraunces', display:'Fraunces', body:'Figtree'}, {id:'marcellus', display:'Marcellus', body:'Raleway'}, {id:'jost', display:'Jost', body:'Jost'}];
function typeOf(id) {
  const entry = TYPES.find(t => t.id === id);
  return entry || TYPES[0];
}

const DEFAULT_PREFS = {
  lang: 'en',
  theme: 'device',
  look: 'ash',
  type: 'fraunces',
  models: { chat:'claude-sonnet-5', vision:'claude-sonnet-5', analysis:'claude-opus-5' },
  prices: {
    'claude-sonnet-5': { in: 2, out: 10 },
    'claude-opus-5':   { in: 5, out: 25 },
    'claude-haiku-4-5':{ in: 1, out: 5 }
  },
  budget: { monthlyUsd: 10 },
  backup: { target:'github', repo:'', branch:'main' },
  archive: { path:'archive/recipes', showStarter:true },
  review: { includeSupplements:true },
  log: { lastSlot:null },
  sync: { url:'' }
};

const DEFAULT_META = {
  installedAt: null,
  persistGranted: null,
  migratedFromSchema1: null,
  englishDefaultAppliedAt: null,  /* v0.2.3: the app switched to English once */
  dataChangedAt: null,
  backup: {
    state: 'idle',
    lastVerifiedAt: null,
    lastUploadAt: null,
    lastError: null,
    lastErrorAt: null,
    lastHash: null,
    lastSnapshotDate: null
  },
  usage: { calls: 0, inTok: 0, outTok: 0, byModel: {}, byMonth: {} },
  archive: { lastSyncAt: null, lastSha: null, count: 0, lastError: null },
  sync: { cursor:0, lastPushAt:null, lastOkAt:null, state:'off', lastError:'', name:'' },
  catalog: { cursor:0, count:0, lastOkAt:null, lastError:'' }
};

/* Per-person view state: fresh-install values. Joining another profile or leaving resets it (resetSessionState). */
const SESSION_DEFAULTS = {
  profile: null,          /* the profile record (schema 2) */
  draft: null,
  logDate: null,          /* day shown in the diary */
  suggestDate: null,
  reviewAnchor: null,
  recipeFilter: { q:'', chips:[], tags:[], fav:false, origin:'all' }
};

const S = {
  ...deepCopy(SESSION_DEFAULTS),
  lang: 'en',
  theme: 'device',
  look: 'ash',
  type: 'fraunces',
  screen: 'today',
  prefs: deepCopy(DEFAULT_PREFS),
  meta: deepCopy(DEFAULT_META),
  secrets: { anthropic:'', github:'', sync:'' },
  installPrompt: null,
  swRegistered: null,
  recipeTab: 'suggest',
  reviewMode: 'week',
  chatBusy: false
};

function resetSessionState(){
  Object.assign(S, deepCopy(SESSION_DEFAULTS));
  if (S.meta) S.meta.chatThread = null;
  if (typeof RECIPES !== 'undefined') RECIPES.notes = {};
}

function mergeDefaults(target, defaults){
  const out = deepCopy(defaults);
  if (!target) return out;
  for (const k in target){
    if (target[k] && typeof target[k] === 'object' && !Array.isArray(target[k]) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])){
      out[k] = mergeDefaults(target[k], out[k]);
    } else if (target[k] !== undefined){
      out[k] = target[k];
    }
  }
  return out;
}

async function loadState(){
  S.prefs   = mergeDefaults(await kvGet('prefs', null), DEFAULT_PREFS);
  S.meta    = mergeDefaults(await kvGet('meta', null), DEFAULT_META);
  /* Sonnet 5 stayed at 2 and 10 USD after August 2026; fix the old default. */
  if (S.prefs.prices['claude-sonnet-5'] && Number(S.prefs.prices['claude-sonnet-5'].in) === 3 && Number(S.prefs.prices['claude-sonnet-5'].out) === 15)
    S.prefs.prices['claude-sonnet-5'] = {in:2, out:10};
  /* v0.2.3: English became the app language. Switch an existing install
     over once; after that, the language chosen in Settings sticks. */
  if (!S.meta.englishDefaultAppliedAt){
    S.prefs.lang = 'en';
    S.meta.englishDefaultAppliedAt = nowIso();
    await kvSet('prefs', S.prefs);
    await saveMeta();
  }
  S.lang    = S.prefs.lang;
  S.theme   = S.prefs.theme;
  S.look    = lookOf(S.prefs.look).id;
  S.type    = typeOf(S.prefs.type).id;
  S.secrets.anthropic = await secretGet('anthropic');
  S.secrets.github    = await secretGet('github');
  S.secrets.sync      = await secretGet('sync');
  if (!S.meta.installedAt){ S.meta.installedAt = nowIso(); await saveMeta(); }
  await migrateFromSchema1();
  S.profile = await recGet('profile');
  /* v0.2.6: old diet style and aims chips become eating pattern, focus and hints (idea 8). The old fields stay stored. */
  if (S.profile && (!S.profile.food || S.profile.food.pattern === undefined)){
    S.profile = migrateDietV3(S.profile);
    await recPut(S.profile);
  }
  /* One-time upgrade: when modules are not set and the user already has data, turn everything on. */
  if (S.prefs.modules === undefined || S.prefs.modules === null){
    var has = S.profile !== null || S.secrets.anthropic !== '' || (await recByType('food_entry')).length > 0 || (await recByType('supplement')).length > 0;
    if (has){
      S.prefs.modules = {logging:true, goals:true, supplements:true, assistant:true};
      await kvSet('prefs', S.prefs);
    }
  }
}

async function savePrefs(){ S.prefs.lang = S.lang; S.prefs.theme = S.theme; S.prefs.look = S.look; S.prefs.type = S.type; await kvSet('prefs', S.prefs); }
const MODULES = ['logging', 'goals', 'supplements', 'assistant'];
function moduleOn(name){ return !!(S.prefs.modules && S.prefs.modules[name] === true); }
function setModule(name, on){
  var m = Object.assign({logging:false, goals:false, supplements:false, assistant:false}, S.prefs.modules || {});
  m[name] = !!on;
  var toasts = [];
  if (name === 'goals' && on && !m.logging){ m.logging = true; toasts.push('mod_needs_logging'); }
  if (name === 'logging' && !on && m.goals){ m.goals = false; toasts.push('mod_goals_off'); }
  S.prefs.modules = m;
  return toasts;
}
async function saveMeta(){ await kvSet('meta', S.meta); }

/* ---------- 5. Migration from schema 1 (v0.1) ----------
   v0.1 kept one flat profile under kv 'profile' and a history of
   profile saves. Both are converted into records; the old copies stay
   untouched in their stores so nothing is lost if something goes wrong. */

function profileFromV1(p){
  if (!p) return null;
  const rec = {
    id: 'profile', type: 'profile', schema: 2,
    person: {
      sex: p.sex || '',
      age: p.age === '' || p.age == null ? null : Number(p.age),
      ageRecordedOn: (p.savedAt || nowIso()).slice(0,10),
      heightCm: p.height === '' || p.height == null ? null : Number(p.height),
      weightKg: p.weight === '' || p.weight == null ? null : Number(p.weight),
      activityLevel: Number(p.activity) || 2
    },
    goals: {
      direction: p.direction || 'maintain',
      macroSplit: { preset: p.split || 'balanced',
        proteinPct: Number((p.custom||{}).p) || 25, fatPct: Number((p.custom||{}).f) || 30, carbPct: Number((p.custom||{}).c) || 45 },
      dietStyle: [], aims: [], focusNutrients: [], notes: '',
      slots: deepCopy(DEFAULT_SLOTS)
    },
    food: {
      exclusions: (p.exclusions || []).map(x => ({id: x.id || null, label: x.label, type: x.type || 'allergy', syn: x.syn || []})),
      cuisines: p.cuisines || [], cuisineOther: p.cuisineFree || '', dislikes: ''
    },
    kitchen: {
      timeWeekday: Number(p.timeWeekday) || 2, timeWeekend: Number(p.timeWeekend) || 3,
      equipment: p.equipment || [], budget: p.budget || 'bud3',
      mealPrep: { cookDaysPerWeek: 3, batchServings: 3 }
    }
  };
  return rec;
}

async function migrateFromSchema1(){
  const existing = await dbGet('records', 'profile');
  if (existing) return;
  const old = await kvGet('profile', null);
  if (!old) return;
  const rec = profileFromV1(old);
  rec.createdAt = old.savedAt ? nowIso(new Date(old.savedAt)) : nowIso();
  await recPut(rec, {silent:true});
  /* every saved weight becomes a dated weight record */
  const hist = await dbAll('profileHistory');
  const byDay = {};
  hist.forEach(h => { if (h.weight && h.savedAt) byDay[localDateKey(new Date(h.savedAt))] = h; });
  for (const day in byDay){
    await recPut({type:'body_weight', date: day, kg: Number(byDay[day].weight), source:'profile'}, {silent:true});
  }
  S.meta.migratedFromSchema1 = nowIso();
  await saveMeta();
}

/* ---------- 6. Nutrient vocabulary ----------
   Short keys are used inside the app and in the stored data. Each maps
   to an INFOODS tagname (FAO/INFOODS, the international standard), so
   other apps can read the data without guessing. Amounts are always in
   the unit listed here. */

const NUTRIENTS = [
  {k:'kcal', tag:'ENERC_KCAL', unit:'kcal', grp:'energy', cs:'Energie', en:'Energy'},
  {k:'prot', tag:'PROCNT', unit:'g', grp:'macro', cs:'Bílkoviny', en:'Protein'},
  {k:'fat',  tag:'FAT',    unit:'g', grp:'macro', cs:'Tuky', en:'Fat'},
  {k:'carb', tag:'CHOCDF', unit:'g', grp:'macro', cs:'Sacharidy', en:'Carbohydrate'},
  {k:'fib',  tag:'FIBTG',  unit:'g', grp:'macro', cs:'Vláknina', en:'Fibre'},
  {k:'sug',  tag:'SUGAR',  unit:'g', grp:'macro', cs:'Cukry', en:'Sugars'},
  {k:'sfa',  tag:'FASAT',  unit:'g', grp:'fat', cs:'Nasycené tuky', en:'Saturated fat'},
  {k:'mufa', tag:'FAMS',   unit:'g', grp:'fat', cs:'Mononenasycené tuky', en:'Monounsaturated fat'},
  {k:'pufa', tag:'FAPU',   unit:'g', grp:'fat', cs:'Polynenasycené tuky', en:'Polyunsaturated fat'},
  {k:'trans',tag:'FATRN',  unit:'g', grp:'fat', cs:'Trans tuky', en:'Trans fat'},
  {k:'ala',  tag:'F18D3N3',unit:'g', grp:'fat', cs:'Omega 3, ALA', en:'Omega 3, ALA'},
  {k:'epa',  tag:'F20D5N3',unit:'g', grp:'fat', cs:'Omega 3, EPA', en:'Omega 3, EPA'},
  {k:'dha',  tag:'F22D6N3',unit:'g', grp:'fat', cs:'Omega 3, DHA', en:'Omega 3, DHA'},
  {k:'chol', tag:'CHOLE',  unit:'mg', grp:'fat', cs:'Cholesterol', en:'Cholesterol'},
  {k:'na',   tag:'NA',     unit:'mg', grp:'mineral', cs:'Sodík', en:'Sodium'},
  {k:'k',    tag:'K',      unit:'mg', grp:'mineral', cs:'Draslík', en:'Potassium'},
  {k:'ca',   tag:'CA',     unit:'mg', grp:'mineral', cs:'Vápník', en:'Calcium'},
  {k:'mg',   tag:'MG',     unit:'mg', grp:'mineral', cs:'Hořčík', en:'Magnesium'},
  {k:'p',    tag:'P',      unit:'mg', grp:'mineral', cs:'Fosfor', en:'Phosphorus'},
  {k:'fe',   tag:'FE',     unit:'mg', grp:'mineral', cs:'Železo', en:'Iron'},
  {k:'zn',   tag:'ZN',     unit:'mg', grp:'mineral', cs:'Zinek', en:'Zinc'},
  {k:'cu',   tag:'CU',     unit:'mg', grp:'mineral', cs:'Měď', en:'Copper'},
  {k:'mn',   tag:'MN',     unit:'mg', grp:'mineral', cs:'Mangan', en:'Manganese'},
  {k:'se',   tag:'SE',     unit:'µg', grp:'mineral', cs:'Selen', en:'Selenium'},
  {k:'iod',  tag:'ID',     unit:'µg', grp:'mineral', cs:'Jód', en:'Iodine'},
  {k:'vita', tag:'VITA_RAE',unit:'µg', grp:'vitamin', cs:'Vitamin A', en:'Vitamin A'},
  {k:'vitd', tag:'VITD',   unit:'µg', grp:'vitamin', cs:'Vitamin D', en:'Vitamin D'},
  {k:'vite', tag:'TOCPHA', unit:'mg', grp:'vitamin', cs:'Vitamin E', en:'Vitamin E'},
  {k:'vitk', tag:'VITK1',  unit:'µg', grp:'vitamin', cs:'Vitamin K', en:'Vitamin K'},
  {k:'vitc', tag:'VITC',   unit:'mg', grp:'vitamin', cs:'Vitamin C', en:'Vitamin C'},
  {k:'b1',   tag:'THIA',   unit:'mg', grp:'vitamin', cs:'Thiamin (B1)', en:'Thiamin (B1)'},
  {k:'b2',   tag:'RIBF',   unit:'mg', grp:'vitamin', cs:'Riboflavin (B2)', en:'Riboflavin (B2)'},
  {k:'b3',   tag:'NIA',    unit:'mg', grp:'vitamin', cs:'Niacin (B3)', en:'Niacin (B3)'},
  {k:'b5',   tag:'PANTAC', unit:'mg', grp:'vitamin', cs:'Kyselina pantothenová (B5)', en:'Pantothenic acid (B5)'},
  {k:'b6',   tag:'VITB6A', unit:'mg', grp:'vitamin', cs:'Vitamin B6', en:'Vitamin B6'},
  {k:'biot', tag:'BIOT',   unit:'µg', grp:'vitamin', cs:'Biotin (B7)', en:'Biotin (B7)'},
  {k:'fol',  tag:'FOLDFE', unit:'µg', grp:'vitamin', cs:'Folát (B9)', en:'Folate (B9)'},
  {k:'b12',  tag:'VITB12', unit:'µg', grp:'vitamin', cs:'Vitamin B12', en:'Vitamin B12'},
  {k:'choline', tag:'CHOLN', unit:'mg', grp:'vitamin', cs:'Cholin', en:'Choline'},
  {k:'alc',  tag:'ALC',    unit:'g', grp:'other', cs:'Alkohol', en:'Alcohol'},
  {k:'caff', tag:'CAFFN',  unit:'mg', grp:'other', cs:'Kofein', en:'Caffeine'},
  {k:'water',tag:'WATER',  unit:'g', grp:'hidden', cs:'Voda', en:'Water'}
];
const NUT = {};
NUTRIENTS.forEach(n => { NUT[n.k] = n; });
const NUT_KEYS = NUTRIENTS.map(n => n.k);
/* EPA and DHA are also shown together, as the long chain omega 3. */
const NUT_DERIVED = { o3ld: {cs:'Omega 3, EPA a DHA', en:'Omega 3, EPA and DHA', unit:'mg', from:['epa','dha'], scale:1000, grp:'fat'} };

/* EU (EFSA) upper levels used to warn about supplements, in the units of
   NUTRIENTS. Only supplements are counted, so the warning is a lower bound:
   for most nutrients the limit covers food plus supplements; for magnesium
   it covers supplements only. Iron has a safe level (40 mg), not an upper
   level. Source: EFSA overview of upper levels, version 11, August 2025. */
const SUPP_UL = {vitd:100, vita:3000, vite:300, b6:12, mg:250, zn:25, se:255, iod:600, ca:2500, fe:40};

/* [{k, amount, ul}] for every SUPP_UL nutrient above its level, in SUPP_UL order. */
function suppUlOver(nutrients){
  if (!nutrients) return [];
  const out = [];
  for (const k of Object.keys(SUPP_UL)){
    const v = nutrients[k];
    if (typeof v === 'number' && isFinite(v) && v > SUPP_UL[k]) out.push({k, amount: v, ul: SUPP_UL[k]});
  }
  return out;
}

function nutLabel(k){ return NUT[k] ? L(NUT[k]) : (NUT_DERIVED[k] ? L(NUT_DERIVED[k]) : k); }
function nutUnit(k){ return NUT[k] ? NUT[k].unit : (NUT_DERIVED[k] ? NUT_DERIVED[k].unit : ''); }

/* Add nutrient maps. Unknown stays unknown: null + number = number, but the
   count of unknowns is tracked separately by the review. */
function nutAdd(acc, n, factor){
  if (!n) return acc;
  const f = factor == null ? 1 : factor;
  for (const k in n){
    const v = n[k];
    if (v == null || !isFinite(v)) continue;
    acc[k] = (acc[k] || 0) + v * f;
  }
  return acc;
}
function nutScale(n, factor){
  const out = {};
  for (const k in (n||{})){
    const v = n[k];
    out[k] = (v == null || !isFinite(v)) ? null : Math.round(v * factor * 1000) / 1000;
  }
  return out;
}
function nutRound(n){
  const out = {};
  for (const k in (n||{})){
    const v = n[k];
    if (v == null || !isFinite(v)) { out[k] = null; continue; }
    const a = Math.abs(v);
    out[k] = a >= 100 ? Math.round(v) : a >= 1 ? Math.round(v*10)/10 : Math.round(v*1000)/1000;
  }
  return out;
}

/* ---------- 7. Goal engine (from v0.1, unchanged maths) ----------
   Mifflin, St Jeor resting energy, times an activity band,
   widened into a range, then held above a floor. */

const ACTIVITY = [
  {id:1, mult:1.40, unc:0.13, k:'act1'},
  {id:2, mult:1.55, unc:0.13, k:'act2'},
  {id:3, mult:1.70, unc:0.14, k:'act3'},
  {id:4, mult:1.90, unc:0.16, k:'act4'}
];
const TRAIN_MET = {
  strength: 3.5, heavy: 6.0, cycling: 5.0, cyclinghard: 9.0,
  circuits: 7.5, hiit: 11.0, climbing: 5.8, yoga: 2.3
};
const TRAIN_ATTEND = { always: 0.9, usually: 0.75, sometimes: 0.5 };
function sessionKcal(type, weightKg, minutes) {
  var met = TRAIN_MET[type];
  if (met == null) met = 3.5;
  if (minutes == null || minutes === '' || isNaN(Number(minutes))) minutes = 60;
  else minutes = Number(minutes);
  if (minutes <= 0) return 0;
  var wk = Number(weightKg);
  if (!isFinite(wk) || wk <= 0) return 0;
  return (met - 1) * wk * minutes / 60;
}
function trainingPerDay(detail, weightKg) {
  if (!detail || detail.on !== true) return 0;
  var sessions = Number(detail.sessions);
  if (!sessions || sessions <= 0) return 0;
  var attend = TRAIN_ATTEND[detail.attendance];
  if (attend == null) attend = 0.75;
  var perSession = sessionKcal(detail.type, weightKg, detail.minutes);
  return perSession * sessions * attend / 7;
}

const SPLITS = {
  balanced: {p:25, f:30, c:45},
  protein:  {p:35, f:30, c:35},
  lowcarb:  {p:30, f:45, c:25}
};
const DIRECTIONS = { lose:0.90, maintain:1.00, gain:1.07 };
const RMR_REL_UNC = 0.10;
const FLOOR_ABS = { male:1500, female:1200 };
const DEFAULT_SLOTS = { breakfast:25, lunch:35, snack:10, dinner:30 };
const SLOTS = ['breakfast','lunch','snack','dinner'];
const SLOT_PRESETS = [
  {id:'three',   slots:{breakfast:30, lunch:35, snack:0,  dinner:35}},
  {id:'snack',   slots:{breakfast:25, lunch:35, snack:10, dinner:30}},
  {id:'bigbf',   slots:{breakfast:35, lunch:35, snack:10, dinner:20}},
  {id:'lightbf', slots:{breakfast:15, lunch:35, snack:15, dinner:35}}
];

function slotPresetId(slots){
  if (!slots) return null;
  for (var i = 0; i < SLOT_PRESETS.length; i++){
    var p = SLOT_PRESETS[i];
    var match = true;
    for (var j = 0; j < SLOTS.length; j++){
      if (Number(slots[SLOTS[j]]) !== p.slots[SLOTS[j]]){ match = false; break; }
    }
    if (match) return p.id;
  }
  return null;
}

function round10(n){ return Math.round(n/10)*10; }
function round5(n){ return Math.round(n/5)*5; }

/* The engine reads a flat view, so the maths stays exactly as tested. */
function flatProfile(rec){
  if (!rec || !rec.person) return null;
  const P = rec.person, G = rec.goals || {};
  const ms = G.macroSplit || {};
  return {
    sex: P.sex, age: P.age, height: P.heightCm, weight: P.weightKg,
    bodyFat: P.bodyFatPct, periods: P.periods,
    activity: P.activityLevel, direction: G.direction || 'maintain',
    split: ms.preset || 'balanced', custom: {p: ms.proteinPct, f: ms.fatPct, c: ms.carbPct}
  };
}

function computeTargets(rec){
  const p = flatProfile(rec);
  if (!p || !p.age || !p.weight) return null;
  const w = Number(p.weight), h = Number(p.height), a = Number(p.age);
  const bf = Number(p.bodyFat);
  let rmr, rmrRel, method;
  if (bf >= 3 && bf <= 60) {
    rmr = 22 * (w * (1 - bf/100)) + 500;
    rmrRel = 0.10;
    method = 'leanmass';
  } else if (h > 0) {
    rmr = 10*w + 6.25*h - 5*a - 78;
    rmrRel = Math.sqrt(0.10*0.10 + (83/rmr)*(83/rmr));
    method = 'mifflin';
  } else {
    const male = a < 30 ? 15.057*w + 692.2 : a < 60 ? 11.472*w + 873.1 : 11.711*w + 587.7;
    const female = a < 30 ? 14.818*w + 486.6 : a < 60 ? 8.126*w + 845.6 : 9.082*w + 658.5;
    rmr = (male + female) / 2;
    const half = Math.abs(male - female) / 2;
    rmrRel = Math.sqrt(0.12*0.12 + (half/rmr)*(half/rmr));
    method = 'weight';
  }
  const d = rec.person.activityDetail;
  if (d && d.on === true) {
    var band = ACTIVITY.find(x => x.id === Number(d.base));
    if (!band) band = ACTIVITY[0];
    var trainExact = trainingPerDay(d, w);
  } else {
    var band = ACTIVITY.find(x => x.id === Number(p.activity)) || ACTIVITY[1];
    var trainExact = 0;
  }
  const tdee = rmr * band.mult + trainExact;
  const actRel = band.unc / band.mult;
  const rel = Math.sqrt(rmrRel*rmrRel + actRel*actRel);
  const adj = DIRECTIONS[p.direction] || 1;
  let low  = tdee * (1 - rel) * adj;
  let high = tdee * (1 + rel) * adj;
  const floorAbs = 1200;
  const floor = Math.max(round10(rmr), floorAbs);
  let floorBinding = false;
  if (low < floor){ low = floor; floorBinding = true; }
  if (floorBinding && high < floor * 1.08) high = floor * 1.08;
  low = round10(low); high = round10(high);
  const split = p.split === 'custom'
    ? {p:Number(p.custom.p), f:Number(p.custom.f), c:Number(p.custom.c)}
    : SPLITS[p.split] || SPLITS.balanced;
  const mac = (pct, kcalPerG) => ({
    low:  round5(low  * pct/100 / kcalPerG),
    high: round5(high * pct/100 / kcalPerG)
  });
  const macros = { p: mac(split.p,4), f: mac(split.f,9), c: mac(split.c,4) };
  return {
    rmr: Math.round(rmr), mult: band.mult, tdee: Math.round(tdee), training: Math.round(Math.round(trainExact * 1e6) / 1e6),
    relPct: Math.round(rel*1000)/10, method,
    low, high, mid: round10((low+high)/2), floor, floorAbs, floorBinding, split, macros,
    proteinPerKg: { low: Math.round(macros.p.low/w*10)/10, high: Math.round(macros.p.high/w*10)/10 }
  };
}

function slotShares(){
  const s = (S.profile && S.profile.goals && S.profile.goals.slots) || DEFAULT_SLOTS;
  const sum = SLOTS.reduce((a,k) => a + (Number(s[k])||0), 0) || 100;
  const out = {};
  SLOTS.forEach(k => out[k] = (Number(s[k])||0) / sum);
  return out;
}

function splitPreview(rec){
  const g = computeTargets(rec);
  if (!g) return null;
  const kcal = g.mid;
  const weight = Number(rec.person.weightKg);
  const p = round5(kcal * g.split.p / 100 / 4);
  const f = round5(kcal * g.split.f / 100 / 9);
  const c = round5(kcal * g.split.c / 100 / 4);
  const pkg = Math.round(p / weight * 10) / 10;
  const fatHigh = g.split.f > 35;
  const s = (rec.goals && rec.goals.slots) || DEFAULT_SLOTS;
  const sum = SLOTS.reduce((a, k) => a + (Number(s[k]) || 0), 0) || 100;
  const slots = [];
  SLOTS.forEach(k => {
    const share = (Number(s[k]) || 0) / sum;
    if (share === 0) return;
    slots.push({ slot: k, kcal: round10(kcal * share) });
  });
  return { kcal, p, f, c, pkg, fatHigh, slots };
}

/* ---------- 8. Reference values ----------
   Daily values for adults from the European Food Safety Authority
   (EFSA Dietary Reference Values, 2017 summary report and updates),
   with WHO limits for saturated fat. kind:
     min   aim to reach at least this
     max   stay under this
     info  shown, never flagged
   ------------------------------------------------------ */

function referenceValues(){
  const p = flatProfile(S.profile) || {};
  const g = computeTargets(S.profile);
  const age = Number(p.age) || 30;
  const w = Number(p.weight) || 63.3;
  const f = clamp((w - 58.5) / (68.1 - 58.5), 0, 1);
  const mix = (fem, man, d) => d ? round1(fem + f*(man - fem)) : Math.round(fem + f*(man - fem));
  const kcal = g ? g.mid : 2250;
  const MJ = kcal * 4.184 / 1000;
  const ref = {
    kcal: {kind:'range', low: g ? g.low : null, high: g ? g.high : null},
    prot: {kind:'range', low: g ? g.macros.p.low : null, high: g ? g.macros.p.high : null},
    fat:  {kind:'range', low: g ? g.macros.f.low : null, high: g ? g.macros.f.high : null},
    carb: {kind:'range', low: g ? g.macros.c.low : null, high: g ? g.macros.c.high : null},
    fib:  {kind:'min', v:25},
    sug:  {kind:'info'},
    sfa:  {kind:'max', v: Math.round(kcal*0.10/9)},
    trans:{kind:'info'},
    chol: {kind:'info'},
    ala:  {kind:'min', v: round1(kcal*0.005/9)},
    o3ld: {kind:'min', v:250},
    na:   {kind:'max', v:2000},
    k:    {kind:'min', v:3500},
    ca:   {kind:'min', v: age < 25 ? 1000 : 950},
    mg:   {kind:'min', v: mix(300, 350)},
    p:    {kind:'min', v:550},
    fe:   {kind:'min', v: p.periods === 'no' ? 11 : 16},
    zn:   {kind:'min', v: mix(9.3, 11.7, 1)},
    cu:   {kind:'min', v: mix(1.3, 1.6, 1)},
    mn:   {kind:'min', v:3},
    se:   {kind:'min', v:70},
    iod:  {kind:'min', v:150},
    vita: {kind:'min', v: mix(650, 750)},
    vitd: {kind:'min', v:15},
    vite: {kind:'min', v: mix(11, 13, 1)},
    vitk: {kind:'min', v:70},
    vitc: {kind:'min', v: mix(95, 110)},
    b1:   {kind:'min', v: round1(0.1*MJ)},
    b2:   {kind:'min', v:1.6},
    b3:   {kind:'min', v: Math.round(1.6*MJ)},
    b5:   {kind:'min', v:5},
    b6:   {kind:'min', v: mix(1.6, 1.7, 1)},
    biot: {kind:'min', v:40},
    fol:  {kind:'min', v:330},
    b12:  {kind:'min', v:4},
    choline: {kind:'min', v:400},
    alc:  {kind:'info'},
    caff: {kind:'max', v:400}
  };
  return ref;
}

/* ---------- 9. Allergens and lists (from v0.1) ----------
   Annex II of Regulation (EU) 1169/2011, with other names attached so
   the hard filter has something to match against. */

const ALLERGENS = [
  {id:'gluten', cs:'Lepek', en:'Gluten',
   syn:['pšenice','žito','ječmen','oves','špalda','kamut','mouka','strouhanka','kuskus','bulgur','wheat','rye','barley','oats','spelt','flour','breadcrumbs','couscous','pasta','těstoviny','bread','chléb','noodles','nudle','seitan','panko','tortilla','soy sauce','sójová omáčka','teriyaki','spaghetti','linguine','fettuccine','tagliatelle','penne','rigatoni','macaroni','lasagne','lasagna','gnocchi','semolina','krupice','pita','naan','bagel','croissant','cracker','biscuit','pastry','dumpling','knedlík','rohlík','beer','pivo','malt']},
  {id:'crustaceans', cs:'Korýši', en:'Crustaceans',
   syn:['krevety','garnáty','krab','humr','langusta','shrimp','prawn','crab','lobster','crayfish','kimchi','krill']},
  {id:'egg', cs:'Vejce', en:'Eggs',
   syn:['vejce','žloutek','bílek','majonéza','egg','yolk','egg white','mayonnaise','albumin','custard','meringue','aioli']},
  {id:'fish', cs:'Ryby', en:'Fish',
   syn:['losos','tuňák','treska','sardinky','ančovičky','rybí omáčka','worcesterská omáčka','salmon','tuna','cod','sardines','anchovies','fish sauce','fish','anchovy','worcestershire','kimchi','mackerel','trout','herring','haddock','hake','pollock','tilapia','makrela','pstruh','sleď','kapr','candát']},
  {id:'peanut', cs:'Arašídy', en:'Peanuts',
   syn:['arašídy','podzemnice olejná','arašídové máslo','peanut','peanut butter','groundnut']},
  {id:'soy', cs:'Sója', en:'Soybeans',
   syn:['sója','sójová omáčka','tofu','edamame','miso','tempeh','soy','soya','soy sauce','tamari','teriyaki','shoyu','natto']},
  {id:'milk', cs:'Mléko', en:'Milk',
   syn:['mléko','máslo','sýr','smetana','jogurt','tvaroh','syrovátka','laktóza','milk','butter','cheese','cream','yoghurt','yogurt','whey','lactose','ghee','parmesan','mozzarella','feta','ricotta','skyr','kefir','pesto','mascarpone','quark','paneer','halloumi','gouda','cheddar','camembert','bechamel','custard','eidam','hermelín']},
  {id:'nuts', cs:'Skořápkové plody', en:'Tree nuts',
   syn:['mandle','lískové ořechy','vlašské ořechy','kešu','pekanové ořechy','para ořechy','pistácie','makadamie','marcipán','almond','hazelnut','walnut','cashew','pecan','brazil nut','pistachio','macadamia','marzipan','praline','pesto']},
  {id:'celery', cs:'Celer', en:'Celery',
   syn:['celer','celerová nať','bulion','vývar v kostce','celery','celeriac','stock cube','bouillon']},
  {id:'mustard', cs:'Hořčice', en:'Mustard',
   syn:['hořčice','hořčičné semínko','dijon','mustard','mustard seed']},
  {id:'sesame', cs:'Sezam', en:'Sesame',
   syn:['sezam','tahini','humus','sesame','sesame seed','hummus']},
  {id:'sulphites', cs:'Siřičitany', en:'Sulphites',
   syn:['siřičitany','oxid siřičitý','E220','E221','E222','E223','E224','E226','E227','E228','sušené ovoce','víno','sulphite','sulfite','sulphur dioxide','dried fruit','wine']},
  {id:'lupin', cs:'Vlčí bob', en:'Lupin',
   syn:['lupina','vlčí bob','lupinová mouka','lupin','lupin flour']},
  {id:'molluscs', cs:'Měkkýši', en:'Molluscs',
   syn:['mušle','slávky','chobotnice','oliheň','hlemýžď','ústřice','mussels','clams','octopus','squid','snail','oyster','scallop']}
];

const CUISINES = [
  {id:'cz', cs:'Česká', en:'Czech'},
  {id:'it', cs:'Italská', en:'Italian'},
  {id:'fr', cs:'Francouzská', en:'French'},
  {id:'gr', cs:'Řecká', en:'Greek'},
  {id:'me', cs:'Blízkovýchodní', en:'Middle Eastern'},
  {id:'in', cs:'Indická', en:'Indian'},
  {id:'cn', cs:'Čínská', en:'Chinese'},
  {id:'jp', cs:'Japonská', en:'Japanese'},
  {id:'kr', cs:'Korejská', en:'Korean'},
  {id:'th', cs:'Thajská', en:'Thai'},
  {id:'vn', cs:'Vietnamská', en:'Vietnamese'},
  {id:'mx', cs:'Mexická', en:'Mexican'},
  {id:'balk', cs:'Balkánská', en:'Balkan'}
];

const EQUIPMENT = ['hob','oven','micro','blender','airfryer','pressure','none'];
const TIMES = [1,2,3,4];
const TIME_MAX_MIN = {1:15, 2:30, 3:60, 4:600};
const BUDGETS = ['bud1','bud2','bud3','bud4','bud5','bud6'];

const DIET_STYLES = ['omnivore','flexitarian','pescatarian','vegetarian','vegan','mediterranean','lowcarb','highprotein','glutenfree','lactosefree'];
const AIMS = ['muscle','fatloss','energy','digestion','fibre','lesssugar','lesssalt','veg','protein','heart','sleep','skin'];
const FOCUS_CHOICES = ['fib','prot','vitd','fe','ca','mg','k','zn','b12','fol','vitc','o3ld','iod','se'];

const PATTERNS = ['everything','littlemeat','pescatarian','vegetarian','vegan','carnivore'];
const CONDITIONS = ['coeliac','lactose','kidney'];
const FOOD_RULES = ['halal','kosher','nopork','nobeef','noalcohol'];
const FOOD_PREFS = ['avoidgluten','lactosefreeproducts'];
const HEALTH_FOCUS = ['fibre','lesssugar','lesssalt','veg','heart','digestion','mediterranean'];
const SOFT_HINTS = ['energy','sleep','skin'];
const DIET_GROUPS = {
  meat: ['meat','beef','veal','pork','ham','bacon','chicken','turkey','duck','goose','lamb','mutton','venison','rabbit','mince','steak','ribeye','sirloin','brisket','sausage','salami','chorizo','prosciutto','pancetta','pepperoni','mortadella','pastrami','jerky','liver','gelatin','gelatine','lard','suet','bone broth','maso','hovězí','vepřové','kuřecí','kuře','krůtí','kachna','kachní','husa','jehněčí','telecí','zvěřina','králík','slanina','šunka','klobása','párek','párky','játra','želatina','sádlo'],
  pork: ['pork','ham','bacon','prosciutto','pancetta','salami','chorizo','pepperoni','lard','gelatin','gelatine','vepř','vepřové','šunka','slanina','sádlo','želatina'],
  beef: ['beef','veal','ribeye','sirloin','brisket','bresaola','hamburger','hovězí','telecí'],
  alcohol: ['wine','beer','rum','vodka','gin','brandy','cognac','whisky','whiskey','liqueur','sake','mirin','sherry','vermouth','prosecco','champagne','cider','víno','pivo','slivovice','becherovka'],
  honey: ['honey','honeycomb']
};

/* Phrases that contain an allergen word but are not that allergen.
   Removed from the text before matching, so they do not raise false alarms. */
const EXCLUSION_FALSE_FRIENDS = {
  milk: ['coconut milk','almond milk','oat milk','soy milk','soya milk','rice milk','peanut butter','cocoa butter','almond butter','nut butter','cashew butter','apple butter','cream of tartar','coconut cream',
         'kokosove mleko','mandlove mleko','ovesne mleko','sojove mleko','ryzove mleko','arasidove maslo','kakaove maslo','mandlove maslo','kokosova smetana','syrup','sirup','butternut','syrah','butterbur','butterhead','fruit butter','custard apple','milkfish','tvarovan','pestr',
         'syrovy ','syrova ','syrove ','syrovych ','syrovou ','syrovem ','syrovym '],
  egg: ['eggplant','egg noodles free','custard apple','bile ','bily ','bila ','bilych ','bilou ','bilem ','bilym '],
  nuts: ['nutmeg','butternut','coconut','muskatovy orisek','muskatovy','pestr'],
  fish: ['fish sauce free','troub','kaprad'],
  gluten: ['gluten free soy sauce','gluten free','bez lepku','buckwheat flour','buckwheat','pohanka','rice flour','ryzova mouka','corn flour','kukuricna mouka','almond flour','mandlova mouka','coconut flour','chickpea flour','cizrnova mouka','rice noodles','ryzove nudle','glass noodles','sklenene nudle','corn tortilla','kukuricna tortilla','breast','breakfast','paste','pastinak','pastrami',
           'breadfruit','pitanga','winter spaghetti','spaghetti squash','potato flour','acorn flour','cottonseed flour','sesame flour','sunflower seed flour','carob flour','peanut flour','soy flour','arrowroot flour','millet flour','sorghum flour','tapioca flour','flounder','root beer','breadnut','chlebovnik','kukuricna krupice',
           'bramborova mouk','bramborove mouk','zaludova mouk','bavlnikova mouk','sezamova mouk','slunecnicova mouk','karobova mouk','arasidova mouk','sojova mouk',
           'marantova mouk','pohankova mouk','jahlova mouk','cirokova mouk','cirokove mouk','ryzove mouk'],
  molluscs: ['oyster mushroom','mushrooms oyster','vegetable oyster','scalloped','summer scallop','scallop squash'],
  crustaceans: ['crabapple','krabic'],
  celery: ['cele ','celeho ','celemu ','cely ','cela ','celych ','celou ','celem ','celym '],
  lupin: ['lupink'],
  soy: ['tamarind','non soy'],
  meat: ['coconut meat','meatless','meat substitute','meat free','plant based meat','vegan meat','vegetarian meat','gooseberr','lamb s lettuce','lambs lettuce','tofu steak','cauliflower steak','mushroom steak','celeriac steak','cabbage steak','vegan sausage','vegetarian sausage','meatless sausage','coconut bacon','tempeh bacon','vegan bacon','vegan mince','soy mince','plant based mince','cod liver','pepperoncin','sojove maso','kruton','steam','steak cut','steak fries','steakov','steak sauce','lambsquarter','grated meat','meat extender','bezmas','bacon meatless','bacon bits meatless','sausage meatless','frankfurter meatless','chicken meatless','egg duck','egg turkey','duck egg','turkey egg','vejce kachni','vejce kruti','sauce duck','duck sauce','kachni svestkova','meatballs meatless','parek bezmas','klobasa bezmas','masove kulicky bezmas','masovy nastavovac'],
  pork: ['hamburger','pepperoncin','coconut bacon','tempeh bacon','vegan bacon','bacon meatless','bacon bits meatless','bezmas'],
  alcohol: ['ginger','ginkgo','cider vinegar','wine vinegar','sherry vinegar','vinegar cider','vinegar red wine','vinegar white wine','rump'],
  honey: ['honeydew']
};

function impliedExclusions(rec){
  const F = (rec && rec.food) || {};
  const out = [];
  const push = (ids, label, type) => ids.forEach(id => out.push({id, label, type, syn: []}));
  const P = F.pattern, o = F.patternOpts || {};
  if (P === 'pescatarian') push(['meat'], t('fp_'+P), 'pattern');
  if (P === 'vegetarian') push(['meat','fish','crustaceans','molluscs'].concat(o.noEggs?['egg']:[], o.noMilk?['milk']:[]), t('fp_'+P), 'pattern');
  if (P === 'vegan') push(['meat','fish','crustaceans','molluscs','egg','milk','honey'], t('fp_'+P), 'pattern');
  if ((F.conditions||[]).indexOf('coeliac') >= 0) push(['gluten'], t('fc_coeliac'), 'condition');
  const R = {halal:['pork','alcohol'], kosher:['pork','crustaceans','molluscs'], nopork:['pork'], nobeef:['beef'], noalcohol:['alcohol']};
  (F.rules||[]).forEach(r => { if (R[r]) push(R[r], t('fr_'+r), 'rule'); });
  return out;
}

/* Convert old diet-style chips (rec.goals.dietStyle, rec.goals.aims)
   to the new profile fields (rec.food.pattern, etc.).
   Returns a deep copy; original is untouched. */
function migrateDietV3(rec){
  const r = deepCopy(rec);
  if (r.food && r.food.pattern !== undefined) return r;
  if (!r.food) r.food = {};
  if (!r.goals) r.goals = {};
  const ds = r.goals.dietStyle || [];
  const aims = r.goals.aims || [];

  // pattern
  if (ds.includes('vegan')) r.food.pattern = 'vegan';
  else if (ds.includes('vegetarian')) r.food.pattern = 'vegetarian';
  else if (ds.includes('pescatarian')) r.food.pattern = 'pescatarian';
  else if (ds.includes('flexitarian')) r.food.pattern = 'littlemeat';
  else r.food.pattern = 'everything';

  // patternOpts, conditions, rules
  r.food.patternOpts = { noEggs: false, noMilk: false };
  r.food.conditions = [];
  r.food.rules = [];

  // prefs
  r.food.prefs = [];
  if (ds.includes('glutenfree') && !(r.food.exclusions||[]).some(e => e.id === 'gluten'))
    r.food.prefs.push('avoidgluten');
  if (ds.includes('lactosefree')) r.food.prefs.push('lactosefreeproducts');

  // goals.focus: aims that are in HEALTH_FOCUS (aims order), then mediterranean from ds
  r.goals.focus = aims.filter(a => HEALTH_FOCUS.includes(a));
  if (ds.includes('mediterranean') && !r.goals.focus.includes('mediterranean'))
    r.goals.focus.push('mediterranean');

  // goals.hints: aims that are in SOFT_HINTS
  r.goals.hints = aims.filter(a => SOFT_HINTS.includes(a));

  return r;
}


/* All exclusion words for the hard filter, folded for matching.
   Longer words are cut by one letter so Czech endings still match
   (mléko, mléka, mlékem). Over matching is the safe side for allergies. */
function exclusionTerms(){
  const ex = (S.profile && S.profile.food && S.profile.food.exclusions) || [];
  const out = [];
  ex.concat(impliedExclusions(S.profile)).forEach(x => {
    /* a known allergen always carries the full, current list of other names */
    const known = x.id ? ALLERGENS.find(a => a.id === x.id) : null;
    const group = x.id && DIET_GROUPS[x.id] ? DIET_GROUPS[x.id] : [];
    const words = (x.type === 'pattern' || x.type === 'condition' || x.type === 'rule' ? [] : [x.label]).concat(x.syn || [], known ? known.syn.concat([known.cs, known.en]) : [], group).map(fold)
      .map(w => w.replace(/[^a-z0-9]+/g,' ').trim()).filter(w => w.length >= 3)
      .map(w => (w.length >= 5 && w.indexOf(' ') < 0) ? w.slice(0, -1) : w);
    out.push({id: x.id || null, label: (x.type === 'pattern' || x.type === 'condition' || x.type === 'rule') ? x.label : exclLabel(x), type: x.type, words});
  });
  return out;
}

/* Returns the exclusions a piece of text hits, e.g. a recipe's ingredient list. */
function exclusionHits(text){
  const base = ' ' + fold(text).replace(/[^a-z0-9]+/g,' ') + ' ';
  const hits = [];
  exclusionTerms().forEach(x => {
    let f = base;
    (EXCLUSION_FALSE_FRIENDS[x.id] || []).forEach(ph => { f = f.split(' ' + ph).join(' '); });
    for (const w of x.words){
      if (f.indexOf(' ' + w) >= 0){ hits.push({label:x.label, type:x.type, word:w}); break; }
    }
  });
  return hits;
}

/* Recipe amounts: common fractions as ¼ ½ ¾ ⅓ ⅔. */
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
