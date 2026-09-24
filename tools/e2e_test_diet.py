#!/usr/bin/env python3
"""Checks for 0.2.6 (idea 8): What you eat card, vegetarian options, carnivore note, health conditions,
food rules, fine-tune section, suggestions follow the pattern, old diet style chips convert on start.
Phone size, English. Usage: python3 tools/e2e_test_diet.py <repo_dir> <shots_dir>"""
import os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
REPO, SHOTS = sys.argv[1], sys.argv[2]; os.makedirs(SHOTS, exist_ok=True)
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=REPO); H.log_message = lambda *a: None
class Srv(socketserver.ThreadingTCPServer): allow_reuse_address = True
srv = Srv(('127.0.0.1', 8787), H); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
fails=[]; errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else fails.append(m))
pick = lambda page, name, val: page.click('label.opt:has(input[name="%s"][value="%s"])' % (name, val))
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width':390,'height':844}, locale='en-GB', timezone_id='Europe/Prague')
    page = ctx.new_page(); page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto('http://127.0.0.1:8787/#today'); page.wait_for_timeout(1500)
    # an old 0.2.5 profile with diet style chips
    page.evaluate("""async () => { await recPut({id:'profile', type:'profile', schema:2,
      person:{sex:'male', age:28, heightCm:180, weightKg:75, activityLevel:2},
      goals:{direction:'maintain', macroSplit:{preset:'balanced', proteinPct:25, fatPct:30, carbPct:45}, dietStyle:['vegetarian','mediterranean'], aims:['fibre','sleep'], focusNutrients:[], notes:'', slots:{breakfast:25,lunch:35,snack:10,dinner:30}},
      food:{exclusions:[], cuisines:[], cuisineOther:'', dislikes:''},
      kitchen:{timeWeekday:2, timeWeekend:3, equipment:[], budget:'bud3', mealPrep:{cookDaysPerWeek:3, batchServings:3}}}); }""")
    page.reload(); page.wait_for_timeout(1500)
    prof = page.evaluate("(async () => await recGet('profile'))()")
    ok(prof['food'].get('pattern') == 'vegetarian', 'old vegetarian chip converted on start: %s' % prof['food'].get('pattern'))
    ok(prof['goals'].get('focus') == ['fibre','mediterranean'] and prof['goals'].get('hints') == ['sleep'], 'focus and hints converted')
    ok(prof['goals'].get('dietStyle') == ['vegetarian','mediterranean'], 'old chips still stored')
    # suggestions follow the pattern
    page.evaluate("go('recipes')"); page.wait_for_timeout(1500)
    txt = page.inner_text('#s-recipes').lower()
    ok('chicken' not in txt and 'salmon' not in txt and 'turkey' not in txt, 'vegetarian: no meat or fish in suggestions')
    page.evaluate("S.draft=null; go('profile')"); page.wait_for_timeout(700)
    ok(page.is_checked('input[name="food.pattern"][value="vegetarian"]'), 'profile shows Vegetarian chosen')
    ok(page.locator('input[name="food.patternOpts.noEggs"]').count() == 1, 'vegetarian shows the no eggs option')
    ok(page.locator('[data-act="pchip-dietStyle"]').count() == 0 and page.locator('[data-act="pchip-aims"]').count() == 0, 'old chips are gone')
    page.locator('input[name="food.pattern"][value="vegetarian"]').scroll_into_view_if_needed(); page.screenshot(path=SHOTS+'/d1_what_you_eat.png')
    pick(page, 'food.pattern', 'carnivore'); page.wait_for_timeout(400)
    ok(page.locator('.notice.warn', has_text='LDL cholesterol').count() == 1 and page.locator('input[name="food.patternOpts.noEggs"]').count() == 0, 'carnivore note, no vegetarian options')
    page.locator('.notice.warn', has_text='LDL').scroll_into_view_if_needed(); page.screenshot(path=SHOTS+'/d2_carnivore.png')
    pick(page, 'food.pattern', 'vegan'); page.wait_for_timeout(400)
    page.click('[data-act="pchip-conditions"][data-id="lactose"]'); page.wait_for_timeout(400)
    ok(page.locator('p.tiny', has_text='12 g of lactose').count() == 1, 'lactose note appears')
    page.click('[data-act="pchip-rules"][data-id="halal"]'); page.wait_for_timeout(200)
    page.locator('[data-act="pchip-rules"]').first.scroll_into_view_if_needed(); page.screenshot(path=SHOTS+'/d3_conditions_rules.png')
    ok(page.get_attribute('#ftBox', 'open') is None, 'fine-tune closed by default')
    page.click('#ftBox summary'); page.wait_for_timeout(300)
    ok(page.get_attribute('[data-act="pchip-focus"][data-id="fibre"]', 'aria-pressed') == 'true', 'fine-tune shows converted focus')
    page.click('[data-act="pchip-prefs"][data-id="avoidgluten"]'); page.wait_for_timeout(200)
    page.click('[data-act="pchip-conditions"][data-id="lactose"]'); page.wait_for_timeout(400)
    ok(page.get_attribute('#ftBox', 'open') is not None, 'fine-tune stays open after a re-render')
    page.locator('#ftBox').scroll_into_view_if_needed(); page.screenshot(path=SHOTS+'/d4_finetune.png')
    page.click('[data-act="profile-save"]'); page.wait_for_timeout(900)
    prof = page.evaluate("(async () => await recGet('profile'))()")
    ok(prof['food']['pattern'] == 'vegan' and prof['food']['rules'] == ['halal'] and prof['food']['prefs'] == ['avoidgluten'] and prof['food']['conditions'] == [], 'saved: vegan, halal, avoid gluten, no conditions')
    ctxt = page.evaluate("(async () => await buildContext({}))()")
    ok('EATING PATTERN: Vegan' in ctxt and 'FOOD RULES' in ctxt and 'DIET STYLE' not in ctxt, 'Claude context uses the new fields')
    page.evaluate("go('recipes')"); page.wait_for_timeout(1500)
    txt = page.inner_text('#s-recipes').lower()
    ok('yogurt' not in txt and 'omelette' not in txt and 'chicken' not in txt, 'vegan: no yogurt, eggs or meat in suggestions')
    b.close()
ok(not errs, 'no page errors %s' % errs)
print('RESULT', 'all passed' if not fails else fails)
