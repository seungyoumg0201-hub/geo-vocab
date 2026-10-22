import json,re
from collections import Counter
D=json.load(open('/workspace/geo-vocab/data_terms.json'));TM={t['term']:t for t in D}
def bg(s):s=re.sub(r'[\s·,()\.\-/]','',s);return set(s[i:i+2] for i in range(len(s)-1))
B={t['term']:bg(t['term']+t['term']+t['def']+str(t.get('keys',''))) for t in D}
TB={t['term']:bg(t['term']) for t in D}
def sim(a,b):
  x,y=B[a],B[b];j=len(x&y)/max(1,len(x|y));tj=len(TB[a]&TB[b])/max(1,len(TB[a]|TB[b]))
  return j+0.6*tj
def grp(c):return {'지형학':'N','기후학':'N','토양·식생·수문':'N','지도학·GIS':'G'}.get(c,c)
flag=[]
for t in D:
  if t.get('core'):continue
  bad=[]
  for d in t['distractors']:
    dt=TM.get(d)
    s=sim(t['term'],d) if dt else 0
    vsh=d in str(t.get('vs',''))
    if not vsh and (not dt or dt['cat']!=t['cat'] or s<0.06):bad.append((d,round(s,3),dt['cat'] if dt else '없음'))
  if bad:
    cands=sorted([u['term'] for u in D if u['term']!=t['term'] and u['cat']==t['cat'] and u['term'] not in t['distractors']],key=lambda u:-sim(t['term'],u))[:6]
    vsn=[x for x in TM if x!=t['term'] and len(x)>=2 and x in str(t.get('vs',''))]
    flag.append({'term':t['term'],'cat':t['cat'],'def':t['def'][:70],'cur':t['distractors'],'bad':bad,'vs':vsn,'cand':cands})
json.dump(flag,open('/workspace/geo-vocab/dist/flag.json','w'),ensure_ascii=False,indent=0)
print(len(flag),sum(len(f['bad']) for f in flag),Counter(f['cat'] for f in flag))
