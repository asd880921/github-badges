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

## 輸出

- `badges/<id>.json` — 給 shields.io 讀的 badge 資料（數字會格式化為 `1.2k` / `1.2M`）
- `data/<id>.json` — 完整統計：總下載量、各資產明細、Release 數量、更新時間

## 本機執行

```bash
node scripts/update-badges.mjs
```

未設定 `GITHUB_TOKEN` 時會以未驗證方式呼叫 API（每小時 60 次額度），統計公開倉庫仍可正常運作。
