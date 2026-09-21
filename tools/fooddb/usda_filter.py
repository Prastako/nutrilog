import csv,re,collections,json,sys,os
foods=list(csv.DictReader(open('food.csv')))
EXCL_CAT={'3','21','24','25','26','27'}
brand=re.compile(r"\b([A-Z][A-Z'&\.]{2,}(?:\s+[A-Z][A-Z'&\.]{2,})*)\b")
DROP=[r"school", r"infant", r"toddler",
 r"\bwith salt\b", r"\bselect\b", r"\bprime\b", r"trimmed to 1/4", r"trimmed to 1/2", r"trimmed to 3/4",
 r"New Zealand", r"Australian", r"imported", r"Alaska Native", r"Northern Plains Indians",
 r"Pepperidge", r"Goya", r"Keebler", r"Nabisco", r"Kellogg", r"Pillsbury", r"Kraft", r"Hormel", r"Oscar Mayer", r"Campbell", r"Heinz", r"Mission", r"Tostitos", r"Pillsbury", r"Archway", r"Martha White", r"Kraft", r"Hunt's", r"Rice-A-Roni",
 r"\bUSDA Commodity\b", r"commodity", r"military", r"MRE",
 r"frozen, prepared", r"dry mix", r"from recipe", r"prepared from recipe", r"bread machine",
 r"microwaved", r"heated", r"unheated", r"canned, extra heavy syrup", r"extra light syrup",
 r"heavy syrup", r"juice pack", r"water pack, solids and liquids",
 r"separable fat", r"composite of trimmed retail cuts, separable lean and fat, trimmed to",
 r"\bbroiled\b", r"\bbraised\b", r"pan-broiled", r"with added solution", r"capons", r"fried, batter", r"fried, flour", r"giblets and neck", r"rotisserie", r"roasting,", r"stewing,", r"Canada Goose", r"cornish", r"skin only", r"\bneck\b", r"\bback, meat", r"stewed", r"light meat", r"dark meat, meat", r"meat and skin and giblets", r"fast food", r"Formulated bar", r"Beverages, .*(powder|mix)", r"Babyfood", r"canned, light syrup", r"\bdrained\b.*\bwith salt\b", r"Emu|Ostrich|Squab|Pheasant|Quail|Guinea hen|Goose|Moose|Elk|Caribou|Antelope|Beaver|Beefalo|Opossum|Muskrat|Raccoon|Squirrel|Bear|Buffalo, free range|Seal|Whale|Walrus|Frog legs|Turtle",  # keep roasted/grilled/cooked/raw
]
KEEP_VARIETY=re.compile(r"liver|heart|kidney|tongue|tripe", re.I)
out=[];drop=collections.Counter()
for f in foods:
    f['description']=re.sub(r"\s*\((?:Includes|includes)[^)]*\)","",f['description']).strip()
    d=f['description']; cat=f['food_category_id']
    if cat in EXCL_CAT: drop['cat']+=1; continue
    if brand.search(d): drop['brand']+=1; continue
    bad=[p for p in DROP if re.search(p,d,re.I)]
    if bad: drop['rule']+=1; continue
    if 'variety meats' in d and not KEEP_VARIETY.search(d): drop['variety']+=1; continue
    if cat in ('13','17','10'):
        # meats: keep raw + one cooked style, lean only or lean and fat trimmed 0"/1/8"
        if re.search(r"separable lean and fat, trimmed to 1/8", d) is None and re.search(r"separable lean only", d) is None and re.search(r"ground|raw|cooked|roasted|grilled", d) is None:
            drop['meatmisc']+=1; continue
    out.append(f)
print(len(out), drop, file=sys.stderr)
c=collections.Counter(f['food_category_id'] for f in out)
print(sorted(c.items(), key=lambda x:int(x[0])), file=sys.stderr)
pass

# ---- canonical dedupe for meats ----
def canon(d):
    x=d
    for p in [r", separable lean only", r", separable lean and fat", r",\s*trimmed to 0\" fat", r",\s*trimmed to 1/8\" fat",
              r", all grades", r", choice", r"America's Beef Roast, ", r", lip off", r", lip-on", r", bone-in", r", boneless",
              r", composite of trimmed retail cuts", r", with added solution", r", enhanced", r", \(roasts\)", r", \(chops or roasts\)"]:
        x=re.sub(p,'',x,flags=re.I)
    return re.sub(r"\s+"," ",x).strip()
def score(d):
    s=0
    if 'all grades' in d: s+=3
    if 'separable lean only' in d: s+=2
    if 'trimmed to 0"' in d: s+=1
    if 'added solution' in d or 'enhanced' in d: s-=3
    s-=len(d)/200
    return s
best={}
for f in out:
    if f['food_category_id'] in ('13','17','10','5'):
        k=canon(f['description'])
        if k not in best or score(f['description'])>score(best[k]['description']): best[k]=f
    else:
        best[f['fdc_id']]=f
out2=list(best.values())
# cap beef/lamb/pork: drop obscure cuts
OBSCURE=re.compile(r"carcass|ribs 6-9|ribs 10-12|ribs 6-12|tip round|full cut|under blade|arm pot roast|shoulder pot roast|chuck eye|top blade|clod|mock tender|flat half|point half|cubed|shank|plate|variety meats and by-products, (?!liver|heart|kidney|tongue)", re.I)
out2=[f for f in out2 if not (f['food_category_id'] in ('13','17','10') and OBSCURE.search(f['description']))]
print('after canon', len(out2), file=sys.stderr)
c=collections.Counter(f['food_category_id'] for f in out2)
print(sorted(c.items(), key=lambda x:int(x[0])), file=sys.stderr)
json.dump([{'id':f['fdc_id'],'cat':f['food_category_id'],'d':f['description']} for f in sorted(out2,key=lambda f:(int(f['food_category_id']),f['description']))], open(os.environ.get('WORK','.')+'/usda_kept.json','w'), ensure_ascii=False)
