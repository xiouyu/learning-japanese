<template>
  <section class="panel">
    <div class="stephead">
      <div class="eyebrow">AI 會話練習・用你電腦上的 Ollama</div>
      <h2 style="letter-spacing: 0.04em; font-size: 28px">跟 AI 用日文聊天</h2>
      <p class="lead muted">
        選一個課本學過的情境，AI 會扮演店員、同事或朋友，用簡單的日文跟你對話。網站直接連到你電腦上的 Ollama，對話內容不會傳到網站或雲端。
      </p>
    </div>

    <!-- 操作說明 -->
    <details class="talk-box" :open="!connected">
      <summary>操作說明（第一次用請先照著做）</summary>
      <ol class="talk-steps">
        <li>
          到 <a href="https://ollama.com/download" target="_blank" rel="noopener">ollama.com</a> 下載安裝 Ollama。
        </li>
        <li>
          打開終端機（Windows 是「命令提示字元」或 PowerShell），下載一個日文比較好的模型，例如：
          <code class="talk-code">ollama pull qwen2.5:7b</code>
          電腦比較弱（記憶體 8 GB 以下、沒有獨立顯示卡）可以改用 <code>qwen2.5:3b</code>，但日文會比較不自然。
        </li>
        <li>
          允許這個網站連到 Ollama：設定環境變數 <code>OLLAMA_ORIGINS</code>，值是這個網站的網址
          <code>{{ origin }}</code>。
          <div class="talk-os">
            <div><b>Windows</b>：在命令提示字元執行<code class="talk-code">{{ cmds.windows }}</code></div>
            <div><b>Mac</b>：在終端機執行<code class="talk-code">{{ cmds.mac }}</code>（重新開機後要再執行一次）</div>
            <div><b>Linux</b>：<code class="talk-code">{{ cmds.linux }}</code></div>
          </div>
          設定好之後，要把 Ollama <b>完全結束</b>（工作列或選單列的 Ollama 圖示 → Quit）再重新打開，設定才會生效。
        </li>
        <li>在<b>同一台電腦</b>用 Chrome 或 Edge 打開這個網站，按下面的「測試連線」。瀏覽器如果詢問「要允許存取本機網路上的裝置嗎？」請按允許。</li>
        <li>連線成功後選模型、選情境，按「開始對話」。AI 會先開口，你用日文回答就好。</li>
      </ol>
      <p class="muted">
        對話中可以按「給我提示」看下一句怎麼說；聊完按「結束並講評」，AI 會用中文幫你修正說錯的地方。AI 的句子下面可以點「中文」看翻譯、點喇叭聽發音。
      </p>
    </details>

    <!-- 使用限制 -->
    <details class="talk-box">
      <summary>使用限制（請先看）</summary>
      <ul class="talk-limits">
        <li><b>只能在裝了 Ollama 的那台電腦上用。</b>手機、平板連不到電腦裡的 Ollama（除非你自己幫 Ollama 加上 HTTPS 和遠端連線）。</li>
        <li><b>瀏覽器：</b>建議用 Chrome 或 Edge。Safari 可能會擋住網站連到本機，連不上時請換瀏覽器。</li>
        <li><b>AI 會出錯：</b>AI 的日文偶爾會不自然、太難，或講評說錯。以課本和真人錄音為準，AI 只當成練習對象。</li>
        <li><b>模型太小會重複你的話：</b>3B 以下的小模型常常只是把你說的話再說一次，或答非所問。網站發現 AI 只是在重複時，會自動請它重答一次；還是這樣的話，請換 7B 以上的模型。</li>
        <li><b>繁體中文：</b>Qwen 等模型常常回簡體字，網站會把翻譯、提示和講評的中文自動轉成台灣繁體（日文的部分不轉）。第一次開這個頁面會多下載約 1 MB 的轉換字典。</li>
        <li><b>速度看電腦：</b>沒有獨立顯示卡時，一句話可能要等十幾秒。模型越大越慢、但日文越好。</li>
        <li><b>對話不會存檔：</b>對話只在這個頁面，重新整理或關掉網站就沒了，也不會跟著登入同步。連線設定只存在這台電腦。</li>
        <li><b>語音輸入：</b>麥克風按鈕用的是瀏覽器的語音辨識（Chrome 會把聲音送到 Google 辨識，不是在你電腦上處理）。不想送出聲音就用打字。</li>
        <li><b>情境：</b>只會出現已經學到的課的情境，避免 AI 用到還沒學的內容；「自由聊天」隨時都能用。</li>
      </ul>
    </details>

    <!-- 連線設定 -->
    <div class="talk-box talk-conn">
      <div class="talk-field">
        <label for="talk-base">Ollama 網址</label>
        <input id="talk-base" v-model.trim="settings.base" class="talk-in" placeholder="http://localhost:11434" @change="save" />
      </div>
      <div class="talk-field">
        <label for="talk-model">模型</label>
        <select v-if="models.length" id="talk-model" v-model="settings.model" class="talk-in" @change="save">
          <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
        </select>
        <input v-else id="talk-model" v-model.trim="settings.model" class="talk-in" placeholder="例如 qwen2.5:7b（測試連線後可以用選的）" @change="save" />
      </div>
      <div class="hrow">
        <button class="btn" :class="{ primary: !connected }" :disabled="testing" @click="test">{{ testing ? '連線中…' : '測試連線' }}</button>
        <span class="talk-status" :class="connected ? 'ok' : connErr ? 'bad' : ''">{{ connMsg }}</span>
      </div>
      <p v-if="mixed" class="talk-warn">
        這個網址不是本機（localhost），網站是 https，瀏覽器會擋住 http 的連線。請用 http://localhost:11434，或幫 Ollama 加上 https。
      </p>
    </div>

    <!-- 選情境 -->
    <div v-if="!scene" class="sec">
      <h3>選一個情境</h3>
      <div class="talk-scenes">
        <button v-for="s in openScenes" :key="s.id" class="talk-scene" :disabled="!ready" @click="begin(s)">
          <span class="talk-scene-t">{{ s.title }}</span>
          <span class="muted talk-scene-l">{{ s.lesson ? `第 ${s.lesson} 課` : '不限' }}・AI 演：{{ s.ai }}</span>
        </button>
      </div>
      <p v-if="lockedN" class="muted">還有 {{ lockedN }} 個情境，學到那一課就會出現。</p>
      <p v-if="!ready" class="muted">先測試連線成功、選好模型，才能開始。</p>
    </div>

    <!-- 對話 -->
    <div v-else class="sec">
      <div class="talk-head">
        <div>
          <h3 style="margin: 0">{{ scene.title }}</h3>
          <p class="muted" style="margin: 4px 0 0">AI 演：{{ scene.ai }}・你演：{{ scene.me }}</p>
        </div>
        <button class="btn ghost" @click="leave">換情境</button>
      </div>
      <ul class="talk-goals">
        <li v-for="g in scene.goals" :key="g">{{ g }}</li>
      </ul>

      <div class="talk-log" aria-live="polite">
        <div v-for="(m, mi) in shown" :key="mi" class="talk-msg" :class="m.role">
          <template v-if="m.role === 'assistant'">
            <div class="kana talk-ja">{{ splitReply(m.content).ja || '…' }}</div>
            <div v-if="openZh.has(mi) && splitReply(m.content).zh" class="talk-zh">{{ tw(splitReply(m.content).zh) }}</div>
            <div class="talk-tools">
              <button class="btn icon-btn" aria-label="聽發音" @click="speak(splitReply(m.content).ja)"><SpeakerIcon /></button>
              <button v-if="splitReply(m.content).zh" class="btn ghost talk-mini" @click="toggleZh(mi)">{{ openZh.has(mi) ? '隱藏中文' : '中文' }}</button>
            </div>
          </template>
          <div v-else class="kana talk-ja">{{ m.content }}</div>
        </div>
        <p v-if="busy && !streaming" class="muted">AI 正在想…（電腦比較慢時要等一下）</p>
        <p v-if="retrying" class="muted">AI 剛剛只是重複你的話，已經請它重新回答…</p>
      </div>

      <p v-if="err" class="talk-warn">{{ err }}</p>

      <form class="talk-input" @submit.prevent="send">
        <textarea
          v-model="draft"
          class="talk-in kana"
          rows="2"
          placeholder="用日文回答（Enter 送出，Shift+Enter 換行）"
          :disabled="busy || !!feedback"
          @keydown.enter.exact="onEnter"
        />
        <div class="hrow">
          <button class="btn primary" :disabled="busy || !draft.trim() || !!feedback">送出</button>
          <button v-if="canListen" type="button" class="btn" :class="{ primary: listening }" :disabled="busy || !!feedback" @click="listen">
            {{ listening ? '聽取中…' : '🎤 用說的' }}
          </button>
          <button type="button" class="btn" :disabled="busy || !!feedback" @click="askHint">給我提示</button>
          <button type="button" class="btn" :disabled="busy || userTurns === 0 || !!feedback" @click="askFeedback">結束並講評</button>
          <button v-if="busy" type="button" class="btn ghost" @click="stop">停止</button>
        </div>
        <label class="rp-opt"><input v-model="autoSpeak" type="checkbox" /> AI 說完自動唸出來</label>
      </form>

      <div v-if="hint" class="talk-box talk-out">
        <b>提示</b>
        <div class="talk-pre">{{ tw(hint) }}</div>
      </div>
      <div v-if="feedback" class="talk-box talk-out">
        <b>講評</b>
        <div class="talk-pre">{{ tw(feedback) }}</div>
        <div class="hrow">
          <button class="btn primary" @click="begin(scene)">同一個情境再練一次</button>
          <button class="btn" @click="leave">換情境</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import rawScenes from '@/data/talk.json';
