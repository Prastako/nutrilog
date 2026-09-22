"""Starter recipes for NutriLog, in English (recipe language decided at checkpoint 1),
with a Czech title for search. Nutrition is computed from the USDA database by the
grams of each ingredient, the same computation the archive pipeline uses.
Run from the repository root: FOODS=data/foods.json python3 tools/fooddb/starter_recipes.py > data/recipes-starter.json"""
import json, sys, os

db = json.load(open(os.environ.get('FOODS', 'data/foods.json')))
keys = db['nutrients']
by = {f['i']: f for f in db['foods']}

def I(item, qty, unit, grams, ref=None, prep=None, group=None, optional=False):
    return dict(group=group, item=item, qty=qty, unit=unit, grams=grams, prep=prep, optional=optional,
                foodRef=('usda:%d' % ref) if ref else None)

SALT = 173468
R = []

R.append(dict(slug='overnight-oats', title='Overnight oats with Greek yogurt and blueberries', titleCs='Ovesná kaše přes noc s jogurtem a borůvkami',
  summary='A breakfast you make in five minutes the night before; in the morning you just take it out of the fridge.', servings=1, time=dict(prepMin=5, cookMin=0, totalMin=5), difficulty='easy',
  ingredients=[I('rolled oats',60,'g',60,173904), I('semi-skimmed milk',150,'ml',155,171267), I('plain low-fat Greek yogurt',100,'g',100,170903),
    I('chia seeds',10,'g',10,170554), I('blueberries, fresh or frozen',80,'g',80,171711), I('honey',1,'tsp',7,169640, optional=True), I('cinnamon',1,'pinch',0.3,171320, optional=True)],
  steps=['In a jar or box, mix the oats, chia, milk and yogurt.','Add the cinnamon, stir and close.','Leave in the fridge overnight, at least 6 hours.','In the morning top with blueberries and honey to taste.'],
  tips=['Make three jars at once for three mornings; they keep 3 days.','Add frozen blueberries the night before; they thaw by morning.'],
  variations=[('Lactose free','Use oat drink instead of milk and soy yogurt instead of Greek yogurt.'),('More protein','Stir in 15 g of whey protein; no need to cut the milk.')],
  storage=dict(fridgeDays=3, freezer=False, reheat='Eaten cold.'),
  tags=['meal:breakfast','prep:meal-prep','prep:no-cook','time:under-15','diet:vegetarian','diet:high-fibre','ing:oats','ing:yogurt','ing:blueberries','ing:chia','method:overnight','flavor:sweet','season:all-year']))

R.append(dict(slug='spinach-omelette', title='Spinach and cheese omelette with wholegrain bread', titleCs='Omeleta se špenátem a sýrem',
  summary='A quick hot breakfast with plenty of protein.', servings=1, time=dict(prepMin=3, cookMin=7, totalMin=10), difficulty='easy',
  ingredients=[I('eggs',3,'pcs',150,171287), I('baby spinach',60,'g',60,168462), I('grated edam or cheddar',25,'g',25,170899), I('butter',5,'g',5,173410),
    I('wholegrain bread',2,'slices',60,172688), I('salt and pepper',None,None,None)],
  steps=['Beat the eggs with a pinch of salt and pepper.','Melt the butter in a pan and wilt the spinach in it for 1 minute.','Pour in the eggs and let them set over a gentle heat for 3 to 4 minutes.','Sprinkle with cheese, fold in half and cook one more minute.','Serve with the bread.'],
  tips=['Cover the pan with a lid: the cheese melts and the top sets without flipping.'],
  variations=[('Dairy free','Leave out the cheese, add tomatoes and use a spoon of olive oil instead of butter.')],
  storage=None,
  tags=['meal:breakfast','time:under-15','diet:high-protein','diet:vegetarian','ing:egg','ing:spinach','ing:cheese','method:pan-fry','equip:hob','flavor:savory']))

