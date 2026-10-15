# 五十音練習帳

日文假名學習網站（Quasar CLI + Vue 3 + TypeScript + Pinia，PWA，Supabase 同步）。使用者是台灣的日文初學者，一律用繁體中文、台灣用語回覆。教學方式見 `docs/teaching-guide.md`。

## 常用指令

- `npm run typecheck`、`npm test`、`npm run build`（輸出 `dist/pwa`）
- 改完程式先跑 typecheck 和 test 再 commit

## 慣例

- 教材內容只放在 `src/data/steps.json`；新增一步就在最後加一筆，加完跑 `npm test`
- 學習紀錄格式和合併規則在 `src/lib/progress.ts`；改格式時 `normalize()` 要能讀舊資料
- 自訂樣式在 `src/css/app.css`，class 名稱不要用 Quasar 已經用的工具類別（例如 `row`、`wrap`、`col`）
- 部署：推到 `main` 會自動發布到 GitHub Pages
