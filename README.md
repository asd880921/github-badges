<div align="center">
  <p>
    🌐
    <strong>English ✓</strong>
    &nbsp;｜&nbsp;
    <strong><a href="README.zh-TW.md">繁體中文</a></strong>
  </p>
</div>

# github-statcards

Automatically generate cumulative GitHub Release download badges and download statistics cards for any README.

The GitHub API only provides the current cumulative download count, not historical data. This project uses GitHub Actions to record snapshots, calculate new downloads for each period, and store the results in your own Git history—no external service required.

## Preview

#### 1. Cumulative Downloads (Badge)

<img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/asd880921/github-statcards/main/badges/overtranslate-downloads.json" alt="Cumulative downloads" />

#### 2. Cumulative Download Statistics (Card)

<img src="https://raw.githubusercontent.com/asd880921/github-statcards/main/cards/overtranslate-downloads-history.svg" alt="Cumulative download statistics" />

## Quick Start

1. Select **Use this template** to create your own repository (or fork it).
2. Delete the example files in `data/`, `badges/`, and `cards/` so you do not inherit this repository's statistics. The scripts recreate any missing files automatically.
3. Edit `config.json` to specify the repository and Release assets to track.
4. Go to **Settings → Actions → General → Workflow permissions** and select **Read and write permissions** so the workflow can commit its output.
5. Push the configuration to `main`. The workflow runs immediately and continues updating on schedule.

The default schedule runs daily at 04:00 and 16:00 UTC. You can change the `cron` value in `.github/workflows/update-statcards.yml` or run the workflow manually from the Actions page.

## Configure a Badge

Add an entry to the `badges` array in `config.json`:

| Field | Description |
|-------|-------------|
| `id` | Output filename; creates `badges/<id>.json` and `data/<id>.json` |
| `repo` | Source repository in `owner/name` format |
| `assets` | Asset filenames to total; supports `*` wildcards, while `["*"]` includes every asset |
| `label` | Text on the left side of the badge; defaults to `downloads` |
| `color` / `labelColor` | Badge colors; default to `2ea44f` / `24292f` |
| `style` | Badge style; defaults to `for-the-badge` |
| `includePrereleases` | Whether to count pre-releases; defaults to `true`. Drafts are never counted |

`repo` must be public unless the current token has permission to read it.

## Enable Cumulative Download Statistics (Card)

Add a `history` block to the badge configuration:

| Field | Description |
|-------|-------------|
| `period` | Aggregation period: `day`, `week`, `month`, or `year`; defaults to `day` |
| `limit` | Number of recent periods to display; defaults to `14` |
| `timezone` | Time zone used for each period, such as `+08:00`; defaults to UTC (`+00:00`) |
| `title` | Card title; defaults to the repository name |
| `accent` | Chart color; defaults to the badge's `color` |
| `icon` | Path to the card's SVG icon, relative to the repository root |
| `locales` | Locales to generate; supports `en` and `zh-TW`, and defaults to `["en"]` |

The first locale in `locales` uses the plain filename. Additional locales receive a suffix. For example:

- `cards/<id>-history.svg`
- `cards/<id>-history.zh-TW.svg`

## Use the Generated Images

The examples below link each image back to this repository as attribution.

Cumulative Downloads (Badge):

```html
<a href="https://github.com/asd880921/github-statcards">
  <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/OWNER/REPOSITORY/main/badges/ID.json" alt="Cumulative downloads" />
</a>
```

Cumulative Download Statistics (Card):

```html
<a href="https://github.com/asd880921/github-statcards">
  <img src="https://raw.githubusercontent.com/OWNER/REPOSITORY/main/cards/ID-history.svg" alt="Cumulative download statistics" />
</a>
```

## Output Files

- `badges/<id>.json`: badge data for shields.io
- `data/<id>.json`: complete statistics, including total downloads, per-asset details, Release count, and update time
- `data/history/<id>.csv`: historical snapshots
- `cards/<id>-history.svg`: cumulative download statistics card
- `cards/<id>-history.<locale>.svg`: cumulative download statistics card in another locale

## Run Locally

Update the badges and cards:

```bash
node scripts/update-badges.mjs
```

Public repositories still work without `GITHUB_TOKEN`, but are limited to 60 GitHub API requests per hour.

If the history CSV is incomplete, rebuild it from `data/<id>.json` in the Git history:

```bash
node scripts/backfill-history.mjs
```

## Color Preview

Open `tools/badge-preview.html` in a browser to preview the badge on GitHub's light and dark backgrounds and generate configuration you can paste into `config.json`.

## Notes

- New downloads are calculated by subtracting consecutive snapshots. Period boundaries follow the workflow's actual run time; the cumulative total is unaffected.
- Badges and cards are cached, so new data may take a few minutes to appear.
- A card's locale is determined by the referenced file and does not change with the reader's language.
- A card's light or dark mode follows the reader's operating system setting, which may differ from their GitHub theme.

## License

This project is available under the [MIT License](LICENSE). When distributing the source code or substantial portions of it, retain the copyright and license notices.
If these Badges or Cards help you, attribution or a link back to this repository is appreciated. This is a request, not an additional restriction on use.
