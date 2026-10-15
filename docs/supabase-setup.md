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

## 3. 設定登入方式

網站用「Email 登入信」登入，不用密碼：寄信後點信裡的「Sign in」連結，就會回到練習帳並自動登入。

1. 左側選 **Authentication** › **Sign In / Providers**，確認 **Email** 是開啟的。
2. 左側選 **Authentication** › **URL Configuration**：
   - **Site URL** 填 `https://xiouyu.github.io/learning-japanese/`
   - **Redirect URLs** 按 **Add URL**，加入 `https://xiouyu.github.io/learning-japanese/`（本機開發另外加 `http://localhost:9000/`）

   沒設定的話，點信裡的連結會被導到 `localhost:3000`，打不開。

### （選用）改用 6 位數驗證碼

點連結登入有一個限制：**iPhone 加到主畫面的 App** 跟 Safari 是分開的，點信裡的連結會在 Safari 登入，主畫面的 App 不會跟著登入。如果想在 iPhone 主畫面的 App 裡登入，需要讓登入信多一組驗證碼：

1. Supabase 免費專案要先設定自己的寄信服務才能改信件內容：**Authentication** › **Emails** › **SMTP Settings**，可以用 Gmail（要先開兩步驟驗證，再建立「應用程式密碼」）或 Resend。
2. 設定好後到 **Authentication** › **Emails** › **Templates**，把 **Magic Link** 和 **Confirm signup** 的內容改成：

   ```html
   <h2>五十音練習帳 登入</h2>
   <p>驗證碼：<strong>{{ .Token }}</strong></p>
   <p>或點這個連結登入：<a href="{{ .ConfirmationURL }}">登入練習帳</a></p>
   <p>1 小時內有效。如果不是你本人操作，可以忽略這封信。</p>
   ```

網站的登入視窗兩種都支援：點連結，或把驗證碼填進「驗證碼（選填）」。

> Supabase 內建的寄信服務每小時只能寄很少封信，同一個信箱也要隔一段時間才能再寄。只有自己用通常夠，寄不出去時等一下再試。

## 4. 取得連線資訊

左側選 **Project Settings** › **API**（或 **Data API**），記下：

- **Project URL**：例如 `https://abcdefgh.supabase.co`
- **Publishable key**（Project Settings › API Keys，開頭是 `sb_publishable_`；舊專案叫 anon key）

這兩個值本來就是要放在前端的，可以公開；資料安全由第 2 步的 Row Level Security 保護。**不要**用 `service_role` 或 `sb_secret_` 開頭的 secret key。

## 5. 讓 GitHub Pages 上的網站使用

1. 到 GitHub 專案的 **Settings › Secrets and variables › Actions**，切到 **Variables** 分頁。
2. 新增兩個 Repository variable：
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_ANON_KEY` = publishable key
3. 到 **Actions** › **Deploy to GitHub Pages** › **Run workflow** 重新部署。

## 6. 在自己電腦開發時使用

把 `.env.example` 複製成 `.env`，填入同樣的兩個值後執行 `npm run dev`。`.env` 不會被 commit。

## 同步規則

- 進度（通過幾步）和字卡熟練度只會增加：兩台裝置合併時取比較大的值，不會因為同步而倒退。
- 練習範圍、測驗模式、平假名／片假名切換這些偏好，以最後修改的那台裝置為準。
- 沒網路時照常存在裝置上，連上網路後自動合併上傳。
