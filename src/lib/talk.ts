/**
 * AI 會話練習：瀏覽器直接連使用者電腦上的 Ollama（http://localhost:11434），
 * 對話內容不會經過網站或雲端。
 */

export interface TalkScene {
  id: string;
  /** 第幾課學過相關的內容；0 = 不限 */
  lesson: number;
  title: string;
  /** 場面（日文，給模型看） */
  place: string;
  /** AI 演的角色 */
  ai: string;
  /** 學習者演的角色 */
  me: string;
  /** 這次練習的目標（中文，給學習者看，也告訴模型） */
  goals: string[];
}

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const DEFAULT_BASE = 'http://localhost:11434';
const SETTINGS_KEY = 'gojuon:talk';

export interface TalkSettings {
  base: string;
  model: string;
}

/** 連線設定只存在這台電腦（每台電腦的 Ollama 不一樣，不跟著登入同步） */
export function loadSettings(): TalkSettings {
  try {
    const v = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<TalkSettings>;
    return { base: typeof v.base === 'string' && v.base ? v.base : DEFAULT_BASE, model: typeof v.model === 'string' ? v.model : '' };
  } catch {
    return { base: DEFAULT_BASE, model: '' };
  }
}

export function saveSettings(s: TalkSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* 私密瀏覽時存不了，這次有效就好 */
  }
}

/** 網址最後的斜線拿掉 */
export const cleanBase = (b: string) => b.trim().replace(/\/+$/, '');

/** 網站是 https，連非 localhost 的 http 會被瀏覽器擋（混合內容） */
export function mixedContentBlocked(base: string, pageProtocol: string): boolean {
  try {
    const u = new URL(cleanBase(base));
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
    return pageProtocol === 'https:' && u.protocol === 'http:' && !local;
  } catch {
    return false;
  }
}

/**
 * 會話練習的系統提示：限制在入門程度、短句、每句附繁體中文翻譯。
 * 不要叫模型「示範正確說法」，小模型會變成一直重複學習者的話；改成「回答＋問一個問題」讓對話往前走。
 */
export function scenePrompt(s: TalkScene): string {
  return [
    'あなたは日本語の会話練習の相手です。相手は台湾人の初級学習者（『いろどり』入門・A1）です。',
    `場面：${s.place}`,
    `あなたの役：${s.ai}（あなたはこの人として話します）`,
    `学習者の役：${s.me}`,
    `この練習で学習者がしたいこと：${s.goals.join('／')}`,
    '話し方のルール：',
    '1. 役になりきって、日本語で話す。1回の返事は1〜2文。やさしい言葉と「です・ます」を使う。',
    '2. 相手の言ったことに答えてから、会話が先に進むように、質問を1つする。',
    '3. 相手の文をそのままくりかえさない。相手の文を訳したり、言い直したりしない。',
    '4. 文法の説明や、まちがいの指摘はしない（あとで別に講評します）。',
    '5. 学習者が中国語で話したら、日本語での言い方を短く1つ教えてから、役にもどる。',
    '6. 返事の最後に改行して「【中文】」と書き、あなたの返事だけを繁體中文（台湾で使う漢字）に訳す。簡体字は絶対に使わない。',
    '例（形式の見本です。内容はまねしないでください）：',
    '学習者：週末、映画を見ました。',
    'あなた：いいですね。何の映画を見ましたか？',
    '【中文】真好。你看了什麼電影？',
  ].join('\n');
}

/** 模型只重複了學習者的話時，再請它回答一次 */
export const ECHO_NUDGE =
  '（さっきの返事は、学習者の言葉のくりかえしでした。くりかえさないで、あなたの役として答えて、質問を1つしてください。最後に【中文】の訳もつけてください。）';

/** 會話開始時，請 AI 先開口（這一句不顯示在畫面上） */
export const START_MSG = '（会話を始めてください。あなたから最初に話しかけてください。）';

