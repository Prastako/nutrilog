// TZ must be set before any Date is created.
process.env.TZ = 'Europe/Prague';

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/* Activity-detail tests: profile screen toggle + kcal estimation      */
/* ------------------------------------------------------------------ */

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  atob(s) { return Buffer.from(s, 'base64').toString('binary'); },
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

runInContext(readFileSync(resolve(__dirname, '../src/strings.js'), 'utf8'), ctx);
runInContext(readFileSync(resolve(__dirname, '../src/core.js'), 'utf8'), ctx);
runInContext(readFileSync(resolve(__dirname, '../src/ui.js'), 'utf8'), ctx);
runInContext(readFileSync(resolve(__dirname, '../src/settings.js'), 'utf8'), ctx);

runInContext('S.prefs.modules = {logging:true, goals:true, supplements:true, assistant:true}; globalThis.__h = { S, renderProfile, profileMissing, blankProfile };', ctx);

const { S, renderProfile, profileMissing, blankProfile } = ctx.__h;

const r3 = { on: true, sessions: '3', minutes: '60', type: 'strength', attendance: 'always' };

describe('activity detail on profile screen', () => {
  it('row 1: default shows switch, not detail fields', () => {
    const d = blankProfile();
    Object.assign(d.person, { age: '30', heightCm: '170', weightKg: '70' });
    Object.assign(d.person.activityDetail, {});
    S.lang = 'en';
    S.profile = null;
    S.draft = d;
    renderProfile();
    const html = els['#s-profile'].innerHTML;
    assert.ok(html.includes('name="person.activityLevel"'), 'has activityLevel');
    assert.ok(html.includes('role="switch"'), 'has switch');
    assert.ok(!html.includes('id="ad-sessions"'), 'no ad-sessions');
  });

  it('row 2: toggle on shows 0 kcal', () => {
    const d = blankProfile();
    Object.assign(d.person, { age: '30', heightCm: '170', weightKg: '70' });
    Object.assign(d.person.activityDetail, { on: true });
    S.lang = 'en';
    S.profile = null;
    S.draft = d;
    renderProfile();
    const html = els['#s-profile'].innerHTML;
    assert.ok(!html.includes('name="person.activityLevel"'), 'no activityLevel');
    assert.ok(html.includes('Training adds about 0 kcal a day on average.'), 'shows 0');
  });

  it('row 3: R3 shows 68 kcal', () => {
    const d = blankProfile();
    Object.assign(d.person, { age: '30', heightCm: '170', weightKg: '70' });
    Object.assign(d.person.activityDetail, r3);
    S.lang = 'en';
    S.profile = null;
    S.draft = d;
    renderProfile();
    const html = els['#s-profile'].innerHTML;
    assert.ok(html.includes('Training adds about 68 kcal a day on average.'), 'shows 68');
  });

  it('row 4: R3 with heavy type shows 135 kcal', () => {
    const detail = { ...r3, type: 'heavy' };
    const d = blankProfile();
    Object.assign(d.person, { age: '30', heightCm: '170', weightKg: '70' });
    Object.assign(d.person.activityDetail, detail);
    S.lang = 'en';
    S.profile = null;
    S.draft = d;
    renderProfile();
    const html = els['#s-profile'].innerHTML;
    assert.ok(html.includes('Training adds about 135 kcal a day on average.'), 'shows 135');
  });

  it('row 5: R3 with sometimes attendance shows 38 kcal', () => {
    const detail = { ...r3, attendance: 'sometimes' };
    const d = blankProfile();
    Object.assign(d.person, { age: '30', heightCm: '170', weightKg: '70' });
    Object.assign(d.person.activityDetail, detail);
    S.lang = 'en';
    S.profile = null;
    S.draft = d;
    renderProfile();
    const html = els['#s-profile'].innerHTML;
    assert.ok(html.includes('Training adds about 38 kcal a day on average.'), 'shows 38');
  });

  it('row 6: climbing usually shows 72 kcal', () => {
    const detail = { on: true, sessions: '2', minutes: '60', type: 'climbing', attendance: 'usually' };
    const d = blankProfile();
    Object.assign(d.person, { age: '30', heightCm: '170', weightKg: '70' });
    Object.assign(d.person.activityDetail, detail);
    S.lang = 'en';
    S.profile = null;
    S.draft = d;
    renderProfile();
    const html = els['#s-profile'].innerHTML;
    assert.ok(html.includes('Training adds about 72 kcal a day on average.'), 'shows 72');
  });

  it('row 7: yoga usually shows 20 kcal', () => {
    const detail = { on: true, sessions: '2', minutes: '60', type: 'yoga', attendance: 'usually' };
    const d = blankProfile();
    Object.assign(d.person, { age: '30', heightCm: '170', weightKg: '70' });
    Object.assign(d.person.activityDetail, detail);
    S.lang = 'en';
    S.profile = null;
    S.draft = d;
    renderProfile();
    const html = els['#s-profile'].innerHTML;
    assert.ok(html.includes('Training adds about 20 kcal a day on average.'), 'shows 20');
  });

  it('row 8: empty weight shows 0 kcal', () => {
    const d = blankProfile();
    Object.assign(d.person, { age: '30', heightCm: '170', weightKg: '' });
    Object.assign(d.person.activityDetail, r3);
    S.lang = 'en';
    S.profile = null;
    S.draft = d;
    renderProfile();
    const html = els['#s-profile'].innerHTML;
    assert.ok(html.includes('Training adds about 0 kcal a day on average.'), 'shows 0');
  });

  it('row 9: sessions 15 reports range error', () => {
    const detail = { ...r3, sessions: '15' };
    const d = blankProfile();
    Object.assign(d.person, { age: '30', heightCm: '170', weightKg: '70' });
    Object.assign(d.person.activityDetail, detail);
    const issues = profileMissing(d);
    assert.equal(issues.length, 1, 'one issue');
    assert.ok(issues[0].includes('0 to 14'), 'contains 0 to 14');
  });

  it('row 10: minutes 5 reports range error', () => {
    const detail = { ...r3, minutes: '5' };
    const d = blankProfile();
    Object.assign(d.person, { age: '30', heightCm: '170', weightKg: '70' });
    Object.assign(d.person.activityDetail, detail);
    const issues = profileMissing(d);
    assert.equal(issues.length, 1, 'one issue');
    assert.ok(issues[0].includes('10 to 240'), 'contains 10 to 240');
  });

  it('row 11: R3 has no issues', () => {
    const d = blankProfile();
    Object.assign(d.person, { age: '30', heightCm: '170', weightKg: '70' });
    Object.assign(d.person.activityDetail, r3);
    const issues = profileMissing(d);
    assert.equal(JSON.stringify(issues), '[]', 'no issues');
  });
});
