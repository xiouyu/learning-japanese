# 一步一步學習日文

日文學習網站，目前內容是五十音、《いろどり》入門（A1）第 1～18 課和初級1（A2）第 1 課起（Quasar CLI + Vue 3 + TypeScript + Pinia，PWA，Supabase 同步）。使用者是台灣的日文初學者，一律用繁體中文、台灣用語回覆。教學方式見 `docs/teaching-guide.md`。

## 常用指令

- `npm run typecheck`、`npm test`、`npm run build`（輸出 `dist/pwa`）
- 改完程式先跑 typecheck 和 test 再 commit

## 慣例

- 教材內容只放在 `src/data/steps.json`；新增一步就在最後加一筆，加完跑 `npm test`（步驟 id 要連續，不能插在中間，舊的學習紀錄靠 id 記進度）
- `steps.json` 在建置時由 `build/steps-split.ts` 拆開：核心資料（`virtual:steps-core`）跟著主程式載入，每一步的 `dialogs`、`notes` 依單元拆成小檔，學習頁用 `loadDetail()`（`src/data/detail.ts`）載入；編輯教材照樣只改 `steps.json`
- Can-do 自我檢核的清單在 `src/data/cando.json`，生活文化專欄在 `src/data/culture.json`（都是用到才載入：`src/data/cando.ts`、`loadCulture()`），AI 會話的情境在 `src/data/talk.json`（連 Ollama 的程式在 `src/lib/talk.ts`）
- 會話每一句的錄音時間（`lines[].at`，角色扮演用）是 `scripts/dialog_lines.py --save` 自動切的；新增有錄音的會話後要重跑
- 學習紀錄格式和合併規則在 `src/lib/progress.ts`；改格式時 `normalize()` 要能讀舊資料
- 自訂樣式在 `src/css/app.css`，class 名稱不要用 Quasar 已經用的工具類別（例如 `row`、`wrap`、`col`）
- 部署：推到 `main` 會自動發布到 GitHub Pages
- 每日學習提醒：`.github/workflows/reminder.yml` 每天跑 `scripts/reminder/remind.mjs`（自己的 package.json，跟網站分開），用唯讀帳號 `reminder_reader` 讀 `progress.data.daily`，設定見 `docs/reminder-setup.md`；改了 `daily` 的格式要一起改這裡
- 初級的步驟 `part` 寫成「初級1 第N課 …」、`source` 也用「初級1 第N課」開頭（入門的課號、大會考、Can-do 只認「第N課」開頭的）；初級1 的音檔放在 `public/audio/irodori/A2-1/Lxx/`
- 課本原始教材（PDF、mp3）在私人專案 `xiouyu/learning-japanese-materials`（入門在 `A1/`、初級1 在 `A2-1/`），不要加進這個公開專案；網站只放壓縮過的音檔（`public/audio/`）
