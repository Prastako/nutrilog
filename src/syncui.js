/* ---------- Sync UI ---------- */

function syncStateText() {
  if (!S.secrets.sync) return t('sy_off');
  if (S.meta.sync.state == 'offline') return t('sy_offline');
  if (S.meta.sync.state == 'error') return t('sy_err', {msg: S.meta.sync.lastError});
  if (S.meta.sync.state == 'revoked') return t('sy_revoked');
  return t('sy_on', {name: S.meta.sync.name, when: ago(S.meta.sync.lastOkAt)});
}

function catalogStateText() {
  const c = S.meta.catalog;
  if (c.lastError) return t('ct_err', {msg: c.lastError});
  if (c.lastOkAt) return t('ct_line', {n: c.count, when: ago(c.lastOkAt)});
  return t('ct_none');
}

function syncCardInner() {
  const joined = !!S.secrets.sync;
  let h = '<h3>' + esc(t('sy_title')) + '</h3>';
  h += '<p class="tiny" id="syncState">' + esc(syncStateText()) + '</p>';
  if (joined) h += '<p class="tiny" id="catalogState">' + esc(catalogStateText()) + '</p>';
  h += '<p class="tiny">' + esc(t('sy_link_is_key')) + '</p>';
  h += '<div class="btnrow">';
  if (joined) {
    h += '<button class="btn quiet" type="button" data-sync="now">' + esc(t('sy_now')) + '</button>';
  }
  h += '<button class="btn quiet" type="button" data-sync="join">' + esc(t('sy_join')) + '</button>';
  if (joined) {
    h += '<button class="btn quiet" type="button" data-sync="share">' + esc(t('sy_share')) + '</button>';
    h += '<button class="btn quiet" type="button" data-sync="leave">' + esc(t('sy_leave')) + '</button>';
  }
  h += '</div>';
  if (joined) {
    h += '<p class="tiny">' + esc(t('sy_leave_note')) + '</p>';
  }
  h += '<details><summary>' + esc(t('sy_advanced')) + '</summary>' +
    '<div class="field"><label for="syncUrl">' + esc(t('sy_url')) + '</label>' +
    '<input id="syncUrl" type="url" autocapitalize="off" spellcheck="false" ' +
    'data-set="prefs.sync.url" value="' + esc(S.prefs.sync.url || '') + '" ' +
    'placeholder="' + esc(SYNC_URL) + '"></div></details>';
  return h;
}

function syncCardHtml() {
  return '<div class="card" id="syncCard">' + syncCardInner() + '</div>';
}

function renderSyncCard() {
  const el = $('#syncCard');
  if (el) el.innerHTML = syncCardInner();
}

function bindSyncCard() {
  const card = $('#syncCard');
  if (!card) return;
  card.addEventListener('click', async e => {
    const b = e.target.closest('[data-sync]');
    if (!b) return;
    const action = b.getAttribute('data-sync');
    if (action == 'join') openJoinSheet('');
    else if (action == 'leave') await syncLeave();
    else if (action == 'now') await syncRun('now', true);
    else if (action == 'share') await openShareSheet();
  });
}

function openJoinSheet(prefill) {
  const body = '<div class="field"><input id="syncKeyIn" type="text" autocapitalize="off" ' +
    'autocomplete="off" spellcheck="false" placeholder="' + esc(t('sy_join_ph')) + '" ' +
    'value="' + esc(prefill || '') + '"></div>' +
    '<div id="syncJoinOut"></div>';
  const foot = '<button class="btn" type="button" id="syncJoinGo">' + esc(t('confirm')) + '</button>';
  openSheet(esc(t('sy_join')), body, foot);
  $('#syncJoinGo').addEventListener('click', () => {
    const key = syncKeyFromInput($('#syncKeyIn').value);
    if (key) syncCheckKey(key);
  });
}

async function syncCheckKey(key) {
  let user;
  try {
    user = await syncMe(key);
  } catch (err) {
    const out = $('#syncJoinOut');
    if (out) out.innerHTML = '<div class="notice warn">' + esc(t('sy_err', {msg: err.message})) + '</div>';
    return false;
  }
  const note = (S.secrets.sync && S.secrets.sync !== key)
    ? t('sy_join_switch') : t('sy_join_merge');
  closeSheet();
  const foot = '<button class="btn" type="button" id="syncJoinYes">' + esc(t('confirm')) + '</button>' +
    '<button class="btn quiet" type="button" id="syncJoinNo">' + esc(t('cancel')) + '</button>';
  openSheet(esc(t('sy_join_confirm', {name: user.name})), '<p>' + esc(note) + '</p>', foot);
  $('#syncJoinYes').addEventListener('click', async () => {
    closeSheet();
    await syncJoin(key, user);
  });
  $('#syncJoinNo').addEventListener('click', () => {
    closeSheet();
  });
  return true;
}
