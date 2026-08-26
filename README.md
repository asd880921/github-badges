<div align="center">
  <p>
    <strong>Language : </strong>
    <strong>English ✓</strong>
    &nbsp;｜&nbsp;
    <strong><a href="README.zh-TW.md">繁體中文</a></strong>
  </p>
</div>

# github-statcards

Self-updating GitHub stat badges and stat cards you can drop into any README.

**The GitHub API only gives you the current cumulative count — it keeps no history at all.** This repository
uses a scheduled workflow to append each snapshot to git, then derives the per-day growth by subtracting
consecutive snapshots. In other words, it produces data GitHub itself will not give you.

The output is JSON in [shields.io endpoint](https://shields.io/badges/endpoint-badge) format plus SVG cards,
committed here and served over raw URLs. Keeping the statistics commits in this repository means they never
pollute the history of the project being measured.

No external service or account required — the data lives in your own git history.

## Badges in use

<img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/asd880921/github-statcards/main/badges/overtranslate-downloads.json" alt="Total downloads" />

| Badge | Source repository | Assets counted |
|-------|-------------------|----------------|
| `badges/overtranslate-downloads.json` | [asd880921/OverTranslate](https://github.com/asd880921/OverTranslate) | `OverTranslate-win-Setup.exe` + `OverTranslate-win-Portable.zip` |

How to reference it:

```html
<img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/asd880921/github-statcards/main/badges/overtranslate-downloads.json" alt="Total downloads" />
```

> `raw.githubusercontent.com` caches for roughly 5 minutes, so the badge number can lag by a few minutes.

## Download history card

<img src="https://raw.githubusercontent.com/asd880921/github-statcards/main/cards/overtranslate-downloads-history.svg" alt="Downloads history" />

The GitHub API only reports the *current* cumulative download count — there is no history — so every growth figure is derived by subtracting snapshots.
Each workflow run appends the cumulative value to `data/history/<id>.csv`, which is then aggregated into SVG statistics cards (one per locale):

- **Left column** — icon, name, and the star of the card: total downloads; the three rows below are the latest period's new downloads, the total for the range, and the per-period average
- **Top half (line / area)** — cumulative total at the end of each period, read against the left-hand scale; only the most recent point gets an end marker
- **Bottom half (bars)** — new downloads per period, with the value printed above every bar and the latest period emphasised

The line and the bars are two different units of measure, which is why they are split into two stacked panels sharing one x-axis
rather than drawn against a common baseline — sharing a baseline would make them read as a single scale.
Bar height only encodes relative magnitude; absolute numbers are always read from the labels above the bars.

How to reference it:

```html
<img src="https://raw.githubusercontent.com/asd880921/github-statcards/main/cards/overtranslate-downloads-history.svg" alt="Downloads history" />
```

The Traditional Chinese card is the same URL with a `.zh-TW` suffix before the extension — see `locales` below.

Add a `history` block to a badge's entry in `config.json` to enable it:

| Field | Description |
|-------|-------------|
| `period` | Aggregation period: `day` / `week` / `month` / `year` (default `day`). Changing this is enough to switch — the history data does not need rebuilding |
| `limit` | How many recent periods the card shows (default `14`) |
| `timezone` | Timezone used for bucketing, in `+08:00` form (default `+00:00`, i.e. UTC) |
| `title` | The name in the card's top-left corner (defaults to the repository name) |
| `accent` | Primary colour of the line and bars (defaults to the badge's `color`); brightened automatically in dark mode |
| `icon` | Path to an SVG file to inline in the card's top-left corner, relative to the repository root. SVG cannot link to external images, so the icon must live in this repository |
| `locales` | Array of locales to generate; `en` and `zh-TW` are supported (default `["en"]`). **The first locale keeps the plain filename** and the rest get a locale suffix, so adding or removing locales later never breaks existing links |

Known limitations:

- "New downloads" is the difference between the **last run of a period** and the last run of the previous period, so period boundaries fall on the workflow's run times rather than exact midnight. The cumulative value itself is always accurate.
- Light/dark follows the **reader's operating system** setting, not their GitHub theme, so the two can disagree and show inverted colours.
- Images are served through GitHub's camo proxy, which caches longer than shields badges do, so the card updates noticeably later than the badge.
- **The locale is fixed per file and does not follow the reader.** SVG's `<switch systemLanguage>` can technically swap strings by browser language, but it keys off the reader's language preference rather than the README's, which would put a Chinese card on an English README. Hence one file per locale, chosen by whoever references it.
- The card cannot contain `<script>`, external fonts, or external images, and it does not respond to the mouse — GitHub renders SVG through `<img>`, so pointer events never reach the image document and both `:hover` and `<title>` tooltips are inert. Chinese text can only use fonts the reader already has installed (`Microsoft JhengHei` / `PingFang TC` / `Noto Sans TC`).

## Adding a badge

Edit `config.json` and add an entry to the `badges` array:

| Field | Description |
|-------|-------------|
| `id` | Output filename; produces `badges/<id>.json` and `data/<id>.json` |
| `repo` | Source repository as `owner/name` (must be public, or this repository's token must have read access) |
| `assets` | Array of asset filenames to sum, with `*` wildcards supported (e.g. `["OverTranslate-win-*"]`); `["*"]` means every asset |
| `label` | Text on the left side of the badge (default `downloads`) |
| `color` / `labelColor` | Badge colours (defaults `2ea44f` / `24292f`) |
| `style` | Badge style (default `for-the-badge`) |
| `includePrereleases` | Whether to count pre-release downloads (default `true`; drafts are never counted) |

Pushing to `main` runs the workflow immediately (only when `config.json`, `scripts/**`, or the workflow itself
changed); after that it updates daily at 04:00 and 16:00 UTC, and it can also be triggered manually from the
Actions page.

## Colour preview tool

Open `tools/badge-preview.html` directly in a browser — no server needed — to try badge colours live:

- Colour picker, hex input, and preset swatches, all redrawing instantly
- Shows GitHub's **light `#ffffff`** and **dark `#0d1117`** backgrounds side by side, so you can check what both kinds of reader see
- The page itself also toggles between light, dark, and follow-system
- Generates a snippet at the bottom that can be pasted straight back into `config.json`

The preview uses shields' static badge endpoint, so it renders identically to the real endpoint badge.

## Output

- `badges/<id>.json` — badge data for shields.io to read (numbers formatted as `1.2k` / `1.2M`)
- `data/<id>.json` — full statistics: total downloads, per-asset breakdown, release count, update time
- `data/history/<id>.csv` — historical snapshots holding only `timestamp,total`; a run whose cumulative value is unchanged does not add a row
- `cards/<id>-history.svg` — the statistics card aggregated from those snapshots (first locale in `history.locales`)
- `cards/<id>-history.<locale>.svg` — the same card in the remaining locales, e.g. `cards/overtranslate-downloads-history.zh-TW.svg`

## Using it for your own repository

Take this repository and run it yourself — no external service or account is involved, and the data lives in
your own git history, where nothing can rate-limit it or shut it down.

1. Press **Use this template** to create your own repository (or just fork it).
2. **Clear the example data**: delete the existing files under `data/`, `badges/`, and `cards/`. Those are this
   repository's numbers — leave them in place and your first snapshot continues from someone else's total. The
   scripts recreate anything that is missing, so deleting them breaks nothing.
3. Edit `config.json`: point `repo` at your repository and `assets` at your asset filenames. The two tables
   above cover the remaining fields.
4. Under **Settings → Actions → General → Workflow permissions**, make sure **Read and write permissions** is
   selected, otherwise the workflow cannot commit its output back to the repository.
5. Push to `main`. The workflow runs immediately, then updates on a schedule.

The schedule lives in the `cron` entry of `.github/workflows/update-badges.yml` — 04:00 and 16:00 UTC by
default. Change it to suit you.

## Running locally

```bash
node scripts/update-badges.mjs
```

Without `GITHUB_TOKEN` the API is called unauthenticated (60 requests per hour), which is still enough for public repositories.

If `data/history/<id>.csv` is missing or has gaps, it can be rebuilt from every past version of `data/<id>.json` in the git history (using the `updatedAt` inside the file, not the commit time):

```bash
node scripts/backfill-history.mjs
```

## License

[MIT](LICENSE) — free to use, modify, and distribute.
