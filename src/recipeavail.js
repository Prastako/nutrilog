// recipeavail.js — recipe availability per profile, categories, and food lookup

/* ------------------------------------------------------------------ */
/* profileAxisFlags                                                     */
/* ------------------------------------------------------------------ */

var FULL_MEAL = { prot: 25, fib: 7, kcalMin: 400, kcalMax: 800 };

function profileAxisFlags(profile) {
  var F = profile && profile.food || {};

  // Axis
  var pat = F.pattern;
  if (pat === "pescatarian" || pat === "vegetarian" || pat === "vegan") {
    var axis = pat;
  } else {
    axis = "omnivore";
  }

  // Flags — use a set to deduplicate
  var seen = {};
  var flags = [];

  // --- gluten-free ---
  if (!seen["gluten-free"]) {
    var hasGluten = false;
    var conditions = F.conditions;
    var prefs = F.prefs;
    if (conditions && conditions.indexOf("coeliac") !== -1) hasGluten = true;
    if (prefs && prefs.indexOf("avoidgluten") !== -1) hasGluten = true;
    if (hasGluten) {
      flags.push("gluten-free");
      seen["gluten-free"] = true;
    }
  }

  // --- lactose-free ---
  if (!seen["lactose-free"]) {
    var hasLactose = false;
    var conditions2 = F.conditions;
    var prefs2 = F.prefs;
    if (conditions2 && conditions2.indexOf("lactose") !== -1) hasLactose = true;
    if (prefs2 && prefs2.indexOf("lactosefreeproducts") !== -1) hasLactose = true;
    if (hasLactose) {
      flags.push("lactose-free");
      seen["lactose-free"] = true;
    }
  }

  // --- no:<key> from exclusions ---
  var noFlags = [];
  var exclusions = F.exclusions;
  if (exclusions) {
    for (var i = 0; i < exclusions.length; i++) {
      var ex = exclusions[i];
      if (ex.type !== "allergy") continue;

      // Map id to allergen key
      var id = ex.id;
      if (id === "crustaceans") id = "crustacean";
      else if (id === "nuts") id = "treenut";
      else if (id === "sulphites") id = "sulphite";
      else if (id === "molluscs") id = "mollusc";
      // other ids unchanged

      // Check if mapped id is in ALLERGEN_KEYS
      if (ALLERGEN_KEYS && ALLERGEN_KEYS.indexOf(id) !== -1) {
        var flag = "no:" + id;
        if (!seen[flag]) {
          noFlags.push(flag);
          seen[flag] = true;
        }
      }
    }
  }

  // no:egg from patternOpts.noEggs
  var patternOpts = F.patternOpts;
  if (patternOpts && patternOpts.noEggs && !seen["no:egg"]) {
    noFlags.push("no:egg");
    seen["no:egg"] = true;
  }

  // no:milk from patternOpts.noMilk
  if (patternOpts && patternOpts.noMilk && !seen["no:milk"]) {
    noFlags.push("no:milk");
    seen["no:milk"] = true;
  }

  // Sort noFlags alphabetically and append
  noFlags.sort();
  for (var j = 0; j < noFlags.length; j++) {
    flags.push(noFlags[j]);
  }

  return { axis: axis, flags: flags };
}

/* ------------------------------------------------------------------ */
/* recipeAvailability                                                   */
/* ------------------------------------------------------------------ */

