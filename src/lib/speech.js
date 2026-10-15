import { $, toast } from './utils.js';

let jaVoice=null;
function pickVoice(){
  if(!('speechSynthesis' in window)) return;
  const vs=speechSynthesis.getVoices();
  const ja=vs.filter(v=>/^ja/i.test(v.lang));
  jaVoice = ja.find(v=>/Google|Natural|Online/i.test(v.name)) || ja[0] || null;
  return vs.length;
}
function checkVoices(){
  const b=$('#voiceBanner');
  if(!('speechSynthesis' in window)){ b.textContent='這個瀏覽器不支援語音播放，建議改用 Chrome 或 Edge。'; b.hidden=false; return; }
  const n=pickVoice();
  if(n && !jaVoice){ b.textContent='找不到日文語音，發音可能不正確。Windows 可到「設定 › 時間與語言 › 語音」新增日文語音，或改用 Edge / Chrome 開啟。'; b.hidden=false; }
  else b.hidden=true;
}
export function speak(text){
  if(!('speechSynthesis' in window)){ toast('這個瀏覽器不支援語音播放'); return; }
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang='ja-JP'; if(jaVoice) u.voice=jaVoice; u.rate=0.8;
    speechSynthesis.speak(u);
  }catch(e){ toast('無法播放語音'); }
}
if('speechSynthesis' in window){ speechSynthesis.onvoiceschanged=checkVoices; }
setTimeout(checkVoices,1500);
