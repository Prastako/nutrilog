"""Starter recipes for NutriLog. Nutrition is computed from the USDA database
by the grams of each ingredient, so these also exercise the same computation
the archive pipeline uses. Run: python3 starter_recipes.py > recipes-starter.json"""
import json, sys, datetime

import os
db = json.load(open(os.environ.get('FOODS','../../data/foods.json')))
keys = db['nutrients']
by = {f['i']: f for f in db['foods']}

def I(item, qty, unit, grams, ref=None, prep=None, group=None, optional=False):
    return dict(group=group, item=item, qty=qty, unit=unit, grams=grams, prep=prep, optional=optional,
                foodRef=('usda:%d' % ref) if ref else None)

SALT = 173468
R = []

R.append(dict(slug='overnight-oats', title='Ovesná kaše přes noc s řeckým jogurtem a borůvkami', titleEn='Overnight oats with Greek yogurt and blueberries',
  summary='Snídaně, kterou připravíte večer za pět minut; ráno jen vytáhnete z lednice.', servings=1, time=dict(prepMin=5, cookMin=0, totalMin=5), difficulty='easy',
  ingredients=[I('ovesné vločky',60,'g',60,173904), I('polotučné mléko',150,'ml',155,171267), I('řecký jogurt bílý, nízkotučný',100,'g',100,170903),
    I('chia semínka',10,'g',10,170554), I('borůvky, čerstvé nebo mražené',80,'g',80,171711), I('med',1,'lžička',7,169640, optional=True), I('skořice',1,'špetka',0.3,171320, optional=True)],
  steps=['Ve sklenici nebo krabičce smíchejte vločky, chia, mléko a jogurt.','Přidejte skořici, zamíchejte a zavřete.','Nechte přes noc v lednici, aspoň 6 hodin.','Ráno navrch dejte borůvky a podle chuti med.'],
  tips=['Na tři rána udělejte tři sklenice najednou, vydrží 3 dny.','Mražené borůvky dejte rovnou večer, do rána povolí.'],
  variations=[('Bez laktózy','Mléko nahraďte ovesným nápojem a jogurt sójovým.'),('Víc bílkovin','Přimíchejte 15 g syrovátkového proteinu a ubrat mléka nemusíte.')],
  storage=dict(fridgeDays=3, freezer=False, reheat='Jí se studená.'),
  tags=['meal:breakfast','prep:meal-prep','prep:no-cook','time:under-15','diet:vegetarian','diet:high-fibre','ing:oats','ing:yogurt','ing:blueberries','ing:chia','method:overnight','flavor:sweet','season:all-year']))

R.append(dict(slug='spinach-omelette', title='Omeleta se špenátem a sýrem, celozrnný chléb', titleEn='Spinach and cheese omelette with wholegrain bread',
  summary='Rychlá teplá snídaně s hodně bílkovinami.', servings=1, time=dict(prepMin=3, cookMin=7, totalMin=10), difficulty='easy',
  ingredients=[I('vejce',3,'ks',150,171287), I('baby špenát',60,'g',60,168462), I('eidam nebo čedar, strouhaný',25,'g',25,170899), I('máslo',5,'g',5,173410),
    I('celozrnný chléb',2,'krajíce',60,172688), I('sůl a pepř',None,None,None)],
  steps=['Vejce rozšlehejte se špetkou soli a pepře.','Na pánvi rozpusťte máslo a nechte na něm 1 minutu povadnout špenát.','Zalijte vejci, na mírném ohni nechte 3 až 4 minuty stáhnout.','Posypte sýrem, přeložte napůl a ještě minutu dopečte.','Podávejte s chlebem.'],
  tips=['Pánev s poklicí: sýr se rozteče a vrch se dopeče bez obracení.'],
  variations=[('Bez mléčných výrobků','Sýr vynechte a přidejte rajčata a lžíci olivového oleje místo másla.')],
  storage=None,
  tags=['meal:breakfast','time:under-15','diet:high-protein','diet:vegetarian','ing:egg','ing:spinach','ing:cheese','method:pan-fry','equip:hob','flavor:savory']))

