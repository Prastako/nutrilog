import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { join } from 'node:path';

const ctx = createContext();
runInContext(readFileSync(join(import.meta.dirname, '..', 'src', 'core.js'), 'utf8'), ctx);
runInContext(readFileSync(join(import.meta.dirname, '..', 'src', 'recipeschema.js'), 'utf8'), ctx);
const { resolveRecipe } = ctx;

function recipe(overrides) {
  return Object.assign({
    schema: 1, written: "omnivore", servings: 4,
    ingredients: [
      { slot: "coconut", item: "coconut milk", qty: 400, unit: "ml", grams: 400, scale: "linear" },
      { slot: "eggs", item: "eggs", qty: 2, unit: "", grams: 100, scale: "step", per: 2 },
      { slot: "salt", item: "salt", qty: 1, unit: "", grams: 2, scale: "fixed" }
    ],
    steps: [
      { text: "Pour in {coconut}", uses: [] },
      { text: "Add {eggs}", uses: [] },
      { text: "Season with {salt}", uses: [] }
    ],
    nutrition: { perServing: {}, stated: null }
  }, overrides);
}

test('linear scaling: qty halves at 2 servings', () => {
  var r = resolveRecipe(recipe(), { servings: 2 });
  assert.strictEqual(r.ingredients[0].qty, 200);
  assert.strictEqual(r.ingredients[0].grams, 200);
});

test('step scaling: eggs ceil(5/2)=3, grams 150', () => {
  var r = resolveRecipe(recipe(), { servings: 5 });
  assert.strictEqual(r.ingredients[1].qty, 3);
  assert.strictEqual(r.ingredients[1].grams, 150);
});

test('fixed scaling: salt stays 1', () => {
  var r = resolveRecipe(recipe(), { servings: 6 });
  assert.strictEqual(r.ingredients[2].qty, 1);
});

test('step text: {coconut} renders at 2 servings', () => {
  var r = resolveRecipe(recipe(), { servings: 2 });
  assert.strictEqual(r.steps[0].text, 'Pour in coconut milk, 200 ml');
});

test('flags apply in sorted order, last write wins', () => {
  var r = resolveRecipe(recipe({
    flags: {
      'no:soy': [{ slot: 'coconut', op: 'replace', item: 'no-soy milk', qty: 400, unit: 'ml', grams: 400 }],
      'gluten-free': [{ slot: 'coconut', op: 'replace', item: 'gf milk', qty: 400, unit: 'ml', grams: 400 }]
    }
  }), { flags: ['no:soy', 'gluten-free'] });
  assert.strictEqual(r.ingredients[0].item, 'no-soy milk');
});

test('no personal or session means adjusted false', () => {
  var r = resolveRecipe(recipe());
  assert.strictEqual(r.adjusted, false);
});

test('session override after scaling: rice qty 90 not 45', () => {
  var r = resolveRecipe(recipe({
    ingredients: [
      { slot: "rice", item: "rice", qty: 300, unit: "g", grams: 300, scale: "linear" }
    ],
    steps: [{ text: "Cook {rice}", uses: [] }]
  }), {
    servings: 2,
    session: [{ slot: "rice", op: "amount", qty: 90, unit: "g", grams: 90 }]
  });
  assert.strictEqual(r.ingredients[0].qty, 90);
  assert.strictEqual(r.ingredients[0].grams, 90);
});