R.append(dict(slug='cottage-rye', title='Rye bread with cottage cheese, radishes and cucumber', titleCs='Žitný chléb s cottage sýrem a ředkvičkami',
  summary='A no-cook breakfast or snack, light and filling.', servings=1, time=dict(prepMin=5, cookMin=0, totalMin=5), difficulty='easy',
  ingredients=[I('rye bread',2,'slices',70,172684), I('cottage cheese',125,'g',125,173417), I('radishes',5,'pcs',50,169276), I('cucumber',0.3,'pcs',80,169225),
    I('chives',1,'tbsp',3,169994), I('black pepper',None,None,None)],
  steps=['Mix the cottage cheese with chopped chives and pepper.','Spread it on the bread.','Top with sliced radishes and cucumber.'],
  tips=['Tvaroh (quark) loosened with a spoon of yogurt works instead of cottage cheese.'], variations=[], storage=None,
  tags=['meal:breakfast','meal:snack','prep:no-cook','time:under-15','diet:vegetarian','diet:high-protein','ing:cottage-cheese','ing:rye-bread','ing:radish','cuisine:czech','flavor:fresh']))

R.append(dict(slug='chicken-rice-bowl', title='Chicken rice bowl with broccoli and sesame', titleCs='Kuřecí miska s rýží, brokolicí a sezamem',
  summary='Classic meal prep: four lunch boxes that last until Thursday.', servings=4, time=dict(prepMin=15, cookMin=20, totalMin=35), difficulty='easy',
  ingredients=[I('chicken breast',600,'g',600,171077,prep='cubed'), I('jasmine or long-grain rice',300,'g',300,168877),
    I('broccoli',1,'head',480,170379,prep='in florets'), I('soy sauce',4,'tbsp',64,174277,group='Sauce'), I('sesame oil',1,'tbsp',14,171016,group='Sauce'),
    I('garlic cloves',3,'pcs',9,169230,prep='crushed',group='Sauce'), I('fresh ginger',2,'cm',10,169231,prep='grated',group='Sauce'),
    I('rapeseed oil',1,'tbsp',14,172336), I('sesame seeds',2,'tbsp',18,170150), I('lime juice',1,'tbsp',15,168156, optional=True)],
  steps=['Cook the rice according to the packet.','Mix the soy sauce, sesame oil, garlic, ginger and lime.','Salt the chicken only lightly (the sauce is salty) and fry it in hot oil for 6 to 8 minutes until golden.',
    'Pour in half of the sauce and let it bubble for 1 minute to glaze the chicken.','Blanch or steam the broccoli for 4 minutes so it stays crisp.','Divide into 4 boxes: rice, broccoli, chicken, the rest of the sauce and sesame seeds.'],
  tips=['Undercook the broccoli a little; it softens further when reheated in the microwave.','Keep the sauce for the last day in a separate pot, otherwise the rice soaks it up.'],
  variations=[('Gluten free','Use tamari instead of soy sauce.'),('Vegetarian','Replace the chicken with 600 g of firm tofu, fried the same way.')],
  storage=dict(fridgeDays=4, freezer=True, reheat='Microwave 2 to 3 minutes; sprinkle the rice with a spoon of water.'),
  tags=['meal:lunch','meal:dinner','prep:meal-prep','prep:freezer-friendly','time:under-60','diet:high-protein','ing:chicken','ing:rice','ing:broccoli','ing:sesame','cuisine:asian','method:stir-fry','equip:hob','flavor:umami']))

