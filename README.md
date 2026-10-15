# 一步一步學習日文

跟著《いろどり 生活の日本語》入門（A1）一步一步學日文的互動練習網站。先用 33 步學平假名、濁音、拗音和片假名，再接課本第 1～18 課（第 34～153 步），通過每一步的解鎖測驗才會開放下一步。

- **可以離線使用（PWA）**：第一次開啟後就存在裝置上，可以加到手機主畫面，沒網路也能練習。
- **跨裝置同步進度**：用 Email 登入信（點連結，或輸入驗證碼）登入後，手機和電腦接著同一個進度學（使用 Supabase，沒設定也能正常使用）。

## 功能

| 分頁 | 功能 |
|---|---|
| 學習 | 依單元和步驟看字卡（田字格、拼音、注音對照、來源漢字），點一下播放發音；描字板可以照淡色範本寫，也能隱藏範本自己寫；下方有重點、單字、解鎖測驗和學習路線。 |
| 字卡 | 選練習範圍後翻面記憶，「不熟」的字會在 3 張後再出現。鍵盤：空白鍵翻面、1 不熟、2 記住了。 |
| 測驗 | 每次 10 題，三種模式：看字選拼音、聽音選字、看拼音選字。解鎖測驗三種題型混合，10 題答對 8 題通過。 |
| 單字 | 全部已解鎖的單字，可個別或全部顯示答案、打亂順序、播放發音。 |
| 五十音表 | 平假名／片假名切換，已解鎖的是實線框，字卡「記住了」3 次以上會變藍框。 |

## 技術

- [Quasar](https://quasar.dev/)（Quasar CLI + Vite）、Vue 3、TypeScript、Pinia
- PWA：Quasar PWA 模式（Workbox），Google Fonts 也會快取
- 同步：[Supabase](https://supabase.com/)（Email 登入信 + Postgres，Row Level Security 只能讀寫自己的資料）
- 測試：Vitest

## 開發

需要 Node.js 22.12 以上。

```bash
npm install        # 也會一起安裝 src-pwa 的套件
npm run dev        # 開發伺服器（PWA 模式）
npm run typecheck  # 型別檢查
npm test           # 單元測試
npm run build      # 打包到 dist/pwa
```

要在本機測試登入同步，把 `.env.example` 複製成 `.env` 填入 Supabase 設定。設定方式見 [docs/supabase-setup.md](docs/supabase-setup.md)。

## 專案結構

```
src/
  data/
    steps.json          教材資料：33 步的假名、說明、重點、單字
    types.ts            教材資料的型別
    index.ts            學習路線、五十音表、全部假名列表
  lib/
    kana.ts             出題、片假名轉換等工具
    progress.ts         學習紀錄的格式、存取和合併規則
    supabase.ts         Supabase 連線（沒設定時為 null）
  stores/
    progress.ts         學習進度（Pinia，存在 localStorage）
    sync.ts             登入和跨裝置同步
  composables/
    useSpeech.ts        日文發音（Web Speech API）
  components/           描字板、單字卡、練習範圍、進度列、登入對話框
  pages/                學習、字卡、測驗、單字、五十音表
  layouts/MainLayout.vue
  css/app.css           樣式（淺色／深色主題）
src-pwa/                PWA 設定（manifest、service worker 註冊）
supabase/migrations/    Supabase 資料表和權限設定
test/                   單元測試
docs/                   教學指南、Supabase 設定說明
```

## 加新的一步

在 `src/data/steps.json` 最後加一筆，其他畫面（學習路線、字卡、測驗、單字、進度）都會自動更新。欄位定義在 `src/data/types.ts`：

```json
{
  "id": 34,
  "row": "第1課",
  "title": "おはようございます",
  "part": "課本第1課",
  "kind": "hira",
  "rule": "一句話說明這一步的規則。",
  "kana": [
    { "k": "た", "r": "ta", "z": "像「ㄊㄚ」", "o": "太" },
    { "k": "ち", "r": "chi", "z": "像「ㄑㄧ」", "o": "知", "ex": true }
  ],
  "notes": ["重點說明…"],
  "words": [{ "w": "くち", "r": "kuchi", "m": "嘴巴" }],
  "note": "學習路線上的小註解（可省略）"
}
```

| 欄位 | 說明 |
|---|---|
| `k` / `r` / `z` | 假名、羅馬拼音、發音說明（對照注音） |
| `o` / `ol` | 來源漢字；`ol` 是標籤文字（例如「由」），沒填就顯示「來源」 |
| `ex` | `true` 會在字卡右上角顯示「例外」 |
| `snd` | 同音字的實際發音（例如 を 填 `o`），測驗時不會把同音字放在同一題的選項 |
| `kind` | `kata` 時來源說明會寫「取自漢字的一部分」，否則寫「草書」 |

加完跑一次 `npm test`，會檢查每一步的資料是否完整、能不能出解鎖測驗。

## 部署到 GitHub Pages

`.github/workflows/deploy.yml` 會在推到 `main` 時跑型別檢查、測試、打包並發布到 `https://<帳號>.github.io/<專案名稱>/`（專案改名也會自動跟著改）。

第一次使用要到 GitHub 專案的 **Settings › Pages**，把 **Source** 設成 **GitHub Actions**。要啟用登入同步，另外在 **Settings › Secrets and variables › Actions › Variables** 新增 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`。

## 備份

`backup/` 裡的 PowerShell 腳本每天把 Supabase 上的學習進度備份到家裡電腦的 SQL Server，也能從備份還原。第一次設定請用 Claude Code 打開專案，說「照 backup/CLAUDE-SETUP.md 幫我設定學習進度備份」。詳見 [backup/README.md](backup/README.md)。

## 字型

假名用日本小學課本的「教科書體」：Windows 內建 UD デジタル教科書体，其他裝置（手機、Mac）沒有這個字型，改用 Google Fonts 的 BIZ UD明朝。

## 注意

- 沒登入時，學習紀錄只存在這個瀏覽器。換網址（例如從 Claude Artifact 換到 GitHub Pages）、換電腦或換瀏覽器，紀錄不會跟著走；登入後就會同步。
- 假名和課本句子的發音是《いろどり》的真人錄音（`public/audio/irodori/A1/`，假名一個字一個檔在 `kana/`）；課本沒有錄音的單字才用瀏覽器內建的語音合成。頁首的「朗讀語音」按鈕可以選要用哪個語音（只存在這台裝置）；iPhone 預設跟著「設定 › 輔助使用 › 朗讀內容 › 聲音 › 日文」裡選的語音。
