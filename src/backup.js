/* ============================================================
   Export format, backup and restore.
   One shape, versioned (schema 2). Secrets are deliberately left out:
   a token that backs itself up into the repository it writes to is a
   bad idea, and an export file gets shared by accident.
   The archive recipes are not in the backup: they live in the archive
   (Google Drive and the data repository). Your own and Claude recipes are.
   ============================================================ */

const EXPORT_KV_KEYS = ['prefs'];

async function buildPayload(){
  const kv = (await dbAll('kv')).filter(r => EXPORT_KV_KEYS.indexOf(r.key) >= 0);
  const records = await dbAll('records');
  const recipes = (await dbAll('recipes')).filter(r => r.origin === 'claude' || r.origin === 'own').map(r => { const c = Object.assign({}, r); delete c._search; return c; });
  return {
    app: 'nutrilog',
    schema: SCHEMA,
    appVersion: VERSION,
    exportedAt: nowIso(),
    format: 'docs/DATA_FORMAT.md in the nutrilog repository',
    recordTypes: RECORD_TYPES,
    nutrients: NUTRIENTS.map(n => ({key: n.k, infoods: n.tag, unit: n.unit, en: n.en})),
    data: { kv, records, recipes }
  };
}

function payloadIsEmpty(p){
  if (p.schema === 1) return !(p.data.kv || []).some(r => r.key === 'profile' && r.value);
  return !(p.data.records || []).some(r => !r.deleted) && !(p.data.recipes || []).length;
}

function validatePayload(obj){
  if (!obj || obj.app !== 'nutrilog' || !obj.data || !Array.isArray(obj.data.kv)) return {ok:false, why:'file'};
  if (typeof obj.schema !== 'number') return {ok:false, why:'file'};
  if (obj.schema > SCHEMA) return {ok:false, why:'schema', n:obj.schema};
  return {ok:true};
}

async function applyPayload(obj){
  if (obj.schema === 1){
    /* a v0.1 backup: profile and weight history become records */
    await dbClear('records');
    for (const rec of obj.data.kv) if (rec.key === 'prefs') await dbPut('kv', rec);
    const prof = (obj.data.kv.find(r => r.key === 'profile') || {}).value;
    if (prof){
      const r = profileFromV1(prof);
      await recPut(r, {silent:true});
      await kvSet('profile', prof);
    }
    for (const h of (obj.data.profileHistory || [])){
      if (h.weight && h.savedAt) await recPut({type:'body_weight', date: localDateKey(new Date(h.savedAt)), kg: Number(h.weight), source:'profile'}, {silent:true});
    }
  } else {
    await dbClear('records');
    for (const rec of obj.data.kv) await dbPut('kv', rec);
    await dbPutMany('records', obj.data.records || []);
    const own = (await dbAll('recipes')).filter(r => r.origin === 'claude' || r.origin === 'own');
    for (const r of own) await dbDel('recipes', r.id);
    await dbPutMany('recipes', obj.data.recipes || []);
  }
  await loadState();
  await loadRecipes();
  applyTheme(); applyLang();
}

async function writeLocalSnapshot(){
  const payload = await buildPayload();
  if (payloadIsEmpty(payload)) return;
  await dbPut('snapshots', {date: localDateKey(), createdAt: nowIso(), payload});
  const all = await dbAll('snapshots');
  all.sort((a,b) => a.date < b.date ? 1 : -1);
  for (const s of all.slice(7)) await dbDel('snapshots', s.date);
}

