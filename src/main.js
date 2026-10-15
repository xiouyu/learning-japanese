import './styles.css';
import { STEPS, ROADMAP, GOJUON, TOTAL } from './data/index.js';
import { $, esc, shuffle, toKata, glyphs, SPK, toast } from './lib/utils.js';
import { store } from './lib/store.js';
import { speak } from './lib/speech.js';
import { Pad } from './lib/pad.js';

/* ===== helpers ===== */
const ALL_KANA = STEPS.flatMap(s=>s.kana.map(k=>({...k,step:s.id})));
const BASE = new Set(GOJUON.flatMap(r=>r[1].filter(Boolean).map(c=>c[0])));
const BASE_K = new Set([...BASE].map(toKata));
/* 字卡、測驗上的字數變多時（例如 おばあさん），自動縮小字級 */
function sqStyle(t){ const n=glyphs(t); if(n<=1) return ''; const v={2:[28,6,44],3:[20,4.2,32],4:[16,3.2,25],5:[13,2.6,20]}[n]||[11,2.1,17]; return ` style="font-size:clamp(${v[0]}px,${v[1]}vw,${v[2]}px)"`; }
const fitPx = (t,base,room)=>`min(${base}px, calc(min(100vw - 96px, ${room}px) / ${glyphs(t)*1.05}))`;
const PASS = 8, QN = 10;   // 解鎖測驗：10 題答對 8 題

/* ===== 個人進度：存在每個人自己的瀏覽器，分享網址給朋友時，朋友會從第 1 步開始 =====
   passed = 已經通過解鎖測驗的步數；curU() = 目前能學到第幾步 */
let passed = store.get('passed', null);
if(passed===null){
  const legacy = store.get('seen',0);   // 舊版網站留下的紀錄：當時正在學第 seen 步
  passed = legacy>0 ? legacy-1 : 0;
  store.set('passed',passed);
}
passed = Math.max(0, Math.min(+passed||0, STEPS.length));
const curU = ()=> Math.min(passed+1, STEPS.length);
const availSet = ()=> new Set(ALL_KANA.filter(k=>k.step<=curU()).map(k=>k.k));
const stepLabel = n=>{ const s=STEPS.find(x=>x.id===n); if(s) return s.row; const r=ROADMAP.find(x=>x.n===n); return r?(r.row||r.t):''; };

/* ===== scope (shared by flash & quiz) ===== */
let scope = store.get('scope', []);
if(!Array.isArray(scope)) scope=[];
scope = scope.filter(id=>id<=curU() && STEPS.some(s=>s.id===id));
let curStep = Math.min(store.get('step',1), curU());
let curKana = 0;
/* 新解鎖一步時：學習頁跳到最新一步，練習範圍加入新的一行 */
function syncNew(){
  const U=curU(), last=store.get('lastU',0);
  if(U>last){
    curStep=U; curKana=0; store.set('step',U);
    STEPS.forEach(s=>{ if(s.id>last && s.id<=U && !scope.includes(s.id)) scope.push(s.id); });
    store.set('lastU',U);
  }
  scope = scope.filter(id=>id<=U);
  if(!scope.length) scope=STEPS.filter(s=>s.id<=U).map(s=>s.id);
  scope.sort((a,b)=>a-b); store.set('scope',scope);
}
function scopeHTML(){
  const av=STEPS.filter(s=>s.id<=curU());
  return `<div class="row" aria-label="練習範圍"><span class="muted" style="font-size:14px">範圍</span>
    ${av.length>1?`<button class="chip ghostchip" data-scope-all>全部</button><button class="chip ghostchip" data-scope-cur>只練最新一步</button>`:''}
    ${av.map(s=>`<button class="chip" data-scope="${s.id}" aria-pressed="${scope.includes(s.id)}"><span class="kn">${s.row}</span></button>`).join('')}</div>`;
}
function pool(){ return ALL_KANA.filter(k=>scope.includes(k.step) && k.step<=curU()); }
function onScope(e,after){
  if(e.target.closest('[data-scope-all]')){ scope=STEPS.filter(s=>s.id<=curU()).map(s=>s.id); store.set('scope',scope); after(); return true; }
  if(e.target.closest('[data-scope-cur]')){ scope=[curU()]; store.set('scope',scope); after(); return true; }
  const b=e.target.closest('[data-scope]'); if(!b) return false;
  const id=+b.dataset.scope;
  if(scope.includes(id)){ if(scope.length===1){ toast('至少要選一行'); return true; } scope=scope.filter(x=>x!==id); }
  else scope=[...scope,id].sort((a,b)=>a-b);
  store.set('scope',scope); after(); return true;
}

