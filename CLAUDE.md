# 一步一步學習日文

日文學習網站，目前內容是五十音和《いろどり》入門（A1）第 1～18 課（Quasar CLI + Vue 3 + TypeScript + Pinia，PWA，Supabase 同步）。使用者是台灣的日文初學者，一律用繁體中文、台灣用語回覆。教學方式見 `docs/teaching-guide.md`。

## 常用指令

- `npm run typecheck`、`npm test`、`npm run build`（輸出 `dist/pwa`）
- 改完程式先跑 typecheck 和 test 再 commit

## 慣例

- 教材內容只放在 `src/data/steps.json`；新增一步就在最後加一筆，加完跑 `npm test`（步驟 id 要連續，不能插在中間，舊的學習紀錄靠 id 記進度）
- Can-do 自我檢核的清單在 `src/data/cando.json`，生活文化專欄在 `src/data/culture.json`，AI 會話的情境在 `src/data/talk.json`（連 Ollama 的程式在 `src/lib/talk.ts`）
- 會話每一句的錄音時間（`lines[].at`，角色扮演用）是 `scripts/dialog_lines.py --save` 自動切的；新增有錄音的會話後要重跑
- 學習紀錄格式和合併規則在 `src/lib/progress.ts`；改格式時 `normalize()` 要能讀舊資料
- 自訂樣式在 `src/css/app.css`，class 名稱不要用 Quasar 已經用的工具類別（例如 `row`、`wrap`、`col`）
- 部署：推到 `main` 會自動發布到 GitHub Pages
- 課本原始教材（PDF、mp3）在私人專案 `xiouyu/learning-japanese-materials`，不要加進這個公開專案；網站只放壓縮過的音檔（`public/audio/`）