R.append(dict(slug='cottage-rye', title='Žitný chléb s cottage sýrem, ředkvičkami a okurkou', titleEn='Rye bread with cottage cheese, radishes and cucumber',
  summary='Studená snídaně nebo svačina bez vaření, lehká a sytá.', servings=1, time=dict(prepMin=5, cookMin=0, totalMin=5), difficulty='easy',
  ingredients=[I('žitný chléb',2,'krajíce',70,172684), I('cottage sýr',125,'g',125,173417), I('ředkvičky',5,'ks',50,169276), I('okurka salátová',0.3,'ks',80,169225),
    I('pažitka',1,'lžíce',3,169994), I('pepř',None,None,None)],
  steps=['Cottage sýr smíchejte s nasekanou pažitkou a pepřem.','Namažte na chléb.','Navrch dejte plátky ředkviček a okurky.'],
  tips=['Místo cottage jde tvaroh rozmíchaný se lžící jogurtu.'], variations=[], storage=None,
  tags=['meal:breakfast','meal:snack','prep:no-cook','time:under-15','diet:vegetarian','diet:high-protein','ing:cottage-cheese','ing:rye-bread','ing:radish','cuisine:czech','flavor:fresh']))

R.append(dict(slug='chicken-rice-bowl', title='Kuřecí miska s rýží, brokolicí a sezamem', titleEn='Chicken rice bowl with broccoli and sesame',
  summary='Klasický meal prep: čtyři krabičky na obědy, vydrží do čtvrtka.', servings=4, time=dict(prepMin=15, cookMin=20, totalMin=35), difficulty='easy',
  ingredients=[I('kuřecí prsa',600,'g',600,171077,prep='nakrájená na kostky'), I('rýže jasmínová nebo dlouhozrnná',300,'g',300,168877),
    I('brokolice',1,'ks',480,170379,prep='na růžičky'), I('sójová omáčka',4,'lžíce',64,174277,group='Omáčka'), I('sezamový olej',1,'lžíce',14,171016,group='Omáčka'),
    I('stroužky česneku',3,'ks',9,169230,prep='prolisované',group='Omáčka'), I('zázvor',2,'cm',10,169231,prep='nastrouhaný',group='Omáčka'),
    I('řepkový olej',1,'lžíce',14,172336), I('sezam',2,'lžíce',18,170150), I('limetková šťáva',1,'lžíce',15,168156, optional=True)],
  steps=['Uvařte rýži podle návodu na obalu.','Smíchejte sójovou omáčku, sezamový olej, česnek, zázvor a limetku.','Kuře osolte jen lehce (omáčka je slaná) a na rozpáleném oleji opékejte 6 až 8 minut dozlatova.',
    'Přilijte polovinu omáčky a 1 minutu provařte, ať kuře zglazuje.','Brokolici spařte nebo vařte v páře 4 minuty, ať zůstane křupavá.','Rozdělte do 4 krabiček: rýže, brokolice, kuře, zbytek omáčky a sezam.'],
  tips=['Brokolici vařte kratší dobu, při ohřívání v mikrovlnce ještě změkne.','Omáčku na poslední den dejte do zvláštní nádobky, rýže ji jinak vsákne.'],
  variations=[('Bez lepku','Sójovou omáčku nahraďte tamari.'),('Vegetariánsky','Kuře nahraďte 600 g pevného tofu, opečte ho stejně.')],
  storage=dict(fridgeDays=4, freezer=True, reheat='Mikrovlnka 2 až 3 minuty, rýži pokropte lžící vody.'),
  tags=['meal:lunch','meal:dinner','prep:meal-prep','prep:freezer-friendly','time:under-60','diet:high-protein','ing:chicken','ing:rice','ing:broccoli','ing:sesame','cuisine:asian','method:stir-fry','equip:hob','flavor:umami']))