R.append(dict(slug='red-lentil-dal', title='Red lentil dal with spinach and rice', titleCs='Dál z červené čočky se špenátem',
  summary='A cheap, filling, warming lunch for four days; lots of fibre and iron.', servings=4, time=dict(prepMin=10, cookMin=30, totalMin=40), difficulty='easy',
  ingredients=[I('red lentils',280,'g',280,174284), I('canned chopped tomatoes',1,'can',400,170051), I('onion',1,'pcs',120,170000,prep='finely chopped'),
    I('garlic cloves',3,'pcs',9,169230), I('fresh ginger',3,'cm',15,169231), I('coconut milk',200,'ml',200,170173), I('baby spinach',150,'g',150,168462),
    I('rapeseed oil',1,'tbsp',14,172336), I('ground turmeric',1,'tsp',3,172231,group='Spices'), I('ground cumin',1,'tsp',2,170923,group='Spices'),
    I('chilli',0.5,'tsp',1,171319,group='Spices',optional=True), I('basmati rice',240,'g',240,168877), I('water',700,'ml',None), I('salt',1,'tsp',6,SALT)],
  steps=['Soften the onion in the oil for 5 minutes, add the garlic, ginger and spices and fry for 1 minute.','Add the rinsed lentils, the tomatoes and the water.','Simmer for 20 minutes, stirring now and then, until the lentils fall apart.',
    'Stir in the coconut milk and spinach, heat through for 2 minutes and season with salt.','Meanwhile cook the rice.','Divide into 4 boxes.'],
  tips=['Dal thickens as it stands; add a little water when reheating.','A squeeze of lemon at the end lifts the flavour.'],
  variations=[('More protein','Serve topped with 150 g of Greek yogurt, or add chickpeas.')],
  storage=dict(fridgeDays=4, freezer=True, reheat='Pot or microwave, with a little water.'),
  tags=['meal:lunch','meal:dinner','prep:meal-prep','prep:freezer-friendly','prep:one-pot','time:under-60','diet:vegan','diet:vegetarian','diet:high-fibre','ing:lentils','ing:spinach','ing:rice','ing:coconut-milk','cuisine:indian','method:simmer','equip:hob','flavor:spicy','budget:cheap']))

R.append(dict(slug='turkey-chilli', title='Turkey chilli with beans and corn', titleCs='Krůtí chilli s fazolemi a kukuřicí',
  summary='A lean chilli for lunch boxes, high in protein and fibre; freezes without trouble.', servings=4, time=dict(prepMin=10, cookMin=30, totalMin=40), difficulty='easy',
  ingredients=[I('turkey mince',500,'g',500,171505), I('canned red kidney beans, drained',1,'can',240,174285), I('canned chopped tomatoes',1,'can',400,170051),
    I('canned sweetcorn, drained',150,'g',150,169216), I('onion',1,'pcs',120,170000), I('red pepper',1,'pcs',150,170108), I('garlic cloves',2,'pcs',6,169230),
    I('rapeseed oil',1,'tbsp',14,172336), I('ground cumin',1,'tsp',2,170923,group='Spices'), I('chilli powder',2,'tsp',5,171319,group='Spices'),
    I('sweet paprika',1,'tsp',2,171329,group='Spices'), I('salt',1,'tsp',6,SALT)],
  steps=['Fry the onion and pepper in the oil for 5 minutes.','Add the mince, break it up and cook until it turns white.','Stir in the garlic and spices and fry for a minute.',
    'Add the tomatoes, beans and corn, season with salt and simmer covered for 20 minutes.','Divide into 4 boxes.'],
  tips=['Serve with yogurt instead of sour cream, or with rice for more energy.'],
  variations=[('Vegan','Replace the meat with another can of beans and 150 g of red lentils (add 300 ml of water).')],
  storage=dict(fridgeDays=4, freezer=True, reheat='Microwave or pot.'),
  tags=['meal:lunch','meal:dinner','prep:meal-prep','prep:freezer-friendly','prep:one-pot','time:under-60','diet:high-protein','diet:high-fibre','ing:turkey','ing:beans','ing:corn','ing:bell-pepper','cuisine:mexican','method:simmer','equip:hob','flavor:spicy']))

