/* ---- catalog ---- */

const CATALOG_MAX_AGE_MS = 6 * 3600 * 1000;

function catalogDue() {
  return !S.meta.catalog.lastOkAt || Date.now() - isoMs(S.meta.catalog.lastOkAt) >= CATALOG_MAX_AGE_MS;
}

async function catalogRun(force) {
  if (force || catalogDue()) {
    return await catalogPull();
  }
  return false;
}

async function catalogPull() {
  if (!S.secrets.sync || S.meta.sync.state === 'revoked' || navigator.onLine === false) {
    return false;
  }

  try {
    var cursor = S.meta.catalog.cursor;

    while (true) {
      var j = await syncFetch('GET', '/v1/catalog?after=' + cursor);

      for (var i = 0; i < j.items.length; i++) {
        var item = j.items[i];
        if (item.deleted) {
          var r = await dbGet('recipes', item.id);
          if (r && r.origin === 'catalog') {
            await dbDel('recipes', item.id);
          }
        } else {
          var existing = await dbGet('recipes', item.id);
          if (!existing || existing.origin === 'catalog') {
            var rec = Object.assign({}, item.body);
            rec.id = item.id;
            rec.origin = 'catalog';
            await dbPut('recipes', rec);
          }
        }
      }

      S.meta.catalog.cursor = j.seq;
      await saveMeta();

      if (!j.more) break;
      cursor = j.seq;
    }

    S.meta.catalog.lastOkAt = nowIso();
    var all = await dbAll('recipes');
    S.meta.catalog.count = 0;
    for (var k = 0; k < all.length; k++) {
      if (all[k].origin === 'catalog') S.meta.catalog.count++;
    }
    S.meta.catalog.lastError = '';
    await saveMeta();
    if (typeof loadRecipes === 'function') loadRecipes();
    return true;
  } catch (err) {
    if (err.status === 401) {
      throw err;
    }
    S.meta.catalog.lastError = String(err.message);
    await saveMeta();
    return false;
  }
}