R.append(dict(slug='red-lentil-dal', title='Dál z červené čočky se špenátem a rýží', titleEn='Red lentil dal with spinach and rice',
  summary='Levný, sytý a hřejivý oběd na čtyři dny; hodně vlákniny a železa.', servings=4, time=dict(prepMin=10, cookMin=30, totalMin=40), difficulty='easy',
  ingredients=[I('červená čočka',280,'g',280,174284), I('rajčata z konzervy',1,'plechovka',400,170051), I('cibule',1,'ks',120,170000,prep='nadrobno'),
    I('stroužky česneku',3,'ks',9,169230), I('zázvor',3,'cm',15,169231), I('kokosové mléko',200,'ml',200,170173), I('baby špenát',150,'g',150,168462),
    I('řepkový olej',1,'lžíce',14,172336), I('kurkuma',1,'lžička',3,172231,group='Koření'), I('mletý kmín římský',1,'lžička',2,170923,group='Koření'),
    I('chilli',0.5,'lžičky',1,171319,group='Koření',optional=True), I('rýže basmati',240,'g',240,168877), I('voda',700,'ml',None), I('sůl',1,'lžička',6,SALT)],
  steps=['Na oleji 5 minut sklovatějte cibuli, přidejte česnek, zázvor a koření a 1 minutu opékejte.','Přidejte propláchnutou čočku, rajčata a vodu.','Vařte 20 minut, občas zamíchejte, čočka se rozvaří.',
    'Vmíchejte kokosové mléko a špenát, 2 minuty prohřejte a osolte.','Mezitím uvařte rýži.','Rozdělte do 4 krabiček.'],
  tips=['Dál po odležení zhoustne, při ohřívání přilijte trochu vody.','Na závěr vymačkaná citronová šťáva zvedne chuť.'],
  variations=[('Víc bílkovin','Podávejte s 150 g řeckého jogurtu navrch nebo přidejte cizrnu.')],
  storage=dict(fridgeDays=4, freezer=True, reheat='Hrnec nebo mikrovlnka, přilít trochu vody.'),
  tags=['meal:lunch','meal:dinner','prep:meal-prep','prep:freezer-friendly','prep:one-pot','time:under-60','diet:vegan','diet:vegetarian','diet:high-fibre','ing:lentils','ing:spinach','ing:rice','ing:coconut-milk','cuisine:indian','method:simmer','equip:hob','flavor:spicy','budget:cheap']))

R.append(dict(slug='turkey-chilli', title='Krůtí chilli s fazolemi a kukuřicí', titleEn='Turkey chilli with beans and corn',
  summary='Libové chilli do krabiček, hodně bílkovin i vlákniny; zamrazit jde bez problému.', servings=4, time=dict(prepMin=10, cookMin=30, totalMin=40), difficulty='easy',
  ingredients=[I('mleté krůtí maso',500,'g',500,171505), I('červené fazole z konzervy, scezené',1,'plechovka',240,174285), I('rajčata z konzervy',1,'plechovka',400,170051),
    I('kukuřice z konzervy, scezená',150,'g',150,169216), I('cibule',1,'ks',120,170000), I('červená paprika',1,'ks',150,170108), I('stroužky česneku',2,'ks',6,169230),
    I('řepkový olej',1,'lžíce',14,172336), I('mletý kmín římský',1,'lžička',2,170923,group='Koření'), I('chilli koření',2,'lžičky',5,171319,group='Koření'),
    I('sladká paprika',1,'lžička',2,171329,group='Koření'), I('sůl',1,'lžička',6,SALT)],
  steps=['Na oleji orestujte cibuli a papriku 5 minut.','Přidejte maso, rozdrobte a opékejte, dokud nezbělá.','Vmíchejte česnek a koření, minutu opékejte.',
    'Přidejte rajčata, fazole a kukuřici, osolte a 20 minut duste pod pokličkou.','Rozdělte do 4 krabiček.'],
  tips=['Podávejte s jogurtem místo zakysané smetany, nebo s rýží pro víc energie.'],
  variations=[('Vegansky','Maso nahraďte další plechovkou fazolí a 150 g červené čočky (přilijte 300 ml vody).')],
  storage=dict(fridgeDays=4, freezer=True, reheat='Mikrovlnka nebo hrnec.'),
  tags=['meal:lunch','meal:dinner','prep:meal-prep','prep:freezer-friendly','prep:one-pot','time:under-60','diet:high-protein','diet:high-fibre','ing:turkey','ing:beans','ing:corn','ing:bell-pepper','cuisine:mexican','method:simmer','equip:hob','flavor:spicy']))

