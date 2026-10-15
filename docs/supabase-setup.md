# 設定 Supabase（跨裝置同步進度）

網站沒設定 Supabase 也能正常使用，只是不會出現「登入同步」按鈕。照下面的步驟設定一次，大約 10 分鐘。免費方案就夠用。

## 1. 建立 Supabase 專案

1. 到 <https://supabase.com/> 註冊並按 **New project**。
2. 名稱隨意（例如 `gojuon`），地區選 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)** 比較快。
3. 資料庫密碼自己記下來（這個網站用不到，但之後管理資料庫會用到）。

## 2. 建立資料表

1. 左側選 **SQL Editor** › **New query**。
2. 把 [`supabase/migrations/20261015000000_progress.sql`](../supabase/migrations/20261015000000_progress.sql) 的內容整段貼上，按 **Run**。

這會建立 `progress` 資料表（每個帳號一列），並開啟 Row Level Security：每個人只能讀寫自己的紀錄。

## 3. 設定 Email 驗證碼登入

網站用「Email 收 6 位數驗證碼」登入，不用密碼。這樣在手機主畫面開的 App 也能直接輸入驗證碼，不會被連結帶到別的瀏覽器。

1. 左側選 **Authentication** › **Sign In / Providers**，確認 **Email** 是開啟的。
2. 左側選 **Authentication** › **Emails** › **Templates** › **Magic Link**，把內容改成會顯示驗證碼，例如：

   ```html
   <h2>五十音練習帳 登入驗證碼</h2>
   <p>你的驗證碼是：<strong>{{ .Token }}</strong></p>
   <p>請在 1 小時內輸入。如果不是你本人操作，可以忽略這封信。</p>
   ```

   主旨可以改成 `五十音練習帳 登入驗證碼`。**一定要有 `{{ .Token }}`**，不然信裡只有連結、沒有驗證碼。
3. 第一次登入的新帳號會收到 **Confirm signup** 範本的信，也照上面加上 `{{ .Token }}`。

> Supabase 內建的寄信服務每小時只能寄很少封信（適合自己用）。如果要給很多人用，到 **Authentication › Emails › SMTP Settings** 設定自己的寄信服務（例如 Resend、SendGrid）。

## 4. 取得連線資訊

左側選 **Project Settings** › **API**（或 **Data API**），記下：

- **Project URL**：例如 `https://abcdefgh.supabase.co`
- **anon / publishable key**：一長串文字

這兩個值本來就是要放在前端的，可以公開；資料安全由第 2 步的 Row Level Security 保護。**不要**用 `service_role` / secret key。

## 5. 讓 GitHub Pages 上的網站使用

1. 到 GitHub 專案的 **Settings › Secrets and variables › Actions**，切到 **Variables** 分頁。
2. 新增兩個 Repository variable：
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_ANON_KEY` = anon / publishable key
3. 到 **Actions** › **Deploy to GitHub Pages** › **Run workflow** 重新部署。

## 6. 在自己電腦開發時使用

把 `.env.example` 複製成 `.env`，填入同樣的兩個值後執行 `npm run dev`。`.env` 不會被 commit。

## 同步規則

- 進度（通過幾步）和字卡熟練度只會增加：兩台裝置合併時取比較大的值，不會因為同步而倒退。
- 練習範圍、測驗模式、平假名／片假名切換這些偏好，以最後修改的那台裝置為準。
- 沒網路時照常存在裝置上，連上網路後自動合併上傳。