R.append(dict(slug='yogurt-walnut-apple', title='Greek yogurt with apple, walnuts and cinnamon', titleCs='Řecký jogurt s jablkem a ořechy',
  summary='A two-minute snack with protein and good fats.', servings=1, time=dict(prepMin=3, cookMin=0, totalMin=3), difficulty='easy',
  ingredients=[I('plain low-fat Greek yogurt',170,'g',170,170903), I('apple',1,'pcs',150,168202,prep='diced'), I('walnuts',15,'g',15,170187), I('cinnamon',1,'pinch',0.3,171320)],
  steps=['Put the yogurt in a bowl.','Add the apple and the broken walnuts.','Dust with cinnamon.'],
  tips=['For work: cut the apple in the morning, or sprinkle it with lemon so it does not brown.'], variations=[], storage=None,
  tags=['meal:snack','meal:breakfast','prep:no-cook','time:under-15','diet:vegetarian','diet:high-protein','ing:yogurt','ing:apple','ing:walnuts','flavor:sweet']))

R.append(dict(slug='hummus-veg', title='Hummus with vegetable sticks', titleCs='Hummus se zeleninovými tyčinkami',
  summary='A crunchy work snack with plenty of fibre.', servings=1, time=dict(prepMin=5, cookMin=0, totalMin=5), difficulty='easy',
  ingredients=[I('hummus',70,'g',70,174289), I('carrot',1,'pcs',80,170393), I('cucumber',0.3,'pcs',80,169225), I('red pepper',0.5,'pcs',70,170108)],
  steps=['Cut the vegetables into sticks.','Put the hummus in a small box and dip.'],
  tips=['Cut sticks keep 3 days in a box with a damp paper towel.'], variations=[], storage=dict(fridgeDays=3, freezer=False, reheat=None),
  tags=['meal:snack','prep:no-cook','prep:meal-prep','time:under-15','diet:vegan','diet:high-fibre','ing:hummus','ing:carrot','ing:cucumber','ing:bell-pepper','cuisine:middle-eastern','flavor:fresh']))

R.append(dict(slug='energy-balls', title='Oat, peanut butter and date energy balls', titleCs='Ovesné kuličky s arašídovým máslem a datlemi',
  summary='12 no-bake balls for the whole week; two make a snack.', servings=6, time=dict(prepMin=15, cookMin=0, totalMin=15), difficulty='easy',
  ingredients=[I('rolled oats',120,'g',120,173904), I('unsalted peanut butter',100,'g',100,172470), I('medjool dates, pitted',8,'pcs',160,168191),
    I('unsweetened cocoa',2,'tbsp',12,169593), I('chia seeds',1,'tbsp',12,170554), I('water',2,'tbsp',None)],
  steps=['Blend the dates to a paste.','Add everything else and blend; the mixture should hold together, add a spoon of water if it is dry.','With wet hands roll 12 balls.','Keep in the fridge.'],
  tips=['Without a blender: chop the dates very finely and knead the mixture by hand.'],
  variations=[('Peanut free','Use almond or sunflower seed butter.')],
  storage=dict(fridgeDays=7, freezer=True, reheat=None),
  tags=['meal:snack','prep:meal-prep','prep:no-cook','prep:freezer-friendly','time:under-30','diet:vegan','ing:oats','ing:peanut-butter','ing:dates','ing:cocoa','equip:blender','flavor:sweet']))

R.append(dict(slug='salmon-potatoes', title='Baked salmon with potatoes and green beans', titleCs='Pečený losos s bramborami a fazolkami',
  summary='A one-tray dinner with omega 3 and vitamin D.', servings=2, time=dict(prepMin=10, cookMin=30, totalMin=40), difficulty='easy',
  ingredients=[I('salmon fillets',2,'pcs',280,175167), I('potatoes',500,'g',500,170026,prep='in wedges'), I('green beans',300,'g',300,169961),
    I('olive oil',1.5,'tbsp',20,171413), I('lemon juice',1,'tbsp',15,167747), I('garlic clove',1,'pcs',3,169230), I('salt, pepper, dill',None,None,None)],
  steps=['Heat the oven to 200 °C.','Toss the potatoes with half of the oil and some salt and roast for 15 minutes.','Add the beans and salmon to the tray, drizzle with the rest of the oil, the lemon and garlic, season.','Roast 12 to 15 more minutes, until the salmon flakes easily with a fork.','Sprinkle with dill.'],
  tips=['Thaw frozen salmon overnight in the fridge.'],
  variations=[('Cheaper','Mackerel or trout instead of salmon.')],
  storage=dict(fridgeDays=2, freezer=False, reheat='Leftover salmon is better cold in a salad than reheated.'),
  tags=['meal:dinner','meal:lunch','time:under-60','diet:high-protein','ing:salmon','ing:potatoes','ing:green-beans','nutri:omega-3','nutri:vitamin-d','method:roast','equip:oven','prep:one-pan']))