R.append(dict(slug='yogurt-walnut-apple', title='Řecký jogurt s jablkem, vlašskými ořechy a skořicí', titleEn='Greek yogurt with apple, walnuts and cinnamon',
  summary='Svačina za dvě minuty, bílkoviny a zdravé tuky.', servings=1, time=dict(prepMin=3, cookMin=0, totalMin=3), difficulty='easy',
  ingredients=[I('řecký jogurt bílý, nízkotučný',170,'g',170,170903), I('jablko',1,'ks',150,168202,prep='na kostičky'), I('vlašské ořechy',15,'g',15,170187), I('skořice',1,'špetka',0.3,171320)],
  steps=['Jogurt dejte do misky.','Přidejte jablko a nalámané ořechy.','Posypte skořicí.'],
  tips=['Do práce: jablko nakrájejte až ráno, nebo ho pokapejte citronem, ať nezhnědne.'], variations=[], storage=None,
  tags=['meal:snack','meal:breakfast','prep:no-cook','time:under-15','diet:vegetarian','diet:high-protein','ing:yogurt','ing:apple','ing:walnuts','flavor:sweet']))

R.append(dict(slug='hummus-veg', title='Hummus se zeleninovými tyčinkami', titleEn='Hummus with vegetable sticks',
  summary='Křupavá svačina do práce, hodně vlákniny.', servings=1, time=dict(prepMin=5, cookMin=0, totalMin=5), difficulty='easy',
  ingredients=[I('hummus',70,'g',70,174289), I('mrkev',1,'ks',80,170393), I('okurka salátová',0.3,'ks',80,169225), I('červená paprika',0.5,'ks',70,170108)],
  steps=['Zeleninu nakrájejte na tyčinky.','Hummus dejte do malé krabičky a namáčejte.'],
  tips=['Tyčinky vydrží nakrájené 3 dny v krabičce s mokrým ubrouskem.'], variations=[], storage=dict(fridgeDays=3, freezer=False, reheat=None),
  tags=['meal:snack','prep:no-cook','prep:meal-prep','time:under-15','diet:vegan','diet:high-fibre','ing:hummus','ing:carrot','ing:cucumber','ing:bell-pepper','cuisine:middle-eastern','flavor:fresh']))

R.append(dict(slug='energy-balls', title='Ovesné kuličky s arašídovým máslem a datlemi', titleEn='Oat, peanut butter and date energy balls',
  summary='12 kuliček bez pečení na celý týden; dvě jsou svačina.', servings=6, time=dict(prepMin=15, cookMin=0, totalMin=15), difficulty='easy',
  ingredients=[I('ovesné vločky',120,'g',120,173904), I('arašídové máslo bez soli',100,'g',100,172470), I('datle medjool, vypeckované',8,'ks',160,168191),
    I('kakao neslazené',2,'lžíce',12,169593), I('chia semínka',1,'lžíce',12,170554), I('voda',2,'lžíce',None)],
  steps=['Datle v mixéru rozmixujte na pastu.','Přidejte ostatní suroviny a promixujte, směs má držet pohromadě; když je suchá, přidejte lžíci vody.','Mokrýma rukama vytvarujte 12 kuliček.','Uložte do lednice.'],
  tips=['Bez mixéru: datle nasekejte nadrobno a hmotu propracujte rukama.'],
  variations=[('Bez arašídů','Použijte mandlové nebo slunečnicové máslo.')],
  storage=dict(fridgeDays=7, freezer=True, reheat=None),
  tags=['meal:snack','prep:meal-prep','prep:no-cook','prep:freezer-friendly','time:under-30','diet:vegan','ing:oats','ing:peanut-butter','ing:dates','ing:cocoa','equip:blender','flavor:sweet']))

