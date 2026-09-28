/* ---- submit: send recipes to the shared catalog & list submissions ---- */

const SUBMIT = {list: [], prev: null};

function submitCheck(link, text, online) {
  var l = link.trim();
  var x = text.trim();
  var linkOk = l.startsWith('http://') || l.startsWith('https://');
  var err = '';
  if (!online) err = 'rs_offline';
  else if (l && !linkOk) err = 'rs_bad_link';
  else if (x.length > 20000) err = 'rs_too_long';
  var ok = !err && (linkOk || x.length >= 80);
  return {ok, err};
}

async function submitSend(link, text) {
  var l = link.trim();
  var x = text.trim();
  var body = {
    url: l || null,
    text: x || null
  };
  var status;
  try {
    var res = await fetch(syncBase() + '/v1/submissions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + S.secrets.sync,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    status = res.status;
    if (status >= 200 && status <= 299) {
      var j = await res.json();
      SUBMIT.list.unshift({
        id: j.submission.id,
        createdAt: j.submission.createdAt,
        status: 'pending',
        url: body.url,
        textStart: body.text ? body.text.slice(0, 60) : null,
        title: null,
        recipeId: null,
        reason: null
      });
      return {ok: true, submission: j.submission};
    }
    if (status === 401) {
      S.meta.sync.state = 'revoked';
      await saveMeta();
      syncShow();
      return {ok: false, err: 'sy_revoked'};
    }
    if (status === 429) {
      var j429 = await res.json();
      return {ok: false, err: 'rs_limit', limit: j429.limit};
    }
    return {ok: false, err: 'rs_err', msg: 'HTTP ' + status};
  } catch (e) {
    return {ok: false, err: 'rs_err', msg: e.message};
  }
}

async function submissionsFetch() {
  try {
    var j = await syncFetch('GET', '/v1/submissions');
    var items = (j.items || []).slice(0, 50);
    if (SUBMIT.prev !== null) {
      var anyNew = false;
      for (var i = 0; i < items.length; i++) {
        if ((items[i].status === 'published' || items[i].status === 'merged') &&
            SUBMIT.prev[items[i].id] === 'pending') {
          anyNew = true;
          break;
        }
      }
      if (anyNew) await catalogRun(true);
    }
    SUBMIT.prev = {};
    for (var k = 0; k < items.length; k++) {
      SUBMIT.prev[items[k].id] = items[k].status;
    }
    SUBMIT.list = items;
    return items;
  } catch (e) {
    if (e.status === 401) {
      S.meta.sync.state = 'revoked';
      await saveMeta();
      syncShow();
      return null;
    }
    return null;
  }
}

function submissionLabel(item) {
  if (item.title) return item.title;
  if (item.url) return new URL(item.url).host;
  return (item.textStart || '') + '…';
}

function submissionStatus(item) {
  switch (item.status) {
    case 'pending':
      return t('rs_st_pending');
    case 'published':
      return t('rs_st_published');
    case 'merged':
      return t('rs_st_merged', {title: item.title});
    case 'duplicate':
      return t('rs_st_duplicate', {title: item.title});
    case 'rejected':
      var R = 'rs_r_other';
      if (item.reason === 'not_recipe') R = 'rs_r_not_recipe';
      else if (item.reason === 'unreadable_link') R = 'rs_r_unreadable';
      else if (item.reason === 'invalid') R = 'rs_r_invalid';
      return t('rs_st_rejected', {reason: t(R)});
    default:
      return t('rs_st_pending');
  }
}