/** 「給我提示」：用中文告訴學習者下一句可以怎麼說 */
export function hintPrompt(s: TalkScene): string {
  return [
    '你是日文老師。學習者是台灣人，日文程度是入門（A1），正在做會話練習。',
    `場面：${s.place}；對方（AI）的角色：${s.ai}；學習者的角色：${s.me}；練習目標：${s.goals.join('、')}。`,
    '請根據下面的對話，告訴學習者下一句可以怎麼回答。',
    '用台灣用語的繁體中文說明，不要用簡體字。給 1～2 個簡單的日文例句（附平假名唸法和中文意思）。不要超過 5 行。',
  ].join('\n');
}

/** 「結束並講評」：中文講評、逐句修正 */
export function feedbackPrompt(s: TalkScene): string {
  return [
    '你是親切的日文老師。學習者是台灣人，日文程度是入門（A1），剛做完一段會話練習。',
    `場面：${s.place}；對方（AI）的角色：${s.ai}；學習者的角色：${s.me}；練習目標：${s.goals.join('、')}。`,
    '請用台灣用語的繁體中文寫講評，不要用簡體字，格式如下：',
    '1. 整體評語：2～3 句，先說做得好的地方。',
    '2. 逐句修正：只列學習者說的句子。有錯或不自然的，寫「原句 → 建議的說法」並用一句中文說明原因；說得對的寫「✓」。',
    '3. 這次可以記住的句子：2～3 個日文句子，附中文意思。',
    '不要寫其他內容。',
  ].join('\n');
}

/** 對話內容整理成講評、提示用的文字（只留日文，翻譯拿掉） */
export function transcript(msgs: ChatMsg[]): string {
  return msgs
    .filter((m) => m.role !== 'system' && m.content !== START_MSG)
    .map((m) => `${m.role === 'user' ? '學習者' : 'AI'}：${splitReply(m.content).ja}`)
    .join('\n');
}

/** 把模型的回覆拆成日文和中文翻譯；也拿掉推理型模型的 <think> 內容 */
export function splitReply(text: string): { ja: string; zh: string } {
  const t = stripThink(text);
  const i = t.search(/【\s*中文\s*】|\[\s*中文\s*\]/);
  if (i < 0) return { ja: t.trim(), zh: '' };
  return { ja: t.slice(0, i).trim(), zh: t.slice(i).replace(/^【\s*中文\s*】|^\[\s*中文\s*\]/, '').trim() };
}

export function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trimStart();
}

/** 比對用：去掉空白和標點、片假名當平假名 */
const normJa = (t: string) =>
  t.replace(/[\s　、。，,.？?！!…・「」『』（）()〜～ー-]/g, '').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

function bigrams(t: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i++) m.set(t.slice(i, i + 2), (m.get(t.slice(i, i + 2)) ?? 0) + 1);
  return m;
}

/** 兩句話有多像（0～1，用相鄰兩個字的重疊比例） */
export function similarity(a: string, b: string): number {
  const x = bigrams(normJa(a));
  const y = bigrams(normJa(b));
  let both = 0;
  let total = 0;
  for (const [k, v] of x) both += Math.min(v, y.get(k) ?? 0);
  for (const v of x.values()) total += v;
  for (const v of y.values()) total += v;
  return total ? (2 * both) / total : 0;
}

/** AI 的回覆是不是只是在重複學習者的話 */
export function isEcho(reply: string, user: string): boolean {
  const r = normJa(reply);
  const u = normJa(user);
  if (u.length < 4 || !r) return false;
  if (r === u) return true;
  // 幾乎整句照抄，只多了「ですね」之類的幾個字
  if (r.includes(u) && r.length <= u.length + 6) return true;
  return similarity(reply, user) >= 0.75;
}

/**
 * 把中文轉成台灣繁體（模型常常回簡體）：只轉中文的部分，日文不動，
 * 假名本身、直接連著假名的漢字（例如「会社に行きます」的「会社」「行」）都算日文，避免「会」被轉成「會」。
 */
