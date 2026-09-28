/* ---------- Ornaments ---------- */

const ORN = {
  hdr: {use: 'hdr-core', vb: '-150 -24 300 48'},
  side: {use: 'side-core', vb: '-10 -136 20 272'},
  rule: {use: 'rule-core', vb: '-70 -10 140 20'},
  corner: {use: 'corner-core', vb: '0 0 20 20'},
  star: {use: 'spark', vb: '-6 -6 12 12'}
};

const LOOK_MINI =
  '<svg class="lk-mini" viewBox="-30 -8 60 16" aria-hidden="true" focusable="false"><use href="#spark" transform="scale(.7)"/><use href="#ringdot" transform="translate(-12,0) scale(.7)"/><use href="#ringdot" transform="translate(12,0) scale(.7)"/><use href="#curl" transform="translate(-16,5) scale(.8)"/><use href="#curl" transform="translate(16,5) scale(-.8,.8)"/></svg>';

function ornSvg(kind, cls) {
  var o = ORN[kind];
  var u = '<use href="#' + o.use + '"/>';
  return '<svg class="ornsvg o-' + kind + (cls ? ' ' + cls : '') + '" viewBox="' + o.vb + '" aria-hidden="true" focusable="false">' +
    '<g class="ca r">' + u + '</g><g class="ca c">' + u + '</g>' + u + '</svg>';
}

function decorateOrnaments(root) {
  var r = root || document;
  var els;
  var i;

  els = r.querySelectorAll('.hdr-orn:empty');
  for (i = 0; i < els.length; i++) els[i].innerHTML = ornSvg('hdr');

  els = r.querySelectorAll('.orn > i:empty');
  for (i = 0; i < els.length; i++) els[i].innerHTML = ornSvg('rule');

  els = r.querySelectorAll('.btn:not(.danger):not(.quiet):not(.ghost)');
  for (i = 0; i < els.length; i++) {
    if (!els[i].querySelector('.o-corner')) {
      els[i].insertAdjacentHTML('beforeend',
        ornSvg('corner', 'tl') + ornSvg('corner', 'tr') +
        ornSvg('corner', 'bl') + ornSvg('corner', 'br'));
    }
  }

  els = r.querySelectorAll('#tabbar .tab .dot:empty');
  for (i = 0; i < els.length; i++) els[i].innerHTML = ornSvg('star');

  els = r.querySelectorAll('.band > .rbar > .rend:empty');
  for (i = 0; i < els.length; i++) els[i].innerHTML = ornSvg('star');

  els = r.querySelectorAll('.looktile');
  for (i = 0; i < els.length; i++) {
    if (!els[i].querySelector('.lk-mini')) {
      els[i].insertAdjacentHTML('afterbegin', LOOK_MINI);
    }
  }
}

function initOrnaments() {
  var m = $('main');
  if (m && !m.querySelector('.orn-cols')) {
    m.insertAdjacentHTML('afterbegin',
      '<div class="orn-cols" aria-hidden="true"><span class="l">' + ornSvg('side') + '</span><span class="r">' + ornSvg('side') + '</span></div>');
  }

  var h = $('.topbar');
  if (h && !h.querySelector('.wm')) {
    h.insertAdjacentHTML('afterbegin',
      '<svg class="wm" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false"><use href="#medal"/></svg>');
  }

  decorateOrnaments(document);

  var pending = false;
  new MutationObserver(function() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function() {
      pending = false;
      decorateOrnaments(document);
    });
  }).observe(document.body, {childList: true, subtree: true});
}
