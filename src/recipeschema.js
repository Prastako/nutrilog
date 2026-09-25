// src/recipeschema.js

var ALLERGEN_KEYS = [
  'gluten', 'crustacean', 'egg', 'fish', 'peanut', 'soy', 'milk', 'treenut',
  'celery', 'mustard', 'sesame', 'sulphite', 'lupin', 'mollusc'
];

function upgradeRecipe(r) {
  var out = deepCopy(r) || {};
  out.schema = 2;
  if (!Array.isArray(out.ingredients)) out.ingredients = [];
  if (!Array.isArray(out.steps)) out.steps = [];
  if (!out.written) out.written = "omnivore";

  for (var i = 0; i < out.ingredients.length; i++) {
    var ing = out.ingredients[i];
    if (!ing.slot) ing.slot = "i" + i;
    if (!ing.role) ing.role = "other";
    if (!ing.scale) ing.scale = "linear";
  }

  for (var j = 0; j < out.steps.length; j++) {
    if (!out.steps[j].uses) out.steps[j].uses = [];
  }

  if (!out.storage) out.storage = {};
  if (out.storage.freezerMonths === undefined) out.storage.freezerMonths = null;
  if (out.storage.batchServings === undefined) out.storage.batchServings = null;
  if (out.storage.fresh === undefined) out.storage.fresh = [];

  if (!out.variants) out.variants = {};
  if (!out.flags) out.flags = {};

  return out;
}

function roundAmount(v) {
  if (Math.abs(v) < 10) return Math.round(v * 10) / 10;
  return Math.round(v);
}

function formatQty(v) {
  return String(roundAmount(v));
}

function applyOverrides(ingredients, steps, overrides) {
  var ings = deepCopy(ingredients);
  for (var o = 0; o < overrides.length; o++) {
    var ov = overrides[o];
    var idx = -1;
    for (var k = 0; k < ings.length; k++) {
      if (ings[k].slot === ov.slot) { idx = k; break; }
    }

    if (ov.op === "replace" && idx >= 0) {
      var ng = deepCopy(ings[idx]);
      ng.item = ov.item;
      ng.qty = ov.qty;
      ng.unit = ov.unit;
      ng.grams = ov.grams;
      ng.foodRef = ov.foodRef;
      ng.allergens = ov.allergens;
      ng.prep = ov.prep;
      ng.note = ov.note;
      ings[idx] = ng;
    } else if (ov.op === "remove" && idx >= 0) {
      ings.splice(idx, 1);
    } else if (ov.op === "add" && idx < 0) {
      ings.push({
        slot: ov.slot,
        role: ov.role || "other",
        scale: ov.scale || "linear",
        item: ov.item,
        qty: ov.qty,
        unit: ov.unit,
        grams: ov.grams,
        foodRef: ov.foodRef,
        allergens: ov.allergens,
        prep: ov.prep,
        note: ov.note
      });
      if (ov.per !== undefined) ings[ings.length - 1].per = ov.per;
    } else if (ov.op === "amount" && idx >= 0) {
      var c = deepCopy(ings[idx]);
      if (typeof ov.qty === 'number') c.qty = ov.qty;
      if (ov.unit !== undefined) c.unit = ov.unit;
      if (typeof ov.grams === 'number') c.grams = ov.grams;
      ings[idx] = c;
    }

    if (ov.steps) {
      for (var si in ov.steps) {
        if (steps[si]) steps[si].text = ov.steps[si];
      }
    }
  }
  return ings;
}