import { STEPS, lessonOf } from '@/data';
import { speak } from '@/composables/useSpeech';
import { useProgressStore } from '@/stores/progress';
import SpeakerIcon from '@/components/SpeakerIcon.vue';
import {
  ECHO_NUDGE,
  START_MSG,
  TalkError,
  chatStream,
  feedbackPrompt,
  hintPrompt,
  isEcho,
  listModels,
  loadTaiwanConverter,
  loadSettings,
  mixedContentBlocked,
  originCommands,
  saveSettings,
  scenePrompt,
  splitReply,
  toTaiwan,
  transcript,
  type ChatMsg,
  type TalkScene,
} from '@/lib/talk';

defineOptions({ name: 'TalkPage' });

const p = useProgressStore();
const SCENES = rawScenes as TalkScene[];

const origin = window.location.origin;
const cmds = originCommands(origin);

const settings = reactive(loadSettings());
const save = () => saveSettings({ ...settings });
const models = ref<string[]>([]);
const testing = ref(false);
const connected = ref(false);
const connErr = ref(false);
const connMsg = ref('還沒測試連線');
const mixed = computed(() => mixedContentBlocked(settings.base, window.location.protocol));
const ready = computed(() => connected.value && !!settings.model);

async function test() {
  testing.value = true;
  connErr.value = false;
  try {
    models.value = await listModels(settings.base);
    connected.value = true;
    if (!models.value.length) {
      connMsg.value = '連上了，但 Ollama 裡還沒有模型。請先執行 ollama pull qwen2.5:7b。';
      connected.value = false;
      connErr.value = true;
    } else {
      if (!models.value.includes(settings.model)) settings.model = models.value[0]!;
      save();
      connMsg.value = `連線成功，有 ${models.value.length} 個模型。`;
    }
  } catch (e) {
    connected.value = false;
    connErr.value = true;
    connMsg.value = e instanceof TalkError ? e.message : String(e);
  } finally {
    testing.value = false;
  }
}

