// Sync engine — pulls and pushes records through the sync server

const SYNC_URL = 'https://jrajmont--01a0d84f9098771d83cd77326fa78d80.web.val.run';
const SYNC_BATCH = 200;
const SYNC_DELAY_MS = 5000;
let syncTimer = null;
let syncRunning = false;
let syncRunQueued = null;
let syncPushing = false;
let syncPushAgain = false;

/* ---- syncBase ---- */
function syncBase() {
  var url = (S.prefs.sync && S.prefs.sync.url) ? S.prefs.sync.url.trim() : SYNC_URL;
  if (!url) url = SYNC_URL;
  while (url.length > 0 && url[url.length - 1] === '/') url = url.slice(0, -1);
  return url;
}

/* ---- syncKeyFromInput ---- */
function syncKeyFromInput(text) {
  var t = (text || '').trim();
  var idx = t.indexOf('#join=');
  if (idx >= 0) t = t.slice(idx + 6).trim();
  return t;
}

/* ---- syncFetch ---- */
async function syncFetch(method, path, body, key, opts) {
  var url = syncBase() + path;
  var init = {
    method: method,
    headers: {
      Authorization: 'Bearer ' + (key || S.secrets.sync)
    }
  };
  if (opts && opts.keepalive) init.keepalive = true;
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  var res = await fetch(url, init);
  if (res.status === 401) {
    var err = new Error('unauthorized');
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    var err2 = new Error('HTTP ' + res.status);
    err2.status = res.status;
    throw err2;
  }
  return await res.json();
}

/* ---- syncMe ---- */
async function syncMe(key) {
  var data = await syncFetch('GET', '/v1/me', undefined, key);
  return data.user;
}

/* ---- syncApplyItem ---- */
async function syncApplyItem(item) {
  if (item.store !== 'records' && item.store !== 'recipes') return false;
  var local = await dbGet(item.store, item.id);
  if (item.store === 'recipes' && local && (local.origin === 'catalog' || local.origin === 'starter' || local.origin === 'archive')) return false;
  if (local && isoMs(item.updatedAt) <= isoMs(local.updatedAt)) return false;
  var obj = Object.assign({}, item.body);
  obj.id = item.id;
  obj.updatedAt = item.updatedAt;
  obj.deleted = item.deleted === true;
  await dbPut(item.store, obj);
  return true;
}

/* ---- syncPull ---- */
async function syncPull(key) {
  var count = 0;
  for (var i = 0; i < 100; i++) {
    var data = await syncFetch('GET', '/v1/pull?after=' + (S.meta.sync.cursor || 0), undefined, key);
    if (S.secrets.sync !== key) return 0;
    if (data.items) {
      for (var j = 0; j < data.items.length; j++) {
        if (await syncApplyItem(data.items[j])) count++;
      }
    }
    if (typeof data.seq === 'number') {
      S.meta.sync.cursor = data.seq;
      await saveMeta();
    }
    if (data.more !== true) break;
  }
  if (count > 0) {
    S.profile = await recGet('profile');
    await loadRecipes();
    if (!S.sheetOpen) renderScreen(S.screen);
  }
  return count;
}

/* ---- syncPushable ---- */
function syncPushable(store, rec) {
  if (store === 'recipes') return rec.origin === 'own' || rec.origin === 'claude';
  if (store === 'records') return RECORD_TYPES[rec.type] && RECORD_TYPES[rec.type].shared;
  return false;
}

/* ---- syncDue ---- */
function syncDue(rec, since, ids) {
  if (!since) return true;
  var recMs = isoMs(rec.updatedAt);
  var sinceMs = isoMs(since);
  if (recMs > sinceMs) return true;
  if (recMs === sinceMs && !(ids || []).some(function(id) { return id === rec.id; })) return true;
  return false;
}

/* ---- syncPending ---- */
async function syncPending() {
  if (!S.meta.sync.lastPushAt) return true;
  var records = await dbAll('records');
  for (var i = 0; i < records.length; i++) {
    if (syncPushable('records', records[i]) && syncDue(records[i], S.meta.sync.lastPushAt, S.meta.sync.lastPushIds)) return true;
  }
  var recipes = await dbAll('recipes');
  for (var i = 0; i < recipes.length; i++) {
    if (syncPushable('recipes', recipes[i]) && syncDue(recipes[i], S.meta.sync.lastPushAt, S.meta.sync.lastPushIds)) return true;
  }
  return false;
}

