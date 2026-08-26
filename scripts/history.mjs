// 下載量歷史快照的儲存與聚合。
// 只存 timestamp + 累計值，增長量一律由相鄰期末相減得出：
// 存增長量會在補資料或改變統計週期時與累計值對不起來。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HEADER = 'timestamp,total';

export const PERIODS = ['day', 'week', 'month', 'year'];

export function historyPath(id) {
  return join(ROOT, 'data', 'history', `${id}.csv`);
}

export async function readHistory(id) {
  let text;
  try {
    text = await readFile(historyPath(id), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  return text
    .split(/\r?\n/)
    .slice(1)
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [timestamp, total] = line.split(',');
      return { timestamp, total: Number(total) };
    })
    .filter((row) => Number.isFinite(row.total) && !Number.isNaN(Date.parse(row.timestamp)))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

export async function writeHistory(id, rows) {
  await mkdir(dirname(historyPath(id)), { recursive: true });
  const body = rows.map((row) => `${row.timestamp},${row.total}`).join('\n');
  await writeFile(historyPath(id), `${HEADER}\n${body}\n`, 'utf8');
}

/**
 * 累計值沒變就不寫新的一筆：讓「下載量沒動」的那次執行不產生 commit，
 * 缺漏的期間由聚合時沿用前一筆累計值補回，不影響表格。
 */
export async function appendSnapshot(id, timestamp, total) {
  const rows = await readHistory(id);
  const last = rows.at(-1);
  if (last && last.total === total) return { rows, appended: false };
  if (last && Date.parse(timestamp) <= Date.parse(last.timestamp)) return { rows, appended: false };
  const next = [...rows, { timestamp, total }];
  await writeHistory(id, next);
  return { rows: next, appended: true };
}

/** 位移到指定時區後直接用 UTC getter 取值，後續一切運算都在這個「牆上時間」空間。 */
function toWall(timestamp, offsetMinutes) {
  return Date.parse(timestamp) + offsetMinutes * 60_000;
}

function startOfBucket(wallMs, period) {
  const d = new Date(wallMs);
  if (period === 'year') return Date.UTC(d.getUTCFullYear(), 0, 1);
  if (period === 'month') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  if (period === 'week') {
    // ISO 週：週一為起點，getUTCDay() 的週日是 0。
    const weekday = (new Date(day).getUTCDay() + 6) % 7;
    return day - weekday * 86_400_000;
  }
  return day;
}

function stepBucket(startMs, period, delta) {
  const d = new Date(startMs);
  if (period === 'year') return Date.UTC(d.getUTCFullYear() + delta, 0, 1);
  if (period === 'month') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1);
  return startMs + delta * (period === 'week' ? 7 : 1) * 86_400_000;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function bucketLabel(startMs, period) {
  const d = new Date(startMs);
  if (period === 'year') return String(d.getUTCFullYear());
  if (period === 'month') return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  return `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * 聚合成最近 limit 期，新的在前。
 * 期末累計 = 該期結束前最後一筆快照；沒有快照的期沿用前一期，增長量即為 0。
 */
export function aggregate(rows, { period = 'day', limit = 14, offsetMinutes = 0 } = {}) {
  if (!PERIODS.includes(period)) throw new Error(`未知的 history.period: ${period}`);
  if (rows.length === 0) return [];

  const points = rows.map((row) => ({ wallMs: toWall(row.timestamp, offsetMinutes), total: row.total }));
  const newest = startOfBucket(points.at(-1).wallMs, period);

  // 多取一期當作最舊一列的基準，算得出它的增長量才顯示。
  const starts = [];
  for (let i = limit; i >= 0; i -= 1) starts.push(stepBucket(newest, period, -i));

  let cursor = 0;
  let carried = null;
  const ends = starts.map((start) => {
    const boundary = stepBucket(start, period, 1);
    while (cursor < points.length && points[cursor].wallMs < boundary) {
      carried = points[cursor].total;
      cursor += 1;
    }
    return carried;
  });

  const result = [];
  for (let i = 1; i < starts.length; i += 1) {
    if (ends[i] === null) continue;
    result.push({
      label: bucketLabel(starts[i], period),
      total: ends[i],
      delta: ends[i - 1] === null ? null : ends[i] - ends[i - 1],
    });
  }
  return result.reverse();
}
