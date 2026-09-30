/* ---------- Sync UI ---------- */

function syncStateText() {
  if (!S.secrets.sync) return t('sy_off');
  if (S.meta.sync.state == 'offline') return t('sy_offline');
  if (S.meta.sync.state == 'error') return t('sy_err', {msg: S.meta.sync.lastError});
  if (S.meta.sync.state == 'revoked') return t('sy_revoked');
  return t('sy_on', {name: S.meta.sync.name, when: fmtDateTime(S.meta.sync.lastOkAt)});
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
  if (typeof backupLine === 'function') h += backupLine();
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
    h += '<div class="field" style="margin-top:10px"><label for="syncNameSet">' + esc(t('au_name_label')) + '</label>' +
      '<input id="syncNameSet" type="text" autocomplete="off" value="' + esc(S.meta.sync.name || '') + '"></div>' +
      '<div class="btnrow"><button class="btn quiet" type="button" data-sync="name">' + esc(t('save')) + '</button></div>';
    h += '<p class="tiny">' + esc(t('sy_leave_note')) + '</p>';
    h += submitListHtml();
  }
  h += '<details><summary>' + esc(t('sy_advanced')) + '</summary>' +
    '<div class="field"><label for="syncUrl">' + esc(t('sy_url')) + '</label>' +
    '<input id="syncUrl" type="url" autocapitalize="off" spellcheck="false" ' +
    'data-set="prefs.sync.url" value="' + esc(S.prefs.sync.url || '') + '" ' +
    'placeholder="' + esc(SYNC_URL) + '"></div></details>';
  return h;
}

function syncCardHtml() {
  if (typeof ownDataRefresh === 'function') ownDataRefresh().then(changed => { if (changed) renderSyncCard(); }).catch(() => {});
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
    else if (action == 'now') { await syncRun('now', true); await submissionsFetch(); renderSyncCard(); }
    else if (action == 'share') await openShareSheet();
    else if (action == 'submit') openSubmitSheet();
    else if (action == 'name') await syncSaveName();
  });
  if (S.secrets.sync) submissionsFetch().then(renderSyncCard);
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
  openSheet(esc(t('sy_join_confirm', {name: user.name})), '<p>' + esc(note) + '</p>' +
    '<div class="field" style="margin-top:12px"><label for="syncName">' + esc(t('au_name_label')) + '</label>' +
    '<input id="syncName" type="text" autocomplete="off" value="' + esc(user.name || '') + '"></div><p class="tiny" id="syncNameErr"></p>', foot);
  $('#syncJoinYes').addEventListener('click', async () => {
    const nm = String(($('#syncName') || {}).value || '').trim();
    if (!syncNameOk(nm)) { const er = $('#syncNameErr'); if (er) er.textContent = t('au_name_err'); return; }
    closeSheet();
    let u = user;
    if (nm !== (user.name || '')) { try { u = (await syncPutName(nm, key)) || Object.assign({}, user, {name: nm}); } catch (err) { u = user; } }
    await syncJoin(key, u);
  });
  $('#syncJoinNo').addEventListener('click', () => {
    closeSheet();
  });
  return true;
}

/* ---------- Submit list ---------- */

function submitListHtml() {
  var rows = '';
  if (!SUBMIT.list || SUBMIT.list.length == 0) {
    rows = '<p class="tiny">' + esc(t('rs_list_empty')) + '</p>';
  } else {
    var items = SUBMIT.list.slice(0, 50);
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var canOpen = item.recipeId &&
        (item.status == 'published' || item.status == 'merged' || item.status == 'duplicate') &&
        typeof RECIPES !== 'undefined' && RECIPES.list &&
        RECIPES.list.some(function(r) { return r.id == item.recipeId && r.origin == 'catalog'; });
      var date = numDate(new Date(item.createdAt), true);
      var label = esc(submissionLabel(item));
      var status = esc(date + ' · ' + submissionStatus(item));
      if (canOpen) {
        rows += '<button class="entry" type="button" data-act="open-recipe" data-id="' + esc(item.recipeId) + '">';
      } else {
        rows += '<div class="entry">';
      }
      rows += '<span class="en">' + label + '</span><span class="em tiny">' + status + '</span>';
      rows += canOpen ? '</button>' : '</div>';
    }
  }
  return '<div class="submits"><div class="btnrow"><button class="btn quiet" type="button" data-sync="submit">' + esc(t('rs_add')) + '</button></div><h4>' + esc(t('rs_list_h')) + '</h4>' + rows + '</div>';
}

/* ---------- Submit sheet ---------- */

function submitSheetState(link, text, online) {
  var c = submitCheck(link, text, online);
  return {disabled: !c.ok, msg: c.err ? t(c.err) : ''};
}

function submitSheetUpdate() {
  var s = submitSheetState($('#rsLink').value, $('#rsText').value, navigator.onLine !== false);
  $('#rsSend').disabled = s.disabled;
  $('#rsMsg').textContent = s.msg;
}

function openSubmitSheet() {
  var body = '<div class="field"><label for="rsLink">' + esc(t('rs_link')) + '</label><input id="rsLink" type="url" inputmode="url" autocapitalize="off" spellcheck="false"></div>' +
    '<div class="field"><label for="rsText">' + esc(t('rs_text')) + '</label><textarea id="rsText" rows="8" placeholder="' + esc(t('rs_text_ph')) + '"></textarea></div>' +
    '<p class="tiny">' + esc(t('rs_help')) + '</p><p class="tiny" id="rsMsg"></p>';
  var foot = '<button class="btn" type="button" id="rsSend" disabled>' + esc(t('rs_send')) + '</button>';
  openSheet(esc(t('rs_title')), body, foot);
  $('#rsLink').addEventListener('input', submitSheetUpdate);
  $('#rsText').addEventListener('input', submitSheetUpdate);
  $('#rsSend').addEventListener('click', submitSheetSend);
  submitSheetUpdate();
}

async function submitSheetSend() {
  var r = await submitSend($('#rsLink').value, $('#rsText').value);
  if (r.ok) {
    closeSheet();
    toast(t('rs_sent'));
    renderSyncCard();
  } else if (r.err == 'rs_limit') {
    $('#rsMsg').textContent = t('rs_limit', {n: r.limit});
  } else if (r.err == 'rs_err') {
    $('#rsMsg').textContent = t('rs_err', {msg: r.msg});
  } else if (r.err == 'sy_revoked') {
    closeSheet();
    renderSyncCard();
  }
}
/* Sync and friends: save the name others see (brief author). */
async function syncSaveName() {
  const nm = String(($('#syncNameSet') || {}).value || '').trim();
  if (!syncNameOk(nm)) { toast(t('au_name_err')); return; }
  if (navigator.onLine === false) { toast(t('au_offline')); return; }
  try {
    const u = await syncPutName(nm);
    S.meta.sync.name = (u && u.name) || nm;
    await saveMeta();
    toast(t('sg_saved'));
  } catch (err) {
    toast(err && err.status ? t('sy_err', {msg: err.message}) : t('au_offline'));
  }
}