R.append(dict(slug='tofu-noodles', title='Tofu vegetable noodle stir-fry', titleCs='Tofu se zeleninou a nudlemi z pánve',
  summary='A quick wok dinner with plant protein.', servings=2, time=dict(prepMin=10, cookMin=12, totalMin=22), difficulty='easy',
  ingredients=[I('firm tofu',300,'g',300,172475,prep='cubed'), I('egg noodles',140,'g',140,169731), I('carrot',1,'pcs',80,170393,prep='in thin strips'),
    I('red pepper',1,'pcs',150,170108), I('cabbage or pak choi',150,'g',150,169975,prep='shredded'), I('soy sauce',3,'tbsp',48,174277),
    I('sesame oil',1,'tsp',5,171016), I('rapeseed oil',1,'tbsp',14,172336), I('fresh ginger',2,'cm',10,169231), I('garlic cloves',2,'pcs',6,169230)],
  steps=['Cook the noodles according to the packet and drain.','Pat the tofu dry and fry in the oil for 6 minutes until crisp; set aside.','In the same pan stir-fry the vegetables with the ginger and garlic for 3 minutes.','Add the noodles, tofu, soy sauce and sesame oil and toss for 1 minute on full heat.'],
  tips=['Wrap the tofu in a towel and weigh it down for 10 minutes before frying; it gets crisper.'],
  variations=[('Egg free','Rice noodles instead of egg noodles.'),('Gluten free','Rice noodles and tamari.')],
  storage=dict(fridgeDays=3, freezer=False, reheat='In a pan with a spoon of water.'),
  tags=['meal:dinner','meal:lunch','time:under-30','diet:vegetarian','diet:high-protein','ing:tofu','ing:noodles','ing:cabbage','ing:carrot','cuisine:asian','method:stir-fry','equip:hob','flavor:umami']))

R.append(dict(slug='chicken-thigh-traybake', title='Chicken thigh tray bake with sweet potato and courgette', titleCs='Kuřecí stehna z trouby s batáty a cuketou',
  summary='Everything on one tray; covers two days.', servings=2, time=dict(prepMin=10, cookMin=35, totalMin=45), difficulty='easy',
  ingredients=[I('boneless skinless chicken thighs',360,'g',360,173627), I('sweet potatoes',400,'g',400,168482,prep='cubed'), I('courgette',1,'pcs',240,169291),
    I('red onion',1,'pcs',110,170000), I('olive oil',1.5,'tbsp',20,171413), I('sweet paprika',1,'tsp',2,171329), I('salt, pepper, thyme',None,None,None)],
  steps=['Heat the oven to 210 °C.','Toss the vegetables and chicken on a tray with the oil, paprika, salt, pepper and thyme.','Roast 35 minutes, stirring halfway.','The chicken is done when the juices run clear.'],
  tips=['Thighs stay juicier than breast and do not dry out when reheated.'], variations=[('No sweet potatoes','Ordinary potatoes; roast 5 minutes longer.')],
  storage=dict(fridgeDays=3, freezer=True, reheat='Oven or microwave.'),
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
    rec = dict(id='rcp-starter-' + r['slug'], type='recipe', schema=1, origin='starter', lang='en',
      title=r['title'], titleEn=r['title'], titleCs=r['titleCs'], summary=r['summary'], servings=r['servings'], time=r['time'], difficulty=r['difficulty'],
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