/* ===== header progress ===== */
function renderProgress(){
  const U=curU();
  const row=(label,set)=>{
    const done=ALL_KANA.filter(k=>k.step<=passed && set.has(k.k)).length;
    const cur=U>passed ? ALL_KANA.filter(k=>k.step===U && set.has(k.k)).length : 0;
    return [done,`<div class="cellrow"><span class="cl">${label}</span><div class="cells">${Array.from({length:TOTAL},(_,i)=>`<i class="${i<done?'on':(i<done+cur?'cur':'')}"></i>`).join('')}</div></div>`];
  };
  const [dh,hh]=row('ひ',BASE), [dk,hk]=row('カ',BASE_K);
  $('#cells').innerHTML=hh+hk;
  let tail;
  const nx=ROADMAP.find(r=>r.n===passed+1);
  if(passed>=STEPS.length) tail = nx&&nx.ext ? '假名全部學完了！接下來回到課本第 1 課' : `第 ${passed+1} 步內容準備中`;
  else tail=`正在學第 ${U} 步・${stepLabel(U)}`;
  $('#plabel').textContent = `平假名 ${dh} / ${TOTAL}・片假名 ${dk} / ${TOTAL}・${tail}`;
}

/* ===== tabs ===== */
const TABS=['learn','flash','quiz','words','table'];
function showTab(t){
  if(!TABS.includes(t)) t='learn';
  document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));
  TABS.forEach(x=>$('#p-'+x).hidden = x!==t);
  store.set('tab',t);
  if(t==='learn') pad && pad.resize();
  if(t==='quiz' && !qz.qs.length) startQuiz();
}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));

/* ===== words component ===== */
function wordsHTML(list){
  return `<div class="words">${list.map(w=>`
    <div class="word">
      <div class="w">${esc(w.w)}</div>
      <div class="ans" data-ans hidden><span class="mono">${esc(w.r)}</span>${esc(w.m)}</div>
      <div class="ctl">
        <button class="btn icon-btn" data-say="${esc(w.w)}" aria-label="播放 ${esc(w.w)}">${SPK}</button>
        <button class="btn" data-reveal>看答案</button>
      </div>
    </div>`).join('')}</div>`;
}
document.addEventListener('click',e=>{
  const say=e.target.closest('[data-say]'); if(say){ speak(say.dataset.say); return; }
  const rv=e.target.closest('[data-reveal]');
  if(rv){ const a=rv.closest('.word').querySelector('[data-ans]'); a.hidden=!a.hidden; rv.textContent=a.hidden?'看答案':'隱藏'; }
});

let pad=null;

