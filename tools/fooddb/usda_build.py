import csv,json,re,collections
import os
D=os.environ['USDA_DIR'].rstrip('/')+'/'
kept=json.load(open(os.environ.get('WORK','.')+'/usda_kept.json'))
ids={f['id'] for f in kept}
# nutrient code -> usda ids (first available wins)
NUT=[('kcal',[1008]),('prot',[1003]),('fat',[1004]),('carb',[1005]),('fib',[1079]),('sug',[2000]),
 ('sfa',[1258]),('mufa',[1292]),('pufa',[1293]),('trans',[1257]),('chol',[1253]),
 ('na',[1093]),('k',[1092]),('ca',[1087]),('mg',[1090]),('p',[1091]),('fe',[1089]),('zn',[1095]),('cu',[1098]),('mn',[1101]),('se',[1103]),
 ('vita',[1106]),('vitd',[1114]),('vite',[1109]),('vitk',[1185]),('vitc',[1162]),('b1',[1165]),('b2',[1166]),('b3',[1167]),('b5',[1170]),('b6',[1175]),('fol',[1190]),('b12',[1178]),('choline',[1180]),
 ('ala',[1404,1270]),('epa',[1278]),('dha',[1272]),('alc',[1018]),('caff',[1057]),('water',[1051])]
want={u for _,us in NUT for u in us}
vals=collections.defaultdict(dict)
for r in csv.DictReader(open(D+'food_nutrient.csv')):
    if r['fdc_id'] in ids and int(r['nutrient_id']) in want:
        vals[r['fdc_id']][int(r['nutrient_id'])]=float(r['amount'])
units={r['id']:r['name'] for r in csv.DictReader(open(D+'measure_unit.csv'))}
por=collections.defaultdict(list)
for r in csv.DictReader(open(D+'food_portion.csv')):
    if r['fdc_id'] in ids:
        u=units.get(r['measure_unit_id'],'')
        if u=='undetermined': u=''
        amt=r['amount']
        try:
            a=float(amt); amt=('%g'%a)
        except: pass
        label=' '.join(x for x in [amt,u,r['modifier'].strip(),r['portion_description'].strip()] if x).strip()
        g=float(r['gram_weight'])
        if g>0: por[r['fdc_id']].append((int(r['seq_num'] or 0),label,round(g,1)))
def rnd(x):
    if x is None: return None
    if x==0: return 0
    if abs(x)>=100: return round(x)
    if abs(x)>=10: return round(x,1)
    if abs(x)>=1: return round(x,2)
    return float('%.3g'%x)
foods=[]
for f in kept:
    v=vals.get(f['id'],{})
    row=[]
    for code,us in NUT:
        x=None
        for u in us:
            if u in v: x=v[u]; break
        row.append(rnd(x))
    # epa/dha are g in usda; keep g
    ps=[[l,g] for _,l,g in sorted(por.get(f['id'],[]))][:5]
    foods.append({'i':int(f['id']),'c':int(f['cat']),'en':f['d'],'n':row,'p':ps})
cats={int(r['id']):r['description'] for r in csv.DictReader(open(D+'food_category.csv'))}
out={'source':'USDA FoodData Central, SR Legacy (April 2018), public domain. Values per 100 g edible portion.',
     'nutrients':[c for c,_ in NUT],'categories':cats,'foods':foods}
s=json.dumps(out,ensure_ascii=False,separators=(',',':'))
open(os.environ.get('WORK','.')+'/foods_usda.json','w').write(s)
print(len(foods), len(s))
missing=collections.Counter()
for f in foods:
    for i,(c,_) in enumerate(NUT):
        if f['n'][i] is None: missing[c]+=1
print(missing.most_common())
