-- 一步一步學習日文：家裡電腦 SQL Server 的備份資料庫
-- 由 Initialize-BackupDatabase.ps1 執行（用 GO 分段），重複執行也不會出錯。

IF DB_ID(N'$(Database)') IS NULL
    CREATE DATABASE [$(Database)];
GO

USE [$(Database)];
GO

-- 每個帳號最新的一份進度
IF OBJECT_ID(N'dbo.Progress', N'U') IS NULL
CREATE TABLE dbo.Progress (
    UserId     uniqueidentifier  NOT NULL CONSTRAINT PK_Progress PRIMARY KEY,
    Email      nvarchar(320)     NULL,
    Data       nvarchar(max)     NOT NULL CONSTRAINT CK_Progress_Data CHECK (ISJSON(Data) = 1),
    UpdatedAt  datetimeoffset(3) NOT NULL,   -- Supabase 上最後一次修改的時間
    BackedUpAt datetimeoffset(3) NOT NULL CONSTRAINT DF_Progress_BackedUpAt DEFAULT SYSDATETIMEOFFSET()
);
GO

-- 每次進度有變化就留一筆，可以還原到過去任何一次備份
IF OBJECT_ID(N'dbo.ProgressHistory', N'U') IS NULL
CREATE TABLE dbo.ProgressHistory (
    Id         bigint IDENTITY(1, 1) NOT NULL CONSTRAINT PK_ProgressHistory PRIMARY KEY,
    UserId     uniqueidentifier  NOT NULL,
    Email      nvarchar(320)     NULL,
    Data       nvarchar(max)     NOT NULL CONSTRAINT CK_ProgressHistory_Data CHECK (ISJSON(Data) = 1),
    UpdatedAt  datetimeoffset(3) NOT NULL,
    BackedUpAt datetimeoffset(3) NOT NULL CONSTRAINT DF_ProgressHistory_BackedUpAt DEFAULT SYSDATETIMEOFFSET()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProgressHistory_User' AND object_id = OBJECT_ID(N'dbo.ProgressHistory'))
    CREATE INDEX IX_ProgressHistory_User ON dbo.ProgressHistory (UserId, UpdatedAt DESC);
GO
