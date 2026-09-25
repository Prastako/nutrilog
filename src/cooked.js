// Cooking sessions, saved recipe changes, and "you cooked this, log a serving"

async function startCookingSession(recipeId, o) {
  return recPut({
    type: "cooking_session",
    recipeId,
    axis: (o && o.axis) || "omnivore",
    flags: (o && o.flags) || [],
    servings: (o && o.servings) || 1,
    session: (o && o.session) || [],
    startedAt: nowIso(),
    finishedAt: null,
    loggedServings: 0,
  });
}

async function finishCookingSession(session) {
  session.finishedAt = nowIso();
  return recPut(session);
}

async function saveRecipeOverlay(recipeId, label, overrides) {
  var existing = (await recByType("recipe_overlay")).filter(function(r) { return r.recipeId === recipeId; });
  var rec = {
    type: "recipe_overlay",
    recipeId,
    label: label || "",
    overrides: overrides || [],
  };
  if (existing.length > 0) {
    rec.id = existing[0].id;
    rec.createdAt = existing[0].createdAt;
  }
  return recPut(rec);
}

function nextCookedSuggestion(records, today, recipes, foods) {
  var from = addDays(today, -5);
  var candidates = [];
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    if (r.type !== "cooking_session" || r.deleted || !r.finishedAt) continue;
    if (Number(r.loggedServings) >= Number(r.servings)) continue;
    var day = r.finishedAt.slice(0, 10);
    if (day >= from && day <= today) candidates.push(r);
  }
  if (candidates.length === 0) return null;
  candidates.sort(function(a, b) { return b.finishedAt.localeCompare(a.finishedAt); });
  var s = candidates[0];
  var perServing = null;
  if (recipes && recipes[s.recipeId]) {
    perServing = resolveRecipe(
      recipes[s.recipeId],
      { axis: s.axis, flags: s.flags, servings: s.servings, session: s.session, foods: foods }
    ).nutrition.perServing;
  }
  return { session: s, perServing: perServing };
}

async function logCookedServing(suggestion, recipe, slot, date) {
  var entry = {
    type: "food_entry",
    date: date || localDateKey(),
    time: localTime(),
    slot: slot || guessSlot(),
    name: recipe.title,
    source: { kind: "recipe", ref: "recipe:" + suggestion.session.recipeId },
    amount: { qty: 1, unit: "serving", grams: null, label: "1 " + t("rc_serv_short") },
    nutrients: nutRound(suggestion.perServing || {}),
    basis: "estimate",
  };
  var saved = await recPut(entry);
  suggestion.session.loggedServings = Number(suggestion.session.loggedServings) + 1;
  await recPut(suggestion.session);
  return saved;
}