async function exportManually(){
  const payload = await buildPayload();
  const text = JSON.stringify(payload, null, 2);
  const name = 'nutrilog-' + localDateKey() + '.json';
  const file = new File([text], name, {type:'application/json'});
  try {
    if (navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title:'NutriLog'});
      return;
    }
  } catch(e){
    if (e && e.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(new Blob([text], {type:'application/json'}));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
}

const GITHUB_API = 'https://api.github.com';
const BACKUP_LATEST = 'latest.json';
const BACKUP_SNAPDIR = 'snapshots/';

function parseRepo(){
  const raw = (S.prefs.backup.repo || '').trim().replace(/^https?:\/\/github\.com\//,'').replace(/\.git$/,'').replace(/\/$/,'');
  const bits = raw.split('/');
  if (bits.length !== 2 || !bits[0] || !bits[1]) return null;
  return {owner: bits[0], repo: bits[1], full: bits[0]+'/'+bits[1]};
}

async function ghFetch(path, init){
  const res = await fetch(GITHUB_API + path, Object.assign({}, init, {
    headers: Object.assign({
      'Authorization': 'Bearer ' + S.secrets.github,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }, (init && init.headers) || {})
  }));
  let body = null;
  const txt = await res.text();
  try { body = txt ? JSON.parse(txt) : null; } catch(e){ body = {raw: txt}; }
  return {res, body, txt};
}

function ghErrorText(r){
  const msg = (r.body && (r.body.message || r.body.raw)) || r.txt || '';
  return r.res.status + ' ' + r.res.statusText + (msg ? ': ' + String(msg).slice(0,400) : '');
}

const BACKUP_TARGETS = {
  github: {
    id: 'github',
    label: 'GitHub',
    configured(){ return !!(S.secrets.github && parseRepo()); },
    describe(){ const r = parseRepo(); return r ? 'GitHub: ' + r.full : t('b_target_none'); },
    async getFile(path){
      const r = parseRepo();
      const q = '?ref=' + encodeURIComponent(S.prefs.backup.branch || 'main');
      const out = await ghFetch('/repos/'+r.owner+'/'+r.repo+'/contents/'+path+q);
      if (out.res.status === 404) return null;
      if (!out.res.ok) throw new Error(ghErrorText(out));
      return {sha: out.body.sha, text: out.body.content ? b64decode(out.body.content) : ''};
    },
    async putFile(path, text, message){
      const r = parseRepo();
      const url = '/repos/'+r.owner+'/'+r.repo+'/contents/'+path;
      const send = async (sha) => ghFetch(url, {
        method:'PUT',
        headers:{'content-type':'application/json'},
        body: JSON.stringify({
          message: message,
          content: b64encode(text),
          branch: S.prefs.backup.branch || 'main',
          sha: sha || undefined
        })
      });
      let existing = null;
      try { existing = await this.getFile(path); } catch(e){ existing = null; }
      let out = await send(existing ? existing.sha : null);
      /* 409 and 422 mean the file moved under us. Re-read and try once more,
         rather than giving up or overwriting blind. */
      if (out.res.status === 409 || out.res.status === 422){
        const again = await this.getFile(path);
        out = await send(again ? again.sha : null);
      }
      if (!out.res.ok) throw new Error(ghErrorText(out));
      return true;
    },
    async deleteFile(path){
      const r = parseRepo();
      const cur = await this.getFile(path);
      if (!cur) return true;
      const out = await ghFetch('/repos/'+r.owner+'/'+r.repo+'/contents/'+path, {
        method:'DELETE',
        headers:{'content-type':'application/json'},
        body: JSON.stringify({message:'NutriLog: remove write test', sha: cur.sha, branch: S.prefs.backup.branch || 'main'})
      });
      if (!out.res.ok) throw new Error(ghErrorText(out));
      return true;
    }
  }
};

function backupTarget(){ return BACKUP_TARGETS[S.prefs.backup.target] || BACKUP_TARGETS.github; }
function backupConfigured(){ return backupTarget().configured(); }

let backupTimer = null;
let backupAttempt = 0;

function scheduleBackup(reason){
  if (!backupConfigured()) { renderBackupBar(); return; }
  if (backupTimer) clearTimeout(backupTimer);
  S.meta.backup.state = 'pending';
  renderBackupBar(); renderBackupPanel();
  backupTimer = setTimeout(() => { backupTimer = null; runBackup(reason); }, 45000);
}

async function runBackup(reason, opts){
  opts = opts || {};
  if (!backupConfigured()){ renderBackupBar(); return {ok:false, why:'unconfigured'}; }
  const payload = await buildPayload();
  if (payloadIsEmpty(payload)){
    S.meta.backup.state = 'empty'; await saveMeta();
    renderBackupBar(); renderBackupPanel();
    return {ok:false, why:'empty'};
  }
  const hash = hashString(JSON.stringify(payload.data));
  if (hash === S.meta.backup.lastHash && S.meta.backup.lastVerifiedAt && !opts.force){
    S.meta.backup.lastVerifiedAt = new Date().toISOString();
    S.meta.backup.state = 'idle';
    await saveMeta(); renderBackupBar(); renderBackupPanel();
    return {ok:true, same:true};
  }
  if (!navigator.onLine){
    S.meta.backup.state = 'offline'; await saveMeta();
    renderBackupBar(); renderBackupPanel();
    return {ok:false, why:'offline'};
  }

  S.meta.backup.state = 'running';
  renderBackupBar(); renderBackupPanel();
  const text = JSON.stringify(payload, null, 2);
  const today = localDateKey();
  try {
    await backupTarget().putFile(BACKUP_LATEST, text, 'NutriLog backup ' + new Date().toISOString() + ' (' + (reason||'') + ')');
    if (S.meta.backup.lastSnapshotDate !== today){
      await backupTarget().putFile(BACKUP_SNAPDIR + today + '.json', text, 'NutriLog snapshot ' + today);
      S.meta.backup.lastSnapshotDate = today;
    }
    const now = new Date().toISOString();
    S.meta.backup.lastUploadAt = now;
    S.meta.backup.lastVerifiedAt = now;
    S.meta.backup.lastHash = hash;
    S.meta.backup.lastError = null;
    S.meta.backup.lastErrorAt = null;
    S.meta.backup.state = 'idle';
    backupAttempt = 0;
    await saveMeta(); renderBackupBar(); renderBackupPanel();
    return {ok:true};
  } catch(err){
    S.meta.backup.state = 'error';
    S.meta.backup.lastError = String(err && err.message ? err.message : err);
    S.meta.backup.lastErrorAt = new Date().toISOString();
    await saveMeta(); renderBackupBar(); renderBackupPanel();
    backupAttempt++;
    const wait = [120000, 600000, 1800000][Math.min(backupAttempt-1, 2)];
    if (backupTimer) clearTimeout(backupTimer);
    backupTimer = setTimeout(() => { backupTimer = null; runBackup('retry'); }, wait);
    return {ok:false, why:'error', error: S.meta.backup.lastError};
  }
}

function backupHoursStale(){
  if (!S.meta.backup.lastVerifiedAt) return Infinity;
  return (Date.now() - new Date(S.meta.backup.lastVerifiedAt).getTime()) / 3600000;
}

function renderBackupBar(){
  const bar = $('#backupBar');
  const b = S.meta.backup;
  const hasData = !!S.profile;
  let cls = 'bar', html = '';
  if (!backupConfigured()){
    if (hasData) cls += ' bad';
    html = '<div>' + esc(hasData ? t('bar_unconf_data') : t('bar_unconf_new')) + '</div>' +
      '<div class="btnrow"><button class="btn quiet" type="button" data-act="go-settings">'+esc(t('bar_setup'))+'</button>' +
      (hasData ? '<button class="btn quiet" type="button" data-act="export">'+esc(t('bar_export'))+'</button>' : '') + '</div>';
  } else if (backupHoursStale() > 48){
    cls += ' bad';
    const h = isFinite(backupHoursStale()) ? Math.floor(backupHoursStale()) : null;
    html = '<div>' + esc(h === null ? t('bar_unconf_data') : t('bar_stale', {h: h})) + '</div>' +
      (b.lastError ? '<div class="verbatim">'+esc(b.lastError)+'</div>' : '') +
      '<div class="btnrow"><button class="btn quiet" type="button" data-act="backup-now">'+esc(t('b_run_now'))+'</button>' +
      '<button class="btn quiet" type="button" data-act="export">'+esc(t('bar_export'))+'</button></div>';
  }
  bar.className = cls + (html ? '' : ' hide');
  bar.innerHTML = html;
}

/* ============================================================
   17. Restore paths
   ============================================================ */

async function restoreFromPayload(obj, sourceLabel){
  const v = validatePayload(obj);
  if (!v.ok){
    toast(v.why === 'schema' ? t('import_bad_schema', {n: v.n}) : t('import_bad_file'), 6000);
    return false;
  }
  const okToGo = await confirmSheet(sourceLabel,
    '<div class="notice warn">'+esc(t('b_restore_warn'))+'</div>' +
    '<p class="tiny">'+esc(t('b_secrets_note'))+'</p>', t('confirm'), true);
  if (!okToGo){ toast(t('cancelled')); return false; }
  await applyPayload(obj);
  toast(t('restore_ok'));
  go('today');
  return true;
}

async function restoreFromCloud(){
  if (!backupConfigured()){ toast(t('b_target_none')); return; }
  try {
    const f = await backupTarget().getFile(BACKUP_LATEST);
    if (!f){ toast(t('backup_empty')); return; }
    await restoreFromPayload(JSON.parse(f.text), t('b_restore_cloud'));
  } catch(err){ toast(t('err_prefix')+': '+String(err.message||err), 6000); }
}

async function eraseEverything(){
  const word = ($('#eraseWord')||{}).value || '';
  if (word.trim().toUpperCase() !== t('danger_word')){
    toast(t('danger_type', {word: t('danger_word')}));
    return;
  }
  const ok = await confirmSheet(t('danger_btn'), '<p class="muted">'+esc(t('danger_p'))+'</p>', t('danger_btn'), true);
  if (!ok){ toast(t('cancelled')); return; }
  await dbClear('kv'); await dbClear('secrets');
  await dbClear('profileHistory'); await dbClear('snapshots');
  await dbClear('records'); await dbClear('recipes'); await dbClear('media');
  toast(t('danger_done'));
  setTimeout(() => { location.hash = '#today'; location.reload(); }, 900);
}