/** 學到那一課才出現那一課的情境 */
const sceneOpen = (s: TalkScene) => !s.lesson || STEPS.some((x) => lessonOf(x) === s.lesson && x.id <= p.curU);
const openScenes = computed(() => SCENES.filter(sceneOpen));
const lockedN = computed(() => SCENES.length - openScenes.value.length);

const scene = ref<TalkScene | null>(null);
const msgs = ref<ChatMsg[]>([]);
/** 畫面上顯示的對話（系統提示和「請先開口」不顯示） */
const shown = computed(() => msgs.value.filter((m) => m.role !== 'system' && m.content !== START_MSG));
const userTurns = computed(() => shown.value.filter((m) => m.role === 'user').length);
const draft = ref('');
const busy = ref(false);
const streaming = ref(false);
const err = ref('');
const hint = ref('');
const feedback = ref('');
const openZh = reactive(new Set<number>());
let ctrl: AbortController | null = null;
const autoSpeak = ref(true);
const retrying = ref(false);

/** 中文的部分轉成台灣繁體（模型常回簡體）；轉換器還沒載入時先顯示原文 */
const conv = ref<((s: string) => string) | null>(null);
loadTaiwanConverter()
  .then((c) => (conv.value = c))
  .catch(() => {
    /* 載入失敗就顯示原文 */
  });