/* ---- syncPush ---- */
async function syncPush(opts) {
  if (syncPushing) { syncPushAgain = true; return 0; }
  syncPushing = true;
  var count = 0;
  try {
    var since = S.meta.sync.lastPushAt;
    var items = [];
    var records = await dbAll('records');
    for (var i = 0; i < records.length; i++) {
      var rec = records[i];
      if (syncPushable('records', rec)) {
        if (syncDue(rec, since, S.meta.sync.lastPushIds)) {
          var body = {};
          for (var k in rec) {
            if (k !== '_search') body[k] = rec[k];
          }
          items.push({
            store: 'records',
            id: rec.id,
            updatedAt: rec.updatedAt,
            deleted: rec.deleted === true,
            body: body
          });
        }
      }
    }
    var recipes = await dbAll('recipes');
    for (var i = 0; i < recipes.length; i++) {
      var rec = recipes[i];
      if (syncPushable('recipes', rec)) {
        if (syncDue(rec, since, S.meta.sync.lastPushIds)) {
          var body = {};
          for (var k in rec) {
            if (k !== '_search') body[k] = rec[k];
          }
          items.push({
            store: 'recipes',
            id: rec.id,
            updatedAt: rec.updatedAt,
            deleted: rec.deleted === true,
            body: body
          });
        }
      }
    }
    items.sort(function(a, b) { return isoMs(a.updatedAt) - isoMs(b.updatedAt); });
    for (var start = 0; start < items.length; start += SYNC_BATCH) {
      var batch = items.slice(start, start + SYNC_BATCH);
      await syncFetch('POST', '/v1/push', { items: batch }, undefined, opts);
      var newPushAt = batch[batch.length - 1].updatedAt;
      if (S.meta.sync.lastPushAt === newPushAt) {
        S.meta.sync.lastPushIds = S.meta.sync.lastPushIds || [];
        for (var j = 0; j < batch.length; j++) {
          if (batch[j].updatedAt === newPushAt) {
            S.meta.sync.lastPushIds.push(batch[j].id);
          }
        }
      } else {
        S.meta.sync.lastPushAt = newPushAt;
        S.meta.sync.lastPushIds = [];
        for (var j = 0; j < batch.length; j++) {
          if (batch[j].updatedAt === newPushAt) {
            S.meta.sync.lastPushIds.push(batch[j].id);
          }
        }
      }
      await saveMeta();
      count += batch.length;
    }
  } finally {
    syncPushing = false;
  }
  if (syncPushAgain) {
    syncPushAgain = false;
    count += await syncPush(opts);
  }
  return count;
}

/* ---- syncFresh ---- */
function syncFresh() {
  if (!S.secrets.sync) return false;
  if (!S.meta.sync.lastOkAt) return false;
  return Date.now() - isoMs(S.meta.sync.lastOkAt) < 24 * 3600 * 1000;
}

/* ---- syncShow ---- */
function syncShow() {
  if (typeof renderSyncCard === 'function') renderSyncCard();
  renderBackupBar();
}

/* ---- syncRun ---- */
async function syncRun(reason, push) {
  if (syncRunning) {
    syncRunQueued = { reason: reason, push: !!push || !!(syncRunQueued && syncRunQueued.push) };
    return false;
  }
  syncRunning = true;
  var ok = false;
  try {
    ok = await syncRunOnce(reason, push);
  } finally {
    syncRunning = false;
  }
  if (syncRunQueued) {
    var q = syncRunQueued;
    syncRunQueued = null;
    await syncRun(q.reason, q.push);
  }
  return ok;
}

/* ---- syncRunOnce ---- */
async function syncRunOnce(reason, push) {
  var st = S.meta.sync;
  if (!S.secrets.sync || st.state === 'revoked') return false;
  if (navigator.onLine === false) {
    st.state = 'offline';
    await saveMeta();
    syncShow();
    return false;
  }
  var key = S.secrets.sync;
  try {
    await syncPull(key);
    if (S.secrets.sync !== key) return false;
    if (await syncPending()) await syncPush();
    if (S.secrets.sync !== key) return false;
    if (typeof catalogRun === 'function') await catalogRun(reason === 'now');
    if (S.secrets.sync !== key) return false;
    st.state = 'ok';
    st.lastOkAt = nowIso();
    st.lastError = '';
  } catch (err) {
    if (S.secrets.sync !== key) return false;
    if (err.status === 401) {
      st.state = 'revoked';
      clearTimeout(syncTimer);
      syncTimer = null;
    } else {
      st.state = 'error';
      st.lastError = String(err.message);
    }
  } finally {
    if (S.secrets.sync !== key) return false;
    await saveMeta();
    syncShow();
  }
  return st.state === 'ok';
}

async function syncAfterRestore() {
  if (!S.secrets.sync) return false;
  S.meta.sync.cursor = 0;
  S.meta.sync.lastPushAt = null;
  S.meta.sync.lastPushIds = [];
  await saveMeta();
  return await syncRun('restore', true);
}

/* ---- scheduleSync ---- */
function scheduleSync() {
  if (!S.secrets.sync || S.meta.sync.state === 'revoked') return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(function() {
    syncTimer = null;
    syncRun('change', true);
  }, SYNC_DELAY_MS);
}

/* ---- syncJoin ---- */
async function syncJoin(key, user) {
  if (S.secrets.sync && S.secrets.sync !== key) {
    S.secrets.sync = key;
    await dbClear('records');
    var recipes = await dbAll('recipes');
    for (var i = 0; i < recipes.length; i++) {
      if (recipes[i].origin === 'own' || recipes[i].origin === 'claude') {
        await dbDel('recipes', recipes[i].id);
      }
    }
    resetSessionState();
    await loadRecipes();
    renderScreen(S.screen);
  }
  S.secrets.sync = key;
  await secretSet('sync', key);
  S.meta.sync = {
    cursor: 0,
    lastPushAt: null,
    lastOkAt: null,
    state: 'ok',
    lastError: '',
    name: (user && user.name) || ''
  };
  await saveMeta();
  return await syncRun('join', true);
}

/* ---- syncLeave ---- */
async function syncLeave() {
  clearTimeout(syncTimer);
  S.secrets.sync = '';
  await secretSet('sync', '');
  S.meta.sync = {
    cursor: 0,
    lastPushAt: null,
    lastOkAt: null,
    state: 'off',
    lastError: '',
    name: ''
  };
  resetSessionState();
  await loadRecipes();
  renderScreen(S.screen);
  await saveMeta();
  syncShow();
}

/* ---- syncFlush ---- */
async function syncFlush() {
  if (syncTimer === null) return;
  clearTimeout(syncTimer);
  syncTimer = null;
  if (S.secrets.sync && S.meta.sync.state !== 'revoked' && navigator.onLine !== false) {
    syncPush({ keepalive: true }).catch(function(){});
  }
}
