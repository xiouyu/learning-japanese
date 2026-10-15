/**
 * 語音的分數：越高越自然。iPhone 的日文語音清單裡有 Eddy、Grandma 這類趣味語音，
 * 排在前面時會被選到，聲音很怪，所以要排除；有下載「增強版／高品質」語音就優先用。
 */
export function voiceScore(v: Pick<SpeechSynthesisVoice, 'name' | 'voiceURI'>): number {
  const id = `${v.name} ${v.voiceURI}`.toLowerCase();
  if (/eloquence|eddy|flo\b|grandma|grandpa|reed|rocko|sandy|shelley/.test(id)) return -10;
  let s = 0;
  if (/premium|高品質/.test(id)) s += 5;
  if (/enhanced|拡張|增強/.test(id)) s += 4;
  if (/google|natural|online/.test(id)) s += 3;
  if (/kyoko|o-ren|otoya|hattori|nanami|haruka|ayumi/.test(id)) s += 2;
  return s;
}
