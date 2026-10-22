(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=d3.format(',.0f'), nf1=d3.format(',.1f');
const sum=a=>{let t=0;for(let i=0;i<a.length;i++)t+=a[i];return t;};
const MN={v:'มูลค่า',c:'ต้นทุน',q:'ปริมาณ',n:'จำนวนครั้งที่จ่าย'};
const S={mode:'dis',from:1,to:12,view:'ALL',metric:'v',tab:'overview',q:'',active:true,sort:{k:'tot',d:-1},limit:80,cmp:[],cm:'v',detail:null,dm:'v',fy:null,cmpm:null};
let anim='tab',animNow=null,animT=null;
let ALLM=[],FYS=[],AV=12,HASP=false,SIG='',D=[],CATS=[],SYMS=[],MON=[],catBy={},symBy={},VIEWS=[],viewBy={},VL={dis:[],sym:[]},VB={dis:{},sym:{}},byId={},ready=false;
const GR=()=>S.mode==='sym'?SYMS:CATS;
const gk=x=>S.mode==='sym'?x.sym:x.cat;
const gdef=x=>(S.mode==='sym'?symBy:catBy)[gk(x)];
let GI={};
const gcol=code=>'color-mix(in srgb,var(--hp-a) '+(GI[code]||45)+'%,var(--color-bg))';
function computeGI(){
  const t=GR().map(c=>({c:c.code,v:sum(rg(series(D.filter(x=>gk(x)===c.code),S.metric)))})).sort((a,b)=>b.v-a.v);
  GI={};t.forEach((o,i)=>{GI[o.c]=Math.round(100-i*(62/Math.max(1,t.length-1)));});
}
const gshort=x=>{const g=gdef(x);return g?g.short:'';};
const baht=x=>{x=+x||0;return Math.abs(x)>=1e6?d3.format(',.2f')(x/1e6)+' ล้าน':nf(x);};
const bahtS=x=>{x=+x||0;return Math.abs(x)>=1e6?d3.format('.2f')(x/1e6)+'M':Math.abs(x)>=1e3?d3.format('.0f')(x/1e3)+'k':nf(x);};
const pct=(x,d)=>(x*100).toFixed(d==null?1:d)+'%';
const sgn=(x,d)=>(x>0?'+':x<0?'−':'')+(Math.abs(x)*100).toFixed(d==null?0:d)+'%';
const unitFmt=(x,m)=>m==='q'||m==='n'?nf(x):baht(x);
const series=(rows,k)=>{const o=Array(12).fill(0);rows.forEach(x=>{const a=x[k];for(let i=0;i<12;i++)o[i]+=a[i];});return o;};
const rg=a=>a.slice(S.from-1,S.to);
const rgp=a=>a?a.slice(S.from-1,S.to):[];
const pser=(rows,k)=>HASP?series(rows,'p'+k):null;
const mlab=i=>MON[i]?MON[i].label:String(i+1);
const rangeLabel=()=>S.from===S.to?mlab(S.from-1):mlab(S.from-1)+' – '+mlab(S.to-1);
const colors=()=>dash.colors||[];
const C0=()=>colors()[0]||'var(--color-fg)';
const bad=()=>S.metric==='v'||S.metric==='c';

/* ---------- data prep ---------- */
function prep(){
  const d=dash.data('drugs'),c=dash.data('cats'),m=dash.data('months'),sy=dash.data('syms');
  const st=[d,c,m,sy].map(x=>x.status);
  const msg=$('#hp-msg');
  if(st.some(s=>s==='error'||s==='missing'||s==='declined'||s==='connect')){msg.hidden=false;msg.textContent='โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง หรือแจ้งผู้ดูแลระบบ';return false;}
  if(st.some(s=>s!=='ok')){msg.hidden=false;msg.innerHTML='<div class="hp-skel"></div><div class="hp-skel"></div><div class="hp-skel"></div>';return false;}
  msg.hidden=true;msg.textContent='';
  const sig=d.data.length+':'+m.data.filter(x=>x.has).length+':'+m.data.length;
  if(ready&&sig===SIG)return true;
  SIG=sig;
  CATS=c.data.slice().sort((a,b)=>a.order-b.order);ALLM=m.data.map(x=>Object.assign({},x,{has:x.has===true||x.has==='true'||+x.has===1})).sort((a,b)=>a.m-b.m);
  FYS=Array.from(new Set(ALLM.map(x=>x.fy))).sort((a,b)=>a-b);
  catBy={};CATS.forEach(x=>catBy[x.code]=x);SYMS=sy.data.slice().sort((a,b)=>a.order-b.order);symBy={};SYMS.forEach(x=>symBy[x.code]=x);
  D=d.data.map(r=>{
    const o={r:r,id:r.id,label:r.label,raw:r.raw,name:r.name,unit:r.unit,strength:r.strength,cat:r.cat,sym:r.sym,off:+r.off===1,chronic:!!(catBy[r.cat]&&+catBy[r.cat].chronic),v:[],c:[],q:[],n:[],A:{v:arr(r.v),c:arr(r.c),q:arr(r.q),n:arr(r.n)}};
    o.key=(r.label+' '+r.raw+' '+r.strength).toLowerCase();o.gtxt=((catBy[r.cat]?catBy[r.cat].name:'')+' '+(symBy[r.sym]?symBy[r.sym].name:'')).toLowerCase();
    return o;});
  const hs=ALLM.filter(x=>x.has).map(x=>x.fy);
  if(!S.fy||FYS.indexOf(S.fy)<0)S.fy=hs.length?Math.max.apply(null,hs):FYS[FYS.length-1];
  applyFY(true);
  byId={};D.forEach(x=>byId[x.id]=x);
  buildViews();ready=true;
  buildStatic();buildChips();
  return true;
}
function arr(a){if(typeof a==='string'){try{a=JSON.parse(a);}catch(e){a=[];}}return (a||[]).map(Number);}
function applyFY(reset){
  const fm=ALLM.filter(x=>x.fy===S.fy).sort((a,b)=>a.fm-b.fm);
  MON=fm;AV=0;while(AV<12&&fm[AV]&&fm[AV].has)AV++;if(AV<1)AV=12;
  const off=ALLM.indexOf(fm[0]);
  const pf=ALLM.filter(x=>x.fy===S.fy-1).sort((a,b)=>a.fm-b.fm);
  HASP=pf.length===12&&pf.some(x=>x.has);const po=HASP?ALLM.indexOf(pf[0]):0;
  D.forEach(o=>{['v','c','q','n'].forEach(k=>{o[k]=o.A[k].slice(off,off+12);o['p'+k]=HASP?o.A[k].slice(po,po+12):null;});});
  if(reset||S.to>AV||S.from>AV){S.from=1;S.to=AV;}
  S.cmpm=HASP?(S.cmpm||'yoy'):'trend';
}
function setFY(fy){S.fy=fy;applyFY(true);}
function buildViews(){
  const mk=(k,n,f,t)=>({k:k,n:n,f:f,t:t});
  VIEWS=[mk('ALL','ทุกกลุ่มยา',()=>true,'ยาทั้งหมดของโรงพยาบาล'),mk('NCD','โรคเรื้อรัง (รวม)',x=>x.chronic,'ยากลุ่มโรคเรื้อรัง: ความดัน เบาหวาน COPD หอบหืด ไต หัวใจ ไขมัน จิตเวช ระบบประสาท ไทรอยด์ เก๊าท์')];
  const cl=[['ht'],['dm'],['COPD',['copd','resp_shared'],'COPD','COPD รวมยาที่ใช้ร่วมกับหอบหืด'],['ASTHMA',['asthma','resp_shared'],'หอบหืด','หอบหืด รวมยาที่ใช้ร่วมกับ COPD'],['tb'],['ckd'],['cvd'],['psych'],['lipid'],['neuro'],['thyroid'],['gout'],['hiv']];
  const used={};
  cl.forEach(e=>{
    const cats=e[1]||[e[0]];
    const c=catBy[e[0]];
    const nm=e[2]||(c?c.short:e[0]);
    const tt=e[3]||(c?c.name:nm);
    VIEWS.push(mk(e[0],nm,x=>cats.indexOf(x.cat)>=0,tt));
    cats.forEach(k=>used[k]=1);
  });
  VIEWS.forEach(v=>v.grp='a');
  CATS.forEach(c=>{if(!used[c.code]&&c.code!=='resp_shared'){const v=mk(c.code,c.short,x=>x.cat===c.code,c.name);v.grp='b';VIEWS.push(v);}});
  VIEWS.forEach(v=>{viewBy[v.k]=v;});
  VL.dis=VIEWS;VB.dis=viewBy;
  const sv=[mk('ALL','ทุกอาการ',()=>true,'ยาทั้งหมดของโรงพยาบาล')];sv[0].grp='a';
  SYMS.forEach(c=>{const v=mk(c.code,c.short,x=>x.sym===c.code,c.name);v.grp='a';sv.push(v);});
  VL.sym=sv;VB.sym={};sv.forEach(v=>VB.sym[v.k]=v);
  VIEWS=VL[S.mode];viewBy=VB[S.mode];
}
const view=()=>viewBy[S.view]||VIEWS[0];
const scope=()=>D.filter(view().f);

/* ---------- static controls ---------- */
function buildStatic(){
  const f=$('#hp-fy');
  if(f)f.innerHTML=FYS.slice().reverse().map(y=>'<button data-act="fy" data-y="'+y+'" aria-pressed="false">'+y+'</button>').join('');
  rebuildRange();
}
function rebuildRange(){
  const opt=(i)=>'<option value="'+(i+1)+'"'+(i>=AV?' disabled':'')+'>'+esc(MON[i].full+' '+MON[i].year)+(i>=AV?' (ยังไม่มีข้อมูล)':'')+'</option>';
  $('#hp-from').innerHTML=MON.map((_,i)=>opt(i)).join('');
  $('#hp-to').innerHTML=MON.map((_,i)=>opt(i)).join('');
  const f=MON[0],l=MON[AV-1];
  $('#hp-sub').textContent='ปีงบประมาณ '+S.fy+' · '+f.full+' '+f.year+' – '+l.full+' '+l.year+(AV<12?' (มีข้อมูลถึงเดือนล่าสุด)':'')+' · '+nf(D.length)+' รายการยา · แหล่งข้อมูล: รายงานสรุปการใช้เวชภัณฑ์ยา (ที่บันทึกจ่ายยา) รายเดือน';
  ['#hp-fy-t','#hp-fy-e'].forEach(q=>{const e=$(q);if(e)e.textContent=String(S.fy);});
  const hl=ALLM.filter(x=>x.has).pop(),ft=$('#ft-last');if(ft&&hl)ft.textContent='(ข้อมูลล่าสุด: '+hl.full+' '+hl.year+')';
}
function buildChips(){
  const chip=v=>'<button class="hp-chip'+(v.k==='NCD'?' ncd':'')+'" data-act="view" data-k="'+esc(v.k)+'" title="'+esc(v.t)+'" aria-pressed="false">'+esc(v.n)+'</button>';
  $('#hp-chips-a').innerHTML=VIEWS.filter(v=>v.grp!=='b').map(chip).join('');
  $('#hp-chips-b').innerHTML=VIEWS.filter(v=>v.grp==='b').map(chip).join('');
  $('#hp-fgb').hidden=S.mode==='sym';
  $('#hp-la').textContent=S.mode==='sym'?'ยาตามอาการ / ข้อบ่งใช้ (ครอบคลุมยาทุกรายการ)':'คลินิก / กลุ่มโรคเรื้อรัง';
}
function setMode(m){S.mode=m;VIEWS=VL[m];viewBy=VB[m];S.view='ALL';S.limit=80;buildChips();}
function syncControls(){
  $('#hp-from').value=S.from;$('#hp-to').value=S.to;
  $$('#hp-fy button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.y===S.fy)));
  $$('#hp-cmpm button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===S.cmpm)));
  const cg=$('#hp-cmpg');if(cg)cg.hidden=!HASP;
  $$('#hp-quick button').forEach(b=>{const a=+b.dataset.a,e=Math.min(+b.dataset.b,AV);b.hidden=a>AV;b.setAttribute('aria-pressed',String(a===S.from&&e===S.to));});
  $$('#hp-metric button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===S.metric)));
  $$('#hp-mode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===S.mode)));
  $$('#hp-chips-a .hp-chip,#hp-chips-b .hp-chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===S.view)));
  $$('#hp-tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.t===S.tab)));
  $$('#cm-metric button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===S.cm)));
  $('#hp-act').setAttribute('aria-pressed',String(S.active));
  const rows=scope();
  const tot=sum(rg(series(rows,S.metric)));
  const act=rows.filter(x=>sum(rg(x.v))>0).length;
  $('#hp-ctx').innerHTML='กำลังดู: <b>'+esc(view().n)+'</b> · <b>'+esc(rangeLabel())+'</b> · '+MN[S.metric]+' <b>'+baht(tot)+' บาท</b> · ยา '+nf(rows.length)+' รายการ (มีการใช้ '+nf(act)+')'+(S.view==='COPD'||S.view==='ASTHMA'?' · <span title="Seretide, Symbicort, Berodual, Salbutamol NB, Theophylline">รวมยาใช้ร่วม COPD/หอบหืด</span>':'');
  hero(rows,tot);
  ['overview','groups','drugs','compare','alerts'].forEach(t=>{$('#hp-'+t).hidden=S.pres||S.tab!==t;});
  $('#hp-pres').hidden=!S.pres;
}

function hero(rows,tot){
  const sv=series(rows,S.metric),di=deltaInfo(sv),ci=makeCI(rows,S.metric,di);
  const w=Math.min(360,Math.max(200,($('#hp-hero-n').clientWidth||320)));
  $('#hp-hero-n').innerHTML='<span class="l">'+esc(view().n)+' · '+esc(rangeLabel())+' · '+MN[S.metric]+'รวม</span><span class="n">'+cnt('hero',tot,'b')+'<small>บาท</small></span><span class="s">'+(ci?(ci.mode==='yoy'?'เทียบปีงบ '+(S.fy-1)+' '+deltaTag(ci.d,true)+' (ช่วงเดียวกัน)':'แนวโน้ม '+deltaTag(ci.d,true)+' ('+di.k+' เดือนท้าย เทียบ '+di.k+' เดือนแรก)'):'')+'</span>'+spark(sv.slice(0,AV),w,54);
}
/* ---------- charts ---------- */
function spark(arr,w,h,col){
  w=w||84;h=h||24;const mx=d3.max(arr)||1;
  const x=i=>2+i*(w-4)/(arr.length-1),y=v=>h-2-(v/mx)*(h-4);
  const p=arr.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join('');
  return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" aria-hidden="true"><path class="hp-line" pathLength="1" d="'+p+'" fill="none" style="stroke:'+(col||C0())+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle class="hp-dot" style="--i:11;fill:'+(col||C0())+'" cx="'+x(arr.length-1).toFixed(1)+'" cy="'+y(arr[arr.length-1]).toFixed(1)+'" r="2.4"/></svg>';
}
const PB={},PH={},PREVK={};
const reduced=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const trunc=(t,n)=>t.length>n?t.slice(0,n-1)+'…':t;
function flagsOf(arr){
  const a0=arr.slice(0,AV),m=d3.mean(a0),sd=d3.deviation(a0)||0,f=[];
  if(!(m>0&&sd>0))return f;
  a0.forEach((v,i)=>{const z=(v-m)/sd;if(z>=1.5)f.push({i:i,t:'hi',z:z});else if(z<=-1.5)f.push({i:i,t:'lo',z:z});});
  return f;
}
function tween(el,from,to,fmt,dur){
  const id=(el._tw=(el._tw||0)+1);const t0=performance.now();
  if(from===to)return;
  const step=t=>{if(el._tw!==id||!el.isConnected)return;const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(step);else el.textContent=fmt(to);};
  requestAnimationFrame(step);
}
function cnt(key,val,fmt){return '<span class="cnt" data-key="'+key+'" data-fmt="'+fmt+'" data-to="'+val+'">'+(fmt==='b'?baht(val):nf(val))+'</span>';}
function countUps(){
  $$('#hp .cnt').forEach(el=>{
    const to=+el.dataset.to,key=el.dataset.key,fmt=el.dataset.fmt==='b'?baht:nf;
    let from=PREVK[key];PREVK[key]=to;
    if(!animNow||reduced())return;
    if(animNow==='tab'||from==null)from=0;
    tween(el,from,to,fmt,animNow==='tab'?1000:700);
  });
}
function barChart(host,vals,o){
  o=o||{};
  const W=Math.max(300,host.clientWidth||600),H=o.h||260;
  const ma=o.ma?vals.map((v,i)=>i<2||i>=AV?null:(vals[i]+vals[i-1]+vals[i-2])/3):null;
  const all=vals.concat(o.line||[]);if(o.target>0)all.push(o.target);if(o.prev)o.prev.forEach(v=>all.push(v));
  const mx=d3.max(all)||1;
  const y=d3.scaleLinear([0,mx*1.3],[H-26,14]).nice();
  const ticks=y.ticks(5);
  const lm=Math.max.apply(null,ticks.map(t=>nf(t).length))*6.6+14;
  const x=d3.scaleBand(d3.range(12),[lm,W-8]).padding(.24);
  const gid='g'+(host.id||'x'),c0=o.color||C0(),cb='var(--color-bad)';
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(o.aria||'กราฟรายเดือน')+'"><defs>'+
    '<linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:'+c0+';stop-opacity:1"/><stop offset="1" style="stop-color:'+c0+';stop-opacity:.5"/></linearGradient>'+
    '<linearGradient id="'+gid+'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:'+cb+';stop-opacity:1"/><stop offset="1" style="stop-color:'+cb+';stop-opacity:.55"/></linearGradient></defs>';
  ticks.forEach(t=>{s+='<line x1="'+lm+'" x2="'+(W-8)+'" y1="'+y(t)+'" y2="'+y(t)+'" style="stroke:var(--cds-chart-grid)" stroke-width="1"/><text class="hp-ax" x="'+(lm-6)+'" y="'+(y(t)+4)+'" text-anchor="end">'+nf(t)+'</text>';});
  const inr=i=>i+1>=S.from&&i+1<=S.to;
  const rv=rg(vals);const avg=rv.length?sum(rv)/rv.length:0;
  let pk=-1,pv=-1;vals.forEach((v,i)=>{if(inr(i)&&v>pv){pv=v;pk=i;}});
  const prev=PB[host.id];const morph=animNow==='data'&&prev&&prev.length===12&&!reduced();
  const bhs=[];
  const fl={};(o.flags||[]).forEach(f=>{fl[f.i]=f;});
  const tg={};
  {let lo=-1,lv=Infinity,last=-1;vals.forEach((v,i)=>{if(inr(i)){last=i;if(v>0&&v<lv){lv=v;lo=i;}}});
   if(pk>=0)tg[pk]='สูงสุด';if(lo>=0&&lo!==pk)tg[lo]='ต่ำสุด';if(last>=0)tg[last]=tg[last]?tg[last]+' · ล่าสุด':'ล่าสุด';}
  Object.keys(fl).forEach(i=>{if(fl[i].t==='hi'&&inr(+i))s+='<rect class="hp-band" x="'+(x(+i)-x.step()*x.paddingOuter()*0-(x.step()-x.bandwidth())/2).toFixed(1)+'" y="6" width="'+x.step().toFixed(1)+'" height="'+(H-28)+'" rx="6" style="fill:var(--color-bad)"/>';});
  vals.forEach((v,i)=>{
    const bh=Math.max(0,y(0)-y(v));bhs.push(bh);
    const over=o.target>0&&v>o.target;
    const tf=morph&&prev[i]>0&&bh>0?';transform-box:fill-box;transform-origin:50% 100%;transform:scaleY('+Math.min(4,prev[i]/bh).toFixed(3)+')':'';
    s+='<rect class="hp-bar'+(morph?' mo':'')+'" data-i="'+i+'" style="--i:'+i+';fill:url(#'+gid+(over?'b':'')+');opacity:'+(inr(i)?1:.25)+tf+'" x="'+x(i).toFixed(1)+'" y="'+(y(v)).toFixed(1)+'" width="'+x.bandwidth().toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="4"/>';
    if(inr(i)&&v>0&&tg[i])s+='<text class="hp-ax hp-tag" x="'+(x(i)+x.bandwidth()/2).toFixed(1)+'" y="'+(y(v)-18).toFixed(1)+'" text-anchor="middle" style="fill:'+(tg[i].indexOf('ต่ำ')===0?'var(--color-ok)':tg[i].indexOf('สูง')===0?'var(--color-bad)':'var(--color-fg-muted)')+'">'+tg[i]+'</text>';
    if(W>760||tg[i]){if(inr(i)&&v>0)s+='<text class="hp-ax" x="'+(x(i)+x.bandwidth()/2).toFixed(1)+'" y="'+(y(v)-5).toFixed(1)+'" text-anchor="middle" style="'+(i===pk?'fill:var(--color-fg);font-weight:600':'')+'">'+bahtS(v)+'</text>';}
    if(fl[i]&&inr(i)){const cx=x(i)+x.bandwidth()/2,cy=y(v)-(tg[i]?34:20),hi=fl[i].t==='hi';
      s+='<path class="hp-flag" d="'+(hi?'M'+(cx-6)+' '+(cy-5)+'L'+(cx+6)+' '+(cy-5)+'L'+cx+' '+(cy+6)+'Z':'M'+(cx-6)+' '+(cy+5)+'L'+(cx+6)+' '+(cy+5)+'L'+cx+' '+(cy-6)+'Z')+'" style="fill:'+(hi?'var(--color-bad)':'var(--color-ok)')+'"/>';}
    if(W>=460||i%2===0)s+='<text class="hp-ax" x="'+(x(i)+x.bandwidth()/2).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+esc(MON[i].short)+'</text>';
  });
  PB[host.id]=bhs;
  if(avg>0)s+='<line x1="'+lm+'" x2="'+(W-8)+'" y1="'+y(avg)+'" y2="'+y(avg)+'" style="stroke:var(--cds-chart-reference)" stroke-width="1.5" stroke-dasharray="5 4"/>';
  if(o.prev){const pp=o.prev.map((v,i)=>[x(i)+x.bandwidth()/2,y(v)]);s+='<path class="hp-prevl" d="'+d3.line()(pp)+'" fill="none" style="stroke:var(--cds-chart-reference)" stroke-width="2.2" stroke-dasharray="6 4" stroke-linecap="round"/>'+pp.map(p=>'<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.6" style="fill:var(--cds-chart-reference)"/>').join('');}
  if(ma){const pts=ma.map((v,i)=>v==null?null:[x(i)+x.bandwidth()/2,y(v)]).filter(Boolean);
    s+='<path class="hp-line hp-ma" pathLength="1" d="'+d3.line().curve(d3.curveMonotoneX)(pts)+'" fill="none" style="stroke:'+(colors()[2]||'var(--color-fg)')+'" stroke-width="3.2" stroke-linecap="round"/>';}
  if(o.target>0)s+='<line x1="'+lm+'" x2="'+(W-8)+'" y1="'+y(o.target)+'" y2="'+y(o.target)+'" style="stroke:var(--color-bad)" stroke-width="1.8" stroke-dasharray="2 4" stroke-linecap="round"/><text class="hp-ax" x="'+(W-10)+'" y="'+(y(o.target)-5)+'" text-anchor="end" style="fill:var(--color-bad);font-weight:600">เป้า '+nf(o.target)+'</text>';
  if(o.line){const p=o.line.map((v,i)=>(i?'L':'M')+(x(i)+x.bandwidth()/2).toFixed(1)+' '+y(v).toFixed(1)).join('');
    s+='<path class="hp-line" pathLength="1" d="'+p+'" fill="none" style="stroke:'+(colors()[2]||'var(--color-fg)')+'" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
    o.line.forEach((v,i)=>{s+='<circle class="hp-dot" data-i="'+i+'" style="--i:'+i+';fill:'+(colors()[2]||'var(--color-fg)')+'" cx="'+(x(i)+x.bandwidth()/2).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="3"/>';});}
  s+='<line class="hp-guide" x1="0" x2="0" y1="6" y2="'+(H-22)+'"/>';
  vals.forEach((v,i)=>{
    let t=o.tip(i);if(fl[i])t+='\n'+(fl[i].t==='hi'?'▲ สูงกว่าปกติของทั้งปีผิดปกติ':'▼ ต่ำกว่าปกติของทั้งปีผิดปกติ')+' (z='+fl[i].z.toFixed(1)+')';
    if(ma&&ma[i]!=null)t+='\nเฉลี่ย 3 เดือนถึงเดือนนี้: '+nf(ma[i]);
    if(o.target>0)t+='\n'+(v>o.target?'เกินเป้า '+nf(v-o.target)+' บาท':'ต่ำกว่าเป้า '+nf(o.target-v)+' บาท');
    s+='<rect data-col="'+i+'" data-gx="'+(x(i)+x.bandwidth()/2).toFixed(1)+'" x="'+x(i).toFixed(1)+'" y="0" width="'+x.step().toFixed(1)+'" height="'+(H-20)+'" fill="transparent" data-tip="'+esc(t)+'"/>';});
  s+='</svg>';host.innerHTML=s;
  if(morph)requestAnimationFrame(()=>requestAnimationFrame(()=>{host.querySelectorAll('.hp-bar.mo').forEach(b=>{b.style.transform='scaleY(1)';});}));
  return {avg:avg};
}
function hbars(host,list,max){
  max=max||d3.max(list,d=>d.val)||1;
  const prev=PH[host.id]||{};const morph=animNow==='data'&&!reduced();
  const fin=list.map(d=>Math.max(1,d.val/max*100));
  PH[host.id]={};list.forEach((d,i)=>{PH[host.id][d.label]=fin[i];});
  host.innerHTML=list.length?list.map((d,i)=>'<button class="hp-hb'+(d.sp?' sp':'')+'" '+d.attr+' data-tip="'+esc(d.tip||'')+'"><span class="hp-hb-l">'+esc(d.label)+'</span><span class="hp-hb-t"><i style="--i:'+i+';width:'+(morph?(prev[d.label]||0):fin[i]).toFixed(1)+'%;background:linear-gradient(90deg,'+(d.color||C0())+',color-mix(in srgb,'+(d.color||C0())+' 65%,transparent))"></i></span><span class="hp-hb-v">'+esc(d.vtxt)+'</span>'+(d.sp?'<span class="hp-hb-s">'+spark(d.sp,64,22,d.color)+(d.dtag||'')+'</span>':'')+'</button>').join(''):'<div class="hp-empty">ไม่มีข้อมูลในช่วงที่เลือก</div>';
  if(morph&&list.length)requestAnimationFrame(()=>requestAnimationFrame(()=>{host.querySelectorAll('.hp-hb-t i').forEach((el,i)=>{el.style.width=fin[i].toFixed(1)+'%';});}));
}
function lineChart(host,list,metric){
  const W=Math.max(300,host.clientWidth||600),H=320;
  const mx=d3.max(list,d=>d3.max(d.vals))||1;
  const y=d3.scaleLinear([0,mx*1.08],[H-26,12]).nice(),ticks=y.ticks(6);
  const lm=Math.max.apply(null,ticks.map(t=>nf(t).length))*6.6+14;
  const rm=W>=640?160:16;
  const x=d3.scalePoint(d3.range(12),[lm+6,W-rm]);
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="กราฟเปรียบเทียบยา">';
  ticks.forEach(t=>{s+='<line x1="'+lm+'" x2="'+(W-8)+'" y1="'+y(t)+'" y2="'+y(t)+'" style="stroke:var(--cds-chart-grid)"/><text class="hp-ax" x="'+(lm-6)+'" y="'+(y(t)+4)+'" text-anchor="end">'+nf(t)+'</text>';});
  d3.range(12).forEach(i=>{if(W>=460||i%2===0)s+='<text class="hp-ax" x="'+x(i)+'" y="'+(H-8)+'" text-anchor="middle">'+esc(MON[i].short)+'</text>';});
  s+='<line class="hp-guide" x1="0" x2="0" y1="6" y2="'+(H-22)+'"/>';
  list.forEach(d=>{
    const p=d.vals.slice(0,AV).map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join('');
    s+='<path class="hp-line" pathLength="1" d="'+p+'" fill="none" style="stroke:'+d.color+'" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
    d.vals.slice(0,AV).forEach((v,i)=>{s+='<circle class="hp-dot" data-i="'+i+'" style="--i:'+i+';fill:'+d.color+'" cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="3.4"/>';});
  });
  if(W>=640){
    const it=list.map(d=>({d:d,y:y(d.vals[AV-1])})).sort((a,b)=>a.y-b.y);
    for(let i=1;i<it.length;i++)if(it[i].y<it[i-1].y+16)it[i].y=it[i-1].y+16;
    it.forEach(o=>{s+='<text class="hp-ax hp-end" x="'+(x(AV-1)+10)+'" y="'+(o.y+4)+'" style="fill:'+o.d.color+'">'+esc(trunc(o.d.name,16))+' · '+unitFmt(o.d.vals[AV-1],metric)+'</text>';});
  }
  const step=(W-rm-lm-6)/11;
  d3.range(12).forEach(i=>{
    const lines=['<b>'+MON[i].full+' '+MON[i].year+'</b>'].concat(list.map(d=>d.name+': '+unitFmt(d.vals[i],metric)));
    s+='<rect data-col="'+i+'" data-gx="'+x(i).toFixed(1)+'" x="'+(x(i)-step/2).toFixed(1)+'" y="0" width="'+step.toFixed(1)+'" height="'+(H-20)+'" fill="transparent" data-tipx="'+esc(lines.join('\n'))+'"/>';
  });
  s+='</svg>';host.innerHTML=s;
}
function hoverCol(tg){
  const c=tg.closest?tg.closest('[data-col]'):null;
  $$('svg[data-hi]').forEach(sv=>{if(!c||sv!==c.closest('svg')){delete sv.dataset.hi;sv.querySelectorAll('.hi').forEach(n=>n.classList.remove('hi'));}});
  if(!c)return;
  const sv=c.closest('svg'),col=c.dataset.col;
  if(!sv||sv.dataset.hi===col)return;
  sv.dataset.hi=col;sv.querySelectorAll('.hi').forEach(n=>n.classList.remove('hi'));
  sv.querySelectorAll('[data-i="'+col+'"]').forEach(n=>n.classList.add('hi'));
  const g=sv.querySelector('.hp-guide');if(g){g.setAttribute('x1',c.dataset.gx);g.setAttribute('x2',c.dataset.gx);}
}

/* ---------- overview ---------- */
function deltaInfo(arr){
  const r=rg(arr),len=r.length;if(len<2)return null;
  const k=Math.min(3,Math.floor(len/2));const a=sum(r.slice(0,k)),b=sum(r.slice(-k));
  return {k:k,a:a,b:b,d:a>0?b/a-1:(b>0?Infinity:0)};
}
function movers(rows,m,di){
  if(!di)return {up:[],dn:[]};
  const mv=rows.map(x=>{const pr=di.pair(x);return {x:x,dd:pr.b-pr.a};}).filter(o=>Math.abs(o.dd)>0.5);
  return {up:mv.filter(o=>o.dd>0).sort((a,b)=>b.dd-a.dd),dn:mv.filter(o=>o.dd<0).sort((a,b)=>a.dd-b.dd)};
}
function headline(host,tone,html){host.className='hp-headline '+tone;host.innerHTML='<i></i><div>'+html+'</div>';}
function trendWord(di){
  if(!di)return 'เลือกอย่างน้อย 2 เดือนเพื่อดูแนวโน้ม';
  if(!isFinite(di.d))return 'เริ่มมีการใช้ในช่วงท้าย';
  return di.d>.03?'<b class="up-bad">▲ เพิ่มขึ้น '+pct(di.d,0)+'</b>':di.d<-.03?'<b class="dn-ok">▼ ลดลง '+pct(-di.d,0)+'</b>':'<b class="flat">ใกล้เคียงเดิม</b>';
}
function toneOf(di,upBad){if(!di)return 'info';if(!isFinite(di.d))return upBad?'bad':'ok';if(Math.abs(di.d)<.03)return 'info';return (di.d>0)===upBad?'bad':'ok';}
function makeCI(rows,m,di){
  if(HASP&&S.cmpm==='yoy'){
    const a=sum(rgp(pser(rows,m))),b=sum(rg(series(rows,m)));
    return {mode:'yoy',k:null,a:a,b:b,d:a>0?b/a-1:(b>0?Infinity:0),labA:'ปีงบ '+(S.fy-1),labB:'ปีงบ '+S.fy,pair:x=>({a:sum(rgp(x['p'+m])),b:sum(rg(x[m]))})};
  }
  if(!di)return null;
  return {mode:'trend',k:di.k,a:di.a,b:di.b,d:di.d,labA:di.k+' เดือนแรก',labB:di.k+' เดือนท้าย',pair:x=>{const rr=rg(x[m]);return {a:sum(rr.slice(0,di.k)),b:sum(rr.slice(-di.k))};}};
}
function kpi(l,n,s,sp){return '<div class="hp-kpi">'+(sp?'<span class="sp">'+sp+'</span>':'')+'<span class="l">'+l+'</span><span class="n">'+n+'</span><span class="s">'+s+'</span></div>';}
function deltaTag(d,upBad){
  if(!isFinite(d))return '<span class="up-bad">เริ่มมีการใช้</span>';
  const c=Math.abs(d)<.03?'flat':((d>0)===upBad?'up-bad':'dn-ok');
  return '<span class="'+c+'">'+(c==='flat'?'':d>0?'▲ ':'▼ ')+sgn(d)+'</span>';
}
function renderOverview(){
  const rows=scope(),m=S.metric;
  const sv=series(rows,m),so=series(rows,m==='v'?'c':'v');
  const r=rg(sv),tot=sum(r),avg=r.length?tot/r.length:0;
  const other=sum(rg(so));
  let pk=0;r.forEach((v,i)=>{if(v>r[pk])pk=i;});let lo=0;r.forEach((v,i)=>{if(v<r[lo])lo=i;});
  const mom=r.length>=2&&r[r.length-2]>0?r[r.length-1]/r[r.length-2]-1:null;
  const di=deltaInfo(sv),ci=makeCI(rows,m,di);
  const act=rows.filter(x=>sum(rg(x.v))>0).length;
  const vtot=sum(rg(series(rows,'v'))),ctot=sum(rg(series(rows,'c')));
  const allv=sum(rg(series(D,m)));
  const mvs=movers(rows,m,ci);
  headline($('#ov-head'),toneOf(ci||di,bad()),'<span class="hp-hl-t">'+esc(view().n)+' · '+esc(rangeLabel())+'</span> '+MN[m]+'รวม <b>'+baht(tot)+'</b> '+(m==='n'?'ครั้ง':m==='q'?'':'บาท')+(ci&&ci.mode==='yoy'?' · เทียบปีงบ '+(S.fy-1)+' ช่วงเดียวกัน '+trendWord(ci):' · แนวโน้ม '+trendWord(di)+(di?' ('+di.k+' เดือนท้ายเทียบ '+di.k+' เดือนแรก)':''))+(mvs.up.length&&ci&&mvs.up[0].dd>=Math.max(3000,tot*.01)?' · ตัวดันขึ้นสุด: <b>'+esc(mvs.up[0].x.name)+'</b> +'+baht(mvs.up[0].dd):'')+(mvs.dn.length&&ci&&-mvs.dn[0].dd>=Math.max(3000,tot*.01)?' · ลดสุด: <b>'+esc(mvs.dn[0].x.name)+'</b> −'+baht(-mvs.dn[0].dd):''));
  const len=r.length,pvs=S.from-1-len>=0?sum(sv.slice(S.from-1-len,S.from-1)):null,pd=pvs>0?tot/pvs-1:null;
  const l3=r.slice(-3),a3=l3.length?sum(l3)/l3.length:0;
  let k2;
  if(S.target>0){
    const over=r.filter(v=>v>S.target).length,rem=12-S.to,proj=tot+Math.max(0,rem)*a3,pj=proj/(S.target*12);
    k2=kpi('เทียบเป้ารายเดือน',pct(a3/S.target,0)+'<div class="hp-prog"><i class="'+(a3>S.target?'bad':'ok')+'" style="width:'+Math.min(100,a3/S.target*100).toFixed(0)+'%"></i></div>','เฉลี่ย 3 เดือนท้าย '+baht(a3)+' เทียบเป้า '+baht(S.target)+' · เกินเป้า '+over+' จาก '+len+' เดือน'+(S.from===1&&rem>0?' · ถ้าคงระดับนี้ สิ้นปีงบฯ รวมประมาณ '+baht(proj)+' บาท ('+pct(pj,0)+' ของเป้าทั้งปี)':''));
  }else k2=kpi('เฉลี่ยต่อเดือน',cnt('avg',avg,'b')+' <small>บาท</small>','จาก '+len+' เดือน · กรอกเป้ารายเดือนเหนือกราฟเพื่อดูความคืบหน้า');
  $('#ov-kpis').innerHTML=
    kpi('รวม'+MN[m]+' ('+esc(rangeLabel())+')',cnt('tot',tot,'b')+' <small>บาท</small>',(ci&&ci.mode==='yoy'?'เทียบปีงบ '+(S.fy-1)+' '+deltaTag(ci.d,true)+' · ':(pd!=null?'เทียบช่วงก่อนหน้า '+deltaTag(pd,true)+' · ':''))+(m==='v'?'ต้นทุน '+baht(ctot)+' บาท ('+(vtot?pct(ctot/vtot,0):'—')+')':'มูลค่า '+baht(vtot)+' บาท'),len>=2?spark(r,92,34):'')+
    k2+
    kpi('แนวโน้มในช่วงที่เลือก','<span class="big">'+(di?deltaTag(di.d,true):'—')+'</span>',di?di.k+' เดือนท้าย เทียบ '+di.k+' เดือนแรก':'ต้องเลือกอย่างน้อย 2 เดือน');
  $('#ov-kpis2').innerHTML=
    kpi('เดือนสูงสุด',esc(mlab(S.from-1+pk)),baht(r[pk])+' บาท · ต่ำสุด '+esc(mlab(S.from-1+lo))+' '+baht(r[lo]))+
    kpi('เดือนล่าสุดเทียบเดือนก่อน',mom==null?'—':deltaTag(mom,true),mom==null?'ต้องเลือกอย่างน้อย 2 เดือน':esc(mlab(S.to-1))+' เทียบ '+esc(mlab(S.to-2)))+
    kpi('ยาที่มีการใช้',cnt('act',act,'n')+' <small>/ '+nf(rows.length)+'</small>','สัดส่วน '+(allv?pct(tot/allv,1):'—')+' ของมูลค่าทั้งโรงพยาบาล');
  $('#ov-trend-h').innerHTML=esc(MN[m])+'รายเดือน: '+(di?(di.d>.03?'เพิ่มขึ้น':di.d<-.03?'ลดลง':'ใกล้เคียงเดิม')+(isFinite(di.d)&&Math.abs(di.d)>=.03?' '+pct(Math.abs(di.d),0):'')+' · ':'')+'สูงสุดเดือน '+esc(mlab(S.from-1+pk));
  $('#ov-trend-n').textContent='แท่ง = '+MN[m]+' (บาท) · เส้นหนา = แนวโน้มเฉลี่ย 3 เดือน (ไม่สะดุดกับความผันผวนรายเดือน) · เส้นประ = ค่าเฉลี่ยในช่วงที่เลือก · แถบแดงจาง = เดือนสูงผิดปกติ · ลากเมาส์/นิ้วบนกราฟเพื่อเลือกช่วงเดือน · แท่งจางคือเดือนนอกช่วงที่เลือก';
  S.target=loadT();const tgi=$('#hp-tg');if(tgi&&document.activeElement!==tgi)tgi.value=S.target?String(S.target):'';
  const pvS=HASP&&S.cmpm==='yoy'?pser(rows,m):null;
  barChart($('#ov-trend'),sv,{ma:true,prev:pvS,flags:flagsOf(sv),target:S.target,aria:'แนวโน้มรายเดือน',tip:i=>{
    const prev=i>0&&sv[i-1]>0?sv[i]/sv[i-1]-1:null;
    return MON[i].full+' '+MON[i].year+'\n'+MN[m]+': '+nf(sv[i])+' บาท\n'+MN[m==='v'?'c':'v']+': '+nf(so[i])+' บาท'+(prev==null?'':'\nเทียบเดือนก่อน: '+sgn(prev,1))+(pvS?'\nปีงบ '+(S.fy-1)+': '+nf(pvS[i])+' บาท'+(pvS[i]>0?' ('+sgn(sv[i]/pvS[i]-1,0)+')':''):'');}});
  $('#ov-trend-lg').innerHTML='<span style="--c:'+C0()+'">'+MN[m]+'</span><span class="ln" style="--c:'+(colors()[2]||'var(--color-fg)')+'">แนวโน้ม (เฉลี่ย 3 เดือน)</span><span class="ln" style="--c:var(--cds-chart-reference)">ค่าเฉลี่ย</span>'+(pvS?'<span class="ln dash" style="--c:var(--cds-chart-reference)">ปีงบ '+(S.fy-1)+' (เส้นประ)</span>':'')+(S.target?'<span class="ln" style="--c:var(--color-bad)">เป้า (แท่งแดง = เกินเป้า)</span>':'')+'<span class="nb"><b class="b-bad">▲</b> เดือนสูงผิดปกติ</span><span class="nb"><b class="b-ok">▼</b> เดือนต่ำผิดปกติ</span>';
  // insights
  const ins=[];
  ins.push(['info','ภาพรวม','ช่วง '+rangeLabel()+' กลุ่ม “'+view().n+'” ใช้'+MN[m]+'ไปทั้งหมด <b>'+baht(tot)+' บาท</b> เฉลี่ยเดือนละ '+baht(avg)+' บาท'+(allv&&S.view!=='ALL'?' คิดเป็น '+pct(tot/allv,1)+' ของทั้งโรงพยาบาล':'')+' ส่วนต้นทุนอยู่ที่ราว '+(vtot?pct(ctot/vtot,0):'—')+' ของมูลค่า']);
  if(HASP){
    const pv0=sum(rgp(pser(rows,m))),yd=pv0>0?tot/pv0-1:(tot>0?Infinity:0);
    ins.push([!isFinite(yd)?'bad':yd>.05?'bad':yd<-.05?'ok':'info','เทียบปีงบ '+(S.fy-1),'ช่วง '+rangeLabel()+' ปีงบ '+S.fy+' ใช้'+MN[m]+' <b>'+baht(tot)+' บาท</b> เทียบปีงบ '+(S.fy-1)+' ช่วงเดียวกันที่ '+baht(pv0)+' บาท '+(isFinite(yd)?(yd>.005?'<b>เพิ่มขึ้น '+pct(yd,1)+'</b>':yd<-.005?'<b>ลดลง '+pct(-yd,1)+'</b>':'<b>เท่าเดิม</b>')+' (ต่างกัน '+baht(Math.abs(tot-pv0))+' บาท)':'(ปีก่อนไม่มีการใช้)')]);
  }
  if(r.length>=3&&avg>0){
    const hi=r[pk]/avg-1;
    ins.push([hi>.15?'warn':'info','เดือนที่สูง-ต่ำสุด','เดือน<b>'+mlab(S.from-1+pk)+'</b>สูงสุดที่ '+baht(r[pk])+' บาด'.replace('บาด','บาท')+(hi>0?' สูงกว่าค่าเฉลี่ยอยู่ '+pct(hi,0):'')+' ส่วนเดือน'+mlab(S.from-1+lo)+'ต่ำสุดที่ '+baht(r[lo])+' บาท สองเดือนนี้ห่างกันราว '+baht(r[pk]-r[lo])+' บาท']);
  }
  if(di){
    const ab=Math.abs(di.b-di.a);
    const tone=!isFinite(di.d)?'bad':di.d>.1?'bad':di.d<-.1?'ok':'info';
    ins.push([tone,'แนวโน้ม',di.k+' เดือนท้าย ('+mlab(S.to-di.k)+' – '+mlab(S.to-1)+') '+(di.d>.03?'<b>เพิ่มขึ้น'+(isFinite(di.d)?' '+pct(di.d,0):'')+'</b>':di.d<-.03?'<b>ลดลง '+pct(-di.d,0)+'</b>':'<b>ใกล้เคียงเดิม</b>')+' เมื่อเทียบกับ '+di.k+' เดือนแรก ('+mlab(S.from-1)+' – '+mlab(S.from-2+di.k)+') ต่างกันราว '+baht(ab)+' บาท'+(di.d>.1?' น่าจะต้องไล่ดูว่ายาตัวไหนดันตัวเลขขึ้น ดูต่อได้ที่แท็บ “ความผิดปกติและข้อสังเกต”':di.d<-.1?' ทิศทางนี้ดีต่อการคุมค่าใช้จ่าย แต่ควรเช็กด้วยว่าลดเพราะสั่งใช้เหมาะสมขึ้น ไม่ใช่เพราะยาขาดสต็อก':'')]);
  }
  const rank=rows.map(x=>({x:x,t:sum(rg(x[m]))})).filter(a=>a.t>0).sort((a,b)=>b.t-a.t);
  if(rank.length){
    const t5=sum(rank.slice(0,5).map(a=>a.t));
    ins.push(['info','ยาที่ใช้มาก','ยา 5 ตัวแรกรวมกันเป็น <b>'+pct(t5/tot,0)+'</b> ของ'+MN[m]+'ในกลุ่มนี้ ได้แก่ '+rank.slice(0,5).map(a=>esc(a.x.name)+' ('+pct(a.t/tot,0)+')').join(', ')]);
  }
  if(S.view==='ALL'||S.view==='NCD'){
    const ncd=rows.filter(x=>x.chronic);const nt=sum(rg(series(ncd,m)));
    if(S.view==='ALL')ins.push(['info','โรคเรื้อรัง','ยากลุ่มโรคเรื้อรัง (ความดัน เบาหวาน หัวใจ ไต COPD/หอบหืด จิตเวช และอื่น ๆ) คิดเป็น <b>'+pct(nt/tot,0)+'</b> ของ'+MN[m]+'ทั้งหมด']);
    const cs=GR().map(c=>({c:c,t:sum(rg(series(rows.filter(x=>gk(x)===c.code),m)))})).filter(a=>a.t>0).sort((a,b)=>b.t-a.t);
    if(cs.length>1)ins.push(['info','กลุ่มที่ใช้มาก','กลุ่ม “'+cs[0].c.short+'” ใช้มากที่สุด '+pct(cs[0].t/tot,0)+' รองลงมาคือ “'+cs[1].c.short+'” '+pct(cs[1].t/tot,0)+(cs[2]?' และ “'+cs[2].c.short+'” '+pct(cs[2].t/tot,0):'')]);
  }
  if(ci&&rows.length){
    const mv=rows.map(x=>{const pr=ci.pair(x);return {x:x,a:pr.a,b:pr.b};}).map(o=>(o.dd=o.b-o.a,o));
    const up=mv.filter(o=>o.dd>0).sort((a,b)=>b.dd-a.dd).slice(0,3),dn=mv.filter(o=>o.dd<0).sort((a,b)=>a.dd-b.dd).slice(0,3);
    if(up.length&&up[0].dd>=Math.max(3000,tot*.01))ins.push(['bad','ยาที่ดันค่าใช้จ่ายขึ้น',up.filter(o=>o.dd>=3000).map(o=>'<b>'+esc(o.x.name)+'</b> +'+baht(o.dd)).join(', ')+' บาท (เทียบ '+ci.labB+' กับ '+ci.labA+')']);
    if(dn.length&&-dn[0].dd>=Math.max(3000,tot*.01))ins.push(['ok','ยาที่ลดลงมากที่สุด',dn.filter(o=>-o.dd>=3000).map(o=>'<b>'+esc(o.x.name)+'</b> −'+baht(-o.dd)).join(', ')+' บาท']);
  }
  const pri={bad:0,warn:1,ok:2,info:3};ins.forEach((a,i)=>{a.o=i;});ins.sort((p,q)=>(pri[p[0]]-pri[q[0]])||(p.o-q.o));
  const insN=ins.length;if(!S.insAll)ins.length=Math.min(3,ins.length);
  $('#ov-ins').innerHTML=ins.map((a,i)=>'<div style="--i:'+i+'" class="hp-in '+(a[0]==='info'?'':a[0])+'"><i></i><div><b>'+a[1]+'</b> · '+a[2]+'</div></div>').join('')+(insN>3?'<button class="hp-btn" data-act="insall">'+(S.insAll?'แสดงเฉพาะ 3 ข้อสำคัญ':'ดูเพิ่มอีก '+(insN-3)+' ข้อ')+'</button>':'');
  // top 10
  $('#ov-top-h').textContent='ยา 10 อันดับแรก ('+MN[m]+')';
  hbars($('#ov-top'),rank.slice(0,10).map(a=>({sp:a.x[m].slice(0,AV),dtag:(d=>d==null?'':deltaTag(d.d,true))(deltaInfo(a.x[m])),color:gcol(gk(a.x)),label:a.x.label,val:a.t,vtxt:baht(a.t),attr:'data-act="detail" data-id="'+a.x.id+'"',tip:a.x.label+'\n'+MN[m]+': '+nf(a.t)+' บาท ('+pct(a.t/tot,1)+' ของกลุ่ม)'})));
  // category
  const cs2=GR().map(c=>({c:c,t:sum(rg(series(rows.filter(x=>gk(x)===c.code),m)))})).filter(a=>a.t>0).sort((a,b)=>b.t-a.t);
  $('#ov-cat-h').textContent='สัดส่วนตามกลุ่มยา';
  $('#ov-cat-n').textContent='ยิ่งสีเข้ม ยิ่งเป็นกลุ่มที่ใช้เงินมาก (สีเดียวกันทุกกราฟ) · กดเพื่อเลือกดูกลุ่มนั้น';
  hbars($('#ov-cat'),cs2.slice(0,12).map(a=>{const gs=series(rows.filter(x=>gk(x)===a.c.code),m);return {sp:gs.slice(0,AV),dtag:(d=>d==null?'':deltaTag(d.d,true))(deltaInfo(gs)),label:a.c.short,val:a.t,vtxt:baht(a.t)+' · '+pct(a.t/tot,0),color:gcol(a.c.code),attr:'data-act="pickcat" data-k="'+esc(a.c.code)+'"',tip:a.c.name+'\n'+nf(a.t)+' บาท ('+pct(a.t/tot,1)+')'};}));
  $('#ov-more').hidden=!S.more;
  const mb=$('#ov-more-btn');if(mb)mb.textContent=S.more?'ซ่อนรายละเอียดเพิ่มเติม ▴':'ดูรายละเอียดเพิ่มเติม: แผนที่มูลค่า · เทียบก่อน-หลัง · อะไรทำให้ยอดเปลี่ยน · เล่นย้อนหลัง ▾';
  renderLong(rows,m);
  if(S.more){renderTreemap(rows,m,ci,tot);renderSlope(rows,m,ci);renderWaterfall(rows,m,ci);renderRace();}else raceStop();
}

function loadT(){try{const v=localStorage.getItem('hp_t_'+S.mode+'_'+S.view+'_'+S.metric);return v?+v||0:0;}catch(e){return 0;}}
function saveT(v){try{const k='hp_t_'+S.mode+'_'+S.view+'_'+S.metric;if(v>0)localStorage.setItem(k,String(v));else localStorage.removeItem(k);}catch(e){}}
function renderWaterfall(rows,m,di){
  const host=$('#ov-wf'),card=host.closest('.hp-card');
  if(!di||!rows.length||di.a+di.b===0){card.hidden=true;return;}
  card.hidden=false;
  const mv=rows.map(x=>{const pr=di.pair(x);return {x:x,dd:pr.b-pr.a};}).filter(o=>Math.abs(o.dd)>0.5);
  const ups=mv.filter(o=>o.dd>0).sort((a,b)=>b.dd-a.dd).slice(0,6),dns=mv.filter(o=>o.dd<0).sort((a,b)=>a.dd-b.dd).slice(0,6).reverse();
  const shown=ups.concat(dns);const other=(di.b-di.a)-sum(shown.map(o=>o.dd));
  const steps=[{label:di.labA,tot:true,val:di.a}];
  shown.forEach(o=>steps.push({label:o.x.label,d:o.dd,id:o.x.id}));
  if(Math.abs(other)>0.5)steps.push({label:'ยาอื่น ๆ รวมกัน',d:other});
  steps.push({label:di.labB,tot:true,val:di.b});
  let c=di.a;const cums=[di.a];
  steps.forEach(st=>{if(st.tot){st.a=st.val;st.b=st.val;}else{st.a=c;st.b=c+st.d;c=st.b;cums.push(c);}});
  cums.push(di.b);
  const mn=d3.min(cums),mxv=d3.max(cums),span=(mxv-mn)||1;
  const lo=mn-span*.35,hi=mxv+span*.15;
  const W=Math.max(300,host.clientWidth||600),RH=28,H=steps.length*RH+30;
  const lw=W<560?Math.round(W*.34):Math.min(280,Math.round(W*.34)),rm=W<560?64:84;
  const x=d3.scaleLinear([lo,hi],[lw,W-rm]);
  const nch=Math.floor(lw/6.4);
  let sv='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Waterfall">';
  steps.forEach((st,i)=>{
    const yy=i*RH+4,bh=RH-10;
    const x0=st.tot?x(lo):Math.min(x(st.a),x(st.b)),x1=st.tot?x(st.val):Math.max(x(st.a),x(st.b));
    const col=st.tot?'var(--cds-chart-muted)':(st.d>0?'var(--color-bad)':'var(--color-ok)');
    const tp=st.tot?st.label+'\nรวม'+MN[m]+': '+nf(st.val)+' บาท':st.label+'\n'+(st.d>0?'เพิ่มขึ้น +':'ลดลง −')+nf(Math.abs(st.d))+' บาท';
    sv+='<g'+(st.id?' data-act="detail" data-id="'+st.id+'" style="cursor:pointer"':'')+' data-tip="'+esc(tp)+'"><rect x="0" y="'+yy+'" width="'+W+'" height="'+bh+'" fill="transparent"/>'+
      '<text class="hp-ax" x="'+(lw-8)+'" y="'+(yy+bh/2+4)+'" text-anchor="end" style="fill:var(--color-fg)">'+esc(trunc(st.label,nch))+'</text>'+
      '<rect class="hp-bar" style="--i:'+i+';fill:'+col+(st.tot?';opacity:.55':'')+'" x="'+x0.toFixed(1)+'" y="'+yy+'" width="'+Math.max(2,x1-x0).toFixed(1)+'" height="'+bh+'" rx="4"/>'+
      '<text class="hp-ax" x="'+(x1+6).toFixed(1)+'" y="'+(yy+bh/2+4)+'" style="fill:'+(st.tot?'var(--color-fg)':col)+';font-weight:600">'+(st.tot?baht(st.val):(st.d>0?'+':'−')+nf(Math.abs(st.d)))+'</text></g>';
    if(i<steps.length-1){const nx=st.tot?x(st.val):x(st.b);sv+='<line x1="'+nx.toFixed(1)+'" x2="'+nx.toFixed(1)+'" y1="'+(yy+bh)+'" y2="'+(yy+RH)+'" style="stroke:var(--cds-chart-axis)" stroke-dasharray="2 3"/>';}
  });
  sv+='</svg>';host.innerHTML=sv;
  const up=sum(ups.map(o=>o.dd)),dn=sum(dns.map(o=>o.dd));
  $('#ov-wf-h').innerHTML=(ups.length?'ตัวดันขึ้น: '+esc(ups[0].x.name)+' +'+baht(ups[0].dd):'')+(ups.length&&dns.length?' · ':'')+(dns.length?'ตัวลด: '+esc(dns[0].x.name)+' −'+baht(-dns[0].dd):'');
  $('#ov-wf-n').textContent='อะไรทำให้ '+MN[m]+'เปลี่ยนจาก '+(di.mode==='yoy'?di.labA+' เป็น '+di.labB+' (ช่วง '+rangeLabel()+')':di.k+' เดือนแรก ('+mlab(S.from-1)+' – '+mlab(S.from-2+di.k)+') เป็น '+di.k+' เดือนท้าย ('+mlab(S.to-di.k)+' – '+mlab(S.to-1)+')')+' · แดง = เพิ่ม เขียว = ลด · แกนไม่เริ่มที่ศูนย์เพื่อให้เห็นส่วนต่างชัด · ยาเพิ่ม 6 อันดับแรก +'+nf(up)+' บาท ยาลด 6 อันดับแรก −'+nf(Math.abs(dn))+' บาท · กดแถวเพื่อดูรายละเอียดยา';
}


/* ---------- race ---------- */
const R={key:'',i:0,t:null,items:[]};
function raceStop(){if(R.t){clearInterval(R.t);R.t=null;}const b=$('#race-play');if(b)b.textContent='▶ เล่นย้อนหลัง';}
function raceFrame(i){
  const host=$('#race');if(!host||!R.items.length)return;
  R.i=i;const m=S.metric;
  const vals=R.items.map(o=>o.a[i]);const mxF=d3.max(R.items,o=>o.a[o.a.length-1])||1;
  const order=R.items.map((o,k)=>k).sort((p,q)=>vals[q]-vals[p]);
  const rank={};order.forEach((k,r)=>{rank[k]=r;});
  $$('.hp-rc',host).forEach((el,k)=>{
    el.style.transform='translateY('+(rank[k]*30)+'px)';
    el.querySelector('i').style.width=Math.max(1,vals[k]/mxF*100).toFixed(1)+'%';
    el.querySelector('.v').textContent=baht(vals[k]);
    el.querySelector('.r').textContent=(rank[k]+1);
  });
  const mi=S.from-1+i;
  const lab=$('#race-m');if(lab)lab.textContent=MON[mi].label+' · สะสมตั้งแต่ '+MON[S.from-1].label;
  const sl=$('#hp-race-sl');if(sl&&+sl.value!==i)sl.value=i;
}
function renderRace(){
  const host=$('#race');if(!host)return;const card=host.closest('.hp-card');
  const rows=scope(),m=S.metric;
  const cum=rows.map(x=>{let c=0;const a=[];for(let i=S.from-1;i<S.to;i++){c+=x[m][i];a.push(c);}return {x:x,a:a};});
  const top=cum.filter(o=>o.a.length&&o.a[o.a.length-1]>0).sort((p,q)=>q.a[q.a.length-1]-p.a[p.a.length-1]).slice(0,10);
  if(top.length<2||S.to-S.from<1){card.hidden=true;raceStop();R.key='';return;}
  card.hidden=false;
  const key=[S.mode,S.view,m,S.from,S.to].join('|');
  if(key!==R.key){
    raceStop();R.key=key;R.items=top;
    host.style.height=(top.length*30)+'px';
    host.innerHTML=top.map(o=>'<div class="hp-rc" data-act="detail" data-id="'+o.x.id+'" data-tip="'+esc(o.x.label)+'"><span class="r"></span><span class="l">'+esc(trunc(o.x.name,22))+'</span><span class="t"><i style="background:'+gcol(gk(o.x))+'"></i></span><span class="v"></span></div>').join('');
    const sl=$('#hp-race-sl');sl.min=0;sl.max=top[0].a.length-1;sl.value=top[0].a.length-1;
    R.i=top[0].a.length-1;
  }
  $('#race-h').textContent='เล่นย้อนหลัง: อันดับยา'+MN[m]+'สะสมทีละเดือน';
  raceFrame(Math.min(R.i,R.items[0].a.length-1));
}
function raceToggle(){
  if(R.t){raceStop();return;}
  if(!R.items.length)return;
  const len=R.items[0].a.length;
  if(R.i>=len-1)raceFrame(0);
  $('#race-play').textContent='⏸ หยุด';
  R.t=setInterval(()=>{if(R.i+1>=len){raceStop();return;}raceFrame(R.i+1);},reduced()?1400:1000);
}

/* ---------- presentation ---------- */
function renderPres(){
  const rows=scope(),m=S.metric,sv=series(rows,m),r=rg(sv),tot=sum(r),di=deltaInfo(sv);
  const ci=makeCI(rows,m,di),mv=movers(rows,m,ci),allv=sum(rg(series(D,m)));
  const cs=GR().map(c=>({c:c,t:sum(rg(series(rows.filter(x=>gk(x)===c.code),m)))})).filter(a=>a.t>0).sort((a,b)=>b.t-a.t).slice(0,3);
  const A=computeAlerts(rows);
  const li=(arr,f)=>arr.length?arr.map(f).join(''):'<li class="hp-mut">ไม่มีรายการเด่นในช่วงนี้</li>';
  const sig=Math.max(3000,tot*.005);
  $('#pr-body').innerHTML=
   '<div class="pr-top"><div class="pr-big"><span class="l">'+esc(view().n)+' · '+esc(rangeLabel())+'</span><span class="n">'+baht(tot)+'<small>'+(m==='n'?' ครั้ง':m==='q'?'':' บาท')+'</small></span><span class="s">'+MN[m]+'รวม · '+(ci&&ci.mode==='yoy'?'เทียบปีงบ '+(S.fy-1)+' '+trendWord(ci)+' (ช่วงเดียวกัน)':trendWord(di)+(di?' ('+di.k+' เดือนท้ายเทียบ '+di.k+' เดือนแรก)':''))+'</span></div><div class="hp-svg" id="pr-trend" style="min-height:280px"></div></div>'+
   '<div class="pr-grid">'+
   '<div class="pr-c bad"><h3>ยาที่ดันค่าใช้จ่ายขึ้น</h3><ol>'+li(mv.up.filter(o=>o.dd>=sig).slice(0,3),o=>'<li><b>'+esc(o.x.name)+'</b><span class="up-bad">+'+baht(o.dd)+'</span></li>')+'</ol></div>'+
   '<div class="pr-c ok"><h3>ยาที่ลดลงมากสุด</h3><ol>'+li(mv.dn.filter(o=>-o.dd>=sig).slice(0,3),o=>'<li><b>'+esc(o.x.name)+'</b><span class="dn-ok">−'+baht(-o.dd)+'</span></li>')+'</ol></div>'+
   '<div class="pr-c"><h3>กลุ่มยาที่ใช้มากสุด</h3><ol>'+li(cs,a=>'<li><b>'+esc(a.c.short)+'</b><span>'+pct(a.t/tot,0)+'</span></li>')+'</ol></div>'+
   '<div class="pr-c warn"><h3>ควรทบทวน</h3><ol><li><b>พุ่งผิดปกติ</b><span>'+A.spike.length+' รายการ</span></li><li><b>แนวโน้มเพิ่ม</b><span>'+A.rise.length+' รายการ</span></li><li><b>นอกบัญชียังจ่าย</b><span>'+A.off.length+' รายการ</span></li></ol></div>'+
   '</div><p class="hp-note">สัดส่วนต่อมูลค่าทั้งโรงพยาบาล '+(allv?pct(tot/allv,1):'—')+' · ข้อมูลตามตัวกรองที่เลือกก่อนเข้าโหมดนำเสนอ</p>';
  barChart($('#pr-trend'),sv,{ma:true,h:280,flags:flagsOf(sv),aria:'แนวโน้มรายเดือน',tip:i=>MON[i].full+' '+MON[i].year+'\n'+MN[m]+': '+nf(sv[i])+' บาท'});
}



function renderLong(rows,m){
  const host=$('#ov-long'),card=host.closest('.hp-card');
  const lastHas=ALLM.reduce((a,x,j)=>x.has?j:a,-1);
  if(FYS.length<2||lastHas<1){card.hidden=true;return;}
  card.hidden=false;
  const N=ALLM.length,ser=ALLM.map((_,j)=>{let t=0;rows.forEach(x=>{t+=x.A[m][j];});return t;});
  const W=Math.max(320,host.clientWidth||700),H=250;
  const mx=d3.max(ser.slice(0,lastHas+1))||1;
  const y=d3.scaleLinear([0,mx*1.18],[H-34,18]).nice(),ticks=y.ticks(5);
  const lm=Math.max.apply(null,ticks.map(t=>nf(t).length))*6.6+14;
  const x=d3.scaleBand(d3.range(N),[lm,W-8]).padding(.18);
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="ภาพต่อเนื่องทุกเดือน">';
  ticks.forEach(t=>{s+='<line x1="'+lm+'" x2="'+(W-8)+'" y1="'+y(t)+'" y2="'+y(t)+'" style="stroke:var(--cds-chart-grid)"/><text class="hp-ax" x="'+(lm-6)+'" y="'+(y(t)+4)+'" text-anchor="end">'+nf(t)+'</text>';});
  FYS.forEach((f,fi)=>{
    const js=ALLM.map((a,j)=>a.fy===f?j:-1).filter(j=>j>=0),x0=x(js[0])-(x.step()-x.bandwidth())/2,x1=x(js[js.length-1])+x.bandwidth()+(x.step()-x.bandwidth())/2;
    if(fi>0)s+='<line x1="'+x0.toFixed(1)+'" x2="'+x0.toFixed(1)+'" y1="14" y2="'+(H-30)+'" style="stroke:var(--cds-chart-axis)" stroke-dasharray="3 4"/>';
    s+='<text class="hp-ax" x="'+((x0+x1)/2).toFixed(1)+'" y="12" text-anchor="middle" style="font-weight:700;fill:'+(f===S.fy?'var(--color-fg)':'var(--color-fg-muted)')+'">ปีงบ '+f+(f===S.fy?' (ที่เลือก)':'')+'</text>';
  });
  const ma=ser.map((v,j)=>j<2||j>lastHas?null:(ser[j]+ser[j-1]+ser[j-2])/3);
  ALLM.forEach((a,j)=>{
    if(!a.has)return;
    const v=ser[j],fi=FYS.indexOf(a.fy),c=colors()[fi%2]||C0();
    const yo=j>=12&&ser[j-12]>0?'\nเทียบเดือนเดียวกันปีก่อน: '+sgn(v/ser[j-12]-1,0):'';
    s+='<rect class="hp-bar" style="--i:'+j+';fill:'+c+';opacity:'+(a.fy===S.fy?1:.55)+'" x="'+x(j).toFixed(1)+'" y="'+y(v).toFixed(1)+'" width="'+x.bandwidth().toFixed(1)+'" height="'+Math.max(0,y(0)-y(v)).toFixed(1)+'" rx="3"/>';
    s+='<rect data-act="fy" data-y="'+a.fy+'" x="'+x(j).toFixed(1)+'" y="16" width="'+x.step().toFixed(1)+'" height="'+(H-46)+'" fill="transparent" style="cursor:pointer" data-tip="'+esc(a.full+' '+a.year+'\n'+MN[m]+': '+nf(v)+(m==='q'||m==='n'?'':' บาท')+yo+'\nกดเพื่อดูปีงบ '+a.fy)+'"/>';
    if(W>=640||a.fm%3===1)s+='<text class="hp-ax" x="'+(x(j)+x.bandwidth()/2).toFixed(1)+'" y="'+(H-14)+'" text-anchor="middle">'+esc(a.short)+'</text>';
  });
  const pts=ma.map((v,j)=>v==null?null:[x(j)+x.bandwidth()/2,y(v)]).filter(Boolean);
  if(pts.length>1)s+='<path class="hp-line hp-ma" pathLength="1" d="'+d3.line().curve(d3.curveMonotoneX)(pts)+'" fill="none" style="stroke:'+(colors()[2]||'var(--color-fg)')+'" stroke-width="3" stroke-linecap="round"/>';
  host.innerHTML=s+'</svg>';
  const F1=ALLM[lastHas].fy,F0=F1-1,L=ALLM.filter(a=>a.fy===F1&&a.has).length;
  let a0=0,b0=0;ALLM.forEach((a,j)=>{if(a.fm<=L){if(a.fy===F0)a0+=ser[j];if(a.fy===F1)b0+=ser[j];}});
  const d=a0>0?b0/a0-1:null;
  $('#ov-long-h').textContent='ภาพต่อเนื่องทุกเดือน'+(d==null?'':' · ปีงบ '+F1+(L<12?' (ถึง '+ALLM[lastHas].short+')':'')+' '+(d>.005?'เพิ่มขึ้น '+pct(d,1):d<-.005?'ลดลง '+pct(-d,1):'เท่าเดิม')+' เทียบปีงบ '+F0+' ช่วงเดียวกัน');
  $('#ov-long-n').textContent='ทุกเดือนที่มีข้อมูล ไม่ขึ้นกับช่วงเวลาที่เลือก แต่ตามกลุ่มยาและตัวชี้วัดที่เลือก · เส้นหนา = ค่าเฉลี่ย 3 เดือน · สีแท่งแยกตามปีงบประมาณ กดแท่งเพื่อดูปีงบนั้น';
}

/* ---------- treemap / slope / calendar ---------- */
const dcol=d=>{
  if(!isFinite(d))return 'color-mix(in srgb,var(--color-bad) 72%,var(--color-bg))';
  if(Math.abs(d)<.03)return 'color-mix(in srgb,var(--color-fg) 14%,var(--color-bg))';
  return 'color-mix(in srgb,'+(d>0?'var(--color-bad)':'var(--color-ok)')+' '+Math.round(26+Math.min(1,Math.abs(d))*54)+'%,var(--color-bg))';
};
function renderTreemap(rows,m,di,tot){
  const host=$('#ov-tm');
  const leaves=rows.map(x=>{const pr=di?di.pair(x):{a:0,b:0};return {x:x,t:sum(rg(x[m])),d:pr.a>0?pr.b/pr.a-1:(pr.b>0?Infinity:0)};}).filter(o=>o.t>0).sort((p,q)=>q.t-p.t).slice(0,90);
  if(leaves.length<3){host.innerHTML='<div class="hp-empty">ข้อมูลไม่พอสำหรับแผนที่มูลค่า</div>';$('#ov-tm-n').textContent='';return;}
  const grp={};leaves.forEach(o=>{const c=gk(o.x);(grp[c]=grp[c]||[]).push(o);});
  const root=d3.hierarchy({children:Object.keys(grp).map(c=>({code:c,children:grp[c].map(o=>({o:o}))}))}).sum(d=>d.o?d.o.t:0).sort((a,b)=>b.value-a.value);
  const W=Math.max(300,host.clientWidth||600),H=Math.round(Math.max(300,Math.min(480,W*.56)));
  d3.treemap().size([W,H]).paddingInner(2).paddingOuter(2).paddingTop(d=>d.depth===1?17:2).round(true)(root);
  let sv='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="แผนที่มูลค่า">';
  (root.children||[]).forEach((g,gi)=>{
    const w=g.x1-g.x0,gd=(S.mode==='sym'?symBy:catBy)[g.data.code];
    sv+='<g style="--i:'+gi+'" class="hp-tmg"><rect x="'+g.x0+'" y="'+g.y0+'" width="'+w+'" height="'+(g.y1-g.y0)+'" rx="6" style="fill:color-mix(in srgb,var(--color-fg) 5%,transparent);stroke:var(--color-border-line)"/>';
    if(w>46)sv+='<text class="hp-ax" x="'+(g.x0+6)+'" y="'+(g.y0+12)+'" style="font-weight:700;fill:var(--color-fg)">'+esc(trunc(gd?gd.short:g.data.code,Math.floor((w-10)/6.4)))+'</text>';
    sv+='<rect x="'+g.x0+'" y="'+g.y0+'" width="'+w+'" height="17" fill="transparent" style="cursor:pointer" data-act="pickcat" data-k="'+esc(g.data.code)+'" data-tip="'+esc((gd?gd.name:g.data.code)+'\nกดเพื่อกรองเฉพาะกลุ่มนี้')+'"/></g>';
    g.children.forEach((lf,li)=>{
      const o=lf.data.o,w2=lf.x1-lf.x0,h2=lf.y1-lf.y0;
      sv+='<g class="hp-tml" style="--i:'+(gi*3+li)+'" data-act="detail" data-id="'+o.x.id+'" data-tip="'+esc(o.x.label+'\n'+MN[m]+': '+nf(o.t)+' บาท ('+pct(o.t/tot,1)+')\nแนวโน้ม: '+(isFinite(o.d)?sgn(o.d,0):'เริ่มมีการใช้'))+'"><rect x="'+lf.x0+'" y="'+lf.y0+'" width="'+w2+'" height="'+h2+'" rx="4" style="fill:'+dcol(o.d)+'"/>';
      if(w2>54&&h2>24)sv+='<text class="hp-ax" x="'+(lf.x0+5)+'" y="'+(lf.y0+14)+'" style="fill:var(--color-fg);font-weight:600">'+esc(trunc(o.x.name,Math.floor((w2-8)/6.2)))+'</text>'+(h2>40?'<text class="hp-ax" x="'+(lf.x0+5)+'" y="'+(lf.y0+28)+'" style="fill:var(--color-fg)">'+bahtS(o.t)+'</text>':'');
      sv+='</g>';
    });
  });
  host.innerHTML=sv+'</svg>';
  const shown=sum(leaves.map(o=>o.t));
  $('#ov-tm-n').textContent='ขนาดพื้นที่ = '+MN[m]+' · สีแดง = เพิ่มขึ้น สีเขียว = ลดลง เทา = ใกล้เคียงเดิม (เทียบ '+(di?di.labB+' กับ '+di.labA:'—')+' ยิ่งเข้มยิ่งเปลี่ยนมาก) · แสดงยา '+leaves.length+' รายการแรก คิดเป็น '+pct(shown/(tot||1),0)+' ของยอดรวม · กดหัวกลุ่มเพื่อกรอง กดช่องยาเพื่อดูรายละเอียด';
  $('#ov-tm-h').textContent='เงินกระจุกอยู่ตรงไหน และตรงไหนกำลังโต';
}
function renderSlope(rows,m,di){
  const host=$('#ov-sl');
  if(!di){host.innerHTML='<div class="hp-empty">เลือกอย่างน้อย 2 เดือน</div>';$('#ov-sl-n').textContent='';return;}
  const mv=rows.map(x=>{const pr=di.pair(x);return {x:x,a:pr.a,b:pr.b,dd:pr.b-pr.a};}).filter(o=>o.a+o.b>0);
  const pick=mv.slice().sort((p,q)=>Math.abs(q.dd)-Math.abs(p.dd)).slice(0,14);
  if(pick.length<2){host.innerHTML='<div class="hp-empty">ไม่มีรายการที่เปลี่ยนแปลง</div>';$('#ov-sl-n').textContent='';return;}
  const W=Math.max(300,host.clientWidth||600),H=Math.max(320,pick.length*27+44);
  const lw=W<560?Math.round(W*.42):Math.round(Math.min(300,W*.34)),rw=W<560?Math.round(W*.26):150;
  const pos=pick.flatMap(o=>[o.a,o.b]).filter(v=>v>0);
  const lo=d3.min(pos)*.8,hi=d3.max(pos)*1.25;
  const y=d3.scaleLog([lo,hi],[H-16,34]),yv=v=>y(Math.max(v,lo));
  const xl=lw,xr=W-rw;
  const spread=arr=>{arr.sort((p,q)=>p.y-q.y);for(let i=1;i<arr.length;i++)if(arr[i].y<arr[i-1].y+15)arr[i].y=arr[i-1].y+15;return arr;};
  const L=spread(pick.map(o=>({o:o,y:yv(o.a)}))),Rr=spread(pick.map(o=>({o:o,y:yv(o.b)})));
  const nch=Math.floor((lw-14)/6.2);
  let sv='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="เทียบช่วงแรกกับช่วงท้าย">';
  sv+='<text class="hp-ax" x="'+xl+'" y="14" text-anchor="middle" style="font-weight:700;fill:var(--color-fg)">'+di.labA+'</text><text class="hp-ax" x="'+xr+'" y="14" text-anchor="middle" style="font-weight:700;fill:var(--color-fg)">'+di.labB+'</text>';
  pick.forEach((o,i)=>{
    const col=o.dd>0?'var(--color-bad)':o.dd<0?'var(--color-ok)':'var(--cds-chart-muted)';
    const tp=o.x.label+'\n'+di.labA+': '+nf(o.a)+'\n'+di.labB+': '+nf(o.b)+'\nเปลี่ยน '+(o.dd>0?'+':o.dd<0?'−':'')+nf(Math.abs(o.dd))+' บาท';
    sv+='<g class="hp-sl" style="--i:'+i+'" data-act="detail" data-id="'+o.x.id+'" data-tip="'+esc(tp)+'"><line class="hp-slline" pathLength="1" x1="'+xl+'" y1="'+yv(o.a).toFixed(1)+'" x2="'+xr+'" y2="'+yv(o.b).toFixed(1)+'" style="stroke:'+col+'" stroke-width="2.6" stroke-linecap="round"/><line x1="'+xl+'" y1="'+yv(o.a).toFixed(1)+'" x2="'+xr+'" y2="'+yv(o.b).toFixed(1)+'" stroke="transparent" stroke-width="12"/><circle cx="'+xl+'" cy="'+yv(o.a).toFixed(1)+'" r="4" style="fill:'+col+'"/><circle cx="'+xr+'" cy="'+yv(o.b).toFixed(1)+'" r="4" style="fill:'+col+'"/></g>';
  });
  L.forEach(it=>{sv+='<text class="hp-ax" x="'+(xl-10)+'" y="'+(it.y+4).toFixed(1)+'" text-anchor="end" style="fill:var(--color-fg)">'+esc(trunc(it.o.x.name,nch))+' · '+bahtS(it.o.a)+'</text>';});
  Rr.forEach(it=>{const d=it.o.a>0?it.o.b/it.o.a-1:Infinity;sv+='<text class="hp-ax" x="'+(xr+10)+'" y="'+(it.y+4).toFixed(1)+'" style="font-weight:600;fill:'+(it.o.dd>0?'var(--color-bad)':it.o.dd<0?'var(--color-ok)':'var(--color-fg)')+'">'+bahtS(it.o.b)+(isFinite(d)?' ('+sgn(d,0)+')':' (ใหม่)')+'</text>';});
  host.innerHTML=sv+'</svg>';
  $('#ov-sl-h').textContent='ใครขึ้น ใครลง: ยา '+pick.length+' รายการที่เปลี่ยนมากที่สุด';
  $('#ov-sl-n').textContent='เส้นแดง = ใช้เพิ่มขึ้น เส้นเขียว = ลดลง · เทียบ'+MN[m]+'รวม '+di.labA+' กับ '+di.labB+(di.mode==='yoy'?' (ช่วง '+rangeLabel()+')':' ของช่วงที่เลือก')+' · แกนแนวตั้งเป็นสเกลลอการิทึม (ยาที่มูลค่าต่างกันมากดูได้ในภาพเดียว) · กดเส้นเพื่อดูรายละเอียดยา';
}
function renderCal(){
  const host=$('#gr-cal'),m=S.metric;
  const rows=scope().map(x=>{const a=x[m],a0=a.slice(0,AV),t=sum(a0),mean=t/AV,mx=d3.max(a0);return {x:x,t:t,mx:mx,ratio:mean>0?mx/mean:0,pk:a.indexOf(mx)};}).filter(o=>o.t>=(m==='v'||m==='c'?30000:200)&&o.ratio>=2.2).sort((p,q)=>q.ratio-p.ratio).slice(0,12);
  if(!rows.length){host.innerHTML='<div class="hp-empty">ไม่พบยาที่มีฤดูกาลชัดเจนในกลุ่มนี้</div>';return;}
  let hh='<div class="hp-cal"><div class="hp-cal-r hd"><span></span>'+MON.map(o=>'<span>'+esc(o.short)+'</span>').join('')+'<span>สูงสุด</span></div>';
  rows.forEach(o=>{
    hh+='<div class="hp-cal-r" data-act="detail" data-id="'+o.x.id+'"><span class="nm" title="'+esc(o.x.label)+'">'+esc(trunc(o.x.name,26))+'</span>'+o.x[m].map((v,i)=>'<span class="c'+(i===o.pk?' pk':'')+'" style="--i:'+i+';background:color-mix(in srgb,var(--hp-a) '+Math.round(v/o.mx*88)+'%,transparent)" data-tip="'+esc(o.x.name+' · '+MON[i].label+'\n'+nf(v)+(m==='q'?' '+o.x.unit:m==='n'?' ครั้ง':' บาท'))+'"></span>').join('')+'<span class="pkl">'+esc(MON[o.pk].short)+' · '+o.ratio.toFixed(1)+'×</span></div>';
  });
  host.innerHTML=hh+'</div>';
}
function renderFbar(){
  const f=$('#hp-fbar');if(!f)return;
  const ch=[];
  if(S.view!=='ALL')ch.push('<span class="hp-fc">กลุ่ม: <b>'+esc(view().n)+'</b><button data-act="fclr" data-w="view" aria-label="ล้างตัวกรองกลุ่ม">×</button></span>');
  if(S.from!==1||S.to!==AV)ch.push('<span class="hp-fc">ช่วง: <b>'+esc(rangeLabel())+'</b><button data-act="fclr" data-w="range" aria-label="ล้างช่วงเวลา">×</button></span>');
  f.hidden=!ch.length;
  f.innerHTML=ch.length?'<span class="hp-note">กำลังกรอง:</span>'+ch.join('')+(ch.length>1?'<button class="hp-btn" data-act="fclr" data-w="all">ล้างทั้งหมด</button>':''):'';
}
function buildSummary(){
  const rows=scope(),m=S.metric,sv=series(rows,m),r=rg(sv),tot=sum(r),di=deltaInfo(sv),ci=makeCI(rows,m,di),mv=movers(rows,m,ci);
  const L=['สรุปการใช้ยา "'+view().n+'" ช่วง '+rangeLabel()+' (ปีงบประมาณ '+S.fy+') รพ.กรงปินัง',MN[m]+'รวม '+baht(tot)+(m==='n'?' ครั้ง':m==='q'?'':' บาท')+' เฉลี่ยเดือนละ '+baht(r.length?tot/r.length:0)];
  if(di)L.push('แนวโน้ม '+(isFinite(di.d)?(di.d>0?'+':'')+(di.d*100).toFixed(0)+'%':'เริ่มมีการใช้')+' ('+di.k+' เดือนท้ายเทียบ '+di.k+' เดือนแรก)');
  if(ci&&ci.mode==='yoy')L.push('เทียบปีงบ '+(S.fy-1)+' ช่วงเดียวกัน '+(isFinite(ci.d)?(ci.d>0?'+':'')+(ci.d*100).toFixed(0)+'%':'—')+' ('+baht(ci.b)+' เทียบ '+baht(ci.a)+' บาท)');
  if(mv.up.length)L.push('ยาที่ดันขึ้น: '+mv.up.slice(0,3).map(o=>o.x.name+' +'+baht(o.dd)).join(', '));
  if(mv.dn.length)L.push('ยาที่ลดลง: '+mv.dn.slice(0,3).map(o=>o.x.name+' −'+baht(-o.dd)).join(', '));
  const A=computeAlerts(rows);
  L.push('ควรทบทวน: พุ่งผิดปกติ '+A.spike.length+' · แนวโน้มเพิ่ม '+A.rise.length+' · นอกบัญชียังจ่าย '+A.off.length+' รายการ');
  return L.join('\n');
}
function copyText(t,btn){
  const o=btn.textContent;
  const done=()=>{btn.textContent='คัดลอกแล้ว ✓';setTimeout(()=>{btn.textContent=o;},1800);};
  const fb=()=>{try{const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();done();}catch(e){btn.textContent='คัดลอกไม่ได้';setTimeout(()=>{btn.textContent=o;},1800);}};
  try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,fb);else fb();}catch(e){fb();}
}
/* brush: drag on trend chart to choose months */
let BR=null;
function colAt(sv,cx){
  const rc=sv.getBoundingClientRect(),vb=sv.viewBox&&sv.viewBox.baseVal,sc=vb&&rc.width?vb.width/rc.width:1,x=(cx-rc.left)*sc;
  let best=null,bd=1e9;
  sv.querySelectorAll('[data-col]').forEach(n=>{const d=Math.abs(+n.dataset.gx-x);if(d<bd){bd=d;best=n;}});
  return best;
}
function brushDraw(){
  if(!BR)return;const lo=Math.min(BR.a,BR.b),hi=Math.max(BR.a,BR.b);
  const A=BR.sv.querySelector('[data-col="'+lo+'"]'),B=BR.sv.querySelector('[data-col="'+hi+'"]');if(!A||!B)return;
  let sel=BR.sv.querySelector('.hp-sel');
  if(!sel){sel=document.createElementNS('http://www.w3.org/2000/svg','rect');sel.setAttribute('class','hp-sel');sel.setAttribute('y','4');sel.setAttribute('rx','6');sel.setAttribute('pointer-events','none');BR.sv.appendChild(sel);}
  const x0=+A.getAttribute('x'),x1=+B.getAttribute('x')+(+B.getAttribute('width'));
  sel.setAttribute('x',x0);sel.setAttribute('width',x1-x0);sel.setAttribute('height',BR.sv.viewBox.baseVal.height-24);
}
document.addEventListener('pointerdown',e=>{
  const c=e.target.closest&&e.target.closest('#ov-trend [data-col]');if(!c||e.button>0)return;
  BR={sv:c.closest('svg'),a:+c.dataset.col,b:+c.dataset.col,moved:false,x0:e.clientX,id:e.pointerId};
  try{BR.sv.setPointerCapture(e.pointerId);}catch(err){}
});
document.addEventListener('pointermove',e=>{
  if(!BR)return;
  if(Math.abs(e.clientX-BR.x0)>8)BR.moved=true;
  const c=colAt(BR.sv,e.clientX);if(c)BR.b=+c.dataset.col;
  if(BR.moved)brushDraw();
});
function brushEnd(commit){
  if(!BR)return;const b=BR;BR=null;
  try{b.sv.releasePointerCapture(b.id);}catch(err){}
  const sel=b.sv.querySelector('.hp-sel');if(sel)sel.remove();
  if(commit&&b.moved&&b.a!==b.b){S.from=Math.min(b.a,b.b)+1;S.to=Math.min(AV,Math.max(b.a,b.b)+1);anim='data';go();}
}
document.addEventListener('pointerup',()=>brushEnd(true));
document.addEventListener('pointercancel',()=>brushEnd(false));

/* ---------- groups ---------- */
function renderGroups(){
  renderStack();renderCal();
  const m=S.metric;const all=sum(rg(series(D,m)));
  const cs=GR().map(c=>{const rows=D.filter(x=>gk(x)===c.code);const s=series(rows,m);const tp=rows.map(x=>({x:x,t:sum(rg(x[m]))})).filter(a=>a.t>0).sort((a,b)=>b.t-a.t).slice(0,3).map(a=>a.x.name);return {c:c,s:s,t:sum(rg(s)),di:deltaInfo(s),yy:HASP?(()=>{const pr=sum(rgp(series(rows,'p'+m))),cu=sum(rg(s));return pr>0?cu/pr-1:(cu>0?Infinity:null);})():null,n:rows.filter(x=>sum(rg(x.v))>0).length,all:rows.length,tp:tp};}).sort((a,b)=>b.t-a.t);
  $('#gr-n').textContent='เรียงตาม'+MN[m]+'ในช่วง '+rangeLabel()+' · กดการ์ดเพื่อเลือกดูกลุ่มนั้น · เครื่องหมาย ▲▼ เทียบเดือนท้ายกับเดือนแรกของช่วงที่เลือก';
  $('#gr-cards').innerHTML=cs.filter(a=>a.t>0||a.all>0).map(a=>{
    const dt=(a.di?deltaTag(a.di.d,true):'<span class="flat">—</span>')+(a.yy!=null?' <span class="hp-mut">· ปีก่อน</span> '+deltaTag(a.yy,true):'');
    return '<button class="hp-gc" style="--i:'+cs.indexOf(a)+';border-top:3px solid '+gcol(a.c.code)+'" data-act="pickcat" data-k="'+esc(a.c.code)+'" data-tip="'+esc(a.c.name+'\n'+nf(a.t)+' บาท\nยาที่มีการใช้ '+a.n+' จาก '+a.all+' รายการ')+'"><span class="t">'+esc(a.c.name)+(+a.c.chronic?' <span class="hp-badge b-mut">เรื้อรัง</span>':'')+'</span><span class="v">'+baht(a.t)+' <small class="hp-mut">บาท</small></span><span class="r"><span>'+(all?pct(a.t/all,1):'—')+' ของทั้งหมด · '+a.n+'/'+a.all+' รายการ<br>'+dt+'</span>'+spark(a.s.slice(0,AV),92,28,gcol(a.c.code))+'</span>'+(a.tp.length?'<span class="tp">ยาหลัก: '+a.tp.map(esc).join(', ')+'</span>':'')+'</button>';}).join('');
  const hx=cs.filter(a=>a.t>0);
  const gm=cs.filter(a=>a.di&&isFinite(a.di.d)&&a.t>=5000);const gu=gm.slice().sort((p,q)=>q.di.d-p.di.d)[0],gd=gm.slice().sort((p,q)=>p.di.d-q.di.d)[0];
  headline($('#gr-head'),'info','กลุ่มใหญ่สุด: <b>'+esc(hx[0]?hx[0].c.name:'—')+'</b> ('+(hx[0]&&all?pct(hx[0].t/all,0):'—')+' ของทั้งหมด)'+(gu&&gu.di.d>.1?' · เพิ่มเร็วสุด: <b class="up-bad">'+esc(gu.c.short)+' ▲'+pct(gu.di.d,0)+'</b>':'')+(gd&&gd.di.d<-.1?' · ลดมากสุด: <b class="dn-ok">'+esc(gd.c.short)+' ▼'+pct(-gd.di.d,0)+'</b>':''));
  let h='<table><thead><tr><th>กลุ่มยา</th>'+MON.map(x=>'<th>'+esc(x.short)+'</th>').join('')+'<th>รวม</th><th>แนวโน้ม</th></tr></thead><tbody>';
  hx.forEach(a=>{
    const mx=d3.max(a.s)||1;
    h+='<tr><td title="'+esc(a.c.name)+'">'+esc(a.c.short)+'</td>'+a.s.map((v,i)=>{const p=Math.round(v/mx*85);const inr=i+1>=S.from&&i+1<=S.to;return '<td data-tip="'+esc(a.c.name+' · '+MON[i].label+'\n'+nf(v)+' บาท')+'" style="--i:'+i+';background:color-mix(in srgb,'+gcol(a.c.code)+' '+p+'%,transparent);'+(inr?'':'opacity:.4')+'">'+(v>0?Math.round(v/1000):'·')+'</td>';}).join('')+'<td class="t">'+nf(a.t)+'</td><td>'+(a.di?deltaTag(a.di.d,true):'—')+'</td></tr>';
  });
  h+='</tbody></table>';$('#gr-heat').innerHTML=h;
}

function renderStack(){
  const m=S.metric,host=$('#gr-stack');
  const a=series(D.filter(x=>x.chronic),m),b=series(D.filter(x=>!x.chronic),m);
  const tt=a.map((v,i)=>v+b[i]),mx=d3.max(tt)||1;
  const W=Math.max(300,host.clientWidth||600),H=250;
  const y=d3.scaleLinear([0,mx*1.08],[H-26,10]).nice(),ticks=y.ticks(5);
  const lm=Math.max.apply(null,ticks.map(t=>nf(t).length))*6.6+14;
  const x=d3.scalePoint(d3.range(12),[lm+4,W-14]);
  const c1=colors()[0]||'var(--color-fg)',c2=colors()[1]||'var(--cds-chart-muted)';
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="สัดส่วนโรคเรื้อรังรายเดือน"><defs><linearGradient id="gs1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:'+c1+';stop-opacity:.9"/><stop offset="1" style="stop-color:'+c1+';stop-opacity:.45"/></linearGradient><linearGradient id="gs2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:'+c2+';stop-opacity:.85"/><stop offset="1" style="stop-color:'+c2+';stop-opacity:.4"/></linearGradient></defs>';
  ticks.forEach(t=>{s+='<line x1="'+lm+'" x2="'+(W-8)+'" y1="'+y(t)+'" y2="'+y(t)+'" style="stroke:var(--cds-chart-grid)"/><text class="hp-ax" x="'+(lm-6)+'" y="'+(y(t)+4)+'" text-anchor="end">'+nf(t)+'</text>';});
  const pa=a.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join('');
  const pt=tt.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join('');
  const back=a.map((v,i)=>'L'+x(11-i).toFixed(1)+' '+y(a[11-i]).toFixed(1)).join('');
  const base=d3.range(12).map(i=>'L'+x(11-i).toFixed(1)+' '+y(0)).join('');
  s+='<path class="hp-area" d="'+pt+d3.range(12).map(i=>'L'+x(11-i).toFixed(1)+' '+y(a[11-i]).toFixed(1)).join('')+'Z" style="fill:url(#gs2)"/>';
  s+='<path class="hp-area" d="'+pa+base+'Z" style="fill:url(#gs1)"/>';
  s+='<path class="hp-line" pathLength="1" d="'+pt+'" fill="none" style="stroke:'+c2+'" stroke-width="2"/><path class="hp-line" pathLength="1" d="'+pa+'" fill="none" style="stroke:'+c1+'" stroke-width="2.4"/>';
  d3.range(12).forEach(i=>{if(W>=460||i%2===0)s+='<text class="hp-ax" x="'+x(i)+'" y="'+(H-8)+'" text-anchor="middle">'+esc(MON[i].short)+'</text>';});
  s+='<line class="hp-guide" x1="0" x2="0" y1="6" y2="'+(H-22)+'"/>';
  const step=(W-lm-18)/11;
  d3.range(12).forEach(i=>{const t=tt[i]||1;
    s+='<rect data-col="'+i+'" data-gx="'+x(i).toFixed(1)+'" x="'+(x(i)-step/2).toFixed(1)+'" y="0" width="'+step.toFixed(1)+'" height="'+(H-20)+'" fill="transparent" data-tip="'+esc(MON[i].full+' '+MON[i].year+'\nโรคเรื้อรัง: '+nf(a[i])+' บาท ('+pct(a[i]/t,0)+')\nยากลุ่มอื่น: '+nf(b[i])+' บาท ('+pct(b[i]/t,0)+')')+'"/>';});
  s+='</svg>';host.innerHTML=s;
  const sh=a.map((v,i)=>tt[i]?v/tt[i]:0);
  $('#gr-stack-h').textContent='ยาโรคเรื้อรังคิดเป็น '+pct(sum(a)/(sum(tt)||1),0)+' ของ'+MN[m]+'ทั้งปี'+(d3.max(sh)-d3.min(sh)>.06?' · สัดส่วนแกว่ง '+pct(d3.min(sh),0)+'–'+pct(d3.max(sh),0):' · สัดส่วนคงที่ตลอดปี');
  $('#gr-stack-n').textContent='ทั้งโรงพยาบาล · ยาโรคเรื้อรังคิดเป็น '+pct(sum(a)/(sum(tt)||1),0)+' ของ'+MN[m]+'ทั้งปี (ต่ำสุด '+pct(d3.min(sh),0)+' สูงสุด '+pct(d3.max(sh),0)+') · '+'ส่วนล่าง = โรคเรื้อรัง ส่วนบน = ยากลุ่มอื่น';
  $('#gr-stack-lg').innerHTML='<span style="--c:'+c1+'">ยาโรคเรื้อรัง</span><span style="--c:'+c2+'">ยากลุ่มอื่น</span>';
}

/* ---------- drugs table ---------- */
function drugRows(){
  const rows=scope();const m=S.metric;const q=S.q.trim().toLowerCase();
  let list=rows.map(x=>{const tv=sum(rg(x.v)),tc=sum(rg(x.c)),tq=sum(rg(x.q)),tn=sum(rg(x.n));const di=deltaInfo(x[m]);const tot=m==='c'?tc:tv;return {x:x,tv:tv,tc:tc,tq:tq,tn:tn,tot:tot,share:tot,d:di?di.d:null,y:(()=>{if(!HASP)return null;const p=sum(rgp(x['p'+m])),cu=sum(rg(x[m]));return p>0?cu/p-1:(cu>0?Infinity:null);})()};});
  if(S.active)list=list.filter(o=>o.tv>0||o.tq>0);
  if(q)list=list.filter(o=>o.x.key.indexOf(q)>=0||o.x.gtxt.indexOf(q)>=0);
  const k=S.sort.k,dr=S.sort.d;
  const gv=o=>k==='label'?o.x.label.toLowerCase():k==='cat'?(gdef(o.x)?gdef(o.x).order:99):k==='d'?(o.d==null?-Infinity:(isFinite(o.d)?o.d:1e9)):k==='y'?(o.y==null?-Infinity:(isFinite(o.y)?o.y:1e9)):o[k];
  list.sort((a,b)=>{const A=gv(a),B=gv(b);return (A<B?-1:A>B?1:0)*dr;});
  return list;
}
function renderDrugs(){
  renderScatter();
  const m=S.metric;const list=drugRows();
  {const rs=scope(),dd=deltaInfo(series(rs,m)),mv=movers(rs,m,makeCI(rs,m,dd)),t0=sum(rg(series(rs,m)));
   headline($('#dr-head'),toneOf(dd,bad()),'<span class="hp-hl-t">'+esc(view().n)+'</span> ใช้งาน '+nf(rs.filter(x=>sum(rg(x.v))>0).length)+' จาก '+nf(rs.length)+' รายการ'+(mv.up.length&&mv.up[0].dd>=Math.max(3000,t0*.01)?' · เพิ่มมากสุด: <b class="up-bad">'+esc(mv.up[0].x.name)+' +'+baht(mv.up[0].dd)+'</b>':'')+(mv.dn.length&&-mv.dn[0].dd>=Math.max(3000,t0*.01)?' · ลดมากสุด: <b class="dn-ok">'+esc(mv.dn[0].x.name)+' −'+baht(-mv.dn[0].dd)+'</b>':'')+' · กดหัวคอลัมน์เพื่อเรียง');}const scopeTot=sum(rg(series(scope(),m)));
  $('#dr-h').textContent='รายการยา · '+view().n;
  $('#dr-n').textContent='พบ '+nf(list.length)+' รายการ · '+rangeLabel()+' · กดหัวคอลัมน์เพื่อเรียงลำดับ กดแถวเพื่อดูแนวโน้มรายเดือนของยาตัวนั้น · ปริมาณเป็นหน่วยของยาแต่ละรายการ';
  const th=(k,t,left)=>'<th><button data-act="sort" data-k="'+k+'">'+t+(S.sort.k===k?(S.sort.d<0?' ▼':' ▲'):'')+'</button></th>';
  let h='<table><thead><tr>'+th('label','ชื่อยา / ความแรง')+th('cat','กลุ่ม')+'<th>หน่วย</th>'+th('tq','ปริมาณ')+th('tv','มูลค่า (บาท)')+th('tc','ต้นทุน (บาท)')+th('share','สัดส่วน')+'<th>แนวโน้ม 12 เดือน</th>'+th('d','เปลี่ยนแปลง')+(HASP?th('y','เทียบปีงบ '+(S.fy-1)):'')+'</tr></thead><tbody>';
  list.slice(0,S.limit).forEach(o=>{
    const x=o.x;const sh=scopeTot?o.tot/scopeTot:0;
    h+='<tr data-act="detail" data-id="'+x.id+'"><td class="nm">'+esc(x.label)+(x.off?' <span class="hp-badge b-warn" title="ชื่อรายการระบุว่าไม่มีในบัญชียา/รพ. แต่ยังมีการจ่าย">นอกบัญชี?</span>':'')+'</td><td>'+esc(gshort(x))+'</td><td class="hp-mut">'+esc(x.unit)+'</td><td>'+nf(o.tq)+'</td><td>'+nf(o.tv)+'</td><td>'+nf(o.tc)+'</td><td>'+(sh>=.0005?pct(sh,1):'<0.1%')+'</td><td>'+spark(x[m].slice(0,AV),84,22)+'</td><td>'+(o.d==null?'—':deltaTag(o.d,true))+'</td>'+(HASP?'<td>'+(o.y==null?'—':deltaTag(o.y,true))+'</td>':'')+'</tr>';
  });
  h+='</tbody></table>';
  $('#dr-tbl').innerHTML=list.length?h:'<div class="hp-empty">ไม่พบรายการ</div>';
  $('#dr-more').innerHTML=list.length>S.limit?'<button class="hp-btn" data-act="more">แสดงเพิ่ม (อีก '+nf(list.length-S.limit)+' รายการ)</button><span class="hp-note">แสดง '+S.limit+' จาก '+nf(list.length)+' รายการ</span>':'';
}

function renderScatter(){
  const host=$('#sc'),rows=scope();
  const pts=rows.map(x=>({x:x,q:sum(rg(x.q)),v:sum(rg(x.v))})).filter(p=>p.q>0&&p.v>0);
  if(pts.length<3){host.innerHTML='<div class="hp-empty">ข้อมูลไม่พอสำหรับกราฟ</div>';$('#sc-n').textContent='';return;}
  const W=Math.max(300,host.clientWidth||600),H=Math.round(Math.min(380,Math.max(260,W*.5))),lm=58,bm=34;
  const qe=d3.extent(pts,p=>p.q),ve=d3.extent(pts,p=>p.v);
  const xs=d3.scaleLog([qe[0]*.7,qe[1]*1.4],[lm,W-16]),ys=d3.scaleLog([ve[0]*.7,ve[1]*1.4],[H-bm,10]);
  const dec=(a,b)=>{const o=[];for(let e=Math.floor(Math.log10(a));e<=Math.ceil(Math.log10(b));e++){const v=Math.pow(10,e);if(v>=a&&v<=b)o.push(v);}return o;};
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="มูลค่าเทียบปริมาณ">';
  dec.apply(null,xs.domain()).forEach(t=>{s+='<line x1="'+xs(t)+'" x2="'+xs(t)+'" y1="10" y2="'+(H-bm)+'" style="stroke:var(--cds-chart-grid)"/><text class="hp-ax" x="'+xs(t)+'" y="'+(H-bm+16)+'" text-anchor="middle">'+bahtS(t)+'</text>';});
  dec.apply(null,ys.domain()).forEach(t=>{s+='<line x1="'+lm+'" x2="'+(W-16)+'" y1="'+ys(t)+'" y2="'+ys(t)+'" style="stroke:var(--cds-chart-grid)"/><text class="hp-ax" x="'+(lm-6)+'" y="'+(ys(t)+4)+'" text-anchor="end">'+bahtS(t)+'</text>';});
  const xd=xs.domain(),yd=ys.domain();
  [.1,1,10,100,1000].forEach(p=>{const a=Math.max(xd[0],yd[0]/p),b=Math.min(xd[1],yd[1]/p);if(a<b){s+='<line x1="'+xs(a).toFixed(1)+'" y1="'+ys(a*p).toFixed(1)+'" x2="'+xs(b).toFixed(1)+'" y2="'+ys(b*p).toFixed(1)+'" style="stroke:var(--cds-chart-reference)" stroke-dasharray="4 5" opacity=".7"/><text class="hp-ax" x="'+(xs(b)-4).toFixed(1)+'" y="'+(ys(b*p)-5).toFixed(1)+'" text-anchor="end" style="font-size:10px">'+p+' บาท/หน่วย</text>';}});
  pts.forEach((p,i)=>{const up=p.v/p.q;s+='<circle class="hp-pt" data-act="detail" data-id="'+p.x.id+'" cx="'+xs(p.q).toFixed(1)+'" cy="'+ys(p.v).toFixed(1)+'" r="4.6" style="--i:'+(i%40)+';fill:'+gcol(gk(p.x))+'" data-tip="'+esc(p.x.label+'\nปริมาณ '+nf(p.q)+' '+p.x.unit+'\nมูลค่า '+nf(p.v)+' บาท\nเฉลี่ย '+(up>=100?nf(up):nf1(up))+' บาท/หน่วย')+'"/>';});
  s+='<text class="hp-ax" x="'+((lm+W-16)/2)+'" y="'+(H-4)+'" text-anchor="middle">ปริมาณที่จ่าย (หน่วยนับของแต่ละรายการ) →</text><text class="hp-ax" transform="translate(12 '+((H-bm)/2)+') rotate(-90)" text-anchor="middle">มูลค่า (บาท) →</text></svg>';
  host.innerHTML=s;
  const top=pts.filter(p=>p.v>=5000).map(p=>({p:p,u:p.v/p.q})).sort((a,b)=>b.u-a.u).slice(0,3);
  $('#sc-h').textContent='ยา '+nf(pts.length)+' รายการ'+(top.length?' · ราคาต่อหน่วยสูงสุด: '+top[0].p.x.name+' '+nf(top[0].u)+' บาท/'+top[0].p.x.unit:'');
  $('#sc-n').textContent='แต่ละจุดคือยา 1 รายการ สีเข้ม = กลุ่มที่ใช้เงินมาก · ยิ่งอยู่ซ้ายบน ยิ่งราคาต่อหน่วยสูง (เส้นประ = เส้นราคาเฉลี่ยเท่ากัน) · เทียบข้ามยาที่หน่วยนับต่างกัน (เม็ด/ขวด/หลอด) ได้เฉพาะเป็นภาพรวม'+(top.length?' · ราคาต่อหน่วยสูงสุด (มูลค่า ≥ 5,000 บาท): '+top.map(o=>o.p.x.name+' '+nf(o.u)+' บาท/'+o.p.x.unit).join(', '):'');
}

/* ---------- detail ---------- */
function renderDetail(){
  const host=$('#hp-detail');
  const x=S.detail!=null?byId[S.detail]:null;
  if(!x){host.hidden=true;host.innerHTML='';return;}
  host.hidden=false;
  const dm=S.dm;const arr=x[dm];const r=rg(arr);const tot=sum(r),avg=r.length?tot/r.length:0;
  let pk=0;r.forEach((v,i)=>{if(v>r[pk])pk=i;});
  const di=deltaInfo(arr);const c=catBy[x.cat];
  const inCmp=S.cmp.indexOf(x.id)>=0;
  host.className='hp-detail';
  host.innerHTML='<div class="hp-dh"><div><div class="hp-lab">กลุ่มโรค: '+esc(c?c.name:x.cat)+' · อาการ: '+esc(symBy[x.sym]?symBy[x.sym].name:'')+(x.off?' · <span class="b-warn">ชื่อรายการระบุว่าไม่มีในบัญชียา/รพ.</span>':'')+'</div><h2>'+esc(x.label)+'</h2><div class="hp-note">หน่วยนับ: '+esc(x.unit||'—')+' · ชื่อในรายงาน: '+esc(x.raw)+'</div></div><div class="hp-inl"><button class="hp-btn pri" data-act="cmpadd" data-id="'+x.id+'" '+(inCmp?'disabled':'')+'>'+(inCmp?'อยู่ในการเปรียบเทียบแล้ว':'เพิ่มเข้าเปรียบเทียบ')+'</button><button class="hp-btn" data-act="close">ปิด</button></div></div>'+
   '<div class="hp-kpis">'+kpi('รวม'+MN[dm]+' ('+esc(rangeLabel())+')',unitFmt(tot,dm)+(dm==='q'?' <small>'+esc(x.unit)+'</small>':dm==='n'?'':' <small>บาท</small>'),dm==='v'||dm==='c'?'ต้นทุน '+baht(sum(rg(x.c)))+' · ปริมาณ '+nf(sum(rg(x.q)))+' '+esc(x.unit):'')+kpi('เฉลี่ยต่อเดือน',unitFmt(avg,dm),'จาก '+r.length+' เดือน')+kpi('เดือนสูงสุด',esc(mlab(S.from-1+pk)),unitFmt(r[pk],dm))+kpi('แนวโน้ม',di?deltaTag(di.d,true):'—',di?di.k+' เดือนท้าย เทียบ '+di.k+' เดือนแรก':'')+
   (HASP?(()=>{const py=sum(rgp(x['p'+dm]));return kpi('เทียบปีงบ '+(S.fy-1),py>0?deltaTag(tot/py-1,true):(tot>0?deltaTag(Infinity,true):'—'),'ช่วงเดียวกัน '+unitFmt(py,dm));})():'')+
   (dm==='v'||dm==='c'?kpi('ราคาเฉลี่ยต่อหน่วย',sum(rg(x.q))>0?nf1(sum(rg(x[dm]))/sum(rg(x.q)))+' <small>บาท</small>':'—',dm==='v'?'มูลค่า ÷ ปริมาณ':'ต้นทุน ÷ ปริมาณ'):'')+'</div>'+
   '<div class="hp-seg" id="dt-m">'+['v','c','q','n'].map(k=>'<button data-act="dmetric" data-m="'+k+'" aria-pressed="'+(k===dm)+'">'+MN[k]+'</button>').join('')+'</div><div class="hp-svg" id="dt-chart" style="min-height:240px"></div><div class="hp-tw" style="max-height:none"><table><thead><tr><th>เดือน</th>'+MON.map(o=>'<th>'+esc(o.short)+'</th>').join('')+'</tr></thead><tbody>'+['v','c','q','n'].map(k=>'<tr><td>'+MN[k]+'</td><td class="hp-mut"></td>'+'</tr>').join('')+'</tbody></table></div>';
  // monthly table: build properly (months across columns)
  const tb=['v','c','q','n'].map(k=>'<tr><td style="text-align:left">'+(k==='q'?'ปริมาณ ('+esc(x.unit)+')':MN[k])+'</td>'+x[k].map((v,i)=>'<td'+(i+1>=S.from&&i+1<=S.to?'':' class="hp-mut"')+'>'+nf(v)+'</td>').join('')+'</tr>').join('');
  const tw=$('.hp-tw',host);tw.innerHTML='<table><thead><tr><th style="text-align:left">รายการ</th>'+MON.map(o=>'<th>'+esc(o.short)+'</th>').join('')+'</tr></thead><tbody>'+tb+'</tbody></table>';
  $$('#dt-m button',host).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===dm)));
  barChart($('#dt-chart'),arr,{h:240,ma:true,prev:HASP?x['p'+dm]:null,flags:flagsOf(arr),aria:'แนวโน้มรายเดือนของ '+x.label,tip:i=>MON[i].full+' '+MON[i].year+'\n'+MN[dm]+': '+nf(arr[i])+(dm==='q'?' '+x.unit:dm==='n'?' ครั้ง':' บาท')});
}

/* ---------- compare ---------- */
function renderCompare(){
  const pal=colors();const list=S.cmp.map(id=>byId[id]).filter(Boolean);
  $('#cm-chips').innerHTML=list.map((x,i)=>'<span class="hp-cc"><i style="background:'+(pal[i%pal.length]||'var(--color-fg)')+'"></i>'+esc(x.label)+'<button data-act="cmprm" data-id="'+x.id+'" aria-label="เอาออก">×</button></span>').join('');
  const host=$('#cm-chart');
  if(!list.length){host.innerHTML='<div class="hp-empty">ยังไม่ได้เลือกยา ค้นหาชื่อยาด้านบน หรือกด “เติมยา 5 อันดับแรกของกลุ่มที่เลือก”</div>';$('#cm-tbl').innerHTML='';$('#cm-note').textContent='';return;}
  const m=S.cm;
  lineChart(host,list.map((x,i)=>({name:x.name,vals:x[m],color:pal[i%pal.length]||'var(--color-fg)'})),m);
  $('#cm-note').textContent=m==='q'?'ปริมาณเทียบจากหน่วยนับของแต่ละรายการ หากหน่วยต่างกัน (เช่น เม็ด กับ ขวด) ให้ดูมูลค่าเป็นหลัก':'เส้นแสดงค่ารายเดือนตลอดปีงบประมาณ ตารางด้านล่างคำนวณเฉพาะช่วง '+rangeLabel();
  let h='<table><thead><tr><th>ชื่อยา</th><th>กลุ่ม</th><th>หน่วย</th><th>รวมในช่วง</th><th>เฉลี่ย/เดือน</th><th>เดือนสูงสุด</th><th>แนวโน้ม</th><th>เปลี่ยนแปลง</th></tr></thead><tbody>';
  list.forEach((x,i)=>{const r=rg(x[m]);const t=sum(r);let pk=0;r.forEach((v,j)=>{if(v>r[pk])pk=j;});const di=deltaInfo(x[m]);
    h+='<tr data-act="detail" data-id="'+x.id+'"><td class="nm"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;background:'+(pal[i%pal.length]||'var(--color-fg)')+'"></i>'+esc(x.label)+'</td><td>'+esc(gshort(x))+'</td><td class="hp-mut">'+esc(x.unit)+'</td><td>'+nf(t)+'</td><td>'+nf(r.length?t/r.length:0)+'</td><td>'+esc(mlab(S.from-1+pk))+' ('+nf(r[pk])+')</td><td>'+spark(x[m].slice(0,AV),84,22,pal[i%pal.length])+'</td><td>'+(di?deltaTag(di.d,true):'—')+'</td></tr>';});
  $('#cm-tbl').innerHTML=h+'</tbody></table>';
}

/* ---------- alerts ---------- */
function computeAlerts(rows){
  const out={spike:[],rise:[],fall:[],stop:[],off:[],idle:[]};
  rows.forEach(x=>{
    const v=x.v.slice(0,AV),T=sum(v);
    if(T<=0){out.idle.push(x);return;}
    if(x.off)out.off.push(x);
    if(T>=20000&&AV>=6){
      const fl=[];
      for(let i=0;i<AV;i++){
        const oth=v.filter((_,j)=>j!==i);const med=d3.median(oth),mean=d3.mean(oth),sd=d3.deviation(oth)||0;
        const ex=v[i]-med;
        if(v[i]>=2*med&&ex>=8000&&(sd===0||(v[i]-mean)/sd>=2))fl.push({i:i,ex:ex,med:med});
      }
      if(fl.length&&fl.length<=2){const b=fl.reduce((p,c)=>c.ex>p.ex?c:p);out.spike.push({x:x,b:b,n:fl.length,ex:b.ex});}
    }
    const a=AV>=6?sum(v.slice(0,3)):0,b=AV>=6?sum(v.slice(-3)):0;
    if(b===0&&a>=10000)out.stop.push({x:x,a:a,b:b,ex:a});
    else if(b>=1.5*a&&b-a>=10000)out.rise.push({x:x,a:a,b:b,ex:b-a});
    else if(b<=.6*a&&a-b>=10000)out.fall.push({x:x,a:a,b:b,ex:a-b});
  });
  Object.keys(out).forEach(k=>{if(k==='off')out[k].sort((p,q)=>sum(q.v)-sum(p.v));else if(k==='idle')out[k].sort((p,q)=>p.label<q.label?-1:1);else out[k].sort((p,q)=>q.ex-p.ex);});
  return out;
}
function alertCard(kind,badge,cls,x,text){
  return '<article class="hp-al sv-'+cls.slice(2)+'"><div class="hp-al-h"><span class="hp-badge '+cls+'">'+badge+'</span><b>'+esc(x.label)+'</b><span class="hp-mut">'+esc(gshort(x))+'</span></div><p>'+text+'</p><div class="sp">'+spark(x.v.slice(0,AV),92,28,cls==='b-ok'?'var(--color-ok)':cls==='b-bad'?'var(--color-bad)':C0())+'<button class="hp-btn" data-act="detail" data-id="'+x.id+'">ดูรายเดือน</button></div></article>';
}
function renderAlerts(){
  const rows=scope();const A=computeAlerts(rows);
  const total=sum(series(rows,'v'));
  $('#al-h').textContent='ความผิดปกติและข้อสังเกต · '+view().n;
  headline($('#al-head'),(A.spike.length+A.rise.length)?'bad':'ok','ควรทบทวน: <b>'+A.spike.length+'</b> รายการพุ่งผิดปกติ · <b>'+A.rise.length+'</b> รายการแนวโน้มเพิ่ม · <b>'+(A.fall.length+A.stop.length)+'</b> รายการลด/หยุดจ่าย · <b>'+A.off.length+'</b> รายการนอกบัญชีแต่ยังจ่าย');
  $('#al-n').textContent='ดูจากมูลค่ารายเดือนของยาแต่ละตัวตลอดทั้งปีงบประมาณ ไม่ขึ้นกับช่วงเวลาที่เลือก เพื่อให้เห็นรูปแบบของทั้งปี เกณฑ์ที่ใช้: พุ่งสูง = เดือนที่มูลค่าตั้งแต่ 2 เท่าของค่ามัธยฐานเดือนอื่น และส่วนเกินอย่างน้อย 8,000 บาท · เพิ่ม/ลด = 3 เดือนท้ายเทียบ 3 เดือนแรก เปลี่ยนตั้งแต่ 50% / 40% และต่างกันอย่างน้อย 10,000 บาท ผลที่ได้เป็นแค่สัญญาณให้ไปตรวจสอบต่อ ยังไม่ใช่ข้อสรุป';
  const sv=A.spike.reduce((t,a)=>t+a.ex,0),rs=A.rise.reduce((t,a)=>t+(a.b-a.a),0),fl=A.fall.reduce((t,a)=>t+(a.a-a.b),0)+A.stop.reduce((t,a)=>t+a.a,0);
  const offUse=A.off.reduce((t,x)=>t+sum(x.v),0);
  const sm=[];
  sm.push(['bad','พุ่งสูงเฉพาะบางเดือน',A.spike.length+' รายการ ส่วนที่สูงเกินปกติรวมกันประมาณ '+baht(sv)+' บาท']);
  sm.push(['bad','ใช้เพิ่มขึ้นต่อเนื่อง',A.rise.length+' รายการ เพิ่มขึ้นรวมราว '+baht(rs)+' บาทเมื่อเทียบ 3 เดือนท้ายกับ 3 เดือนแรก']);
  sm.push(['ok','ลดลงหรือหยุดจ่าย',(A.fall.length+A.stop.length)+' รายการ ลดลงรวมราว '+baht(fl)+' บาทใน 3 เดือน ควรเช็กด้วยว่าลดจริงหรือยาขาดสต็อก']);
  sm.push(['warn','ชื่อระบุว่าไม่มีในบัญชียา',A.off.length+' รายการยังมีการจ่ายอยู่ รวม '+baht(offUse)+' บาท'+(total?' (ราว '+pct(offUse/total,1)+' ของมูลค่ากลุ่มนี้)':'')]);
  sm.push(['info','ไม่มีการจ่ายเลยทั้งปี',A.idle.length+' จาก '+rows.length+' รายการ น่าจะใช้ประกอบการทบทวนบัญชียาและเคลียร์รายการค้างในระบบได้']);
  $('#al-sum').innerHTML=sm.map(a=>'<div class="hp-in '+(a[0]==='info'?'':a[0])+'"><i></i><div><b>'+a[1]+'</b> · '+a[2]+'</div></div>').join('');
  const sec=(t,n,items)=>'<div class="hp-card"><h2>'+t+' <span class="hp-mut">('+items.length+')</span></h2><p class="hp-note">'+n+'</p>'+(items.length?'<div class="hp-grid w2">'+items.join('')+'</div>':'<div class="hp-empty">ไม่พบรายการตามเกณฑ์ในกลุ่มนี้</div>')+'</div>';
  const lim=a=>a.slice(0,12);
  let h='';
  h+=sec('พุ่งสูงผิดปกติเฉพาะเดือน','ที่พบบ่อยคือช่วงระบาด (เช่น ไข้หวัดใหญ่กับ oseltamivir) แคมเปญวัคซีน ผู้ป่วยรายใหญ่ ใบสั่งซ้ำ หรือบันทึกผิด ลองเทียบกับเวชระเบียนและแผนจัดซื้อดู',lim(A.spike).map(a=>{
    const x=a.x,med=a.b.med,ratio=med>0?(x.v[a.b.i]/med):Infinity;
    return alertCard('spike','พุ่งสูง','b-bad',x,'เดือน<b>'+esc(mlab(a.b.i))+'</b> มูลค่า <b>'+nf(x.v[a.b.i])+' บาท</b> '+(isFinite(ratio)?'สูงเป็น <b>'+ratio.toFixed(1)+' เท่า</b> ของเดือนทั่วไป (ปกติราว '+nf(med)+' บาท)':'ทั้งที่เดือนอื่นแทบไม่มีการใช้เลย')+' ส่วนที่เกินราว '+nf(a.ex)+' บาท'+(a.n>1?' (เกิดขึ้น '+a.n+' เดือน)':'')+' ทั้งปีรวม '+nf(sum(x.v))+' บาท');}));
  h+=sec('แนวโน้มใช้เพิ่มขึ้น','เปรียบเทียบ 3 เดือนท้ายปีงบประมาณ ('+mlab(AV-3)+' – '+mlab(AV-1)+') กับ 3 เดือนแรก ('+mlab(0)+' – '+mlab(2)+') ลองทบทวนข้อบ่งใช้ ทางเลือกที่ราคาต่ำกว่า และปริมาณต่อใบสั่งดู',lim(A.rise).map(a=>alertCard('rise','เพิ่มขึ้น','b-bad',a.x,'3 เดือนแรกใช้ '+nf(a.a)+' บาท 3 เดือนท้ายเป็น <b>'+nf(a.b)+' บาท</b> '+(a.a>0?'(เพิ่มขึ้น <b>'+pct(a.b/a.a-1,0)+'</b>)':'(ช่วงแรกไม่มีการใช้)')+' ต่างกัน +'+nf(a.b-a.a)+' บาท')));
  h+=sec('ใช้ลดลงหรือหยุดจ่าย','ลดลงได้ทั้งจากมาตรการที่ทำไว้หรือการเปลี่ยนไปใช้ยาตัวอื่น แต่ก็อาจเป็นเพราะยาขาดสต็อกหรือเปลี่ยนบัญชียา ควรเช็กก่อนสรุป',lim(A.stop.concat(A.fall).sort((p,q)=>q.ex-p.ex)).map(a=>alertCard('fall',a.b===0?'หยุดจ่าย':'ลดลง','b-ok',a.x,'3 เดือนแรกใช้ '+nf(a.a)+' บาท 3 เดือนท้ายเหลือ <b>'+nf(a.b)+' บาท</b> '+(a.b===0?'(ไม่มีการจ่ายเลยใน 3 เดือนท้าย)':'(ลดลง <b>'+pct(1-a.b/a.a,0)+'</b>)')+' ต่างกัน −'+nf(a.a-a.b)+' บาท')));
  h+=sec('ชื่อรายการระบุว่าไม่มีในบัญชียา/รพ. แต่ยังมีการจ่าย','เรียงตามมูลค่า อาจเป็นยานอกบัญชีที่จัดหาเฉพาะราย ยาที่คัดออกแล้วแต่ชื่อในระบบยังไม่เปลี่ยน หรือยาที่ต้องส่งต่อ น่าตรวจดู เพราะเป็นจุดที่คุมค่าใช้จ่ายได้',lim(A.off).map(x=>alertCard('off','นอกบัญชี?','b-warn',x,'ทั้งปีรวม <b>'+nf(sum(x.v))+' บาท</b> ปริมาณ '+nf(sum(x.q))+' '+esc(x.unit)+' จ่ายใน '+x.v.filter(t=>t>0).length+' เดือน (ชื่อในระบบ: '+esc(x.raw)+')')));
  const idleTxt=A.idle.length?'<div class="hp-card"><h2>ไม่มีการเคลื่อนไหวทั้งปี <span class="hp-mut">('+A.idle.length+')</span></h2><p class="hp-note">รายการที่มีในรายงานแต่ไม่มีการจ่ายเลย 12 เดือน ใช้ประกอบการทบทวนบัญชียาและลดรายการค้างระบบ</p><div class="hp-inl" style="gap:6px">'+A.idle.slice(0,60).map(x=>'<span class="hp-badge b-mut" title="'+esc(x.raw)+'">'+esc(x.name)+'</span>').join('')+(A.idle.length>60?'<span class="hp-note">และอีก '+(A.idle.length-60)+' รายการ</span>':'')+'</div></div>':'';
  $('#al-body').innerHTML=h+idleTxt;
}

/* ---------- search dropdown ---------- */
function matches(q,lim){
  q=q.trim().toLowerCase();if(!q)return [];
  return D.filter(x=>x.key.indexOf(q)>=0).sort((a,b)=>sum(b.v)-sum(a.v)).slice(0,lim||10);
}
function showRes(box,q,act){
  const m=matches(q);
  if(!q.trim()){box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;
  box.innerHTML=m.length?m.map(x=>'<button data-act="'+act+'" data-id="'+x.id+'"><span>'+esc(x.label)+'</span><small>'+esc(gshort(x))+' · '+nf(sum(x.v))+' บาท</small></button>').join(''):'<div class="hp-empty">ไม่พบชื่อยา</div>';
}

/* ---------- events ---------- */
function setView(k){if(viewBy[k]){S.view=k;S.limit=80;}}
function go(){render();}
document.addEventListener('click',e=>{
  const root=$('#hp');if(!root||!root.contains(e.target)){return;}
  const gres=$('#hp-gres'),cres=$('#hp-cres');
  if(!e.target.closest('.hp-gs')){gres.hidden=true;cres.hidden=true;}
  const el=e.target.closest('[data-act]');if(!el)return;
  const a=el.dataset.act;
  if(a==='tab'){S.tab=el.dataset.t;}
  else if(a==='view'){setView(el.dataset.k);}
  else if(a==='mode'){setMode(el.dataset.m);}
  else if(a==='pickcat'){const k=el.dataset.k;setView(S.mode==='dis'&&k==='resp_shared'?'COPD':k);S.tab='overview';scrollTop();}
  else if(a==='racep'){raceToggle();return;}
  else if(a==='more2'){S.more=!S.more;}
  else if(a==='insall'){S.insAll=!S.insAll;}
  else if(a==='copy'){copyText(buildSummary(),el);return;}
  else if(a==='fclr'){const w=el.dataset.w;if(w!=='range')S.view='ALL';if(w!=='view'){S.from=1;S.to=AV;}S.limit=80;}
  else if(a==='pres'){S.pres=!S.pres;try{if(S.pres&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});else if(!S.pres&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});}catch(err){}}
  else if(a==='print'){try{window.print();}catch(err){}return;}
  else if(a==='metric'){S.metric=el.dataset.m;}
  else if(a==='quick'){S.from=+el.dataset.a;S.to=Math.min(+el.dataset.b,AV);}
  else if(a==='fy'){setFY(+el.dataset.y);rebuildRange();}
  else if(a==='cmpm'){S.cmpm=el.dataset.m;}
  else if(a==='detail'){S.detail=+el.dataset.id;S.dm=S.dm||'v';gres.hidden=true;cres.hidden=true;$('#hp-gs').value='';render();const d=$('#hp-detail');if(d&&d.scrollIntoView)d.scrollIntoView({block:'nearest'});return;}
  else if(a==='close'){S.detail=null;}
  else if(a==='dmetric'){S.dm=el.dataset.m;}
  else if(a==='sort'){const k=el.dataset.k;S.sort=S.sort.k===k?{k:k,d:-S.sort.d}:{k:k,d:(k==='label'||k==='cat')?1:-1};}
  else if(a==='more'){S.limit+=120;}
  else if(a==='togactive'){S.active=!S.active;}
  else if(a==='cmpadd'){const id=+el.dataset.id;if(S.cmp.indexOf(id)<0&&S.cmp.length<6)S.cmp.push(id);$('#hp-cq').value='';cres.hidden=true;if(el.closest('#hp-detail')){S.tab='compare';}}
  else if(a==='cmprm'){S.cmp=S.cmp.filter(i=>i!==+el.dataset.id);}
  else if(a==='cmpclear'){S.cmp=[];}
  else if(a==='cmptop'){const top=scope().slice().sort((p,q)=>sum(rg(q.v))-sum(rg(p.v))).slice(0,5).map(x=>x.id);S.cmp=top;}
  else if(a==='cmetric'){S.cm=el.dataset.m;}
  anim=(a==='tab'||a==='pickcat'||a==='fy')?'tab':'data';go();
});
function scrollTop(){const r=$('#hp-filters');if(r&&r.scrollIntoView)r.scrollIntoView({block:'start'});}
document.addEventListener('change',e=>{
  if(e.target.id==='hp-from'){S.from=+e.target.value;if(S.to<S.from)S.to=S.from;anim='data';go();}
  if(e.target.id==='hp-to'){S.to=+e.target.value;if(S.from>S.to)S.from=S.to;anim='data';go();}
});
document.addEventListener('input',e=>{
  if(e.target.id==='hp-gs')showRes($('#hp-gres'),e.target.value,'detail');
  else if(e.target.id==='hp-cq')showRes($('#hp-cres'),e.target.value,'cmpadd');
  else if(e.target.id==='hp-race-sl'){raceStop();raceFrame(+e.target.value);}
  else if(e.target.id==='hp-tg'){const v=Math.max(0,Math.round(+String(e.target.value).replace(/[^0-9.]/g,''))||0);S.target=v;saveT(v);renderOverview();}
  else if(e.target.id==='hp-q'){S.q=e.target.value;S.limit=80;renderDrugs();}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#hp-gres').hidden=true;$('#hp-cres').hidden=true;}});

/* ---------- tooltip ---------- */
const tip=()=>$('#hp-tip');
function tipText(el,html){const t=tip();if(!t)return;if(html){t.innerHTML=html.split('\n').map((l,i)=>i===0?l:esc(l).replace(/&lt;/g,'<')).join('<br>');}}
document.addEventListener('mousemove',e=>{
  const root=$('#hp');const t=tip();if(!root||!t)return;
  hoverCol(e.target);
  const el=e.target.closest&&e.target.closest('[data-tip],[data-tipx]');
  if(!el||!root.contains(el)){t.hidden=true;return;}
  if(el.dataset.tipx){t.innerHTML=el.dataset.tipx.split('\n').map((l,i)=>i===0?l:esc(l)).join('<br>');}
  else{const lines=el.dataset.tip.split('\n');t.innerHTML='<b>'+esc(lines[0])+'</b>'+(lines.length>1?'<br>'+lines.slice(1).map(esc).join('<br>'):'');}
  t.hidden=false;
  const rb=root.getBoundingClientRect();
  let x=e.clientX-rb.left+14,y=e.clientY-rb.top+16;
  const w=t.offsetWidth,h=t.offsetHeight;
  if(x+w>rb.width-4)x=Math.max(4,e.clientX-rb.left-w-14);
  if(y+h>root.scrollHeight)y=Math.max(4,y-h-30);
  t.style.left=x+'px';t.style.top=y+'px';
});
document.addEventListener('scroll',()=>{const t=tip();if(t)t.hidden=true;},true);

/* ---------- main ---------- */

function tabInd(){
  const nav=$('#hp-tabs');if(!nav)return;const b=nav.querySelector('[aria-selected=true]');if(!b)return;
  nav.style.setProperty('--tx',b.offsetLeft+'px');nav.style.setProperty('--tw',b.offsetWidth+'px');
}
let rvT=null;
function reveal(){
  if(reduced()||!window.IntersectionObserver)return;
  const vh=window.innerHeight||800;
  const els=$$('#hp .hp-sec:not([hidden]) .hp-card, #hp .hp-sec:not([hidden]) .hp-kpi, #hp .hp-sec:not([hidden]) .hp-gc').filter(e=>!e.dataset.rv);
  const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});},{threshold:.06});
  els.forEach((e,i)=>{e.dataset.rv='1';const r=e.getBoundingClientRect();if(r.top>vh*.95){e.classList.add('rv');e.style.setProperty('--d',(Math.min(i,4)*60)+'ms');io.observe(e);}});
  clearTimeout(rvT);rvT=setTimeout(()=>{$$('#hp .rv').forEach(e=>e.classList.add('in'));},3500);
}
function render(){
  if(!prep())return;
  const rt=$('#hp');
  if(rt){const p=colors();['a','b','c','d'].forEach((k,i)=>rt.style.setProperty('--hp-'+k,p[i]||'var(--color-fg)'));
    if(anim==='tab'){rt.classList.add('go');clearTimeout(animT);animT=setTimeout(()=>rt.classList.remove('go'),2200);}}
  animNow=anim;anim=null;
  computeGI();
  syncControls();renderFbar();
  if(rt)rt.classList.toggle('pres',!!S.pres);
  if(S.tab!=='overview'||S.pres)raceStop();
  if(S.pres){renderPres();countUps();return;}
  renderDetail();
  if(S.tab==='overview')renderOverview();
  else if(S.tab==='groups')renderGroups();
  else if(S.tab==='drugs')renderDrugs();
  else if(S.tab==='compare')renderCompare();
  else if(S.tab==='alerts')renderAlerts();
  countUps();
  tabInd();reveal();
}
window.addEventListener('resize',tabInd);
dash.onData(render);
})();

