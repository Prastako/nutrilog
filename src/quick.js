/* ---------- quick mode ---------- */

function quickOn() {
  return S.prefs.quickMode === 'on';
}

async function setQuickMode(on) {
  S.prefs.quickMode = on ? 'on' : 'off';
  S.prefs.quickModeAsked = true;
  await savePrefs();
  go(on ? 'quick' : 'today');
}

function maybeOfferQuick() {
  if (S.prefs.quickModeAsked || quickOn() || window.innerWidth >= 340) return;
  var foot = '<button class="btn" type="button" id="qmYes">' + esc(t('qm_offer_yes')) + '</button>'
    + '<button class="btn quiet" type="button" id="qmNo">' + esc(t('qm_offer_no')) + '</button>';
  openSheet(esc(t('qm_title')), '<p>' + esc(t('qm_offer')) + '</p>', foot);
  $('#qmYes').addEventListener('click', function () {
    S.afterSheet = function () { return setQuickMode(true); };
    closeSheet();
  });
  $('#qmNo').addEventListener('click', async function () {
    S.prefs.quickMode = 'off';
    S.prefs.quickModeAsked = true;
    await savePrefs();
    closeSheet();
  });
}

async function renderQuick() {
  var host = $('#s-quick');
  var today = localDateKey();
  var d = await dayTotals(today);
  var g = computeTargets(S.profile);
  var yest = await recByTypeDate('food_entry', addDays(today, -1), addDays(today, -1));
  var kcal = Math.round(d.total.kcal || 0);
  var h = '';
  h += '<p class="qm-energy num">'
    + esc(g ? t('qm_energy', {kcal: fmtNum(kcal), lo: fmtNum(Math.round(g.low)), hi: fmtNum(Math.round(g.high))}) : fmtNum(kcal) + ' kcal')
    + '</p>';
  for (var si = 0; si < SLOTS.length; si++) {
    var s = SLOTS[si];
    var list = d.entries.filter(function (e) { return e.slot === s; });
    var sk = Math.round(d.bySlot[s] && d.bySlot[s].kcal ? d.bySlot[s].kcal : 0);
    h += '<button class="rowbtn qm-slot" type="button" data-act="add-food" data-slot="' + s
      + '"><span class="k">' + esc(t('slot_' + s)) + '</span>'
      + '<span class="v num">' + list.length + ' · ' + esc(fmtNum(sk)) + ' kcal</span></button>';
    for (var ei = 0; ei < list.length; ei++) {
      var e = list[ei];
      var ekcal = Math.round(e.nutrients.kcal || 0);
      h += '<div class="qm-entry"><span class="en">' + esc(entryName(e))
        + ' <span class="tiny num">' + esc(fmtNum(ekcal)) + ' kcal</span></span>'
        + '<button class="iconbtn sm" type="button" data-qdel="' + esc(e.id)
        + '" aria-label="' + esc(t('p_remove')) + '">' + icon('trash') + '</button></div>';
    }
    if (list.length === 0 && yest.some(function (ye) { return ye.slot === s; })) {
      h += '<button class="btn quiet qm-same" type="button" data-qsame="' + s
        + '">' + esc(t('qm_same')) + '</button>';
    }
  }
  h += '<div id="quickSupps"></div>';
  h += '<button class="btn quiet qm-full" type="button" data-qfull="1">' + esc(t('qm_full')) + '</button>';
  host.innerHTML = h;
  await renderSuppChecklist($('#quickSupps'), today);
  if (!S.sheetOpen && (!document.activeElement || document.activeElement === document.body)) {
    var firstSlot = $('#s-quick [data-slot="breakfast"]');
    if (firstSlot) firstSlot.focus();
  }
}

async function quickCopySlot(slot) {
  var today = localDateKey();
  var yest = await recByTypeDate('food_entry', addDays(today, -1), addDays(today, -1));
  for (var i = 0; i < yest.length; i++) {
    var entry = yest[i];
    if (entry.slot !== slot) continue;
    var c = deepCopy(entry);
    delete c.id;
    delete c.createdAt;
    c.date = today;
    await recPut(c);
  }
  await renderQuick();
}

function bindQuick() {
  var host = $('#s-quick');
  if (!host) return;
  host.addEventListener('click', async function (e) {
    var b = e.target.closest('[data-qdel]');
    if (b) {
      await recDelete(b.getAttribute('data-qdel'));
      toast(t('lg_deleted'));
      await renderQuick();
      return;
    }
    b = e.target.closest('[data-qsame]');
    if (b) {
      await quickCopySlot(b.getAttribute('data-qsame'));
      return;
    }
    if (e.target.closest('[data-qfull]')) {
      await setQuickMode(false);
    }
  });
}
