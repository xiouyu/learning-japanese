# 五十音練習帳

いろどり 入門 A1 前的假名基礎互動練習網站。從平假名、濁音、拗音到片假名，共 33 步，通過每一步的解鎖測驗才會開放下一步。

原本是一個單一 HTML 檔的 Claude Artifact，現在拆成 [Vite](https://vite.dev/) 專案，方便之後加功能（例如 PWA 離線使用、TypeScript、前端框架、帳號同步進度等）。

## 功能

| 分頁 | 功能 |
|---|---|
| 學習 | 依單元和步驟看字卡（田字格、拼音、注音對照、來源漢字），點一下播放發音；描字板可以照淡色範本寫，也能隱藏範本自己寫；下方有重點、單字、解鎖測驗和學習路線。 |
| 字卡 | 選練習範圍後翻面記憶，「不熟」的字會在 3 張後再出現。鍵盤：空白鍵翻面、1 不熟、2 記住了。 |
| 測驗 | 每次 10 題，三種模式：看字選拼音、聽音選字、看拼音選字。解鎖測驗三種題型混合，10 題答對 8 題通過。 |
| 單字 | 全部已解鎖的單字，可個別或全部顯示答案、打亂順序、播放發音。 |
| 五十音表 | 平假名／片假名切換，已解鎖的是實線框，字卡「記住了」3 次以上會變藍框。 |

## 開發

需要 Node.js 18 以上。

```bash
npm install
npm run dev       # 開發伺服器，存檔會自動重新整理
npm run build     # 打包到 dist/
npm run preview   # 預覽打包後的結果
```

## 專案結構

```
index.html            頁面骨架（標題、進度列、分頁）
public/favicon.svg    網站圖示
src/
  main.js             畫面邏輯：學習、字卡、測驗、單字、五十音表、解鎖進度
  styles.css          樣式（淺色／深色主題）
  data/
    steps.json        教材資料：33 步的假名、說明、重點、單字
    index.js          學習路線（ROADMAP）和五十音表（GOJUON）
  lib/
    store.js          學習紀錄（localStorage，key 前綴 gojuon:）
    speech.js         日文發音（Web Speech API，ja-JP）
    pad.js            描字板
    utils.js          共用小工具
docs/
  teaching-guide.md   學習者資料、教材與教學方式
```

## 加新的一步

在 `src/data/steps.json` 最後加一筆，其他畫面（學習路線、字卡、測驗、單字、進度）都會自動更新：

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

## 部署到 GitHub Pages

`.github/workflows/deploy.yml` 會在推到 `main` 時自動打包並發布。第一次使用要到 GitHub 專案的 **Settings › Pages**，把 **Source** 設成 **GitHub Actions**。

## 注意

- 學習紀錄存在各自瀏覽器的 localStorage。換網址（例如從 Claude Artifact 換到 GitHub Pages）、換電腦或換瀏覽器，紀錄不會跟著走。
- 發音用瀏覽器內建的語音合成，Chrome 或 Edge 效果最好；找不到日文語音時，頁面上方會出現提示。
