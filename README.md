# github-badges

集中產生 GitHub 統計 badge 的倉庫。

定時的 workflow 會呼叫 GitHub API 統計指定倉庫 Release 資產的下載量，
把結果寫成 [shields.io endpoint](https://shields.io/badges/endpoint-badge) 格式的 JSON 並 commit 在這裡，
主倉的 README 只需要引用這個 JSON，統計用的 commit 就不會汙染主倉的歷史。

## 使用中的 badge

| Badge | 來源倉庫 | 統計資產 |
|-------|----------|----------|
| `badges/overtranslate-downloads.json` | [asd880921/OverTranslate](https://github.com/asd880921/OverTranslate) | `OverTranslate-win-Setup.exe` + `OverTranslate-win-Portable.zip` |

引用方式（Markdown）：

```markdown
![total downloads](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/asd880921/github-badges/main/badges/overtranslate-downloads.json)
```

> `raw.githubusercontent.com` 有約 5 分鐘的快取，badge 數字最多會延遲數分鐘才更新。

## 下載歷史卡片

GitHub API 只提供「當下累計」的下載量，沒有任何歷史，所以增長量一律靠快照相減得出。
每次 workflow 執行都會把累計值追加到 `data/history/<id>.csv`，再聚合成一張 SVG 統計卡片：

- **折線 / 面積** — 各期結束時的累積總量，對應左側刻度
- **柱狀** — 各期新增量，另一套尺度（只佔繪圖區下半），最高的一根會直接標出數值
- **右上角膠囊** — `TOTAL` 總下載量、`PERIOD` 顯示區間內的新增合計、`AVG` 每期平均

引用方式（Markdown）：

```markdown
![downloads history](https://raw.githubusercontent.com/asd880921/github-badges/main/badges/overtranslate-downloads-history.svg)
```

在 `config.json` 的 badge 設定中加上 `history` 即可啟用：

| 欄位 | 說明 |
|------|------|
| `period` | 統計週期，`day` / `week` / `month` / `year`（預設 `day`）。改這個欄位即可切換，歷史資料不用重建 |
| `limit` | 卡片顯示最近幾期（預設 `14`） |
| `timezone` | 分期用的時區，格式 `+08:00`（預設 `+00:00`，即 UTC） |
| `title` | 卡片標題（預設 `<倉庫名> <label>`） |

幾個已知的限制：

- 「新增」是**該期最後一次執行**與前一期最後一次執行的差，因此期界落在 workflow 的執行時間上，不是精確的午夜。累計值本身一律準確。
- 深色 / 淺色跟隨**讀者作業系統**的設定，不是 GitHub 的主題設定，兩者不一致時會看到相反的配色。
- 圖片走 GitHub 的 camo 代理，快取比 shields badge 久，卡片更新會比 badge 慢一截。

## 新增一個 badge

編輯 `config.json`，在 `badges` 陣列中加入一筆設定：

| 欄位 | 說明 |
|------|------|
| `id` | 輸出檔名，產生 `badges/<id>.json` 與 `data/<id>.json` |
| `repo` | 來源倉庫，格式 `owner/name`（需為公開倉，或本倉的 token 有權限讀取） |
| `assets` | 要累加的資產檔名陣列，支援 `*` 萬用字元（例如 `["OverTranslate-win-*"]`）；`["*"]` 表示所有資產 |
| `label` | badge 左側文字（預設 `downloads`） |
| `color` / `labelColor` | badge 顏色（預設 `2ea44f` / `24292f`） |
| `style` | badge 樣式（預設 `for-the-badge`） |
| `includePrereleases` | 是否納入 pre-release 的下載量（預設 `true`；draft 一律不計） |

推上 `main` 後 workflow 會立即跑一次，之後每 6 小時自動更新，也可在 Actions 頁面手動觸發。

## 配色預覽工具

`tools/badge-preview.html` 用瀏覽器直接開啟即可（不需要伺服器），可即時試 badge 顏色：

- 取色器 / 色碼輸入 / 預設色塊，改動即時重繪
- 同時並排 GitHub **淺色 `#ffffff`** 與 **深色 `#0d1117`** 兩種底色，確認兩種讀者看到的效果
- 頁面本身也有淺色 / 深色 / 跟隨系統的切換
- 下方會產生可直接貼回 `config.json` 的片段

預覽用的是 shields 的 static badge 端點，渲染結果與正式的 endpoint badge 一致。

## 輸出

- `badges/<id>.json` — 給 shields.io 讀的 badge 資料（數字會格式化為 `1.2k` / `1.2M`）
- `data/<id>.json` — 完整統計：總下載量、各資產明細、Release 數量、更新時間
- `data/history/<id>.csv` — 歷史快照，只存 `timestamp,total`；累計值沒變的那次執行不留新的一筆
- `badges/<id>-history.svg` — 由歷史快照聚合而成的統計卡片

## 本機執行

```bash
node scripts/update-badges.mjs
```

未設定 `GITHUB_TOKEN` 時會以未驗證方式呼叫 API（每小時 60 次額度），統計公開倉庫仍可正常運作。

`data/history/<id>.csv` 若不存在或有缺漏，可從 git 歷史中每個版本的 `data/<id>.json` 還原（取檔案內的 `updatedAt`，不依賴 commit 時間）：

```bash
node scripts/backfill-history.mjs
```
