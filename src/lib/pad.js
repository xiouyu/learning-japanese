import { glyphs } from './utils.js';

/* ===== writing pad ===== */
export class Pad{
  constructor(canvas){
    this.c=canvas; this.ctx=canvas.getContext('2d'); this.strokes=[]; this.cur=null; this.k='あ'; this.guide=true;
    canvas.addEventListener('pointerdown',e=>{ canvas.setPointerCapture(e.pointerId); this.cur=[this.pt(e)]; this.strokes.push(this.cur); this.draw(); });
    canvas.addEventListener('pointermove',e=>{ if(!this.cur) return; this.cur.push(this.pt(e)); this.draw(); });
    const end=()=>{ this.cur=null; };
    canvas.addEventListener('pointerup',end); canvas.addEventListener('pointercancel',end);
  }
  pt(e){ const r=this.c.getBoundingClientRect(); return [(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]; }
  resize(){ const w=this.c.getBoundingClientRect().width; if(!w) return; const d=window.devicePixelRatio||1; this.c.width=Math.round(w*d); this.c.height=Math.round(w*d); this.w=w; this.d=d; this.draw(); }
  set(k){ this.k=k; this.strokes=[]; this.draw(); }
  clear(){ this.strokes=[]; this.draw(); }
  draw(){
    if(!this.w || !this.ctx) return;
    const {ctx,w,d}=this, cs=getComputedStyle(document.documentElement), v=n=>cs.getPropertyValue(n).trim();
    ctx.setTransform(d,0,0,d,0,0);
    ctx.fillStyle=v('--surface'); ctx.fillRect(0,0,w,w);
    ctx.strokeStyle=v('--grid'); ctx.lineWidth=1.5; ctx.setLineDash([]); ctx.strokeRect(0.75,0.75,w-1.5,w-1.5);
    ctx.lineWidth=1; ctx.setLineDash([5,5]);
    ctx.beginPath(); ctx.moveTo(w/2,0); ctx.lineTo(w/2,w); ctx.moveTo(0,w/2); ctx.lineTo(w,w/2); ctx.stroke(); ctx.setLineDash([]);
    if(this.guide){
      ctx.save(); ctx.globalAlpha=.2; ctx.fillStyle=v('--ink');
      ctx.font=`${Math.round(Math.min(w*.74, w*.92/glyphs(this.k)))}px "Klee One","Yu Mincho",serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(this.k,w/2,w/2+w*.03); ctx.restore();
    }
    ctx.strokeStyle=v('--ink'); ctx.lineWidth=Math.max(4,w/24); ctx.lineCap='round'; ctx.lineJoin='round';
    for(const s of this.strokes){
      ctx.beginPath(); s.forEach(([x,y],i)=> i?ctx.lineTo(x*w,y*w):ctx.moveTo(x*w,y*w));
      if(s.length===1){ ctx.lineTo(s[0][0]*w+.1,s[0][1]*w); }
      ctx.stroke();
    }
  }
}
