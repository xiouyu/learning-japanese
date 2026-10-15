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

網站用「Email 驗證碼」登入，不用密碼：寄信後把信裡的 6 位數驗證碼填進登入視窗；也可以直接點信裡的登入連結。

1. 左側選 **Authentication** › **Sign In / Providers**，確認 **Email** 是開啟的。
2. 左側選 **Authentication** › **URL Configuration**（點連結登入時要用）：
   - **Site URL** 填 `https://xiouyu.github.io/learning-japanese/`
   - **Redirect URLs** 按 **Add URL**，加入 `https://xiouyu.github.io/learning-japanese/`（本機開發另外加 `http://localhost:9000/`）

### 用 Gmail 寄登入信（SMTP）

Supabase 免費專案要設定自己的寄信服務，才能改信件內容、讓信裡出現驗證碼。

1. Google 帳號先開啟[兩步驟驗證](https://myaccount.google.com/signinoptions/twosv)，再到[應用程式密碼](https://myaccount.google.com/apppasswords)建立一組（名稱填 `Supabase`），複製那 16 個字的密碼。這組密碼不要給別人。
2. Supabase 左側選 **Authentication** › **Emails** › **SMTP Settings**，打開 **Enable custom SMTP**：

   | 欄位 | 填什麼 |
   |---|---|
   | Sender email | 你的 Gmail 地址 |
   | Sender name | `一步一步學習日文` |
   | Host | `smtp.gmail.com` |
   | Port | `465` |
   | Username | 你的 Gmail 地址 |
   | Password | 上一步的應用程式密碼（不要有空格） |

3. 到 **Authentication** › **Emails** › **Templates**，把 **Magic Link** 和 **Confirm signup** 兩個範本都改成：

   主旨：`一步一步學習日文 登入驗證碼`

   ```html
   <h2>一步一步學習日文 登入</h2>
   <p>驗證碼：<strong style="font-size:24px;letter-spacing:4px">{{ .Token }}</strong></p>
   <p>在網站的登入視窗輸入驗證碼，或點這個連結登入：<a href="{{ .ConfirmationURL }}">登入</a></p>
   <p>1 小時內有效。如果不是你本人操作，可以忽略這封信。</p>
   ```

> 個人 Gmail 每天最多約 500 封；Supabase 預設每小時 30 封，要改到 **Authentication › Rate Limits**。
> iPhone 加到主畫面的 App 跟 Safari 是分開的，在 App 裡請用驗證碼登入；點連結會在 Safari 登入。

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
