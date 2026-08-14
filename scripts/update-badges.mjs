// 依 config.json 統計各倉庫 Release 資產的下載量，
// 產生 shields.io endpoint 用的 badge JSON 與完整統計資料。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = process.env.GITHUB_TOKEN ?? '';

/** 把 `*` 當萬用字元的簡易比對（例如 `OverTranslate-win-*.zip`）。 */
function matchAsset(name, patterns) {
  return patterns.some((pattern) => {
    if (pattern === '*') return true;
    if (!pattern.includes('*')) return name === pattern;
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
    return new RegExp(`^${escaped}$`).test(name);
  });
}

/** 1234 → 1.2k、1234567 → 1.2M。 */
function formatCount(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value);
}

async function fetchReleases(repo) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'github-badges',
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const releases = [];
  for (let page = 1; page <= 20; page += 1) {
    const url = `https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status} ${res.statusText} (${url}): ${await res.text()}`);
    }
    const batch = await res.json();
    releases.push(...batch);
    if (batch.length < 100) break;
  }
  return releases;
}

async function buildBadge(badge) {
  const {
    id,
    repo,
    assets = ['*'],
    label = 'downloads',
    color = '2ea44f',
    labelColor = '24292f',
    style = 'for-the-badge',
    includePrereleases = true,
  } = badge;

  const releases = await fetchReleases(repo);
  const perAsset = {};
  let total = 0;

  for (const release of releases) {
    if (release.draft) continue;
    if (!includePrereleases && release.prerelease) continue;
    for (const asset of release.assets ?? []) {
      if (!matchAsset(asset.name, assets)) continue;
      perAsset[asset.name] = (perAsset[asset.name] ?? 0) + asset.download_count;
      total += asset.download_count;
    }
  }

  const badgeJson = {
    schemaVersion: 1,
    label,
    message: formatCount(total),
    color,
    labelColor,
    style,
  };

  const dataJson = {
    id,
    repo,
    total,
    perAsset,
    releaseCount: releases.length,
    updatedAt: new Date().toISOString(),
  };

  await mkdir(join(ROOT, 'badges'), { recursive: true });
  await mkdir(join(ROOT, 'data'), { recursive: true });
  await writeFile(join(ROOT, 'badges', `${id}.json`), `${JSON.stringify(badgeJson, null, 2)}\n`, 'utf8');
  await writeFile(join(ROOT, 'data', `${id}.json`), `${JSON.stringify(dataJson, null, 2)}\n`, 'utf8');

  console.log(`${id}: ${total} (${Object.entries(perAsset).map(([k, v]) => `${k}=${v}`).join(', ') || 'no matching assets'})`);
}

const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf8'));
if (!Array.isArray(config.badges) || config.badges.length === 0) {
  throw new Error('config.json 沒有任何 badges 設定');
}

let failed = false;
for (const badge of config.badges) {
  try {
    await buildBadge(badge);
  } catch (error) {
    failed = true;
    console.error(`[${badge.id ?? badge.repo}] ${error.message}`);
  }
}
if (failed) process.exit(1);
