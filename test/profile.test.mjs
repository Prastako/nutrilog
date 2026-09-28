// TZ must be set before any Date is created.
process.env.TZ = 'Europe/Prague';

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/* Load src/ files in a vm context with a fake DOM for render testing  */
/* ------------------------------------------------------------------ */

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreSrc = readFileSync(resolve(__dirname, '../src/core.js'), 'utf8');

const els = {};
const el = (id) => els[id] || (els[id] = { innerHTML: '', textContent: '' });

const ctx = createContext({
  console,
  Intl,
  Date,
  Math,
  JSON,
  String,
  Number,
  Array,
  Object,
  Uint8Array,
  Promise,
  Error,
  isFinite,
  TextEncoder,
  TextDecoder,
  setTimeout,
  clearTimeout,
  btoa(b) { return Buffer.from(b, 'binary').toString('base64'); },
  atob(s) { return Buffer.from(s, 'binary').toString('binary'); },
  document: {
    querySelector: (s) => el(s),
    querySelectorAll: () => [],
    getElementById: (id) => el('#' + id),
  },
  crypto: {
    getRandomValues(buf) {
      for (let i = 0; i < buf.length; i++) buf[i] = i % 256;
    },
  },
  indexedDB: null,
});

runInContext(coreSrc, ctx);

/* --- load remaining source files --- */
const stringsSrc = readFileSync(resolve(__dirname, '../src/strings.js'), 'utf8');
runInContext(stringsSrc, ctx);
const uiSrc = readFileSync(resolve(__dirname, '../src/ui.js'), 'utf8');
runInContext(uiSrc, ctx);
const settingsSrc = readFileSync(resolve(__dirname, '../src/settings.js'), 'utf8');
runInContext(settingsSrc, ctx);

/* expose helpers */
runInContext(';globalThis.__h = { S, renderProfile, profileMissing, blankProfile, previewParts };', ctx);

const { S, renderProfile, profileMissing, blankProfile, previewParts } = ctx.__h;

describe('Profile screen without sex', () => {
  it('row 1: English render omits sex, includes height and body fat optional', () => {
    S.lang = 'en';
    S.profile = null;
    S.draft = null;
    renderProfile();
    const html = els['#s-profile'].innerHTML;
    assert.ok(!html.includes('person.sex'), 'should not contain person.sex');
    assert.ok(html.includes('>Height</label>') && html.includes('<span class="fhint">cm, optional</span>'), 'should contain Height label');
    assert.ok(html.includes('Body fat % (optional)'), 'should contain Body fat label');
  });

  it('row 2: Czech render shows translated labels', () => {
    S.lang = 'cs';
    S.profile = null;
    S.draft = null;
    renderProfile();
    const html = els['#s-profile'].innerHTML;
    assert.ok(html.includes('>Výška</label>') && html.includes('<span class="fhint">cm, nepovinné</span>'), 'should contain Výška label');
    assert.ok(html.includes('Tělesný tuk % (nepovinné)'), 'should contain Tělesný tuk label');
  });

  it('row 3: periods question appears once after details, skip checked', () => {
    S.lang = 'en';
    S.profile = null;
    S.draft = null;
    renderProfile();
    const html = els['#s-profile'].innerHTML;
    const periodsText = 'Do you have periods?';
    const count = html.split(periodsText).length - 1;
    assert.strictEqual(count, 1, `${periodsText} should appear exactly once`);
    const detailsIdx = html.indexOf('<details');
    const periodsIdx = html.indexOf(periodsText);
    assert.ok(periodsIdx > detailsIdx, `${periodsText} should appear after <details`);
    assert.ok(html.includes('value="skip" checked'), 'skip option should be checked');
  });

  it('row 4: blankProfile defaults', () => {
    const b = blankProfile();
    assert.strictEqual(b.person.periods, 'skip');
    assert.strictEqual(b.person.bodyFatPct, null);
  });

  it('row 5: profileMissing with empty height returns []', () => {
    const d = blankProfile();
    Object.assign(d.person, { age: 30, weightKg: 70, heightCm: '' });
    const missing = profileMissing(d);
    assert.strictEqual(JSON.stringify(missing), '[]');
  });

  it('row 6: profileMissing with empty age returns ["Age"]', () => {
    const d = blankProfile();
    Object.assign(d.person, { age: '', weightKg: 70 });
    const missing = profileMissing(d);
    assert.strictEqual(JSON.stringify(missing), '["Age"]');
  });

  it('row 7: profileMissing bodyFatPct out of range (2 and 61)', () => {
    const d = blankProfile();
    Object.assign(d.person, { age: 30, weightKg: 70, bodyFatPct: 2 });
    let m = profileMissing(d);
    assert.strictEqual(m.length, 1, 'one error for bodyFatPct 2');
    assert.ok(m[0].includes('3 to 60'), 'error contains range hint');

    Object.assign(d.person, { bodyFatPct: 61 });
    m = profileMissing(d);
    assert.strictEqual(m.length, 1, 'one error for bodyFatPct 61');
    assert.ok(m[0].includes('3 to 60'), 'error contains range hint');
  });

  it('row 8: profileMissing with valid bodyFatPct 20 returns []', () => {
    const d = blankProfile();
    Object.assign(d.person, { age: 30, weightKg: 70, bodyFatPct: 20 });
    const missing = profileMissing(d);
    assert.strictEqual(JSON.stringify(missing), '[]');
  });

  it('row 9: previewParts differs with vs without bodyFatPct', () => {
    const d = blankProfile();
    Object.assign(d.person, { age: '30', weightKg: '70', heightCm: '170' });
    const macro1 = previewParts(d).macro;

    Object.assign(d.person, { bodyFatPct: '20' });
    const macro2 = previewParts(d).macro;

    assert.notStrictEqual(macro1, macro2, 'macro should differ with bodyFatPct');
  });
});
