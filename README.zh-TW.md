<div align="center">
  <p>
    🌐
    <strong><a href="README.md">English</a></strong>
    &nbsp;｜&nbsp;
    <strong>繁體中文 ✓</strong>
  </p>
</div>

# github-statcards

自動產生 GitHub Release 的累積下載量（Badge）與累積下載統計（Card），可直接放進 README。

GitHub API 只提供目前的累計下載量，沒有歷史資料。本專案透過 GitHub Actions 定期記錄快照，計算各期新增下載量，並將結果存放在自己的 Git 歷史中，不需要外部服務。

## 效果預覽

#### 1. 累積下載量（Badge）

<img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/asd880921/github-statcards/main/badges/overtranslate-downloads.json" alt="累積下載量" />

#### 2. 累積下載統計（Card）

<img src="https://raw.githubusercontent.com/asd880921/github-statcards/main/cards/overtranslate-downloads-history.zh-TW.svg" alt="累積下載統計" />

## 快速開始

1. 點選 **Use this template** 建立自己的倉庫（也可以 fork）。
2. 刪除 `data/`、`badges/`、`cards/` 內的範例檔案，避免沿用本倉庫的統計資料；缺少的檔案會由腳本自動建立。
3. 編輯 `config.json`，設定要統計的倉庫與 Release 資產。
4. 前往 **Settings → Actions → General → Workflow permissions**，選擇 **Read and write permissions**，讓 workflow 能將結果提交回倉庫。
5. 將設定推送到 `main`。workflow 會立即執行，之後依排程自動更新。

預設每天在 UTC 04:00、16:00 執行。可修改 `.github/workflows/update-badges.yml` 中的 `cron`，也可以從 Actions 頁面手動執行。

## 設定 badge

在 `config.json` 的 `badges` 陣列中加入設定：

| 欄位 | 說明 |
|------|------|
| `id` | 輸出檔名，會產生 `badges/<id>.json` 與 `data/<id>.json` |
| `repo` | 來源倉庫，格式為 `owner/name` |
| `assets` | 要加總的資產檔名，支援 `*` 萬用字元；`["*"]` 代表所有資產 |
| `label` | badge 左側文字，預設為 `downloads` |
| `color` / `labelColor` | badge 顏色，預設為 `2ea44f` / `24292f` |
| `style` | badge 樣式，預設為 `for-the-badge` |
| `includePrereleases` | 是否計入 pre-release，預設為 `true`；draft 不會計入 |

`repo` 必須是公開倉庫，或目前使用的 token 必須有權限讀取。

## 啟用累積下載統計（Card）

在 badge 設定中加入 `history`：

| 欄位 | 說明 |
|------|------|
| `period` | 統計週期：`day`、`week`、`month`、`year`；預設為 `day` |
| `limit` | 顯示最近幾期，預設為 `14` |
| `timezone` | 分期時區，例如 `+08:00`；預設為 UTC（`+00:00`） |
| `title` | 卡片標題，預設為倉庫名稱 |
| `accent` | 圖表主色，預設沿用 badge 的 `color` |
| `icon` | 卡片使用的 SVG 圖示路徑，需相對於倉庫根目錄 |
| `locales` | 產生的語系，支援 `en`、`zh-TW`；預設為 `["en"]` |

`locales` 的第一個語系使用原檔名，其餘語系會加上後綴。例如：

- `cards/<id>-history.svg`
- `cards/<id>-history.zh-TW.svg`

## 使用產生的圖片

以下範例已將圖片連回本倉庫，作為出處標示。

累積下載量（Badge）：

```html
<a href="https://github.com/asd880921/github-statcards">
  <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/OWNER/REPOSITORY/main/badges/ID.json" alt="累積下載量" />
</a>
```

累積下載統計（Card）：

```html
<a href="https://github.com/asd880921/github-statcards">
  <img src="https://raw.githubusercontent.com/OWNER/REPOSITORY/main/cards/ID-history.zh-TW.svg" alt="累積下載統計" />
</a>
```

## 輸出檔案

- `badges/<id>.json`：供 shields.io 讀取的 badge 資料
- `data/<id>.json`：完整統計資料，包括總下載量、資產明細、Release 數量與更新時間
- `data/history/<id>.csv`：歷史快照
- `cards/<id>-history.svg`：累積下載統計卡片
- `cards/<id>-history.<locale>.svg`：其他語系的累積下載統計卡片

## 本機執行

更新 badge 與卡片：

```bash
node scripts/update-badges.mjs
```

未設定 `GITHUB_TOKEN` 時，公開倉庫仍可使用，但會受到 GitHub API 每小時 60 次的限制。

若歷史 CSV 缺少資料，可從 Git 歷史中的 `data/<id>.json` 重建：

```bash
node scripts/backfill-history.mjs
```

## 配色預覽

用瀏覽器開啟 `tools/badge-preview.html`，即可預覽 badge 在 GitHub 淺色與深色背景下的效果，並取得可貼入 `config.json` 的設定。

## 注意事項

- 新增下載量由相鄰快照相減得出，分期時間以 workflow 實際執行時間為準；累計下載量不受影響。
- Badge 與卡片會經過快取，更新後可能需要幾分鐘才會顯示新資料。
- 卡片語系由引用的檔案決定，不會依讀者語言自動切換。
- 卡片的深色或淺色模式跟隨讀者的作業系統設定，不一定與 GitHub 主題相同。

## 授權

本專案採用 [MIT License](LICENSE)。散布本專案的程式碼或其重要部分時，請依授權條款保留版權與授權聲明。
如果這些 Badge 或 Card 對你有幫助，歡迎註明出處，或讓圖片連回本倉庫。這是署名建議，不是額外的使用限制。