export function toTaiwan(text: string, conv: (s: string) => string): string {
  const HAN = /[\u3400-\u9fff々〆]+/;
  const parts = text.split(/([\u3040-\u30ffー]+)/);
  return parts
    .map((seg, i) => {
      if (i % 2 === 1) return seg;
      let head = '';
      let tail = '';
      let mid = seg;
      if (i > 0) {
        const m = new RegExp('^' + HAN.source).exec(mid);
        if (m) {
          head = m[0];
          mid = mid.slice(head.length);
        }
      }
      if (i < parts.length - 1) {
        const m = new RegExp(HAN.source + '$').exec(mid);
        if (m) {
          tail = m[0];
          mid = mid.slice(0, mid.length - tail.length);
        }
      }
      return head + (mid ? conv(mid) : '') + tail;
    })
    .join('');
}

/** 簡轉繁（台灣用語）的轉換器，第一次用到才下載（字典約 1 MB） */
let convP: Promise<(s: string) => string> | null = null;
export function loadTaiwanConverter(): Promise<(s: string) => string> {
  convP ??= import('opencc-js/cn2t').then((m) => m.Converter({ from: 'cn', to: 'twp' }));
  return convP;
}

/** 讀 Ollama 串流回傳的 NDJSON（一行一個 JSON） */
export async function* ndjson(body: ReadableStream<Uint8Array>): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) yield JSON.parse(line) as Record<string, unknown>;
    }
    if (done) break;
  }
  if (buf.trim()) yield JSON.parse(buf) as Record<string, unknown>;
}

/** 連線失敗時的中文說明 */
export class TalkError extends Error {}

function netError(e: unknown): TalkError {
  if (e instanceof DOMException && e.name === 'AbortError') return new TalkError('已經停止。');
  return new TalkError(
    '連不上 Ollama。請確認：① Ollama 有在執行；② 有設定 OLLAMA_ORIGINS 允許這個網站，而且設定後有把 Ollama 完全關掉再開；③ 瀏覽器詢問「存取本機網路」時有按允許。',
  );
}

/** 列出 Ollama 裡已經下載的模型（也用來測試連線） */
export async function listModels(base: string): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch(`${cleanBase(base)}/api/tags`);
  } catch (e) {
    throw netError(e);
  }
  if (!res.ok) throw new TalkError(`Ollama 回傳錯誤（${res.status}）。網址是不是填錯了？`);
  const j = (await res.json()) as { models?: { name: string }[] };
  return (j.models ?? []).map((m) => m.name);
}

/** 跟模型對話，一邊收一邊回傳目前為止的文字 */
export async function* chatStream(
  base: string,
  model: string,
  messages: ChatMsg[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  let res: Response;
  try {
    res = await fetch(`${cleanBase(base)}/api/chat`, {
      method: 'POST',
      // repeat_penalty 讓模型比較不會照抄前面的句子（包括學習者說的話）
      body: JSON.stringify({ model, messages, stream: true, options: { temperature: 0.7, repeat_penalty: 1.15, repeat_last_n: 128 } }),
      signal: signal ?? null,
    });
  } catch (e) {
    throw netError(e);
  }
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => '');
    if (res.status === 404) throw new TalkError(`找不到模型「${model}」。請先在終端機執行 ollama pull ${model}，或在上面換一個模型。`);
    throw new TalkError(`Ollama 回傳錯誤（${res.status}）${msg ? '：' + msg.slice(0, 200) : ''}`);
  }
  let text = '';
  try {
    for await (const j of ndjson(res.body)) {
      if (typeof j.error === 'string') throw new TalkError(`Ollama 回傳錯誤：${j.error}`);
      const c = (j.message as { content?: string } | undefined)?.content ?? '';
      if (c) {
        text += c;
        yield text;
      }
      if (j.done) break;
    }
  } catch (e) {
    if (e instanceof TalkError) throw e;
    throw netError(e);
  }
}

/** 啟動 Ollama 前要設定的環境變數（照作業系統） */
export function originCommands(origin: string) {
  return {
    windows: `setx OLLAMA_ORIGINS "${origin}"`,
    mac: `launchctl setenv OLLAMA_ORIGINS "${origin}"`,
    linux: `sudo systemctl edit ollama   # 在 [Service] 底下加一行：Environment="OLLAMA_ORIGINS=${origin}"`,
  };
}
