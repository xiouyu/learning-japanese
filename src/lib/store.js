/* 學習紀錄存在瀏覽器的 localStorage，key 前綴 gojuon: */
export const store = {
  get(k,d){ try{ const v=localStorage.getItem('gojuon:'+k); return v==null?d:JSON.parse(v);}catch(e){return d;} },
  set(k,v){ try{ localStorage.setItem('gojuon:'+k,JSON.stringify(v)); }catch(e){} }
};
