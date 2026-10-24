
;window.__gvStage=1;
// r79: requestIdleCallback 안전 호출 — 옵션은 반드시 {timeout}, 실패 시 setTimeout
function gvIdle(f,t){try{if(typeof window.requestIdleCallback=='function')return window.requestIdleCallback(f,{timeout:t||1000})}catch(e){}return setTimeout(f,1)}
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const BASE=JSON.parse($('#terms').textContent),MCQ0=JSON.parse($('#mcqs').textContent);
MCQ0.forEach((q,i)=>q.id='q'+i);
const GROUPS={'자연지리':['지형학','기후학','토양·식생·수문','지도학·GIS'],'인문지리':['인구지리','도시지리','경제지리','문화·역사·정치지리'],'지리교육론':['지리교육론'],'지역지리 및 기타':['지역지리']};
const GC={'자연지리':'#12b886','인문지리':'#7048e8','지리교육론':'#f59f00','지역지리 및 기타':'#1c7ed6'};
const grpOf=c=>Object.keys(GROUPS).find(g=>GROUPS[g].includes(c))||'지역지리 및 기타';
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let user=LS.get('gv_user',[]),marks=LS.get('gv_marks',{}),srs=LS.get('gv_srs',{}),hist=LS.get('gv_hist',{}),acc=LS.get('gv_acc',{}),wrong=LS.get('gv_wrong',{}),wrongq=LS.get('gv_wrongq',{}),mocks=LS.get('gv_mocks',[]);
let S=Object.assign({newPerDay:15,goal:40,fs:17,haptic:true,tts:false,rate:1,examDate:'',last:'review'},LS.get('gv_set',{}));
const saveAll=()=>{LS.set('gv_marks',marks);LS.set('gv_srs',srs);LS.set('gv_hist',hist);LS.set('gv_acc',acc);LS.set('gv_wrong',wrong);LS.set('gv_wrongq',wrongq);LS.set('gv_mocks',mocks);LS.set('gv_set',S);pushDueToSW()};
const save=saveAll;
function all(){const m=new Map();BASE.concat(user).forEach(t=>m.set(t.term.replace(/\s/g,''),t));return [...m.values()]}
let T=all(),TM=new Map(T.map(t=>[t.term,t]));
let deck=LS.get('gv_deck','core');if(typeof deck!=='string')deck='core';
let cat='전체',sub='전체',mode='home',idx=0,order=null,listView=false;
// ---- time: study day rolls over at 4am local
const DAY=864e5;const today=()=>Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4-4*36e5)/DAY);
const dayStr=d=>{const x=new Date((d)*DAY+4*36e5+new Date().getTimezoneOffset()*6e4);return (x.getMonth()+1)+'/'+x.getDate()};
const H=()=>{const d=today();return hist[d]||(hist[d]={rev:0,nw:0,c:0,n:0,t:0})};
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const exTag=t=>(t.exam&&t.exam.length)?'기출 '+t.exam.slice(0,3).join(', ')+(t.exam.length>3?' 외':''):'';
const inDeck=t=>deck=='all'||t.core;
const mk=t=>marks[t.term]=='ok'?'✅ 외웠어요':marks[t.term]=='bad'?'🤔 헷갈려요':'';
var buzz=(p=12)=>{if(S.haptic&&navigator.vibrate)try{navigator.vibrate(p)}catch(e){}};
let toastT;function toast(msg,act,fn,ms=2600){const el=$('#toast');el.innerHTML=esc(msg)+(act?` <button>${esc(act)}</button>`:'');el.classList.remove('hide');if(act)el.querySelector('button').onclick=()=>{el.classList.add('hide');fn()};clearTimeout(toastT);toastT=setTimeout(()=>el.classList.add('hide'),ms)}
// ---- accuracy tracking
function record(term,ok,src){const a=acc[term]||(acc[term]={c:0,n:0,s:0});a.n++;if(ok){a.c++;a.s++}else a.s=0;const h=H();h.n++;if(ok)h.c++;
 if(!ok){const w=wrong[term]||(wrong[term]={n:0});w.n++;w.at=Date.now();w.src=src;w.ok=0}else if(wrong[term]){wrong[term].ok=(wrong[term].ok||0)+1;if(wrong[term].ok>=2){delete wrong[term];toast('오답노트에서 졸업했어요 🎓 '+term)}}}
// ---- SRS (SM-2 variant with 4 grades)
const NOW=()=>Date.now();
function sched(c,g){c=Object.assign({e:2.5,i:0,r:0,l:0},c||{});const n={...c};
 if(g==1){n.l++;n.r=0;n.e=Math.max(1.3,c.e-.2);n.i=0;n.due=NOW()+10*6e4}
 else{ if(c.r==0&&c.i==0){n.i=g==2?1:g==3?1:4}
  else if(c.i==0){n.i=g==2?1:g==3?2:4}
  else{n.i=g==2?Math.max(1,c.i*1.2):g==3?c.i*c.e:c.i*c.e*1.3}
  if(g==2)n.e=Math.max(1.3,c.e-.15);if(g==4)n.e=c.e+.15;
  n.i=Math.min(365,Math.round(n.i*10)/10);n.r=c.r+1;n.due=(today()+Math.max(1,Math.round(n.i)))*DAY+4*36e5+new Date().getTimezoneOffset()*6e4}
 n.last=NOW();return n}
const ivlTxt=c=>{if(!c.i)return '10분';const d=Math.max(1,Math.round(c.i));return d<30?d+'일':d<365?Math.round(d/30)+'개월':'1년'};
const isDue=t=>{const c=srs[t.term];return c&&c.due<=NOW()+ (today()+1)*0 ? c.due<=endOfToday():false};
function endOfToday(){return (today()+1)*DAY+4*36e5+new Date().getTimezoneOffset()*6e4}
const stage=t=>{const c=srs[t.term];if(!c)return 'new';if(!c.i||c.i<1)return 'learn';return c.i>=21?'mature':'young'};
function scopeAll(){return T.filter(t=>inDeck(t)&&(cat=='전체'||grpOf(t.cat)==cat)&&(sub=='전체'||t.cat==sub))}
function dueList(scope){return (scope||T.filter(inDeck)).filter(t=>srs[t.term]&&srs[t.term].due<endOfToday()).sort((a,b)=>srs[a.term].due-srs[b.term].due)}
function newLeft(){return Math.max(0,S.newPerDay-(H().nw||0))}
function newList(scope){const s=(scope||T.filter(inDeck)).filter(t=>!srs[t.term]);
 // exam-tested & 헷갈려요 first, then original order
 return s.sort((a,b)=>((marks[b.term]=='bad')-(marks[a.term]=='bad'))||((b.exam&&b.exam.length?1:0)-(a.exam&&a.exam.length?1:0)))}
function streak(){let d=today(),n=0;if(!(hist[d]&&hist[d].n+hist[d].rev>0))d--;while(hist[d]&&(hist[d].n+hist[d].rev)>0){n++;d--}return n}
function pushDueToSW(){try{if(!('caches' in window))return;const dues=T.filter(inDeck).map(t=>srs[t.term]&&srs[t.term].due).filter(Boolean);caches.open('gvb-meta').then(c=>c.put('./__due.json',new Response(JSON.stringify({dues,newLeft:newLeft(),at:Date.now()}))));if(navigator.setAppBadge){const n=dueList().length;n?navigator.setAppBadge(n).catch(()=>{}):navigator.clearAppBadge&&navigator.clearAppBadge().catch(()=>{})}}catch(e){}}
// ---- undo stack
const UND=[];function snap(terms,extra){UND.push({terms:terms.map(k=>[k,marks[k],srs[k]&&{...srs[k]},acc[k]&&{...acc[k]},wrong[k]&&{...wrong[k]}]),h:JSON.stringify(H()),day:today(),extra});if(UND.length>50)UND.shift()}
function undo(){const u=UND.pop();if(!u){toast('되돌릴 작업이 없어요');return}
 u.terms.forEach(([k,m,s,a,w])=>{m?marks[k]=m:delete marks[k];s?srs[k]=s:delete srs[k];a?acc[k]=a:delete acc[k];w?wrong[k]=w:delete wrong[k]});hist[u.day]=JSON.parse(u.h);if(u.extra)u.extra();save();buzz(8);toast('↩️ 되돌렸어요');render()}
// ---- TTS
function speak(txt){if(!('speechSynthesis' in window)){toast('이 브라우저는 읽어주기를 지원하지 않아요');return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(txt);u.lang='ko-KR';u.rate=S.rate||1;const v=speechSynthesis.getVoices().find(v=>/ko/i.test(v.lang));if(v)u.voice=v;speechSynthesis.speak(u)}
// ---- fuzzy Korean match
function jamo(s){let o='';for(const ch of s){const c=ch.charCodeAt(0)-0xAC00;if(c>=0&&c<11172){o+=String.fromCharCode(0x1100+((c/588)|0),0x1161+(((c%588)/28)|0));if(c%28)o+=String.fromCharCode(0x11A7+c%28)}else o+=ch}return o}
function lev(a,b){const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=Array.from({length:n+1},(_,j)=>j);for(let i=1;i<=m;i++){const q=[i];for(let j=1;j<=n;j++)q[j]=Math.min(p[j]+1,q[j-1]+1,p[j-1]+(a[i-1]==b[j-1]?0:1));p=q}return p[n]}
const ALIAS=[['쉬바야르','쉐바야르'],['슈발라르','쉐바야르'],['셰바야르','쉐바야르'],['슈바야르','쉐바야르'],['미르달','뮈르달'],['뮈르덜','뮈르달'],['스리프트','쓰리프트'],['마셜','마샬'],['맥킨더','매킨더'],['메킨더','매킨더'],['가로(garreau)','개로'],['게로','개로'],['크리스털러','크리스탈러'],['허시먼','허쉬만'],['허슈만','허쉬만'],['월러스타인','월러스틴'],['하베이','하비'],['투안','투안'],['렐프','렐프'],['버지스','버제스'],['호이트','호이트'],['베셀','베셀'],['라첼','라첼'],['스미드','스미스'],['쇤','쇤'],['숀','쇤'],['오주벨','오수벨'],['오스벨','오수벨'],['가녜','가네'],['브루너','브루너'],['브루노','브루너'],['플로리더','플로리다'],['제레피','제레피'],['게레피','제레피'],['자레피','제레피'],['크루그만','크루그먼'],['마르샬','마샬'],['감쇠설','감소설'],['생애주기','수명주기']];
const norm=s=>{s=String(s);for(const[a,b]of ALIAS)if(a!==b&&s.includes(a))s=s.split(a).join(b);return norm0(s)};
const norm0=s=>String(s).toLowerCase().replace(/\s|[·\-–_,.()（）\[\]'"’/]/g,'');
function aliases(term){const out=new Set();const base=term.replace(/\(.*?\)/g,'').trim();out.add(base);(term.match(/\((.*?)\)/g)||[]).forEach(x=>x.slice(1,-1).split(/[,/·]/).forEach(y=>y.trim()&&out.add(y.trim())));term.split(/\s*\/\s*/).forEach(x=>out.add(x.replace(/\(.*?\)/g,'')));out.add(term);try{const tt=TM.get(term);if(tt&&tt.al)tt.al.forEach(x=>out.add(x))}catch(e){}return [...out].map(norm).filter(Boolean)}
function judge(ans,t){const a=norm(ans);if(!a)return 0;const al=aliases(t.term).concat(t.en?[norm(t.en)]:[]);if(al.includes(a))return 2;const ja=jamo(a);for(const x of al){const jx=jamo(x),d=lev(ja,jx);if(d<=Math.max(1,Math.floor(jx.length*.15)))return 1}return 0}

;window.__gvStage=2;
const kw=t=>(t.keys||'').split(/,\s*/).map(x=>x.trim()).filter(Boolean);
function bigr(s){s=String(s).replace(/[^가-힣A-Za-z0-9]/g,'');const o=new Set();for(let i=0;i<s.length-1;i++)o.add(s.slice(i,i+2));return o}
// r82: 별칭 역색인(첫 일치 우선 = 기존 T.find와 같은 결과). 호출마다 전 용어 별칭을 다시 정규화하던 O(N) 탐색이 단어장 '전체 과목' 열기에서 수 초 걸리던 원인
let _fx=null,_fxN=-1;function _fidx(){if(_fx&&_fxN===T.length)return _fx;_fx=new Map();_fxN=T.length;T.forEach(t=>aliases(t.term).forEach(a=>{if(!_fx.has(a))_fx.set(a,t)}));return _fx}
const findT=n=>{if(!n)return null;return TM.get(n)||_fidx().get(norm(n))||null};
function diagTerm(R,P){if(!P||P===R)return '';if(P.stub)return `<div class="diag"><div class="dh">❌ 고른 답: ${esc(P.term)}</div>${R.dw&&R.dw[P.term]?`<div class="dh">🎯 핵심 구별</div><div>${esc(R.dw[P.term])}</div>`:''}<div class="dh">✅ 정답 ${esc(R.term)}</div><div>${esc(R.keys||R.def)}</div></div>`;const rk=kw(R),pk=kw(P);const base=s=>s.replace(/\(.*?\)/g,'').trim();
 const vsHit=(R.vs&&R.vs.includes(base(P.term)))?R.vs:(P.vs&&P.vs.includes(base(R.term)))?P.vs:'';
 const common=rk.filter(k=>pk.some(p=>p.includes(k)||k.includes(p)));
 let why=vsHit?'교과서에서 짝지어 비교하는 대표 대비 개념이에요. ':'';why+=common.length?`둘 다 ‘${esc(common[0])}’와 연결돼요. `:'';why+=R.cat==P.cat?`같은 ${esc(R.cat)} 단원 개념이라 정의 표현이 비슷해요.`:`다른 단원(${esc(R.cat)} / ${esc(P.cat)})이지만 비슷한 표현을 써요.`;
 return `<div class="diag"><div class="dh">❌ 고른 답: ${esc(P.term)}</div><div>${esc(P.def)}</div><div class="dh">↔ 정답과의 차이</div><div><b>${esc(R.term)}</b> — ${esc(rk.join(' · ')||R.def.split(/[.。]/)[0])}<br><b>${esc(P.term)}</b> — ${esc(pk.join(' · ')||P.def.split(/[.。]/)[0])}${vsHit?`<div class="mut" style="margin-top:4px">📌 ${esc(vsHit)}</div>`:''}</div>${R.dw&&R.dw[P.term]?`<div class="dh">🎯 핵심 구별</div><div>${esc(R.dw[P.term])}</div>`:''}<div class="dh">💡 왜 헷갈렸을까</div><div>${why}</div></div>`}
function tokDiff(w,a){const ta=new Set(String(a).split(/\s+/));return String(w).split(/\s+/).map(x=>ta.has(x)?esc(x):`<mark>${esc(x)}</mark>`).join(' ')}
function rationale(q,opt){if(opt==q.a)return '✅ 옳은 진술. '+esc(q.exp);if(q.why&&q.why[opt])return esc(q.why[opt]);
 const sim=[...bigr(opt)].filter(x=>bigr(q.a).has(x)).length/Math.max(1,bigr(opt).size);
 return `❌ 틀린 진술. ${sim>.45?'정답 진술과 달라진 부분: '+tokDiff(opt,q.a):'해설과 어긋나는 부분: '+tokDiff(opt,q.exp+' '+q.a)}<div class="mut" style="margin-top:4px">근거(해설): ${esc(q.exp)}</div>`}
function catsUI(){const sc=T.filter(inDeck);const c=['전체',...Object.keys(GROUPS)];
 $('#cats').innerHTML=c.map(x=>`<button class="${x==cat?'on':''}" data-c="${x}">${x} <span class="mut">${sc.filter(t=>x=='전체'||grpOf(t.cat)==x).length}</span></button>`).join('');
 const subs=cat=='전체'?[]:[...new Set(sc.filter(t=>grpOf(t.cat)==cat).map(t=>t.cat))];
 $('#subs').innerHTML=subs.length>1?['전체',...subs].map(x=>`<button class="${x==sub?'on':''}" data-s="${x}">${x}</button>`).join(''):''}
$('#cats').onclick=e=>{const b=e.target.closest('button');if(!b)return;cat=b.dataset.c;document.body.dataset.g=cat;sub='전체';idx=0;order=null;rq=null;qcur=null;catsUI();render()};
$('#subs').onclick=e=>{const b=e.target.closest('button');if(!b)return;sub=b.dataset.s;idx=0;rq=null;qcur=null;catsUI();render()};
function pool(){const q=$('#q').value.trim().toLowerCase(),f=$('#filt').value;
 let p=scopeAll().filter(t=>(!q||(t.term+' '+(t.en||'')+' '+t.def+' '+(t.keys||'')).toLowerCase().includes(q))&&(f=='all'||(f=='hard'&&marks[t.term]=='bad')||(f=='ok'&&marks[t.term]=='ok')||(f=='new'&&!marks[t.term])));
 if(order){const r=new Map(order.map((k,i)=>[k,i]));p.sort((a,b)=>(r.get(a.term)??1e9)-(r.get(b.term)??1e9))}return p}
function fillFace(p,t){$('#'+p+'fc').textContent=grpOf(t.cat)+' · '+t.cat;$('#'+p+'bc').textContent=grpOf(t.cat)+' · '+t.cat;$('#'+p+'fx').innerHTML=exTag(t)?`<span class="tag">${esc(exTag(t))}</span>`:'';$('#'+p+'ft').textContent=t.term;$('#'+p+'fe').textContent=t.en||'';$('#'+p+'bd').textContent=t.def;
 $('#'+p+'bv').innerHTML=(t.keys?`<div><b>서술 키워드</b>${esc(t.keys)}</div>`:'')+(t.vs?`<div><b>비교</b>${esc(t.vs)}</div>`:'')+(t.ex?`<div><b>사례</b>${esc(t.ex)}</div>`:'')+(t.note?`<div class="warnbox">${esc(t.note)}</div>`:'')+(t.flag?`<div class="warnbox">⚠ ${esc(t.flag)}</div>`:'')+(t.src&&/용어해설|노트|scholar/.test(t.src)?`<div class="small mut">출처: ${esc(t.src)}</div>`:'')}
function swipeable(el,onFlip,onL,onR){let sx=0,sy=0,dx=0,drag=false,moved=false;const inner=el.querySelector('.inner'),sr=el.querySelector('.stamp.r'),sl=el.querySelector('.stamp.l');
 const reset=()=>{inner.style.transform='';sr.style.opacity=sl.style.opacity=0;el.classList.remove('drag')};
 el.addEventListener('pointerdown',e=>{if(e.target.closest('button,input,textarea'))return;sx=e.clientX;sy=e.clientY;dx=0;drag=true;moved=false});
 el.addEventListener('pointermove',e=>{if(!drag)return;dx=e.clientX-sx;const dy=e.clientY-sy;if(!moved&&Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)){moved=true;el.classList.add('drag')}if(!moved)return;const f=el.classList.contains('flip')?' rotateY(180deg)':'';inner.style.transform=`translateX(${dx}px) rotate(${dx/18}deg)`+f;sr.style.opacity=Math.min(1,Math.max(0,dx/90));sl.style.opacity=Math.min(1,Math.max(0,-dx/90))});
 const end=e=>{if(!drag)return;drag=false;if(!moved){reset();if(e.type=='pointerup'&&!e.target.closest('button,input,textarea'))onFlip();return}
  if(Math.abs(dx)>90){const r=dx>0;inner.style.transform='';el.classList.remove('drag');el.classList.add(r?'fly-r':'fly-l');buzz(r?12:[10,40,10]);setTimeout(()=>{el.classList.remove('fly-r','fly-l');sr.style.opacity=sl.style.opacity=0;r?onR():onL()},260)}else reset()};
 el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)}
function renderCard(){const p=pool();if(!p.length){$('#pos').textContent='해당 카드가 없어요';$('#ft').textContent='—';$('#fe').textContent='';$('#bd').textContent='';return}
 idx=(idx+p.length)%p.length;const t=p[idx];$('#card').classList.remove('flip');$('#card').style.setProperty('--g',GC[grpOf(t.cat)]);
 $('#pos').textContent=`${idx+1} / ${p.length}`;$('#pbar').style.width=((idx+1)/p.length*100)+'%';$('#stat').textContent=`✅${p.filter(x=>marks[x.term]=='ok').length} 🤔${p.filter(x=>marks[x.term]=='bad').length}`;
 fillFace('',t);$('#bm').innerHTML=marks[t.term]?`<button class="mk ${marks[t.term]}" id="bclr">${mk(t)} ✕</button>`:'';const bc=$('#bclr');if(bc)bc.onclick=e=>{e.stopPropagation();snap([t.term]);delete marks[t.term];save();renderCard()};
 $('#ok').classList.toggle('act',marks[t.term]=='ok');$('#bad').classList.toggle('act',marks[t.term]=='bad');$('#ok').setAttribute('aria-pressed',marks[t.term]=='ok');$('#bad').setAttribute('aria-pressed',marks[t.term]=='bad');
 $('#mhint').innerHTML=(marks[t.term]?'같은 버튼을 다시 누르면 표시 해제 · ':'')+'<span class="kbdh"><span class="kbd">Space</span> 뒤집기 <span class="kbd">←</span><span class="kbd">→</span> 이동 <span class="kbd">1</span> 헷갈려요 <span class="kbd">2</span> 외웠어요 <span class="kbd">Z</span> 되돌리기</span>';
 $('#bx').textContent=t.distractors&&t.distractors.length?'⚠️ 혼동 주의: '+t.distractors.join(' · '):'';$('#bx').style.display=$('#bx').textContent?'':'none';if(S.tts)speak(t.term)}
const curCard=()=>{const p=pool();return p.length?p[(idx+p.length)%p.length]:null};
function flipCard(){$('#card').classList.toggle('flip');buzz(5);const t=curCard();if(S.tts&&t&&$('#card').classList.contains('flip'))speak(t.def)}
$('#prev').onclick=()=>{idx--;renderCard()};$('#next').onclick=()=>{idx++;renderCard()};
function markCur(v,sw){const t=curCard();if(!t)return;const i0=idx;snap([t.term],()=>{idx=i0});
 if(marks[t.term]==v&&!sw){delete marks[t.term];save();renderCard();return}marks[t.term]=v;save();buzz();
 const f=$('#filt').value;if(!(f=='new'||(f=='hard'&&v!='bad')||(f=='ok'&&v!='ok')))idx++;renderCard()}
$('#ok').onclick=()=>markCur('ok');$('#bad').onclick=()=>markCur('bad');
swipeable($('#card'),flipCard,()=>markCur('bad',1),()=>markCur('ok',1));
function renderList(){const p=pool();$('#v-list').innerHTML=`<div class="qtop"><span class="mut">${p.length}개</span><button class="sbtn" id="lback">🃏 카드로 보기</button></div>`+p.slice(0,400).map(t=>`<div class="it" style="border-left-color:${GC[grpOf(t.cat)]}"><div class="qtop" style="margin:0"><span><b>${esc(t.term)}</b> <span class="mut">${esc(t.en)}</span> ${exTag(t)?`<span class="tag">${esc(exTag(t))}</span>`:''}</span><button class="mk ${marks[t.term]||''}" data-t="${esc(t.term)}">${mk(t)||'○ 표시 없음'}</button></div><div>${esc(t.def)}</div>${t.keys?'<div class="mut">🔑 '+esc(t.keys)+'</div>':''}${t.vs?'<div class="mut">↔ '+esc(t.vs)+'</div>':''}${t.ex?'<div class="mut">📍 '+esc(t.ex)+'</div>':''}</div>`).join('')+(p.length>400?`<p class="mut">검색으로 범위를 좁히면 나머지 ${p.length-400}개도 보여요.</p>`:'');
 $('#lback').onclick=()=>{listView=false;render()}}
$('#v-list').onclick=e=>{const b=e.target.closest('.mk');if(!b)return;const k=b.dataset.t,c=marks[k],n=!c?'ok':c=='ok'?'bad':null;snap([k]);if(n)marks[k]=n;else delete marks[k];save();buzz(6);b.className='mk '+(n||'');b.textContent=n=='ok'?'✅ 외웠어요':n=='bad'?'🤔 헷갈려요':'○ 표시 없음'};

;window.__gvStage=3;
const KINDS={d2t:'정의 → 용어 인출',t2k:'용어 → 서술 키워드',cloze:'빈칸 채우기',chain:'연결 개념 인출'};
const STRIP=/(으로|에서|에게|하는|되는|하여|하며|이며|이다|으며|이나|에는|과|와|을|를|이|가|은|는|의|에|로|도)$/;
function clozeOf(t){const ks=kw(t).filter(k=>k.length>=2&&t.def.includes(k));if(ks.length)return {txt:t.def,blanks:ks.slice(0,3)};
 const toks=[...new Set(t.def.replace(/[(),.·]/g,' ').split(/\s+/).map(w=>w.replace(STRIP,'')).filter(w=>w.length>=3&&/^[가-힣]+$/.test(w)))].sort((a,b)=>b.length-a.length);return toks.length?{txt:t.def,blanks:toks.slice(0,2)}:null}
const chainCache=new Map();
function chainOf(t){if(chainCache.has(t.term))return chainCache.get(t.term);const b=s=>s.replace(/\(.*?\)/g,'').trim();const fam=[];
 const vsTxt=(t.vs||'')+' '+(t.distractors||[]).filter(d=>{const f=findT(d);return f&&f.vs&&f.vs.includes(b(t.term))}).join(' ');
 T.forEach(x=>{if(x===t||fam.includes(x))return;const n=b(x.term);if(n.length>=2&&vsTxt.includes(n))fam.push(x)});
 T.forEach(x=>{if(x!==t&&!fam.includes(x)&&x.vs&&b(t.term).length>=2&&x.vs.includes(b(t.term)))fam.push(x)});const r=fam.slice(0,4);chainCache.set(t.term,r);return r}
function pickKind(t,pref){const ok={d2t:1,t2k:kw(t).length>0,cloze:!!clozeOf(t),chain:chainOf(t).length>0};
 if(pref&&pref!='mix')return ok[pref]?pref:'d2t';const c=srs[t.term];if(!c||!c.r)return 'd2t';const o=Object.keys(ok).filter(k=>ok[k]&&k!='chain');return o[(c.r+t.term.length)%o.length]}
function kwHits(ans,t,list){const a=norm(ans),ja=jamo(a);return (list||kw(t)).map(k=>{const n=norm(k);const parts=[n,...k.split(/\s+|·/).map(norm).filter(x=>x.length>=2)];return {k,hit:!!a&&parts.some(p=>a.includes(p)||(p.length>=3&&ja.includes(jamo(p))))}})}
function recallUI(box,t,kind,onDone){const id=Math.random().toString(36).slice(2,7);let h=`<div class="qmeta"><span class="pill">${KINDS[kind]}</span><span>${esc(grpOf(t.cat))} · ${esc(t.cat)}</span>${exTag(t)?`<span class="tag">${esc(exTag(t))}</span>`:''}</div>`;
 if(kind=='d2t')h+=`<div class="qq">${maskDef(t)}</div><input class="inp rin" id="a${id}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="용어를 떠올려 입력" style="width:100%">`;
 else if(kind=='t2k')h+=`<div class="qq" style="font-size:28px;text-align:center">${esc(t.term)}</div><p class="mut" style="text-align:center;margin-top:-8px">서술 핵심 키워드 ${kw(t).length}개를 떠올려 쓰세요</p><textarea class="inp rin" id="a${id}" placeholder="키워드1, 키워드2 …"></textarea>`;
 else if(kind=='cloze'){const c=clozeOf(t);let s=esc(c.txt);c.blanks.forEach((b,i)=>{s=s.replace(esc(b),`<input class="blank rin" data-b="${i}" autocomplete="off" size="${Math.max(4,b.length+2)}" aria-label="빈칸 ${i+1}">`)});h+=`<div class="qq">${esc(t.term)}</div><div style="line-height:2.3">${s}</div>`}
 else{const fam=chainOf(t);h+=`<div class="qq" style="font-size:26px;text-align:center">${esc(t.term)}</div><p class="mut" style="text-align:center;margin-top:-8px">비교·연결되는 개념 ${fam.length}개를 떠올려 쓰세요</p><textarea class="inp rin" id="a${id}" placeholder="연결 개념"></textarea>`}
 const mic=('webkitSpeechRecognition' in window||'SpeechRecognition' in window)&&kind!='cloze';
 h+=`<div class="row" style="margin-top:10px"><button class="pbtn" id="chk${id}" style="flex:1;margin:0">확인</button>${mic?`<button class="sbtn" id="mic${id}" aria-label="말로 답하기">🎤</button>`:''}<button class="sbtn" id="skp${id}">모르겠어요</button></div><div id="res${id}"></div>`;
 box.innerHTML=h;const first=box.querySelector('.rin');if(first&&matchMedia('(hover:hover)').matches)setTimeout(()=>first.focus({preventScroll:true}),30);
 let done=false;const check=skip=>{if(done)return;done=true;let score=0,body='';const v=skip?'':($('#a'+id)?$('#a'+id).value:'');if($('#a'+id))$('#a'+id).readOnly=true;
  if(kind=='d2t'){const j=judge(v,t);score=j?1:0;$('#a'+id).classList.add(j?'right':'wrong');const P=!j&&v?findT(v):null;
   body=`<div class="exp ${j?'okx':'badx'}"><b>${j==2?'🎉 정답!':j==1?'👍 거의 정답(오타 허용):':'정답:'} ${esc(t.term)} ${t.en?'<span class="mut">'+esc(t.en)+'</span>':''}</b>${t.keys?'🔑 '+esc(t.keys):''}${t.vs?'<div class="mut">↔ '+esc(t.vs)+'</div>':''}${P?diagTerm(t,P):(v&&!j?'<div class="mut">입력: '+esc(v)+'</div>':'')}</div>`}
  else if(kind=='t2k'){const hs=kwHits(v,t);const n=hs.filter(x=>x.hit).length;score=n/Math.max(1,hs.length);body=`<div class="exp ${score>=.67?'okx':score?'':'badx'}"><b>키워드 ${n}/${hs.length} 인출</b>${hs.map(x=>`<span class="pill" style="margin:2px;background:${x.hit?'var(--oks)':'var(--bads)'}">${x.hit?'✓':'✗'} ${esc(x.k)}</span>`).join('')}<div style="margin-top:6px">${esc(t.def)}</div>${t.vs?'<div class="mut">↔ '+esc(t.vs)+'</div>':''}</div>`}
  else if(kind=='chain'){const fam=chainOf(t);const hs=fam.map(f=>({f,hit:!!v&&aliases(f.term).some(a=>a.length>=2&&norm(v).includes(a))}));const n=hs.filter(x=>x.hit).length;score=n/Math.max(1,hs.length);body=`<div class="exp ${score>=.5?'okx':'badx'}"><b>연결 개념 ${n}/${hs.length}</b>${hs.map(x=>`<div>${x.hit?'✓':'✗'} <b>${esc(x.f.term)}</b> — ${esc(kw(x.f).join(' · ')||x.f.def)}</div>`).join('')}${t.vs?'<div class="mut" style="margin-top:4px">📌 '+esc(t.vs)+'</div>':''}${t.ex?'<div class="mut">📍 '+esc(t.ex)+'</div>':''}</div>`}
  else{const c=clozeOf(t);let hit=0;const mine=[];box.querySelectorAll('.blank').forEach(b=>{const k=c.blanks[+b.dataset.b];const ok=!skip&&!!b.value.trim()&&(norm(b.value)==norm(k)||lev(jamo(norm(b.value)),jamo(norm(k)))<=1);if(ok)hit++;b.classList.add(ok?'right':'wrong');b.readOnly=true;if(!ok){if(b.value.trim())mine.push(`<div class="myans">빈칸 ${+b.dataset.b+1} 내 답: <s>${esc(b.value)}</s></div>`);b.value=k;b.size=Math.max(b.size,k.length+2)}});score=hit/c.blanks.length;body=`${mine.join('')}<div class="exp ${score==1?'okx':score?'':'badx'}"><b>빈칸 ${hit}/${c.blanks.length}</b>${t.keys?'🔑 '+esc(t.keys):''}</div>`}
  const r=$('#chk'+id).parentNode;r.remove();$('#res'+id).innerHTML=body;buzz(score>=.67?12:[10,40,10]);box.classList.add(score>=.67?'pop':'shake');setTimeout(()=>box.classList.remove('pop','shake'),400);
  onDone({score,auto:score>=1?3:score>=.67?3:score>0?2:1,v})};
 $('#chk'+id).onclick=()=>check(false);$('#skp'+id).onclick=()=>check(true);
 box.querySelectorAll('.rin').forEach(el=>el.addEventListener('keydown',e=>{if(e.key=='Enter'&&!(el.tagName=='TEXTAREA'&&e.shiftKey)&&!e.isComposing){e.preventDefault();e.stopPropagation();const ins=[...box.querySelectorAll('.blank')];const i=ins.indexOf(el);if(i>=0&&i<ins.length-1){ins[i+1].focus();return}check(false)}}));
 const mb=$('#mic'+id);if(mb)mb.onclick=()=>{try{const R=window.SpeechRecognition||window.webkitSpeechRecognition;const r=new R();r.lang='ko-KR';mb.textContent='⏺';r.onresult=e=>{const tg=box.querySelector('.rin');tg.value=(tg.value?tg.value+' ':'')+e.results[0][0].transcript};r.onend=()=>mb.textContent='🎤';r.onerror=()=>{mb.textContent='🎤';toast('음성 인식을 쓸 수 없어요')};r.start()}catch(e){toast('음성 인식을 쓸 수 없어요')}};
 return check}
// ---- review session = recall-driven SRS
let rq=null,rdone=0,rkind={};
function buildQueue(){const sc=scopeAll();rq=dueList(sc).map(t=>t.term).concat(newList(sc).slice(0,newLeft()).map(t=>t.term));rdone=0}
const GL=[['다시',1,'g1'],['어려움',2,'g2'],['알았음',3,'g3'],['쉬움',4,'g4']];
function renderReview(){if(!rq)buildQueue();const t=rq.length?TM.get(rq[0]):null;$('#rwrap').classList.toggle('hide',!t);$('#rdone').classList.toggle('hide',!!t);
 if(!t){$('#rdone').innerHTML=`<div style="text-align:center;padding:10px 0"><div style="font-size:54px">🎉</div><h2>오늘 인출 세션 완료!</h2><p class="mut">${rdone?rdone+'장 인출 · ':''}연속 ${streak()}일째 🔥${cat!='전체'?'<br>전체 범위 남은 복습: '+dueList().length+'장':''}</p><div class="row" style="justify-content:center"><button class="sbtn" id="rmore">새 카드 ${S.newPerDay}장 더</button><button class="sbtn" id="rpass">📝 지문형 서술</button><button class="sbtn" id="rwr">📒 오답노트</button></div></div>`;
  $('#rmore').onclick=()=>{H().nw=Math.max(0,(H().nw||0)-S.newPerDay);rq=null;save();renderReview()};$('#rpass').onclick=()=>{qmode='passage';go('quiz')};$('#rwr').onclick=()=>{qmode='wrong';go('quiz')};return}
 const nNew=rq.filter(k=>!srs[k]).length;$('#rpos').textContent=`남은 ${rq.length}`;$('#rcnt').innerHTML=`<span style="color:var(--acc)">새 ${nNew}</span> · <span style="color:var(--ok)">복습 ${rq.length-nNew}</span>`;$('#rbar').style.width=(rdone/(rdone+rq.length)*100)+'%';
 const kind=rkind[t.term]||(rkind[t.term]=pickKind(t,S.rmode));$('#rctl').innerHTML='';
 const box=$('#rbox');box.style.borderTop='6px solid '+GC[grpOf(t.cat)];
 recallUI(box,t,kind,res=>{const c=srs[t.term];$('#rctl').innerHTML=`<p class="mut" style="margin:10px 0 6px;text-align:center">자기 평가 (자동 추천: <b>${GL[res.auto-1][0]}</b>) <span class="kbdh">· <span class="kbd">1</span>~<span class="kbd">4</span> / <span class="kbd">Enter</span>=추천</span></p><div class="grades">${GL.map(([n,g,cl])=>`<button class="${cl}${g==res.auto?' rec':''}" data-g="${g}">${n}<small>${ivlTxt(sched(c,g))}</small></button>`).join('')}</div>`;
  $('#rctl').dataset.auto=res.auto;$('#rctl').querySelectorAll('button').forEach(b=>b.onclick=()=>grade(+b.dataset.g,res));if(S.tts)speak(t.term)});}
function grade(g,res){const k=rq[0];if(!k)return;const wasNew=!srs[k];const q0=rq.slice(),rd=rdone;snap([k],()=>{rq=q0;rdone=rd});
 srs[k]=sched(srs[k],g);const h=H();if(wasNew)h.nw=(h.nw||0)+1;h.rev++;record(k,g>=3,'인출');if(g==1&&!marks[k])marks[k]='bad';
 delete rkind[k];rq.shift();if(g==1)rq.splice(Math.min(3,rq.length),0,k);else rdone++;save();buzz(g==1?[10,40,10]:10);renderReview();navBadge();window.scrollTo({top:0,behavior:'smooth'})}

;window.__gvStage=4;
// ---- quiz hub
const PSG=JSON.parse($('#psg').textContent);
let qmode=S.qmode||'recall',qcur=null,qs={n:0,c:0};
const QM=[['recall','🧠 정의→용어','인출 · 타이핑/음성'],['t2k','🔑 서술 키워드','용어 보고 키워드 인출'],['cloze','✍️ 빈칸 채우기','정의 속 핵심어'],['chain','🔗 연결 개념','비교·짝 개념 인출'],['passage','📝 지문형 서술','기출 형식 ㉠㉡ + 서술'],['mcq','☑️ 용어 객관식','오답 진단 포함'],['concept','📋 개념 5지선다','선지별 해설'],['mock','⏱️ 모의고사','시간 제한 실전'],['wrong','📒 오답노트','틀린 것만 다시']];
function qpool(){return pool().filter(t=>t.def)}
function renderQuiz(){$('#qmodes').innerHTML=QM.map(([k,n,d])=>`<button data-q="${k}" class="${k==qmode?'on':''}">${n}${k=='wrong'?` <span class="pill">${Object.keys(wrong).length+Object.keys(wrongq).length}</span>`:''}<small>${d}</small></button>`).join('');
 $('#qscore').textContent=qs.n?`정답 ${qs.c}/${qs.n}`:'';$('#qinfo').textContent='';{const _sf=document.getElementById('sfq');if(_sf)_sf.innerHTML=''}
 ({recall:()=>qRecall('d2t'),t2k:()=>qRecall('t2k'),cloze:()=>qRecall('cloze'),chain:()=>qRecall('chain'),passage:qPassage,mcq:qMcq,concept:qConcept,mock:qMock,wrong:qWrong})[qmode]()}
$('#qmodes').onclick=e=>{const b=e.target.closest('button');if(!b)return;qmode=b.dataset.q;S.qmode=qmode;qcur=null;qs={n:0,c:0};clearInterval(mockT);save();render()};
const nextBtn=(fn,txt='다음 문제')=>{const b=document.createElement('button');b.className='nextb';b.id='qn';b.textContent=txt;b.onclick=fn;$('#qbox').appendChild(b);if(matchMedia('(hover:hover)').matches)b.focus({preventScroll:true})};
function pickT(p,filter){const c=p.filter(filter||(()=>1));if(!c.length)return null;// weight: wrong/bad first
 const w=c.map(t=>1+(wrong[t.term]?4:0)+(marks[t.term]=='bad'?2:0)+(acc[t.term]?0:1));let r=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<c.length;i++){r-=w[i];if(r<=0)return c[i]}return c[0]}
function qRecall(kind){const p=qpool();const f={d2t:null,t2k:t=>kw(t).length,cloze:t=>clozeOf(t),chain:t=>chainOf(t).length}[kind];const t=pickT(p,f);if(!t){$('#qbox').innerHTML='<p>이 범위에 해당 문제가 없어요. 과목/덱을 바꿔 보세요.</p>';return}
 recallUI($('#qbox'),t,kind,res=>{qs.n++;if(res.score>=.67)qs.c++;snap([t.term]);record(t.term,res.score>=.67,KINDS[kind]);
  // recall results also feed SRS for cards already in rotation
  if(srs[t.term]&&srs[t.term].due<=endOfToday())srs[t.term]=sched(srs[t.term],res.auto);save();$('#qscore').textContent=`정답 ${qs.c}/${qs.n}`;nextBtn(()=>qRecall(kind))})}
function optsFor(t,dir){let ds=(t.distractors||[]).map(n=>findT(n)||(dir!='t2d'?{term:n,def:'',cat:t.cat,stub:1}:null)).filter(x=>x&&x!==t).slice(0,3);if(ds.length<3){const same=shuffle(T.filter(x=>x.cat==t.cat&&x!==t&&!ds.includes(x)));while(ds.length<3&&same.length)ds.push(same.shift())}return shuffle([t,...ds])}
function qMcq(){const p=qpool();const t=pickT(p);if(!t){$('#qbox').textContent='해당 카드가 없어요.';return}const dir=S.qdir||'d2t';const opts=optsFor(t,dir);
 $('#qbox').innerHTML=`<div class="qtop"><span class="qmeta">${esc(grpOf(t.cat))} · ${esc(t.cat)} ${exTag(t)?'<span class=tag>'+esc(exTag(t))+'</span>':''}</span><select id="qdir" class="inp" style="min-height:38px"><option value="d2t">정의 → 용어</option><option value="t2d">용어 → 정의</option></select></div><div class="qq" style="${dir=='t2d'?'font-size:28px':''}">${dir=='t2d'?esc(t.term):maskDef(t)}</div>`+opts.map((o,i)=>`<button class="opt" data-i="${i}"><span class=n>${i+1}</span><span>${esc(dir=='t2d'?o.def:o.term)}</span></button>`).join('')+`<div id="qfb"></div>`;
 $('#qdir').value=dir;$('#qdir').onchange=e=>{S.qdir=e.target.value;save();qMcq()};
 $('#qbox').querySelectorAll('.opt').forEach(b=>b.onclick=()=>{if($('#qbox').dataset.done==t.term)return;$('#qbox').dataset.done=t.term;const o=opts[b.dataset.i],ok=o===t;qs.n++;if(ok)qs.c++;snap([t.term]);record(t.term,ok,'용어 객관식');if(!ok){wrong[t.term].pick=o.term;if(!marks[t.term])marks[t.term]='bad'}save();buzz(ok?12:[10,40,10]);
  $('#qbox').querySelectorAll('.opt').forEach((x,i)=>{if(opts[i]===t)x.classList.add('right');else if(x==b)x.classList.add('wrong')});
  $('#qfb').innerHTML=`<div class="exp ${ok?'okx':'badx'}"><b>${ok?'🎉 정답':'😥 오답'} — ${esc(t.term)}</b>${esc(t.def)}${t.keys?'<div>🔑 '+esc(t.keys)+'</div>':''}${ok?'':diagTerm(t,o)}</div>`;$('#qscore').textContent=`정답 ${qs.c}/${qs.n}`;nextBtn(()=>{delete $('#qbox').dataset.done;qMcq()})})}
const mcqScope=()=>MCQ0.filter(q=>(deck=='all'||q.core)&&(cat=='전체'||q.subj==cat)&&sfOk(q));
function mcqHTML(q,opts,name){return `<div class="qmeta"><span class=tag>관련 기출 ${esc(q.src)}</span><span>${esc(q.subj)}</span></div><div class="qq">${esc(q.q)}</div>`+opts.map((o,i)=>`<button class="opt" data-i="${i}" data-n="${name}"><span class=n>${i+1}</span><span>${esc(o)}</span></button>`).join('')}
function revealMcq(box,q,opts,pick){box.querySelectorAll('.opt').forEach((x,i)=>{if(opts[i]==q.a)x.classList.add('right');else if(i==pick)x.classList.add('wrong')});const ok=opts[pick]==q.a;
 return `<div class="exp ${ok?'okx':'badx'}"><b>${ok?'🎉 정답':'😥 오답'} · 해설</b>${esc(q.exp)}${ok?'':`<div class="diag"><div class="dh">고른 선지 진단</div>${rationale(q,opts[pick])}</div>`}<details><summary>선지별 해설 모두 보기</summary>${opts.map((o,i)=>`<div class="rv"><span class="ic">${i+1}</span><div><div>${esc(o)}</div><div class="mut">${rationale(q,o)}</div></div></div>`).join('')}</details></div>`}
function qConcept(){const L=mcqScope();if(!L.length){$('#qbox').textContent='해당 문제가 없어요.';return}const w=L.filter(q=>wrongq[q.id]);const q=(w.length&&Math.random()<.35)?w[Math.random()*w.length|0]:L[Math.random()*L.length|0];const opts=shuffle([q.a,...q.wrong]);
 $('#qbox').innerHTML=mcqHTML(q,opts,'c')+'<div id="mfb"></div>';$('#qbox').querySelectorAll('.opt').forEach(b=>b.onclick=()=>{if($('#qbox').dataset.done==q.id)return;$('#qbox').dataset.done=q.id;const i=+b.dataset.i,ok=opts[i]==q.a;qs.n++;if(ok)qs.c++;const h=H();h.n++;if(ok)h.c++;
  window._pick=opts[i];plMark('q:'+q.id,ok);if(!ok)wrongq[q.id]={n:((wrongq[q.id]||{}).n||0)+1,pick:opts[i],at:Date.now(),ok:0};else if(wrongq[q.id]){wrongq[q.id].ok=(wrongq[q.id].ok||0)+1;if(wrongq[q.id].ok>=2){delete wrongq[q.id];toast('오답노트에서 졸업 🎓')}}save();buzz(ok?12:[10,40,10]);
  $('#mfb').innerHTML=revealMcq($('#qbox'),q,opts,i);$('#qscore').textContent=`정답 ${qs.c}/${qs.n}`;nextBtn(()=>{delete $('#qbox').dataset.done;qConcept()})})}
// ---- 지문형 서술
const psgScope=()=>PSG.filter(p=>(cat=='전체'||p.subj==cat)&&sfOk(p));
function passageUI(box,p,onDone,mock){const id='p'+Math.random().toString(36).slice(2,6);
 box.innerHTML=`<div class="psplit"><div class="pl"><div class="qmeta"><span class="pill">📝 지문형 서술</span><span>${esc(p.subj)} · ${esc(p.cat)}</span><span class="tag">${esc(p.type||'서술형')}</span>${p.flag?`<div class="warnbox">⚠ ${esc(p.flag)}</div>`:""}</div><div class="psg" style="margin-top:10px">${esc(p.text)}</div>${figHtml(p)}${p.src?`<details class="fold"><summary>출처</summary>${esc(p.src)}</details>`:""}</div><div class="pr">
 <h3>① 빈칸에 들어갈 용어</h3>${p.blanks.map((b,i)=>`<div class="row" style="margin:6px 0"><b style="min-width:28px">${esc(b.l)}</b><input class="inp rin" data-i="${i}" style="flex:1" autocomplete="off" placeholder="용어"></div>`).join('')}
 <h3>② ${esc(p.task)}</h3><textarea class="inp" id="${id}w" placeholder="원리·과정·이유를 1~3문장으로 서술"></textarea>
 ${mock?'':`<button class="pbtn" id="${id}c">채점하고 모범 답안 보기</button>`}<div id="${id}r"></div></div></div>`;
 const grade=()=>{const ins=[...box.querySelectorAll('.rin')];let bh=0;const bl=p.blanks.map((b,i)=>{const v=ins[i].value;const ok=!!v.trim()&&b.a.some(a=>{const n=norm(a),x=norm(v);return n==x||lev(jamo(n),jamo(x))<=Math.max(1,Math.floor(jamo(n).length*.12))});ins[i].classList.add(ok?'right':'wrong');ins[i].readOnly=true;if(!ok){ins[i].value=b.a[0];const rw=ins[i].closest('.row');if(rw&&!rw.nextElementSibling?.classList.contains('myans'))rw.insertAdjacentHTML('afterend',`<div class="myans" style="margin-left:36px">내 답: ${v.trim()?'<s>'+esc(v)+'</s>':'(빈칸)'}</div>`)}if(ok)bh++;return {b,v,ok}});
  const w=$('#'+id+'w').value;$('#'+id+'w').readOnly=true;const rh=kwHits(w,null,p.rubric);const rn=rh.filter(x=>x.hit).length;
  let hl=esc(w);p.rubric.forEach(k=>{k.split(/\s+|·/).filter(x=>x.length>=2).forEach(x=>{hl=hl.split(esc(x)).join('<mark>'+esc(x)+'</mark>')})});
  const score=(bh/p.blanks.length)*.5+(rn/Math.max(1,p.rubric.length))*.5;
  const wa=bl.filter(x=>!x.ok&&x.v.trim()).map(x=>{const m=(p.wrongs||[]).find(z=>norm(z.a)==norm(x.v));const P=findT(x.v),R=findT(x.b.a[0]);return `<div class="diag"><div class="dh">❌ ${esc(x.b.l)}에 쓴 답: ${esc(x.v)}</div>${m?esc(m.why):(P&&R?diagTerm(R,P):'정답 용어와 다른 개념이에요.')}</div>`}).join('');
  $('#'+id+'r').innerHTML=`<div class="exp ${score>=.75?'okx':score>=.4?'':'badx'}"><b>용어 ${bh}/${p.blanks.length} · 채점 키워드 ${rn}/${p.rubric.length}</b>${bl.map(x=>`<div>${x.ok?'✓':'✗'} ${esc(x.b.l)} <b>${esc(x.b.a[0])}</b>${x.b.a.length>1?' <span class="mut">(인정: '+esc(x.b.a.slice(1).join(', '))+')</span>':''}</div>`).join('')}
  <div class="dh" style="margin-top:8px;font-weight:800">모범 답안</div><div>${esc(p.model)}</div>
  <div class="dh" style="margin-top:8px;font-weight:800">채점 키워드</div><div>${rh.map(x=>`<span class="pill" style="margin:2px;background:${x.hit?'var(--oks)':'var(--bads)'}">${x.hit?'✓':'✗'} ${esc(x.k)}</span>`).join('')}</div>
  ${w.trim()?`<div class="dh" style="margin-top:8px;font-weight:800">내 답안 (일치 키워드 표시)</div><div>${hl}</div>`:''}
  ${wa}${(p.wrongs||[]).length?`<details><summary>자주 하는 오답과 이유</summary>${p.wrongs.map(z=>`<div class="rv"><span class="ic">⚠️</span><div><b>${esc(z.a)}</b><div class="mut">${esc(z.why)}</div></div></div>`).join('')}</details>`:''}</div>`;
  const c=$('#'+id+'c');if(c)c.remove();return {score,bh,rn}};
 const c=$('#'+id+'c');if(c)c.onclick=()=>{const r=grade();onDone(r)};return grade}
function qPassage(){const L=psgScope();if(!L.length){$('#qbox').innerHTML='<p>이 과목의 지문형 문항이 없어요.</p>';return}const w=L.filter(p=>wrongq[p.id]);const p=(w.length&&Math.random()<.35)?w[Math.random()*w.length|0]:L[Math.random()*L.length|0];
 $('#qinfo').textContent=`지문형 ${L.length}문항`;passageUI($('#qbox'),p,r=>{qs.n++;const ok=r.score>=.75;if(ok)qs.c++;const h=H();h.n++;if(ok)h.c++;
  p.rel&&p.rel.forEach(n=>{const t=findT(n);if(t){record(t.term,ok,'지문형');if(!ok&&wrong[t.term])wrong[t.term].pick='지문형 '+p.id}});
  plMark('p:'+p.id,ok);if(!ok)wrongq[p.id]={n:((wrongq[p.id]||{}).n||0)+1,at:Date.now(),ok:0,psg:1};else if(wrongq[p.id]&&++wrongq[p.id].ok>=2)delete wrongq[p.id];
  $('#qbox').insertAdjacentHTML('beforeend',`<p class="mut" style="text-align:center;margin:12px 0 6px">자기 평가로 관련 용어 복습 일정에 반영</p><div class="grades">${GL.map(([n,g,cl])=>`<button class="${cl}" data-g="${g}">${n}</button>`).join('')}</div>`);
  $('#qbox').querySelectorAll('.grades button').forEach(b=>b.onclick=()=>{const g=+b.dataset.g;(p.rel||[]).forEach(n=>{const t=findT(n);if(t)srs[t.term]=sched(srs[t.term],g)});if(g<=2&&!wrongq[p.id])wrongq[p.id]={n:1,at:Date.now(),ok:0,psg:1};save();toast('관련 용어 복습 일정에 반영했어요');qPassage();window.scrollTo({top:0})});
  save();$('#qscore').textContent=`통과 ${qs.c}/${qs.n}`})}

;window.__gvStage=5;
// ---- mock exam
let mockT=null,mock=null;
function qMock(){clearInterval(mockT);if(mock&&mock.active)return drawMock();
 $('#qbox').innerHTML=`<h2>⏱️ 모의고사</h2><p class="mut">현재 덱·과목 범위에서 출제해요. 시험 중에는 정답을 보여주지 않고, 끝난 뒤 문항별로 채점·해설·오답노트 저장을 해요.</p>
 <div class="modes"><button data-k="psg6">📝 지문형 6문항<small>문항당 4분 · 24분</small></button><button data-k="mix20">🧠 인출+개념 20문항<small>문항당 60초 · 20분</small></button><button data-k="con10">📋 개념 5지선다 10문항<small>문항당 90초 · 15분</small></button></div>
 ${mocks.length?`<h3>최근 기록</h3>${mocks.slice(-5).reverse().map(m=>`<div class="rv"><span class="ic">📄</span><div><b>${esc(m.name)}</b> ${m.score}점 <span class="mut">${new Date(m.at).toLocaleDateString('ko-KR')} · ${Math.round(m.sec/60)}분</span></div></div>`).join('')}`:''}`;
 $('#qbox').querySelectorAll('.modes button').forEach(b=>b.onclick=()=>startMock(b.dataset.k))}
function startMock(k){let items=[],per=60,name='';
 if(k=='psg6'){items=shuffle(psgScope()).slice(0,6).map(p=>({t:'p',p}));per=240;name='지문형 6문항'}
 else if(k=='con10'){items=shuffle(mcqScope()).slice(0,10).map(q=>({t:'c',q,opts:shuffle([q.a,...q.wrong])}));per=90;name='개념 5지선다 10문항'}
 else{const ts=shuffle(qpool()).slice(0,12).map(t=>({t:'r',term:t.term}));const cs=shuffle(mcqScope()).slice(0,8).map(q=>({t:'c',q,opts:shuffle([q.a,...q.wrong])}));items=shuffle(ts.concat(cs));per=60;name='인출+개념 20문항'}
 if(!items.length){toast('이 범위에 문항이 없어요');return}
 mock={active:1,name,items,i:0,ans:[],end:Date.now()+items.length*per*1000,start:Date.now()};drawMock()}
function drawMock(){const m=mock;clearInterval(mockT);const it=m.items[m.i];const box=$('#qbox');
 const top=`<div class="qtop"><b>${esc(m.name)} · ${m.i+1}/${m.items.length}</b><span class="timer" id="mt"></span></div><div class="bar" style="margin-bottom:12px"><i style="width:${m.i/m.items.length*100}%"></i></div>`;
 const tick=()=>{const s=Math.max(0,Math.round((m.end-Date.now())/1000));const el=$('#mt');if(el){el.textContent=`⏳ ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;el.classList.toggle('low',s<60)}if(s<=0){clearInterval(mockT);toast('시간 종료! 채점할게요');finishMock()}};
 if(it.t=='r'){const t=TM.get(it.term);box.innerHTML=top+`<div class="qmeta"><span class="pill">정의 → 용어</span></div><div class="qq">${maskDef(t)}</div><input class="inp rin" id="ma" style="width:100%" autocomplete="off" placeholder="용어">`;const i=$('#ma');i.value=m.ans[m.i]||'';i.onkeydown=e=>{if(e.key=='Enter'&&!e.isComposing){e.preventDefault();nx()}};if(matchMedia('(hover:hover)').matches)i.focus()}
 else if(it.t=='c'){box.innerHTML=top+mcqHTML(it.q,it.opts,'m');box.querySelectorAll('.opt').forEach(b=>{if(m.ans[m.i]==+b.dataset.i)b.classList.add('sel');b.onclick=()=>{m.ans[m.i]=+b.dataset.i;box.querySelectorAll('.opt').forEach(x=>x.classList.toggle('sel',x==b));buzz(6)}})}
 else{const d=document.createElement('div');box.innerHTML=top;box.appendChild(d);it.g=passageUI(d,it.p,null,true);if(m.ans[m.i]){d.querySelectorAll('.rin').forEach((x,j)=>x.value=m.ans[m.i].b[j]||'');d.querySelector('textarea').value=m.ans[m.i].w||''}}
 box.insertAdjacentHTML('beforeend',`<div class="row" style="margin-top:12px"><button class="sbtn" id="mp" ${m.i?'':'disabled'}>◀ 이전</button><button class="pbtn" id="mn" style="flex:1;margin:0">${m.i==m.items.length-1?'제출하고 채점':'다음 ▶'}</button></div><p class="mut" style="text-align:center"><button class="sbtn" id="mq">시험 중단</button></p>`);
 const keep=()=>{if(it.t=='r')m.ans[m.i]=$('#ma').value;if(it.t=='p')m.ans[m.i]={b:[...box.querySelectorAll('.rin')].map(x=>x.value),w:box.querySelector('textarea').value}};
 const nx=()=>{keep();if(m.i<m.items.length-1){m.i++;drawMock()}else{if(confirm('제출하고 채점할까요?'))finishMock()}};
 $('#mn').onclick=nx;$('#mp').onclick=()=>{keep();m.i--;drawMock()};$('#mq').onclick=()=>{if(confirm('모의고사를 중단할까요? 기록은 저장되지 않아요.')){mock=null;clearInterval(mockT);qMock()}};m.keep=keep;
 tick();mockT=setInterval(tick,1000)}
function finishMock(){const m=mock;if(!m)return;try{m.keep&&m.keep()}catch(e){}clearInterval(mockT);m.active=0;let pts=0;const box=$('#qbox');let rows='';
 m.items.forEach((it,i)=>{const a=m.ans[i];let ok=false,html='';
  if(it.t=='r'){const t=TM.get(it.term);const j=judge(a||'',t);ok=!!j;record(t.term,ok,'모의고사');const P=!ok&&a?findT(a):null;html=`<b>${esc(t.def.slice(0,60))}…</b><div>정답 <b>${esc(t.term)}</b> · 내 답 ${esc(a||'(무응답)')}</div>${P?diagTerm(t,P):''}`;pts+=ok?1:0}
  else if(it.t=='c'){ok=it.opts[a]==it.q.a;if(!ok)wrongq[it.q.id]={n:((wrongq[it.q.id]||{}).n||0)+1,pick:it.opts[a],at:Date.now(),ok:0};const h=H();h.n++;if(ok)h.c++;html=`<b>${esc(it.q.q)}</b><div>정답: ${esc(it.q.a)}</div>${ok?'':`<div class="mut">내 선택: ${esc(a==null?'(무응답)':it.opts[a])}</div><div class="mut">${a==null?esc(it.q.exp):rationale(it.q,it.opts[a])}</div>`}`;pts+=ok?1:0}
  else{const d=document.createElement('div');passageUI(d,it.p,null,true);d.querySelectorAll('.rin').forEach((x,j)=>x.value=(a&&a.b[j])||'');d.querySelector('textarea').value=(a&&a.w)||'';const g=passageUI.lastGrade;// regrade
   const r=(function(){const ins=[...d.querySelectorAll('.rin')];const bh=it.p.blanks.filter((b,j)=>ins[j].value.trim()&&b.a.some(x=>lev(jamo(norm(x)),jamo(norm(ins[j].value)))<=1)).length;const rn=kwHits((a&&a.w)||'',null,it.p.rubric).filter(x=>x.hit).length;return (bh/it.p.blanks.length)*.5+(rn/it.p.rubric.length)*.5})();
   ok=r>=.75;pts+=r;if(!ok)wrongq[it.p.id]={n:((wrongq[it.p.id]||{}).n||0)+1,at:Date.now(),ok:0,psg:1};html=`<b>${esc(it.p.cat)} 지문형</b> <span class="pill">${Math.round(r*100)}%</span><div>정답: ${it.p.blanks.map(b=>esc(b.l+' '+b.a[0])).join(', ')}</div><div class="mut">모범 답안: ${esc(it.p.model)}</div>`}
  rows+=`<div class="rv"><span class="ic">${ok?'⭕':'❌'}</span><div>${html}</div></div>`});
 const score=Math.round(pts/m.items.length*100),sec=Math.round((Date.now()-m.start)/1000);mocks.push({name:m.name,score,at:Date.now(),sec});save();mock=null;
 box.innerHTML=`<div style="text-align:center"><div style="font-size:46px;font-weight:800;color:${score>=80?'var(--ok)':score>=60?'var(--warn)':'var(--bad)'}">${score}점</div><p class="mut">${esc(m.name)} · ${Math.floor(sec/60)}분 ${sec%60}초 · 틀린 문항은 오답노트에 저장했어요</p></div><h3>문항별 리뷰</h3>${rows}`;nextBtn(()=>qMock(),'모의고사 홈으로')}
// ---- wrong-answer notebook
function qWrong(){const wt=Object.entries(wrong).map(([k,v])=>({t:TM.get(k),v})).filter(x=>x.t).sort((a,b)=>b.v.n-a.v.n);const wq=Object.entries(wrongq).map(([k,v])=>({q:MCQ0.find(q=>q.id==k)||PSG.find(p=>p.id==k),v,k})).filter(x=>x.q);
 if(!wt.length&&!wq.length){$('#qbox').innerHTML='<div style="text-align:center"><div style="font-size:48px">📒</div><h2>오답노트가 비어 있어요</h2><p class="mut">퀴즈·인출·모의고사에서 틀린 용어와 문항이 진단과 함께 자동으로 모여요. 2번 연속 맞히면 졸업해요.</p></div>';return}
 $('#qbox').innerHTML=`<div class="qtop"><h2 style="margin:0">📒 오답노트</h2><button class="pbtn" id="wgo" style="width:auto;padding:0 18px;margin:0">틀린 용어 인출 다시 풀기</button></div><p class="mut">용어 ${wt.length} · 문항 ${wq.length} · 2번 연속 맞히면 자동 졸업</p>`+
 wt.map(({t,v})=>{const P=v.pick&&findT(v.pick);return `<div class="rv"><span class="ic">✗${v.n}</span><div style="flex:1"><b>${esc(t.term)}</b> <span class="mut">${esc(v.src||'')} · 연속 정답 ${v.ok||0}/2</span><div>${esc(t.def)}</div>${t.keys?'<div class="mut">🔑 '+esc(t.keys)+'</div>':''}${P&&P!==t?`<details><summary>진단: ‘${esc(P.term)}’와 혼동</summary>${diagTerm(t,P)}</details>`:''}</div><button class="sbtn" data-del="${esc(t.term)}" aria-label="삭제">✕</button></div>`}).join('')+
 wq.map(({q,v,k})=>`<div class="rv"><span class="ic">✗${v.n}</span><div style="flex:1"><b>${esc(q.q||q.task||'')}</b>${q.text?`<div class="mut">${esc(q.text.slice(0,80))}…</div><div>정답: ${q.blanks.map(b=>esc(b.l+' '+b.a[0])).join(', ')}</div>`:`<div>정답: ${esc(q.a)}</div>${v.pick?`<details><summary>내가 고른 선지 진단</summary><div>${esc(v.pick)}</div>${rationale(q,v.pick)}</details>`:''}`}</div><button class="sbtn" data-delq="${k}" aria-label="삭제">✕</button></div>`).join('');
 $('#wgo').onclick=()=>{const L=wt.map(x=>x.t);if(!L.length){qmode='concept';render();return}const t=L[Math.random()*L.length|0];recallUI($('#qbox'),t,'d2t',res=>{snap([t.term]);record(t.term,res.score>=.67,'오답노트');save();nextBtn(()=>qWrong(),'오답노트로')})};
 $('#qbox').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{delete wrong[b.dataset.del];save();qWrong()});$('#qbox').querySelectorAll('[data-delq]').forEach(b=>b.onclick=()=>{delete wrongq[b.dataset.delq];save();qWrong()})}

;window.__gvStage=6;
// ---- home
function ring(v,max,sz=104,col='var(--acc)'){const r=sz/2-9,c=2*Math.PI*r,p=Math.min(1,max?v/max:0);return `<svg class="ring" width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" role="img" aria-label="오늘 목표 ${v}/${max}"><circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="var(--bd)" stroke-width="10"/><circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="${p>=1?'var(--ok)':col}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-p)}" transform="rotate(-90 ${sz/2} ${sz/2})" style="transition:stroke-dashoffset .6s"/><text x="50%" y="47%" text-anchor="middle" font-size="22" fill="var(--fg)">${v}</text><text x="50%" y="66%" text-anchor="middle" font-size="12" fill="var(--mut)">/ ${max}</text></svg>`}
function subjAcc(){const o={};T.forEach(t=>{const a=acc[t.term];if(!a)return;const g=grpOf(t.cat);o[g]=o[g]||{c:0,n:0};o[g].c+=a.c;o[g].n+=a.n});return o}
function renderHome(){const h=H(),done=h.rev+h.n,due=dueList().length,nl=Math.min(newLeft(),T.filter(inDeck).filter(t=>!srs[t.term]).length),st=streak();
 const sa=subjAcc();
 const weak=Object.entries(sa).filter(([g,v])=>v.n>=5).map(([g,v])=>[g,v.c/v.n]).sort((a,b)=>a[1]-b[1]);
 const learned=T.filter(inDeck).filter(t=>srs[t.term]).length,tot=T.filter(inDeck).length;
 $('#v-home').innerHTML=`<div class="box"><div class="hero">${ring(done,S.goal)}<div style="flex:1"><div class="mut">${ddBadge()}${st?`🔥 연속 ${st}일`:'오늘 첫 학습을 시작해요'}</div><div class="big">오늘 인출 ${due+nl}장</div><div class="mut">복습 ${due} · 새 카드 ${nl} · 목표 ${S.goal}문항</div></div></div>
 <button class="cta" id="hgo">🧠 오늘의 인출 세션 시작<small>정의 보고 용어 떠올리기 → 키워드 → 빈칸 (간격 반복)</small></button>
 <div class="kpis"><div class="kpi"><b>${learned}</b><span>학습한 카드<br>/ ${tot}</span></div><div class="kpi"><b>${T.filter(inDeck).filter(t=>stage(t)=='mature').length}</b><span>장기 기억 🌳</span></div><div class="kpi"><b>${Object.keys(wrong).length+Object.keys(wrongq).length}</b><span>오답노트 📒</span></div></div>
 <div class="row"><button class="sbtn" data-go="passage">📝 지문형 서술</button><button class="sbtn" data-go="t2k">🔑 키워드 인출</button><button class="sbtn" data-go="mock">⏱️ 모의고사</button><button class="sbtn" data-go="wrong">📒 오답노트</button></div></div>
 <div class="box sec"><h2>과목별 오늘 할 일</h2>${Object.keys(GROUPS).map(g=>{const sc=T.filter(t=>inDeck(t)&&grpOf(t.cat)==g);const d=sc.filter(t=>srs[t.term]&&srs[t.term].due<=endOfToday()).length;const lr=sc.filter(t=>srs[t.term]).length;const a=sa[g];return `<div class="subjrow"><span class="dot" style="background:${GC[g]}"></span><span class="nm">${g}</span><span class="c">${a&&a.n?'정답률 '+Math.round(a.c/a.n*100)+'% · ':''}${lr}/${sc.length}</span><button class="sbtn" data-subj="${g}" style="min-height:38px">${d?'복습 '+d:'시작'}</button></div>`}).join('')}
 ${weak.length?`<p class="mut" style="margin-bottom:0">📉 약한 과목: <b>${weak.slice(0,2).map(([g,v])=>g+' '+Math.round(v*100)+'%').join(', ')}</b> — 해당 과목 인출을 먼저 해 보세요.</p>`:''}</div>
 ${installCard()}`;
 $('#hgo').onclick=()=>{cat='전체';sub='전체';document.body.dataset.g='';rq=null;catsUI();go('review')};
 $$('#v-home [data-go]').forEach(b=>b.onclick=()=>{qmode=b.dataset.go;qcur=null;go('quiz')});
 $$('#v-home [data-subj]').forEach(b=>b.onclick=()=>{cat=b.dataset.subj;sub='전체';document.body.dataset.g=cat;rq=null;catsUI();go('review')});
 const ib=$('#instb');if(ib)ib.onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;renderHome()}}}
let deferredPrompt=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(mode=='home')renderHome()});
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone;
function installCard(){if(standalone()||LS.get('gv_noinst',0))return '';const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
 return `<div class="box sec"><h2>📲 앱처럼 설치하기</h2>${deferredPrompt?'<button class="pbtn" id="instb">홈 화면에 설치</button>':ios?'<p>Safari 하단 <b>공유 버튼(□↑)</b> → <b>홈 화면에 추가</b>를 누르면 전체 화면 앱으로 실행되고 오프라인에서도 열려요.</p>':'<p>Chrome/Edge 주소창의 <b>설치</b> 아이콘 또는 메뉴 → <b>앱 설치 / 홈 화면에 추가</b>. 설치하면 전체 화면·오프라인으로 실행돼요.</p>'}<button class="sbtn" onclick="LS.set('gv_noinst',1);renderHome()">다시 보지 않기</button></div>`}
// ---- stats
function renderStats(){const days=[];for(let i=29;i>=0;i--){const d=today()-i;const h=hist[d]||{};days.push({d,v:(h.rev||0)+(h.n||0),c:h.c||0,n:h.n||0})}
 const mx=Math.max(5,...days.map(x=>x.v));const W=600,Hh=160,bw=W/30;
 const svg=`<svg viewBox="0 0 ${W} ${Hh+24}" width="100%" role="img" aria-label="최근 30일 학습량"><g>${days.map((x,i)=>{const h=x.v/mx*Hh;const ac=x.n?x.c/x.n:null;return `<rect x="${i*bw+2}" y="${Hh-h}" width="${bw-4}" height="${h}" rx="3" fill="${ac==null?'var(--acc)':ac>=.8?'var(--ok)':ac>=.6?'var(--warn)':'var(--bad)'}" opacity="${x.d==today()?1:.8}"><title>${dayStr(x.d)}: ${x.v}문항${ac!=null?' · 정답률 '+Math.round(ac*100)+'%':''}</title></rect>`}).join('')}</g>${[0,7,14,21,29].map(i=>`<text x="${i*bw+bw/2}" y="${Hh+18}" font-size="12" text-anchor="middle" fill="var(--mut)">${dayStr(days[i].d)}</text>`).join('')}</svg>`;
 const sc=T.filter(inDeck);const stg={new:0,learn:0,young:0,mature:0};sc.forEach(t=>stg[stage(t)]++);
 const subs={};sc.forEach(t=>{const a=acc[t.term];const s=subs[t.cat]||(subs[t.cat]={c:0,n:0,tot:0,g:grpOf(t.cat)});s.tot++;if(a){s.c+=a.c;s.n+=a.n}});
 const fut=[];for(let i=0;i<7;i++){const e=(today()+i+1)*DAY+4*36e5+new Date().getTimezoneOffset()*6e4,s=e-DAY;fut.push(sc.filter(t=>srs[t.term]&&(i==0?srs[t.term].due<e:srs[t.term].due>=s&&srs[t.term].due<e)).length)}
 const tot=Object.values(acc).reduce((a,b)=>({c:a.c+b.c,n:a.n+b.n}),{c:0,n:0});
 $('#v-stats').innerHTML=`<div class="box"><h2>📊 학습 통계 <span class="mut">(${deck=='core'?'기출 핵심':'전체'} 덱)</span></h2><div class="kpis"><div class="kpi"><b>🔥 ${streak()}</b><span>연속 학습일</span></div><div class="kpi"><b>${tot.n?Math.round(tot.c/tot.n*100):0}%</b><span>누적 정답률 (${tot.n})</span></div><div class="kpi"><b>${mocks.length?mocks[mocks.length-1].score:'–'}</b><span>최근 모의고사</span></div></div>
 <h3>최근 30일 학습량 <span class="mut">(색: 정답률)</span></h3>${svg}
 <h3>기억 단계</h3><div class="bar" style="height:16px;display:flex">${[['new','var(--bd)'],['learn','var(--warn)'],['young','#69db7c'],['mature','var(--ok)']].map(([k,c])=>`<i style="width:${stg[k]/sc.length*100}%;background:${c};border-radius:0"></i>`).join('')}</div><p class="mut">🆕 새 카드 ${stg.new} · 📘 학습 중 ${stg.learn} · 🌱 복습(21일 미만) ${stg.young} · 🌳 장기(21일+) ${stg.mature}</p>
 <h3>앞으로 7일 복습 예정</h3><div class="row">${fut.map((n,i)=>`<span class="pill">${i==0?'오늘':dayStr(today()+i)} ${n}</span>`).join('')}</div></div>
 <div class="box sec"><h2>세부 단원별 정답률</h2>${Object.entries(subs).map(([k,s])=>`<div class="subjrow"><span class="dot" style="background:${GC[s.g]}"></span><span class="nm">${k}</span><span class="c" style="min-width:120px;text-align:right">${s.n?Math.round(s.c/s.n*100)+'% ('+s.n+'회)':'기록 없음'}</span><div class="bar" style="max-width:120px"><i style="width:${s.n?s.c/s.n*100:0}%;background:${GC[s.g]}"></i></div></div>`).join('')}</div>
 <div class="box sec"><h2>가장 많이 틀린 용어</h2>${Object.entries(acc).filter(([k,a])=>a.n-a.c>0&&TM.get(k)).sort((a,b)=>(b[1].n-b[1].c)-(a[1].n-a[1].c)).slice(0,10).map(([k,a])=>`<div class="subjrow"><span class="nm">${esc(k)}</span><span class="c">✗${a.n-a.c} / ${a.n}</span></div>`).join('')||'<p class="mut">아직 기록이 없어요.</p>'}
 <div class="row" style="margin-top:12px"><button class="sbtn" id="sv-list">☰ 단어 목록 보기</button></div></div>`;
 $('#sv-list').onclick=()=>{listView=true;go('card')}}

;window.__gvStage=8;
// ---- D-day (Asia/Seoul) ----
var EXAM1='2026-11-28';
var SCHED=[['1차 시험','2026-11-28'],['1차 합격 발표','2026-12-29'],['2차 실기','2027-01-14'],['2차 수업실연','2027-01-20'],['2차 심층면접','2027-01-21']];
function kstYMD(d=new Date()){const k=new Date(d.getTime()+9*3600e3);return k.toISOString().slice(0,10)}
function dayDiff(ymd){const a=Date.parse(kstYMD()+'T00:00:00Z'),b=Date.parse(ymd+'T00:00:00Z');return Math.round((b-a)/864e5)}
function ddLabel(n){return n===0?'D-DAY':n>0?'D-'+n:'D+'+(-n)}
function examTarget(){return S.examDate||EXAM1}
function ddBadge(){const t=examTarget();if(!/^\d{4}-\d\d-\d\d$/.test(t))return '';const n=dayDiff(t);if(n<-60)return '';const nm=S.examDate&&S.examDate!==EXAM1?'시험':'1차 시험';return `${nm}까지 <b class="dday${n===0?' today':''}">${ddLabel(n)}</b> · `}
function ddSched(){const rows=SCHED.map(([k,d])=>{const n=dayDiff(d);const [y,m,dd]=d.split('-');const wd='일월화수목금토'[new Date(d+'T00:00:00Z').getUTCDay()];return `<span class="sch${n<0?' past':n===0?' now':''}"><b>${k}</b> ${+m}/${+dd}(${wd}) <em>${n<0?'완료':ddLabel(n)}</em></span>`}).join('');return `<div class="schbar" aria-label="2027학년도 중등 임용 일정">${rows}</div>`}
(function(){const _rh=renderHome;renderHome=function(){_rh.apply(this,arguments);const c=document.querySelector('#v-home .box');if(c&&!c.querySelector('.schbar'))c.insertAdjacentHTML('beforeend',ddSched())};
 function arm(){const now=Date.now(),k=new Date(now+9*3600e3),next=Date.UTC(k.getUTCFullYear(),k.getUTCMonth(),k.getUTCDate()+1)-9*3600e3;setTimeout(()=>{if(typeof cur!=='undefined'&&cur==='home')renderHome();else{try{renderHome()}catch(e){}}arm()},next-now+1000)}arm();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.querySelector('#v-home.on, #v-home:not([hidden])'))try{renderHome()}catch(e){}});})();

;window.__gvStage=9;
// ---- Cloud (optional): Firebase Auth + Firestore sync + RTDB presence + leaderboard. App works fully without it.
var FBV='10.12.2',FB_CFG={apiKey:'AIzaSyD_1gGwE9fuurmdR3OFKiTy5RfWRGpPIEU',authDomain:'geo-vocab.firebaseapp.com',projectId:'geo-vocab',storageBucket:'geo-vocab.firebasestorage.app',messagingSenderId:'871138215339',appId:'1:871138215339:web:4221ec7bff77e8cae73eee',databaseURL:'https://geo-vocab-default-rtdb.asia-southeast1.firebasedatabase.app'};
var CL={st:'off',user:null,err:'',online:[],board:null,boardAt:0,dirty:false,lastPush:0,syncMsg:''};
var fb=null,fbP=null;
function authCb(u){alog('state '+(u?u.uid.slice(0,6):'null'));if(!u&&(CL._lp||(CL.user&&!CL._out&&Date.now()-(CL._at||0)<15000))){alog('ignore late null');return}CL._out=0;if(u&&CL.user&&CL.user.uid==u.uid){cloudUI();return}CL.user=u;localStorage.setItem('gv_fb',u?'1':'0');if(u)onLogin(u);else{CL.syncMsg='';presenceOff()}cloudUI()}
function alog(m){try{const L=JSON.parse(localStorage.getItem('gv_alog')||'[]');L.push(new Date().toLocaleTimeString('ko-KR',{hour12:false})+' '+m);localStorage.setItem('gv_alog',JSON.stringify(L.slice(-30)))}catch(e){}}
function authApply(u){if(!u)return;if(CL.user&&CL.user.uid==u.uid)return;CL.user=u;CL._at=Date.now();localStorage.setItem('gv_fb','1');alog('apply '+u.uid.slice(0,6));try{onLogin(u)}catch(e){toast('동기화 오류 ['+(e.code||e.message)+']',null,null,9000)}cloudUI();try{render()}catch(e){}}
function cloudLoad(){if(fbP)return fbP;const u=m=>`https://www.gstatic.com/firebasejs/${FBV}/firebase-${m}.js`;CL.st='loading';
 fbP=Promise.all(['app','auth','firestore','database'].map(m=>import(u(m)))).then(([A,Au,F,D])=>{const app=A.initializeApp(FB_CFG);fb={A,Au,F,D,app,auth:(()=>{try{return Au.initializeAuth(app,{persistence:[Au.indexedDBLocalPersistence,Au.browserLocalPersistence],popupRedirectResolver:Au.browserPopupRedirectResolver})}catch(e){return Au.getAuth(app)}})(),db:F.getFirestore(app),rt:D.getDatabase(app)};CL.st='ready';
  Au.onAuthStateChanged(fb.auth,authCb);watchOnline();return fb})
 .catch(e=>{CL.st='fail';CL.err=navigator.onLine?'클라우드 기능을 불러오지 못했어요':'오프라인 — 로그인·랭킹은 온라인에서 사용할 수 있어요';fbP=null;cloudUI();throw e});return fbP}
function nick(){return (S.nick||'').trim()||(CL.user?'학습자'+CL.user.uid.slice(0,4):'')}
function randNick(){const a=['푸른','고요한','높은','깊은','따뜻한','맑은','단단한','넓은','빛나는','잔잔한','굽이진','새벽의'],b=['산맥','삼각주','해안','고원','분지','하천','빙하','사구','협곡','평야','화산','석호','섬','곶','습지'],r=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;return a[r(a.length)]+b[r(b.length)]+String(10+r(90))}
function cleanNick(s){return (s||'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,16)}
// metrics
function wkStart(d=today()){return d-((d+3)%7)}
function metrics(){let reviews=0,wk=0;const w0=wkStart();for(const d in hist){const h=hist[d],v=(h.rev||0)+(h.n||0);reviews+=v;if(+d>=w0)wk+=v}
 let c=0,n=0;for(const k in acc){c+=acc[k].c||0;n+=acc[k].n||0}return {reviews:Math.min(reviews,9999999),wk:Math.min(wk,999999),wkId:w0,acc:n?Math.round(c/n*1000)/10:0,answered:Math.min(n,9999999),streak:Math.min(streak(),10000)}}
// sync
async function onLogin(u){const {F}=fb;CL.syncMsg='동기화 중…';cloudUI();try{const ref=F.doc(fb.db,'beta_users',u.uid);const snap=await F.getDoc(ref);
  if(snap.exists()){const d=snap.data();if(d.p){try{mergeIn(JSON.parse(d.p))}catch(e){}}CL._rn=d.nick||''}
  {const dn=(u.displayName||'').trim(),em=(u.email||'').split('@')[0],nm=new Set([dn,dn.replace(/\s+/g,''),...dn.split(/\s+/),em].map(cleanNick).filter(Boolean));if(!S.nickCustom&&S.nick&&nm.has(cleanNick(S.nick))){S.nick=''}const rn=cleanNick(CL._rn);if(!S.nick&&rn&&!nm.has(rn))S.nick=rn}
  if(!S.nick){S.nick=randNick();save();CL._nickFix=1}
  await cloudPush(true);presenceOn();CL.syncMsg='✅ 동기화됨';try{render()}catch(e){}}catch(e){CL.syncMsg='⚠️ 동기화 실패: '+(e.code||e.message);console.warn(e);alog('sync err '+(e.code||e.message));toast('로그인됨 · 동기화 실패 ['+(e.code||e.message)+'] '+(e.code=='permission-denied'?'Firestore 보안 규칙 배포 필요':''),null,null,9000)}cloudUI()}
async function cloudPush(force){if(!fb||!CL.user)return;if(!force&&!CL.dirty)return;CL.dirty=false;const {F}=fb,uid=CL.user.uid,m=metrics();
 const p=JSON.stringify(progressObj());if(p.length>900000){CL.syncMsg='⚠️ 진도 데이터가 너무 커서 클라우드에 저장할 수 없어요';return}
 const nk=cleanNick(nick())||'학습자';
 await F.setDoc(F.doc(fb.db,'beta_users',uid),{p,nick:nk,v:1,updatedAt:F.serverTimestamp()});
 await F.setDoc(F.doc(fb.db,'beta_leaderboard',uid),{nick:nk,reviews:m.reviews,wk:m.wk,wkId:m.wkId,acc:m.acc,answered:m.answered,streak:m.streak,updatedAt:F.serverTimestamp()});
 CL.lastPush=Date.now();CL.board=null}
(function(){const set0=LS.set;let t=null;LS.set=(k,v)=>{set0(k,v);if(PKEYS.includes(k)&&CL.user){CL.dirty=true;clearTimeout(t);t=setTimeout(()=>cloudPush().catch(e=>console.warn(e)),5000)}};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&CL.dirty)cloudPush().catch(()=>{})})})();
// presence
var presRef=null;
function presenceOn(){if(!fb||!CL.user)return;const {D}=fb;presRef=D.ref(fb.rt,'beta/status/'+CL.user.uid);const con=D.ref(fb.rt,'.info/connected');
 D.onValue(con,s=>{if(s.val()!==true||!presRef)return;D.onDisconnect(presRef).remove().then(()=>D.set(presRef,{nick:cleanNick(nick())||'학습자',at:D.serverTimestamp()}))})}
function presenceOff(){if(presRef&&fb){fb.D.remove(presRef).catch(()=>{});presRef=null}}
function watchOnline(){const {D}=fb;D.onValue(D.ref(fb.rt,'beta/status'),s=>{const v=s.val()||{};CL.online=Object.entries(v).map(([k,x])=>({uid:k,nick:(x&&x.nick)||'학습자'}));onlineUI()},()=>{CL.online=[];CL.onErr=true;onlineUI()})}
async function login(){let step='load';try{await cloudLoad();step='popup';const {Au}=fb,pv=new Au.GoogleAuthProvider();pv.setCustomParameters({prompt:'select_account'});
  alog('popup start');CL._lp=1;const wd=setTimeout(()=>{if(!CL.user){alog('popup timeout');toast('로그인 응답이 오지 않아요 [popup-timeout] 브라우저의 서드파티 쿠키 차단을 풀거나(사이트 예외: geo-vocab.firebaseapp.com) 다른 브라우저로 다시 시도해 주세요',null,null,12000)}},45000);
  try{const r=await Au.signInWithPopup(fb.auth,pv);clearTimeout(wd);CL._lp=0;alog('popup ok '+(r&&r.user?r.user.uid.slice(0,6):'nouser'));const u=(r&&r.user)||fb.auth.currentUser;if(u){authApply(u);toast('✅ 로그인됨: '+(u.email||''))}else toast('로그인 결과가 비어 있어요 [no-user]',null,null,9000)}catch(e){clearTimeout(wd);CL._lp=0;alog('popup err '+(e&&e.code));const c=e&&e.code||'';if(c=='auth/popup-blocked'||c=='auth/operation-not-supported-in-this-environment'||c=='auth/web-storage-unsupported'){step='redirect';localStorage.setItem('gv_lpend','1');toast('팝업이 막혀 Google 페이지로 이동해요…');await Au.signInWithRedirect(fb.auth,pv);return}throw e}}
 catch(e){const c=(e&&e.code)||(e&&e.message)||String(e);localStorage.removeItem('gv_lpend');CL.err=c;console.warn('login',step,e);
  const H={'auth/unauthorized-domain':'Firebase 콘솔 > Authentication > 설정 > 승인된 도메인에 seungyoumg0201-hub.github.io 추가 필요','auth/operation-not-allowed':'Firebase 콘솔에서 Google 로그인 제공업체 사용 설정 필요','auth/network-request-failed':'네트워크 오류','auth/internal-error':'내부 오류(브라우저 쿠키·추적 차단 확인)','auth/popup-closed-by-user':'로그인 창이 닫혔어요','auth/cancelled-popup-request':'로그인 창이 이미 열려 있어요'};
  toast('로그인 실패 ['+c+'] '+(H[c]||(step=='load'?'Firebase 스크립트를 불러오지 못했어요':'')),null,null,9000);try{cloudUI()}catch(_){}}}
async function redirectCheck(){try{await cloudLoad();const r=await fb.Au.getRedirectResult(fb.auth);localStorage.removeItem('gv_lpend');if(r&&r.user){authApply(r.user)}alog('redirect '+(r&&r.user?'ok':'none'));if(r&&r.user)toast('✅ 로그인됨: '+(r.user.email||''))}catch(e){localStorage.removeItem('gv_lpend');const c=(e&&e.code)||String(e);CL.err=c;toast('로그인 실패 ['+c+']',null,null,9000)}}
async function logout(){if(!fb)return;CL._out=1;try{await cloudPush(true)}catch(e){}presenceOff();await fb.Au.signOut(fb.auth);toast('로그아웃했어요 — 이 기기의 진도는 그대로 남아 있어요')}
// leaderboard
async function loadBoard(){await cloudLoad();const {F}=fb;const q=F.query(F.collection(fb.db,'beta_leaderboard'),F.orderBy('reviews','desc'),F.limit(200));const s=await F.getDocs(q);CL.board=s.docs.map(d=>Object.assign({uid:d.id},d.data()));CL.boardAt=Date.now();return CL.board}
var rankTab='wk';
function boardHTML(){if(!CL.board)return `<p class="mut">${CL.st=='fail'?esc(CL.err):'랭킹 불러오는 중…'}</p>`;const w0=wkStart(),me=CL.user&&CL.user.uid;
 const key={wk:'wk',all:'reviews',acc:'acc',streak:'streak'}[rankTab];let rows=CL.board.map(r=>Object.assign({},r,{wk:r.wkId==w0?r.wk:0}));
 if(rankTab=='acc')rows=rows.filter(r=>(r.answered||0)>=30);rows=rows.filter(r=>(r[key]||0)>0).sort((a,b)=>(b[key]||0)-(a[key]||0)).slice(0,50);
 const unit={wk:'회',all:'회',acc:'%',streak:'일'}[rankTab];
 if(!rows.length)return `<p class="mut">${rankTab=='acc'?'30문항 이상 푼 학습자가 아직 없어요.':'아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!'}</p>`;
 return `<ol class="rank">${rows.map((r,i)=>`<li class="${r.uid==me?'me':''}"><span class="rk">${i<3?['🥇','🥈','🥉'][i]:i+1}</span><span class="nm">${esc(r.nick||'학습자')}${r.uid==me?' <em>나</em>':''}</span><span class="vl">${(r[key]||0).toLocaleString()}${unit}</span></li>`).join('')}</ol>`}
function rankSection(){return `<div class="box sec" id="rankbox"><h2>🏆 랭킹</h2><div class="seg" id="rtab">${[['wk','이번 주'],['all','누적'],['acc','정답률'],['streak','연속 학습']].map(([k,l])=>`<button data-k="${k}" class="${rankTab==k?'on':''}">${l}</button>`).join('')}</div>
 <p class="mut" style="margin:6px 0">${rankTab=='wk'?'월요일 4시 기준 이번 주 인출·문제 풀이 횟수':rankTab=='acc'?'30문항 이상 푼 학습자의 누적 정답률':rankTab=='streak'?'하루도 빠짐없이 공부한 연속 일수':'지금까지의 인출·문제 풀이 횟수'}${CL.user?'':' · 로그인하면 내 기록도 올라가요'}</p><div id="rlist">${boardHTML()}</div><div id="onl2"></div></div>`}
function bindRank(){const t=$('#rtab');if(!t)return;t.onclick=e=>{const b=e.target.closest('button');if(!b)return;rankTab=b.dataset.k;$$('#rtab button').forEach(x=>x.classList.toggle('on',x==b));$('#rlist').innerHTML=boardHTML()};
 if(!CL.board||Date.now()-CL.boardAt>60000)loadBoard().then(()=>{const l=$('#rlist');if(l)l.innerHTML=boardHTML()}).catch(e=>{const l=$('#rlist');if(l)l.innerHTML=`<p class="mut">${esc(CL.st=='fail'?CL.err:(e.code=='permission-denied'?'랭킹 서버를 준비 중이에요. 잠시 후 다시 확인해 주세요.':'랭킹을 불러오지 못했어요 ('+(e.code||'오류')+')'))}</p>`});onlineUI()}
function onlineUI(){const n=CL.online.length;const chip=$('#onl');if(chip){chip.classList.toggle('hide',!fb||CL.st!='ready'||CL.onErr);chip.innerHTML=`<span class="dot"></span>지금 접속 중 <b>${n}</b>명`}
 const box=$('#onl2');if(box)box.innerHTML=fb&&CL.st=='ready'&&!CL.onErr?`<h3 class="onh"><span class="dot"></span>지금 접속 중 ${n}명</h3>${n?`<div class="onl">${CL.online.slice(0,60).map(o=>`<span class="${CL.user&&o.uid==CL.user.uid?'me':''}">${esc(o.nick)}</span>`).join('')}${n>60?`<span>외 ${n-60}명</span>`:''}</div>`:'<p class="mut">로그인한 학습자가 접속하면 여기에 보여요.</p>'}`:''}
function accountSection(){const u=CL.user;return `<div class="box sec" id="acct"><h2>👤 계정 · 클라우드 동기화 <span class="mut" style="font-weight:400;font-size:.8em">(선택)</span></h2>
 ${u?`<p>✅ <b>${esc(u.email||'Google 계정')}</b>로 로그인됨 <span class="mut">${esc(CL.syncMsg)}</span></p>
 <div class="set"><label>닉네임<span class="mut">랭킹·접속자 목록에 공개돼요 (최대 16자)</span></label><input class="inp" id="snick" maxlength="16" value="${esc(S.nick||'')}" placeholder="${esc(nick())}"></div>
 <div class="row"><button id="csync">🔄 지금 동기화</button><button id="clogout">로그아웃</button></div>
 <p class="mut">진도는 자동으로 클라우드에 저장되고, 다른 기기에서 같은 계정으로 로그인하면 합쳐져요. 공개되는 정보는 닉네임과 학습 횟수·정답률·연속 일수뿐이에요.</p>`
 :`<p class="mut">로그인 없이도 모든 기능을 쓸 수 있어요. Google로 로그인하면 PC·휴대폰 진도가 자동으로 합쳐지고 랭킹에 참여할 수 있어요.</p>
 <div class="row"><button id="clogin" class="gbtn">${CL.st=='loading'?'불러오는 중…':'<b>G</b> Google로 로그인'}</button></div>${CL.st=='fail'?`<p class="mut">${esc(CL.err)}</p>`:''}`}</div>`}
function cloudUI(){const a=$('#acct');if(a&&mode=='data'){a.outerHTML=accountSection();bindAcct()}const ub=$('#ubtn');if(ub)ub.textContent=CL.user?'👤':'🔑'}
function bindAcct(){const l=$('#clogin');if(l)l.onclick=()=>{l.disabled=true;login().finally(()=>{l.disabled=false})};const o=$('#clogout');if(o)o.onclick=()=>logout();
 const s=$('#csync');if(s)s.onclick=async()=>{s.disabled=true;try{await cloudPush(true);CL.syncMsg='✅ 방금 동기화됨'}catch(e){CL.syncMsg='⚠️ '+(e.code||e.message)}cloudUI()};
 const n=$('#snick');if(n)n.onchange=async()=>{S.nick=cleanNick(n.value);S.nickCustom=S.nick?1:0;if(!S.nick)S.nick=randNick();n.value=S.nick;save();try{await cloudPush(true);if(presRef)fb.D.update(presRef,{nick:cleanNick(nick())||'학습자'});toast('닉네임을 저장했어요')}catch(e){toast('저장 실패: '+(e.code||''))}}}
(function(){const rd=renderData;renderData=function(){rd.apply(this,arguments);const v=$('#v-data');v.insertAdjacentHTML('afterbegin',accountSection());bindAcct()};
 const rs=renderStats;renderStats=function(){rs.apply(this,arguments);const v=$('#v-stats');v.insertAdjacentHTML('beforeend',rankSection());bindRank()};
 const rh=renderHome;renderHome=function(){rh.apply(this,arguments);const b=document.querySelector('#v-home .box');if(b&&!$('#onl'))b.insertAdjacentHTML('afterbegin',`<button id="onl" class="onchip hide" title="랭킹 보기"></button>`);const c=$('#onl');if(c)c.onclick=()=>go('stats');onlineUI()};
 if(localStorage.getItem('gv_lpend')=='1')redirectCheck();else if(localStorage.getItem('gv_fb')=='1'&&navigator.onLine)gvIdle(()=>cloudLoad().catch(()=>{}),1000);
 addEventListener('online',()=>{if(localStorage.getItem('gv_fb')=='1')cloudLoad().catch(()=>{})})})();

;window.__gvStage=10;
// ---- 학습 플랜 + 벼락치기 ----
var FREQ={'인문지리':222,'자연지리':226,'지리교육론':160,'지역지리 및 기타':60};// items.json 2002-2026 (668)
var PL={ov:null};
function plGet(){return LS.get('gv_plan',null)}
function plSet(p){LS.set('gv_plan',p)}
function kstAdd(ymd,n){const d=new Date(ymd+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function plItems(){// every term + MCQ + 지문형, grouped by subject, sorted by 기출 빈도
 const by={};Object.keys(GROUPS).forEach(g=>by[g]=[]);
 T.forEach(t=>by[grpOf(t.cat)].push({k:'t:'+t.term,w:(t.exam?t.exam.length:0)*2+(t.core?1:0)+(t.rc||0)/5}));
 MCQ0.forEach(q=>{const g=q.subj&&by[q.subj]?q.subj:grpOf(q.cat||'');by[g].push({k:'q:'+q.id,w:1})});
 PSG.forEach(p=>{const g=by[p.subj]?p.subj:grpOf(p.cat);by[g].push({k:'p:'+p.id,w:3})});
 for(const g in by)by[g].sort((a,b)=>b.w-a.w);return by}
function plSchedule(L){// day i (0..L-2) content; day L-1 = cumulative miss review
 const by=plItems(),D=L-1,days=Array.from({length:L},()=>[]);
 for(const g in by){const a=by[g];a.forEach((x,i)=>{days[Math.floor(i*D/a.length)].push(x.k)});
  // 기출 2회 이상 → cycle 중간에 한 번 더(반복 노출)
  a.filter(x=>x.w>=4&&x.k[0]=='t').forEach((x,i)=>{const d0=Math.floor(a.indexOf(x)*D/a.length),d1=Math.min(D-1,d0+Math.ceil(D/2));if(d1!=d0)days[d1].push('r'+x.k)})}
 return days}
function plState(){const p=plGet();if(!p)return null;const n=dayDiff(p.start);const el=-n;if(el<0)return {p,before:-el};
 const cyc=Math.floor(el/p.len),di=el%p.len,cs=kstAdd(p.start,cyc*p.len);
 if(p.cyc!==cyc){p.cyc=cyc;p.done={};p.miss={};plSet(p)}
 const days=plSchedule(p.len);const left=Math.max(0,dayDiff(examTarget()));
 return {p,cyc,di,cs,days,left,cyclesLeft:Math.ceil((left+1)/p.len)}}
function plMisses(p){const s=new Set(Object.keys(p.miss||{}));Object.keys(wrong).forEach(k=>s.add('t:'+k));Object.keys(marks).forEach(k=>marks[k]=='bad'&&s.add('t:'+k));Object.keys(wrongq).forEach(k=>s.add((k[0]=='p'?'p:':'q:')+k));return [...s].filter(k=>plObj(k))}
function plObj(k){k=k.replace(/^r/,'');const id=k.slice(2);return k[0]=='t'?TM.get(id):k[0]=='q'?MCQ0.find(q=>q.id==id):PSG.find(p=>p.id==id)}
function plToday(st){const {p,di,days}=st;const isRev=di==p.len-1;let todo=isRev?plMisses(p):days[di];
 const behind=[];if(!isRev)for(let i=0;i<di;i++)days[i].forEach(k=>{if(!p.done[k])behind.push(k)});
 const due=dueList(T).length;return {isRev,todo,behind,due,doneN:todo.filter(k=>p.done[k]).length}}
function plCard(){const st=plState();
 if(!st)return `<div class="box plcard"><h2>📅 학습 플랜</h2><p class="mut">7일·10일 주기로 전체 ${T.length}개 용어 + ${MCQ0.length} 5지선다 + ${PSG.length} 지문형을 한 바퀴씩 돌아요. 마지막 날은 누적 오답 복습.</p><div class="row"><button class="sbtn" id="plopen">플랜 만들기</button><button class="sbtn" id="cramopen">⚡ 벼락치기</button></div></div>`;
 if(st.before!=null)return `<div class="box plcard"><h2>📅 학습 플랜</h2><p>${st.before}일 뒤 시작해요 (${st.p.start}).</p><div class="row"><button class="sbtn" id="plopen">플랜 설정</button><button class="sbtn" id="cramopen">⚡ 벼락치기</button></div></div>`;
 const t=plToday(st),pct=t.todo.length?Math.round(t.doneN/t.todo.length*100):100;
 return `<div class="box plcard"><h2>📅 ${st.p.len}일 플랜 · ${st.cyc+1}회독 ${st.di+1}/${st.p.len}일차</h2>
 <p>${t.isRev?'🔁 오늘은 누적 오답 복습일':'오늘 할 일'} <b>${t.doneN}/${t.todo.length}</b> · 복습 대기 ${t.due}${t.behind.length?` · <span class="warn">밀린 ${t.behind.length}</span>`:''}</p>
 <div class="pbar"><i style="width:${pct}%"></i></div>
 <p class="mut">시험까지 ${st.left}일 · 남은 회독 약 ${st.cyclesLeft}회</p>
 <div class="row"><button class="sbtn pri" id="plgo">${t.doneN>=t.todo.length&&t.todo.length?'✅ 완료 · 더 하기':'▶ 오늘 학습'}</button>${t.behind.length?'<button class="sbtn" id="plcatch">⏩ 밀린 것 따라잡기</button>':''}<button class="sbtn" id="plopen">설정</button><button class="sbtn" id="cramopen">⚡ 벼락치기</button></div></div>`}
(function(){const _rh=renderHome;renderHome=function(){_rh.apply(this,arguments);const v=$('#v-home');if(!v)return;const o=v.querySelector('.plcard');if(o)o.remove();const f=v.querySelector('.box');(f||v).insertAdjacentHTML(f?'afterend':'afterbegin',plCard());
 const b=id=>v.querySelector('#'+id);b('plopen')&&(b('plopen').onclick=plSetup);b('cramopen')&&(b('cramopen').onclick=cramMenu);b('plgo')&&(b('plgo').onclick=()=>plRun(false));b('plcatch')&&(b('plcatch').onclick=()=>plRun(true))}})();
// ---- overlay
const isTouch=()=>matchMedia('(pointer:coarse)').matches;
function ov(html){if(!PL.ov){PL.ov=document.createElement('div');PL.ov.id='plov';document.body.appendChild(PL.ov)}PL.ov.innerHTML=`<div class="plin"><div class="plh"><button class="plx" aria-label="닫기">✕</button></div>${html}</div>`;PL.ov.classList.remove('hide');document.body.classList.add('noscroll');PL.ov.querySelector('.plx').onclick=ovClose;return PL.ov}
function ovClose(){clearInterval(PL.tm);window.KWU=null;window.CURID='';$$('#nav button').forEach(x=>x.classList.toggle('on',x.dataset.m==mode));if(PL.ov)PL.ov.classList.add('hide');document.body.classList.remove('noscroll');document.onkeydown=null;save();if(mode=='home')renderHome()}
function plSetup(){const p=plGet()||{len:7,start:kstYMD()};
 const o=ov(`<h2>📅 학습 플랜 설정</h2><p class="mut">주기마다 전 범위(용어 ${T.length} · 5지선다 ${MCQ0.length} · 지문형 ${PSG.length})를 1회독해요. 과목별 하루 분량은 범위에 맞춰 나누고, 기출 빈도가 높은 항목부터 배치하며 기출 2회 이상 개념은 주기 중간에 한 번 더 나와요. 마지막 날은 누적 오답·헷갈림 복습입니다. 시험일(${examTarget()})까지 주기를 반복해요.</p>
 <div class="seg" id="pllen"><button data-l="7" class="${p.len==7?'on':''}">7일 주기</button><button data-l="10" class="${p.len==10?'on':''}">10일 주기</button></div>
 <label class="fld">시작일 <input type="date" id="plst" value="${p.start}"></label>
 <div id="plprev"></div><div class="row"><button class="sbtn pri" id="plsave">저장</button>${plGet()?'<button class="sbtn" id="pldel">플랜 끄기</button>':''}</div>`);
 let L=p.len;const prev=()=>{const d=plSchedule(L);const w=Object.entries(FREQ).map(([g,n])=>`${g} ${Math.round(n/668*100)}%`).join(' · ');o.querySelector('#plprev').innerHTML=`<p>하루 평균 <b>${Math.round(d.slice(0,-1).reduce((a,x)=>a+x.length,0)/(L-1))}</b>개 (새 학습+반복) · 기출 비중 ${w}</p>`};prev();
 o.querySelector('#pllen').onclick=e=>{const b=e.target.closest('button');if(!b)return;L=+b.dataset.l;o.querySelectorAll('#pllen button').forEach(x=>x.classList.toggle('on',x==b));prev()};
 o.querySelector('#plsave').onclick=()=>{const s=o.querySelector('#plst').value||kstYMD();plSet({len:L,start:s,cyc:null,done:{},miss:{}});toast('📅 플랜을 저장했어요');ovClose()};
 const d=o.querySelector('#pldel');d&&(d.onclick=async()=>{if(await askConfirm('정말로 플랜을 끄시겠어요?','현재 학습 플랜 설정이 삭제돼요. 학습 기록은 남아요.','끄기')){localStorage.removeItem('gv_plan');LS.set('gv_plan',null);ovClose()}})}
// ---- runner: terms (swipe/typing), MCQ, 지문형
function plRun(catchup){const st=plState();if(!st||st.before!=null)return;const t=plToday(st);let q=(catchup?t.behind:t.todo).filter(k=>!st.p.done[k]);if(!q.length)q=t.todo.slice();
 q=q.slice(0,catchup?60:400);runQ(q,{title:catchup?'⏩ 따라잡기':(t.isRev?'🔁 누적 오답 복습':'📅 오늘 학습'),onItem:(k,ok)=>{const p=plGet();p.done[k]=1;if(!ok)(p.miss=p.miss||{})[k.replace(/^r/,'')]=1;plSet(p)}})}
function runQ(q,o){let i=0,c=0,n=0,t0=Date.now();const R={};
 function next(){if(o.limit&&Date.now()>o.end)return fin(true);if(i>=q.length)return fin(false);const k=q[i],x=plObj(k);if(!x){i++;return next()}
  const hd=`<div class="plhd"><b>${o.title}</b> <span>${i+1}/${q.length}</span>${o.limit?' <span id="pltm" class="pill"></span>':''}</div><div class="pbar"><i style="width:${i/q.length*100}%"></i></div>`;
  const kk=k.replace(/^r/,'');if(kk[0]=='t')termItem(hd,x,o.cram);else if(kk[0]=='q')mcqItem(hd,x);else psgItem(hd,x)}
 function done(ok){const k=q[i];n++;if(ok)c++;o.onItem&&o.onItem(k,ok);i++;buzz(ok?8:[8,30,8]);next()}
 function termItem(hd,t,cram){const ty=!isTouch();const el=ov(hd+`<div class="plq"><div class="pltag">${esc(grpOf(t.cat))} · ${esc(t.cat)}${t.exam&&t.exam.length?` · <span class="ex">${esc(exTag(t))}</span>`:''}</div>
  ${cram?`<div class="plterm">${esc(t.term)}</div><div class="mut">핵심 키워드는?</div>`:`<div class="pldef">${maskDef(t)}</div><div class="mut">용어는?</div>`}
  ${ty?`<input id="plin" autocomplete="off" placeholder="${cram?'키워드 떠올리고 Enter':'용어 입력 후 Enter (모르면 그냥 Enter)'}">`:''}
  <div id="plans" class="hide"><div class="plterm">${esc(t.term)}</div><div class="plkeys">🔑 ${esc(t.keys||'')}</div>${t.vs?`<div class="plvs">↔ ${esc(t.vs)}</div>`:''}${cram?`<div class="mut small">${esc(t.def)}</div>`:''}</div>
  <div id="plbtn" class="row"><button class="sbtn" id="plrev">${ty?'정답 보기 (Space)':'탭해서 보기'}</button></div>
  ${!ty?'<p class="mut small">보기 후 → 오른쪽 스와이프: 알아요 · ← 왼쪽: 몰라요</p>':''}</div>`);
  const ans=el.querySelector('#plans'),btn=el.querySelector('#plbtn'),inp=el.querySelector('#plin');let shown=false,auto=null;
  const show=()=>{if(shown)return;shown=true;ans.classList.remove('hide');btn.innerHTML='<button class="sbtn bad" data-g="0">✗ 몰라요 (1)</button><button class="sbtn mid" data-gh="1">△ 헷갈려요</button><button class="sbtn ok" data-g="1">✓ 알아요 (2)</button>';
   if(auto!=null)btn.insertAdjacentHTML('afterbegin',`<div class="pill ${auto?'ok':'bad'}" style="width:100%">${auto?'✓ 정답 판정':'✗ 오답 판정'} — 맞으면 Enter</div>`);
   btn.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>grade(+b.dataset.g));{const h=btn.querySelector('[data-gh]');if(h)h.onclick=()=>{gvHard(t.term,'plan');const hh=H();if(!srs[t.term].r||srs[t.term].r==1)hh.nw=(hh.nw||0)+1;else hh.rev=(hh.rev||0)+1;done(true)}}};
  const grade=g=>{record(t.term,!!g,'plan');srs[t.term]=sched(srs[t.term],g?3:1);const h=H();if(!srs[t.term].r||srs[t.term].r==1)h.nw=(h.nw||0)+1;else h.rev=(h.rev||0)+1;done(!!g)};
  el.querySelector('#plrev').onclick=show;if(inp){inp.focus();inp.onkeydown=e=>{if(e.key=='Enter'&&!shown){e.preventDefault();e.stopPropagation();if(!cram)auto=judge(inp.value,t)>0;show()}}}
  const card=el.querySelector('.plq');card.onclick=e=>{if(!ty&&!shown&&!e.target.closest('button'))show()};
  let sx=null;card.ontouchstart=e=>{sx=e.touches[0].clientX};card.ontouchend=e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(!shown)return;if(dx>60)grade(1);else if(dx<-60)grade(0)};
  document.onkeydown=e=>{if(e.target==inp&&!shown)return;if(!shown&&e.key==' '){e.preventDefault();show();return}if(shown){if(e.key=='1'){grade(0)}else if(e.key=='2')grade(1);else if(e.key=='Enter'){e.preventDefault();grade(auto===false?0:1)}}};tick()}
 function mcqItem(hd,m){const opts=shuffle([m.a,...m.wrong]);const el=ov(hd+`<div class="plq"><div class="pltag">5지선다</div><div class="pldef">${esc(m.q)}</div>${opts.map((x,j)=>`<button class="opt" data-j="${j}">${j+1}. ${esc(x)}</button>`).join('')}<div id="plfb"></div></div>`);
  let used=false;const pick=j=>{if(used)return;used=true;const ok=opts[j]==m.a;el.querySelectorAll('.opt').forEach((b,jj)=>{b.disabled=true;if(opts[jj]==m.a)b.classList.add('right');else if(jj==j)b.classList.add('wrong')});
   if(!ok)wrongq[m.id]={n:((wrongq[m.id]||{}).n||0)+1,pick:opts[j],at:Date.now(),ok:0};const h=H();h.n++;if(ok)h.c++;
   el.querySelector('#plfb').innerHTML=`${!ok&&m.why&&m.why[opts[j]]?`<div class="diag">💡 ${esc(m.why[opts[j]])}</div>`:''}<button class="sbtn pri" id="plnx">다음 (Enter)</button>`;el.querySelector('#plnx').onclick=()=>done(ok);document.onkeydown=e=>{if(e.key=='Enter'){e.preventDefault();done(ok)}}};
  el.querySelectorAll('.opt').forEach(b=>b.onclick=()=>pick(+b.dataset.j));document.onkeydown=e=>{if(/^[1-5]$/.test(e.key)&&opts[+e.key-1])pick(+e.key-1)};tick()}
 function psgItem(hd,p){const el=ov(hd+'<div class="plq" id="plps"></div>');document.onkeydown=null;passageUI(el.querySelector('#plps'),p,r=>{const ok=r.score>=.75;const h=H();h.n++;if(ok)h.c++;if(!ok)wrongq[p.id]={n:((wrongq[p.id]||{}).n||0)+1,at:Date.now(),ok:0,psg:1};
  el.querySelector('#plps').insertAdjacentHTML('beforeend','<div class="row"><button class="sbtn pri" id="plnx">다음</button></div>');el.querySelector('#plnx').onclick=()=>done(ok)});tick()}
 function tick(){if(!o.limit)return;const f=()=>{const s=Math.max(0,Math.round((o.end-Date.now())/1e3)),e=$('#pltm');if(e)e.textContent='⏱ '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0');if(s<=0){clearInterval(PL.tm);fin(true)}};clearInterval(PL.tm);PL.tm=setInterval(f,500);f()}
 function fin(timeout){clearInterval(PL.tm);document.onkeydown=null;save();const el=ov(`<h2>${timeout?'⏱ 시간 종료':'🎉 끝!'}</h2><p><b>${c}/${n}</b> 정답 · ${Math.round((Date.now()-t0)/6e4)}분</p>${o.again?'<div class="row"><button class="sbtn pri" id="plag">다음 라운드</button><button class="sbtn" id="plcl">닫기</button></div>':'<div class="row"><button class="sbtn pri" id="plcl">닫기</button></div>'}`);
  el.querySelector('#plcl').onclick=ovClose;const a=el.querySelector('#plag');a&&(a.onclick=o.again)}
 if(o.limit)o.end=Date.now()+o.limit;next()}
// ---- 벼락치기
function cramPool(){return T.map(t=>{const a=acc[t.term]||{},w=wrong[t.term];const s=(t.core?3:0)+(t.exam?t.exam.length:0)*2+(t.rc||0)/4+(marks[t.term]=='bad'?4:0)+(w?2+w.n:0)-(a.s>=3?3:0)-(marks[t.term]=='ok'?1:0);return {t,s}}).filter(x=>x.s>=3).sort((a,b)=>b.s-a.s).map(x=>x.t)}
var CRAM={eve:['🌙 시험 전날',300,25,8],h1:['⏰ 1시간',150,20,6],m30:['⚡ 30분',60,15,4]};
function cramMenu(){const pool=cramPool();const nb=Object.values(marks).filter(v=>v=='bad').length;
 const o=ov(`<h2>⚡ 벼락치기</h2><p class="mut">⭐기출 핵심 ${T.filter(t=>t.core).length} + 기출 반복 개념 + 내 헷갈림(${nb})·오답(${Object.keys(wrong).length}) 우선 · 우선순위 ${pool.length}개. 용어 보고 키워드를 떠올린 뒤 확인 (${isTouch()?'모바일: 탭→스와이프':'PC: 입력→Enter, 1/2'}).</p>
 <div class="plgrid">${Object.entries(CRAM).map(([k,[l,n,r,m]])=>`<button class="sbtn" data-c="${k}"><b>${l}</b><br><span class="small">상위 ${n}개 · ${r}개씩 ${m}분 라운드</span></button>`).join('')}</div>
 <div class="row"><button class="sbtn" id="vsheet">↔ 막판 비교쌍(vs) 시트</button></div>`);
 o.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{const [l,n,r,m]=CRAM[b.dataset.c];const top=pool.slice(0,n);let ri=0;
  const round=()=>{const part=top.slice(ri*r,(ri+1)*r);if(!part.length){toast('모든 라운드를 끝냈어요 🎉');return cramMenu()}ri++;
   runQ(part.map(t=>'t:'+t.term),{title:`${l} R${ri}/${Math.ceil(top.length/r)}`,cram:true,limit:m*6e4,again:round})};round()});
 o.querySelector('#vsheet').onclick=vsSheet}
function vsSheet(){const pool=cramPool().filter(t=>t.vs);const by={};pool.forEach(t=>(by[grpOf(t.cat)]=by[grpOf(t.cat)]||[]).push(t));
 const o=ov(`<h2>↔ 막판 비교쌍 시트 <span class="mut small">${pool.length}쌍</span></h2><input id="vsq" placeholder="검색"><button class="sbtn" id="vspr">🖨 인쇄</button>${Object.keys(GROUPS).filter(g=>by[g]).map(g=>`<details open><summary>${g} (${by[g].length})</summary><table class="vst">${by[g].map(t=>`<tr><th>${esc(t.term)}${t.exam&&t.exam.length?'<sup>기출</sup>':''}</th><td>${esc(t.keys||'')}</td><td>↔ ${esc(t.vs)}</td></tr>`).join('')}</table></details>`).join('')}`);
 o.querySelector('#vsq').oninput=e=>{const v=e.target.value.trim();o.querySelectorAll('.vst tr').forEach(r=>r.style.display=!v||r.textContent.includes(v)?'':'none')};o.querySelector('#vspr').onclick=()=>window.print()}

;window.__gvStage=11;
// ---- 🔑 키워드 인출 탭 ----
function kwList(t){return String(t.keys||'').split(/,\s*/).map(s=>s.trim()).filter(Boolean)}
function kwHit(inp,k){const a=norm(inp);if(!a)return false;const parts=k.split(/[·\/]/).map(norm).filter(x=>x.length>=2);return parts.some(p=>a.includes(p)||(p.length>=4&&a.includes(p.slice(0,p.length-1))))}
function vsKey(t){const m=String(t.vs||'').match(/^\s*([^:：]+)[:：]\s*(.+)$/);return m?{other:m[1].trim(),diff:m[2].trim()}:null}
let WBD=null;function wbd(){if(!WBD){try{WBD=JSON.parse(document.getElementById('wbd').textContent)}catch(e){WBD={wb:[],w16:[]}}}return WBD}
function kwPool(kind,scope){
 if(kind=='wb'){const o=[];wbd().wb.forEach(p=>(cat=='전체'||grpOf(p.cat)==cat||p.cat==cat)&&sfOk(p)&&p.bl.length&&o.push({k:'W',p,i:0,g:{}}));return o}
 if(kind=='w16')return wbd().w16.filter(q=>(cat=='전체'||grpOf(q.cat)==cat||q.cat==cat)&&sfOk(q)).map(q=>qBl({k:'Q',q})?{k:'Q',q,i:0,g:{}}:{k:'Q',q});const sc=scope||T.filter(inDeck);
 if(kind=='keys')return sc.filter(t=>kwList(t).length).map(t=>({k:'K',t}));
 if(kind=='vs')return sc.filter(t=>vsKey(t)).map(t=>({k:'V',t}));
 const out=[],ty=S.kwT||'all';PSG.forEach(p=>(cat=='전체'||p.subj==cat)&&sfOk(p)&&p.blanks.length&&(ty=='all'||(ty=='new'?/^[uv]\d/.test(p.id):(ty=='psg'&&!/^[uv]\d/.test(p.id))))&&out.push({k:'B',p,i:0,g:{}}));
 if(kind=='blank'&&(ty=='all'||ty=='sq'))sqd().filter(sfOk).forEach(q=>(cat=='전체'||grpOf(q.cat||'')==cat)&&(q.ans||q.con)&&out.push({k:'S',q}));return out}
function kwPri(x){const t=x.t||(x.p&&findT((x.p.rel||[])[x.i]||''))||(x.k=='W'&&findT(x.p.bl[x.i][1]));if(!t)return Math.random();const c=srs[t.term];return (wrong[t.term]?-3:0)+(marks[t.term]=='bad'?-2:0)+(t.exam&&t.exam.length?-1:0)+(c?Math.min(3,(c.i||0)/10):0)+Math.random()}
function kwMenu(){const sc=T.filter(inDeck);const n={keys:kwPool('keys',sc).length,vs:kwPool('vs',sc).length,blank:kwPool('blank').length,wb:kwPool('wb').length,w16:kwPool('w16').length};
 const tm=x=>x.t?x.t.term:(()=>{try{const b=blOf(x)[0];const t=b&&findT(b.t||b.a[0]);return t&&t.term}catch(e){return null}})();const mc=k=>kwPool(k,k=='keys'?sc:undefined).filter(x=>{const t=tm(x);return t&&wrong[t]}).length;const dc=k=>kwPool(k,sc).filter(x=>x.t&&srs[x.t.term]&&srs[x.t.term].due<endOfToday()).length;
 const o=ov(`<h2>✍️ 인출</h2><p class="mut">채점 기준처럼 핵심 키워드를 떠올려 쓰는 연습. 덱: ${deck=='all'?'전체':'⭐기출 핵심'} · ${isTouch()?'모바일: 탭으로 확인 → 스와이프(→ 알아요 / ← 몰라요)':'PC: 키워드 입력 → Enter로 채점, 1/2로 확정'} · 놓친 항목은 복습(SRS)에 들어가요.</p>
 <div class="plgrid big3"><button class="sbtn big" data-k="keys"><b>🔑 키워드 인출</b><br><span class="small">${n.keys}개 · 안 푼 문항 ${kwUnseen('keys',sc)} · 놓친 것 ${mc('keys')} · 복습 대기 ${dc('keys')}</span></button><button class="sbtn big" data-k="blank"><b>📄 지문·학자의 말 통합 인출 (㉠㉡ 용어)</b><br><span class="small">${n.blank}문항 · 안 푼 문항 ${kwUnseen('blank')} · 놓친 것 ${mc('blank')}</span></button><button class="sbtn big" data-k="wb"><b>📘 기출 워크북 빈칸</b><br><span class="small">${n.wb}지문 · 안 푼 문항 ${kwUnseen('wb')} · 놓친 것 ${mc('wb')}</span></button></div><h3 class="small mut">더 보기</h3><div class="plgrid"><button class="sbtn" data-k="vs"><b>비교쌍 구별 키워드</b><br><span class="small">${n.vs}개 · A vs B 차이</span></button><button class="sbtn" data-k="w16"><b>16주 스터디 Q&amp;A</b><br><span class="small">${n.w16}문항 · 서술 인출</span></button><button class="sbtn" id="kwplan"><b>📅 학습 플랜 · ⚡ 벼락치기</b><br><span class="small">7일·10일 플랜 진도</span></button></div><p class="small mut">워크북·스터디 문항은 스터디원이 기출 주제를 재구성한 자료예요(원 시험지 문구 아님).</p>
 <div class="seg" id="kwt">${[["all","통합 전체"],["psg","지문 빈칸"],["sq","학자의 말"],["new","낯선 지문(신규)"]].map(([v,l])=>`<button data-t="${v}" class="${(S.kwT||"all")==v?"on":""}">${l}</button>`).join("")}</div><div class="seg" id="kwn">${[20,40,80,120,0].map(v=>`<button data-n="${v}" class="${(S.kwN??20)==v?"on":""}">${v?v+"개":"전부"}</button>`).join("")}</div><p class="small mut">순서: 안 푼 문항(섞어서) → 복습 대기·놓친 것 → 나머지 · 중간에 나가도 이어서 풀 수 있어요.</p>`);
 {const pb=o.querySelector('#kwplan');pb&&(pb.onclick=e=>{e.stopPropagation();ovClose();go('home');setTimeout(()=>{const b=document.querySelector('#plgo,#plopen');b&&b.scrollIntoView({block:'center'})},50)})}
 {const kt=o.querySelector('#kwt');kt&&(kt.onclick=e=>{const b=e.target.closest('button');if(!b)return;S.kwT=b.dataset.t;save();kwMenu()})}
 let N=S.kwN??20;o.querySelector('#kwn').onclick=e=>{const b=e.target.closest('button');if(!b)return;N=+b.dataset.n;S.kwN=N;save();o.querySelectorAll('#kwn button').forEach(x=>x.classList.toggle('on',x==b))};
 o.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const kd=b.dataset.k,P=kwPool(kd,sc);if(!P.length){toast('이 범위에 문항이 없어요');return}const ttl=b.querySelector('b').textContent;if(!N)return kwAll(kd,P,ttl);const L=kwOrder(P,N);kwRun(L,ttl)})}
function kwRun(L,title,res){let i=res?res.i:0,c=0;const miss=[],missX=[],conf=[];L=L.slice();
 const KST=[]; function next(){if(res){res.i=i;LS.set('gv_kwres',res)}if(i>=L.length){if(res)localStorage.removeItem('gv_kwres');return fin()}const x=L[i],ty=!isTouch();let q,ans,keys,t;
  if(x.k=='K'){t=x.t;keys=kwList(t);q=`<div class="pltag">${esc(t.cl||t.cat)}${t.exam&&t.exam.length?' · <span class="ex">'+esc(exTag(t))+'</span>':''}</div><div class="plterm">${esc(t.term)}</div><div class="mut">채점 키워드 ${keys.length}개를 쓰세요</div>`;ans=`<div class="plkeys">${keys.map(k=>`<span class="kwk" data-k="${esc(k)}">${esc(k)}</span>`).join('')}</div><div class="pldef2">${esc(t.def)}</div>${t.vs?`<div class="small mut">↔ ${esc(t.vs)}</div>`:''}${t.kx?`<div class="kx small"><b>기출 자료</b><br>${t.kx.map(k=>`${esc(k.id)} · ${esc(k.sub)}${k.st?' · '+esc(k.st):''}`).join('<br>')}</div>`:''}`}
  else if(x.k=='E'){const e=x.q;keys=[e.answer];q=`<div class="pltag">${esc(e.cat)}${e.kice&&e.kice.length?' · <span class="ex">'+esc(e.kice.join('·'))+'</span>':''}</div><div class="plterm">${esc(e.clue)}</div><div class="mut">${/^kx/.test(e.id||"")?"다음 설명에 해당하는 개념은?":"이 단서가 가리키는 이론·개념은?"}</div>`;ans=`<div class="plterm">${esc(e.answer)}</div>${e.term&&e.term!=e.answer?`<div class="mut">관련 용어: ${esc(e.term)}</div>`:''}`}
  else if(x.k=='V'){t=x.t;const v=vsKey(t);keys=kwList(t);q=`<div class="pltag">${esc(t.cat)}</div><div class="plterm">${esc(t.term)} <span class="mut">vs</span> ${esc(v.other)}</div><div class="mut">${esc(t.term)}를 ${esc(v.other)}와 구별하는 키워드는?</div>`;ans=`<div class="plkeys">${keys.map(k=>`<span class="kwk" data-k="${esc(k)}">${esc(k)}</span>`).join('')}</div><div class="plvs">↔ ${esc(v.other)}: ${esc(v.diff)}</div>`}
  else if(x.k=='W'||x.k=='B'||(x.k=='Q'&&qBl(x))){const BL=blOf(x),p=x.p||x.q;x.g=x.g||{};x.u=x.u||{};const b=BL[x.i];t=findT(b.t||b.a[0]);keys=b.a;q=blRender(x,BL)+`<div class="mut">( ${esc(b.l)} )에 들어갈 말은?${BL.length>1?' <span class="small">(다른 빈칸을 탭하면 그 빈칸으로 이동)</span>':''}</div>`;ans=`<div class="plterm">${esc(b.a[0])}</div>${b.x?`<div class="mut small">함께: ${esc(b.x)}</div>`:''}${t?`<div class="plkeys">🔑 ${esc(t.keys||'')}</div>`:''}${x.k=='W'&&p.ex?`<details class="small mut"><summary>해설</summary>${esc(p.ex)}</details>`:''}${x.k=='Q'?`<details class="small mut"><summary>원 답안·출처</summary>${esc(p.a)}</details>`:''}`}
  else if(x.k=='S'){const z=x.q;const an=z.ans||z.con;keys=[...new Set([an,...(z.acc||[])])];t=findT(an)||null;q=`<div class="pltag">${esc(z.cat||'')}${z.kice?' · <span class="ex">기출 '+esc(z.kice)+'</span>':''}</div><div class="pldef psgtxt">${esc(z.q)}</div><div class="mut">${z.f=='classify_3moments'?'르페브르의 세 계기 중 무엇?':z.f=='who_criticizes'?'누구(어떤 관점)의 비판/주장인가?':'학자·개념을 쓰세요'}</div>`;ans=`<div class="plterm">${esc(an)}${z.sch&&z.sch.length?' <span class="mut">('+esc(z.sch.join(', '))+')</span>':''}</div><div class="mut small">${esc(z.exp||'')}</div>${(z.conf||[]).length?`<div class="small">⚠ 헷갈리는 보기: ${z.conf.map(c=>`<b>${esc(c.n)}</b> — ${esc(c.why)}`).join(' · ')}</div>`:''}<p class="small mut provn">ℹ️ 출처: ${esc(z.lab||'')}${z.cite?' · '+esc(z.cite):''}</p>`}
  else if(x.k=='Q'){const z=x.q;t=null;keys=[];q=`<div class="pltag">${esc(z.cat)} · 16주 스터디 ${z.w}주차</div><div class="pldef psgtxt">${esc(z.q)}</div><div class="mut">답을 떠올려(쓰고) 확인하세요</div>`;ans=`<div class="pldef">${esc(z.a)}</div>`}
  else{}
  window.CURID=kwKey(x);const el=ov(`<div class="plhd"><b>🔑 ${esc(title)}</b><span>${i+1}/${L.length}</span></div><div class="pbar"><i style="width:${i/L.length*100}%"></i></div><div class="plq">${q}${ty?'<input id="plin" autocomplete="off" placeholder="쉼표로 구분해 입력 후 Enter (모르면 그냥 Enter)">':''}<div id="plans" class="hide">${ans}<div id="kwsc"></div></div><div id="plbtn" class="row"><button class="sbtn" id="plrev">${ty?'정답 보기 (Space)':'탭해서 보기'}</button></div></div>`);
  window.KWU=()=>{const u=KST.pop();if(!u)return false;undo();i=u.i;c=u.c;miss.length=u.m;const y=L[i];if(y){y.i=u.xi;y.g=JSON.parse(u.g)||undefined;if(y.g===undefined)delete y.g}ovClose&&0;next();return true};
  const A=el.querySelector('#plans'),B=el.querySelector('#plbtn'),I=el.querySelector('#plin');let shown=false,auto=null;
  const show=()=>{if(shown)return;shown=true;A.classList.remove('hide');if(x.g&&!(I&&I.value.trim())){const mk=el.querySelector('mark.blk.cur');if(mk){mk.classList.add('rev');mk.textContent='( '+keys[0]+' )'}}
   if(I&&I.value.trim()){if(x.k=='Q'){auto=null;el.querySelector('#kwsc').innerHTML=`<div class="mut small">내 답: ${esc(I.value)}</div>`}else if(x.k=='S'){auto=keys.some(k=>norm(k)==norm(I.value))||judge(I.value,{term:keys.join('/'),en:''})>0;el.querySelector('#kwsc').innerHTML=`<div class="pill ${auto?'ok':'bad'}">${auto?'✓ 정답':'✗ 오답'}</div>${auto?'':`<div class="myans">내 답: <s>${esc(I.value)}</s></div>`}`;if(!auto)window._smine=I.value}else if(x.g!=null){auto=judge(I.value,{term:keys.join('/'),en:''})>0||keys.some(k=>norm(k)==norm(I.value));if(x.g!=null){x.u[x.i]=I.value;const mk=el.querySelector('mark.blk.cur');if(mk){mk.classList.add(auto?'ok':'bad');mk.textContent='( '+keys[0]+' )'}}el.querySelector('#kwsc').innerHTML=`<div class="pill ${auto?'ok':'bad'}">${auto?'✓ 정답':'✗ 오답'}</div>${auto?'':`<div class="myans">내 답: <s>${esc(I.value)}</s></div>`}`}else{let h=0;A.querySelectorAll('.kwk').forEach(s=>{const ok=kwHit(I.value,s.dataset.k);s.classList.add(ok?'hit':'mis');if(ok)h++});auto=h>=Math.ceil(keys.length*0.6);el.querySelector('#kwsc').innerHTML=`<div class="pill ${auto?'ok':'bad'}">${h}/${keys.length} 키워드</div>`}}
   else if(I)auto=false;
   B.innerHTML=`<button class="sbtn bad" data-g="0">✗ 놓침 (1)</button><button class="sbtn ok" data-g="1">✓ 썼음 (2)</button>`;if(I&&I.value.trim()&&auto===false){B.insertAdjacentHTML('beforeend','<button class="sbtn" id="kwov" title="자동 채점이 틀렸을 때">사실 맞음</button>');B.querySelector('#kwov').onclick=()=>{const o={at:Date.now(),id:kwKey(x),mine:I.value.slice(0,100),ans:String(keys[0]||'').slice(0,100)};const q=LS.get('gv_ovr',[]);q.push(o);LS.set('gv_ovr',q.slice(-500));try{window.ovrUp&&ovrUp()}catch(e){}grade(1)}}B.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>grade(+b.dataset.g))};
  const grade=g=>{if(x.k=='S'){const st=LS.get('gv_sq',{});const r=st[x.q.id]||(st[x.q.id]={n:0,c:0});r.n++;if(g)r.c++;LS.set('gv_sq',st);if(!g&&!t)missAdd({d:'sq',id:'s:'+x.q.id,term:x.q.ans||x.q.con,mine:window._smine||'',sub:x.q.cat||'',how:window._smine?'typed':'self'})}window._smine='';{const sn=kwSeen();sn[kwKey(x)]=1;LS.set('gv_kwseen',sn)}KST.push({i,xi:x.i,g:JSON.stringify(x.g||null),c,m:miss.length});if(t){record(t.term,!!g,'kw');if(!g){srs[t.term]=sched(srs[t.term],1);miss.push(t.term)}else if(!srs[t.term])srs[t.term]=sched(null,3)}if(g)c++;if(x.g){x.g[x.i]=g;const r=blOf(x).findIndex((z,j)=>x.g[j]==null);if(r>=0){x.i=r;buzz(g?8:[8,30,8]);save();return next()}}if(!g){const I2=el.querySelector('#plin');if(I2&&I2.value.trim()&&(t||keys[0]))conf.push([I2.value.trim(),(x.k=='K'||x.k=='V')&&t?t.term:keys[0]]);if(!missX.includes(x))missX.push(x);if(!x._rq){const y=Object.assign({},x,{_rq:1});if(y.g){y.g={};y.u={};y.i=0}L.splice(Math.min(L.length,i+4),0,y)}}i++;buzz(g?8:[8,30,8]);save();next()};
  el.querySelector('#plrev').onclick=show;if(I){setTimeout(()=>I.focus(),0);I.onkeydown=e=>{if(e.key=='Enter'&&!shown){e.preventDefault();e.stopPropagation();show()}}}
  const cd=el.querySelector('.plq');if(x.g)el.querySelectorAll('mark.blk[role]').forEach(m=>m.onclick=e=>{e.stopPropagation();const j=+m.dataset.j;if(j!=x.i&&!shown){x.i=j;next()}else show()});cd.onclick=e=>{if(!ty&&!shown&&!e.target.closest('button'))show()};let sx=null;cd.ontouchstart=e=>{sx=e.touches[0].clientX};cd.ontouchend=e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(shown){if(dx>60)grade(1);else if(dx<-60)grade(0)}};
  document.onkeydown=e=>{if(e.target==I&&!shown)return;if(!shown&&e.key==' '){e.preventDefault();show();return}if(shown){if(e.key=='1')grade(0);else if(e.key=='2')grade(1);else if(e.key=='Enter'){e.preventDefault();grade(auto===false?0:1)}}}}
 function fin(){document.onkeydown=null;window.KWU=null;const el=ov(`<div class="rescard"><div class="disp">${L.length?Math.round(c/L.length*100):0}%</div><div class="small mut">${L.length}문항 · 맞음 ${c} · 놓침 ${missX.length}</div></div><p>${L.some(z=>z._rq)?' (틀린 문항은 세션 안에서 한 번 더 나왔어요)':''}${miss.length?` 놓친 ${miss.length}개는 10분 뒤 복습에 나와요.`:''}</p>${miss.length?'<p class="mut small">'+miss.map(esc).join(' · ')+'</p>':''}${conf.length?'<p class="small">오늘 헷갈린 짝: '+conf.slice(-2).map(([a,b])=>esc(a)+' → <b>'+esc(b)+'</b>').join(' · ')+'</p>':''}<div class="row">${missX.length?'<button class="sbtn pri" id="kwre">틀린 '+missX.length+'개 다시</button>':''}<button class="sbtn" id="kwag">다시 고르기</button><button class="sbtn" id="plcl">닫기</button></div>`);el.querySelector('#kwag').onclick=kwMenu;const re=el.querySelector('#kwre');re&&(re.onclick=()=>kwRun(missX.map(x=>{const y=Object.assign({},x);delete y._rq;if(y.g){y.g={};y.u={};y.i=0}return y}),title+' · 다시'));el.querySelector('#plcl').onclick=ovClose}
 next()}
(function(){const g0=go;go=function(m){if(m=='kw'){$$('#nav button').forEach(x=>x.classList.toggle('on',x.dataset.m=='kw'));kwMenu();return}return g0.apply(this,arguments)}})();

function kwKey(x){return x.k+':'+(x.t?x.t.term:x.p?x.p.id:x.q?(x.q.id||x.q.w+'|'+String(x.q.q).slice(0,40)):'')}
function kwAll(kd,P,ttl){const sfk=JSON.stringify(sfGet())+deck;let r=LS.get('gv_kwres',null);const M=new Map(P.map(x=>[kwKey(x),x]));
 if(r&&r.kd==kd&&r.sf==sfk&&r.i<r.keys.length&&!kwAll._fresh){const L=r.keys.map(k=>M.get(k)).filter(Boolean);kwRun(L,ttl+' · 전부',r);toast(`이어서 풀어요 (${r.i}/${r.keys.length})`,'처음부터',()=>{localStorage.removeItem('gv_kwres');kwAll._fresh=1;ovClose();kwAll(kd,P,ttl);kwAll._fresh=0},5000);return}
 const tOf=x=>x.t||(x.p&&findT((x.p.rel||[])[x.i||0]||''))||(x.k=='W'&&findT(x.p.bl[0][1]))||null,hot=x=>{const t=tOf(x);return !!t&&(!!wrong[t.term]||marks[t.term]=='bad'||(srs[t.term]&&srs[t.term].due<endOfToday()))};const L=kwOrder(P,0);
 r={kd,sf:sfk,keys:L.map(kwKey),i:0};kwRun(L,ttl+' · 전부',r)}

function kwSeen(){return LS.get('gv_kwseen',{})}
function kwHot(x){const t=x.t||(x.p&&findT((x.p.rel||[])[x.i||0]||''))||(x.k=='W'&&findT(x.p.bl[0][1]))||null;return !!t&&(!!wrong[t.term]||marks[t.term]=='bad'||(srs[t.term]&&srs[t.term].due<endOfToday()))}
function kwOrder(P,N){const sn=kwSeen(),un=shuffle(P.filter(x=>!sn[kwKey(x)])),seen=P.filter(x=>sn[kwKey(x)]),hot=seen.filter(kwHot).sort((a,b)=>kwPri(a)-kwPri(b)),rest=seen.filter(x=>!kwHot(x));const L=[...un,...hot,...(N?rest.sort((a,b)=>kwPri(a)-kwPri(b)):shuffle(rest))];return N?L.slice(0,N):L}
function kwUnseen(kd,sc){const sn=kwSeen();return kwPool(kd,sc).filter(x=>!sn[kwKey(x)]).length}

;window.__gvStage=12;
// ---- 화면 모드 (자동/모바일/태블릿/PC) ----
function uiEff(){const o=S.ui||'auto';if(o!='auto')return o;const w=innerWidth;return w<760?'m':w<1200?'tab':'pc'}
function uiApply(){const e=uiEff();document.documentElement.dataset.ui=e;document.documentElement.dataset.uiforce=(S.ui&&S.ui!='auto')?'1':'0'}
uiApply();addEventListener('resize',()=>{clearTimeout(uiApply.t);uiApply.t=setTimeout(uiApply,120)});
(function(){const r0=renderData;renderData=function(){r0.apply(this,arguments);const v=$('#v-data');if(!v||v.querySelector('#uiseg'))return;
 v.insertAdjacentHTML('afterbegin',`<div class="box sec"><h2>🖥️ 화면 모드</h2><div class="seg" id="uiseg">${[['auto','자동'],['m','📱 모바일'],['tab','태블릿'],['pc','💻 PC']].map(([k,l])=>`<button data-u="${k}" class="${(S.ui||'auto')==k?'on':''}">${l}</button>`).join('')}</div><p class="mut small">자동: 화면 폭에 따라 390 모바일 · 768 태블릿 · 1200+ PC 다단 화면. 지금: ${({m:'모바일',tab:'태블릿',pc:'PC'})[uiEff()]}</p></div>`);
 v.querySelector('#uiseg').onclick=e=>{const b=e.target.closest('button');if(!b)return;S.ui=b.dataset.u;save();uiApply();v.querySelector('#uiseg').closest('.box').remove();renderData()}}})();

;window.__gvStage=13;
// ---- 홈/내비 빠른 시작 탭: 7일 · 10일 · 벼락치기 ----
function plRemain(L){const p=plGet();const start=p?p.start:kstYMD();const el=Math.max(0,-dayDiff(start));const di=el%L;const done=(p&&p.done)||{};
 if(di==L-1)return plMisses(p||{miss:{}}).filter(k=>!done[k]).length;return plSchedule(L)[di].filter(k=>!done[k]).length}
function plStart(L){let p=plGet();if(!p){p={len:L,start:kstYMD(),cyc:null,done:{},miss:{}}}
 else if(p.len!=L){const el=Math.max(0,-dayDiff(p.start));p.len=L;p.cyc=Math.floor(el/L);toast(`${L}일 플랜으로 전환 · 진행 기록 유지`)}
 if(p.cyc==null){const el=Math.max(0,-dayDiff(p.start));p.cyc=Math.floor(el/p.len)}
 plSet(p);plRun(false)}
function qtabs(){const p=plGet(),cur=p&&p.len;const r7=plRemain(7),r10=plRemain(10),cp=cramPool().length;
 return `<div class="qtabs" id="qtabs"><button data-q="7" class="${cur==7?'on':''}"><b>📅 7일 플랜</b><span>오늘 ${r7}개 남음</span></button><button data-q="10" class="${cur==10?'on':''}"><b>🗓️ 10일 플랜</b><span>오늘 ${r10}개 남음</span></button><button data-q="c"><b>⚡ 벼락치기</b><span>우선 ${cp}개</span></button></div>`}
function qtabsBind(root){root.querySelectorAll('#qtabs [data-q]').forEach(b=>b.onclick=()=>{const q=b.dataset.q;if(q=='c')cramMenu();else plStart(+q)})}
(function(){const _rh=renderHome;renderHome=function(){_rh.apply(this,arguments);const v=$('#v-home');if(!v)return;const o=v.querySelector('#qtabs');if(o)o.remove();v.insertAdjacentHTML('afterbegin',qtabs());qtabsBind(v)}})();
(function(){const g0=go;go=function(m){if(m=='plan'){$$('#nav button').forEach(x=>x.classList.toggle('on',x.dataset.m=='plan'));const o=ov(`<h2>⚡ 바로 풀기</h2>${qtabs()}<p class="mut small">플랜은 오늘 시작일로 자동 생성돼요. 7일↔10일을 바꿔도 이미 푼 기록은 유지돼요.</p>`);qtabsBind(o);return}return g0.apply(this,arguments)}})();

;window.__gvStage=14;
// ---- 🎧 듣기 모드 ----
var LSN={on:false,i:0,L:[],tmo:null,cfg:null};
function lsCfg(){if(!LSN.cfg){try{LSN.cfg=JSON.parse(localStorage.gv_listen||'')}catch(e){LSN.cfg=null}LSN.cfg=Object.assign({src:'deck',gap:3,rate:1,parts:{keys:1,def:1,vs:1},n:30},LSN.cfg||{})}return LSN.cfg}
function lsSave(){localStorage.gv_listen=JSON.stringify(LSN.cfg)}
function lsPool(src){let L;
 if(src=='plan'){const st=plState();if(!st||st.before!=null)return[];const d=plToday(st);L=d.todo.concat(d.behind).filter(k=>k.startsWith('t:')).map(k=>findT(k.slice(2))).filter(Boolean)}
 else if(src=='cram')L=cramPool();
 else if(src=='bad')L=T.filter(t=>marks[t.term]=='bad'||wrong[t.term]);
 else if(src=='due')L=dueList(T);
 else L=T.filter(inDeck).filter(t=>cat=='전체'||grpOf(t.cat)==cat).sort(()=>Math.random()-.5);
 return L}
function lsVoice(){const v=speechSynthesis.getVoices().filter(v=>/^ko/i.test(v.lang));return v.find(x=>/Google|Yuna|Heami|SunHi/i.test(x.name))||v[0]||null}
function lsSay(text,cb){const u=new SpeechSynthesisUtterance(String(text).replace(/[㉠-㉯]/g,'').replace(/·/g,', ').replace(/→/g,' 에서 ').replace(/↔|vs/g,' 대 '));u.lang='ko-KR';u.rate=lsCfg().rate;const v=lsVoice();if(v)u.voice=v;let done=false;const f=()=>{if(done)return;done=true;cb&&cb()};u.onend=f;u.onerror=f;speechSynthesis.speak(u)}
function lsWait(s,cb){clearTimeout(LSN.tmo);LSN.tmo=setTimeout(cb,s*1000)}
function lsSeq(t){const c=lsCfg(),q=[];q.push(['say',t.term]);q.push(['wait',c.gap]);
 if(c.parts.keys&&t.keys)q.push(['say','키워드. '+t.keys]);if(c.parts.def)q.push(['say',t.def]);
 if(c.parts.vs&&t.vs)q.push(['say','비교. '+t.vs]);q.push(['wait',1.2]);return q}
function lsPlay(){if(!LSN.on)return;if(LSN.i>=LSN.L.length){LSN.on=false;lsUI();lsSay('끝났어요. 수고했어요.');return}
 const t=LSN.L[LSN.i];lsUI();lsMeta(t);const q=lsSeq(t);let k=0;const tok=LSN.tok=Math.random();
 const step=()=>{if(!LSN.on||tok!==LSN.tok)return;if(k>=q.length){LSN.i++;return lsPlay()}const [ty,v]=q[k++];if(ty=='say')lsSay(v,step);else lsWait(v,step)};step()}
function lsStop(){LSN.on=false;LSN.tok=0;clearTimeout(LSN.tmo);try{speechSynthesis.cancel()}catch(e){}}
function lsToggle(){if(LSN.on){lsStop();lsUI()}else{LSN.on=true;lsPlay()}if('mediaSession'in navigator)navigator.mediaSession.playbackState=LSN.on?'playing':'paused'}
function lsSkip(d){lsStop();LSN.i=Math.max(0,Math.min(LSN.L.length,LSN.i+d));LSN.on=true;lsPlay()}
function lsMark(){const t=LSN.L[LSN.i];if(!t)return;marks[t.term]='bad';srs[t.term]=sched(srs[t.term],1);save();toast('헷갈려요 + 복습에 추가')}
function lsMeta(t){if(!('mediaSession'in navigator))return;try{navigator.mediaSession.metadata=new MediaMetadata({title:t.term,artist:'지리 듣기 '+(LSN.i+1)+'/'+LSN.L.length,album:'지리 임용 단어장'});
 const ms=navigator.mediaSession;ms.setActionHandler('play',()=>{if(!LSN.on)lsToggle()});ms.setActionHandler('pause',()=>{if(LSN.on)lsToggle()});ms.setActionHandler('nexttrack',()=>lsSkip(1));ms.setActionHandler('previoustrack',()=>lsSkip(-1));ms.setActionHandler('stop',()=>{lsStop();lsUI()})}catch(e){}}
function lsUI(){const el=document.getElementById('lsnow');if(!el)return;const t=LSN.L[LSN.i];
 el.innerHTML=t?`<div class="pltag">${LSN.i+1}/${LSN.L.length} · ${esc(t.cat)}</div><div class="plterm">${esc(t.term)}</div><div class="plkeys">🔑 ${esc(t.keys||'')}</div><div class="mut small">${esc(t.def)}</div>${t.vs?`<div class="plvs">↔ ${esc(t.vs)}</div>`:''}`:'<p class="mut">재생할 항목을 고르고 ▶를 누르세요.</p>';
 const b=document.getElementById('lspp');if(b)b.textContent=LSN.on?'⏸ 일시정지':'▶ 재생'}
function lsMenu(){const c=lsCfg();
 if(!('speechSynthesis'in window)){ov('<h2>🎧 듣기 모드</h2><p>이 브라우저는 음성 합성(Web Speech)을 지원하지 않아요. 크롬·사파리 최신 버전에서 열어 주세요.</p>');return}
 const SRC=[['deck','덱·과목'],['plan','오늘 플랜'],['cram','벼락치기 우선순'],['bad','헷갈려요·오답'],['due','오늘 복습']];
 const o=ov(`<h2>🎧 듣기 모드</h2><p class="mut small">용어 → (떠올릴 시간) → 키워드·정의 → 비교쌍 순서로 읽어 줘요. 오프라인에서도 기기 음성으로 동작해요.</p>
 <div class="seg" id="lssrc">${SRC.map(([k,l])=>`<button data-s="${k}" class="${c.src==k?'on':''}">${l}</button>`).join('')}</div>
 <div class="row small"><label>떠올릴 시간 <select id="lsgap">${[1,2,3,5,8].map(v=>`<option ${c.gap==v?'selected':''}>${v}</option>`).join('')}</select>초</label>
 <label>속도 <select id="lsrate">${[0.8,0.9,1,1.15,1.3,1.5].map(v=>`<option ${c.rate==v?'selected':''}>${v}</option>`).join('')}</select>×</label>
 <label>개수 <select id="lsn">${[10,30,60,120].map(v=>`<option ${c.n==v?'selected':''}>${v}</option>`).join('')}</select></label></div>
 <div class="row small"><label><input type="checkbox" id="lpk" ${c.parts.keys?'checked':''}> 키워드</label><label><input type="checkbox" id="lpd" ${c.parts.def?'checked':''}> 정의</label><label><input type="checkbox" id="lpv" ${c.parts.vs?'checked':''}> 비교쌍</label></div>
 <div class="box" id="lsnow"></div>
 <div class="row"><button class="sbtn" id="lsprev">⏮</button><button class="sbtn ok" id="lspp">▶ 재생</button><button class="sbtn" id="lsnext">⏭</button><button class="sbtn bad" id="lsbad">헷갈려요</button></div>
 <p class="small mut">ⓘ AI 음성은 화면이 꺼져도 대부분 이어서 재생돼요. 기기 음성은 화면이 꺼지면 iOS·일부 안드로이드에서 멈출 수 있으니 화면을 켜 두세요. 지원 기기에서는 이어폰·잠금화면 ⏯⏭ 버튼으로 조작돼요.</p>`);
 const load=()=>{const L=lsPool(c.src);LSN.L=L.slice(0,c.n);LSN.i=0;lsUI()};
 o.querySelector('#lssrc').onclick=e=>{const b=e.target.closest('button');if(!b)return;c.src=b.dataset.s;lsSave();o.querySelectorAll('#lssrc button').forEach(x=>x.classList.toggle('on',x==b));lsStop();load();if(!LSN.L.length)toast('이 범위엔 항목이 없어요')};
 const sel=(id,k)=>o.querySelector(id).onchange=e=>{c[k]=+e.target.value;lsSave();if(k=='n'){lsStop();load()}};sel('#lsgap','gap');sel('#lsrate','rate');sel('#lsn','n');
 [['#lpk','keys'],['#lpd','def'],['#lpv','vs']].forEach(([id,k])=>o.querySelector(id).onchange=e=>{c.parts[k]=e.target.checked?1:0;lsSave()});
 o.querySelector('#lspp').onclick=()=>{if(!LSN.L.length)load();if(!LSN.L.length){toast('재생할 항목이 없어요');return}lsToggle()};
 o.querySelector('#lsnext').onclick=()=>lsSkip(1);o.querySelector('#lsprev').onclick=()=>lsSkip(-1);o.querySelector('#lsbad').onclick=lsMark;
 document.onkeydown=e=>{if(e.target.tagName=='SELECT')return;if(e.key==' '){e.preventDefault();o.querySelector('#lspp').click()}else if(e.key=='ArrowRight')lsSkip(1);else if(e.key=='ArrowLeft')lsSkip(-1);else if(e.key=='x')lsMark()};
 load()}
(function(){const _c=ovClose;ovClose=function(){lsStop();return _c.apply(this,arguments)};
 const _rh=renderHome;renderHome=function(){_rh.apply(this,arguments);const v=$('#v-home');if(!v||v.querySelector('#lsbtn'))return;const q=v.querySelector('#qtabs');const h='<button class="sbtn" id="lsbtn" style="width:100%;margin:6px 0">🎧 듣기 모드 (출퇴근용)</button>';if(q)q.insertAdjacentHTML('afterend',h);else v.insertAdjacentHTML('afterbegin',h);v.querySelector('#lsbtn').onclick=lsMenu}})();

;window.__gvStage=15;
// ---- 🎤 서울 2차 연습 ----
var S2D=null,S2T={iv:null},S2R={rec:null,chunks:[],url:null};
function s2(){if(!S2D){try{S2D=JSON.parse(document.getElementById('s2d').textContent)}catch(e){S2D={}}}return S2D}
function s2get(k,d){try{return JSON.parse(localStorage['gv_s2_'+k])??d}catch(e){return d}}
function s2set(k,v){localStorage['gv_s2_'+k]=JSON.stringify(v)}
function mmss(s){s=Math.max(0,Math.round(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function s2Badge(st){const c={'공식':'ok','official':'ok','복원':'warn','복원(부분)':'warn','연습':'mut'};const k=/공식|official|기출/.test(st)?'ok':/복원/.test(st)?'warn':'mut';return `<span class="s2b ${k}">${esc(st)}</span>`}
// phased timer: phases=[{name,sec}]
function s2Timer(el,phases,onPhase){clearInterval(S2T.iv);let i=0,left=phases[0].sec,run=true;const box=el.querySelector('.s2tm');
 const draw=()=>{const p=phases[i];box.innerHTML=`<div class="s2clock ${left<=60?'low':''}">${mmss(left)}</div><div class="small">${esc(p.name)} (${i+1}/${phases.length})</div><div class="row"><button class="sbtn" data-t="pp">${run?'⏸':'▶'}</button><button class="sbtn" data-t="nx">다음 단계 ⏭</button></div>`;
  box.querySelector('[data-t=pp]').onclick=()=>{run=!run;draw()};box.querySelector('[data-t=nx]').onclick=()=>adv()};
 const adv=()=>{buzz([60,40,60]);if(i+1>=phases.length){clearInterval(S2T.iv);box.innerHTML='<div class="s2clock">종료</div><div class="small">"이상입니다."</div>';onPhase&&onPhase(phases.length);return}i++;left=phases[i].sec;onPhase&&onPhase(i);draw()};
 S2T.iv=setInterval(()=>{if(!run)return;left--;if(left==60)buzz(30);if(left<=0)adv();else{const c=box.querySelector('.s2clock');if(c){c.textContent=mmss(left);c.classList.toggle('low',left<=60)}}},1000);onPhase&&onPhase(0);draw()}
// recorder (local only)
function s2RecUI(){if(!(navigator.mediaDevices&&window.MediaRecorder))return '<p class="small mut">이 브라우저는 녹음을 지원하지 않아요.</p>';return `<div class="row"><button class="sbtn" id="s2rec">🎙 녹음 시작</button><span id="s2recout" class="small"></span></div><p class="small mut">녹음은 이 기기 메모리에만 있고 서버로 보내지 않아요. 창을 닫으면 사라지니 필요하면 저장하세요.</p>`}
function s2RecBind(o){const b=o.querySelector('#s2rec');if(!b)return;b.onclick=async()=>{
 if(S2R.rec&&S2R.rec.state=='recording'){S2R.rec.stop();return}
 try{const st=await navigator.mediaDevices.getUserMedia({audio:true});S2R.chunks=[];S2R.rec=new MediaRecorder(st);S2R.rec.ondataavailable=e=>S2R.chunks.push(e.data);
  S2R.rec.onstop=()=>{st.getTracks().forEach(t=>t.stop());if(S2R.url)URL.revokeObjectURL(S2R.url);const bl=new Blob(S2R.chunks,{type:S2R.rec.mimeType||'audio/webm'});S2R.url=URL.createObjectURL(bl);b.textContent='🎙 다시 녹음';const out=o.querySelector('#s2recout');if(out)out.innerHTML=`<audio controls src="${S2R.url}"></audio> <a download="2차연습_${kstYMD()}.webm" href="${S2R.url}">저장</a>`};
  S2R.rec.start();b.textContent='⏹ 녹음 중지'}catch(e){toast('마이크 권한이 필요해요')}}}
function s2Stop(){clearInterval(S2T.iv);try{if(S2R.rec&&S2R.rec.state=='recording')S2R.rec.stop()}catch(e){}}
function s2Menu(){const d=s2();const due=s2CardDue().length;
 ov(`<h2>🎤 서울 2차 연습</h2><p class="small mut">2027학년도 서울: 지도안·수업실연 1/20(수), 심층면접 1/21(목). <span class="s2b ok">공식</span>은 교육청 공고, <span class="s2b warn">복원</span>은 후기, <span class="s2b mut">연습</span>은 기출이 아닌 연습 템플릿이에요.</p>
 <div class="plgrid s2grid"><button class="sbtn" data-s="lec"><b>📖 교육정책 특강</b><br><span class="small">서울교육 2기 비전·5대 방향</span></button>
 <button class="sbtn" data-s="cards"><b>🗂 정책 암기 카드</b><br><span class="small">${(d.cards||[]).length}장 · 오늘 ${due}</span></button>
 <button class="sbtn" data-s="iv"><b>🗣 심층면접</b><br><span class="small">구상 15분 · 6+3+3+3</span></button>
 <button class="sbtn" data-s="demo"><b>👩‍🏫 수업실연</b><br><span class="small">구상 20분 + 실연 20분</span></button>
 <button class="sbtn" data-s="lp"><b>📝 지도안</b><br><span class="small">60분 · 성취기준 찾기</span></button>
 <button class="sbtn" data-s="std"><b>🔎 성취기준</b><br><span class="small">2022 중학 사회(지리) ${(d.std||[]).reduce((a,u)=>a+u.stds.length,0)}개</span></button></div>`).querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>({lec:s2Lec,cards:s2Cards,iv:s2IvMenu,demo:s2DemoMenu,lp:s2Lp,std:()=>s2Std()})[b.dataset.s]())}
function s2Back(){return '<button class="sbtn s2back" onclick="s2Stop();s2Menu()">← 2차 메뉴</button>'}
function s2Lec(){ov(`${s2Back()}<article class="s2lec">${s2().lec}</article>${s2Back()}`)}
// ---- 정책 카드 SRS ----
function s2Srs(){return s2get('srs',{})}
function s2CardDue(){const s=s2Srs(),c=s2().cards||[],now=Date.now();return c.filter(x=>!s[x.term]||s[x.term].due<=now)}
function s2Cards(){const all=s2().cards||[];let L=s2CardDue();if(!L.length)L=all.slice().sort(()=>Math.random()-.5).slice(0,10);let i=0,ok=0;const ty=!isTouch();
 const next=()=>{if(i>=L.length){ov(`${s2Back()}<h2>🗂 끝!</h2><p>${ok}/${L.length} 기억함. 놓친 카드는 내일 다시 나와요.</p>`);return}
  const c=L[i];const kws=c.keywords||[];
  const o=ov(`${s2Back()}<div class="plhd"><b>🗂 정책 카드</b><span>${i+1}/${L.length}</span></div><div class="plq"><div class="pltag">${esc(c.scope||'')} ${c.verified===false?'<span class="s2b warn">재확인 필요</span>':''}</div><div class="plterm">${esc(c.term)} <button class="sbtn s2say" data-t="${esc(c.term)}" title="AI 음성으로 듣기">🔊</button>${typeof audVoiceBtn=='function'?audVoiceBtn():''}</div><div class="mut">핵심 키워드 ${kws.length}개 + 지리 수업 적용을 떠올려 보세요</div>${ty?'<input id="plin" placeholder="키워드를 쉼표로 입력 후 Enter">':''}
  <div id="plans" class="hide"><div class="plkeys">${kws.map(k=>`<span class="kwk" data-k="${esc(k)}">${esc(k)}</span>`).join('')}</div><div class="pldef">${esc(c.def||c.purpose||'')}</div>${c.purpose&&c.def?`<div class="small">목적: ${esc(c.purpose)}</div>`:''}<div class="small">📍 지리 수업: ${esc(c.practice_geo||'')}</div><div class="small">🏫 담임: ${esc(c.practice_homeroom||'')}</div><div class="small mut">출처 ${esc(c.date||'')} ${(c.source||[]).map((u,j)=>`<a href="${esc(u)}" target="_blank" rel="noopener">[${j+1}]</a>`).join(' ')}</div><div id="kwsc"></div></div>
  <div id="plbtn" class="row"><button class="sbtn" id="plrev">${ty?'확인 (Space)':'탭해서 보기'}</button></div></div>`);
  const A=o.querySelector('#plans'),B=o.querySelector('#plbtn'),I=o.querySelector('#plin');let shown=false;
  const grade=g=>{const s=s2Srs(),p=s[c.term]||{n:0,iv:0};if(g){p.n++;p.iv=p.iv?Math.min(30,Math.round(p.iv*2.2)):1}else{p.n=0;p.iv=0}p.due=Date.now()+(p.iv?p.iv*864e5:6e5);s[c.term]=p;s2set('srs',s);if(g)ok++;i++;next()};
  const show=()=>{if(shown)return;shown=true;A.classList.remove('hide');if(I&&I.value.trim()){let h=0;A.querySelectorAll('.kwk').forEach(s=>{const hit=kwHit(I.value,s.dataset.k);s.classList.add(hit?'hit':'mis');if(hit)h++});o.querySelector('#kwsc').innerHTML=`<div class="pill ${h>=Math.ceil(kws.length*.6)?'ok':'bad'}">${h}/${kws.length} 키워드</div>`}
   B.innerHTML='<button class="sbtn bad" data-g="0">✗ 몰랐음 (1)</button><button class="sbtn ok" data-g="1">✓ 알았음 (2)</button>';B.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>grade(+b.dataset.g))};
  o.querySelector('#plrev').onclick=show;if(I){I.focus();I.onkeydown=e=>{if(e.key=='Enter'){e.preventDefault();e.stopPropagation();show()}}}
  const q=o.querySelector('.plq');q.onclick=e=>{if(!ty&&!shown&&!e.target.closest('button,a'))show()};let sx=null;q.ontouchstart=e=>sx=e.touches[0].clientX;q.ontouchend=e=>{if(sx==null||!shown)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>60)grade(dx>0?1:0);sx=null};
  document.onkeydown=e=>{if(e.target==I&&!shown)return;if(!shown&&e.key==' '){e.preventDefault();show()}else if(shown&&(e.key=='1'||e.key=='2'))grade(e.key=='2'?1:0)}};next()}
// ---- 심층면접 ----
function s2IvSets(){const q=s2().iq||[],sets={};q.forEach(x=>{(sets[x.year]=sets[x.year]||[]).push(x)});
 const out=Object.entries(sets).filter(([y,a])=>a.some(x=>x.type=='구상형')).map(([y,a])=>({name:`${y}학년도 서울 (복원)`,qs:a,kind:'복원'}));
 const dr=s2().drills||[];for(let i=0;i+2<dr.length;i+=3){const a=dr.slice(i,i+3);out.push({name:`정책 연계 연습 세트 ${i/3+1} (기출 아님)`,kind:'연습',qs:[{type:'구상형',question:a[0].prompt,answer_frame:a[0].frame,status:'연습'},{type:'구상형',question:a[1].prompt,answer_frame:a[1].frame,status:'연습'},{type:'즉답형',question:a[2].prompt,answer_frame:a[2].frame,status:'연습'}]})}
 return out}
function s2IvMenu(){const S=s2IvSets();const o=ov(`${s2Back()}<h2>🗣 심층면접</h2><p class="small mut">공식 형식(2026학년도 공고): 구상 15분 → 면접 15분. 구상형 2문항 6분 이내, 구상형 추가질문 3분, 즉답형 3분, 즉답형 추가질문 3분. 문제는 읽지 않고 답만 말해요.</p>
 ${S.map((s,i)=>`<button class="sbtn s2row" data-i="${i}">${s2Badge(s.kind)} ${esc(s.name)} <span class="small mut">${s.qs.length}문항</span></button>`).join('')}
 <details><summary>복원 문항 전체 보기·답변 틀</summary>${(s2().iq||[]).map(q=>`<div class="box"><div>${s2Badge(q.status)} <b>${esc(q.id)}</b> · ${esc(q.type)}</div><p>${esc(q.question)}</p><div class="small">🧩 답변 틀: ${(q.answer_frame||[]).map(esc).join(' / ')}</div><div class="small mut">${esc(q.answer_frame_origin||'연습용 답변 틀(출처 아님)')} · <a href="${esc(q.source||'#')}" target="_blank" rel="noopener">출처</a></div></div>`).join('')}</details>`);
 o.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>s2IvRun(S[+b.dataset.i]))}
function s2IvRun(set){const Q=set.qs,gu=Q.filter(q=>q.type=='구상형'),gx=Q.filter(q=>/추가질문\(구상/.test(q.type)),jd=Q.filter(q=>q.type=='즉답형'),jx=Q.filter(q=>/추가질문\(즉답/.test(q.type));
 const qh=(arr,lab)=>arr.length?arr.map((q,i)=>`<div class="box"><b>${lab}${arr.length>1?' '+(i+1):''}</b> ${s2Badge(q.status||set.kind)}<p>${esc(q.question)}</p><details class="small"><summary>답변 틀 보기</summary>${(q.answer_frame||[]).map(f=>'• '+esc(f)).join('<br>')}<div class="mut">연습용 답변 틀(출처 아님)</div></details></div>`).join(''):`<div class="box mut small">${lab}: 이 세트엔 복원 문항이 없어요 — 직전 답변의 근거·실천 사례를 스스로 덧붙여 보세요.</div>`;
 const memo=s2get('ivmemo','');
 const o=ov(`${s2Back()}<h2>🗣 ${esc(set.name)}</h2><div class="s2tm"></div><div id="s2ivq"></div><textarea id="s2memo" class="s2ta" placeholder="구상 메모 (이 기기에만 저장)">${esc(memo)}</textarea>${s2RecUI()}`);
 o.querySelector('#s2memo').oninput=e=>s2set('ivmemo',e.target.value);s2RecBind(o);
 const ph=[{name:'구상 (구상형 문항 확인·메모)',sec:900},{name:'구상형 2문항 답변',sec:360},{name:'구상형 추가질문',sec:180},{name:'즉답형',sec:180},{name:'즉답형 추가질문',sec:180}];
 const box=o.querySelector('#s2ivq');s2Timer(o,ph,i=>{box.innerHTML=i==0||i==1?qh(gu,'구상형'):i==2?qh(gx,'추가질문'):i==3?qh(jd,'즉답형'):i==4?qh(jx,'추가질문'):`<div class="box"><b>수고했어요.</b> 녹음을 들으며 ① 결론 먼저 ② 서울 정책 키워드 ③ 지리 교사로서의 구체 사례가 들어갔는지 점검하세요.</div>`})}
// ---- 수업실연 ----
function s2DemoMenu(){const d=s2();const o=ov(`${s2Back()}<h2>👩‍🏫 수업실연</h2><p class="small mut">공식: 구상실에서 본인 지도안 사본 + 문제지로 20분 구상 → 평가실 20분 실연. 소품 불가·판서만, 입실 시 관리번호만, 끝나면 "이상입니다".</p>
 <button class="sbtn s2row" data-k="e">${s2Badge('기출(실물)')} ${esc(d.exam26.label)}</button>
 ${d.ptpl.map((t,i)=>`<button class="sbtn s2row" data-k="${i}">${s2Badge('연습')} ${esc(t.label)} · ${esc(t.std)}</button>`).join('')}
 <details><summary>수업 모형별 진행 틀 (수업 틀 자료)</summary>${d.tpl.map(t=>`<div class="box"><b>${esc(t.model)}</b><div class="small">${t.steps.map((s,i)=>(i+1)+'. '+esc(s)).join(' → ')}</div>${t.tips.length?`<div class="small mut">유의: ${t.tips.map(esc).join(' / ')}</div>`:''}</div>`).join('')}</details>
 <details><summary>공식 절차·복원 경향</summary><ul class="small">${d.demo.official_procedure.items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${(d.demo.recalled_features||[]).map(r=>`<div class="small">${s2Badge('복원')} ${esc(String(r.year))} ${esc(r.subject||'')}: ${(r.items||[]).map(esc).join(' / ')}</div>`).join('')}</details>`);
 o.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=b.dataset.k;s2DemoRun(k=='e'?d.exam26:d.ptpl[+k],k=='e')})}
function s2DemoRun(c,real){const d=s2();const key='board_'+(real?'e26':c.std);const std=(d.std||[]).flatMap(u=>u.stds).find(s=>s.code==c.std||c.std&&c.std.startsWith(s.code));
 const sheet=`<div class="box s2sheet">${s2Badge(real?'기출(실물)':'연습 템플릿 · 기출 아님')}<h3>${esc(c.label)}</h3>${c.target?`<div class="small">● ${esc(c.target)}</div>`:''}<div class="small">● 성취기준: ${esc(real?c.std:(std?std.code+' '+std.text:c.std))}</div>${c.unit?`<div class="small">● 차시: ${esc(c.unit)}</div>`:''}${c.goal?`<div class="small">● 학습목표: ${esc(c.goal)}</div>`:''}<ol>${c.conds.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>`;
 const o=ov(`${s2Back()}<h2>👩‍🏫 수업실연</h2><div class="s2tm"></div><div class="s2split">${sheet}<div><b>판서 계획</b><textarea id="s2board" class="s2ta" placeholder="제목\n1. 핵심어 → 구조화(화살표·표)\n2. ...">${esc(s2get(key,''))}</textarea></div></div><div id="s2chk"></div>${s2RecUI()}`);
 o.querySelector('#s2board').oninput=e=>s2set(key,e.target.value);s2RecBind(o);
 const chk=o.querySelector('#s2chk');const done=s2get('chk',{});
 const drawChk=()=>{chk.innerHTML=`<h3>✅ 실연 체크리스트 <span class="small mut">(수업 틀 자료 기반)</span></h3>${d.check.map(([g,t],i)=>`<label class="s2ck"><input type="checkbox" data-c="${i}" ${done[i]?'checked':''}> <span class="pltag">${g}</span> ${esc(t)}</label>`).join('')}<details><summary>실연 후 성찰 질문 (수업 성찰 가이드)</summary><ol class="small">${d.refq.map(q=>`<li>${esc(q)}</li>`).join('')}</ol><p class="small mut">원 자료는 경기도 '수업 나눔' 대비용이에요. 서울 2차에는 수업나눔 평가가 없으니 셀프 점검용으로 쓰세요.</p></details>`;
  chk.querySelectorAll('[data-c]').forEach(x=>x.onchange=()=>{done[x.dataset.c]=x.checked;s2set('chk',done)})};drawChk();
 s2Timer(o,[{name:'구상 (조건 분석·판서 계획)',sec:1200},{name:'실연',sec:1200}],i=>{if(i==1)toast('실연 시작: "관리번호 ○○번입니다"')})}
// ---- 지도안 ----
function s2StdHTML(u){return `<div class="box"><b>${esc(u.name)}</b>${u.stds.map(s=>`<div class="s2std"><b>${esc(s.code)}</b> ${esc(s.text)}${s.hae?`<details class="small"><summary>해설</summary>${esc(s.hae)}</details>`:''}</div>`).join('')}${u.go?`<details class="small"><summary>적용 시 고려 사항</summary>${esc(u.go)}</details>`:''}</div>`}
function s2Std(sel){const d=s2();const U=d.std||[];const o=ov(`${s2Back()}<h2>🔎 2022 개정 중학 사회(지리) 성취기준</h2><select id="s2u"><option value="">단원 선택…</option>${U.map((u,i)=>`<option value="${i}">${u.u}. ${esc(u.name)}</option>`).join('')}</select><input id="s2q" placeholder="키워드 검색 (예: 유럽, 지속가능)"><div id="s2sl"></div><p class="small mut">출처: 2022 개정 사회과 교육과정(사용자 제공 PDF). 단원명은 성취기준 영역 기준 약칭이에요.</p>`);
 const out=o.querySelector('#s2sl'),q=o.querySelector('#s2q'),s=o.querySelector('#s2u');
 const draw=()=>{const k=q.value.trim();let L=s.value!==''?[U[+s.value]]:U;if(k)L=L.map(u=>({...u,stds:u.stds.filter(x=>(x.text+x.hae+u.name).includes(k))})).filter(u=>u.stds.length);out.innerHTML=L.map(s2StdHTML).join('')||'<p class="mut">결과가 없어요.</p>'};
 s.onchange=draw;q.oninput=draw;if(sel!=null){s.value=sel}draw()}
function s2Lp(){const d=s2(),lp=d.lp;const frame=(lp.practice_frame_NOT_exam||[]).map(x=>'■ '+x+'\n').join('\n');const saved=s2get('lp',null);
 const o=ov(`${s2Back()}<h2>📝 지도안 작성 연습</h2><div class="s2tm"></div>
 <details open><summary>${s2Badge('공식')} 작성 규정 (${esc(lp.official.time)} · ${esc(lp.official.score)})</summary><ul class="small">${lp.official.rules.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></details>
 <details><summary>${s2Badge('복원')} 내부 구조 경향</summary><ul class="small">${lp.recalled_structure.items.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></details>
 <div class="row"><select id="s2lu"><option value="">성취기준 찾기: 단원…</option>${(d.std||[]).map((u,i)=>`<option value="${i}">${u.u}. ${esc(u.name)}</option>`).join('')}</select></div><div id="s2lstd"></div>
 <div class="small mut">${s2Badge('연습')} 아래 틀은 연습용 양식이에요(기출 양식 아님). 실제 답안은 검은 펜·두 줄 수정 규정을 지켜 손으로 써 보세요.</div>
 <textarea id="s2lpt" class="s2ta big">${esc(saved??frame)}</textarea><div class="row"><button class="sbtn" id="s2lpr">틀 초기화</button><span class="small mut" id="s2lpn"></span></div>`);
 const t=o.querySelector('#s2lpt'),n=o.querySelector('#s2lpn');const cnt=()=>n.textContent=t.value.length+'자 · 자동 저장';cnt();t.oninput=()=>{s2set('lp',t.value);cnt()};
 o.querySelector('#s2lpr').onclick=async()=>{if(await askConfirm('정말로 작성 내용을 지우시겠어요?','지금까지 쓴 내용이 지워지고 기본 틀로 되돌아가요.','지우기')){t.value=frame;s2set('lp',frame);cnt()}};
 o.querySelector('#s2lu').onchange=e=>{const v=e.target.value;o.querySelector('#s2lstd').innerHTML=v===''?'':s2StdHTML(d.std[+v])};
 s2Timer(o,[{name:'지도안 작성',sec:3600}])}
(function(){const c0=ovClose;ovClose=function(){s2Stop();return c0.apply(this,arguments)};
 const g0=go;go=function(m){if(m=='s2'){$$('#nav button').forEach(x=>x.classList.toggle('on',x.dataset.m=='s2'));s2Menu();return}return g0.apply(this,arguments)};
 const _rh=renderHome;renderHome=function(){_rh.apply(this,arguments);const v=$('#v-home');if(!v||v.querySelector('#s2btn'))return;const a=v.querySelector('#lsbtn');const h='<button class="sbtn" id="s2btn" style="width:100%;margin:0 0 6px">🎤 서울 2차 연습 (면접·실연·지도안·정책)</button>';if(a)a.insertAdjacentHTML('afterend',h);else v.insertAdjacentHTML('afterbegin',h);v.querySelector('#s2btn').onclick=s2Menu}})();

;window.__gvStage=16;
// ---- 🔊 AI 음성(neural TTS mp3) 레이어: 듣기 모드·정책 카드 ----
var AUD_ROOT='../audio/',AUD_CACHE='gvb-audio-v1',AMS={},AM=null,ttsA=null;
const AUD_V={sunhi:{dir:'../audio/',label:'👩 선희'},hyunsu:{dir:'../audio/hyunsu/',label:'👨 현수'}};
function audVoice(v){v=v||audMode();return AUD_V[v]?v:'hyunsu'}
function audManifest(v){v=audVoice(v);return AMS[v]||(AMS[v]=AM=fetch(AUD_V[v].dir+'manifest.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{terms:{},policy:{}}).catch(()=>({terms:{},policy:{}})))}
function audUrl(f,v){return AUD_V[audVoice(v)].dir+f.src+'?h='+f.hash}
var AUD_BASE=AUD_ROOT;
function audEl(){if(!ttsA){ttsA=document.createElement('audio');ttsA.id='ttsA';ttsA.preload='none';document.body.appendChild(ttsA)}return ttsA}
function audMode(){const c=lsCfg();let v=c.voice||'hyunsu';if(v=='ai')v=c.voice='hyunsu';return v}
function audAI(){return audMode()!='dev'}
function audPlayUrl(url,rate){return new Promise((res,rej)=>{const a=audEl();a.onended=()=>res();a.onerror=()=>rej(new Error('audio'));a.src=url;a.playbackRate=rate||1;try{a.preservesPitch=true}catch(e){}const p=a.play();if(p&&p.catch)p.catch(rej)})}
function audSynth(text){return new Promise(r=>lsSay(text,r))}
async function audPart(text,file,tok){if(tok!==LSN.tok)return;if(file&&audAI()){try{await audPlayUrl(audUrl(file),lsCfg().rate);return}catch(e){if(tok!==LSN.tok)return}}if('speechSynthesis'in window)await audSynth(text)}
async function audGap(sec,tok){const n=Math.max(1,Math.round(sec));for(let i=0;i<n;i++){if(tok!==LSN.tok)return;if(audAI()){try{await audPlayUrl(AUD_BASE+'s/gap1.mp3',1);continue}catch(e){}}await new Promise(r=>{clearTimeout(LSN.tmo);LSN.tmo=setTimeout(r,1000)})}}
// 듣기 모드 재생 루프 교체
lsPlay=async function(){if(!LSN.on)return;if(LSN.i>=LSN.L.length){LSN.on=false;lsUI();if('speechSynthesis'in window)lsSay('끝났어요. 수고했어요.');return}
 const t=LSN.L[LSN.i];lsUI();lsMeta(t);const tok=LSN.tok=Math.random();const c=lsCfg();
 const m=audAI()?((await audManifest()).terms[t.term]||{}).files||{}:{};
 await audPart(t.term,m.term,tok);await audGap(c.gap,tok);
 if(m.body&&audAI()){const nx=LSN.L[LSN.i+1],nm=nx&&AM&&AM.then?null:null;audManifest().then(M=>{const f=nx&&M.terms[nx.term];if(f&&f.files.term)fetch(audUrl(f.files.term)).catch(()=>{})});await audPart('',m.body,tok)}
 else{const body=[c.parts.keys&&t.keys?'키워드. '+t.keys:'',c.parts.def?t.def:'',c.parts.vs&&t.vs?'비교. '+t.vs:''].filter(Boolean).join(' ');await audPart(body,null,tok)}
 await audGap(1,tok);if(!LSN.on||tok!==LSN.tok)return;LSN.i++;lsPlay()};
(function(){const _s=lsStop;lsStop=function(){_s.apply(this,arguments);if(ttsA){try{ttsA.pause()}catch(e){}}}})();
// 오프라인 저장(과목별)
async function audFilesFor(pred,pol,v){const M=await audManifest(v);const L=[];for(const[k,e]of Object.entries(M.terms||{})){const t=TM.get(k);if(pred(e,t))Object.values(e.files).forEach(f=>L.push(audUrl(f,v)))}if(pol)Object.values(M.policy||{}).forEach(e=>Object.values(e.files).forEach(f=>L.push(audUrl(f,v))));return L}
async function audCachedCount(urls){if(!('caches'in window))return 0;const c=await caches.open(AUD_CACHE);let n=0;for(const u of urls)if(await c.match(u))n++;return n}
const AUD_MBV={"sunhi": {"지형학": 23.3, "경제지리": 18.3, "기후학": 12.2, "도시지리": 11.3, "문화·역사·정치지리": 11.1, "지리교육론": 10.7, "지도학·GIS": 5.5, "지역지리": 5.0, "인구지리": 3.6, "토양·식생·수문": 3.1, "_pol": 3.7, "_all": 108}, "hyunsu": {"지형학": 22.1, "경제지리": 17.6, "기후학": 11.6, "도시지리": 10.7, "문화·역사·정치지리": 10.5, "지리교육론": 10.1, "지도학·GIS": 5.3, "지역지리": 4.7, "인구지리": 3.4, "토양·식생·수문": 2.9, "_pol": 3.5, "_all": 103}};
async function audOffline(vv){if(!('caches'in window)){toast('이 브라우저는 오프라인 저장을 지원하지 않아요');return}
 const V=audVoice(typeof vv=='string'?vv:undefined),AUD_MB=AUD_MBV[V]||{},cats=Object.keys(AUD_MB).filter(k=>k[0]!='_');
 const o=ov(`${typeof s2Back=='function'?'':''}<h2>💾 AI 음성 오프라인 저장</h2><div class="seg" id="auv">${Object.keys(AUD_V).map(k=>`<button data-v="${k}" class="${k==V?'on':''}">${AUD_V[k].label} <span class="small">${(AUD_MBV[k]||{})._all||''}MB</span></button>`).join('')}</div><p class="small mut">음성별로 따로 저장돼요. 지금 보는 음성: <b>${AUD_V[V].label}</b></p><p class="mut small">과목별로 음성 파일을 이 기기에 저장해 두면 비행기 모드·지하철에서도 AI 음성으로 들을 수 있어요. 저장하지 않은 항목은 온라인이면 바로 받아 재생하고, 오프라인이면 기기 음성으로 읽어요.</p>
 <label class="small"><input type="checkbox" id="aucore"> ⭐기출 핵심만(용량 약 1/3)</label>
 <div id="aulist">${cats.map(k=>`<div class="row small" data-c="${esc(k)}" style="justify-content:space-between;border-bottom:1px solid var(--line,#ddd);padding:6px 0"><span><b>${esc(k)}</b> <span class="mut">${AUD_MB[k]}MB</span> <span class="aust mut"></span></span><span><button class="sbtn ausv">저장</button> <button class="sbtn audl">삭제</button></span></div>`).join('')}
 <div class="row small" data-c="__pol" style="justify-content:space-between;padding:6px 0"><span><b>서울 2차 정책 카드</b> <span class="mut">${AUD_MB._pol||''}MB</span> <span class="aust mut"></span></span><span><button class="sbtn ausv">저장</button> <button class="sbtn audl">삭제</button></span></div></div>
 <div class="row"><button class="sbtn" id="auall">${AUD_V[V].label} 전체 저장(약 ${AUD_MB._all||''}MB)</button><button class="sbtn bad" id="auclr">이 음성 삭제</button></div><p class="small mut" id="auq"></p>`);
 const core=()=>o.querySelector('#aucore').checked;
 const urls=k=>k=='__pol'?audFilesFor(()=>false,true,V):audFilesFor((e,t)=>e.cat==k&&(!core()||(t&&t.core)),false,V);
 const refresh=async()=>{for(const r of o.querySelectorAll('#aulist [data-c]')){const u=await urls(r.dataset.c);const n=await audCachedCount(u);r.querySelector('.aust').textContent=u.length?(n>=u.length?'✅ 저장됨':n?`${Math.round(n/u.length*100)}% 저장`:''):''}
  if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();o.querySelector('#auq').textContent=`이 사이트 사용량 ${(e.usage/1048576).toFixed(1)}MB / 가능 ${(e.quota/1048576/1024).toFixed(1)}GB`}};
 const save1=async(r)=>{const u=await urls(r.dataset.c);const c=await caches.open(AUD_CACHE);const st=r.querySelector('.aust');let d=0,fail=0;
  if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
  const todo=[];for(const x of u)if(!(await c.match(x)))todo.push(x);d=u.length-todo.length;
  const work=async()=>{while(todo.length){const x=todo.shift();try{await c.add(x)}catch(e){fail++}d++;st.textContent=`⬇ ${Math.round(d/u.length*100)}% (${d}/${u.length})`}};
  await Promise.all([work(),work(),work(),work()]);st.textContent=fail?`⚠ ${fail}개 실패 — 다시 저장을 눌러 주세요`:'✅ 저장됨'};
 const del1=async(r)=>{const u=await urls(r.dataset.c);const c=await caches.open(AUD_CACHE);for(const x of u)await c.delete(x);r.querySelector('.aust').textContent='삭제됨'};
 o.querySelector('#aulist').onclick=e=>{const b=e.target.closest('button');if(!b)return;const r=b.closest('[data-c]');b.disabled=true;(b.classList.contains('ausv')?save1(r):del1(r)).finally(()=>{b.disabled=false;refresh()})};
 o.querySelector('#auall').onclick=async()=>{for(const r of o.querySelectorAll('#aulist [data-c]'))await save1(r);refresh()};
 o.querySelector('#auclr').onclick=async()=>{if(!await askConfirm('정말로 음성 저장분을 삭제하시겠어요?',AUD_V[V].label+' 오프라인 음성 파일이 모두 지워져요. 다시 내려받아야 해요.','삭제'))return;const c=await caches.open(AUD_CACHE);for(const k of await c.keys())if(new URL(k.url).pathname.includes('/'+AUD_V[V].dir)&&(V!='sunhi'||!k.url.includes('/hyunsu/')))await c.delete(k);refresh()};
 o.querySelector('#auv').onclick=e=>{const b=e.target.closest('button');if(b){ovClose&&ovClose();audOffline(b.dataset.v)}};
 o.querySelector('#aucore').onchange=refresh;refresh()}
// 듣기 메뉴에 음성 토글 + 오프라인 저장 버튼
(function(){const _m=lsMenu;lsMenu=function(){const c=lsCfg();audMode();if(!('speechSynthesis'in window)&&c.voice=='dev')c.voice='hyunsu';
 const r=_m.apply(this,arguments);const o=document.querySelector('#lsnow')&&document.querySelector('#lsnow').closest('.ovc,.ov,div');const host=document.getElementById('lssrc');if(!host)return r;
 const VN={sunhi:'AI 음성(선희): 화면이 꺼져도 대체로 계속 재생돼요. 받지 못한 항목은 기기 음성으로 대신 읽어요.',hyunsu:'AI 음성(현수): 화면이 꺼져도 대체로 계속 재생돼요. 받지 못한 항목은 기기 음성으로 대신 읽어요.',dev:'기기 음성: 완전 오프라인, 화면이 꺼지면 멈출 수 있어요. 키워드/정의/비교쌍 부분 선택이 적용돼요.'};const cur=audMode();
 host.insertAdjacentHTML('beforebegin',`<div class="seg" id="lsvoice">${['sunhi','hyunsu','dev'].map(k=>`<button data-v="${k}" class="${cur==k?'on':''}">${k=='dev'?'📱 기기 음성':AUD_V[k].label}</button>`).join('')}</div><p class="small mut" id="lsvnote">${VN[cur]}</p>`);
 document.getElementById('lsvoice').onclick=e=>{const b=e.target.closest('button');if(!b)return;c.voice=b.dataset.v;lsSave();lsStop();lsUI();document.querySelectorAll('#lsvoice button').forEach(x=>x.classList.toggle('on',x==b));document.getElementById('lsvnote').textContent=VN[c.voice];if(c.voice!='dev')audManifest()};
 const pp=document.getElementById('lspp');if(pp)pp.parentElement.insertAdjacentHTML('afterend','<button class="sbtn" id="lsoff" style="width:100%">💾 AI 음성 오프라인 저장 (과목별)</button>');const off=document.getElementById('lsoff');if(off)off.onclick=()=>{lsStop();audOffline(audAI()?audMode():'hyunsu')};
 audManifest();return r}})();
// 정책 카드 🔊
async function audPolicy(term){const M=await audManifest();const e=(M.policy||{})[term];LSN.tok=Math.random();const tok=LSN.tok;
 const c=(s2().cards||[]).find(x=>x.term==term)||{};const body=[c.purpose,(c.keywords||[]).join(', '),c.practice_geo,c.practice_homeroom].filter(Boolean).join('. ');
 if(ttsA&&!ttsA.paused){ttsA.pause();return}
 await audPart(term,e&&e.files.term,tok);await audGap(1,tok);await audPart(body,e&&e.files.body,tok)}
document.addEventListener('click',e=>{const b=e.target.closest('.s2say');if(b){e.preventDefault();audPolicy(b.dataset.t)}const vb=e.target.closest('.s2voice');if(vb){e.preventDefault();const c=lsCfg(),o=['hyunsu','sunhi','dev'];c.voice=o[(o.indexOf(audMode())+1)%3];lsSave();document.querySelectorAll('.s2voice').forEach(x=>x.textContent=c.voice=='dev'?'📱 기기':AUD_V[c.voice].label)}});
function audVoiceBtn(){const v=audMode();return `<button class="sbtn s2voice" title="음성 바꾸기 (선희/현수/기기)">${v=='dev'?'📱 기기':AUD_V[v].label}</button>`}
// 설정 화면 진입점
(function(){if(typeof renderData!='function')return;const _r=renderData;renderData=function(){_r.apply(this,arguments);const v=$('#v-data');if(!v||v.querySelector('#auset'))return;const bx=v.querySelector('.box');if(bx)bx.insertAdjacentHTML('beforeend','<div class="row"><button class="sbtn" id="auset">🎧 듣기 · 💾 AI 음성 오프라인 저장</button></div>');const b=v.querySelector('#auset');if(b)b.onclick=()=>audOffline()}})();

;window.__gvStage=17;
// ---- ⚖️ 특징 진술 판단: 진술 → 어느 개념? / O·X / 모두 고르기 ----
let FTD=null;function ftd(){if(!FTD){try{FTD=JSON.parse(document.getElementById('ftd').textContent)}catch(e){FTD=[]}}return FTD}
function ftSt(){try{return JSON.parse(localStorage.gv_ft||'{}')}catch(e){return{}}}
function ftSave(o){localStorage.gv_ft=JSON.stringify(o)}
function ftPool(subj,setId){const st=ftSt(),L=[];ftd().forEach(s=>{if(setId&&setId!='all'&&s.id!=setId)return;if(subj&&subj!='전체'&&s.subj!=subj)return;if(!sfOk(s))return;s.st.forEach((x,i)=>L.push({s,i,x,w:(st[s.id+':'+i]||0)}))});return L}
function ftMiss(s,ci,k){const t=findT(s.rel[ci]||'');if(t){record(t.term,false,'ft');srs[t.term]=sched(srs[t.term],1)}const st=ftSt();st[k]=(st[k]||0)+1;ftSave(st)}
function ftHit(s,ci,k){const t=findT(s.rel[ci]||'');if(t){record(t.term,true,'ft');if(!srs[t.term])srs[t.term]=sched(null,3)}const st=ftSt();if(st[k]){st[k]=Math.max(0,st[k]-1);if(!st[k])delete st[k]}ftSave(st)}
function ftMenu(){const sets=ftd();const n=sets.reduce((a,s)=>a+s.st.length,0);const mv=Object.keys(ftSt()).length;
 const o=ov(`<h2>⚖️ 특징 진술 판단</h2><p class="mut">비교 개념 세트(동질·기능 지역, 포디즘·포스트포디즘, 지형·기후 쌍, 교수 모형 등)의 특징 진술을 보고 어느 개념인지 판단해요. ${sets.length}세트 · 진술 ${n}개${mv?` · 놓친 진술 ${mv}개 우선 출제`:''}.<br>${isTouch()?'모바일: 2개념 세트는 ← / → 스와이프로 분류, O·X는 → O / ← X':'PC: 숫자키 1~4로 고르기, O·X는 O/X 키, 모두 고르기는 클릭 후 Enter'} · 틀린 진술의 개념은 복습(SRS)에 들어가요.</p>
 <div class="seg" id="ftm"><button data-m="which" class="on">어느 개념?</button><button data-m="ox">O·X</button><button data-m="all">모두 고르기</button></div>
 <div class="seg" id="ftsj">${['전체','자연지리','인문지리','지리교육론'].map((x,i)=>`<button data-s="${x}" class="${i?'':'on'}">${x}</button>`).join('')}</div>
 <select id="ftset" class="sbtn" style="width:100%;margin:6px 0"><option value="all">모든 세트</option>${sets.map(s=>`<option value="${esc(s.id)}">${esc(s.title)} (${s.st.length})</option>`).join('')}</select>
 <div class="seg" id="ftn"><button data-n="10">10개</button><button data-n="20" class="on">20개</button><button data-n="40">40개</button></div>
 <button class="sbtn ok" id="ftgo" style="width:100%;margin-top:8px">시작</button><p class="small mut">진술은 앱 용어 정의·사용자 노트·기출 주제를 바탕으로 만든 자작 문항이에요(원 시험지 문구 아님). 세트마다 출처가 표시돼요.</p>`);
 let M='which',SJ='전체',N=20;const seg=(id,f)=>o.querySelector(id).onclick=e=>{const b=e.target.closest('button');if(!b)return;f(b.dataset);o.querySelectorAll(id+' button').forEach(x=>x.classList.toggle('on',x==b))};
 seg('#ftm',d=>M=d.m);seg('#ftsj',d=>SJ=d.s);seg('#ftn',d=>N=+d.n);
 o.querySelector('#ftgo').onclick=()=>{const sid=o.querySelector('#ftset').value;let L=ftPool(SJ,sid);if(!L.length){toast('이 범위에 진술이 없어요');return}
  L=L.map(x=>[-(x.w*3)+Math.random()*2,x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  if(M=='all'){const seen=new Set(),Q=[];for(const x of L){const k=x.s.id+':'+x.x.c;if(seen.has(k))continue;seen.add(k);Q.push(x)}L=Q}
  ftRun(L.slice(0,N),M)}}
function ftRun(L,M){let i=0,c=0;const miss=[];
 function next(){if(i>=L.length)return fin();const it=L[i],s=it.s,x=it.x,k=s.id+':'+it.i,ty=!isTouch();let body='',ans=null,claim=null,opts=null;
  const head=`<div class="plhd"><b>⚖️ ${esc(s.title)}</b><span>${i+1}/${L.length}</span></div><div class="pbar"><i style="width:${i/L.length*100}%"></i></div><div class="pltag">${esc(s.subj)}${s.cat!=s.subj?' · '+esc(s.cat):''} · <span class="mut">${esc(s.src)}</span></div>`;
  if(M=='which'){body=`<div class="pldef psgtxt">${esc(x.s)}</div><div class="mut">이 진술은 어느 개념의 특징일까요?</div><div class="ftbtns">${s.c.map((n,j)=>`<button class="sbtn" data-j="${j}">${ty?(j+1)+'. ':''}${s.c.length==2&&!ty?(j?'→ ':'← '):''}${esc(n)}</button>`).join('')}</div>`}
  else if(M=='ox'){claim=Math.random()<.5?x.c:(()=>{const o=s.c.map((_,j)=>j).filter(j=>j!=x.c);return o[Math.floor(Math.random()*o.length)]})();body=`<div class="pldef psgtxt">${esc(x.s)}</div><div class="plterm">→ ${esc(s.c[claim])}의 특징이다.</div><div class="ftbtns"><button class="sbtn" data-o="1">${ty?'O 키 ':'→ '}⭕ 맞다</button><button class="sbtn" data-o="0">${ty?'X 키 ':'← '}❌ 틀리다</button></div>`}
  else{const tgt=x.c;const pool=shuffle(s.st.map((z,j)=>({z,j})));const yes=pool.filter(p=>p.z.c==tgt),no=pool.filter(p=>p.z.c!=tgt);opts=shuffle([...yes.slice(0,3),...no.slice(0,Math.max(2,5-Math.min(3,yes.length)))]);claim=tgt;
   body=`<div class="plterm">다음 중 「${esc(s.c[tgt])}」의 특징을 모두 고르시오.</div><div class="ftall">${opts.map((p,q)=>`<label class="ftop"><input type="checkbox" data-q="${q}"> ${esc(p.z.s)}</label>`).join('')}</div><div class="ftbtns"><button class="sbtn ok" id="ftsub">채점${ty?' (Enter)':''}</button></div>`}
  const el=ov(`${head}<div class="plq" id="ftq">${body}<div id="ftres"></div></div>`);let done=false;
  const R=el.querySelector('#ftres');
  const after=(ok,html)=>{done=true;if(ok)c++;else miss.push(s.c[x.c]);R.innerHTML=`<div class="pill ${ok?'ok':'bad'}">${ok?'✓ 정답':'✗ 오답'}</div>${html}<div class="row"><button class="sbtn" id="ftnx">다음 (Enter)</button></div>`;el.querySelectorAll('.ftbtns button,.ftall input').forEach(b=>b.disabled=true);R.querySelector('#ftnx').onclick=go;buzz(ok?8:[8,30,8]);save()};
  const go=()=>{i++;next()};
  const pickWhich=j=>{if(done)return;const ok=j==x.c;ok?ftHit(s,x.c,k):(ftMiss(s,x.c,k),ftMiss(s,j,k+'#'));after(ok,`<div class="mut">정답: <b>${esc(s.c[x.c])}</b>${ok?'':` · 고른 답: ${esc(s.c[j])}`}</div><div class="small">💡 ${esc(x.why)}</div>`)};
  const pickOX=v=>{if(done)return;const truth=claim==x.c;const ok=(v==1)==truth;ok?ftHit(s,x.c,k):ftMiss(s,x.c,k);after(ok,`<div class="mut">${truth?'⭕ 맞는 진술':'❌ 틀린 진술 — 실제로는 <b>'+esc(s.c[x.c])+'</b>의 특징'}</div><div class="small">💡 ${esc(x.why)}</div>`)};
  const submit=()=>{if(done)return;const sel=[...el.querySelectorAll('.ftall input')].map(b=>b.checked);let ok=true;const lines=opts.map((p,q)=>{const should=p.z.c==claim,got=sel[q];if(should!=got)ok=false;return `<div class="small ${should==got?'':'bad'}">${should?'✅':'⬜'} ${got==should?'':'(✗) '}${esc(p.z.s)}<br><span class="mut">→ ${esc(s.c[p.z.c])}: ${esc(p.z.why)}</span></div>`});
   const kk=s.id+':'+opts.find(p=>p.z.c==claim).j;ok?ftHit(s,claim,kk):ftMiss(s,claim,kk);after(ok,lines.join(''))};
  el.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>pickWhich(+b.dataset.j));el.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>pickOX(+b.dataset.o));const sb=el.querySelector('#ftsub');if(sb)sb.onclick=submit;
  const q=el.querySelector('#ftq');let sx=null;q.ontouchstart=e=>{sx=e.touches[0].clientX};q.ontouchend=e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)<60)return;if(done){go();return}if(M=='ox')pickOX(dx>0?1:0);else if(M=='which'&&s.c.length==2)pickWhich(dx>0?1:0)};
  document.onkeydown=e=>{if(e.target.tagName=='INPUT'&&e.target.type!='checkbox')return;if(done){if(e.key=='Enter'||e.key==' '){e.preventDefault();go()}return}
   if(M=='which'&&/^[1-4]$/.test(e.key)&&+e.key<=s.c.length)pickWhich(+e.key-1);else if(M=='ox'&&/^[oOxX12]$/.test(e.key))pickOX(/[oO1]/.test(e.key)?1:0);else if(M=='all'&&e.key=='Enter'){e.preventDefault();submit()}else if(M=='all'&&/^[1-5]$/.test(e.key)){const b=el.querySelectorAll('.ftall input')[+e.key-1];if(b)b.checked=!b.checked}}}
 function fin(){document.onkeydown=null;const u=[...new Set(miss)];ov(`<h2>⚖️ 끝!</h2><p><b>${c}/${L.length}</b> 맞혔어요.${u.length?` 헷갈린 개념 ${u.length}개는 복습(SRS)에 들어갔어요.`:''}</p>${u.length?`<p class="small">${u.map(esc).join(' · ')}</p>`:''}<div class="row"><button class="sbtn" id="ftag">다시 하기</button></div>`).querySelector('#ftag').onclick=ftMenu;navBadge&&navBadge()}
 next()}
(function(){const _rh=renderHome;renderHome=function(){_rh.apply(this,arguments);const v=$('#v-home');if(!v||v.querySelector('#ftbtn'))return;const a=v.querySelector('#lsbtn')||v.querySelector('#qtabs');const h='<button class="sbtn" id="ftbtn" style="width:100%;margin:6px 0">⚖️ 특징 진술 판단 (개념 구별)</button>';if(a)a.insertAdjacentHTML('afterend',h);else v.insertAdjacentHTML('afterbegin',h);v.querySelector('#ftbtn').onclick=ftMenu};
 const _km=kwMenu;kwMenu=function(){const r=_km.apply(this,arguments);const g=document.querySelector('.plgrid');if(g&&!g.querySelector('#ftk')){g.insertAdjacentHTML('beforeend','<button class="sbtn" id="ftk"><b>⚖️ 특징 진술 판단</b><br><span class="small">'+ftd().reduce((a,s)=>a+s.st.length,0)+'개 · 어느 개념? / O·X / 모두 고르기</span></button>');g.querySelector('#ftk').onclick=ftMenu}return r}})();

;window.__gvStage=18;
// ---- 🗣 학자 언행·비유 / 🎯 르페브르 집중 ----
let SQD=null;function sqd(){if(!SQD){try{SQD=JSON.parse(document.getElementById('sqd').textContent)}catch(e){SQD=[]}}return SQD}
function sqSt(){try{return JSON.parse(localStorage.gv_sq||'{}')}catch(e){return{}}}
const SQ3=['공간적 실천','공간의 재현','재현의 공간'];
const SQM={quote:{t:'🗣 인용·비유 → 학자·개념',f:['quote_to_scholar_concept','scholar_to_concept']},crit:{t:'⚔️ 누가 비판하나?',f:['who_criticizes']},m3:{t:'🧩 르페브르 3계기 분류',f:['classify_3moments','kice_ruling']},ox:{t:'⭕ 체계 판단 O·X',f:['system_judgement']},mix:{t:'🔀 전체 섞기',f:null}};
function sqTerm(x){return findT(x.con||'')||findT((x.con||'').replace(/\(.*?\)/g,'').trim())||findT(x.ans||'')||(x.b=='르페브르'?findT('공간의 생산'):null)}
function sqMark(x,ok){const t=sqTerm(x);if(t){record(t.term,ok,'sq');if(!ok)srs[t.term]=sched(srs[t.term],1);else if(!srs[t.term])srs[t.term]=sched(null,3)}const st=sqSt();if(ok){if(st[x.id]){st[x.id]--;if(!st[x.id])delete st[x.id]}}else st[x.id]=(st[x.id]||0)+1;localStorage.gv_sq=JSON.stringify(st);save()}
function sqMenu(focus){const D=sqd().filter(sfOk),st=sqSt();const cnt=m=>D.filter(x=>(!focus||x.b=='르페브르')&&(!SQM[m].f||SQM[m].f.includes(x.f))).length;
 const o=ov(`<h2>${focus?'🎯 르페브르 집중':'🗣 학자 언행·비유'}</h2><p class="mut">${focus?'공간의 생산 · 3계기(지각·구상·체험) · 추상공간 · 도시에 대한 권리 · 소자/하비/카스텔 · <b>2011 M36 ㄹ KICE 판정</b>까지.':'인용문·비유·KICE 지문 표현을 보고 학자와 개념을 떠올려요. 헷갈리는 학자는 오답 진단으로 구별해요.'}<br>${isTouch()?'모바일: 탭해서 보기 → 스와이프(→ 알았음 / ← 몰랐음), 분류·O·X는 버튼':'PC: "학자, 개념" 입력 후 Enter로 자동 채점 · 분류는 1/2/3 · O·X는 O/X 키'} · 틀린 항목은 관련 용어가 복습(SRS)에 들어가요.${Object.keys(st).length?` · 놓친 ${Object.keys(st).length}개 우선 출제`:''}</p>
 <p class="small mut">출처 표시: 📖 원문 인용(쪽) · 💬 주장 요지(원문 인용 아님) · 📝 노트 서술 · 🏛 KICE 지문 · 🧩 자작 상황</p>
 <div class="plgrid">${Object.entries(SQM).map(([k,v])=>cnt(k)?`<button class="sbtn" data-m="${k}"><b>${v.t}</b><br><span class="small">${cnt(k)}문항</span></button>`:'').join('')}${focus?'':`<button class="sbtn" data-focus="1"><b>🎯 르페브르 집중</b><br><span class="small">${D.filter(x=>x.b=='르페브르').length}문항 + 용어 카드</span></button>`}</div>
 ${focus?`<div class="box small"><b>📌 2011 M36 ㄹ KICE 판정</b> — 고대 이상도시 계획(밀레투스 격자·『주례』 고공기)을 <b>재현의 공간</b>으로 본 진술이 정답 처리됨. 오늘날 개론의 표준 대응(계획 도면=공간의 재현)과 다르니 기출 그대로 답하세요. <button class="sbtn" id="sqm36">이 문항 풀기</button></div>`:''}
 <div class="seg" id="sqn"><button data-n="10">10개</button><button data-n="20" class="on">20개</button><button data-n="40">40개</button></div>`);
 let N=20;o.querySelector('#sqn').onclick=e=>{const b=e.target.closest('button');if(!b)return;N=+b.dataset.n;o.querySelectorAll('#sqn button').forEach(x=>x.classList.toggle('on',x==b))};
 const fb=o.querySelector('[data-focus]');if(fb)fb.onclick=()=>sqMenu(true);const m36=o.querySelector('#sqm36');if(m36)m36.onclick=()=>sqRun(D.filter(x=>x.f=='kice_ruling'),'2011 M36 KICE 판정');
 o.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{const f=SQM[b.dataset.m].f;let L=D.filter(x=>(!focus||x.b=='르페브르')&&(!f||f.includes(x.f)));L=L.map(x=>[-(st[x.id]||0)*3+Math.random()*2,x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]).slice(0,N);if(!L.length){toast('문항이 없어요');return}sqRun(L,(focus?'르페브르 · ':'')+SQM[b.dataset.m].t)})}
function sqHit(inp,arr){const v=norm(inp||'');return (arr||[]).some(a=>{const n=norm(String(a).replace(/\(.*?\)/g,''));return n&&(v.includes(n)||(n.length>=4&&n.includes(v)&&v.length>=3))})}
function sqRun(L,title){let i=0,c=0;const miss=[];
 function next(){if(i>=L.length)return fin();const x=L[i],ty=!isTouch();const typed=['quote_to_scholar_concept','scholar_to_concept','who_criticizes'].includes(x.f),cls=['classify_3moments','kice_ruling'].includes(x.f),ox=x.f=='system_judgement';
  const ask=x.f=='quote_to_scholar_concept'?'누구의 말·비유이며, 어떤 개념인가요? (학자, 개념)':x.f=='scholar_to_concept'?'개념(용어)은?':x.f=='who_criticizes'?'비판할(비판한) 학자는?':cls?'세 공간 계기 중 무엇?':'옳으면 O, 틀리면 X';
  const opts=cls?`<div class="ftbtns">${SQ3.map((n,j)=>`<button class="sbtn" data-j="${j}">${ty?(j+1)+'. ':''}${n}</button>`).join('')}</div>`:ox?`<div class="ftbtns"><button class="sbtn" data-o="O">${ty?'O 키 ':'→ '}⭕ O</button><button class="sbtn" data-o="X">${ty?'X 키 ':'← '}❌ X</button></div>`:'';
  const el=ov(`<div class="plhd"><b>${esc(title)}</b><span>${i+1}/${L.length}</span></div><div class="pbar"><i style="width:${i/L.length*100}%"></i></div><div class="plq" id="sqq"><div class="pltag">${esc(x.b)} · <span class="tag">${esc(x.lab)}</span>${x.kice?` · <span class="ex">기출 ${esc(x.kice)}</span>`:''}</div><div class="pldef psgtxt">${esc(x.q)}</div><div class="mut">${ask}</div>${typed&&ty?'<input id="sqin" autocomplete="off" placeholder="예: 르페브르, 공간의 생산 (모르면 Enter)">':''}${opts}${typed?`<div class="row" id="sqbtn"><button class="sbtn" id="sqrev">${ty?'정답 보기 (Enter)':'탭해서 보기'}</button></div>`:''}<div id="sqres"></div></div>`);
  const R=el.querySelector('#sqres'),I=el.querySelector('#sqin');let done=false,shown=false;
  const conf=(pick)=>x.conf&&x.conf.length?`<div class="diag"><div class="dh">🎯 헷갈리기 쉬운 것</div>${x.conf.map(z=>`<div class="small ${pick&&sqHit(pick,[z.n])?'bad':''}">${pick&&sqHit(pick,[z.n])?'👉 고른 답 ':''}<b>${esc(z.n)}</b>${z.why?' — '+esc(z.why):''}</div>`).join('')}</div>`:'';
  const truth=()=>typed?`<div class="plterm">${esc((x.sch||[])[0]||'')}${x.con?' · '+esc(x.con):''}</div>`:cls?`<div class="plterm">${esc(x.ans)}</div>`:`<div class="plterm">${esc(x.ans)}</div>`;
  const flag=x.f=='kice_ruling'?`<div class="box small" style="border-left:4px solid #e0a000">⚠ <b>KICE 판정 주의</b>: ${esc(x.exp)}</div>`:'';
  const fin1=(ok,pick)=>{done=true;const sb=el.querySelector('#sqbtn');if(sb)sb.remove();if(ok)c++;else miss.push(x);sqMark(x,ok);el.querySelectorAll('.ftbtns button').forEach(b=>b.disabled=true);
   R.innerHTML=`<div class="pill ${ok?'ok':'bad'}">${ok?'✓ 정답':'✗ 오답'}</div>${truth()}${pick?`<div class="mut small">내 답: ${esc(pick)}</div>`:''}${flag}${x.f!='kice_ruling'&&x.exp?`<div class="small">💡 ${esc(x.exp)}</div>`:''}${ok&&x.f!='kice_ruling'?'':conf(pick)}<div class="small mut">출처: ${esc(x.cite||'')}${x.flag?' · ⚠ '+esc(x.flag):''}</div><div class="row"><button class="sbtn" id="sqnx">다음 (Enter)</button></div>`;R.querySelector('#sqnx').onclick=go;buzz(ok?8:[8,30,8])};
  const go=()=>{i++;next()};
  const reveal=()=>{if(shown)return;shown=true;const v=I?I.value.trim():'';
   if(I&&v){let ok;if(x.f=='quote_to_scholar_concept'){const ca=(x.acc||[]).filter(a=>!sqHit(a,x.sch)&&!x.sch.some(z=>norm(a)==norm(z)));ok=sqHit(v,x.sch)&&(sqHit(v,ca)||sqHit(v,[x.con])||sqHit(v,x.con.split('→').pop().split(/[·\/,]/).map(z=>z.trim()).filter(z=>z.length>1)))}else if(x.f=='scholar_to_concept')ok=sqHit(v,x.acc)||sqHit(v,[x.con]);else ok=sqHit(v,x.sch);
    if(x.f=='quote_to_scholar_concept'&&!ok&&sqHit(v,x.sch)){R.innerHTML='';fin1(false,v+' (학자는 맞음 · 개념 확인)');return}fin1(ok,v);return}
   if(I){fin1(false,'');return}
   R.innerHTML=`${truth()}${x.exp?`<div class="small">💡 ${esc(x.exp)}</div>`:''}${conf('')}<div class="small mut">출처: ${esc(x.cite||'')}</div>`;el.querySelector('#sqbtn').innerHTML='<button class="sbtn bad" data-g="0">✗ 몰랐음</button><button class="sbtn ok" data-g="1">✓ 알았음</button>';el.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{R.innerHTML='';el.querySelector('#sqbtn').remove();fin1(!!+b.dataset.g,'')})};
  const pickC=j=>{if(done)return;const v=SQ3[j];fin1(v==x.ans,v)};const pickO=v=>{if(done)return;fin1(v==x.ans,v)};
  el.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>pickC(+b.dataset.j));el.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>pickO(b.dataset.o));const rv=el.querySelector('#sqrev');if(rv)rv.onclick=reveal;if(I)I.focus();
  const q=el.querySelector('#sqq');q.onclick=e=>{if(typed&&!ty&&!shown&&!e.target.closest('button'))reveal()};let sx=null;q.ontouchstart=e=>{sx=e.touches[0].clientX};q.ontouchend=e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)<60)return;if(done){go();return}if(ox)pickO(dx>0?'O':'X');else if(typed&&shown){const g=el.querySelector(`[data-g="${dx>0?1:0}"]`);if(g)g.click()}};
  document.onkeydown=e=>{if(done){if(e.key=='Enter'||(e.key==' '&&e.target!=I)){e.preventDefault();go()}return}if(typed&&e.key=='Enter'){e.preventDefault();reveal();return}if(e.target==I)return;if(cls&&/^[123]$/.test(e.key))pickC(+e.key-1);else if(ox&&/^[oOxX]$/.test(e.key))pickO(e.key.toUpperCase())}}
 function fin(){document.onkeydown=null;ov(`<h2>🗣 끝!</h2><p><b>${c}/${L.length}</b> 맞혔어요.${miss.length?` 놓친 ${miss.length}개는 다음에 먼저 나오고, 관련 용어는 복습(SRS)에 들어갔어요.`:''}</p><div class="row"><button class="sbtn" id="sqag">메뉴로</button><button class="sbtn" id="sqlf">🎯 르페브르 집중</button></div>`);$('#sqag').onclick=()=>sqMenu();$('#sqlf').onclick=()=>sqMenu(true);navBadge&&navBadge()}
 next()}
(function(){const _rh=renderHome;renderHome=function(){_rh.apply(this,arguments);const v=$('#v-home');if(!v||v.querySelector('#sqbtnh'))return;const a=v.querySelector('#ftbtn')||v.querySelector('#lsbtn')||v.querySelector('#qtabs');const h='<div class="row" id="sqbtnh" style="margin:6px 0"><button class="sbtn" id="sqh1" style="flex:1">🗣 학자 언행·비유</button><button class="sbtn" id="sqh2" style="flex:1">🎯 르페브르 집중</button></div>';if(a)a.insertAdjacentHTML('afterend',h);else v.insertAdjacentHTML('afterbegin',h);v.querySelector('#sqh1').onclick=()=>sqMenu();v.querySelector('#sqh2').onclick=()=>sqMenu(true)};
 const _km=kwMenu;kwMenu=function(){const r=_km.apply(this,arguments);const g=document.querySelector('.plgrid');if(g&&!g.querySelector('#sqk')){g.insertAdjacentHTML('beforeend','<button class="sbtn" id="sqk"><b>🗣 학자 언행·비유</b><br><span class="small">'+sqd().length+'문항 · 🎯 르페브르 집중 포함</span></button>');g.querySelector('#sqk').onclick=()=>sqMenu()}return r}})();

;window.__gvStage=19;
// ---- 🔍 단서어 → 이론 (경제지리) ----
let ECD=null;function ecd(){if(!ECD){try{ECD=JSON.parse(document.getElementById('ecd').textContent)}catch(e){ECD=[]}}return ECD}
function ecSt(){try{return JSON.parse(localStorage.gv_ec||'{}')}catch(e){return{}}}
function ecParts(a){const inner=(a.match(/\(([^)]*)\)/g)||[]).map(x=>x.slice(1,-1));const main=a.replace(/\([^)]*\)/g,' ');return [...main.split(/[·\/,]| vs /),...inner.flatMap(x=>x.split(/[·\/,]/))].map(x=>x.trim()).filter(x=>x.length>=2)}
function ecTerm(c){if(c.term){const t=findT(c.term);if(t)return t}for(const p of [c.answer,...ecParts(c.answer)]){const t=findT(p)||findT(p.replace(/\s+/g,''));if(t)return t}return null}
function ecMark(c,ok){const t=ecTerm(c);if(t){record(t.term,ok,'ec');if(!ok)srs[t.term]=sched(srs[t.term],1);else if(!srs[t.term])srs[t.term]=sched(null,3)}const st=ecSt();if(ok){if(st[c.id]){st[c.id]--;if(!st[c.id])delete st[c.id]}}else st[c.id]=(st[c.id]||0)+1;localStorage.gv_ec=JSON.stringify(st);save()}
function ecMenu(){const C=ecd().filter(e=>!/^kx/.test(e.id||'')).filter(sfOk),st=ecSt();const o=ov(`<h2>🔍 단서어 → 이론</h2><p class="mut">경제지리 기출의 단서어(수식·키워드·사례)를 보고 이론·학자·개념을 떠올려요. ${C.length}개 · 기출 ${C.filter(c=>c.label=='기출').length} / 연계 ${C.filter(c=>c.label!='기출').length}${Object.keys(st).length?` · 놓친 ${Object.keys(st).length}개 우선`:''}.<br>${isTouch()?'모바일: 탭해서 뒤집기 → 스와이프(→ 알았음 / ← 몰랐음)':'PC: 이론명 입력 후 Enter → 자동 채점, 1/2로 확정'} · 놓친 항목의 관련 용어는 복습(SRS)에 들어가요.</p>
 <div class="seg" id="ecl"><button data-l="all" class="on">전체</button><button data-l="기출">기출 단서만</button><button data-l="miss">놓친 것만</button></div>
 <div class="seg" id="ecn"><button data-n="10">10개</button><button data-n="20" class="on">20개</button><button data-n="50">50개</button><button data-n="100">전부</button></div><button class="sbtn ok" id="ecgo" style="width:100%;margin-top:8px">시작</button>`);
 let Lb='all',N=20;const seg=(id,f)=>o.querySelector(id).onclick=e=>{const b=e.target.closest('button');if(!b)return;f(b.dataset);o.querySelectorAll(id+' button').forEach(x=>x.classList.toggle('on',x==b))};seg('#ecl',d=>Lb=d.l);seg('#ecn',d=>N=+d.n);
 o.querySelector('#ecgo').onclick=()=>{let L=C.filter(c=>Lb=='all'||(Lb=='miss'?st[c.id]:c.label==Lb));if(!L.length){toast(Lb=='miss'?'놓친 단서가 없어요 👍':'항목이 없어요');return}L=L.map(c=>[-(st[c.id]||0)*3+Math.random()*2,c]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]).slice(0,N);ecRun(L)}}
function ecRun(L){let i=0,c=0;const miss=[];
 function next(){if(i>=L.length)return fin();const x=L[i],ty=!isTouch();
  const el=ov(`<div class="plhd"><b>🔍 단서어 → 이론</b><span>${i+1}/${L.length}</span></div><div class="pbar"><i style="width:${i/L.length*100}%"></i></div><div class="plq" id="ecq"><div class="pltag"><span class="tag">${x.label=='기출'?'🏛 기출 단서':'🔗 연계'}</span>${x.kice&&x.kice.length?` · <span class="ex">${esc(x.kice.join(', '))}</span>`:''}</div><div class="plterm">${esc(x.clue)}</div><div class="mut">${/^kx/.test(x.id||"")?"다음 설명에 해당하는 개념은?":"이 단서가 가리키는 이론·학자·개념은?"}</div>${ty?'<input id="ecin" autocomplete="off" placeholder="예: 베버 원료지향 (모르면 Enter)">':''}<div id="ecans" class="hide"><div class="plterm">→ ${esc(x.answer)}</div>${x.ref?`<div class="small mut">📘 ${esc(x.ref)}</div>`:''}${(()=>{const t=ecTerm(x);return t?`<div class="small">🔑 ${esc(t.term)}: ${esc(t.keys||t.def)}</div>`:''})()}<div id="ecsc"></div></div><div class="row" id="ecbtn"><button class="sbtn" id="ecrev">${ty?'정답 보기 (Enter)':'탭해서 뒤집기'}</button></div></div>`);
  const A=el.querySelector('#ecans'),B=el.querySelector('#ecbtn'),I=el.querySelector('#ecin');let shown=false,auto=null;
  const show=()=>{if(shown)return;shown=true;A.classList.remove('hide');if(I){const v=norm(I.value||'');if(v){const ps=ecParts(x.answer).map(norm);auto=ps.some(p=>p&&v.includes(p))||(v.length>=3&&norm(x.answer).includes(v));el.querySelector('#ecsc').innerHTML=`<div class="pill ${auto?'ok':'bad'}">${auto?'✓ 맞은 듯':'✗ 다른 답'} — 내 답: ${esc(I.value)}</div>`}else auto=false}
   B.innerHTML=`<button class="sbtn bad" data-g="0">✗ 몰랐음${ty?' (1)':' ←'}</button><button class="sbtn ok" data-g="1">✓ 알았음${ty?' (2)':' →'}</button>`;B.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>grade(+b.dataset.g))};
  const grade=g=>{if(g)c++;else miss.push(x);ecMark(x,!!g);buzz(g?8:[8,30,8]);i++;next()};
  el.querySelector('#ecrev').onclick=show;if(I)setTimeout(()=>I.focus(),0);
  const q=el.querySelector('#ecq');q.onclick=e=>{if(!ty&&!shown&&!e.target.closest('button'))show()};let sx=null;q.ontouchstart=e=>{sx=e.touches[0].clientX};q.ontouchend=e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(shown&&Math.abs(dx)>60)grade(dx>0?1:0)};
  document.onkeydown=e=>{if(!shown){if(e.key=='Enter'){e.preventDefault();show()}return}if(e.key=='1')grade(0);else if(e.key=='2')grade(1);else if(e.key=='Enter'){e.preventDefault();grade(auto===false?0:1)}}}
 function fin(){document.onkeydown=null;ov(`<h2>🔍 끝!</h2><p><b>${c}/${L.length}</b> 알았어요.${miss.length?` 놓친 ${miss.length}개는 다음에 먼저 나와요.`:''}</p>${miss.length?`<div class="small">${miss.map(m=>`<div>${esc(m.clue)} → <b>${esc(m.answer)}</b></div>`).join('')}</div>`:''}<div class="row"><button class="sbtn" id="ecag">다시 하기</button></div>`).querySelector('#ecag').onclick=ecMenu;navBadge&&navBadge()}
 next()}
(function(){const _rh=renderHome;renderHome=function(){_rh.apply(this,arguments);const v=$('#v-home');if(!v||v.querySelector('#ecbtnh'))return;const a=v.querySelector('#sqbtnh')||v.querySelector('#ftbtn')||v.querySelector('#qtabs');const h='<button class="sbtn" id="ecbtnh" style="width:100%;margin:6px 0">🔍 단서어 → 이론 (경제지리)</button>';if(a)a.insertAdjacentHTML('afterend',h);else v.insertAdjacentHTML('afterbegin',h);v.querySelector('#ecbtnh').onclick=ecMenu};
 const _km=kwMenu;kwMenu=function(){const r=_km.apply(this,arguments);const g=document.querySelector('.plgrid');if(g&&!g.querySelector('#eck')){g.insertAdjacentHTML('beforeend','<button class="sbtn" id="eck"><b>🔍 단서어 → 이론</b><br><span class="small">'+ecd().filter(e=>!/^kx/.test(e.id||'')).length+'개 · 경제지리 기출 단서</span></button>');g.querySelector('#eck').onclick=ecMenu}return r}})();

// 정의→용어 문제: 정의 속 표제어·별칭을 ○○로 가리기
function maskDef(t){let h=esc(t.def||'');const base=t.term.replace(/\(.*?\)/g,'').trim();const inner=(t.term.match(/\(([^)]*)\)/g)||[]).map(x=>x.slice(1,-1));
 const ns=[...new Set([t.term,base,...inner.flatMap(x=>x.split(/[·,]/)),...(t.al||[])].map(x=>x&&x.trim()).filter(x=>x&&x.length>=2))].sort((a,b)=>b.length-a.length);
 for(const n of ns){const e=esc(n).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');h=h.replace(new RegExp(e,'g'),'○○')}return h}
// 병합된 카드의 학습 기록 이관
(function(){const MIG={'포드주의':'포디즘','수출가공지역':'수출자유지역','나프':'냅프'};let ch=false;for(const[a,b]of Object.entries(MIG)){for(const o of [srs,marks,wrong]){if(o&&o[a]!==undefined){if(o[b]===undefined)o[b]=o[a];delete o[a];ch=true}}}if(ch)try{save()}catch(e){}})();

;window.__gvStage=20;
// ---- r24: 다중 빈칸 공통(지문·워크북·16주) + 과목 필터 + 출처 안내 ----
const BLRX=l=>new RegExp('\\(\\s*'+l.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*(?:[:：][^)]*)?\\)','g');
function qBl(x){if(x._bl!==undefined)return x._bl;const q=x.q;x._bl=null;const ls=[...new Set([...q.q.matchAll(/\(\s*([㉠-㉭A-HⒶ-Ⓩ])\s*(?:[:：][^)]*)?\)/g)].map(m=>m[1]))];if(!ls.length)return null;
 const a=q.a,pos=ls.map(l=>{const m=new RegExp('(^|[^A-Za-z가-힣])'+l+'\\s*[:：]?\\s*').exec(a);return m?{l,s:m.index+m[0].length,st:m.index+m[1].length}:null});if(pos.some(p=>!p))return null;
 const srt=[...pos].sort((u,v)=>u.s-v.s);const out=[];for(const p of pos){const nx=srt.find(z=>z.st>p.st);let seg=a.slice(p.s,nx?nx.st:a.length);seg=seg.split(/\s*[\(（=]|\s{2,}|[,，;]\s*$/)[0].replace(/[,，.\s]+$/,'').trim();if(!seg||seg.length>30)return null;out.push({l:p.l,a:[seg],t:seg})}
 return x._bl=out}
function blOf(x){if(x.k=='B')return x.p.blanks.map((b,j)=>({l:b.l,a:b.a,t:(x.p.rel||[])[j]||b.a[0]}));if(x.k=='W')return x.p.bl.map(b=>({l:b[0],a:[b[1]],t:b[1],x:b[2]}));return qBl(x)||[]}
function blRender(x,BL){const p=x.p||x.q;let txt=esc(x.k=='Q'?p.q:p.text);BL.forEach((z,j)=>{const g=x.g[j];txt=txt.replace(BLRX(esc(z.l)),g!=null?`<mark class="blk ${g?'ok':'bad'}" data-j="${j}">( ${esc(z.a[0])} )</mark>`:`<mark class="blk${j==x.i?' cur':''}" data-j="${j}" role="button" tabindex="0">( ${esc(z.l)} )</mark>`)});
 const nb=BL.length,mine=BL.map((z,j)=>x.g[j]===0&&x.u&&(x.u[j]||'').trim()?`<div class="myans">${esc(z.l)} 내 답: <s>${esc(x.u[j])}</s></div>`:'').join('');
 const tag=x.k=='B'?'지문형 빈칸':x.k=='W'?'워크북 '+esc(p.id)+(p.link&&p.link.length?' · 🔁 +'+esc(p.link.join(', ')):''):'16주 스터디 '+p.w+'주차';
 return `<div class="pltag">${esc(p.cat)} · ${tag}${nb>1?` · 빈칸 ${Object.keys(x.g).length+1}/${nb}`:''}</div><div class="pldef psgtxt">${txt}</div>${figHtml(p)}${mine}`}
// 과목 필터
const SF_ALL=Object.values(GROUPS).flat();
function sfGet(){try{const a=JSON.parse(localStorage.gv_sf||'[]');return Array.isArray(a)?a.filter(c=>SF_ALL.includes(c)):[]}catch(e){return[]}}
function sfSet(a){localStorage.gv_sf=JSON.stringify(a.length==SF_ALL.length?[]:a);try{save()}catch(e){}}
function sfCat(x){if(!x)return null;if(SF_ALL.includes(x.cat))return x.cat;if(x.s&&SF_ALL.includes(x.s.cat))return x.s.cat;if(x.subj&&GROUPS[x.subj])return 'G:'+x.subj;return null}
function sfOk(x){const S=sfGet();if(!S.length)return true;const c=sfCat(x);if(!c)return true;if(c.startsWith('G:'))return GROUPS[c.slice(2)].some(k=>S.includes(k));return S.includes(c)}
function sfBar(onChange){const id='sf'+Math.random().toString(36).slice(2,6);setTimeout(()=>{const r=document.getElementById(id);if(!r)return;r.onclick=e=>{const b=e.target.closest('button');if(!b)return;let S=sfGet();if(!S.length)S=[];
  if(b.dataset.all){S=[]}else if(b.dataset.g){const cs=GROUPS[b.dataset.g],on=cs.every(c=>S.includes(c));S=on?S.filter(c=>!cs.includes(c)):[...new Set([...S,...cs])]}else{const c=b.dataset.c;S=S.includes(c)?S.filter(z=>z!=c):[...S,c]}
  sfSet(S);onChange&&onChange()}},0);const S=sfGet(),on=c=>S.includes(c);
 return `<div class="sfbar" id="${id}"><span class="small mut">과목</span><button data-all="1" class="${S.length?'':'on'}">전체</button>${Object.entries(GROUPS).map(([g,cs])=>`<button data-g="${g}" class="${cs.every(on)?'on':cs.some(on)?'part':''}">${g=='지역지리 및 기타'?'지역지리·기타':g}</button>`).join('')}<span class="sfsub">${GROUPS['인문지리'].map(c=>`<button data-c="${c}" class="${on(c)?'on':''}">${c.replace('·역사·정치지리','')}</button>`).join('')}</span></div>`}
// 출처 안내
function provNote(kind,L){const n=f=>L.filter(f).length,S=x=>String(x.src||x.lab||x.label||'');let h='';
 if(kind=='wb')h='워크북·스터디 문항은 스터디원이 기출 주제를 재구성한 자료예요(시험지 원문 아님). 괄호 속 쪽수는 작성자가 단 참고 문헌이에요.';
 else if(kind=='psg'){const y=n(x=>/^\s*\d{4}/.test(S(x))&&!/연계/.test(S(x))),k=n(x=>/연계/.test(S(x))),z=n(x=>/자작/.test(S(x))),r=L.length-y-k-z;h=`지문은 기출 개념을 바탕으로 앱에서 새로 쓴 기출형 지문이에요(시험지 원문 아님). 관련 기출 표시 ${y} · 기출 연계 ${k} · 노트·원전 근거 자작 ${z} · 출처 미표기 자작 ${r}. 지문 위 꼬리표로 문항별 출처를 확인하세요.`}
 else if(kind=='mcq'){const k=n(x=>/연계/.test(S(x))),z=n(x=>/자작/.test(S(x)));h=`5지선다는 표시된 기출 문항의 개념을 앱이 선택형으로 재구성한 문항이에요(실제 시험 선지·원문 아님). 관련 기출 ${L.length-k-z} · 기출 연계 ${k} · 자작 ${z}.`}
 else if(kind=='sq'){const c=re=>n(x=>re.test(S(x)));h=`출처 구분: 🏛 KICE 지문 ${c(/KICE/)} · 📖 원전 인용·기반 ${c(/원문 인용\)|📖/)} · 💬 주장 요지(원문 인용 아님) ${c(/💬/)} · 📝 노트 서술 ${c(/📝/)} · 🧩 자작 상황 ${c(/🧩/)}. 문항마다 꼬리표가 붙어요.`}
 else if(kind=='ec')h=`단서어는 경제지리 기출(${n(x=>x.label=='기출')})·기출 연계(${n(x=>x.label!='기출')}) 문항에서 뽑아 요약한 키워드예요(시험지 문구 그대로가 아님). 기출 번호는 카드에 표시돼요.`;
 else if(kind=='ft')h='특징 진술은 앱 용어 정의·노트·개론서를 근거로 앱에서 만든 자작 진술이에요(시험지 원문 아님). 세트마다 근거 자료가 적혀 있어요.';
 return h?`<p class="small mut provn">ℹ️ ${h}</p>`:''}
// 메뉴에 필터·안내 삽입
(function(){
 const _km=kwMenu;kwMenu=function(){const r=_km.apply(this,arguments);const g=document.querySelector('#plov .plgrid');if(g&&!document.querySelector('#plov .sfbar')){g.insertAdjacentHTML('beforebegin',sfBar(()=>kwMenu()));const old=[...document.querySelectorAll('#plov p.small.mut')].find(p=>/스터디원이/.test(p.textContent));const N=[provNote('psg',PSG.filter(sfOk)),provNote('wb',[])].join('');if(old)old.outerHTML=N;else g.insertAdjacentHTML('afterend',N)}return r};
 const _sm=sqMenu;sqMenu=function(focus){const r=_sm.apply(this,arguments);const o=document.querySelector('#plov .plgrid');if(o&&!document.querySelector('#plov .sfbar')){o.insertAdjacentHTML('beforebegin',sfBar(()=>sqMenu(focus)));const pn=[...document.querySelectorAll('#plov p.small.mut')].find(p=>/출처 표시/.test(p.textContent));const N=provNote('sq',sqd().filter(sfOk));if(pn)pn.outerHTML=N;else o.insertAdjacentHTML('beforebegin',N)}return r};
 const _em=ecMenu;ecMenu=function(){const r=_em.apply(this,arguments);const o=document.querySelector('#plov #ecl');if(o&&!document.querySelector('#plov .sfbar'))o.insertAdjacentHTML('beforebegin',sfBar(()=>ecMenu())+provNote('ec',ecd().filter(sfOk)));return r};
 const _fm=ftMenu;ftMenu=function(){const r=_fm.apply(this,arguments);const o=document.querySelector('#plov #ftsj');if(o&&!document.querySelector('#plov .sfbar')){o.insertAdjacentHTML('beforebegin',sfBar(()=>ftMenu())+provNote('ft',[]));o.style.display='none'}return r};
 // 퀴즈 탭(5지선다·지문형): #qbox 위에 필터
 const wrapQ=(fn,kind)=>function(){const r=fn.apply(this,arguments);const qb=$('#qbox');if(qb){let w=document.getElementById('sfq');if(!w){qb.insertAdjacentHTML('beforebegin','<div id="sfq"></div>');w=document.getElementById('sfq')}w.dataset.k=kind;w.innerHTML=sfBar(()=>{(kind=='mcq'?qConcept:qPassage)()})+provNote(kind,kind=='mcq'?mcqScope():psgScope())}return r};
 qConcept=wrapQ(qConcept,'mcq');qPassage=wrapQ(qPassage,'psg');
})();

;window.__gvStage=21;
// ---- r24: 테마 · 글자 크기 · 통합 학습 기록(플랜 연동·오답 로그·되돌리기) · 취약 분석
(function(){
 const TH=['auto','light','sepia','dark'],TL={auto:'🖥️ 자동',light:'☀️ 밝게',sepia:'📜 눈보호',dark:'🌙 어둡게'};
 const mq=matchMedia('(prefers-color-scheme: dark)');
 window.thApply=function(){const t=S.theme||localStorage.getItem('gv_theme')||'auto';const r=t=='auto'?(mq.matches?'dark':'light'):t;document.documentElement.dataset.theme=r;localStorage.setItem('gv_theme',t=='auto'?'':r);
  const b=$('#theme');if(b){b.textContent=TL[t].split(' ')[0];b.title='화면 테마: '+TL[t];b.setAttribute('aria-label',b.title)}
  document.querySelectorAll('meta[name=theme-color]').forEach(m=>m.content=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#eef0f3')};
 mq.addEventListener&&mq.addEventListener('change',thApply);
 const tb=$('#theme');if(tb){tb.onclick=()=>{const t=S.theme||'auto';S.theme=TH[(TH.indexOf(t)+1)%TH.length];save();thApply();toast('화면 테마: '+TL[S.theme])};
  tb.insertAdjacentHTML('beforebegin','<span class="fsz"><button id="fsm" aria-label="글자 작게" title="글자 작게">A-</button><button id="fsp" aria-label="글자 크게" title="글자 크게">A+</button></span>')}
 const isPC=()=>innerWidth>=1200||document.documentElement.dataset.ui=='pc';
 window.fsApply=function(){const f=S.fsSet?S.fs:(isPC()?18.5:S.fs);document.documentElement.style.setProperty('--fs',f+'px')};
 const fsd=d=>{const cur=S.fsSet?S.fs:(isPC()?18.5:S.fs);S.fs=Math.max(14,Math.min(26,Math.round((cur+d)*2)/2));S.fsSet=1;save();fsApply();toast('글자 크기 '+S.fs+'px')};
 $('#fsm')&&($('#fsm').onclick=()=>fsd(-1));$('#fsp')&&($('#fsp').onclick=()=>fsd(1));
 if(!S.theme&&localStorage.getItem('gv_theme'))S.theme=localStorage.getItem('gv_theme');
 thApply();fsApply();addEventListener('resize',fsApply);
})();
// 입력 추적(오답 로그용): 마지막으로 입력한 값
var LASTIN={v:'',t:0};document.addEventListener('input',e=>{const t=e.target;if(t&&(t.tagName=='INPUT'||t.tagName=='TEXTAREA')&&t.type!='range'&&t.type!='number'&&t.type!='date'&&!t.closest('.set'))LASTIN={v:t.value,t:Date.now()}},true);
function missLog(){return LS.get('gv_miss',[])}
function missAdd(o){o=Object.assign({at:Date.now(),id:window.CURID||(o.term?'t:'+o.term:''),how:o.mine?'typed':'self'},o);const L=missLog();L.push(o);while(L.length>3000)L.shift();LS.set('gv_miss',L);
 try{if(fb&&CL.user){const {D}=fb,c={};for(const k in o)if(o[k]!==''&&o[k]!=null)c[k]=typeof o[k]=='string'?o[k].slice(0,200):o[k];D.push(D.ref(fb.rt,'beta/review/'+CL.user.uid+'/misses'),c).then(()=>{LS.set('gv_missup',(LS.get('gv_missup',0)||0)+1)}).catch(()=>{})}else{const q=LS.get('gv_missq',[]);q.push(o);while(q.length>3000)q.shift();LS.set('gv_missq',q)}}catch(e){}}
function missPrune(){try{if(!fb||!CL.user)return;const {D}=fb,r=D.ref(fb.rt,'beta/review/'+CL.user.uid+'/misses');D.get(D.query(r,D.orderByChild('at'))).then(s=>{const k=[];s.forEach(c=>{k.push(c.key)});const n=k.length-3000;if(n>0){const u={};k.slice(0,n).forEach(x=>u[x]=null);D.update(r,u)}}).catch(()=>{})}catch(e){}}
setInterval(()=>{if(window.fb&&CL.user&&!window._pruned){window._pruned=1;missPrune()}},20000);
function plMark(k,ok){if(!ok&&(k[0]=='q'||k[0]=='p')){const id=k.slice(2),x=k[0]=='q'?MCQ0.find(q=>q.id==id):PSG.find(q=>q.id==id),w=wrongq[id];if(x)missAdd({d:k[0]=='q'?'mcq':'psg',id:k,term:k[0]=='q'?String(x.a).slice(0,120):(x.rel||[]).join(', '),mine:k[0]=='q'?String(window._pick||(w&&w.pick)||''):'',how:k[0]=='q'?'auto':'auto/self',sub:x.cat||x.subj||''})}const p=plGet();if(!p||!p.done)return;p.done[k]=1;p.done['r'+k]=1;if(!ok)(p.miss=p.miss||{})[k]=1;plSet(p)}
(function(){const r0=record;let lastSnap=0;
 record=function(term,ok,src){if(Date.now()-lastSnap>300){snap([term]);lastSnap=Date.now()}
  const res=r0.apply(this,arguments);
  if(src!='plan')plMark('t:'+term,ok);
  if(!ok){const t=TM.get(term);const mine=Date.now()-LASTIN.t<120000?LASTIN.v.trim():'';missAdd({d:src||'',term,mine,sub:t?t.cat:'',how:mine?'typed':'self'});LASTIN={v:'',t:0}}
  return res};
})();
// 오버레이 드릴 공통 되돌리기 버튼(학습 기록 되돌림)
new MutationObserver(()=>{const h=document.querySelector('#plov .plhd');if(!h||h.querySelector('.undob'))return;h.insertAdjacentHTML('beforeend','<button class="undob" title="방금 채점(모르겠음 포함) 되돌리기 (Z)">↩ 되돌리기</button>');
 h.querySelector('.undob').onclick=e=>{e.stopPropagation();if(window.KWU&&KWU()){return}undo()}}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('keydown',e=>{if((e.key=='z'||e.key=='Z')&&document.querySelector('#plov:not(.hide)')&&!/INPUT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();e.stopImmediatePropagation();if(window.KWU&&KWU())return;undo()}},true);
// ---- 취약 분석
function weakData(){const G={},C={};T.forEach(t=>{const a=acc[t.term];if(!a||!a.n)return;const g=grpOf(t.cat);for(const [M,k] of [[G,g],[C,t.cat]]){const o=M[k]||(M[k]={c:0,n:0,terms:[]});o.c+=a.c;o.n+=a.n;if(a.n-a.c>0)o.terms.push([t.term,a.n-a.c,a.n])}});
 const L=missLog(),D={},P={};L.forEach(m=>{D[m.d]=(D[m.d]||0)+1;if(m.mine&&norm(m.mine)!=norm(m.term)){const k=m.term+' ⇄ '+m.mine;P[k]=(P[k]||0)+1}});
 Object.entries(wrongq).forEach(([id,w])=>{if(w.pick){const q=MCQ0.find(x=>x.id==id);if(q){const k=String(q.a).slice(0,24)+' ⇄ '+String(w.pick).slice(0,24);P[k]=(P[k]||0)+(w.n||1)}}});
 return {G,C,D,P,L}}
function weakView(){const {G,C,D,P,L}=weakData();const pct=o=>o.n?Math.round((1-o.c/o.n)*100):0;
 const row=(k,o)=>`<tr><td>${esc(k)}</td><td>${o.n-o.c}/${o.n}</td><td><div class="bar"><i style="width:${pct(o)}%"></i></div></td><td>${pct(o)}%</td></tr>`;
 const top=Object.values(C).flatMap(o=>o.terms).sort((a,b)=>b[1]-a[1]||b[1]/b[2]-a[1]/a[2]).slice(0,25);
 const DN={kw:'키워드·빈칸 인출',ft:'특징 진술',sq:'학자 언행·비유',ec:'단서어→이론',plan:'플랜','인출':'복습(인출)','지문형':'지문형','모의고사':'모의고사','오답노트':'오답노트','용어 객관식':'용어 객관식'};
 const o=ov(`<h2>📊 취약 분석</h2><p class="mut">모든 드릴의 채점 기록(용어별 통합 기록)과 오답 로그 ${L.length}건으로 계산해요. 오답률이 높은 곳부터 보세요.</p>
 <h3>과목별 오답률</h3><table class="wkt">${Object.entries(G).sort((a,b)=>pct(b[1])-pct(a[1])).map(([k,v])=>row(k,v)).join('')||'<tr><td>아직 기록이 없어요</td></tr>'}</table>
 <h3>세부 영역별</h3><table class="wkt">${Object.entries(C).sort((a,b)=>pct(b[1])-pct(a[1])).map(([k,v])=>row(k,v)).join('')}</table>
 <h3>드릴별 오답 수</h3><p>${Object.entries(D).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${esc(DN[k]||k)} <b>${v}</b>`).join(' · ')||'—'}</p>
 <h3>자주 틀린 용어</h3><p>${top.map(([t,m,n])=>`<span class="pill bad">${esc(t)} ${m}/${n}</span>`).join(' ')||'—'}</p>${top.length?'<div class="row"><button class="sbtn pri" id="wkgo">이 용어들로 인출 연습</button></div>':''}
 <h3>헷갈린 쌍 (정답 ⇄ 내가 쓴/고른 답)</h3><p class="small">${Object.entries(P).sort((a,b)=>b[1]-a[1]).slice(0,30).map(([k,v])=>`${esc(k)} ×${v}`).join('<br>')||'아직 없어요. PC에서 답을 입력하거나 5지선다를 풀면 쌓여요.'}</p>
 <h3>최근 오답 로그</h3><p class="small mut">${L.slice(-30).reverse().map(m=>`${new Date(m.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${esc(DN[m.d]||m.d)} · <b>${esc(m.term)}</b>${m.mine?' · 내 답: '+esc(m.mine):''}`).join('<br>')||'—'}</p>
 <div class="row"><button class="sbtn" id="wkexp">오답 로그 내보내기(JSON)</button></div>`);
 const g=o.querySelector('#wkgo');g&&(g.onclick=()=>runQ(top.map(x=>'t:'+x[0]),{title:'📊 취약 용어'}));
 o.querySelector('#wkexp').onclick=()=>{const b=new Blob([JSON.stringify({miss:missLog(),wrongq},null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='geo-vocab-misses.json';a.click()}}
(function(){const rs=renderStats;renderStats=function(){rs.apply(this,arguments);const v=$('#v-stats');v.insertAdjacentHTML('afterbegin','<div class="box"><button class="pbtn" id="wkopen" style="margin:0">📊 취약 분석 열기 (과목·영역·드릴·헷갈린 쌍)</button></div>');$('#wkopen').onclick=weakView};
 const rh=renderHome;renderHome=function(){rh.apply(this,arguments);const b=document.querySelector('#v-home .plcard');if(b&&!$('#wkh'))b.insertAdjacentHTML('afterend','<div class="box" id="wkh"><div class="row" style="margin:0"><button class="sbtn" id="wkh1">📊 취약 분석</button><span class="mut small" style="align-self:center">모든 드릴의 기록이 용어별로 합쳐지고, 플랜 진도에도 반영돼요.</span></div></div>');const w=$('#wkh1');w&&(w.onclick=weakView)}})();

// ---- 로그인 상태 칩 · 내 기기 · 미동기화 배너
function devId(){let d=localStorage.getItem('gv_dev');if(!d){d=Math.random().toString(36).slice(2,10);localStorage.setItem('gv_dev',d)}return d}
function devAuto(){const u=navigator.userAgent;const os=/Windows/.test(u)?'Windows':/iPhone|iPad/.test(u)?'iOS':/Android/.test(u)?'Android':/Mac/.test(u)?'Mac':/Linux/.test(u)?'Linux':'기기';const br=/Edg\//.test(u)?'Edge':/SamsungBrowser/.test(u)?'삼성 인터넷':/Chrome\//.test(u)?'Chrome':/Safari\//.test(u)?'Safari':/Firefox/.test(u)?'Firefox':'브라우저';return os+' · '+br}
function devName(){return localStorage.getItem('gv_devname')||devAuto()}
function devPing(){try{if(!fb||!CL.user)return;const {D}=fb;D.update(D.ref(fb.rt,'beta/review/'+CL.user.uid+'/devices/'+devId()),{name:devName().slice(0,40),seen:D.serverTimestamp(),sync:CL.lastPush||0,up:LS.get('gv_missup',0)||0}).catch(()=>{})}catch(e){}}
function missFlush(){const q=LS.get('gv_missq',[]);if(!q.length||!fb||!CL.user)return;const {D}=fb,r=D.ref(fb.rt,'beta/review/'+CL.user.uid+'/misses');LS.set('gv_missq',[]);q.forEach(o=>{const c={};for(const k in o)if(o[k]!==''&&o[k]!=null)c[k]=typeof o[k]=='string'?o[k].slice(0,200):o[k];D.push(r,c).catch(()=>{})});LS.set('gv_missup',(LS.get('gv_missup',0)||0)+q.length);toast('이 기기의 오답 '+q.length+'건을 올렸어요')}
function chipUI(){let c=$('#authchip');if(!c){const t=$('#theme');if(!t)return;t.insertAdjacentHTML('beforebegin','<button id="authchip" class="achip"></button>');c=$('#authchip');c.onclick=()=>{if(!CL.user){login()}else if(/실패/.test(CL.syncMsg||'')||CL.dirty){cloudPush(true).then(()=>{CL.syncMsg='✅ 동기화됨';chipUI()}).catch(e=>{CL.syncMsg='⚠️ 동기화 실패: '+(e.code||'');chipUI()})}else go('data')}}
 const u=CL.user,hm=t=>t?new Date(t).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}):'';let st,tx;
 if(!u){st='off';tx=CL.st=='loading'&&localStorage.getItem('gv_fb')=='1'?'연결 중…':'로그인 안 됨'}else if(/실패/.test(CL.syncMsg||'')){st='err';tx='동기화 실패 · 다시 시도'}else if(CL.dirty||/중/.test(CL.syncMsg||'')){st='pend';tx='동기화 대기'}else{st='ok';tx='동기화됨 '+hm(CL.lastPush)}
 const ini=u?esc(((S.nick||'나')+'').trim().charAt(0)):'';c.className='achip '+st;c.title=u?'로그인됨 — 탭하면 계정 설정':'탭해서 Google 로그인';c.innerHTML=(u?`<span class="av">${ini}</span>`:'')+`<span class="dot"></span><span class="tx">${tx}</span>`}
(function(){const cu=cloudUI;cloudUI=function(){cu.apply(this,arguments);chipUI();if(CL.user&&!window._devd){window._devd=1;devPing();missFlush()}if(!CL.user)window._devd=0};
 const cp=cloudPush;cloudPush=async function(){const r=await cp.apply(this,arguments);devPing();chipUI();return r};
 setInterval(chipUI,4000);setTimeout(chipUI,0);
 const as=accountSection;accountSection=function(){let h=as.apply(this,arguments);const box=`<div class="set"><label>이 기기 이름<span class="mut">내 기기 목록에 표시돼요</span></label><input class="inp" id="devnm" maxlength="40" value="${esc(devName())}"></div><h3>📱 내 기기</h3><div id="devl" class="small">${CL.user?'불러오는 중…':'로그인하면 이 계정으로 접속한 기기 목록이 보여요.'}</div>`;h=h.replace(/<\/div>$/,box+'</div>');setTimeout(devList,0);return h};
 const ba=bindAcct;bindAcct=function(){ba.apply(this,arguments);const n=$('#devnm');n&&(n.onchange=()=>{localStorage.setItem('gv_devname',n.value.trim().slice(0,40));devPing();toast('기기 이름을 저장했어요')})};
 const rh=renderHome;renderHome=function(){rh.apply(this,arguments);const q=LS.get('gv_missq',[]).length;if(q&&!CL.user&&!$('#mqban')){const v=$('#v-home');v&&v.insertAdjacentHTML('afterbegin',`<div class="box warnbox" id="mqban">☁️ 이 기기에 아직 올리지 않은 오답 기록 ${q}건이 있어요. 로그인하면 자동으로 올라가고 다른 기기와 합쳐져요. <button class="sbtn" id="mqlog">Google로 로그인</button></div>`);$('#mqlog').onclick=()=>login()}}})();
function devList(){const el=$('#devl');if(!el||!fb||!CL.user)return;const {D}=fb;D.get(D.ref(fb.rt,'beta/review/'+CL.user.uid+'/devices')).then(s=>{const v=s.val()||{},me=devId(),f=t=>t?new Date(t).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
 el.innerHTML=Object.entries(v).sort((a,b)=>(b[1].seen||0)-(a[1].seen||0)).map(([k,d])=>`<div class="devr${k==me?' me':''}"><b>${esc(d.name||'기기')}</b>${k==me?' <em>이 기기</em>':''}<br><span class="mut">마지막 접속 ${f(d.seen)} · 마지막 동기화 ${f(d.sync)} · 오답 업로드 ${d.up||0}건</span></div>`).join('')||'아직 없어요'}).catch(e=>{el.textContent='기기 목록을 불러오지 못했어요 ('+(e.code||'오류')+') — 서버 규칙 배포가 필요할 수 있어요'})}

// 채점 후 숫자 단축키가 다음 문항 입력칸에 찍히지 않게
document.addEventListener('keydown',e=>{if(!/^[0-9]$/.test(e.key)||e.ctrlKey||e.metaKey||e.altKey)return;const post=document.querySelector('#plov:not(.hide) [data-g]:not([disabled]), #plov:not(.hide) .grades button, #v-review:not(.hide) #rctl .grades, #v-quiz:not(.hide) #qbox .grades');
 const t=e.target,inp=t&&(t.tagName=='INPUT'||t.tagName=='TEXTAREA')&&!t.readOnly;if(post){e.preventDefault();window._kgrade=Date.now()}else if(inp)return},true);
document.addEventListener('keyup',()=>{},true);
// 학자 언행·비유 → 통합 인출로 이동(르페브르 집중은 기존 선택형 유지)
(function(){const sm=sqMenu;sqMenu=function(focus){if(focus)return sm.apply(this,arguments);S.kwT='sq';save();return kwMenu()}})();

;window.__gvStage=22;
// ---- r28: 통합 기록(본 문항) · 7일 완주 패스 · 3모드 IA · 학습 시작/이어하기 ----
// 원인 수정: (1) '본 문항'이 인출 드릴 안에서만 기록되고 카드·퀴즈·지문 기록(acc)은 무시됨 (2) 동기화 mergeIn이 gv_kwseen을 합치지 않아 다른 기기에서 본 것이 '안 푼 것'으로 다시 나옴
function seenKey(x){if(!x)return '';if(x.k=='K'||x.k=='V'||x.k=='T')return 'T:'+(x.t&&x.t.term);return kwKey(x)}
function kwSeen(){const s=Object.assign({},LS.get('gv_kwseen',{}));for(const k in acc)if(acc[k]&&acc[k].n){s['T:'+k]=1}for(const k in s){if(k.startsWith('K:')||k.startsWith('V:'))s['T:'+k.slice(2)]=1}return new Proxy(s,{get:(o,k)=>{if(typeof k!='string')return o[k];if(o[k])return 1;if(k.startsWith('K:')||k.startsWith('V:'))return o['T:'+k.slice(2)];return o[k]}})}
function seenMark(x){const s=LS.get('gv_kwseen',{});s[kwKey(x)]=1;const sk=seenKey(x);if(sk)s[sk]=1;LS.set('gv_kwseen',s)}
// 인출 드릴에서 LS.set('gv_kwseen', proxy)로 저장될 때 프록시를 평범한 객체로
(function(){const s0=LS.set;LS.set=function(k,v){if(k=='gv_kwseen'&&v&&typeof v=='object'){const o={};for(const z of Object.keys(v))o[z]=1;v=o}return s0.call(this,k,v)}})();
// 다른 화면(카드·퀴즈·지문형)에서 푼 것도 기록
(function(){const pm=plMark;plMark=function(k,ok){try{if(k&&k[1]==':'){const s=LS.get('gv_kwseen',{});if(k[0]=='p')s['B:'+k.slice(2)]=1;if(k[0]=='t')s['T:'+k.slice(2)]=1;LS.set('gv_kwseen',s)}}catch(e){}return pm.apply(this,arguments)}})();
// ---- 전체 문항(우주) ----
function passAll(){const U=[];T.forEach(t=>U.push({k:'K',t}));PSG.forEach(p=>p.blanks&&p.blanks.length&&U.push({k:'B',p,i:0,g:{}}));wbd().wb.forEach(p=>p.bl&&p.bl.length&&U.push({k:'W',p,i:0,g:{}}));wbd().w16.forEach(q=>U.push(qBl({k:'Q',q})?{k:'Q',q,i:0,g:{}}:{k:'Q',q}));sqd().forEach(q=>(q.ans||q.con)&&U.push({k:'S',q}));return U}
function passSubj(x){const c=x.t?x.t.cat:x.p?(x.p.cat||x.p.subj):x.q?(x.q.cat||''):'';return grpOf(c)||c||'기타'}
function passGet(){let p=LS.get('gv_pass',null);if(!p){p={start:kstYMD(),days:7};LS.set('gv_pass',p)}return p}
function passDayIdx(p){return Math.floor((Date.parse(kstYMD())-Date.parse(p.start))/864e5)}
function passStat(){const p=passGet(),U=passAll(),sn=kwSeen();const un=U.filter(x=>!sn[seenKey(x)]);const tot=U.length,done=tot-un.length;const di=passDayIdx(p),left=Math.max(1,p.days-di);const td=kstYMD();
 if(!p.d||p.d.date!=td){p.d={date:td,quota:Math.ceil(un.length/left),base:done};LS.set('gv_pass',p)}
 const today=Math.max(0,done-p.d.base),need=Math.max(0,p.d.quota-today);const bys={};U.forEach(x=>{const s=passSubj(x),o=bys[s]||(bys[s]={n:0,d:0});o.n++;if(sn[seenKey(x)])o.d++});
 return {p,U,un,tot,done,left,dday:Math.max(0,p.days-di),quota:p.d.quota,today,need,bys}}
// 오늘 분량 세트: 안 본 것(과목 섞어 고르게) → 그다음 복습 소량
function passSet(n){const st=passStat();const un=shuffle(st.un.slice());const take=Math.min(n,st.need||n);let L=un.slice(0,take);
 if(L.length<n){const sn=kwSeen();const hot=st.U.filter(x=>sn[seenKey(x)]&&kwHot(x));L=L.concat(shuffle(hot).slice(0,Math.min(n-L.length,Math.max(5,Math.round(n/4)))))}return L}
function passGo(){const n=S.kwN||20;const L=passSet(n);if(!L.length){toast('오늘 분량과 복습을 모두 마쳤어요');return}S.lastStart={m:'pass'};save();kwRun(L,'📅 오늘 할 분량')}
function passCard(){let st;try{st=passStat()}catch(e){return ''}const pct=st.tot?Math.round(st.done/st.tot*1000)/10:0;
 const subs=Object.entries(st.bys).sort((a,b)=>b[1].n-a[1].n).map(([s,o])=>`<div class="pvrow"><span>${esc(s)}</span><span class="pbar sm"><i style="width:${o.n?o.d/o.n*100:0}%"></i></span><span class="small mut">${o.d}/${o.n}</span></div>`).join('');
 return `<div class="box passcard"><div class="hero">${ring(st.today,st.quota||1)}<div style="flex:1"><div class="mut">D-${st.dday} · 7일 완주 ${pct}%</div><div class="big">${st.need?'오늘 분량 '+st.need+'개':'오늘 분량 완료 ✅'}</div><div class="mut">전체 ${st.done}/${st.tot} · 오늘 ${st.today}/${st.quota}</div></div></div>
 <button class="cta" id="passgo">${st.need?'▶ 오늘 분량 시작':'▶ 복습 더 하기'}<small>단어·인출·암기 어디서 풀어도 진도에 반영돼요</small></button>${S.lastStart&&S.lastStart.m&&S.lastStart.m!='pass'?'<button class="sbtn" id="resume" style="width:100%;margin-top:8px">↻ 이어하기</button>':''}
 <div class="mslot"></div><details class="small fold"><summary>과목별 진도 · 설정</summary>${subs}<p class="mut">남은 문항을 남은 날짜로 나눠 매일 분량을 다시 계산해요(빠진 날은 다음 날로 넘어가요).</p><button class="sbtn" id="passreset">시작일을 오늘로 다시 설정</button></details></div>`}
function passBind(v){const b=id=>v.querySelector('#'+id);b('passgo')&&(b('passgo').onclick=passGo);b('resume')&&(b('resume').onclick=resumeLast);b('passreset')&&(b('passreset').onclick=async()=>{if(await askConfirm('정말로 7일 진도를 오늘부터 다시 시작하시겠어요?','7일 코스 시작일이 오늘로 바뀌어 일차 진행이 처음부터 다시 계산돼요. 학습 기록은 유지돼요.','다시 시작')){LS.set('gv_pass',{start:kstYMD(),days:7});renderHome()}})}
function resumeLast(){const l=S.lastStart||{};if(l.m=='kw'&&l.kd){const P=kwPool(l.kd,T.filter(inDeck));if(P.length)return kwRun(kwOrder(P,S.kwN||20),l.ttl||'인출')}if(l.m=='card')return go('card');if(l.m=='mem')return memMenu();passGo()}
// ---- 3모드 ----
function wordMenu(){const o=ov(`<h2>🃏 단어학습</h2><p class="mut">용어를 익히는 단계: 카드로 보고, 고르고, 구별해요.</p><div class="plgrid big3">
 <button class="sbtn big" id="wm1"><b>🃏 카드 (SRS)</b><br><span class="small">${T.length}개 · 복습 간격 자동</span></button>
 <button class="sbtn big" id="wm2"><b>✏️ 5지선다·지문 퀴즈</b><br><span class="small">${MCQ0.length} 5지선다 · ${PSG.length} 지문</span></button>
 <button class="sbtn big" id="wm3"><b>⚖️ 특징 진술 판단</b><br><span class="small">개념 구별 O/X</span></button></div>
 <h3 class="small mut">더 보기</h3><div class="plgrid"><button class="sbtn" id="wm4">🎧 듣기 모드</button></div>`);
 const c=id=>o.querySelector('#'+id);c('wm1').onclick=()=>{ovClose();S.lastStart={m:'card'};save();listView=false;goRaw('card')};c('wm2').onclick=()=>{ovClose();goRaw('quiz')};c('wm3').onclick=()=>{ovClose();ftMenu()};c('wm4').onclick=()=>{ovClose();lsMenu()}}
function memMenu(){const o=ov(`<h2>🧠 암기학습</h2><p class="mut">서술형 답안을 통째로 떠올리고 말하는 단계.</p><div class="plgrid big3">
 <button class="sbtn big" id="mm1"><b>📝 16주 스터디 서술 Q&amp;A</b><br><span class="small">${wbd().w16.length}문항</span></button>
 <button class="sbtn big" id="mm2"><b>🔁 놓친 것 다시 쓰기</b><br><span class="small">복습 대기 우선</span></button>
 <button class="sbtn big" id="mm3"><b>🎤 서울 2차 연습</b><br><span class="small">면접·실연·지도안·정책</span></button></div>`);
 const c=id=>o.querySelector('#'+id);c('mm1').onclick=()=>{S.lastStart={m:'mem'};save();const P=kwPool('w16');P.length?kwRun(kwOrder(P,S.kwN||20),'📝 16주 서술'):toast('이 과목 범위에 문항이 없어요')};
 c('mm2').onclick=()=>{const sn=kwSeen();const P=passAll().filter(x=>sn[seenKey(x)]&&kwHot(x));P.length?kwRun(shuffle(P).slice(0,S.kwN||20),'🔁 놓친 것'):toast('놓친 문항이 없어요')};c('mm3').onclick=()=>{ovClose();s2Menu()}}
let goRaw=go;
(function(){const g0=go;goRaw=g0;go=function(m){if(m=='word'){$$('#nav button').forEach(x=>x.classList.toggle('on',x.dataset.m=='word'));return wordMenu()}if(m=='mem'){$$('#nav button').forEach(x=>x.classList.toggle('on',x.dataset.m=='mem'));return memMenu()}if(m=='s2')return s2Menu();return g0.apply(this,arguments)}})();
// 인출 메뉴: 시작 기억 + 단서어→이론 편입, 르페브르 집중 등 단발 버튼 제거
(function(){const km=kwMenu;kwMenu=function(){const r=km.apply(this,arguments);const o=document.querySelector('.ov,.overlay')||document;o.querySelectorAll('#sqk,#kwplan').forEach(b=>b.remove());const g=o.querySelectorAll('.plgrid')[1];if(g&&!g.querySelector('#eck'))g.insertAdjacentHTML('beforeend','<button class="sbtn" id="eck"><b>🔍 단서어 → 이론</b><br><span class="small">경제지리 단서어</span></button>');const e=o.querySelector('#eck');e&&(e.onclick=()=>ecMenu());
 o.querySelectorAll('[data-k]').forEach(b=>{const f=b.onclick;b.onclick=function(){S.lastStart={m:'kw',kd:b.dataset.k,ttl:(b.querySelector('b')||b).textContent};save();return f.apply(this,arguments)}});return r}})();
// 세트 끝나면 한 번에 '다음 세트'
(function(){const mo=new MutationObserver(()=>{const a=document.querySelector('#kwag');if(a&&!document.querySelector('#kwnext')){a.insertAdjacentHTML('beforebegin','<button class="sbtn pri" id="kwnext">▶ 다음 세트</button>');a.classList.remove('pri');document.querySelector('#kwnext').onclick=()=>{const l=S.lastStart||{};if(l.m=='kw'||l.m=='mem')resumeLast();else passGo()}}});mo.observe(document.body,{childList:true,subtree:true})})();
// 홈 정리: 단발 버튼 제거 → 패스 카드 + 3모드
(function(){const _rh=renderHome;renderHome=function(){_rh.apply(this,arguments);const v=$('#v-home');if(!v)return;['#lsbtn','#s2btn','#ftbtn','#sqbtnh','#ecbtnh'].forEach(s=>v.querySelectorAll(s).forEach(e=>e.remove()));v.querySelectorAll('.passcard,.modes3').forEach(e=>e.remove());
 v.insertAdjacentHTML('afterbegin',passCard()+`<div class="kpis modes3"><button class="kpi" data-go="word"><b>🃏</b><span>단어학습<br><small>카드·5지선다</small></span></button><button class="kpi" data-go="kw"><b>✍️</b><span>인출학습<br><small>키워드·빈칸</small></span></button><button class="kpi" data-go="mem"><b>🧠</b><span>암기학습<br><small>서술·놓친 것</small></span></button></div>`);{const pc=v.querySelector('.passcard'),ms=v.querySelector('.modes3');pc&&ms&&pc.querySelector('.mslot').replaceWith(ms)}passBind(v);v.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go))}})();
// 키워드 인출 해설: 확인된 연결 용어(대비 개념·관련 용어)를 탭하면 카드
function relLinks(t){if(!t)return '';const out=[];const vs=vsKey(t);if(vs&&findT(vs.other))out.push(['대비',findT(vs.other).term]);(t.distractors||[]).slice(0,4).forEach(d=>{const x=findT(d);x&&x.term!=t.term&&out.push(['혼동',x.term])});
 const seen=new Set();const L=out.filter(([_,n])=>!seen.has(n)&&seen.add(n));return L.length?`<div class="rel small"><b>연결 용어</b> ${L.map(([k,n])=>`<button class="chip" data-rt="${esc(n)}">${k} · ${esc(n)}</button>`).join(' ')}</div>`:''}
document.addEventListener('click',e=>{const b=e.target.closest('[data-rt]');if(!b)return;e.stopPropagation();const t=findT(b.dataset.rt);if(!t)return;const d=document.createElement('div');d.className='relpop';d.innerHTML=`<b>${esc(t.term)}</b>${t.en?' <span class="mut small">'+esc(t.en)+'</span>':''}<p>${esc(t.def||'')}</p><button class="sbtn small">닫기</button>`;document.body.appendChild(d);d.querySelector('button').onclick=()=>d.remove()},true);
(function(){const mo=new MutationObserver(()=>{const a=document.querySelector('#kwsc');if(!a||a.dataset.rel)return;const tg=document.querySelector('.plterm');if(!tg)return;const t=findT(tg.textContent.trim());if(!t)return;a.dataset.rel=1;a.insertAdjacentHTML('afterend',relLinks(t))});mo.observe(document.body,{childList:true,subtree:true})})();
// r29 홈 정리: 예전 섹션은 접어 두고, 기능은 모드 메뉴에서 호출
function homeClick(label){ovClose();goRaw('home');setTimeout(()=>{const b=[...document.querySelectorAll('#v-home button')].find(x=>x.textContent.includes(label));b&&b.click()},60)}
(function(){const _rh=renderHome;renderHome=function(){_rh.apply(this,arguments);const v=$('#v-home');if(!v||v.querySelector('#oldhome'))return;const keep=new Set([...v.querySelectorAll('.passcard,.modes3')]);const mv=[...v.children].filter(e=>!keep.has(e)&&!/앱처럼 설치/.test(e.textContent));
 const d=document.createElement('details');d.id='oldhome';d.className='box';d.innerHTML='<summary><b>더 보기</b> <span class="small mut">용어 플랜(7일·10일)·벼락치기·과목별 할 일·취약 분석·D-day</span></summary>';v.querySelector('.passcard').after(d);mv.forEach(e=>{if(e.id=='qtabs'||e.querySelector('#hgo,.hero')||e.classList.contains('plcard')){e.remove();return}e.classList.remove('box');e.style.margin='10px 0';d.appendChild(e)});d.insertAdjacentHTML('beforeend','<div class="row" style="margin-top:10px"><button class="sbtn" id="ohplan">🗓️ 7일·10일 용어 플랜 설정</button><button class="sbtn" id="ohcram">⚡ 벼락치기</button><button class="sbtn" id="ohrev">🔁 오늘 복습(간격 반복)</button></div>');d.querySelector('#ohplan').onclick=()=>plSetup();d.querySelector('#ohcram').onclick=()=>cramMenu();d.querySelector('#ohrev').onclick=()=>go('review');if(sessionStorage.getItem('gv_oh')=='1')d.open=true;d.ontoggle=()=>sessionStorage.setItem('gv_oh',d.open?'1':'0')}})();
(function(){const wm=wordMenu;wordMenu=function(){wm();const g=document.querySelectorAll('.plgrid');const x=g[g.length-1];x&&x.insertAdjacentHTML('beforeend','<button class="sbtn" id="wm5">⏱️ 모의고사</button>');const b=document.querySelector('#wm5');b&&(b.onclick=()=>homeClick('모의고사'))};
 const mm=memMenu;memMenu=function(){mm();const g=document.querySelector('.big3');g&&g.insertAdjacentHTML('afterend','<h3 class="small mut">더 보기</h3><div class="plgrid"><button class="sbtn" id="mm4">📝 지문형 서술</button><button class="sbtn" id="mm5">📒 오답노트</button></div>');const q=s=>document.querySelector(s);q('#mm4')&&(q('#mm4').onclick=()=>homeClick('지문형 서술'));q('#mm5')&&(q('#mm5').onclick=()=>homeClick('오답노트'))}})();
// 해설·출처·채점기준 접기, 배지 줄이기 (렌더 후 후처리)
(function(){const fold=root=>{root.querySelectorAll('.src:not([data-f]),.srcnote:not([data-f]),.prov:not([data-f])').forEach(e=>{e.dataset.f=1;const d=document.createElement('details');d.className='fold';d.innerHTML='<summary>출처</summary>';e.replaceWith(d);d.appendChild(e)});
 root.querySelectorAll('.rub:not([data-f]),.rubric:not([data-f])').forEach(e=>{e.dataset.f=1;const d=document.createElement('details');d.className='fold';d.innerHTML='<summary>채점 기준</summary>';e.replaceWith(d);d.appendChild(e)})};
 const mo=new MutationObserver(()=>fold(document.body));mo.observe(document.body,{childList:true,subtree:true})})();
// 도식 탭하면 크게
document.addEventListener('click',e=>{const s=e.target.closest('.plq svg,.psgtxt svg,.mdl svg,svg[aria-label]');if(!s||s.closest('.svgzoom')||s.closest('#nav,button'))return;const d=document.createElement('div');d.className='svgzoom';d.innerHTML=s.outerHTML+'<p class="small mut">탭하면 닫혀요 · 가로로 돌리면 더 크게</p>';d.onclick=()=>d.remove();document.body.appendChild(d)});
// 인출 ㉠㉡ 문항: 채점 뒤 함정 해설·모범답안·출처를 접힌 줄로
(function(){const mo=new MutationObserver(()=>{const a=document.querySelector('#kwsc');if(!a||a.dataset.ex)return;const rv=a.textContent.trim()||(document.querySelector('#plbtn')&&!document.querySelector('#plrev'));if(!rv)return;const bm=(a.closest('#ov,body').innerText.match(/빈칸 (\d+)\/(\d+)/));if(bm&&bm[1]!=bm[2])return;const id=String(window.CURID||'');if(!id.startsWith('B:'))return;const p=PSG.find(z=>z.id==id.slice(2));if(!p)return;a.dataset.ex=1;
 const w=(p.wrongs||[]).filter(z=>z.why);const h=`${w.length?`<div class="trap"><b>함정</b>${w.map(z=>`<div>✗ <b>${esc(z.a)}</b> — ${esc(z.why)}</div>`).join('')}</div>`:''}${p.model?`<details class="fold"><summary>해설 · 모범 답안${p.rubric&&p.rubric.length?' · 채점 기준':''}</summary><div>${esc(p.model)}</div>${p.rubric&&p.rubric.length?`<div class="mut">채점 키워드: ${p.rubric.map(esc).join(' · ')}</div>`:''}</details>`:''}${(p.rel||[]).length?`<div class="relk"><b>관련 키워드</b> ${p.rel.map(r=>`<span class="pill">${esc(r)}</span>`).join(' ')}</div>`:''}${p.src?`<details class="fold"><summary>출처</summary><div>${esc(p.src)}</div></details>`:''}`;a.insertAdjacentHTML('afterend',`<div class="bex">${h}</div>`)});mo.observe(document.body,{childList:true,subtree:true})})();
// 도식: 서브노트 원본 이미지(빈칸 가림) 우선, 채점 후 원본으로 교체. 이미지는 img/ 폴더 지연 로딩
function figHtml(p){if(p.img)return `<div class="mdl fig"><img loading="lazy" decoding="async" src="${esc(p.img.q)}" data-a="${esc(p.img.a)}" alt="도식(빈칸)" class="figq"><div class="small mut">도식을 탭하면 크게 · 채점 뒤 원본이 보여요</div>${p.svg?`<details class="fold"><summary>다시 그린 도식</summary>${p.svg}</details>`:''}</div>`;return p.svg?`<div class="mdl">${p.svg}</div>`:''}
(function(){const mo=new MutationObserver(()=>{const a=document.querySelector('#kwsc');const b=document.querySelector('.psplit .exp');if(!b&&(!a||!a.textContent.trim()))return;document.querySelectorAll('img.figq').forEach(i=>{i.src=i.dataset.a;i.classList.remove('figq');i.alt='도식(원본)'})});mo.observe(document.body,{childList:true,subtree:true})})();
document.addEventListener('click',e=>{const i=e.target.closest('.fig img');if(!i)return;const d=document.createElement('div');d.className='svgzoom';d.innerHTML=`<img src="${i.src}" style="max-width:100%;max-height:90vh;background:#fff"><p class="small mut">탭하면 닫혀요</p>`;d.onclick=()=>d.remove();document.body.appendChild(d)});
// r29.1 settings: version + login diagnostics
(function(){const cu=cloudUI;cloudUI=function(){cu.apply(this,arguments);const a=$('#acct');if(a&&!$('#adiag')){a.insertAdjacentHTML('afterend',`<details class="box fold" id="adiag"><summary>앱 버전 ${document.querySelector('.verchip')?.textContent||''} · 로그인 진단</summary><div class="small mut" style="white-space:pre-wrap">상태: ${CL.user?'로그인됨 ('+esc(CL.user.email||'')+')':'로그인 안 됨'} · 클라우드 ${CL.st}${CL.err?' · 마지막 오류 '+esc(CL.err):''}\n${esc(JSON.parse(localStorage.getItem('gv_alog')||'[]').join('\n'))}</div></details>`)}}})();
(function(){const g=go;go=function(m){const r=g.apply(this,arguments);if(m=='data')setTimeout(()=>{try{cloudUI()}catch(e){}},0);return r}})();
// r29.1 mobile 더보기 tab
(function(){const g=go;go=function(m){if(m=='more'){const d=$('#navdue');const n=d&&!d.classList.contains('hide')?d.textContent:'';const o=ov(`<h2>더보기</h2><div class="moremenu"><button class="sbtn" data-mm="review">🔁 복습${n?' <span class="pill bad">'+esc(n)+'</span>':''}</button><button class="sbtn" data-mm="stats">📊 통계</button><button class="sbtn" data-mm="data">⚙️ 설정 · 계정 · 버전</button></div>`);o.querySelectorAll('[data-mm]').forEach(b=>b.onclick=()=>{ovClose();go(b.dataset.mm)});return}return g.apply(this,arguments)};
 const sync=()=>{const a=$('#navdue'),b=$('#navdue2');if(a&&b){b.textContent=a.textContent;b.classList.toggle('hide',a.classList.contains('hide'))}};setInterval(sync,2000);setTimeout(sync,300)})();

;window.__gvStage=23;
// ---- r30 덱 중심 IA: ⭐기출 단어장 · 과목별 핵심 단어장 → 하나의 시작 버튼(혼합 인출) ----
const DSUBJ=['지형학','기후학','토양·식생·수문','지도학·GIS','인구지리','도시지리','경제지리','문화·역사·정치지리','지리교육론','지역지리'];
let _lk=null;
function dkLinks(){if(_lk)return _lk;const M=new Map(),add=(t,x)=>{if(!t)return;const a=M.get(t.term)||[];a.push(x);M.set(t.term,a)};
 PSG.forEach(p=>{if(!p.blanks||!p.blanks.length)return;const ts=new Set();p.blanks.forEach((b,j)=>{const t=findT((p.rel||[])[j]||'')||findT(b.a[0]);t&&ts.add(t)});const x={k:'B',p,i:0,g:{}};ts.forEach(t=>add(t,x))});
 wbd().wb.forEach(p=>{if(!p.bl||!p.bl.length)return;const ts=new Set();p.bl.forEach(b=>{const t=findT(b[1]);t&&ts.add(t)});const x={k:'W',p,i:0,g:{}};ts.forEach(t=>add(t,x))});
 sqd().forEach(q=>{const t=findT(q.ans||q.con||'');t&&add(t,{k:'S',q})});return _lk=M}
function dkFreq(t){let f=0;(t.exam||[]).forEach(e=>{const y=+(String(e).match(/20\d\d/)||[0])[0];f+=y>=2017?3:y>=2014?2:1});return f+(t.core?2:0)}
function dkTerms(id){let L;if(id=='exam')L=T.filter(t=>t.core||(t.exam&&t.exam.length));else if(id=='core')L=T.filter(t=>t.core);else L=T.filter(t=>t.cat==id);return L.slice().sort((a,b)=>((b.clf||0)-(a.clf||0))||String(a.cl||'').localeCompare(String(b.cl||''))||(dkFreq(b)-dkFreq(a)))}
function dkName(id){return id=='exam'?'⭐ 기출 단어장':id=='core'?'⭐ 기출 핵심 364':'📚 '+id}
function dkTypes(){return {K:1,B:1,W:1,S:1,V:1}}
function dkPool(id){const ty=dkTypes(),ts=dkTerms(id).filter(sfOk),L=dkLinks(),seen=new Set(),out=[];
 ts.forEach(t=>{if(t.arch||t.demote)return;if(ty.K&&kwList(t).length)out.push({k:'K',t});if(ty.V&&vsKey(t))out.push({k:'V',t});(L.get(t.term)||[]).forEach(x=>{if(!ty[x.k])return;const k=kwKey(x);if(seen.has(k))return;seen.add(k);out.push(x)})});return out}
function dkStat(id){const ts=dkTerms(id),sn=kwSeen();let s=0,m=0;ts.forEach(t=>{if(sn['T:'+t.term]||sn['K:'+t.term]||acc[t.term])s++;if(wrong[t.term]||marks[t.term]=='bad')m++});return {n:ts.length,seen:s,un:ts.length-s,miss:m}}
function dkBar(st){const p=st.n?Math.round(st.seen/st.n*100):0;return `<div class="pbar"><i style="width:${p}%"></i></div><div class="small mut">${st.seen}/${st.n} (${p}%) · 안 푼 ${st.un} · 놓친 ${st.miss}</div>`}
function dkGo(id){const P=dkPool(id);if(!P.length){toast('이 범위에 문항이 없어요');return}S.lastStart={m:'deck',id};save();_dkLast=id;{const sn=kwSeen(),un=P.filter(x=>!sn[kwKey(x)]&&!sn[seenKey(x)]),hot=P.filter(x=>(sn[kwKey(x)]||sn[seenKey(x)])&&kwHot(x)),rest=P.filter(x=>(sn[kwKey(x)]||sn[seenKey(x)])&&!kwHot(x));kwRun([...un,...hot,...rest].slice(0,S.kwN||20),dkName(id))}}
var _dkLast=null;
function dkSheet(id){const st=dkStat(id),ty=dkTypes(),P=dkPool(id);const TY=[['K','키워드'],['B','ㄱㄴ 지문·학자'],['W','워크북'],['S','학자의 말'],['V','비교쌍']];
 const o=ov(`<h2>${esc(dkName(id))}</h2>${dkBar(st)}<button class="cta" id="dkgo">▶ 시작<small>${P.length}문항 중 안 푼 것부터 ${S.kwN||20}개</small></button>
 <details class="fold"><summary>옵션</summary>
 <div class="row small">한 세트 <select id="dkn">${[10,20,30,50].map(n=>`<option ${n==(S.kwN||20)?'selected':''}>${n}</option>`).join('')}</select></div>
 <div class="row"><button class="sbtn" id="dkcard">🃏 카드로 보기</button><button class="sbtn" id="dkquiz">✏️ 5지선다</button><button class="sbtn" id="dklist">🔍 용어 목록·검색</button></div></details>`);
 o.querySelector('#dkgo').onclick=()=>{ovClose();dkGo(id)};
 o.querySelector('#dkn').onchange=e=>{S.kwN=+e.target.value;save();ovClose();dkSheet(id)};
 const setDeck=()=>{if(id=='exam'||id=='core'){deck='core';cat='전체'}else{deck='all';cat=id}sub='전체';try{save()}catch(e){}};
 o.querySelector('#dkcard').onclick=()=>{ovClose();setDeck();listView=false;goRaw('card')};o.querySelector('#dkquiz').onclick=()=>{ovClose();setDeck();goRaw('quiz')};o.querySelector('#dklist').onclick=()=>{ovClose();setDeck();listView=true;goRaw('card')}}
function dkSubjList(){const o=ov(`<h2>📚 과목별 핵심 단어장</h2><div class="dklist">${DSUBJ.map(c=>{const st=dkStat(c);return `<button class="dkrow" data-c="${esc(c)}"><b>${esc(c)}</b>${dkBar(st)}</button>`}).join('')}</div>`);o.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{ovClose();dkSheet(b.dataset.c)})}
function dkTiles(){const a=dkStat('exam');let n=0,s=0,m=0;DSUBJ.forEach(c=>{const x=dkStat(c);n+=x.n;s+=x.seen;m+=x.miss});
 return `<div class="dktiles"><button class="dktile" data-dk="exam"><b>⭐ 기출 단어장</b>${dkBar(a)}</button><button class="dktile" data-dk="subj"><b>📚 과목별 핵심 단어장</b><span class="small mut">${DSUBJ.length}과목</span>${dkBar({n,seen:s,un:n-s,miss:m})}</button></div>`}
function dkBind(v){v.querySelectorAll('[data-dk]').forEach(b=>b.onclick=()=>b.dataset.dk=='subj'?dkSubjList():dkSheet(b.dataset.dk))}
function dkDeckMenu(){const o=ov(`<h2>단어장</h2>${dkTiles()}<h3 class="small mut">과목</h3><div class="dklist">${DSUBJ.map(c=>{const st=dkStat(c);return `<button class="dkrow" data-c="${esc(c)}"><b>${esc(c)}</b>${dkBar(st)}</button>`}).join('')}</div>`);dkBind(o);o.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{ovClose();dkSheet(b.dataset.c)})}
// 탭 5개
const NAV5='<button data-m="home" class="on"><span class="ic">🏠</span>홈</button><button data-m="deck"><span class="ic">📚</span>단어장</button><button data-m="review"><span class="ic">🔁</span>복습<span class="bdg hide" id="navdue"></span></button><button data-m="write"><span class="ic">📝</span>서술</button><button data-m="more"><span class="ic">☰</span>더보기</button>';
(function(){const n=$('#nav');if(n){n.innerHTML=NAV5;n.classList.add('nav5')}})();
// 서술
function wrMenu(){const P=kwPool('w16');const o=ov(`<h2>📝 서술</h2><p class="small mut">16주 서술 Q&amp;A ${wbd().w16.length}문항 · 지문형 서술 ${PSG.length}</p><button class="cta" id="wrgo">▶ 서술 시작<small>16주 Q&amp;A 안 푼 것부터</small></button>
 <details class="fold"><summary>다른 서술 연습</summary><div class="moremenu"><button class="sbtn" id="wr2">📝 지문형 서술(모범답안 비교)</button><button class="sbtn" id="wr3">🔁 놓친 것 다시 쓰기</button><button class="sbtn" id="wr4">🎤 서울 2차 연습</button></div></details>`);
 o.querySelector('#wrgo').onclick=()=>{ovClose();P.length?kwRun(kwOrder(P,S.kwN||20),'📝 16주 서술'):toast('문항이 없어요')};
 o.querySelector('#wr2').onclick=()=>{ovClose();goRaw('passage')};o.querySelector('#wr3').onclick=()=>{const sn=kwSeen();const Q=passAll().filter(x=>sn[seenKey(x)]&&kwHot(x));ovClose();Q.length?kwRun(shuffle(Q).slice(0,S.kwN||20),'🔁 놓친 것'):toast('놓친 문항이 없어요')};o.querySelector('#wr4').onclick=()=>{ovClose();s2Menu()}}
// 더보기
function moreMenu(){const d=$('#navdue');const n=d&&!d.classList.contains('hide')?d.textContent:'';const it=[['stats','📊 통계 · 취약 분석'],['ls','🎧 듣기 모드'],['mock','⏱️ 모의고사'],['plan','🗓️ 기존 플랜 (7일·10일)'],['cram','⚡ 벼락치기'],['data','⚙️ 설정 · 테마 · 글자 · 로그인 · 내 기기']];
 const o=ov(`<h2>더보기</h2><div class="moremenu">${it.map(([k,l])=>`<button class="sbtn" data-mm="${k}">${l}</button>`).join('')}</div>`);
 o.querySelectorAll('[data-mm]').forEach(b=>b.onclick=()=>{ovClose();const k=b.dataset.mm;k=='ls'?lsMenu():k=='plan'?plSetup():k=='cram'?cramMenu():k=='ft'?ftMenu():k=='ec'?ecMenu():k=='mock'?(qmode='mock',S.qmode='mock',qcur=null,goRaw('quiz')):goRaw(k)})}
(function(){const g=go;go=function(m){const nav=k=>$$('#nav button').forEach(x=>x.classList.toggle('on',x.dataset.m==k));
 if(m=='deck'){nav('deck');return dkDeckMenu()}if(m=='write'||m=='mem'){nav('write');return wrMenu()}if(m=='more'){nav('more');return moreMenu()}if(m=='word'){nav('deck');return dkDeckMenu()}return g.apply(this,arguments)}})();
// 홈: 오늘 학습 한 줄 + 두 덱 타일 + 과목 칩
(function(){const _rh=renderHome;renderHome=function(){_rh.apply(this,arguments);const v=$('#v-home');if(!v)return;let st;try{st=passStat()}catch(e){return}
 const pct=st.tot?Math.round(st.done/st.tot*100):0;v.querySelectorAll('.passcard,#oldhome,.dkhome').forEach(e=>e.remove());
 const h=document.createElement('div');h.className='dkhome';h.innerHTML=`<div class="box today"><div class="seg" role="tablist"><button data-course="A" class="${passCourse()=='A'?'on':''}">핵심 단어장만</button><button data-course="B" class="${passCourse()=='B'?'on':''}">단어장+빈칸+서술</button></div><div class="tline"><b>📅 오늘 학습</b><span class="small mut">7일 완주 ${st.done}/${st.tot} (${pct}%) · D-${st.dday} · 오늘 ${st.today}/${st.quota}${streak()?' · 🔥 연속 '+streak()+'일':''}</span></div><div class="pbar"><i style="width:${pct}%"></i></div><button class="cta" id="passgo">▶ 오늘 학습${st.need?' ('+st.need+'개 남음)':' · 복습 더 하기'}</button></div><div class="box">${dkTiles()}<div class="sfwrap">${sfBar(()=>render())}</div></div>`;
 [...v.children].forEach(e=>{if(!/앱처럼 설치/.test(e.textContent)&&e.id!='mqban')e.remove()});v.prepend(h);if($('#mqban'))v.prepend($('#mqban'));passBind(v);dkBind(v)}})();
// 7일 완주 코스: A=핵심 단어장만(용어 키워드 인출), B=단어장+빈칸+서술. 코스별 날짜 분할, 본 기록은 공통
function passCourse(){return LS.get('gv_course','B')=='A'?'A':'B'}
function passKey(){return passCourse()=='A'?'gv_passA':'gv_pass'}
function passAll(){const U=[];T.forEach(t=>U.push({k:'K',t}));if(passCourse()=='A')return U;PSG.forEach(p=>p.blanks&&p.blanks.length&&U.push({k:'B',p,i:0,g:{}}));wbd().wb.forEach(p=>p.bl&&p.bl.length&&U.push({k:'W',p,i:0,g:{}}));wbd().w16.forEach(q=>U.push(qBl({k:'Q',q})?{k:'Q',q,i:0,g:{}}:{k:'Q',q}));sqd().forEach(q=>(q.ans||q.con)&&U.push({k:'S',q}));return U}
function passGet(){const K=passKey();let p=LS.get(K,null);if(!p){p={start:kstYMD(),days:7};LS.set(K,p)}return p}
function passStat(){const K=passKey(),p=passGet(),U=passAll(),sn=kwSeen();const un=U.filter(x=>!sn[seenKey(x)]);const tot=U.length,done=tot-un.length;const di=passDayIdx(p),left=Math.max(1,p.days-di);const td=kstYMD();
 if(!p.d||p.d.date!=td){p.d={date:td,quota:Math.ceil(un.length/left),base:done};LS.set(K,p)}
 const today=Math.max(0,done-p.d.base),need=Math.max(0,p.d.quota-today);const bys={};U.forEach(x=>{const s=passSubj(x),o=bys[s]||(bys[s]={n:0,d:0});o.n++;if(sn[seenKey(x)])o.d++});
 return {p,U,un,tot,done,left,dday:Math.max(0,p.days-di),quota:p.d.quota,today,need,bys,course:passCourse()}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-course]');if(!b)return;LS.set('gv_course',b.dataset.course);try{save()}catch(_){}render()});

;window.__gvStage=24;
// ---- r29.2 학습 기록 미러: 오답 백필 + 세션 활동 + 사용 스냅샷 (이름·이메일 없음) ----
function kstDay(t){return new Date((t||Date.now())+9*3600e3).toISOString().slice(0,10)}
function rtOk(){return fb&&CL.user&&fb.D}
function missClean(o){const c={};for(const k in o){const v=o[k];if(v===''||v==null)continue;c[k.replace(/[.#$\/\[\]]/g,'_')]=typeof v=='string'?v.slice(0,200):typeof v=='number'||typeof v=='boolean'?v:String(v).slice(0,200)}if(typeof c.at!='number')c.at=Date.now();if(!c.d)c.d='kw';return c}
function missKey(o){let h=0;const s=(o.id||'')+'|'+(o.term||'');for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return 'm'+(o.at||0)+'_'+(h>>>0).toString(36)}
// 오답: 로컬 gv_miss 전부를 결정적 키로 업로드(중복 없음) → 이후 실시간
async function missBackfill(){if(!rtOk())return;const {D}=fb,uid=CL.user.uid,L=LS.get('gv_miss',[])||[],done=LS.get('gv_missbf',0)||0;const todo=L.filter(o=>(o.at||0)>done);if(!todo.length)return;
 for(let i=0;i<todo.length;i+=200){const u={};todo.slice(i,i+200).forEach(o=>{u[missKey(o)]=missClean(o)});try{await D.update(D.ref(fb.rt,'beta/review/'+uid+'/misses'),u)}catch(e){alog('miss up err '+(e.code||e.message));toast('오답 업로드 실패 ['+(e.code||e.message)+']',null,null,9000);return}}
 LS.set('gv_missbf',Math.max(...todo.map(o=>o.at||0)));LS.set('gv_missq',[]);LS.set('gv_missup',(LS.get('gv_missup',0)||0)+todo.length);alog('miss up '+todo.length);toast('오답 '+todo.length+'건을 올렸어요')}
// missAdd: 로컬 기록 후 백필 경로로 업로드(필드 정리·d 기본값)
(function(){const m0=missAdd;missAdd=function(o){const save0=CL.user;const u=CL.user;CL.user=null;try{m0.call(this,Object.assign({d:'kw'},o))}finally{CL.user=u}if(u)setTimeout(()=>missBackfill().catch(()=>{}),300)}})();
missFlush=function(){missBackfill().catch(()=>{})};
// 세션 활동
const ACT={cur:null,t:0};
function actStart(kind,title){actEnd();const sn=kwSeen();ACT.cur={sid:Date.now().toString(36)+Math.random().toString(36).slice(2,5),kind,title:String(title||'').slice(0,60),deck:(S.lastStart&&S.lastStart.id)||'',subj:(sfGet().join(',')||'전체').slice(0,80),start:Date.now(),items:[],seen0:new Set(Object.keys(sn))};ACT.t=Date.now()}
function actItem(id,ok,mine){const a=ACT.cur;if(!a)return;const now=Date.now(),ms=now-ACT.t;ACT.t=now;const it={id:String(id||'').slice(0,80),ok:ok?1:0,ms:Math.min(ms,600000)};if(!ok&&mine)it.mine=String(mine).slice(0,100);it.nw=a.seen0.has(id)||a.seen0.has('T:'+String(id).replace(/^K:/,''))?0:1;if(a.items.length<300)a.items.push(it);a.n=(a.n||0)+1;a.c=(a.c||0)+(ok?1:0);a.last=now}
function actEnd(){const a=ACT.cur;ACT.cur=null;if(!a||!a.n)return;const end=a.last||Date.now();const rec={course:passCourse(),start:a.start,end,dur:Math.round((end-a.start)/1000),kind:a.kind,title:a.title,deck:a.deck,subj:a.subj,n:a.n,c:a.c,w:a.n-a.c,nw:a.items.filter(x=>x.nw).length,avg:Math.round(a.items.reduce((s,x)=>s+x.ms,0)/Math.max(1,a.items.length)/100)/10,items:Object.fromEntries(a.items.map((x,i)=>['i'+i,x]))};
 const day=kstDay(a.start),Q=LS.get('gv_actq',{});(Q[day]||(Q[day]={}))[a.sid]=rec;const ks=Object.keys(Q).sort();while(ks.length>14)delete Q[ks.shift()];LS.set('gv_actq',Q);actFlush()}
async function actFlush(){if(!rtOk())return;const Q=LS.get('gv_actq',{}),sent=LS.get('gv_actsent',{});const {D}=fb,uid=CL.user.uid;const u={};for(const d in Q)for(const s in Q[d])if(!sent[d+'/'+s])u[d+'/'+s]=Q[d][s];if(!Object.keys(u).length)return;
 try{await D.update(D.ref(fb.rt,'beta/review/'+uid+'/activity'),u);Object.keys(u).forEach(k=>sent[k]=1);LS.set('gv_actsent',sent);alog('act up '+Object.keys(u).length)}catch(e){alog('act err '+(e.code||e.message))}}
// kwRun 세션: buzz(8)=맞음, 배열=놓침 (grade 안에서 호출, CURID=현재 문항)
(function(){const k0=kwRun;kwRun=function(L,title){actStart('kw',title);return k0.apply(this,arguments)};
 const oc=ovClose;ovClose=function(){if(ACT.cur&&ACT.cur.kind=='kw')actEnd();return oc.apply(this,arguments)};
 const b0=buzz;window.buzz=buzz=function(p){if(ACT.cur&&ACT.cur.kind=='kw'&&(p===8||Array.isArray(p))){const I=document.querySelector('#plin');actItem(window.CURID,p===8,I&&I.value)}else if(ACT.cur&&ACT.cur.kind=='kw')ACT._b=1;return b0.apply(this,arguments)};
 // 카드·퀴즈 등: record() — kw 세션 밖이면 모드별 자동 세션(10분 쉬면 종료)
 const r0=record;record=function(term,ok,src){if(!(ACT.cur&&ACT.cur.kind=='kw')){const k='m:'+(src||mode||'');if(!ACT.cur||ACT.cur.kind!=k||Date.now()-ACT.t>600000)actStart(k,mode);actItem('T:'+term,ok,'')}return r0.apply(this,arguments)}})();
addEventListener('pagehide',()=>{try{actEnd()}catch(e){}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&ACT.cur&&ACT.cur.kind!='kw')actEnd()});
// 사용 스냅샷: 로컬 데이터 전부를 집계해 /review/{uid}/usage
function usageSnap(){const sn=kwSeen(),pre={};Object.keys(sn).forEach(k=>{const p=k.split(':')[0];pre[p]=(pre[p]||0)+1});
 const bySub={};for(const term in acc){const t=findT(term);const s=(t&&t.cat)||'기타',o=bySub[s]||(bySub[s]={n:0,c:0,terms:0});o.n+=acc[term].n||0;o.c+=acc[term].c||0;o.terms++}
 const M=LS.get('gv_miss',[])||[],md={},mh={},td=kstDay();M.forEach(o=>{md[o.d||'?']=(md[o.d||'?']||0)+1;if(kstDay(o.at)==td){const h=new Date((o.at||0)+9*3600e3).getUTCHours();mh['h'+h]=(mh['h'+h]||0)+1}});
 const days={};for(const d in hist){const h=hist[d];days['d'+d]={n:h.n||0,c:h.c||0,rev:h.rev||0}}const dk=Object.keys(days).sort().slice(-30),hd={};dk.forEach(k=>hd[k]=days[k]);
 const sq=LS.get('gv_sq',{}),sqn=Object.values(sq).reduce((a,r)=>[a[0]+(r.n||0),a[1]+(r.c||0)],[0,0]);const ft=LS.get('gv_ft',{});const res=LS.get('gv_kwres',null);const pass=LS.get('gv_pass',null);
 const act=LS.get('gv_actq',{}),ak={};for(const d in act)for(const s in act[d]){const r=act[d][s],k=(r.kind||'')+'|'+(r.title||'');const o=ak[k]||(ak[k]={sess:0,n:0,c:0,sec:0,last:0});o.sess++;o.n+=r.n;o.c+=r.c;o.sec+=r.dur;o.last=Math.max(o.last,r.end)}
 const clean=o=>JSON.parse(JSON.stringify(o).replace(/"([^"]*)":/g,(m,k)=>'"'+k.replace(/[.#$\/\[\]]/g,'_')+'":'));
 return clean({at:Date.now(),ver:(document.querySelector('.verchip')||{}).textContent||'',seenByType:pre,seenTotal:Object.keys(sn).length,cardsTracked:Object.keys(acc).length,srsCards:Object.keys(srs).length,srsDue:Object.values(srs).filter(c=>c&&c.due<=Date.now()).length,wrongNote:Object.keys(wrong).length,bySubject:bySub,missByDrill:md,missTodayByHourKST:mh,missTotal:M.length,histLast30:hd,scholar:{items:Object.keys(sq).length,n:sqn[0],c:sqn[1]},ftSets:Object.keys(ft).length,kwResume:res?{kd:res.kd||'',i:res.i||0,n:(res.keys||[]).length}:null,pass:pass?{start:pass.start,days:pass.days,quota:pass.d&&pass.d.quota||0}:null,lastStart:S.lastStart||null,course:passCourse(),deckMode:deck,cat,theme:S.theme||'',sessions:ak})}
async function usageUp(){if(!rtOk())return;try{await fb.D.set(fb.D.ref(fb.rt,'beta/review/'+CL.user.uid+'/usage'),usageSnap());LS.set('gv_usageAt',Date.now());alog('usage up')}catch(e){alog('usage err '+(e.code||e.message))}}
(function(){const cu=cloudUI;let done=0;cloudUI=function(){cu.apply(this,arguments);if(CL.user&&!done){done=1;setTimeout(()=>{missBackfill().catch(()=>{});actFlush();usageUp()},1500)}if(!CL.user)done=0}})();
setInterval(()=>{if(CL.user){actFlush();if(Date.now()-(LS.get('gv_usageAt',0)||0)>3600e3)usageUp()}},300000);

async function ovrUp(){if(!rtOk())return;const q=LS.get('gv_ovr',[]),done=LS.get('gv_ovrbf',0)||0,t=q.filter(o=>o.at>done);if(!t.length)return;const u={};t.forEach(o=>u[missKey(o)]=missClean(Object.assign({d:'ovr'},o)));try{await fb.D.update(fb.D.ref(fb.rt,'beta/review/'+CL.user.uid+'/overrides'),u);LS.set('gv_ovrbf',Math.max(...t.map(o=>o.at)))}catch(e){alog('ovr err '+(e.code||e.message))}}
(function(){const cu=cloudUI;let d=0;cloudUI=function(){cu.apply(this,arguments);if(CL.user&&!d){d=1;setTimeout(()=>ovrUp(),2000)}if(!CL.user)d=0}})();

;window.__gvStage=25;
// ---- r33 두 가지 학습: 단어장 암기(주) · 인출(보조) ----
function amOk(t){return t&&!/[“”"‘’]/.test(t.def||'')}
function amBase(id){return id=='exam'?T.filter(t=>t.core||(t.exam&&t.exam.length)):id=='core'?T.filter(t=>t.core):T.filter(t=>t.cat==id)}
function amTerms(id){return amBase(id).filter(sfOk)}
function amOrder(L){const sn=kwSeen(),un=L.filter(t=>!sn['T:'+t.term]),hot=L.filter(t=>sn['T:'+t.term]&&(wrong[t.term]||marks[t.term]=='bad')),rest=L.filter(t=>sn['T:'+t.term]&&!(wrong[t.term]||marks[t.term]=='bad'));return [...un,...hot,...rest]}
function amRun(L,title){if(!L.length){toast('외울 카드가 없어요');return}L=L.map(t=>({t}));let i=0,ok=0,bad=0;const done=new Set();
 const o=ov('<div id="am"></div>');o.classList.add('amov');const box=o.querySelector('#am');
 const fin=()=>{box.innerHTML=`<div class="rescard"><div class="ring" style="--p:${done.size?Math.round(ok/done.size*100):0};margin:0 auto 14px"><b>${done.size?Math.round(ok/done.size*100):0}%</b></div><div class="big">${done.size}장</div><div class="mut">알아요 ${ok} · 몰라요 ${bad}</div></div><button class="cta" id="amnx">▶ 다음 세트</button><button class="sbtn" id="amx">닫기</button>`;box.querySelector('#amx').onclick=ovClose;box.querySelector('#amnx').onclick=()=>{ovClose();_amNext&&_amNext()};box.querySelector('#amnx').focus();box._k=e=>{if(e.key=='Enter'||e.key==' '){e.preventDefault();box.querySelector('#amnx').click()}}};
 const kh=e=>{if(!document.body.contains(box)){document.removeEventListener('keydown',kh);return}if(e.target.closest&&e.target.closest('input,textarea'))return;box._k&&box._k(e)};document.addEventListener('keydown',kh);
 const show=()=>{if(i>=L.length)return fin();const t=L[i].t,ex=(t.kx||[])[0];
  box.innerHTML=`<div class="amtop"><div class="pbar"><i style="width:${i/L.length*100}%"></i></div><span class="small mut">${i+1}/${L.length}</span></div>
  <div class="amcard" id="amc"><div class="amf">${L[i].rq?'<span class="amre">다시 보기</span>':''}<div class="small amcat">${esc(grpOf(t.cat))} · ${esc(t.cat)}</div><div class="amterm">${esc(t.term)}</div>${t.en?`<div class="small mut">${esc(t.en)}</div>`:''}<div class="small mut amhint">탭해서 뒤집기</div></div>
  <div class="amb hide"><div class="small amcat">${esc(grpOf(t.cat))} · ${esc(t.cat)}</div><div class="amterm2">${esc(t.term)}</div><div class="amdef">${esc(t.def)}</div>${t.keys?`<div class="ambx"><b>서술 키워드</b> ${esc(t.keys)}</div>`:''}${t.vs?`<div class="ambx"><b>비교</b> ${esc(t.vs)}</div>`:''}${t.ex?`<div class="ambx"><b>사례</b> ${esc(t.ex)}</div>`:''}${t.distractors&&t.distractors.length?`<div class="ambx mut">⚠️ 혼동 주의: ${esc(t.distractors.join(' · '))}</div>`:''}</div></div>
  <div class="ambtn"><button class="sbtn bad" id="amn">✗ 몰라요</button><button class="sbtn mid" id="amh">△ 헷갈려요</button><button class="sbtn ok" id="amy">✓ 알아요</button></div>`;
  const c=box.querySelector('#amc'),flip=()=>{c.querySelector('.amf').classList.toggle('hide');c.querySelector('.amb').classList.toggle('hide')};c.onclick=flip;
  const grade=g=>{if(g===2){const sn=kwSeen();sn['T:'+t.term]=1;LS.set('gv_kwseen',sn);if(!L[i].rq){gvHard(t.term,'amgi');done.add(t.term);bad++;L.splice(Math.min(L.length,i+8),0,{t,rq:1})}try{save()}catch(e){}i++;return show()}const sn=kwSeen();sn['T:'+t.term]=1;LS.set('gv_kwseen',sn);if(!L[i].rq){record(t.term,g);done.add(t.term);g?ok++:bad++}if(!L[i].rq){try{srs[t.term]=sched(srs[t.term],g?3:1)}catch(e){}}if(!g){if(!L[i].rq)L.splice(Math.min(L.length,i+4),0,{t,rq:1})}try{save()}catch(e){}i++;show()};
  box.querySelector('#amy').onclick=()=>grade(1);box._k=e=>{if(e.key==' '||e.key=='Enter'){e.preventDefault();flip()}else if(e.key=='ArrowRight'||e.key=='j')grade(1);else if(e.key=='ArrowLeft'||e.key=='f')grade(0);else if(e.key=='ArrowDown'||e.key=='h')grade(2)};box.querySelector('#amn').onclick=()=>grade(0);{const h=box.querySelector('#amh');if(h)h.onclick=()=>grade(2)}
  let x0=null;c.addEventListener('touchstart',e=>x0=e.touches[0].clientX,{passive:true});c.addEventListener('touchend',e=>{if(x0==null)return;const d=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(d)>70){e.preventDefault();grade(d>0?1:0)}})};
 try{actStart&&actStart('amgi',title)}catch(e){}show()}
var _amNext=null;
function amDeck(id){const n=S.kwN||20;_amNext=()=>amDeck(id);S.lastStart={m:'am',id};save();amRun(amOrder(amTerms(id)).slice(0,n),dkName(id))}
function icDeck(id){const P=dkPool(id).filter(x=>x.k!='K');(P.length?(()=>{const sn=kwSeen(),un=P.filter(x=>!sn[kwKey(x)]&&!sn[seenKey(x)]),rest=P.filter(x=>sn[kwKey(x)]||sn[seenKey(x)]);kwRun([...un,...rest].slice(0,S.kwN||20),'인출 · '+dkName(id))}):()=>dkGo(id))()}
// 덱 화면: 암기(큰 버튼) + 인출(작은 버튼)
dkSheet=function(id){const st=dkStat(id),A=amTerms(id),P=icUnion(id);
 const o=ov(`<h2>${esc(dkName(id))}</h2>${dkBar(st)}<button class="cta" id="dkam">▶ 단어장 암기<small>${A.length}장 · 안 본 카드부터 ${S.kwN||20}장</small></button><button class="sbtn sub2" id="dkin">✏️ 인출 문제 ${P.length}개${icSel().length<3?` <span class="small mut">(${icLbl()})</span>`:''}</button>
 <details class="fold"><summary>옵션</summary><div class="row small">한 세트 <select id="dkn">${[10,20,30,50].map(n=>`<option ${n==(S.kwN||20)?'selected':''}>${n}</option>`).join('')}</select></div><div class="row"><button class="sbtn" id="dklist">🔍 용어 목록·검색</button><button class="sbtn" id="dkquiz">5지선다</button></div></details>`);
 o.querySelector('#dkam').onclick=()=>{ovClose();amDeck(id)};o.querySelector('#dkin').onclick=()=>{ovClose();icDeck(id)};
 o.querySelector('#dkn').onchange=e=>{S.kwN=+e.target.value;save();ovClose();dkSheet(id)};
 const setDeck=()=>{if(id=='exam'||id=='core'){deck='core';cat='전체'}else{deck='all';cat=id}sub='전체';try{save()}catch(e){}};
 o.querySelector('#dklist').onclick=()=>{ovClose();setDeck();listView=true;goRaw('card')};o.querySelector('#dkquiz').onclick=()=>{ovClose();setDeck();goRaw('quiz')}};
// 인출 탭: 형식별 칩(전체·스터디 빈칸·기출형 ㄱㄴ 빈칸·키워드 인출·서답형/서술) + 과목 필터 + 시작 하나
const ICAT=[['all','전체'],['bl','빈칸'],['kw','키워드 인출'],['sq','서답형·서술']];
function itSubj(x){const o=x.t||x.p||x.q||{};return o.cat||''}
function icQ(){const c0=cat;cat='전체';try{return kwPool('w16')}finally{cat=c0}}
function icPool(c,id){id=id||'exam';const sj=DSUBJ.includes(id);const ok=x=>{const s=itSubj(x);return sj?s==id:(s&&sfOk({cat:s}))};const P=dkPool(id).filter(ok),Q=icQ().filter(ok);
 const isSq=x=>x.k=='B'&&x.p&&/서술|비교하|구하시오/.test(x.p.task||'');if(c=='bl')return P.filter(x=>(x.k=='B'&&!isSq(x))||x.k=='W'||x.k=='S'||x.k=='V');if(c=='kw')return P.filter(x=>x.k=='K');if(c=='sq')return [...P.filter(isSq),...Q];
 return [...P.filter(x=>x.k!='K'),...P.filter(x=>x.k=='K'),...Q]}
function icRun(L,title){const sn=kwSeen(),un=L.filter(x=>!sn[kwKey(x)]&&!sn[seenKey(x)]),rest=L.filter(x=>sn[kwKey(x)]||sn[seenKey(x)]);const R=[...shuffle(un),...rest].slice(0,S.kwN||20);R.length?kwRun(R,title):toast('문항이 없어요')}
function icSel(){const a=S.icCats;return Array.isArray(a)&&a.length&&!a.includes('wb')?a:['bl','kw','sq']}
function icUnion(id){const m=new Map();icSel().forEach(c=>icPool(c,id).forEach(x=>{const k=kwKey(x);if(!m.has(k))m.set(k,x)}));return [...m.values()]}
function icLbl(){const a=icSel();return a.length==3?'전체':a.map(k=>ICAT.find(x=>x[0]==k)[1]).join('+')}
function icDeck(id){id=id||'exam';S.lastStart={m:'icdeck',id};try{save()}catch(e){}icRun(icUnion(id),'✏️ 인출 · '+dkName(id)+(icSel().length<3?' · '+icLbl():''))}
function inMenu(){const sel=icSel(),sn=kwSeen();const cnt=k=>{const L=icPool(k);return [L.filter(x=>!sn[kwKey(x)]&&!sn[seenKey(x)]).length,L.length]};
 const o=ov(`<h2>✏️ 인출</h2><div class="icchips">${ICAT.map(([k,l])=>{const [u,n]=cnt(k);return `<button class="icchip ${(k=='all'?sel.length==3:sel.includes(k))?'on':''}" aria-pressed="${k=='all'?sel.length==3:sel.includes(k)}" data-icc="${k}">${l}<small>${u}/${n}</small></button>`}).join('')}</div><div class="sfwrap">${sfBar(()=>{ovClose();inMenu()})}</div><button class="cta" id="ingo">▶ 인출 시작<small>안 푼 것부터 ${S.kwN||20}개</small></button><details class="fold"><summary>더 보기</summary><div class="moremenu"><button class="sbtn" id="inps">📝 지문형 서술(모범답안 비교)</button><button class="sbtn" id="ins2">🎤 서울 2차 연습</button></div></details>`);
 o.querySelectorAll('[data-icc]').forEach(b=>b.onclick=()=>{const k=b.dataset.icc;let a=icSel().slice();if(k=='all')a=['bl','kw','sq'];else{a=a.length==3?[k]:a.includes(k)?a.filter(x=>x!=k):[...a,k]}S.icCats=a.length?a:['bl','kw','sq'];save();ovClose();inMenu()});
 o.querySelector('#ingo').onclick=()=>{ovClose();icDeck('exam')};o.querySelector('#inps').onclick=()=>{ovClose();goRaw('passage')};o.querySelector('#ins2').onclick=()=>{ovClose();s2Menu()}}
(function(){const n=$('#nav');if(n){n.innerHTML='<button data-m="home" class="on"><span class="ic">🏠</span>홈</button><button data-m="deck"><span class="ic">📚</span>단어장</button><button data-m="review"><span class="ic">🔁</span>복습<span class="bdg hide" id="navdue"></span></button><button data-m="inch"><span class="ic">✏️</span>인출</button><button data-m="more"><span class="ic">☰</span>더보기</button>'}
 const g=go;go=function(m){if(m=='inch'||m=='write'){$$('#nav button').forEach(x=>x.classList.toggle('on',x.dataset.m=='inch'));return inMenu()}return g.apply(this,arguments)}})();
// 7일 코스: A=암기, B=암기+인출. 기본 A
passCourse=function(){return LS.get('gv_course','A')=='B'?'B':'A'};
function homeAm(){const st=passStat(),n=S.kwN||20,ts=st.un.filter(x=>x.k=='K'&&sfOk(x.t)).map(x=>x.t);_amNext=homeAm;S.lastStart={m:'amhome'};save();ts.length?amRun(ts.slice(0,n),'📅 오늘 암기'):amRun(amOrder(T.filter(t=>sfOk(t))).slice(0,n),'📅 복습 암기')}
function homeIn(){const st=passStat(),n=S.kwN||20,L=st.un.filter(x=>x.k!='K');L.length?kwRun(L.slice(0,n),'📅 오늘 인출'):icDeck('exam')}
(function(){const _rh=renderHome;renderHome=function(){_rh.apply(this,arguments);const v=$('#v-home');if(!v)return;const s=v.querySelector('.seg');if(s)s.innerHTML=`<button data-course="A" class="${passCourse()=='A'?'on':''}">A 암기</button><button data-course="B" class="${passCourse()=='B'?'on':''}">B 암기+인출</button>`;
 const b=v.querySelector('#passgo');if(b){const nb=b.cloneNode(false);nb.id='amgo';nb.textContent='▶ 단어장 암기 · 오늘 분량';b.replaceWith(nb);nb.onclick=homeAm;if(passCourse()=='B'){const s2=document.createElement('button');s2.className='sbtn sub2';s2.id='ingo2';s2.innerHTML='✏️ 오늘 인출';s2.onclick=homeIn;nb.after(s2)}}}})();
// r34 단어장 범위: 초기 형식 '⭐ 기출 핵심 (364)' / '📚 전체 단어장 (n)'
function amScope(){return S.amScope=='core'?'core':'all'}
function scopeSeg(){const nc=T.filter(t=>t.core).length,na=T.length;return `<div class="seg scope" role="tablist"><button data-scope="core" class="${amScope()=='core'?'on':''}">⭐ 기출 핵심 (${nc})</button><button data-scope="all" class="${amScope()=='all'?'on':''}">📚 전체 단어장 (${na})</button></div>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-scope]');if(!b)return;S.amScope=b.dataset.scope;try{save()}catch(_){}if(document.querySelector('.ov'))ovClose();render()});
(function(){const pa=passAll;passAll=function(){let U=pa.apply(this,arguments);if(passCourse()=='B')U=U.filter(x=>x.k!='K'||!(x.t.arch||x.t.demote)||1);if(amScope()!='core')return U;return U.filter(x=>x.k!='K'||(x.t&&x.t.core))};
 const _rh=renderHome;renderHome=function(){_rh.apply(this,arguments);const v=$('#v-home');const t=v&&v.querySelector('.dktiles');if(t&&!v.querySelector('.scope'))t.insertAdjacentHTML('beforebegin',scopeSeg())}})();
(function(){const dm=dkDeckMenu;dkDeckMenu=function(){dm.apply(this,arguments);const h=document.querySelector('.ov h2');h&&h.insertAdjacentHTML('afterend',scopeSeg())}})();
(function(){const pk=passKey;passKey=function(){const k=pk();return amScope()=='core'?k+'c':k}})();

// 파괴적 작업 확인 모달 (window.confirm 대신, 모바일·PWA 안전). 취소가 기본 포커스, 확인은 빨간색.
function askConfirm(title,lose,okLabel){return new Promise(res=>{const d=document.createElement('div');d.className='cfm';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
 d.innerHTML=`<div class="cfmb"><h3>${esc(title)}</h3>${lose?`<p class="cfml">${esc(lose)}</p>`:''}<div class="cfmr"><button class="cfmc" type="button">취소</button><button class="cfmo" type="button">${esc(okLabel||'확인')}</button></div></div>`;
 const done=v=>{d.remove();document.removeEventListener('keydown',kd,true);res(v)};const kd=e=>{if(e.key=='Escape'){e.preventDefault();e.stopPropagation();done(false)}};
 d.querySelector('.cfmc').onclick=()=>done(false);d.querySelector('.cfmo').onclick=()=>done(true);d.onclick=e=>{if(e.target===d)done(false)};document.addEventListener('keydown',kd,true);
 document.body.appendChild(d);d.querySelector('.cfmc').focus()})}
{const _rl=resumeLast;resumeLast=function(){const l=S.lastStart||{};if(l.m=='icdeck')return icDeck(l.id);if(l.m=='am'&&l.id)return amDeck(l.id);return _rl.apply(this,arguments)}}

;window.__gvStage=26;
// ---- r44 평평한 IA: 메인 → 단어장 → (범위) 과목 → 과목 화면(암기 주 · 인출 보조, 유형·수량은 옵션) ----
// 원칙: analysis/design_principles.md. 한 화면 = 제목 · 진행 한 줄 · 큰 주 버튼 1 · 작은 보조 버튼 ≤1 · 접힌 옵션.
const ISUBJ=DSUBJ;// 모든 화면 공통 10과목(같은 이름·순서)
function scopeOk(t){return amScope()!='core'||t.core}
function amBase2(id){return (id=='all'?T:T.filter(t=>t.cat==id)).filter(scopeOk)}
amTerms=function(id){return amBase2(id)};
function amUn(L){const sn=kwSeen();return L.filter(t=>!sn['T:'+t.term]).length}
function ecItems(sj){let E=[];try{E=ecd()}catch(e){}return E.filter(e=>e.cat==sj).map(e=>({k:'Q',q:{id:'ec:'+e.id,q:(/^kx/.test(e.id)?'다음 설명에 해당하는 개념은? ':'단서어: ')+e.clue,a:e.answer,cat:e.cat,fmt:'kw'}}))}
// 인출 문항: 과목·유형별 단일 함수(모든 화면이 이 값만 사용)
function inPool(id,fmt){fmt=fmt||icSel();const S2=id=='all'?ISUBJ:[id],m=new Map();
 S2.forEach(sj=>fmt.forEach(c=>{let L=icPool(c,sj);if(amScope()=='core')L=L.filter(x=>!x.t||x.t.core);L.forEach(x=>{const k=kwKey(x);if(!m.has(k))m.set(k,x)})}));return [...m.values()]}
function inUn(L){const sn=kwSeen();return L.filter(x=>!sn[kwKey(x)]&&!sn[seenKey(x)]).length}
icUnion=function(id){return inPool(id||'all')};
icDeck=function(id){id=id||'all';if(id=='exam'||id=='core')id='all';S.lastStart={m:'icdeck',id};try{save()}catch(e){}icRun(inPool(id),'✏️ 인출 · '+dkName(id))};
dkName=function(id){return (id=='all'||id=='exam'||id=='core'?'전체 과목':id)+(amScope()=='core'?' · ⭐ 기출 핵심':'')};
const amN=()=>S.amN===0?0:(S.amN||20);
amDeck=function(id){_amNext=()=>amDeck(id);S.lastStart={m:'am',id};try{save()}catch(e){}const L=amOrder(amTerms(id));amRun(amN()?L.slice(0,amN()):L,'📚 '+dkName(id))};
function fmtLbl(){const a=icSel();return a.length==3?'전체 유형':a.map(k=>ICAT.find(x=>x[0]==k)[1]).join('·')}
function back(fn){return `<button class="flback" aria-label="뒤로">‹ 뒤로</button>`}
function bindBack(o,fn){const b=o.querySelector('.flback');b&&(b.onclick=()=>{ovClose();fn()})}
// 1단계: 단어장 = 범위 + 과목 목록 (이름 + 안 본 수 하나)
dkDeckMenu=function(){const L=[['all','전체 과목'],...ISUBJ.map(c=>[c,c])];
 const o=ov(`<h2>단어장</h2>${scopeSeg()}<div class="fllist">${L.map(([id,n])=>{const A=amTerms(id);return `<button class="flrow" data-c="${esc(id)}"><i class="sbub" data-g="${esc(id=="all"?"all":grpOf(id))}">${esc(String(n).replace(/^[^\p{L}]+/u,"").slice(0,1))}</i><span>${esc(n)}</span><span class="small mut">안 본 ${amUn(A)}</span></button>`}).join('')}</div>`);
 o.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{ovClose();dkSheet(b.dataset.c)})};
dkSubjList=dkDeckMenu;
// 2단계: 과목 화면
dkSheet=function(id){if(id=='exam'||id=='core'){S.amScope='core';id='all'}const A=amTerms(id),P=inPool(id),sn=kwSeen(),seen=A.length-amUn(A),pct=A.length?Math.round(seen/A.length*100):0,sel=icSel();
 const o=ov(`${back()}<h2>${esc(dkName(id))}</h2><div class="pbar"><i style="width:${pct}%"></i></div><div class="small mut">${seen}/${A.length}장 (${pct}%)</div>
 <button class="cta" id="dkam">▶ 단어장 암기<small>안 본 카드부터 ${amN()||'전부'}장</small></button>
 <button class="sbtn sub2" id="dkin">✏️ 인출 · ${fmtLbl()} ${P.length}문항</button>
 <details class="fold" id="dkopt"><summary>옵션</summary>
 <div class="optr"><span class="small">단어장 장 수</span><div class="seg" id="amn">${[20,40,0].map(n=>`<button data-n="${n}" class="${amN()==n?'on':''}">${n||'전부'}</button>`).join('')}</div></div>
 <div class="optr"><span class="small">인출 유형</span><div class="icchips">${ICAT.map(([k,l])=>{const on=k=='all'?sel.length==3:sel.length<3&&sel.includes(k);const n=k=='all'?P.length:inPool(id,[k]).length;return `<button class="icchip ${on?'on':''}" aria-pressed="${on}" data-icc="${k}">${l}<small>${n}</small></button>`}).join('')}</div></div>
 <div class="optr"><span class="small">인출 문항 수</span><div class="seg" id="kwn">${[10,20,30,50].map(n=>`<button data-n="${n}" class="${(S.kwN||20)==n?'on':''}">${n}</button>`).join('')}</div></div>
 <div class="optr"><button class="sbtn" id="dklist">🔍 용어 목록·검색</button></div></details>`);
 bindBack(o,dkDeckMenu);const reopen=()=>{ovClose();dkSheet(id);const d=document.querySelector('#dkopt');d&&(d.open=true)};
 o.querySelector('#dkam').onclick=()=>{ovClose();amDeck(id)};o.querySelector('#dkin').onclick=()=>{ovClose();icDeck(id)};
 o.querySelectorAll('#amn [data-n]').forEach(b=>b.onclick=()=>{S.amN=+b.dataset.n;save();reopen()});
 o.querySelectorAll('#kwn [data-n]').forEach(b=>b.onclick=()=>{S.kwN=+b.dataset.n;save();reopen()});
 o.querySelectorAll('[data-icc]').forEach(b=>b.onclick=()=>{const k=b.dataset.icc;let a=icSel().slice();if(k=='all')a=['bl','kw','sq'];else{a=a.length==3?[k]:a.includes(k)?a.filter(x=>x!=k):[...a,k]}S.icCats=a.length?a:['bl','kw','sq'];save();reopen()});
 o.querySelector('#dklist').onclick=()=>{ovClose();deck=amScope()=='core'?'core':'all';cat=id=='all'?'전체':id;sub='전체';try{save()}catch(e){}listView=true;goRaw('card')}};
// 옛 인출 화면·중복 진입점 → 단어장 과목 목록으로
inMenu=dkDeckMenu;try{kwMenu=dkDeckMenu}catch(e){}try{sqMenu=()=>dkDeckMenu()}catch(e){}try{ecMenu=dkDeckMenu}catch(e){}try{ftMenu=dkDeckMenu}catch(e){}
// 하단 탭: 홈 · 단어장 · 복습 · 더보기 (M3: 3~5개)
(function(){const n=$('#nav');if(n)n.innerHTML='<button data-m="home" class="on"><span class="ic">🏠</span>홈</button><button data-m="deck"><span class="ic">📚</span>단어장</button><button data-m="review"><span class="ic">🔁</span>복습<span class="bdg hide" id="navdue"></span></button><button data-m="more"><span class="ic">☰</span>더보기</button>';
 const g=go;go=function(m){if(m=='inch'||m=='write'||m=='mem'){m='deck'}return g.call(this,m)}})();
// 홈: 제목 · 진행 한 줄 · 큰 단어장 버튼 · (진행 중이면) 이어하기 · 접힌 옵션
function lastLbl(){const l=S.lastStart||{};if(l.m=='am'&&l.id)return '📚 '+dkName(l.id)+' 암기';if(l.m=='icdeck'&&l.id)return '✏️ '+dkName(l.id)+' 인출';return ''}
renderHome=function(){const v=$('#v-home');if(!v)return;let st=null;try{st=passStat()}catch(e){}const pct=st&&st.tot?Math.round(st.done/st.tot*100):0,ll=lastLbl();
 v.innerHTML=`<div class="flhome"><div class="tline"><b>📅 오늘 학습</b><span class="small mut">${st?`7일 완주 ${st.done}/${st.tot} (${pct}%) · D-${st.dday} · 오늘 ${st.today}/${st.quota}`:''}</span></div><div class="pbar"><i style="width:${pct}%"></i></div>
 ${ll?`<button class="cta" id="hres">▶ 이어하기<small>${esc(ll)}</small></button><button class="sbtn sub2" id="hdeck">📚 단어장 · 과목 선택</button>`:`<button class="cta" id="hdeck">📚 단어장<small>범위 → 과목 선택</small></button><button class="sbtn sub2" id="amgo">▶ 오늘 분량 암기 ${st?Math.max(0,st.quota-st.today):''}장</button>`}
 <details class="fold"><summary>옵션</summary><div class="optr"><span class="small">범위</span>${scopeSeg()}</div><div class="optr"><span class="small">7일 코스</span><div class="seg"><button data-course="A" class="${passCourse()=='A'?'on':''}">A 암기</button><button data-course="B" class="${passCourse()=='B'?'on':''}">B 암기+인출</button></div></div>${passCourse()=='B'?'<div class="optr"><button class="sbtn" id="ingo2">✏️ 오늘 인출</button></div>':''}<div class="optr"><button class="sbtn" id="passreset">7일 진도 다시 시작</button></div></details></div>`;
 const ag=v.querySelector('#amgo');ag&&(ag.onclick=homeAm);v.querySelector('#hdeck').onclick=()=>go('deck');const r=v.querySelector('#hres');r&&(r.onclick=resumeLast);const i2=v.querySelector('#ingo2');i2&&(i2.onclick=homeIn);
 v.querySelectorAll('[data-course]').forEach(b=>b.onclick=()=>{LS.set('gv_course',b.dataset.course);renderHome()});try{passBind(v)}catch(e){}};
// 더보기: 이름만 있는 목록(같은 기능 중복 진입 없음)
moreMenu=function(){const it=[['stats','📊 통계'],['mock','⏱️ 모의고사'],['ls','🎧 듣기 모드'],['data','⚙️ 설정']];
 const o=ov(`<h2>더보기</h2><div class="fllist">${it.map(([k,l])=>`<button class="flrow" data-mm="${k}"><span>${l}</span><span class="mut">›</span></button>`).join('')}</div>`);
 o.querySelectorAll('[data-mm]').forEach(b=>b.onclick=()=>{ovClose();const k=b.dataset.mm;k=='ls'?lsMenu():k=='mock'?(qmode='mock',S.qmode='mock',qcur=null,goRaw('quiz')):goRaw(k)})};
// 설정·통계 화면: 첫 섹션만 펼치고 나머지는 접힌 옵션으로
(function(){const fold=id=>{const v=$('#v-'+id);if(!v)return;[...v.querySelectorAll(':scope > .box, :scope .box.sec')].forEach((b,i)=>{if(i==0||b.closest('details.flsec'))return;const h=b.querySelector('h2,h3');const d=document.createElement('details');d.className='fold flsec';d.innerHTML=`<summary>${h?esc(h.textContent):'옵션'}</summary>`;b.replaceWith(d);d.appendChild(b);h&&h.remove()})};
 const _rd=renderData;renderData=function(){const r=_rd.apply(this,arguments);try{fold('data')}catch(e){}return r};
 try{const _rs=renderStats;renderStats=function(){const r=_rs.apply(this,arguments);try{fold('stats')}catch(e){}return r}}catch(e){}})();
// r45 거시 유형(analysis/item_taxonomy.md): 저장 문항은 fmt 필드(bl·kw·sq), 단어장 파생 K·V는 kw
function itFmt(x){if(x.k=='K'||x.k=='V')return 'kw';const o=x.p||x.q||{};return o.fmt||(x.k=='S'?'bl':'bl')}
icPool=function(c,id){id=id||'exam';const sj=DSUBJ.includes(id);const ok=x=>{const s=itSubj(x);return sj?s==id:(s&&sfOk({cat:s}))};
 const A=[...dkPool(id).filter(x=>x.k!='K'&&x.k!='V'),...icQ(),...ecd().map(q=>({k:'E',q}))].filter(ok);if(c=='all'||!c)return A;return A.filter(x=>itFmt(x)==c)};
// r46: 과목 필터 UI가 과목 화면으로 통합되어, 남아 있던 전역 과목 필터(gv_sf)가 몰래 범위를 줄이지 않도록 비움
try{if(localStorage.gv_sf&&localStorage.gv_sf!='[]')localStorage.gv_sf='[]'}catch(e){}
;(function(){const P={home:'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',word:'M4 6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM19 7v12a3 3 0 0 1-3 3H8',review:'M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4',more:'M5 12h.01M12 12h.01M19 12h.01'};
const sv=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const go=()=>document.querySelectorAll('#nav button').forEach(b=>{const m=b.dataset.m,k=m=='more'||m=='set'?'more':m=='deck'||m=='word'?'word':m;const i=b.querySelector('.ic');if(P[k]&&i&&!i.querySelector('svg'))i.innerHTML=sv(P[k]).replace('stroke-width="2"',k=='more'?'stroke-width="3"':'stroke-width="2"')});
go();new MutationObserver(go).observe(document.getElementById('nav'),{childList:true,subtree:true})})();
// r50: 7일 코스와 자유 학습 분리. 코스 진도는 코스 세션(homeAm·homeIn)에서 본 카드만 gv_pseen에 기록
var _inCourse=false;
// r72-4: 코스 맥락을 '지금 떠 있는 세트'에 묶음 — 세트 화면(.plin[data-course])이 보이는 동안만 코스 기록. 다른 세트가 ov()로 열리면 표시가 사라져 자동 해제
function inCourse(){try{return !!(_inCourse&&PL.ov&&!PL.ov.classList.contains('hide')&&PL.ov.querySelector(':scope>[data-course]'))}catch(e){return _inCourse}}
function passSeen(){let p=LS.get('gv_pseen',null);if(!p){p=Object.assign({},LS.get('gv_kwseen',{}));LS.set('gv_pseen',p);LS.set('gv_pseen_seed',{date:kstYMD(),n:Object.keys(p).length})}return p}
{const _ks=kwSeen;kwSeen=function(){const o=_ks.apply(this,arguments);if(!inCourse()||!o)return o;return new Proxy(o,{set(t,k,v){t[k]=v;const p=passSeen();if(!p[k]){p[k]=1;LS.set('gv_pseen',p)}return true}})}}
{const _ps=passStat;passStat=function(){const k=kwSeen;passSeen();kwSeen=()=>LS.get('gv_pseen',{});try{return _ps.apply(this,arguments)}finally{kwSeen=k}}}
{const keep=f=>function(){const l=S.lastStart;f.apply(this,arguments);_inCourse=true;try{const c=PL.ov&&PL.ov.firstElementChild;c&&(c.dataset.course='1')}catch(e){}if(l&&l.m!='amhome'){S.lastStart=l;try{save()}catch(e){}}};const a=homeAm;homeAm=keep(a);const b=homeIn;homeIn=keep(b);
 const c=amDeck;amDeck=function(){_inCourse=false;return c.apply(this,arguments)};const d=icDeck;icDeck=function(){_inCourse=false;return d.apply(this,arguments)};
 const e=ovClose;ovClose=function(){_inCourse=false;return e.apply(this,arguments)}}
lastLbl=function(){const l=S.lastStart||{};const nm=id=>String(dkName(id)).replace(/^[^\p{L}\p{N}]+/u,'').replace(/\s*\d+$/,'');const sc=amScope()=='core'?' 기출 핵심':'';if(l.m=='am'&&l.id)return nm(l.id)+sc+' 암기';if(l.m=='icdeck'&&l.id)return nm(l.id)+' 인출';return ''};
renderHome=function(){const v=$('#v-home');if(!v)return;let st=null;try{st=passStat()}catch(e){}const ll=lastLbl(),on=st&&st.tot&&st.done<st.tot,pct=on?Math.round(st.done/st.tot*100):0;
 const left=on?Math.max(0,st.quota-st.today):0;
 let due=0,stk=0;try{due=dueList().length}catch(e){}try{stk=streak()}catch(e){}
 const chips=`<div class="hchips">${due?`<span class="hchip">복습 대기 <b>${due}</b></span>`:''}${stk?`<span class="hchip">연속 <b>${stk}일</b></span>`:''}</div>`;
 const top=on?`<div class="hblk"><div class="hdash"><div class="ring" style="--p:${pct}"><b>${pct}%</b></div><div class="hdt"><div class="small mut">7일 코스 ${passCourse()} · D-${st.dday}</div><div class="hbig">${st.done}<span class="mut">/${st.tot}</span></div><div class="small mut">오늘 ${st.today}/${st.quota}장</div></div></div>
 <button class="cta" id="amgo">▶ 오늘 분량${left?` ${left}장`:' 복습'}</button></div>${chips}
 ${ll?`<button class="flrow hrow" id="hres"><span>이어서 하기 · ${esc(ll)}</span><span class="small">자유 학습</span></button>`:`<button class="flrow hrow" id="hdeck"><span>단어장 · 과목 선택</span><span class="small">자유 학습</span></button>`}`
 :`${ll?`<button class="cta" id="hres">▶ 이어서 하기<small>${esc(ll)}</small></button><button class="sbtn sub2" id="hdeck">단어장 · 과목 선택</button>`:`<button class="cta" id="hdeck">단어장<small>범위 → 과목 선택</small></button>`}${chips}`;
 v.innerHTML=`<div class="flhome">${top}
 <details class="fold"><summary>옵션</summary><div class="optr"><span class="small">범위</span>${scopeSeg()}</div><div class="optr"><span class="small">7일 코스</span><div class="seg"><button data-course="A" class="${passCourse()=='A'?'on':''}">A 암기</button><button data-course="B" class="${passCourse()=='B'?'on':''}">B 암기+인출</button></div></div>${passCourse()=='B'?'<div class="optr"><button class="sbtn" id="ingo2">오늘 인출</button></div>':''}<div class="optr"><button class="sbtn" id="passreset">7일 진도 다시 시작</button></div></details></div>`;
 const ag=v.querySelector('#amgo');ag&&(ag.onclick=homeAm);const hd=v.querySelector('#hdeck');hd&&(hd.onclick=()=>go('deck'));const r=v.querySelector('#hres');r&&(r.onclick=resumeLast);const i2=v.querySelector('#ingo2');i2&&(i2.onclick=homeIn);
 v.querySelectorAll('[data-course]').forEach(b=>b.onclick=()=>{LS.set('gv_course',b.dataset.course);renderHome()});try{passBind(v)}catch(e){}};
// r52: 복습 화면도 평평하게. 범위·과목 칩은 접힌 '옵션' 안으로 옮기고, 설명 문구는 숨김. 다른 화면으로 가면 원래 자리로 돌려놓음
{const _r=render;let home=null;render=function(){const r=_r.apply(this,arguments);try{const f=$('#filters');if(!f)return r;if(!home)home={p:f.parentNode,n:f.nextSibling};const v=$('#v-review');
 if(mode=='review'&&v){let d=v.querySelector('#rvopt');if(!d){d=document.createElement('details');d.id='rvopt';d.className='fold';d.innerHTML='<summary>옵션</summary>';v.appendChild(d)}if(f.parentNode!==d)d.appendChild(f);
  if(!v.querySelector('.rvt')){v.insertAdjacentHTML('afterbegin','<h2 class="rvt">복습</h2>')}}
 else if(f.parentNode!==home.p)home.p.insertBefore(f,home.n&&home.n.parentNode===home.p?home.n:null)}catch(e){}return r}}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{[['stats','통계'],['data','설정']].forEach(([m,t])=>{const v=$('#v-'+m);if(mode==m&&v&&!v.querySelector(':scope>.rvt'))v.insertAdjacentHTML('afterbegin',`<h2 class="rvt">${t}</h2>`);if(m=='stats'&&v){const b=v.querySelector('.box button');b&&/취약 분석/.test(b.textContent)&&(b.textContent='취약 분석 열기')}})}catch(e){}return r}}
// r56-1: 7일 코스 진도 초기화(1회 마이그레이션). 자유 학습 기록(gv_kwseen·오답)은 그대로, 코스 기록만 새로 시작. 이전 코스 기록은 *_old로 보관
function pMig(){try{if(LS.get('gv_pseen_v',0)<2){const o=LS.get('gv_pseen',null);if(o)LS.set('gv_pseen_old',o);LS.set('gv_pseen',{});['gv_pass','gv_passA'].forEach(k=>{const p=LS.get(k,null);if(p)LS.set(k+'_old',p);LS.set(k,{start:kstYMD(),days:(p&&p.days)||7,cd:0})});LS.set('gv_pseen_v',2)}}catch(e){}}
passSeen=function(){pMig();let p=LS.get('gv_pseen',null);if(!p){p={};LS.set('gv_pseen',p)}return p};
// r56-2: 이월 — 일차(cd)는 그날 분량을 다 끝냈을 때만 넘어감(달력 기준 아님). 못 끝낸 날은 다음 날 그대로 이어함
passStat=function(){pMig();const K=passKey(),p=passGet(),U=passAll(),sn=passSeen(),td=kstYMD(),days=p.days||7;
 const un=U.filter(x=>!sn[seenKey(x)]),tot=U.length,done=tot-un.length;if(p.cd==null)p.cd=0;
 const mk=()=>({day:p.cd,quota:Math.ceil(un.length/Math.max(1,days-p.cd)),base:done,from:td});
 if(!p.dd||p.dd.day!=p.cd)p.dd=mk();
 let today=Math.max(0,done-p.dd.base);
 if(p.dd.quota>0&&today>=p.dd.quota){if(!p.dd.fin)p.dd.fin=td;if(p.dd.fin<td&&p.cd<days-1){p.cd++;p.dd=mk();today=0}}
 LS.set(K,p);const need=Math.max(0,p.dd.quota-today),carry=!p.dd.fin&&p.dd.from<td;
 const bys={};U.forEach(x=>{const s=passSubj(x),o=bys[s]||(bys[s]={n:0,d:0});o.n++;if(sn[seenKey(x)])o.d++});
 return {p,U,un,tot,done,left:Math.max(1,days-p.cd),dday:Math.max(0,days-p.cd),day:p.cd+1,days,carry,fin:!!p.dd.fin,quota:p.dd.quota,today,need,bys,course:passCourse()}};
{const _rh=renderHome;renderHome=function(){const r=_rh.apply(this,arguments);try{const st=passStat(),v=$('#v-home');if(v&&st.tot){const m=v.querySelector('.hdt .small.mut');if(m)m.textContent=`7일 코스 ${passCourse()} · Day ${st.day}/${st.days}`;const g=v.querySelector('#amgo');if(g)g.textContent=st.carry?`▶ Day ${st.day} 이어하기 · ${st.need}장`:st.fin?`Day ${st.day} 완료 · 더 하기`:`▶ Day ${st.day} 오늘 분량 ${st.need}장`;const ps=v.querySelector('#passreset');ps&&(ps.onclick=async()=>{if(await askConfirm('7일 코스를 Day 1부터 다시 시작할까요?','코스 진도만 0으로 돌아가요. 자유 학습 기록과 오답은 그대로예요.','다시 시작')){LS.set('gv_pseen',{});LS.set(passKey(),{start:kstYMD(),days:7,cd:0});renderHome()}})}}catch(e){}return r}}
// r56-3: 강조 색(진녹색) 선택 — 기존 파랑이 기본. gv_accent에 저장, data-accent 속성, theme-color 메타 갱신
{const acApply=()=>{const a=localStorage.getItem('gv_accent')=='green'?'green':'';if(a)document.documentElement.dataset.accent=a;else delete document.documentElement.dataset.accent;document.querySelectorAll('meta[name=theme-color]').forEach(m=>m.content=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#f4f6fb')};
 const _ta=window.thApply;if(_ta)window.thApply=function(){_ta.apply(this,arguments);acApply()};acApply();window.acApply=acApply;
 const _rd2=renderData;renderData=function(){const r=_rd2.apply(this,arguments);try{const v=$('#v-data');if(v&&!v.querySelector('#acseg')){const cur=localStorage.getItem('gv_accent')=='green'?'green':'blue';const d=document.createElement('div');d.className='optr acrow';d.innerHTML=`<span class="small">강조 색</span><div class="seg" id="acseg"><button data-ac="blue" class="${cur=='blue'?'on':''}">기본 파랑</button><button data-ac="green" class="${cur=='green'?'on':''}">진녹색</button></div>`;const h=v.querySelector('h2');h?h.after(d):v.prepend(d);d.querySelectorAll('[data-ac]').forEach(b=>b.onclick=()=>{localStorage.setItem('gv_accent',b.dataset.ac);acApply();d.querySelectorAll('[data-ac]').forEach(x=>x.classList.toggle('on',x===b))})}}catch(e){}return r}}

// ===== r57: Lets Icons (Leonid Tsvetkov, CC BY 4.0) 인라인 SVG, currentColor =====
const LI={"home": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M5 12.76c0-1.358 0-2.037.274-2.634c.275-.597.79-1.038 1.821-1.922l1-.857C9.96 5.75 10.89 4.95 12 4.95s2.041.799 3.905 2.396l1 .857c1.03.884 1.546 1.325 1.82 1.922c.275.597.275 1.276.275 2.634V17c0 1.886 0 2.828-.586 3.414S16.886 21 15 21H9c-1.886 0-2.828 0-3.414-.586S5 18.886 5 17z\"/><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M14.5 21v-5a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v5\"/></g>", "word": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M20 12v5c0 1.886 0 2.828-.586 3.414S17.886 21 16 21H6.5A2.5 2.5 0 0 1 4 18.5M20 12V7c0-1.886 0-2.828-.586-3.414S17.886 3 16 3H8c-1.886 0-2.828 0-3.414.586S4 5.114 4 7v11.5M20 12c0 1.886 0 2.828-.586 3.414S17.886 16 16 16H6.5A2.5 2.5 0 0 0 4 18.5\"/><path stroke-linecap=\"round\" d=\"M9 8h6\"/></g>", "review": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"m14 15l-4 4l4 4\"/><path stroke-linecap=\"round\" d=\"M5.938 15.5A7 7 0 1 1 12 19\"/></g>", "more": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"6\" cy=\"12\" r=\"1\"/><circle cx=\"18\" cy=\"12\" r=\"1\"/></g>", "close": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M18 6L6 18M6 6l12 12\"/>", "back": "<path fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" d=\"m15 6l-6 6l6 6\"/>", "right": "<path fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" d=\"m9 6l6 6l-6 6\"/>", "down": "<path fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" d=\"m18 9l-6 6l-6-6\"/>", "play": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M16.211 11.106L9.737 7.868A1.2 1.2 0 0 0 8 8.942v6.116a1.2 1.2 0 0 0 1.737 1.074l6.474-3.238a1 1 0 0 0 0-1.788\"/>", "chart": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M8 10v6m4-4v4m4-8v8\"/><rect width=\"18\" height=\"16\" x=\"3\" y=\"4\" rx=\"2\"/></g>", "set": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M3.082 13.945c-.529-.95-.793-1.426-.793-1.945s.264-.994.793-1.944L4.43 7.63l1.426-2.381c.559-.933.838-1.4 1.287-1.66c.45-.259.993-.267 2.08-.285L12 3.26l2.775.044c1.088.018 1.631.026 2.08.286s.73.726 1.288 1.659L19.57 7.63l1.35 2.426c.528.95.792 1.425.792 1.944s-.264.994-.793 1.944L19.57 16.37l-1.426 2.381c-.559.933-.838 1.4-1.287 1.66c-.45.259-.993.267-2.08.285L12 20.74l-2.775-.044c-1.088-.018-1.631-.026-2.08-.286s-.73-.726-1.288-1.659L4.43 16.37z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></g>", "sound": "<path fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" d=\"M13 14H8.818a3.249 3.249 0 1 0 .403 6.472l.557-.07A3.68 3.68 0 0 0 13 16.754V7.39c0-1.619 0-2.428.474-2.987s1.272-.693 2.868-.96L18.7 3.05c.136-.022.204-.034.24.006s.02.106-.013.24l-.895 3.581c-.015.06-.023.09-.044.11s-.05.026-.111.038L13 8\"/>", "ok": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m8 12l3 3l5-6\"/></g>", "no": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M18 6L6 18M6 6l12 12\"/>", "edit": "<mask id=\"SVGxtBLacqF\" width=\"17\" height=\"17\" x=\"3\" y=\"4\" fill=\"#000\" maskUnits=\"userSpaceOnUse\"><path fill=\"#fff\" d=\"M3 4h17v17H3z\"/><path d=\"m13.586 7.414l-7.194 7.194c-.195.195-.292.292-.36.41c-.066.119-.1.252-.166.52l-.664 2.654c-.09.36-.135.541-.035.641s.28.055.641-.035l2.655-.664c.267-.066.4-.1.518-.167c.119-.067.216-.164.41-.359l7.195-7.194c.667-.666 1-1 1-1.414s-.333-.748-1-1.414l-.172-.172c-.667-.666-1-1-1.414-1s-.748.334-1.414 1\"/></mask><g fill=\"none\"><path stroke=\"currentColor\" stroke-width=\"4\" d=\"m13.586 7.414l-7.194 7.194c-.195.195-.292.292-.36.41c-.066.119-.1.252-.166.52l-.664 2.654c-.09.36-.135.541-.035.641s.28.055.641-.035l2.655-.664c.267-.066.4-.1.518-.167c.119-.067.216-.164.41-.359l7.195-7.194c.667-.666 1-1 1-1.414s-.333-.748-1-1.414l-.172-.172c-.667-.666-1-1-1.414-1s-.748.334-1.414 1Z\" mask=\"url(#SVGxtBLacqF)\"/><path fill=\"currentColor\" d=\"m12.5 7.5l3-2l3 3l-2 3z\"/></g>", "sun": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path stroke-linecap=\"round\" d=\"M12 5V3m0 18v-2m4.95-11.95l1.414-1.414M5.636 18.364L7.05 16.95M19 12h2M3 12h2m11.95 4.95l1.414 1.414M5.636 5.636L7.05 7.05\"/></g>", "moon": "<path fill=\"currentColor\" d=\"m16.164 18.51l.872-.49zm-.586 1.448L15.292 19zm-.14-13.709l.696.719zm.726-.76l.872.49zm-.586-1.447L15.292 5zM14 12c0-1.975.817-3.758 2.134-5.032l-1.39-1.438A8.98 8.98 0 0 0 12 12zm2.134 5.032A6.98 6.98 0 0 1 14 12h-2a8.98 8.98 0 0 0 2.744 6.47zM15 19a7 7 0 0 1-7-7H6a9 9 0 0 0 9 9zm-7-7a7 7 0 0 1 7-7V3a9 9 0 0 0-9 9zm6.744 6.47c.222.215.372.36.477.468l.096.104c.019.022 0 .004-.025-.042l1.744-.98a2.4 2.4 0 0 0-.381-.476c-.131-.135-.308-.306-.52-.512zM15 21c.236 0 .552.01.864-.084L15.292 19c.028-.008.039-.006-.004-.004A6 6 0 0 1 15 19zm.292-2l.572 1.916a2 2 0 0 0 1.172-2.896zm.842-12.032c.213-.206.39-.377.52-.512c.112-.114.273-.284.382-.476L15.292 5c.026-.046.044-.064.025-.041a2 2 0 0 1-.096.103c-.105.108-.255.253-.477.468zM15 5c.157 0 .233 0 .288.004c.043.002.032.004.004-.004l.572-1.916C15.552 2.99 15.236 3 15 3zm2.036.98a2 2 0 0 0-1.172-2.896L15.292 5z\"/>", "desk": "<defs><path id=\"SVGzgdBobCE\" d=\"M3 8c0-1.886 0-2.828.586-3.414S5.114 4 7 4h10c1.886 0 2.828 0 3.414.586S21 6.114 21 8v9H3z\"/></defs><mask id=\"SVGtNCHMdjs\" fill=\"#fff\"><use href=\"#SVGzgdBobCE\"/></mask><mask id=\"SVGdDu8ikNp\" width=\"22\" height=\"6\" x=\"1\" y=\"15\" fill=\"#000\" maskUnits=\"userSpaceOnUse\"><path fill=\"#fff\" d=\"M1 15h22v6H1z\"/><path d=\"M3 17.667c0-.369.298-.667.667-.667h16.666c.369 0 .667.299.667.667c0 .736-.597 1.333-1.333 1.333H4.333A1.333 1.333 0 0 1 3 17.667\"/></mask><g fill=\"none\" stroke=\"currentColor\" stroke-width=\"4\"><use href=\"#SVGzgdBobCE\" mask=\"url(#SVGtNCHMdjs)\"/><path d=\"M3 17.667c0-.369.298-.667.667-.667h16.666c.369 0 .667.299.667.667c0 .736-.597 1.333-1.333 1.333H4.333A1.333 1.333 0 0 1 3 17.667Z\" mask=\"url(#SVGdDu8ikNp)\"/></g>", "search": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path stroke-linecap=\"round\" d=\"m20 20l-3-3\"/></g>", "user": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-width=\"2\"><path d=\"M19.727 20.447c-.455-1.276-1.46-2.403-2.857-3.207S13.761 16 12 16s-3.473.436-4.87 1.24s-2.402 1.931-2.857 3.207\"/><circle cx=\"12\" cy=\"8\" r=\"4\"/></g>"};
function lic(k,c){return LI[k]?'<svg class="li '+(c||'')+'" viewBox="0 0 24 24" aria-hidden="true">'+LI[k]+'</svg>':''}
;(function(){const NM={home:'home',deck:'word',word:'word',review:'review',more:'more',set:'more'},TH={'🖥️':'desk','🖥':'desk','☀️':'sun','☀':'sun','🌙':'moon','📜':'word'};
const pre=(sel,re,k)=>document.querySelectorAll(sel).forEach(b=>{if(b.querySelector(':scope>svg.li.lead'))return;const w=document.createTreeWalker(b,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(re.test(n.nodeValue)){n.nodeValue=n.nodeValue.replace(re,'');b.insertAdjacentHTML('afterbegin',lic(k,'lead'));return}}});
let busy=0;const fix=()=>{busy=1;try{
document.querySelectorAll('#nav button').forEach(b=>{const k=NM[b.dataset.m],i=b.querySelector('.ic');if(k&&i&&!i.querySelector('svg.li'))i.innerHTML=lic(k)});
document.querySelectorAll('.plx').forEach(b=>{if(!b.querySelector('svg.li')){b.innerHTML=lic('close');b.setAttribute('aria-label','닫기')}});
document.querySelectorAll('.flback').forEach(b=>{if(!b.querySelector('svg.li')&&/‹/.test(b.textContent)){const t=b.textContent.replace(/^\s*‹\s*/,'');b.innerHTML=lic('back')+'<span>'+t+'</span>'}});
const th=document.getElementById('theme');if(th){const t=th.textContent.trim();if(TH[t]){th.dataset.e=t;th.innerHTML=lic(TH[t])}}
pre('.cta',/^\s*▶\s*/,'play');pre('#amn',/^\s*[✗✕×]\s*/,'no');pre('#amy',/^\s*✓\s*/,'ok');pre('#dkin',/^\s*✏️?\s*/,'edit');pre('#auset',/^\s*🎧\s*/,'sound');
}finally{busy=0}};
let q=0;const sch=()=>{if(busy||q)return;q=1;requestAnimationFrame(()=>{q=0;fix()})};
fix();new MutationObserver(sch).observe(document.body,{childList:true,subtree:true,characterData:true});
const ft=()=>{const v=document.getElementById('v-data');if(v&&!document.getElementById('licred')){v.insertAdjacentHTML('beforeend','<p id="licred" class="mut" style="font-size:12px;margin:24px 4px 8px">아이콘: <a href="https://icon-sets.iconify.design/lets-icons/" target="_blank" rel="noopener">Lets Icons</a> by Leonid Tsvetkov, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a></p>')}};ft();setTimeout(ft,1500)})();
// r57b: 앱바 스크롤 상태(멈춤: 구분선 없음, 스크롤: 구분선+블러)
;(function(){const h=document.querySelector('header');if(!h)return;const f=()=>h.classList.toggle('scr',scrollY>4);addEventListener('scroll',f,{passive:true});f()})();
// ===== r65: 같은 계정의 여러 설치(iOS 홈 화면 앱별 저장소) 수렴 — 코스·진도·이어하기 동기화, 대기 표시 해소, 새 버전 감지 =====
setTimeout(function(){try{
 ['gv_pseen','gv_pseen_v','gv_pseen_old','gv_pass_old','gv_passA_old','gv_smeta'].forEach(k=>{if(!PKEYS.includes(k))PKEYS.push(k)});
 // 변경 시각 기록: 코스 선택·범위·마지막 학습 위치
 const set1=LS.set;let lastSig=null;const sig=()=>JSON.stringify([S.lastStart||null,S.amScope||null]);
 LS.set=function(k,v){const r=set1.apply(this,arguments);try{if(k=='gv_course'){const m=LS.get('gv_smeta',{});m.course=Date.now();set1('gv_smeta',m)}
  else if(k=='gv_set'){const g=sig();if(lastSig!==null&&g!==lastSig){const m=LS.get('gv_smeta',{});m.last=Date.now();set1('gv_smeta',m)}lastSig=g}}catch(e){}return r};
 lastSig=sig();
 const prog=p=>p?((+p.cd||0)*1e4+((p.dd&&p.dd.day)||0)*10+(p.dd&&p.dd.fin?1:0)):-1;
 const mi=mergeIn;mergeIn=function(o){const before={course:LS.get('gv_course',null),pass:LS.get('gv_pass',null),passA:LS.get('gv_passA',null),pseen:LS.get('gv_pseen',null),pv:LS.get('gv_pseen_v',0),S:{lastStart:S.lastStart,amScope:S.amScope}};
  mi.apply(this,arguments);
  // 원본 mergeIn이 덮어쓴 진도 객체를 되돌린 뒤 '더 많이 진행한 쪽'을 고름(기록 손실 방지)
  if(before.pass)LS.set('gv_pass',before.pass);if(before.passA)LS.set('gv_passA',before.passA);
  const lm=LS.get('gv_smeta',{}),rm=o.gv_smeta||{};
  ['gv_pass','gv_passA'].forEach(k=>{const a=LS.get(k,null),b=o[k];if(b&&typeof b=='object'&&prog(b)>prog(a))LS.set(k,b)});
  {const a=Object.assign({},LS.get('gv_pseen',{})),b=o.gv_pseen||{};let ch=0;for(const k in b)if(!a[k]){a[k]=b[k];ch=1}if(ch||!LS.get('gv_pseen',null))LS.set('gv_pseen',a)}
  if((+o.gv_pseen_v||0)>(+LS.get('gv_pseen_v',0)))LS.set('gv_pseen_v',+o.gv_pseen_v);
  ['gv_pseen_old','gv_pass_old','gv_passA_old'].forEach(k=>{if(o[k]&&!LS.get(k,null))LS.set(k,o[k])});
  // 코스: 나중에 바꾼 쪽, 시각 정보가 없으면 더 많이 진행한 코스
  if(o.gv_course&&o.gv_course!=before.course){const rc=rm.course||0,lc=lm.course||0;let take=rc>lc;
   if(!rc&&!lc){const pk=c=>c=='A'?'gv_passA':'gv_pass';take=prog(LS.get(pk(o.gv_course),null))>=prog(LS.get(pk(before.course||'A'),null))}
   if(take){LS.set('gv_course',o.gv_course);const m=LS.get('gv_smeta',{});m.course=rc||Date.now();set1('gv_smeta',m)}}
  // 이어하기 위치·범위
  const rs=o.gv_set||{};if((rm.last||0)>(lm.last||0)||(!before.S.lastStart&&rs.lastStart)){if(rs.lastStart)S.lastStart=rs.lastStart;if(rs.amScope)S.amScope=rs.amScope;const m=LS.get('gv_smeta',{});m.last=rm.last||Date.now();set1('gv_smeta',m);lastSig=sig()}
  try{save()}catch(e){}};
 // 자동 저장 후 칩 갱신·실패 표시(예전엔 5초 뒤 업로드가 끝나도 '동기화 대기'가 남음)
 const cp=cloudPush;cloudPush=function(force){const r=cp.apply(this,arguments);if(r&&r.then)return r.then(v=>{if(/너무 커서/.test(CL.syncMsg||'')){CL.dirty=true}else if(CL.user){CL.syncMsg='✅ 동기화됨'}try{chipUI()}catch(e){}return v},e=>{CL.dirty=true;CL.syncMsg='⚠️ 동기화 실패: '+(e&&e.code||'');try{chipUI()}catch(_){}throw e});return r};
 // 다시 열 때(홈 화면 앱은 새로 고침 없이 재개됨) 클라우드에서 받아 합치고 올림
 let lastPull=0;window.cloudPull=async function(){if(!fb||!CL.user||Date.now()-lastPull<20000)return;lastPull=Date.now();try{const {F}=fb;const s=await F.getDoc(F.doc(fb.db,'beta_users',CL.user.uid));if(s.exists()){const d=s.data();if(d.p)mergeIn(JSON.parse(d.p))}await cloudPush(true);try{render()}catch(e){}}catch(e){CL.syncMsg='⚠️ 동기화 실패: '+(e.code||'');try{chipUI()}catch(_){}}};
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState=='visible'){cloudPull();verCheck()}});
 // 새 버전 감지: 열려 있는 옛 빌드도 서버 sw.js 버전과 비교해 갱신
 window.verCheck=async function(){try{const t=await (await fetch('sw.js?nc='+Date.now(),{cache:'no-store'})).text();const m=t.match(/VER='([^']+)'/);const ks=await caches.keys(),cur=(ks.find(k=>/^gvb-v/.test(k))||'').slice(4);if(m&&cur&&m[1]!==cur&&sessionStorage.getItem('gv_vchk')!==m[1]){sessionStorage.setItem('gv_vchk',m[1]);const r=await navigator.serviceWorker.getRegistration();if(r)await r.update();if(!document.querySelector('.amcard,#plov:not(:empty)'))location.reload();else toast('새 버전이 있어요 — 학습을 마치면 자동으로 적용돼요')}}catch(e){}};
 setTimeout(verCheck,4000);
}catch(e){console.warn('r65',e)}},0);

;window.__gvStage=27;
// r68: 반대 모드(뜻 → 단어). 별도 데이터(data_reverse.json)·별도 기록(gv_rev). 홈 진도·코스·7일 코스·SRS와 무관.
var REV=(()=>{try{return JSON.parse(document.getElementById('revd').textContent).items||[]}catch(e){return []}})();
function revSt(){return LS.get('gv_rev',{})||{}}
function revTerm(x){return (typeof TM!='undefined'&&TM.get(x.t))||T.find(t=>t.term==x.t)}
function revPool(){return REV.filter(x=>revTerm(x))}
function revCnt(){const st=revSt(),P=revPool();let ok=0,hd=0,un=0;P.forEach(x=>{const r=st[x.t];if(!r)un++;else if(r.g)ok++;else hd++});return {n:P.length,ok,hd,un}}
function revOrder(){const st=revSt(),P=revPool();const un=shuffle(P.filter(x=>!st[x.t])),hd=P.filter(x=>st[x.t]&&!st[x.t].g).sort((a,b)=>st[a.t].at-st[b.t].at),ok=P.filter(x=>st[x.t]&&st[x.t].g).sort((a,b)=>st[a.t].at-st[b.t].at);return [...hd,...un,...ok]}
function revRun(){const L=revOrder().slice(0,S.kwN||20).map(x=>({x}));if(!L.length){toast('카드가 없어요');return}let i=0,ok=0,bad=0;const done=new Set();
 S.lastStart={m:'rev'};try{save()}catch(e){}
 const o=ov('<div id="am"></div>');o.classList.add('amov');const box=o.querySelector('#am');
 const fin=()=>{const p=done.size?Math.round(ok/done.size*100):0;box.innerHTML=`<div class="rescard"><div class="ring" style="--p:${p};margin:0 auto 14px"><b>${p}%</b></div><div class="big">${done.size}장</div><div class="mut">외웠어요 ${ok} · 헷갈려요 ${bad}</div></div><button class="cta" id="amnx">다음 세트</button><button class="sbtn" id="amx">닫기</button>`;box.querySelector('#amx').onclick=ovClose;box.querySelector('#amnx').onclick=()=>{ovClose();revRun()};box._k=e=>{if(e.key=='Enter'||e.key==' '){e.preventDefault();box.querySelector('#amnx').click()}}};
 const kh=e=>{if(!document.body.contains(box)){document.removeEventListener('keydown',kh);return}if(e.target.closest&&e.target.closest('input,textarea'))return;box._k&&box._k(e)};document.addEventListener('keydown',kh);
 const show=()=>{if(i>=L.length)return fin();const x=L[i].x,t=revTerm(x);
  box.innerHTML=`<div class="amtop"><div class="pbar"><i style="width:${i/L.length*100}%"></i></div><span class="small mut">${i+1}/${L.length}</span></div>
  <div class="amcard revc" id="amc"><div class="amf"><div class="small amcat">반대 모드 · ${esc(t.cat)}</div><div class="amdef revq">${esc(x.d)}</div>${x.k?`<div class="ambx"><b>키워드</b> ${esc(x.k)}</div>`:''}<div class="small mut amhint">어떤 용어일까요? 탭해서 확인</div></div>
  <div class="amb hide"><div class="small amcat">${esc(t.cat)}</div><div class="amterm2">${esc(t.term)}</div>${t.en?`<div class="small mut">${esc(t.en)}</div>`:''}<div class="amdef">${esc(x.d)}</div></div></div>
  <div class="ambtn"><button class="sbtn bad" id="amn">헷갈려요</button><button class="sbtn ok" id="amy">외웠어요</button></div>`;
  const c=box.querySelector('#amc'),flip=()=>{c.querySelector('.amf').classList.toggle('hide');c.querySelector('.amb').classList.toggle('hide')};c.onclick=flip;
  const grade=g=>{if(!L[i].rq){const st=revSt(),r=st[x.t]||{n:0};st[x.t]={g:g?1:0,n:(r.n||0)+1,at:Date.now()};LS.set('gv_rev',st);done.add(x.t);g?ok++:bad++;if(!g)L.splice(Math.min(L.length,i+4),0,{x,rq:1})}i++;show()};
  box.querySelector('#amy').onclick=()=>grade(1);box.querySelector('#amn').onclick=()=>grade(0);
  box._k=e=>{if(e.key==' '||e.key=='Enter'){e.preventDefault();flip()}else if(e.key=='ArrowRight'||e.key=='j')grade(1);else if(e.key=='ArrowLeft'||e.key=='f')grade(0)};
  let x0=null;c.addEventListener('touchstart',e=>x0=e.touches[0].clientX,{passive:true});c.addEventListener('touchend',e=>{if(x0==null)return;const d=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(d)>70){e.preventDefault();grade(d>0?1:0)}})};
 show()}
function revRow(){const c=revCnt();return `<button class="flrow revrow" id="revgo"><i class="sbub" data-g="all">뜻</i><span>뜻 보고 단어 떠올리기 <span class="small mut">(반대 모드)</span></span><span class="small mut">${c.n}장 · 외움 ${c.ok} · 헷갈림 ${c.hd}</span></button>`}
{const _dm=dkDeckMenu;dkDeckMenu=function(){_dm.apply(this,arguments);const l=[...document.querySelectorAll('.fllist')].pop();if(l&&REV.length&&!(PL.ov&&PL.ov.querySelector('#revgo'))){document.querySelectorAll('#revgo').forEach(e=>{const f=e.closest('.fllist');if(f&&f.previousElementSibling&&f.previousElementSibling.tagName=='H3')f.previousElementSibling.remove();(f||e).remove()});l.insertAdjacentHTML('afterend',`<h3 class="small mut">다른 방식</h3><div class="fllist">${revRow()}</div>`);document.getElementById('revgo').onclick=()=>{ovClose();revRun()}}}}
{const _rl=resumeLast;resumeLast=function(){const l=S.lastStart||{};if(l.m=='rev')return revRun();return _rl.apply(this,arguments)}}
// 동기화: 별도 키 gv_rev, 카드별로 나중 기록(at)이 이김
setTimeout(()=>{try{if(!PKEYS.includes('gv_rev'))PKEYS.push('gv_rev')}catch(e){}},0);
{const _mi=mergeIn;mergeIn=function(o){const loc=revSt();const r=_mi.apply(this,arguments);try{const rem=(o&&o.gv_rev)||{},m=Object.assign({},loc);for(const k in rem){const a=m[k],b=rem[k];if(!b)continue;if(!a||(b.at||0)>(a.at||0))m[k]=Object.assign({},b,{n:Math.max(b.n||0,(a&&a.n)||0)});else m[k]=Object.assign({},a,{n:Math.max(a.n||0,b.n||0)})}LS.set('gv_rev',m)}catch(e){}return r}}

// r72-1·2: 7일 코스 미학습 목록 순서 — 종류·과목 비율대로 고르게 섞음(결정적: 전체 목록 안 순번/과목 수). 순서만 바꾸고 진도(gv_pseen·gv_pass*)는 그대로
{const _ps=passStat;passStat=function(){const st=_ps.apply(this,arguments);try{if(!st||!st.U||!st.un)return st;
 const ck=x=>(x.k||'')+'|'+((x.t&&x.t.cat)||(x.p&&x.p.cat)||(x.q&&x.q.cat)||passSubj(x)||'');const n={},r=new Map();
 st.U.forEach(x=>{const c=ck(x);r.set(x,n[c]=(n[c]||0)+1)});
 let un=st.un.map((x,i)=>[x,(r.get(x)-0.5)/n[ck(x)],i]).sort((a,b)=>a[1]-b[1]||a[2]-b[2]).map(a=>a[0]);
 // 코스 B: 오늘 분량 안에 용어 카드가 있으면, 그 용어가 정답인 인출 문항은 다음 날로 미룸
 if(st.course=='B'&&st.need>0){const q=st.need,ans=x=>{const b=(x.p&&x.p.blanks)||(x.q&&x.q.blanks)||[];return b.flatMap(y=>[].concat(typeof y=='string'?y:(y.a||[])))};
  const _t0=performance.now(),_ok=()=>performance.now()-_t0<80;const td=new Set(un.slice(0,q).filter(x=>x.k=='K'&&x.t).map(x=>x.t.term)),h=[],d=[];
  un.forEach(x=>{if(h.length>=q)return d.push(x);if(x.k!='K'&&ans(x).some(v=>td.has(v)))return d.push(x);if(x.k=='K'&&x.t)td.add(x.t.term);h.push(x)});for(let g=0;g<3&&_ok();g++){const kt=new Set(h.filter(x=>x.k=='K').map(x=>x.t.term)),bad=h.filter(x=>x.k!='K'&&ans(x).some(v=>kt.has(v)));if(!bad.length)break;bad.forEach(x=>{h.splice(h.indexOf(x),1);d.push(x)});
   for(let j=0;j<d.length&&h.length<q&&(j&63||_ok());j++){const x=d[j];if(x.k=='K'||!ans(x).some(v=>kt.has(v))){h.push(x);d.splice(j--,1)}}}un=[...h,...d]}
 st.un=un}catch(e){}return st}}

// r77: 헷갈려요(중간 단계) — 아직 못 외움. 헷갈려요 표시(marks=bad)로 기존 헷갈려요 목록·통계와 같은 기준, SRS는 '어려움'(2): 몰라요(10분)보다 늦고 알아요보다 빨리 다시 나옴. 오답노트엔 넣지 않음
function gvHard(term,src){try{const a=acc[term]||(acc[term]={c:0,n:0,s:0});a.n++;a.s=0;const h=H();h.n++;try{snap&&snap([term])}catch(e){}marks[term]='bad';srs[term]=sched(srs[term],2);{const c=srs[term],n=Date.now();if(c&&c.due>n)c.due=n+Math.max(36e5,(c.due-n)/2)}try{actItem&&ACT&&ACT.cur&&actItem('T:'+term,false,'')}catch(e){}}catch(e){}}

;window.__gvStage=28;
// r82: 원리 카드 — 현상·질문(앞) → 인과 설명·키워드(뒤). 별도 데이터(data_principles.json)·별도 기록(gv_prc). 단어장 진도·SRS와 무관
var PRC=(()=>{try{return JSON.parse(document.getElementById('prcd').textContent).items||[]}catch(e){return []}})();
function prcSt(){return LS.get('gv_prc',{})||{}}
function prcFs(){const o=[];PRC.forEach(x=>{if(!o.includes(x.f))o.push(x.f)});return o}
function prcPool(){const f=S.prcF||'all';return PRC.filter(x=>f=='all'||x.f==f)}
function prcCnt(P){P=P||prcPool();const st=prcSt(),n=Date.now();let ok=0,hd=0,un=0,due=0;P.forEach(x=>{const r=st[x.id];if(!r)un++;else{r.g==2?ok++:hd++;if(r.c&&r.c.due<=n)due++}});return {n:P.length,ok,hd,un,due}}
function prcOrder(){const st=prcSt(),P=prcPool(),n=Date.now(),d=x=>(st[x.id].c&&st[x.id].c.due)||0;
 const hd=P.filter(x=>st[x.id]&&st[x.id].g<2).sort((a,b)=>st[a.id].g-st[b.id].g||d(a)-d(b)),un=P.filter(x=>!st[x.id]),okd=P.filter(x=>st[x.id]&&st[x.id].g==2&&d(x)<=n).sort((a,b)=>d(a)-d(b)),okl=P.filter(x=>st[x.id]&&st[x.id].g==2&&d(x)>n).sort((a,b)=>d(a)-d(b));
 return [...hd,...okd,...un,...okl]}
function prcMenu(){const fs=prcFs(),f=S.prcF||'all',c=prcCnt(),ch=(k,l,P)=>`<button class="icchip ${f==k?'on':''}" data-f="${esc(k)}">${esc(l)} <span class="small">${P.length}</span></button>`;
 const o=ov(`<div class="prcm"><h2>원리 카드</h2><p class="small mut">현상을 보고 원인을 떠올린 뒤 뒤집어 확인해요. 몰라요·헷갈려요는 곧 다시, 알아요는 간격을 늘려 다시 나와요.</p>
 <div class="icchips" id="prcf">${ch('all','전체',PRC)}${fs.map(k=>ch(k,k,PRC.filter(x=>x.f==k))).join('')}</div>
 <div class="small mut" id="prcs" style="margin:10px 0">${c.n}장 · 알아요 ${c.ok} · 학습 중 ${c.hd} · 새 카드 ${c.un}${c.due?` · 복습 ${c.due}`:''}</div>
 <button class="cta" id="prcst">시작하기</button><button class="sbtn" id="prcx">닫기</button></div>`);
 o.querySelector('#prcf').onclick=e=>{const b=e.target.closest('button');if(!b)return;S.prcF=b.dataset.f;try{save()}catch(e){}ovClose();prcMenu()};
 o.querySelector('#prcst').onclick=()=>{ovClose();prcRun()};o.querySelector('#prcx').onclick=ovClose}
function prcRun(){const L=prcOrder().slice(0,S.kwN||20).map(x=>({x}));if(!L.length){toast('카드가 없어요');return}let i=0,ok=0,hd=0,bad=0;const done=new Set();
 S.lastStart={m:'prc'};try{save()}catch(e){}
 const o=ov('<div id="am"></div>');o.classList.add('amov');const box=o.querySelector('#am');
 const fin=()=>{const p=done.size?Math.round(ok/done.size*100):0;box.innerHTML=`<div class="rescard"><div class="ring" style="--p:${p};margin:0 auto 14px"><b>${p}%</b></div><div class="big">${done.size}장</div><div class="mut">알아요 ${ok} · 헷갈려요 ${hd} · 몰라요 ${bad}</div></div><button class="cta" id="amnx">다음 세트</button><button class="sbtn" id="amx">닫기</button>`;box.querySelector('#amx').onclick=ovClose;box.querySelector('#amnx').onclick=()=>{ovClose();prcRun()};box._k=e=>{if(e.key=='Enter'||e.key==' '){e.preventDefault();box.querySelector('#amnx').click()}}};
 const kh=e=>{if(!document.body.contains(box)){document.removeEventListener('keydown',kh);return}if(e.target.closest&&e.target.closest('input,textarea'))return;box._k&&box._k(e)};document.addEventListener('keydown',kh);
 const show=()=>{if(i>=L.length)return fin();const x=L[i].x;
  box.innerHTML=`<div class="amtop"><div class="pbar"><i style="width:${i/L.length*100}%"></i></div><span class="small mut">${i+1}/${L.length}</span></div>
  <div class="amcard prcc" id="amc"><div class="amf"><div class="small amcat">원리 카드 · ${esc(x.f)}</div><div class="amdef revq">${esc(x.q)}</div><div class="small mut amhint">원인을 떠올려 보고 탭해서 확인</div></div>
  <div class="amb hide"><div class="small amcat">${esc(x.f)}</div><div class="amdef">${esc(x.a)}</div>${x.k?`<div class="ambx"><b>키워드</b> ${esc(x.k)}</div>`:''}${x.src?`<div class="small mut">출처: ${esc(x.src)}</div>`:''}</div></div>
  <div class="ambtn"><button class="sbtn bad" id="amn">✗ 몰라요</button><button class="sbtn mid" id="amh">△ 헷갈려요</button><button class="sbtn ok" id="amy">✓ 알아요</button></div>`;
  const c=box.querySelector('#amc'),flip=()=>{c.querySelector('.amf').classList.toggle('hide');c.querySelector('.amb').classList.toggle('hide')};c.onclick=flip;
  const grade=g=>{if(!L[i].rq){const st=prcSt(),r=st[x.id]||{n:0};st[x.id]={g,c:sched(r.c,[1,2,3][g]),n:(r.n||0)+1,at:Date.now()};LS.set('gv_prc',st);done.add(x.id);g==2?ok++:g==1?hd++:bad++}
   if(g<2)L.splice(Math.min(L.length,i+(g?8:4)),0,{x,rq:1});i++;show()};
  box.querySelector('#amy').onclick=()=>grade(2);box.querySelector('#amh').onclick=()=>grade(1);box.querySelector('#amn').onclick=()=>grade(0);
  box._k=e=>{if(e.key==' '||e.key=='Enter'){e.preventDefault();flip()}else if(e.key=='ArrowRight'||e.key=='j')grade(2);else if(e.key=='ArrowDown'||e.key=='h')grade(1);else if(e.key=='ArrowLeft'||e.key=='f')grade(0)};
  let x0=null;c.addEventListener('touchstart',e=>x0=e.touches[0].clientX,{passive:true});c.addEventListener('touchend',e=>{if(x0==null)return;const d=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(d)>70){e.preventDefault();grade(d>0?2:0)}})};
 show()}
function prcRow(){const c=prcCnt(PRC);return `<button class="flrow revrow" id="prcgo"><i class="sbub" data-g="all">원</i><span>현상 보고 원리 떠올리기 <span class="small mut">(원리 카드)</span></span><span class="small mut">${c.n}장 · 알아요 ${c.ok} · 학습 중 ${c.hd}</span></button>`}
{const _dm=dkDeckMenu;dkDeckMenu=function(){_dm.apply(this,arguments);if(!PRC.length)return;document.querySelectorAll('#prcgo').forEach(e=>e.remove());const r=document.getElementById('revgo');if(r)r.insertAdjacentHTML('afterend',prcRow());else{const l=[...document.querySelectorAll('.fllist')].pop();if(!l)return;l.insertAdjacentHTML('afterend',`<h3 class="small mut">다른 방식</h3><div class="fllist">${prcRow()}</div>`)}document.getElementById('prcgo').onclick=()=>{ovClose();prcMenu()}}}
{const _rl=resumeLast;resumeLast=function(){const l=S.lastStart||{};if(l.m=='prc')return prcRun();return _rl.apply(this,arguments)}}
setTimeout(()=>{try{if(!PKEYS.includes('gv_prc'))PKEYS.push('gv_prc')}catch(e){}},0);
{const _mi=mergeIn;mergeIn=function(o){const loc=prcSt();const r=_mi.apply(this,arguments);try{const rem=(o&&o.gv_prc)||{},m=Object.assign({},loc);for(const k in rem){const a=m[k],b=rem[k];if(!b)continue;if(!a||(b.at||0)>(a.at||0))m[k]=Object.assign({},b,{n:Math.max(b.n||0,(a&&a.n)||0)});else m[k]=Object.assign({},a,{n:Math.max(a.n||0,b.n||0)})}LS.set('gv_prc',m)}catch(e){}return r}}

;window.__gvStage=7;
// ---- settings & sync
const PKEYS=['gv_passA','gv_passAc','gv_passc','gv_course','gv_marks','gv_srs','gv_hist','gv_acc','gv_wrong','gv_wrongq','gv_mocks','gv_set','gv_user','gv_deck','gv_plan','gv_listen','gv_ft','gv_sq','gv_ec','gv_sf','gv_miss','gv_kwseen','gv_kwres','gv_pass'];
function progressObj(){const o={app:'geo-vocab',v:1,at:Date.now()};PKEYS.forEach(k=>o[k]=LS.get(k,null));return o}
async function toCode(obj){const txt=JSON.stringify(obj);try{if(window.CompressionStream){const s=new Blob([txt]).stream().pipeThrough(new CompressionStream('gzip'));const buf=new Uint8Array(await new Response(s).arrayBuffer());let b='';buf.forEach(x=>b+=String.fromCharCode(x));return 'GVZ1.'+btoa(b)}}catch(e){}return 'GVJ1.'+btoa(unescape(encodeURIComponent(txt)))}
async function fromCode(code){code=code.trim();if(code.startsWith('{'))return JSON.parse(code);const [h,b]=code.split('.');const bin=atob(b.replace(/\s/g,''));if(h=='GVZ1'){const u=Uint8Array.from(bin,c=>c.charCodeAt(0));const s=new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'));return JSON.parse(await new Response(s).text())}return JSON.parse(decodeURIComponent(escape(bin)))}
function mergeIn(o){if(!o||o.app!='geo-vocab')throw new Error('형식');
 const ms=LS.get('gv_srs',{}),is=o.gv_srs||{};for(const k in is)if(!ms[k]||(is[k].last||0)>(ms[k].last||0))ms[k]=is[k];srs=ms;
 const mh=hist,ih=o.gv_hist||{};for(const d in ih){const a=mh[d]||{},b=ih[d];mh[d]=((a.rev||0)+(a.n||0))>=((b.rev||0)+(b.n||0))?a:b}
 const ma=acc,ia=o.gv_acc||{};for(const k in ia)if(!ma[k]||ia[k].n>ma[k].n)ma[k]=ia[k];
 Object.assign(marks,o.gv_marks||{});Object.assign(wrong,o.gv_wrong||{});Object.assign(wrongq,o.gv_wrongq||{});
 const seen=new Set(mocks.map(m=>m.at));(o.gv_mocks||[]).forEach(m=>{if(!seen.has(m.at))mocks.push(m)});mocks.sort((a,b)=>a.at-b.at);
 if(o.gv_user&&o.gv_user.length){const m=new Map(user.map(t=>[t.term,t]));o.gv_user.forEach(t=>m.set(t.term,t));user=[...m.values()];LS.set('gv_user',user);T=all();TM=new Map(T.map(t=>[t.term,t]))}
 {const a=LS.get('gv_kwseen',{});Object.assign(a,o.gv_kwseen||{});LS.set('gv_kwseen',a)}
 {const a=LS.get('gv_pass',null),b=o.gv_pass;if(b&&(!a||b.start<a.start))LS.set('gv_pass',{start:b.start,days:b.days||7})}
 {const a=LS.get('gv_passA','gv_passAc','gv_passc',null),b=o.gv_passA;if(b&&(!a||b.start<a.start))LS.set('gv_passA',{start:b.start,days:b.days||7})}
 {const a=LS.get('gv_miss',[]),k=new Set(a.map(m=>m.at+'|'+m.id));(o.gv_miss||[]).forEach(m=>{if(!k.has(m.at+'|'+m.id))a.push(m)});a.sort((x,y)=>x.at-y.at);LS.set('gv_miss',a.slice(-3000))}
 {const a=LS.get('gv_sq',{}),b=o.gv_sq||{};for(const k in b)if(!a[k]||b[k].n>a[k].n)a[k]=b[k];LS.set('gv_sq',a)}
 save();rq=null}
function renderData(){$('#v-data').innerHTML=`<div class="box"><h2>⚙️ 설정</h2>
 <div class="set"><label>글자 크기<span class="mut">${S.fs}px</span></label><input type="range" min="15" max="22" value="${S.fs}" id="sfs" aria-label="글자 크기"></div>
 <div class="set"><label>하루 새 카드 수<span class="mut">인출 세션에 새로 들어오는 카드</span></label><input type="number" min="0" max="200" value="${S.newPerDay}" id="snew"></div>
 <div class="set"><label>하루 목표 (문항)<span class="mut">홈 화면 링</span></label><input type="number" min="5" max="500" value="${S.goal}" id="sgoal"></div>
 <div class="set"><label>시험일 (D-day, 비우면 1차 2026-11-28)</label><input type="date" value="${S.examDate||''}" id="sexam"></div>
 <div class="set"><label>인출 세션 문제 유형<span class="mut">혼합: 새 카드는 정의→용어, 이후 키워드·빈칸 순환</span></label><select class="inp" id="srmode" style="min-height:40px"><option value="mix">혼합(추천)</option><option value="d2t">정의→용어만</option><option value="t2k">키워드 인출만</option><option value="cloze">빈칸만</option></select></div>
 <div class="set"><label>진동 피드백<span class="mut">Android 지원 (iOS Safari 미지원)</span></label><input type="checkbox" class="sw" id="shap" ${S.haptic?'checked':''}></div>
 <div class="set"><label>자동 읽어주기 (TTS)<span class="mut">카드 표시 때 용어·정의 낭독</span></label><input type="checkbox" class="sw" id="stts" ${S.tts?'checked':''}></div>
 <div class="set"><label>읽기 속도</label><input type="range" min="0.6" max="1.6" step="0.1" value="${S.rate}" id="srate"></div>
 <div class="set"><label>앱 아이콘 배지 · 알림 권한<span class="mut">설치된 앱 아이콘에 오늘 복습 수 표시 (iOS는 알림 허용 필요)</span></label><button class="sbtn" id="snot">${'Notification' in window&&Notification.permission=='granted'?'허용됨 ✓':'허용하기'}</button></div></div>
 <div class="box sec"><h2>🔄 PC ↔ 휴대폰 진도 동기화</h2><p class="mut">서버 없이 수동 동기화해요. 한 기기에서 <b>코드 복사</b>(또는 파일 저장) → 다른 기기에서 <b>붙여넣고 가져오기</b>. 복습 일정은 더 최근 기록 기준으로 합쳐져요.</p>
 <div class="row"><button id="xcode">📋 동기화 코드 복사</button><button id="xfile">💾 진도 파일 저장</button><label class="sbtn" for="xin">📂 파일 가져오기</label><input type="file" id="xin" accept=".json,application/json" class="hide"></div>
 <textarea id="xtxt" placeholder="여기에 동기화 코드를 붙여넣기 (GVZ1.… )" style="margin-top:10px"></textarea><div class="row"><button id="ximp">가져와서 합치기</button></div><p class="mut" id="xmsg"></p></div>
 <div class="box sec"><h2>표시 · 기록 관리</h2><div class="row"><button id="clrbad">🤔 헷갈려요 전체 해제</button><button id="clrok">✅ 외웠어요 전체 해제</button><button id="rst">모든 표시 초기화</button><button id="rsrs">복습 일정 초기화</button><button id="rwr">오답노트 비우기</button></div><p class="mut" id="dmsg"></p></div>
 <div class="box sec"><h2>내 단어 추가</h2><p class="mut">JSON 배열 <code>[{"term","def","cat","keys","vs","ex","distractors"}]</code>을 붙여넣으면 이 기기에 저장되어 함께 학습돼요.</p><textarea id="imp"></textarea><div class="row"><button id="impb">추가</button><button id="expb">전체 단어 JSON 내보내기</button><button id="clr">추가 단어 삭제</button></div>
 <p class="mut">기출 표기(예: 2024 A1)는 KICE 공개 문제지(2017~2026학년도)와 사용자 기출 분석 자료를 대조한 것이며, * 표시는 2016학년도 이전으로 사용자 노트 기준입니다. 지문형 서술 문항은 기출 형식을 본뜬 자체 제작 문항입니다.</p>
 <p class="mut">⌨️ 단축키 — 카드: <span class="kbd">Space</span> 뒤집기 <span class="kbd">←→</span> 이동 <span class="kbd">1</span>/<span class="kbd">2</span> 표시 · 인출: <span class="kbd">Enter</span> 확인 <span class="kbd">1~4</span> 평가 · 객관식: <span class="kbd">1~5</span> · 공통: <span class="kbd">Z</span> 되돌리기 <span class="kbd">G</span> 홈</p><p class="mut">버전 ${document.querySelector('meta[name=app-version]').content}</p></div>`;
 const num=(id,k,min)=>$(id).onchange=e=>{S[k]=Math.max(min,+e.target.value||min);save();rq=null};num('#snew','newPerDay',0);num('#sgoal','goal',5);
 $('#sfs').oninput=e=>{S.fs=+e.target.value;document.documentElement.style.setProperty('--fs',S.fs+'px');e.target.previousElementSibling.querySelector('.mut').textContent=S.fs+'px';save()};
 $('#sexam').onchange=e=>{S.examDate=e.target.value;save()};$('#srmode').value=S.rmode||'mix';$('#srmode').onchange=e=>{S.rmode=e.target.value;rkind={};save()};
 $('#shap').onchange=e=>{S.haptic=e.target.checked;save();buzz(20)};$('#stts').onchange=e=>{S.tts=e.target.checked;save();if(S.tts)speak('읽어주기를 켰어요')};$('#srate').onchange=e=>{S.rate=+e.target.value;save();speak('속도 확인')};
 $('#snot').onclick=async()=>{if(!('Notification' in window)){toast('이 환경은 알림/배지를 지원하지 않아요 (iOS는 홈 화면 앱에서만)');return}const p=await Notification.requestPermission();toast(p=='granted'?'허용됨 — 앱 아이콘에 복습 수가 표시돼요':'허용되지 않았어요');pushDueToSW();renderData()};
 $('#xcode').onclick=async()=>{const c=await toCode(progressObj());$('#xtxt').value=c;try{await navigator.clipboard.writeText(c);$('#xmsg').textContent=`복사됨 (${c.length.toLocaleString()}자). 다른 기기에서 붙여넣으세요.`}catch(e){$('#xtxt').select();$('#xmsg').textContent='아래 코드를 길게 눌러 복사하세요.'}};
 $('#xfile').onclick=()=>{const b=new Blob([JSON.stringify(progressObj())],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='geo-vocab-progress-'+new Date().toISOString().slice(0,10)+'.json';a.click()};
 $('#xin').onchange=async e=>{if(!e.target.files[0])return;if(!await askConfirm('정말로 파일의 진도를 가져오시겠어요?','현재 기기의 진도에 파일 내용이 합쳐져요. 같은 항목은 파일 값으로 바뀔 수 있어요. 먼저 "진도 파일 저장"으로 백업하세요.','가져오기')){e.target.value='';return}try{mergeIn(JSON.parse(await e.target.files[0].text()));$('#xmsg').textContent='✅ 파일의 진도를 합쳤어요'}catch(err){$('#xmsg').textContent='❌ 파일 형식 오류'}};
 $('#ximp').onclick=async()=>{if(!$('#xtxt').value.trim()){$('#xmsg').textContent='코드를 먼저 붙여넣으세요';return}if(!await askConfirm('정말로 동기화 코드를 가져오시겠어요?','현재 기기의 진도에 코드 내용이 합쳐져요. 같은 항목은 코드 값으로 바뀔 수 있어요. 먼저 "진도 파일 저장"으로 백업하세요.','가져오기'))return;try{mergeIn(await fromCode($('#xtxt').value));$('#xmsg').textContent='✅ 진도를 합쳤어요';navBadge()}catch(err){$('#xmsg').textContent='❌ 코드가 올바르지 않아요'}};
 const conf=async(t,l,ok,f)=>{if(await askConfirm(t,l,ok)){f();save();rq=null;navBadge()}};
 function clrM(v,l){const n=Object.values(marks).filter(x=>x==v).length;if(!n){$('#dmsg').textContent=l+' 표시가 없어요';return}conf('정말로 '+l+' 표시를 모두 해제하시겠어요?',l+' 표시 '+n+'개가 사라져요. 되돌릴 수 없어요.','해제',()=>{for(const k in marks)if(marks[k]==v)delete marks[k];$('#dmsg').textContent=l+' '+n+'개 해제됨'})}
 $('#clrbad').onclick=()=>clrM('bad','헷갈려요');$('#clrok').onclick=()=>clrM('ok','외웠어요');$('#rst').onclick=()=>conf('정말로 모든 표시를 초기화하시겠어요?','외웠어요·헷갈려요 표시 '+Object.keys(marks).length+'개가 모두 사라져요. 되돌릴 수 없어요.','초기화',()=>{marks={};$('#dmsg').textContent='모든 표시 초기화'});
 $('#rsrs').onclick=()=>conf('정말로 복습 일정을 초기화하시겠어요?','용어 '+Object.keys(srs).length+'개의 간격 반복 기록(다음 복습일·간격)이 모두 사라져요. 되돌릴 수 없어요.','초기화',()=>{srs={};$('#dmsg').textContent='복습 일정 초기화됨'});$('#rwr').onclick=()=>conf('정말로 오답노트를 비우시겠어요?','오답 '+(Object.keys(wrong).length+Object.keys(wrongq).length)+'개 기록이 모두 사라져요. 되돌릴 수 없어요.','비우기',()=>{wrong={};wrongq={};$('#dmsg').textContent='오답노트 비움'});
 $('#impb').onclick=async()=>{if(!await askConfirm('정말로 용어를 가져오시겠어요?','같은 이름의 내 용어는 가져온 내용으로 덮어써져요.','가져오기'))return;try{const a=JSON.parse($('#imp').value);if(!Array.isArray(a))throw 0;const ok=a.filter(x=>x.term&&x.def).map(x=>({term:x.term,en:x.en||'',def:x.def,cat:x.cat||'지역지리',keys:x.keys||'',vs:x.vs||'',ex:x.ex||'',distractors:x.distractors||[],exam:x.exam||[]}));const m=new Map(user.map(t=>[t.term.replace(/\s/g,''),t]));ok.forEach(t=>m.set(t.term.replace(/\s/g,''),t));user=[...m.values()];LS.set('gv_user',user);T=all();TM=new Map(T.map(t=>[t.term,t]));catsUI();$('#dmsg').textContent=ok.length+'개 추가됨'}catch(e){$('#dmsg').textContent='JSON 형식 오류'}};
 $('#expb').onclick=()=>{const b=new Blob([JSON.stringify(T,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='geo-terms.json';a.click()};
 $('#clr').onclick=()=>conf('정말로 추가한 단어를 삭제하시겠어요?','내가 추가한 단어 '+user.length+'개가 모두 지워져요. 되돌릴 수 없어요. (기본 단어장은 그대로예요)','삭제',()=>{user=[];localStorage.removeItem('gv_user');T=all();TM=new Map(T.map(t=>[t.term,t]));catsUI()})}
// ---- routing
function navBadge(){const n=dueList().length;const b=$('#navdue');b.textContent=n>99?'99+':n;b.classList.toggle('hide',!n)}
function go(m){mode=m;if(m!='home'&&m!='stats'&&m!='data')S.last=m;$$('#nav button').forEach(x=>x.classList.toggle('on',x.dataset.m==m));render();window.scrollTo({top:0})}
function render(){const showList=mode=='card'&&listView;['home','review','card','list','quiz','stats','data'].forEach(m=>$('#v-'+m).classList.toggle('hide',!(m==mode&&!(m=='card'&&listView))&&!(m=='list'&&showList)));
 const filt=['review','card','quiz'].includes(mode)&&!(mode=='quiz'&&mock&&mock.active);$('#filters').classList.toggle('hide',!filt);$('#subs').classList.toggle('hide',mode=='quiz'&&['concept','passage','mock','wrong'].includes(qmode));$('#tools').classList.toggle('hide',mode!='card');
 if(mode!='quiz')clearInterval(mockT);
 ({home:renderHome,review:renderReview,card:()=>showList?renderList():renderCard(),quiz:renderQuiz,stats:renderStats,data:renderData})[mode]();navBadge()}
$('#nav').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.m=='card')listView=false;try{if(typeof PL!='undefined'&&PL.ov&&!PL.ov.classList.contains('hide'))ovClose()}catch(_){}go(b.dataset.m)};
$('#lst').onclick=()=>{listView=!listView;render()};
$('#q').oninput=()=>{idx=0;render()};$('#filt').onchange=()=>{idx=0;render()};
$('#shuf').onclick=()=>{order=shuffle(T.map(t=>t.term));idx=0;render();toast('🔀 섞었어요')};
function deckUI(){$$('#deck button').forEach(b=>b.classList.toggle('on',b.dataset.d==deck));$('#dc1').textContent='('+T.filter(t=>t.core).length+')';$('#dc2').textContent='('+T.length+')'}
$('#deck').onclick=e=>{const b=e.target.closest('button');if(!b)return;deck=b.dataset.d;LS.set('gv_deck',deck);idx=0;rq=null;deckUI();catsUI();render()};
const thSet=d=>{document.documentElement.dataset.theme=d;localStorage.setItem('gv_theme',d);$('#theme').textContent=d=='dark'?'☀️':'🌙';document.querySelectorAll('meta[name=theme-color]').forEach(m=>m.content=d=='dark'?'#0f1217':'#f5f6f8')};

document.addEventListener('keydown',e=>{const tg=e.target.tagName;if(e.metaKey||e.ctrlKey&&e.key!='z'||e.altKey)return;const typing=tg=='INPUT'||tg=='TEXTAREA'||tg=='SELECT';
 if(!typing&&(e.key=='z'||e.key=='Z'||(e.ctrlKey&&e.key=='z'))){e.preventDefault();undo();return}if(typing)return;
 if(e.key=='g'){go('home');return}
 if(mode=='card'&&!listView){if(e.key=='ArrowRight')$('#next').click();else if(e.key=='ArrowLeft')$('#prev').click();else if(e.key==' '){e.preventDefault();flipCard()}else if(e.key=='1')markCur('bad');else if(e.key=='2')markCur('ok')}
 else if(mode=='review'){const g=$('#rctl .grades');if(g){if(/^[1-4]$/.test(e.key))g.querySelector(`[data-g="${e.key}"]`).click();else if(e.key=='Enter'||e.key==' '){e.preventDefault();g.querySelector(`[data-g="${$('#rctl').dataset.auto}"]`).click()}}}
 else if(mode=='quiz'){const n=$('#qn');if(n&&(e.key=='Enter'||e.key==' ')){e.preventDefault();n.click();return}const o=$$('#qbox .opt');if(/^[1-5]$/.test(e.key)&&o[+e.key-1])o[+e.key-1].click()}});
// ---- PWA
if('serviceWorker' in navigator&&location.protocol.startsWith('http')){navigator.serviceWorker.register('sw.js').then(reg=>{
 const ask=w=>toast('새 버전이 준비됐어요','업데이트',()=>w.postMessage('SKIP_WAITING'),15000);
 if(reg.waiting)ask(reg.waiting);reg.addEventListener('updatefound',()=>{const w=reg.installing;w&&w.addEventListener('statechange',()=>{if(w.state=='installed'&&navigator.serviceWorker.controller)ask(w)})});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState=='visible')reg.update().catch(()=>{})});
 try{if('periodicSync' in reg)navigator.permissions.query({name:'periodic-background-sync'}).then(p=>{if(p.state=='granted')reg.periodicSync.register('gvb-due',{minInterval:12*36e5}).catch(()=>{})})}catch(e){}
}).catch(()=>{});let rl=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!rl){rl=true;location.reload()}})}
// ---- init
const startMode=new URLSearchParams(location.search).get('m');
deckUI();catsUI();go(['review','card','quiz','stats','data'].includes(startMode)?startMode:'home');pushDueToSW();
;window.__gvOK=1;