R.append(dict(slug='salmon-potatoes', title='Pečený losos s bramborami a fazolkami', titleEn='Baked salmon with potatoes and green beans',
  summary='Večeře na jeden plech, omega 3 a vitamin D.', servings=2, time=dict(prepMin=10, cookMin=30, totalMin=40), difficulty='easy',
  ingredients=[I('filety lososa',2,'ks',280,175167), I('brambory',500,'g',500,170026,prep='na měsíčky'), I('zelené fazolky',300,'g',300,169961),
    I('olivový olej',1.5,'lžíce',20,171413), I('citronová šťáva',1,'lžíce',15,167747), I('stroužek česneku',1,'ks',3,169230), I('sůl, pepř, kopr',None,None,None)],
  steps=['Troubu rozehřejte na 200 °C.','Brambory promíchejte s polovinou oleje a solí, pečte 15 minut.','Přidejte na plech fazolky a lososa, pokapejte zbytkem oleje, citronem a česnekem, osolte a opepřete.','Pečte dalších 12 až 15 minut, dokud losos nejde snadno rozdělit vidličkou.','Posypte koprem.'],
  tips=['Mražený losos rozmrazte přes noc v lednici.'],
  variations=[('Levněji','Místo lososa makrela nebo pstruh.')],
  storage=dict(fridgeDays=2, freezer=False, reheat='Losos je lepší studený do salátu než ohřívaný.'),
  tags=['meal:dinner','meal:lunch','time:under-60','diet:high-protein','ing:salmon','ing:potatoes','ing:green-beans','nutri:omega-3','nutri:vitamin-d','method:roast','equip:oven','prep:one-pan']))

R.append(dict(slug='tofu-noodles', title='Tofu se zeleninou a nudlemi z pánve', titleEn='Tofu vegetable noodle stir-fry',
  summary='Rychlá večeře z wok pánve, rostlinné bílkoviny.', servings=2, time=dict(prepMin=10, cookMin=12, totalMin=22), difficulty='easy',
  ingredients=[I('pevné tofu',300,'g',300,172475,prep='na kostky'), I('vaječné nudle',140,'g',140,169731), I('mrkev',1,'ks',80,170393,prep='na nudličky'),
    I('červená paprika',1,'ks',150,170108), I('zelí nebo pak choi',150,'g',150,169975,prep='nakrouhané'), I('sójová omáčka',3,'lžíce',48,174277),
    I('sezamový olej',1,'lžička',5,171016), I('řepkový olej',1,'lžíce',14,172336), I('zázvor',2,'cm',10,169231), I('stroužky česneku',2,'ks',6,169230)],
  steps=['Nudle uvařte podle obalu a sceďte.','Tofu osušte a na oleji opékejte 6 minut dokřupava, dejte stranou.','Na stejné pánvi 3 minuty restujte zeleninu se zázvorem a česnekem.','Přidejte nudle, tofu, sójovou omáčku a sezamový olej a 1 minutu promíchejte na plném ohni.'],
  tips=['Tofu před opékáním zabalte do utěrky a zatižte 10 minut, bude křupavější.'],
  variations=[('Bez vajec','Rýžové nudle místo vaječných.'),('Bez lepku','Rýžové nudle a tamari.')],
  storage=dict(fridgeDays=3, freezer=False, reheat='Na pánvi s lžící vody.'),
  tags=['meal:dinner','meal:lunch','time:under-30','diet:vegetarian','diet:high-protein','ing:tofu','ing:noodles','ing:cabbage','ing:carrot','cuisine:asian','method:stir-fry','equip:hob','flavor:umami']))

