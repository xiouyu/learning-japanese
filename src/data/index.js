/* ===== 教材資料：之後每學一步，在 steps.json 加一筆 ===== */
import STEPS from './steps.json';

export const ROADMAP = STEPS.map(s=>({n:s.id,t:s.title,row:s.row,note:s.note,part:s.part}))
  .concat([{n:STEPS.length+1,t:'回到課本《いろどり》第 1 課',row:'課本第1課',note:'打招呼',part:'回到課本',ext:true}]);
export const GOJUON = [
  ['—',[['あ','a'],['い','i'],['う','u'],['え','e'],['お','o']],1],
  ['k',[['か','ka'],['き','ki'],['く','ku'],['け','ke'],['こ','ko']],2],
  ['s',[['さ','sa'],['し','shi'],['す','su'],['せ','se'],['そ','so']],3],
  ['t',[['た','ta'],['ち','chi'],['つ','tsu'],['て','te'],['と','to']],4],
  ['n',[['な','na'],['に','ni'],['ぬ','nu'],['ね','ne'],['の','no']],5],
  ['h',[['は','ha'],['ひ','hi'],['ふ','fu'],['へ','he'],['ほ','ho']],6],
  ['m',[['ま','ma'],['み','mi'],['む','mu'],['め','me'],['も','mo']],7],
  ['y',[['や','ya'],null,['ゆ','yu'],null,['よ','yo']],8],
  ['r',[['ら','ra'],['り','ri'],['る','ru'],['れ','re'],['ろ','ro']],9],
  ['w',[['わ','wa'],null,null,null,['を','wo']],10],
  ['ん',[['ん','n'],null,null,null,null],10]
];
export const TOTAL = 46;

export { STEPS };
