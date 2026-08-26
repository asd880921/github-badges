// 一次性：把 data/<id>.json 在 git 歷史中的每個版本還原成歷史快照。
// 時間取檔案內的 updatedAt 而非 commit 時間，重寫歷史或改動提交時間都不會影響結果。
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readHistory, writeHistory } from './history.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function backfill(id) {
  const file = `data/${id}.json`;
  const shas = git(['log', '--format=%H', '--reverse', '--', file]).split('\n').filter(Boolean);
  const byTimestamp = new Map();

  for (const sha of shas) {
    let snapshot;
    try {
      snapshot = JSON.parse(git(['show', `${sha}:${file}`]));
    } catch {
      continue;
    }
    if (!snapshot.updatedAt || !Number.isFinite(snapshot.total)) continue;
    byTimestamp.set(snapshot.updatedAt, snapshot.total);
  }

  return [...byTimestamp]
    .map(([timestamp, total]) => ({ timestamp, total }))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

/** 與 appendSnapshot 相同規則：累計值沒變的中間點不留，表格靠沿用前值還原。 */
function dedupe(rows) {
  return rows.filter((row, index) => index === 0 || row.total !== rows[index - 1].total);
}

const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf8'));
for (const badge of config.badges ?? []) {
  const existing = await readHistory(badge.id);
  const merged = new Map(backfill(badge.id).map((row) => [row.timestamp, row.total]));
  for (const row of existing) merged.set(row.timestamp, row.total);

  const rows = dedupe(
    [...merged]
      .map(([timestamp, total]) => ({ timestamp, total }))
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)),
  );
  await writeHistory(badge.id, rows);
  console.log(`${badge.id}: ${rows.length} 筆快照 (${rows[0]?.timestamp ?? '-'} → ${rows.at(-1)?.timestamp ?? '-'})`);
}
