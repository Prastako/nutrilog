// Sync engine — pulls and pushes records through the sync server

const SYNC_URL = 'https://jrajmont--01a0d84f9098771d83cd77326fa78d80.web.val.run';
const SYNC_BATCH = 200;
const SYNC_DELAY_MS = 5000;
let syncTimer = null;

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
async function syncFetch(method, path, body, key) {
  var url = syncBase() + path;
  var init = {
    method: method,
    headers: {
      Authorization: 'Bearer ' + (key || S.secrets.sync)
    }
  };
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
  if (local && isoMs(item.updatedAt) <= isoMs(local.updatedAt)) return false;
  var obj = Object.assign({}, item.body);
  obj.id = item.id;
  obj.updatedAt = item.updatedAt;
  obj.deleted = item.deleted === true;
  await dbPut(item.store, obj);
  return true;
}

/* ---- syncPull ---- */
async function syncPull() {
  var count = 0;
  for (var i = 0; i < 100; i++) {
    var data = await syncFetch('GET', '/v1/pull?after=' + (S.meta.sync.cursor || 0));
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

/* ---- syncPush ---- */
async function syncPush() {
  var since = S.meta.sync.lastPushAt;
  var items = [];
  var records = await dbAll('records');
  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    if (syncPushable('records', rec)) {
      if (!since || isoMs(rec.updatedAt) > isoMs(since)) {
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
      if (!since || isoMs(rec.updatedAt) > isoMs(since)) {
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
  var count = 0;
  for (var start = 0; start < items.length; start += SYNC_BATCH) {
    var batch = items.slice(start, start + SYNC_BATCH);
    await syncFetch('POST', '/v1/push', { items: batch });
    S.meta.sync.lastPushAt = batch[batch.length - 1].updatedAt;
    await saveMeta();
    count += batch.length;
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
  var st = S.meta.sync;
  if (!S.secrets.sync || st.state === 'revoked') return false;
  if (navigator.onLine === false) {
    st.state = 'offline';
    await saveMeta();
    syncShow();
    return false;
  }
  try {
    await syncPull();
    if (push) await syncPush();
    if (typeof catalogRun === 'function') await catalogRun(reason === 'now');
    st.state = 'ok';
    st.lastOkAt = nowIso();
    st.lastError = '';
  } catch (err) {
    if (err.status === 401) {
      st.state = 'revoked';
      clearTimeout(syncTimer);
      syncTimer = null;
    } else {
      st.state = 'error';
      st.lastError = String(err.message);
    }
  } finally {
    await saveMeta();
    syncShow();
  }
  return st.state === 'ok';
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
    await dbClear('records');
    var recipes = await dbAll('recipes');
    for (var i = 0; i < recipes.length; i++) {
      if (recipes[i].origin === 'own' || recipes[i].origin === 'claude') {
        await dbDel('recipes', recipes[i].id);
      }
    }
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
  await saveMeta();
  syncShow();
}
