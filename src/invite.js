/* ---------- invite links ---------- */

function syncJoinLink() {
  return location.origin + location.pathname + '#join=' + S.secrets.sync;
}

async function syncHandleJoinLink(key) {
  if (!key) return;
  if (key === S.secrets.sync) {
    toast(t('sy_already'));
    return;
  }
  if (S.sheetOpen) {
    S.afterSheet = () => syncHandleJoinLink(key);
    return;
  }
  openJoinSheet(key);
  await syncCheckKey(key);
}

async function openShareSheet() {
  var link = syncJoinLink();
  var body = '<div id="syncQr"></div><p class="verbatim" id="syncLink">' + esc(link) + '</p><p class="tiny">' + esc(t('sy_share_note')) + '</p>';
  var foot = '<button class="btn" type="button" id="syncCopy">' + esc(t('copy')) + '</button>';
  openSheet(esc(t('sy_share')), body, foot);

  var copyBtn = $('#syncCopy');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(link);
        toast(t('copied'));
      } catch (_) {
        toast(link, 6000);
      }
    });
  }

  try {
    var res = await fetch(syncBase() + '/v1/me/qr', {
      headers: {'Authorization': 'Bearer ' + S.secrets.sync}
    });
    if (!res.ok) return;
    var url = URL.createObjectURL(await res.blob());
    var qrDiv = $('#syncQr');
    if (qrDiv) {
      qrDiv.innerHTML = '<img src="' + esc(url) + '" alt="" width="220" height="220">';
    }
  } catch (_) {
    // ignore all errors for QR
  }
}