function resolveRecipe(recipe, opts) {
  opts = opts || {};
  var r = upgradeRecipe(recipe);
  var axis = opts.axis || r.written;
  var flags = opts.flags || [];
  var servings = opts.servings;
  var personal = opts.personal || [];
  var session = opts.session || [];
  var foods = opts.foods;

  var ingredients = deepCopy(r.ingredients);
  var steps = deepCopy(r.steps);

  // Variant overrides
  if (axis !== r.written && r.variants[axis]) {
    ingredients = applyOverrides(ingredients, steps, r.variants[axis]);
  }

  // Flag overrides in sorted order: gluten-free first, lactose-free second, rest alphabetical
  var sortedFlags = flags.filter(function(f) { return r.flags[f]; }).slice().sort(function(a, b) {
    if (a === 'gluten-free') return -1;
    if (b === 'gluten-free') return 1;
    if (a === 'lactose-free') return -1;
    if (b === 'lactose-free') return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  for (var fi = 0; fi < sortedFlags.length; fi++) {
    ingredients = applyOverrides(ingredients, steps, r.flags[sortedFlags[fi]]);
  }

  // Servings scaling
  var base = r.servings || 1;
  var srv = servings || base;
  var factor = srv / base;

  if (factor !== 1) {
    for (var i = 0; i < ingredients.length; i++) {
      var ing = ingredients[i];
      if (ing.scale === "linear") {
        ing.qty = roundAmount(ing.qty * factor);
        ing.grams = roundAmount(ing.grams * factor);
      } else if (ing.scale === "step") {
        var per = ing.per || 1;
        var oldQty = ing.qty;
        ing.qty = Math.ceil(srv / per);
        if (oldQty) ing.grams = roundAmount(ing.grams / oldQty * ing.qty);
      }
    }
  }

  // Personal overrides (after scaling, never scaled)
  if (personal.length) {
    ingredients = applyOverrides(ingredients, steps, personal);
  }

  // Session overrides (after personal, never scaled)
  if (session.length) {
    ingredients = applyOverrides(ingredients, steps, session);
  }

  // Render step text
  var ingMap = {};
  for (var m = 0; m < ingredients.length; m++) {
    ingMap[ingredients[m].slot] = ingredients[m];
  }

  var renderedSteps = [];
  for (var s = 0; s < steps.length; s++) {
    var step = deepCopy(steps[s]);
    step.text = step.text.replace(/\{([A-Za-z0-9_-]+)\}/g, function(_, slot) {
      var ig = ingMap[slot];
      if (!ig) return '';
      if (ig.scale === 'fixed' || ig.role === 'season' || ig.qty == null) {
        return ig.item;
      }
      return ig.item + ', ' + formatQty(ig.qty) + ' ' + ig.unit;
    });
    renderedSteps.push(step);
  }

  // Allergens
  var allergenSet = {};
  var hasUnknown = false;
  for (var a = 0; a < ingredients.length; a++) {
    var ing2 = ingredients[a];
    if (Array.isArray(ing2.allergens)) {
      for (var ak = 0; ak < ALLERGEN_KEYS.length; ak++) {
        if (ing2.allergens.indexOf(ALLERGEN_KEYS[ak]) >= 0) {
          allergenSet[ALLERGEN_KEYS[ak]] = true;
        }
      }
    } else {
      hasUnknown = true;
    }
  }
  var allergens = [];
  for (var ai = 0; ai < ALLERGEN_KEYS.length; ai++) {
    if (allergenSet[ALLERGEN_KEYS[ai]]) allergens.push(ALLERGEN_KEYS[ai]);
  }
  if (hasUnknown) allergens.push("unknown");

  // Nutrition
  var hasData = false;
  var total = {};
  var dataGrams = 0;
  var allGrams = 0;

  if (foods) {
    for (var n = 0; n < ingredients.length; n++) {
      var ig3 = ingredients[n];
      if (ig3.grams > 0) {
        allGrams += ig3.grams;
        var fd = foods[ig3.foodRef];
        if (fd && fd.per100) {
          hasData = true;
          dataGrams += ig3.grams;
          nutAdd(total, fd.per100, ig3.grams / 100);
        }
      }
    }
  }

  var nutrition;
  if (!hasData) {
    nutrition = {
      perServing: r.nutrition && r.nutrition.perServing ? r.nutrition.perServing : null,
      basis: "stored",
      coverage: 0,
      stated: r.nutrition && r.nutrition.stated ? r.nutrition.stated : null
    };
  } else {
    var coverage = allGrams > 0 ? Math.round(dataGrams / allGrams * 1000) / 1000 : 0;
    nutrition = {
      perServing: nutRound(nutScale(total, 1 / srv)),
      basis: coverage >= 1 ? "computed" : "estimated",
      coverage: coverage,
      stated: r.nutrition && r.nutrition.stated ? r.nutrition.stated : null
    };
  }

  return {
    ingredients: ingredients,
    steps: renderedSteps,
    allergens: allergens,
    nutrition: nutrition,
    servings: srv,
    adjusted: personal.length > 0 || session.length > 0
  };
}
