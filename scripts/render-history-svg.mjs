// 把聚合後的下載歷史畫成 SVG 表格，供其他倉庫以圖片方式引用。
// 限制：GitHub 以 <img> 呈現，SVG 內不能有腳本、不能外連字型，
// 深淺色只能靠 prefers-color-scheme 由讀者端決定。
const ROW_H = 24;
const HEAD_H = 26;
const TITLE_H = 34;
const FOOT_H = 24;
const PAD_X = 14;
const COL_DATE = 58;
const COL_DELTA = 58;
const COL_TOTAL = 62;
const COL_BAR = 104;
const GAP = 14;
const WIDTH = PAD_X * 2 + COL_DATE + COL_DELTA + COL_TOTAL + COL_BAR + GAP * 3;

const X_DATE = PAD_X;
const X_DELTA = X_DATE + COL_DATE + GAP + COL_DELTA;
const X_TOTAL = X_DELTA + GAP + COL_TOTAL;
const X_BAR = X_TOTAL + GAP;

const FONT = "'Segoe UI',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,'Microsoft JhengHei',sans-serif";

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[char]);
}

function formatWallTime(timestamp, offsetMinutes) {
  const d = new Date(Date.parse(timestamp) + offsetMinutes * 60_000);
  const pad = (value) => String(value).padStart(2, '0');
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  const zone = abs % 60 === 0 ? `${sign}${abs / 60}` : `${sign}${Math.floor(abs / 60)}:${pad(abs % 60)}`;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC${zone}`;
}

export function renderHistorySvg(rows, { title, periodLabel = '日期', updatedAt, offsetMinutes = 0, accent = '8B5CF6' } = {}) {
  const height = TITLE_H + HEAD_H + rows.length * ROW_H + FOOT_H;
  const maxDelta = Math.max(1, ...rows.map((row) => row.delta ?? 0));

  const body = rows.map((row, index) => {
    const y = TITLE_H + HEAD_H + index * ROW_H;
    const baseline = y + 16;
    const parts = [];
    if (index % 2 === 1) {
      parts.push(`<rect x="1" y="${y}" width="${WIDTH - 2}" height="${ROW_H}" class="zebra"/>`);
    }
    parts.push(`<text x="${X_DATE}" y="${baseline}" class="cell muted">${escapeXml(row.label)}</text>`);
    parts.push(`<text x="${X_DELTA}" y="${baseline}" class="cell delta" text-anchor="end">${row.delta === null ? '—' : `+${row.delta}`}</text>`);
    parts.push(`<text x="${X_TOTAL}" y="${baseline}" class="cell" text-anchor="end">${row.total}</text>`);
    if (row.delta) {
      const barW = Math.max(2, Math.round((row.delta / maxDelta) * COL_BAR));
      parts.push(`<rect x="${X_BAR}" y="${y + 8}" width="${barW}" height="8" rx="2" class="bar"/>`);
    }
    return parts.join('');
  }).join('');

  const headBaseline = TITLE_H + 18;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${escapeXml(title)}">
  <style>
    svg { --bg:#ffffff; --border:#d0d7de; --fg:#1f2328; --muted:#656d76; --zebra:#f6f8fa; --accent:#${accent}; }
    @media (prefers-color-scheme: dark) {
      svg { --bg:#0d1117; --border:#30363d; --fg:#e6edf3; --muted:#8b949e; --zebra:#161b22; --accent:#a78bfa; }
    }
    .frame { fill: var(--bg); stroke: var(--border); }
    .zebra { fill: var(--zebra); }
    .title { fill: var(--fg); font: 600 13px ${FONT}; }
    .head { fill: var(--muted); font: 600 11px ${FONT}; }
    .cell { fill: var(--fg); font: 12px ${FONT}; }
    .muted { fill: var(--muted); }
    .delta { fill: var(--accent); font: 600 12px ${FONT}; }
    .bar { fill: var(--accent); opacity: .6; }
    .foot { fill: var(--muted); font: 10px ${FONT}; }
  </style>
  <rect x=".5" y=".5" width="${WIDTH - 1}" height="${height - 1}" rx="6" class="frame"/>
  <text x="${X_DATE}" y="22" class="title">${escapeXml(title)}</text>
  <text x="${X_DATE}" y="${headBaseline}" class="head">${escapeXml(periodLabel)}</text>
  <text x="${X_DELTA}" y="${headBaseline}" class="head" text-anchor="end">新增</text>
  <text x="${X_TOTAL}" y="${headBaseline}" class="head" text-anchor="end">累計</text>
  ${body}
  <text x="${X_DATE}" y="${height - 9}" class="foot">更新於 ${escapeXml(formatWallTime(updatedAt, offsetMinutes))}</text>
</svg>
`;
}
