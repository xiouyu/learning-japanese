# 設定每日學習提醒（Gmail）

每天台灣時間 19:30，GitHub 會自動檢查你今天有沒有做過任何一題；**一題都沒做**，就從你的 Gmail 寄一封提醒信給你，信裡的按鈕可以直接開始今日複習。今天有練過就不會寄。

```
GitHub Actions（每天 19:30）
  └─ scripts/reminder/remind.mjs
       ├─ 用唯讀帳號 reminder_reader 查 Supabase：今天做了幾題（data.daily）
       └─ 0 題 → 用 Gmail 寄提醒信
```

- 只有**登入同步**時才有效：練習紀錄要上傳到 Supabase，GitHub 才看得到。
- 用專用的唯讀帳號 `reminder_reader`，只能用 Email 查「每天做了幾題」和最後同步時間，讀不到其他資料，也不能修改任何東西。
- 還沒設定好之前，排程會直接略過，不會每天顯示失敗。

照下面的步驟設定一次，大約 10 分鐘。

## 1. 在 Supabase 建立唯讀帳號

1. 打開 Supabase 專案，左側選 **SQL Editor** › **New query**。
2. 把 [`scripts/reminder/setup.sql`](../scripts/reminder/setup.sql) 的內容整段貼上，按 **Run**。
3. 下方結果會顯示一組 48 個字的隨機密碼（欄位名稱是「REMINDER_DB_PASSWORD（複製這個）」），**複製起來**，第 4 步會用到。這組密碼不要給別人。

> 密碼弄丟了沒關係，再執行一次 `setup.sql` 就會換一組新的，到 GitHub 更新 `REMINDER_DB_PASSWORD` 就好。

## 2. 查連線用的 host

1. Supabase 專案最上方按 **Connect**。
2. 選 **Session pooler**（不要選 Direct connection，GitHub 的機器連不到它的 IPv6）。
3. 記下連線資訊裡的 **host**，長得像 `aws-0-ap-northeast-1.pooler.supabase.com`。

> 設定過學習進度備份的話，跟 `backup\local\config.json` 裡的 `supabase.host` 是同一個。

## 3. 建立 Gmail 應用程式密碼

1. 到 [應用程式密碼](https://myaccount.google.com/apppasswords)，名稱填 `學習提醒`，按 **建立**。
2. 複製那 16 個字的密碼（空格可有可無）。

跟 Supabase 寄登入信用的那組分開：哪天不想收提醒，刪掉這組就好，不會影響登入信。

## 4. 填到 GitHub

打開 GitHub 專案的 **Settings › Secrets and variables › Actions**。

**Variables** 分頁按 **New repository variable**：

| 名稱 | 填什麼 |
|---|---|
| `REMINDER_DB_HOST` | 第 2 步的 host |

（`SUPABASE_URL` 部署網站時已經設定過了，提醒程式會從裡面取出專案代號。）

**Secrets** 分頁按 **New repository secret**，一個一個新增：

| 名稱 | 填什麼 |
|---|---|
| `REMINDER_DB_PASSWORD` | 第 1 步的 48 個字密碼 |
| `GMAIL_USER` | 你的 Gmail 地址 |
| `GMAIL_APP_PASSWORD` | 第 3 步的 16 個字密碼 |

選填（不填就都用 `GMAIL_USER`）：

| 名稱 | 什麼時候要填 |
|---|---|
| `REMINDER_ACCOUNT` | 網站「登入同步」用的 Email 跟 Gmail 不一樣時，填登入用的那個 |
| `REMINDER_TO` | 想把提醒寄到別的信箱時 |

## 5. 寄一封測試信

1. GitHub 專案上方選 **Actions** › 左側 **每日學習提醒** › 右邊 **Run workflow**。
2. 勾選「今天練過也寄一封（測試寄信用）」，按綠色的 **Run workflow**。
3. 大約 30 秒後執行完成（綠色勾勾），到 Gmail 收信。今天已經練過的話，主旨會有「【測試】」。

之後每天 19:30 會自動檢查，不用再做什麼。

## 常見問題

| 狀況 | 怎麼辦 |
|---|---|
| 信只出現在「寄件備份」，收件匣沒有 | Gmail 自己寄給自己有時不會進收件匣。把 `REMINDER_TO` 設成另一個信箱，或在 Gmail 的「所有郵件」裡找。 |
| `Tenant or user not found` | host 不是 **Session pooler** 的，或 `SUPABASE_URL` 不對。 |
| `password authentication failed` | `REMINDER_DB_PASSWORD` 貼錯，或之後又執行過一次 `setup.sql`（密碼換了）。 |
| `Invalid login` / `535` | Gmail 應用程式密碼不對，或 `GMAIL_USER` 跟建立應用程式密碼的帳號不一樣。 |
| `找不到 … 的學習紀錄` | 網站登入用的 Email 跟 `GMAIL_USER` 不一樣：設定 `REMINDER_ACCOUNT`。或是還沒在網站上登入同步過。 |
| 明明練過了還收到提醒 | 練習的那台裝置還沒同步上去（例如離線練習）。打開網站連上網路就會自動同步。 |
| 提醒比 19:30 晚很多才到 | GitHub 排程尖峰時段會延遲。想更早，改 `.github/workflows/reminder.yml` 的 `cron`（時間是 UTC，台灣時間減 8 小時）。 |
| 突然都沒收到提醒 | 公開專案超過 60 天沒有任何更新，GitHub 會自動停用排程（會寄信通知）。到 **Actions › 每日學習提醒** 按 **Enable workflow**。 |

執行失敗時（密碼錯、連不上），GitHub 預設會寄「Run failed」的信通知你。

## 不想收提醒了

到 **Actions › 每日學習提醒**，右上角 **⋯** › **Disable workflow**。要完全移除的話，再到 Supabase SQL Editor 執行：

```sql
drop function if exists reminder.daily_of(text);
drop schema if exists reminder;
drop role if exists reminder_reader;
```