/* ===== learn ===== */
function unlockHTML(s){
  if(s.id<=passed) return `<div class="unlock passed"><h3>解鎖測驗・已通過</h3><p class="muted">這一步已經通過了。想再複習，可以到「字卡」或「測驗」分頁。</p></div>`;
  return `<div class="unlock"><h3>解鎖測驗：第 ${s.id} 步 ${s.row}</h3>
    <p>這一步的內容都唸熟、寫熟之後，再來考解鎖測驗。共 ${QN} 題，看字選拼音、聽音選字、看拼音選字三種題型混在一起，答對 ${PASS} 題以上就解鎖下一步。沒通過可以一直重考。</p>
    <div class="row"><button class="btn primary" data-unlock="${s.id}">開始解鎖測驗</button></div></div>`;
}
function renderLearn(){
  const U=curU();
  if(curStep>U || curStep<1) curStep=U;
  const s=STEPS.find(x=>x.id===curStep)||STEPS[0];
  if(curKana>=s.kana.length) curKana=0;
  const k=s.kana[curKana];
  const next=ROADMAP.find(r=>r.n===U+1);
  const lockMsg = U>passed ? `通過第 ${U} 步測驗後解鎖` : '內容準備中';
  const nextChip = !next ? '' : next.ext
    ? `<span class="chip locked">下一站・<span class="kn">課本第 1 課</span>${U>passed?'・學完全部假名後':''}</span>`
    : `<span class="chip locked">第 ${next.n} 步 <span class="kn">${stepLabel(next.n)}</span>・${lockMsg}</span>`;
  const parts=[...new Set(STEPS.filter(x=>x.id<=U).map(x=>x.part))];
  const srcLine = !k.o || k.ol ? '' : s.kind==='kata' ? `取自漢字「${k.o}」的一部分。` : `來源漢字「${k.o}」的草書。`;
  $('#p-learn').innerHTML = `
    ${parts.length>1?`<div class="row parts" aria-label="選擇單元">${parts.map(pt=>`<button class="seg" data-part="${pt}" aria-pressed="${pt===s.part}">${pt}</button>`).join('')}</div>`:''}
    <div class="row" aria-label="選擇步驟">
      ${STEPS.filter(x=>x.id<=U && x.part===s.part).map(x=>`<button class="chip" data-step="${x.id}" aria-pressed="${x.id===s.id}">第 ${x.id} 步 <span class="kn">${x.row}</span>${x.id<=passed?' ✓':''}</button>`).join('')}
      ${next && (next.part===s.part || s.id===U) ? nextChip : ''}
    </div>
    <div class="stephead">
      <div class="eyebrow">第 ${s.id} 步・${s.row}${s.id<=passed?'・已通過':'・學習中'}</div>
      <h2>${s.title}</h2>
      <p class="lead muted">${esc(s.rule)}點一下字卡可以聽發音，並在下方描字練習。</p>
    </div>
    <div class="kgrid">
      ${s.kana.map((x,i)=>`<button class="kcard" data-k="${i}" aria-pressed="${i===curKana}">
        ${x.ex?'<span class="badge">例外</span>':''}
        <div class="sq"${sqStyle(x.k)}>${x.k}</div>
        <div class="rom">${x.r}</div>
        <div class="zy">${esc(x.z)}</div>
        ${x.o?`<div class="org">${x.ol||'來源'} <b>${x.o}</b></div>`:''}
      </button>`).join('')}
    </div>
    <div class="sec">
      <h3>描字練習</h3>
      <div class="studio">
        <div class="padwrap">
          <canvas class="pad" id="pad" aria-label="描字板，用滑鼠或手指照著範本寫"></canvas>
          <div class="row">
            <button class="btn" id="padClear">清除</button>
            <button class="btn" id="padGuide">隱藏範本</button>
            <button class="btn icon-btn" data-say="${k.k}" aria-label="播放發音">${SPK}</button>
          </div>
        </div>
        <div class="info">
          <div class="big"><span class="kana">${k.k}</span><span class="rom">${k.r}</span></div>
          <p>${esc(k.z)}</p>
          <p class="muted">${srcLine}先照淡色範本描 3 次，再按「隱藏範本」自己寫 2 次。</p>
          <div class="row">
            <button class="btn" id="kPrev">← 上一個</button>
            <button class="btn" id="kNext">下一個 →</button>
          </div>
        </div>
      </div>
    </div>
    <div class="sec">
      <h3>重點</h3>
      <ul class="notes">${s.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>
    </div>
    <div class="sec">
      <h3>唸唸看：用學過的字組成的單字</h3>
      <p class="muted lead">先自己唸，再按「看答案」或播放發音確認。</p>
      ${s.words.length?wordsHTML(s.words):'<p class="muted">這一步能組成的單字太少，先把字唸熟、寫熟，下一步開始就有單字可以唸。</p>'}
    </div>
    ${unlockHTML(s)}
    <div class="sec">
      <h3>學習路線</h3>
      <ol class="road">${ROADMAP.map((r,i)=>{
        const grp = (i===0 || ROADMAP[i-1].part!==r.part) ? `<li class="rgrp">${r.part}</li>` : '';
        let st = r.n<=passed?'done':(r.n===U && U>passed?'cur':'');
        let lbl = st==='done'?'已通過':(st==='cur'?'學習中':'未解鎖');
        if(r.ext){ st = passed>=STEPS.length?'cur':''; lbl = passed>=STEPS.length?'下一站':'最後'; }
        return `${grp}<li><span class="n">${r.ext?'終點':`第 ${r.n} 步`}</span><span><span class="t">${r.t}</span>${r.note?` <span class="muted" style="font-size:13px">・${r.note}</span>`:''}</span><span class="pill ${st}">${lbl}</span></li>`;}).join('')}</ol>
    </div>`;
  pad=new Pad($('#pad')); pad.k=k.k;
  requestAnimationFrame(()=>pad.resize());
  $('#padClear').onclick=()=>pad.clear();
  $('#padGuide').onclick=e=>{ pad.guide=!pad.guide; e.currentTarget.textContent=pad.guide?'隱藏範本':'顯示範本'; pad.draw(); };
  $('#kPrev').onclick=()=>{ curKana=(curKana+s.kana.length-1)%s.kana.length; renderLearn(); speak(s.kana[curKana].k); };
  $('#kNext').onclick=()=>{ curKana=(curKana+1)%s.kana.length; renderLearn(); speak(s.kana[curKana].k); };
}
$('#p-learn').addEventListener('click',e=>{
  const ul=e.target.closest('[data-unlock]');
  if(ul){ startQuiz(+ul.dataset.unlock); showTab('quiz'); window.scrollTo(0,0); return; }
  const pt=e.target.closest('[data-part]');
  if(pt){ const last=STEPS.filter(x=>x.part===pt.dataset.part && x.id<=curU()).pop(); if(last){ curStep=last.id; curKana=0; store.set('step',curStep); renderLearn(); } return; }
  const st=e.target.closest('[data-step]');
  if(st){ curStep=+st.dataset.step; curKana=0; store.set('step',curStep); renderLearn(); return; }
  const kc=e.target.closest('.kcard');
  if(kc){ curKana=+kc.dataset.k; const s=STEPS.find(x=>x.id===curStep); renderLearn(); speak(s.kana[curKana].k); }
});
window.addEventListener('resize',()=>pad&&pad.resize());
const mq=window.matchMedia('(prefers-color-scheme: dark)');
mq.addEventListener && mq.addEventListener('change',()=>pad&&pad.draw());
new MutationObserver(()=>pad&&pad.draw()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
if(document.fonts){ document.fonts.load('100px "Klee One"','あかさたなはまやらわんアカサタナハマヤラワン').then(()=>pad&&pad.draw()).catch(()=>{}); }

/* ===== flashcards ===== */
let fc={deck:[],cur:null,flipped:false,known:0,again:0};
function startFlash(){ fc={deck:shuffle(pool()),cur:null,flipped:false,known:0,again:0}; fc.cur=fc.deck.shift(); renderFlash(); }
function renderFlash(){
  const p=$('#p-flash');
  if(!fc.cur){
    p.innerHTML=`${scopeHTML()}<div class="result"><p class="muted">這一輪完成了</p><p>記住 <b>${fc.known}</b> 個，「不熟」重複練習 <b>${fc.again}</b> 次。</p><div class="row"><button class="btn primary" id="fcRestart">再來一輪</button></div></div>`;
    $('#fcRestart').onclick=startFlash; return;
  }
  const k=fc.cur, left=fc.deck.length+1;
  p.innerHTML=`${scopeHTML()}
    <div class="fcbox">
      <div class="counter">剩下 ${left} 張・記住 ${fc.known}</div>
      <button class="fc ${fc.flipped?'flipped':''}" id="fcCard" aria-label="字卡，點一下翻面">
        <div class="fc-in">
          <div class="face front"><span class="kana" style="font-size:${fitPx(k.k,120,250)}">${k.k}</span><span class="hint">想好怎麼唸，再點一下翻面</span></div>
          <div class="face back"><span class="kana" style="font-size:${fitPx(k.k,48,240)}">${k.k}</span><span class="rom">${k.r}</span><span class="zy">${esc(k.z)}</span>${k.o?`<span class="org">${k.ol||'來源'} <b>${k.o}</b></span>`:''}</div>
        </div>
      </button>
      <div class="row" style="justify-content:center">
        ${fc.flipped
          ? `<button class="btn" id="fcAgain">不熟，等一下再考</button><button class="btn primary" id="fcKnow">記住了</button><button class="btn icon-btn" data-say="${k.k}" aria-label="再聽一次">${SPK}</button>`
          : `<button class="btn primary" id="fcFlip">翻面</button>`}
      </div>
      <p class="muted" style="font-size:13px">鍵盤：空白鍵翻面・1 不熟・2 記住了</p>
    </div>`;
  $('#fcCard').onclick=flip;
  if(fc.flipped){ $('#fcAgain').onclick=again; $('#fcKnow').onclick=know; } else $('#fcFlip').onclick=flip;
}
function flip(){ fc.flipped=!fc.flipped; if(fc.flipped) speak(fc.cur.k); renderFlash(); }
function again(){ fc.again++; fc.deck.splice(Math.min(3,fc.deck.length),0,fc.cur); nextCard(); }
function know(){ fc.known++; const m=store.get('mastery',{}); m[fc.cur.k]=(m[fc.cur.k]||0)+1; store.set('mastery',m); nextCard(); }
function nextCard(){ fc.cur=fc.deck.shift()||null; fc.flipped=false; renderFlash(); }
$('#p-flash').addEventListener('click',e=>onScope(e,startFlash));
document.addEventListener('keydown',e=>{
  if($('#p-flash').hidden || !fc.cur || e.target.closest('input,textarea')) return;
  if(e.code==='Space'){ e.preventDefault(); flip(); }
  else if(fc.flipped && e.key==='1') again();
  else if(fc.flipped && e.key==='2') know();
});

/* ===== quiz（一般複習測驗 + 解鎖測驗） ===== */
const MODES=[{id:'k2r',t:'看字選拼音'},{id:'a2k',t:'聽音選字'},{id:'r2k',t:'看拼音選字'}];
let qMode=store.get('qmode','k2r');
if(!MODES.some(m=>m.id===qMode)) qMode='k2r';
let qz={qs:[],i:0,score:0,wrong:[],answered:null,unlock:0};
const snd = k=>k.snd||k.r;   // 同音的字（例如 じ／ぢ、お／を、あ／ア）不會出現在同一題
function makeQs(P,modeFn,D){
  D=D||P;
  let qs=[];
  while(qs.length<QN){ let b=shuffle(P); if(qs.length && b[0].k===qs[qs.length-1].k && b.length>1) b.push(b.shift()); qs=qs.concat(b); }
  return qs.slice(0,QN).map(a=>{
    const used=new Set([snd(a)]), opts=[a];
    for(const x of shuffle(P).concat(shuffle(D))){ if(opts.length>=4) break; if(opts.includes(x)||used.has(snd(x))) continue; used.add(snd(x)); opts.push(x); }
    return {a,m:modeFn(),opts:shuffle(opts)};
  });
}
function startQuiz(unlockId){
  const u=unlockId||0;
  const P = u ? ALL_KANA.filter(k=>k.step===u) : pool();
  const ids=MODES.map(m=>m.id);
  const D = u ? ALL_KANA.filter(k=>k.step<=u && k.step>=u-1) : P;   // 只有 3 個字的行，從前一行補干擾選項
  qz={qs:makeQs(P, u ? ()=>ids[Math.floor(Math.random()*ids.length)] : ()=>qMode, D),i:0,score:0,wrong:[],answered:null,unlock:u};
  renderQuiz(true);
}
function quizHead(){
  if(qz.unlock){
    const s=STEPS.find(x=>x.id===qz.unlock);
    return `<div class="stephead"><div class="eyebrow">解鎖測驗・答對 ${PASS} 題以上通過</div><h2 style="font-size:28px;letter-spacing:.08em">第 ${s.id} 步 ${s.title}</h2></div>`;
  }
  return `${scopeHTML()}<div class="row" aria-label="測驗模式">${MODES.map(m=>`<button class="chip" data-mode="${m.id}" aria-pressed="${m.id===qMode}">${m.t}</button>`).join('')}</div>`;
}
function renderQuiz(auto){
  const p=$('#p-quiz');
  const head=quizHead();
  if(qz.i>=qz.qs.length){
    const w=[...new Map(qz.wrong.map(k=>[k.k,k])).values()];
    const wrongHTML = w.length?`<div class="sec"><h3>答錯的字</h3><div class="row">${w.map(k=>`<button class="chip" data-say="${k.k}"><span class="kn">${k.k}</span> ${k.r}</button>`).join('')}</div></div>`:'';
    if(qz.unlock){
      const id=qz.unlock, ok=qz.score>=PASS;
      if(ok && id>passed){ passed=id; store.set('passed',passed); refreshAll(); }
      const nextHas=STEPS.some(x=>x.id===id+1), nextR=ROADMAP.find(r=>r.n===id+1);
      const msg = ok
        ? (nextHas ? `通過了！第 ${id+1} 步 ${stepLabel(id+1)} 已經解鎖。`
           : nextR && nextR.ext ? '恭喜！平假名、片假名全部學完了。接下來回到課本《いろどり》第 1 課，開始學打招呼。'
           : nextR ? `通過了！第 ${id} 步完成。第 ${id+1} 步的內容還沒加進網站，準備好再繼續。`
           : '通過了！全部步驟都完成了。')
        : `答對 ${qz.score} 題，還差 ${PASS-qz.score} 題。把答錯的字再練一下，隨時可以重考。`;
      p.innerHTML=`${head}<div class="result qbox ${ok?'pass':''}">
        <div class="score">${qz.score} / ${qz.qs.length}</div>
        <p>${msg}</p>${wrongHTML}
        <div class="row">${ok
          ? `${nextHas?`<button class="btn primary" id="qGoNext">去學第 ${id+1} 步 →</button>`:''}<button class="btn" id="qQuit">回到一般測驗</button>`
          : `<button class="btn primary" id="qRetry">重考</button><button class="btn" id="qBack">回去複習這一步</button>`}</div></div>`;
      if(ok){ const g=$('#qGoNext'); if(g) g.onclick=()=>{ curStep=id+1; curKana=0; store.set('step',curStep); renderLearn(); startQuiz(); showTab('learn'); window.scrollTo(0,0); };
              $('#qQuit').onclick=()=>startQuiz(); }
      else { $('#qRetry').onclick=()=>startQuiz(id);
             $('#qBack').onclick=()=>{ curStep=id; curKana=0; renderLearn(); startQuiz(); showTab('learn'); window.scrollTo(0,0); }; }
      return;
    }
    p.innerHTML=`${head}<div class="result qbox">
      <div class="score">${qz.score} / ${qz.qs.length}</div>
      <p>${qz.score===qz.qs.length?'全對，很穩！':qz.score>=8?'很不錯，把錯的字再看一下。':'再複習一下字卡，然後重新測一次。'}</p>
      ${wrongHTML}
      <div class="row"><button class="btn primary" id="qRestart">再測一次</button></div></div>`;
    $('#qRestart').onclick=()=>startQuiz(); return;
  }
  const q=qz.qs[qz.i], A=qz.answered;
  let prompt='';
  if(q.m==='k2r') prompt=`<span class="kana" style="font-size:${fitPx(q.a.k,96,440)}">${q.a.k}</span>`;
  else if(q.m==='r2k') prompt=`<span class="mono">${q.a.r}</span>`;
  else prompt=`<button class="btn primary" data-say="${q.a.k}" style="font-size:16px;padding:14px 22px">${SPK} ${A?'再聽一次':'播放發音'}</button>`;
  const isR=q.m==='k2r';
  const ask = q.m==='k2r'?'這個字怎麼唸？':q.m==='r2k'?'哪一個字是這個音？':'聽發音，選出正確的字';
  p.innerHTML=`${head}<div class="qbox">
    <div class="counter">第 ${qz.i+1} / ${qz.qs.length} 題・答對 ${qz.score}${qz.unlock?'・'+ask:''}</div>
    <div class="qprompt">${prompt}</div>
    <div class="opts">${q.opts.map(o=>{
      let cls='opt '+(isR?'r':'k');
      if(A){ if(o.k===q.a.k) cls+=' right'; else if(o.k===A) cls+=' wrong'; }
      return `<button class="${cls}" data-opt="${o.k}" ${A?'disabled':''}>${isR?o.r:o.k}</button>`;}).join('')}</div>
    <div class="fb ${A?(A===q.a.k?'good':'bad'):''}">${A?`${A===q.a.k?'答對了':'答錯了'}：<span class="kana" style="font-size:20px">${q.a.k}</span> ＝ <span class="mono">${q.a.r}</span>，${esc(q.a.z)}`:''}</div>
    ${A?`<div class="row"><button class="btn primary" id="qNext">${qz.i===qz.qs.length-1?'看結果':'下一題'} →</button></div>`:''}
    ${qz.unlock&&!A?`<div class="row"><button class="btn ghost" id="qQuit">離開解鎖測驗</button></div>`:''}
  </div>`;
  if(A) $('#qNext').onclick=()=>{ qz.i++; qz.answered=null; renderQuiz(true); };
  const qq=$('#qQuit'); if(qq) qq.onclick=()=>startQuiz();
  if(auto && q.m==='a2k' && !$('#p-quiz').hidden) speak(q.a.k);
}
$('#p-quiz').addEventListener('click',e=>{
  if(!qz.unlock && onScope(e,()=>startQuiz())) return;
  const m=e.target.closest('[data-mode]');
  if(m){ qMode=m.dataset.mode; store.set('qmode',qMode); startQuiz(); return; }
  const o=e.target.closest('[data-opt]');
  if(o && !qz.answered){
    const q=qz.qs[qz.i]; qz.answered=o.dataset.opt;
    if(qz.answered===q.a.k) qz.score++; else qz.wrong.push(q.a);
    renderQuiz(false); if(q.m!=='a2k') speak(q.a.k);
  }
});
document.addEventListener('keydown',e=>{
  if($('#p-quiz').hidden) return;
  if(e.key==='Enter' && qz.answered && $('#qNext')){ e.preventDefault(); $('#qNext').click(); }
});

/* ===== words ===== */
function renderWords(){
  const seen=new Set(), list=[];
  STEPS.filter(s=>s.id<=curU()).forEach(s=>s.words.forEach(w=>{ if(!seen.has(w.w)){ seen.add(w.w); list.push({...w,step:s.id}); } }));
  $('#p-words').innerHTML=`
    <div class="stephead"><div class="eyebrow">全部 ${list.length} 個單字</div><h2 style="letter-spacing:.04em;font-size:28px">唸唸看</h2>
    <p class="lead muted">這些單字只用到你已經解鎖的假名。先自己唸出來，再看答案或聽發音確認。</p></div>
    <div class="row"><button class="btn" id="wAll">全部顯示答案</button><button class="btn ghost" id="wShuffle">打亂順序</button></div>
    <div id="wList">${wordsHTML(list)}</div>`;
  let shown=false;
  $('#wAll').onclick=e=>{ shown=!shown; document.querySelectorAll('#wList [data-ans]').forEach(a=>a.hidden=!shown); document.querySelectorAll('#wList [data-reveal]').forEach(b=>b.textContent=shown?'隱藏':'看答案'); e.currentTarget.textContent=shown?'全部隱藏答案':'全部顯示答案'; };
  $('#wShuffle').onclick=()=>{ $('#wList').innerHTML=wordsHTML(shuffle(list)); shown=false; $('#wAll').textContent='全部顯示答案'; };
}

/* ===== table ===== */
let tmode=store.get('tmode','hira');
function renderTable(){
  const m=store.get('mastery',{}), av=availSet(), kata=tmode==='kata', cv=t=>kata?toKata(t):t, off=kata?20:0;
  $('#p-table').innerHTML=`
    <div class="stephead"><div class="eyebrow">${kata?'片假名':'平假名'} 46 個</div><h2 style="letter-spacing:.04em;font-size:28px">五十音表</h2>
    <p class="lead muted">實線框是已經解鎖的字，點一下聽發音。虛線淡色的是之後會學到的。</p></div>
    <div class="row" aria-label="切換"><button class="chip" data-tmode="hira" aria-pressed="${!kata}">平假名</button><button class="chip" data-tmode="kata" aria-pressed="${kata}">片假名</button></div>
    <div class="legend"><span>藍框：字卡「記住了」3 次以上</span><span>例外：${kata?'シ（shi）、チ（chi）、ツ（tsu）、フ（fu）':'し（shi）、ち（chi）、つ（tsu）、ふ（fu）'}</span></div>
    <div class="tscroll"><div class="gt">
      <span></span>${['a','i','u','e','o'].map(v=>`<span class="rh">${v}</span>`).join('')}
      ${GOJUON.map(([h,cells,step])=>`<span class="rh">${h==='ん'?cv('ん'):h}</span>${cells.map(c=>{
        if(!c) return '<span class="gc empty"></span>';
        const ch=cv(c[0]), on=av.has(ch), done=on && (m[ch]||0)>=3;
        return `<button class="gc ${on?'':'off'} ${done?'done':''}" data-cell="${ch}" data-step="${step+off}"><span class="kana">${ch}</span><span class="mono">${c[1]}</span></button>`;}).join('')}`).join('')}
    </div></div>`;
}
$('#p-table').addEventListener('click',e=>{
  const t=e.target.closest('[data-tmode]'); if(t){ tmode=t.dataset.tmode; store.set('tmode',tmode); renderTable(); return; }
  const c=e.target.closest('[data-cell]'); if(!c) return;
  if(availSet().has(c.dataset.cell)) speak(c.dataset.cell);
  else toast(`第 ${c.dataset.step} 步會學到這個字`);
});
document.querySelector('.tab[data-tab="table"]').addEventListener('click',renderTable);

/* ===== 解鎖後全部重畫 ===== */
function refreshAll(){ syncNew(); renderProgress(); renderLearn(); renderWords(); renderTable(); startFlash(); }

/* ===== boot ===== */
syncNew();
renderProgress();
renderLearn();
startFlash();
renderWords();
renderTable();
startQuiz();
const h=(location.hash||'').slice(1);
showTab(TABS.includes(h)?h:store.get('tab','learn'));