R.append(dict(slug='chicken-thigh-traybake', title='Kuřecí stehna z trouby s batáty a cuketou', titleEn='Chicken thigh tray bake with sweet potato and courgette',
  summary='Všechno na jeden plech, hodí se na dva dny.', servings=2, time=dict(prepMin=10, cookMin=35, totalMin=45), difficulty='easy',
  ingredients=[I('kuřecí stehna bez kosti a kůže',360,'g',360,173627), I('batáty',400,'g',400,168482,prep='na kostky'), I('cuketa',1,'ks',240,169291),
    I('červená cibule',1,'ks',110,170000), I('olivový olej',1.5,'lžíce',20,171413), I('sladká paprika',1,'lžička',2,171329), I('sůl, pepř, tymián',None,None,None)],
  steps=['Troubu rozehřejte na 210 °C.','Zeleninu a kuře promíchejte na plechu s olejem, paprikou, solí, pepřem a tymiánem.','Pečte 35 minut, v polovině promíchejte.','Kuře je hotové, když šťáva vytéká čirá.'],
  tips=['Stehna jsou šťavnatější než prsa a při ohřívání nevysychají.'], variations=[('Bez batátů','Obyčejné brambory, pečte o 5 minut déle.')],
  storage=dict(fridgeDays=3, freezer=True, reheat='Trouba nebo mikrovlnka.'),
  tags=['meal:dinner','meal:lunch','prep:meal-prep','prep:one-pan','time:under-60','diet:high-protein','ing:chicken','ing:sweet-potato','ing:zucchini','method:roast','equip:oven','flavor:savory']))

out = []
now = '2026-09-21T15:00:00+02:00'
for r in R:
    tot = {k: 0.0 for k in keys}
    unknown_kcal = {k: 0.0 for k in keys}
    all_kcal = 0.0
    for ing in r['ingredients']:
        if ing['foodRef'] and ing['grams']:
            f = by[int(ing['foodRef'].split(':')[1])]
            kc = (f['n'][0] or 0) * ing['grams'] / 100
            all_kcal += kc
            for i, k in enumerate(keys):
                v = f['n'][i]
                if v is None:
                    unknown_kcal[k] += kc
                    continue
                tot[k] += v * ing['grams'] / 100
    ps = {}
    for k in keys:
        if k == 'water': continue
        v = tot[k] / r['servings']
        # unknown when ingredients without a value carry more than a quarter of the energy
        if all_kcal and unknown_kcal[k] / all_kcal > 0.25: ps[k] = None; continue
        ps[k] = round(v) if abs(v) >= 100 else round(v, 1) if abs(v) >= 1 else round(v, 3)
    rec = dict(id='rcp-starter-' + r['slug'], type='recipe', schema=1, origin='starter', lang='cs',
      title=r['title'], titleEn=r['titleEn'], summary=r['summary'], servings=r['servings'], time=r['time'], difficulty=r['difficulty'],
      ingredients=r['ingredients'], steps=[dict(text=s, minutes=None) for s in r['steps']],
      tips=[dict(text=t) for t in r['tips']], variations=[dict(label=a, text=b) for a, b in r['variations']],
      storage=r['storage'], nutrition=dict(perServing=ps, basis='computed', confidence='high', source='USDA FoodData Central SR Legacy'),
      tags=r['tags'], sources=[dict(platform='claude', model='claude-opus-5', note='starter recipe written for NutriLog')],
      extraction=None, thumb=None, createdAt=now, updatedAt=now)
    out.append(rec)
json.dump(dict(archive='nutrilog-starter', schema=1, generatedAt=now, recipes=out), sys.stdout, ensure_ascii=False, indent=1)
for r in out:
    p = r['nutrition']['perServing']
    print(r['title'][:40].ljust(40), p['kcal'], 'P', p['prot'], 'F', p['fat'], 'C', p['carb'], 'fib', p['fib'], file=sys.stderr)