const tw = (t: string) => (conv.value ? toTaiwan(t, conv.value) : t);

function toggleZh(i: number) {
  if (openZh.has(i)) openZh.delete(i);
  else openZh.add(i);
}

/** 送出目前的對話給模型，把回覆一邊收一邊顯示 */
async function reply() {
  busy.value = true;
  err.value = '';
  ctrl = new AbortController();
  const lastUser = [...msgs.value].reverse().find((m) => m.role === 'user' && m.content !== START_MSG)?.content ?? '';
  try {
    let text = await streamInto(msgs.value);
    // 小模型有時只是重複學習者的話：發現的話，請它重新回答一次（這次的回覆不留在對話裡）
    if (text && lastUser && isEcho(splitReply(text).ja, lastUser)) {
      retrying.value = true;
      msgs.value.pop();
      text = await streamInto([...msgs.value, { role: 'system', content: ECHO_NUDGE }]);
    }
    if (text && autoSpeak.value) speak(splitReply(text).ja);
  } catch (e) {
    err.value = e instanceof TalkError ? e.message : String(e);
  } finally {
    busy.value = false;
    streaming.value = false;
    retrying.value = false;
    ctrl = null;
  }
}

/** 把模型的回覆一邊收一邊加進對話的最後一句，回傳完整的文字 */
async function streamInto(messages: ChatMsg[]): Promise<string> {
  let added = false;
  let text = '';
  for await (const t of chatStream(settings.base, settings.model, messages, ctrl?.signal)) {
    if (!added) {
      msgs.value.push({ role: 'assistant', content: '' });
      added = true;
      streaming.value = true;
    }
    text = t;
    msgs.value[msgs.value.length - 1] = { role: 'assistant', content: t };
  }
  return text;
}

function begin(s: TalkScene) {
  stop();
  scene.value = s;
  msgs.value = [
    { role: 'system', content: scenePrompt(s) },
    { role: 'user', content: START_MSG },
  ];
  hint.value = '';
  feedback.value = '';
  draft.value = '';
  openZh.clear();
  void reply();
}

function leave() {
  stop();
  scene.value = null;
}

/** Enter 送出；日文輸入法選字時按的 Enter 不算 */
function onEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  void send();
}

async function send() {
  const t = draft.value.trim();
  if (!t || busy.value || feedback.value) return;
  msgs.value.push({ role: 'user', content: t });
  draft.value = '';
  hint.value = '';
  await reply();
}

/** 提示、講評：另外問一次模型，不加進對話裡 */
async function ask(system: string, target: typeof hint) {
  busy.value = true;
  err.value = '';
  target.value = '';
  ctrl = new AbortController();
  try {
    const q: ChatMsg[] = [
      { role: 'system', content: system },
      { role: 'user', content: `對話內容：\n${transcript(msgs.value)}` },
    ];
    for await (const t of chatStream(settings.base, settings.model, q, ctrl.signal)) target.value = splitReply(t).ja;
  } catch (e) {
    err.value = e instanceof TalkError ? e.message : String(e);
  } finally {
    busy.value = false;
    ctrl = null;
  }
}

const askHint = () => scene.value && ask(hintPrompt(scene.value), hint);
const askFeedback = () => scene.value && ask(feedbackPrompt(scene.value), feedback);

function stop() {
  ctrl?.abort();
  ctrl = null;
}

/** 語音輸入（瀏覽器內建的語音辨識） */
type Recog = { lang: string; interimResults: boolean; onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null; onend: (() => void) | null; start: () => void };
const RecogCtor = (window as unknown as { SpeechRecognition?: new () => Recog; webkitSpeechRecognition?: new () => Recog }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: new () => Recog }).webkitSpeechRecognition;
const canListen = !!RecogCtor;
const listening = ref(false);
function listen() {
  if (!RecogCtor || listening.value) return;
  const r = new RecogCtor();
  r.lang = 'ja-JP';
  r.interimResults = false;
  r.onresult = (e) => {
    draft.value = (draft.value ? draft.value + ' ' : '') + (e.results[0]?.[0].transcript ?? '');
  };
  r.onend = () => (listening.value = false);
  listening.value = true;
  try {
    r.start();
  } catch {
    listening.value = false;
  }
}
</script>