function recipeAvailability(recipe, profile, foods) {
  var af = profileAxisFlags(profile);
  var axis = af.axis;
  var flags = af.flags;

  // Check axis support
  var upgraded = upgradeRecipe(recipe);
  if (upgraded.written !== axis) {
    // Check variants
    var variants = upgraded.variants;
    var hasVariant = false;
    if (variants && variants[axis]) {
      hasVariant = true;
    }
    if (!hasVariant) {
      return { axis: axis, flags: flags, available: false, reason: "axis" };
    }
  }

  // Resolve recipe
  var resolved = resolveRecipe(recipe, { axis: axis, flags: flags, foods: foods });
  var ingredients = resolved.ingredients;

  // Check each flag in order (rule 1 order)
  for (var i = 0; i < flags.length; i++) {
    var flag = flags[i];

    if (flag === "gluten-free") {
      for (var k = 0; k < ingredients.length; k++) {
        var alls = ingredients[k].allergens;
        if (alls && alls.indexOf("gluten") !== -1) {
          return { axis: axis, flags: flags, available: false, reason: "allergen:gluten" };
        }
      }
    } else if (flag === "lactose-free") {
      for (var l = 0; l < ingredients.length; l++) {
        var alls2 = ingredients[l].allergens;
        if (alls2 && alls2.indexOf("milk") !== -1) {
          var note = ingredients[l].note || "";
          if (note.toLowerCase().indexOf("lactose-free") === -1) {
            return { axis: axis, flags: flags, available: false, reason: "allergen:milk" };
          }
        }
      }
    } else if (flag.indexOf("no:") === 0) {
      var key = flag.substring(3);
      for (var m = 0; m < ingredients.length; m++) {
        var alls3 = ingredients[m].allergens;
        if (alls3 && alls3.indexOf(key) !== -1) {
          return { axis: axis, flags: flags, available: false, reason: "allergen:" + key };
        }
      }
    }
  }

  return { axis: axis, flags: flags, available: true, reason: null };
}

/* ------------------------------------------------------------------ */
/* recipeCategories                                                     */
/* ------------------------------------------------------------------ */

function recipeCategories(recipe) {
  var cats = [];
  var tags = recipe.tags || [];
  var storage = recipe.storage || {};
  var time = recipe.time || {};

  // meal-prep: tags has "prep:meal-prep" or storage.fridgeDays >= 3
  if (tags.indexOf("prep:meal-prep") !== -1 || (storage.fridgeDays !== undefined && storage.fridgeDays >= 3)) {
    cats.push("meal-prep");
  }

  // quick: time.totalMin present and <= 30
  if (time.totalMin !== undefined && time.totalMin <= 30) {
    cats.push("quick");
  }

  // breakfast
  if (tags.indexOf("meal:breakfast") !== -1) {
    cats.push("breakfast");
  }

  // snack
  if (tags.indexOf("meal:snack") !== -1) {
    cats.push("snack");
  }

  return cats;
}

/* ------------------------------------------------------------------ */
/* isFullMeal                                                           */
/* ------------------------------------------------------------------ */

function isFullMeal(perServing) {
  if (!perServing) return false;
  return (
    perServing.prot !== null &&
    perServing.prot !== undefined &&
    perServing.fib !== null &&
    perServing.fib !== undefined &&
    perServing.kcal !== null &&
    perServing.kcal !== undefined &&
    perServing.prot >= FULL_MEAL.prot &&
    perServing.fib >= FULL_MEAL.fib &&
    perServing.kcal >= FULL_MEAL.kcalMin &&
    perServing.kcal <= FULL_MEAL.kcalMax
  );
}

/* ------------------------------------------------------------------ */
/* recipeFoods                                                          */
/* ------------------------------------------------------------------ */

async function recipeFoods(recipe) {
  var upgraded = upgradeRecipe(recipe);
  var seen = {};
  var result = {};

  // Collect all foodRefs from ingredients
  var refs = [];
  var ingredients = upgraded.ingredients;
  for (var i = 0; i < ingredients.length; i++) {
    if (ingredients[i].foodRef) {
      refs.push(ingredients[i].foodRef);
    }
  }

  // Collect foodRefs from variants
  var variants = upgraded.variants;
  if (variants) {
    var axisKeys = Object.keys(variants);
    for (var v = 0; v < axisKeys.length; v++) {
      var list = variants[axisKeys[v]];
      if (list) {
        for (var u = 0; u < list.length; u++) {
          if (list[u].foodRef) {
            refs.push(list[u].foodRef);
          }
        }
      }
    }
  }

  // Collect foodRefs from flags
  var flagLists = upgraded.flags;
  if (flagLists) {
    var flagKeys = Object.keys(flagLists);
    for (var f = 0; f < flagKeys.length; f++) {
      var fList = flagLists[flagKeys[f]];
      if (fList) {
        for (var w = 0; w < fList.length; w++) {
          if (fList[w].foodRef) {
            refs.push(fList[w].foodRef);
          }
        }
      }
    }
  }

  // Look up each unique ref once
  for (var r = 0; r < refs.length; r++) {
    var ref = refs[r];
    if (seen[ref]) continue;
    seen[ref] = true;
    var food = await getFoodByRef(ref);
    if (food) {
      result[ref] = food;
    }
  }

  return result;
}
