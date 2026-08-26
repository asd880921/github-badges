// 把聚合後的下載歷史畫成統計卡片：面積折線是各期累積總量，柱狀是各期新增，右上角是統整數字。
// 限制：GitHub 以 <img> 呈現，SVG 內不能有腳本、不能外連字型，
// 深淺色只能靠 prefers-color-scheme 由讀者端決定。
const WIDTH = 760;
const HEIGHT = 300;
const PLOT_LEFT = 58;
const PLOT_RIGHT = 724;
const PLOT_TOP = 92;
const BASELINE = 238;
const PILL_RIGHT = 732;
const PILL_TOP = 20;
const PILL_H = 46;
const PILL_GAP = 8;
// 柱狀只佔繪圖區下半，避免蓋掉折線。
const BAR_ZONE = (BASELINE - PLOT_TOP) * 0.35;

const PERIOD_TEXT = {
  day: { adverb: 'Daily', unit: 'days' },
  week: { adverb: 'Weekly', unit: 'weeks' },
  month: { adverb: 'Monthly', unit: 'months' },
  year: { adverb: 'Yearly', unit: 'years' },
};

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[char]);
}

/** 只有一個 accent 設定值，深色底需要更亮的版本才不會糊在深色卡片上。 */
function lighten(hex, ratio) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return `#${channels.map((c) => Math.round(c + (255 - c) * ratio).toString(16).padStart(2, '0')).join('')}`;
}

function niceStep(rough) {
  const exponent = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
}

/** 累積量軸不從 0 起算，否則各期變化都被壓平在頂端。 */
function axisScale(min, max) {
  const step = niceStep(Math.max(max - min, 1) / 5);
  const from = Math.floor(min / step) * step;
  const to = Math.ceil(max / step) * step;
  const ticks = [];
  for (let value = from; value <= to + step / 2; value += step) ticks.push(Math.round(value));
  return { from, to: ticks[ticks.length - 1], ticks };
}

function formatWallTime(timestamp, offsetMinutes) {
  const d = new Date(Date.parse(timestamp) + offsetMinutes * 60_000);
  const pad = (value) => String(value).padStart(2, '0');
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  const zone = abs % 60 === 0 ? `${sign}${abs / 60}` : `${sign}${Math.floor(abs / 60)}:${pad(abs % 60)}`;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC${zone}`;
}

function pill(rightEdge, label, value, valueClass) {
  const width = Math.max(86, 26 + String(value).length * 11);
  const svg = `<g transform="translate(${rightEdge - width},${PILL_TOP})">
    <rect width="${width}" height="${PILL_H}" rx="10" class="pill"/>
    <text x="12" y="17" class="pill-label">${escapeXml(label)}</text>
    <text x="12" y="36" class="pill-value ${valueClass}">${escapeXml(value)}</text>
  </g>`;
  return { width, svg };
}

export function renderHistorySvg(newestFirst, {
  title = 'downloads',
  period = 'day',
  updatedAt,
  offsetMinutes = 0,
  accent = '8B5CF6',
  grandTotal,
} = {}) {
  const rows = [...newestFirst].reverse();
  if (rows.length === 0) return '';

  const totals = rows.map((row) => row.total);
  const scale = axisScale(Math.min(...totals), Math.max(...totals));
  const maxDelta = Math.max(1, ...rows.map((row) => row.delta ?? 0));
  const known = rows.filter((row) => row.delta !== null);
  const periodSum = known.reduce((sum, row) => sum + row.delta, 0);
  const average = known.length > 0 ? Math.round(periodSum / known.length) : 0;

  const x = (index) => (rows.length === 1
    ? (PLOT_LEFT + PLOT_RIGHT) / 2
    : PLOT_LEFT + (index * (PLOT_RIGHT - PLOT_LEFT)) / (rows.length - 1));
  const y = (total) => BASELINE - ((total - scale.from) / (scale.to - scale.from)) * (BASELINE - PLOT_TOP);

  const slot = rows.length > 1 ? (PLOT_RIGHT - PLOT_LEFT) / (rows.length - 1) : 60;
  const barWidth = Math.max(3, Math.min(20, slot * 0.5));

  const grid = scale.ticks.map((tick) => {
    const ty = y(tick).toFixed(1);
    return `<line x1="${PLOT_LEFT}" y1="${ty}" x2="${PLOT_RIGHT}" y2="${ty}" class="grid"/>`
      + `<text x="${PLOT_LEFT - 10}" y="${(Number(ty) + 4).toFixed(1)}" text-anchor="end" class="axis">${tick}</text>`;
  }).join('\n  ');

  const peak = rows.findIndex((row) => row.delta === maxDelta);
  const bars = rows.map((row, index) => {
    if (!row.delta) return '';
    const height = (row.delta / maxDelta) * BAR_ZONE;
    const bar = `<rect x="${(x(index) - barWidth / 2).toFixed(1)}" y="${(BASELINE - height).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${height.toFixed(1)}" rx="2" class="bar"/>`;
    if (index !== peak) return bar;
    return `${bar}<text x="${x(index).toFixed(1)}" y="${(BASELINE - height - 6).toFixed(1)}" text-anchor="middle" class="axis">+${row.delta}</text>`;
  }).join('');

  const line = rows.map((row, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(row.total).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(rows.length - 1).toFixed(1)} ${BASELINE} L ${x(0).toFixed(1)} ${BASELINE} Z`;
  const dots = rows.map((row, index) => `<circle cx="${x(index).toFixed(1)}" cy="${y(row.total).toFixed(1)}" r="2.6" class="dot"/>`).join('');

  // 標籤太密會疊在一起，抽稀後一定保留最舊與最新兩期。
  const stride = Math.max(1, Math.ceil(rows.length / 8));
  const labels = rows.map((row, index) => {
    const last = index === rows.length - 1;
    const keep = index === 0 || last || (index % stride === 0 && rows.length - 1 - index >= stride / 2);
    if (!keep) return '';
    return `<text x="${x(index).toFixed(1)}" y="262" text-anchor="middle" class="axis">${escapeXml(row.label)}</text>`;
  }).join('\n  ');

  const pills = [];
  let cursor = PILL_RIGHT;
  for (const [label, value, cls] of [
    ['AVG', `+${average}`, ''],
    ['PERIOD', `+${periodSum}`, 'positive'],
    ['TOTAL', String(grandTotal ?? totals[totals.length - 1]), ''],
  ]) {
    const item = pill(cursor, label, value, cls);
    pills.unshift(item.svg);
    cursor -= item.width + PILL_GAP;
  }

  const text = PERIOD_TEXT[period] ?? PERIOD_TEXT.day;
  const accentDark = lighten(`#${accent}`, 0.35);
  const dotDark = lighten(`#${accent}`, 0.6);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="var(--card-from)"/>
      <stop offset="1" stop-color="var(--card-to)"/>
    </linearGradient>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--accent)" stop-opacity=".34"/>
      <stop offset="1" stop-color="var(--accent)" stop-opacity=".02"/>
    </linearGradient>
  </defs>
  <style>
    svg {
      --card-from:#ffffff; --card-to:#f2f4f8; --frame:#d0d7de; --fg:#1f2328; --muted:#656d76;
      --grid:#e4e8ee; --pill:#f6f8fa; --pill-line:#d8dee4;
      --accent:#${accent}; --dot:#${accent}; --positive:#1a7f37;
    }
    @media (prefers-color-scheme: dark) {
      svg {
        --card-from:#111827; --card-to:#0b1020; --frame:#263244; --fg:#e6edf3; --muted:#8b949e;
        --grid:#2b3546; --pill:#151d2d; --pill-line:#28354a;
        --accent:${accentDark}; --dot:${dotDark}; --positive:#a7f3d0;
      }
    }
    text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Arial, sans-serif; }
    .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
    .sub { font-size: 12px; fill: var(--muted); }
    .axis { font-size: 10px; fill: var(--muted); }
    .grid { stroke: var(--grid); stroke-width: 1; }
    .pill { fill: var(--pill); stroke: var(--pill-line); }
    .pill-label { font-size: 10px; fill: var(--muted); letter-spacing: .5px; }
    .pill-value { font-size: 17px; font-weight: 700; fill: var(--fg); }
    .positive { fill: var(--positive); }
    .bar { fill: var(--accent); opacity: .26; }
    .line { fill: none; stroke: var(--accent); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
    .dot { fill: var(--dot); }
  </style>
  <rect x=".5" y=".5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="18" fill="url(#card)" stroke="var(--frame)"/>
  <text x="28" y="36" class="title">${escapeXml(title)}</text>
  <text x="28" y="57" class="sub">${text.adverb} · Last ${rows.length} ${text.unit}</text>
  ${pills.join('\n  ')}
  <g opacity=".75">
  ${grid}
  </g>
  ${bars}
  <path d="${area}" fill="url(#area)"/>
  <path d="${line}" class="line"/>
  ${dots}
  ${labels}
  <text x="28" y="284" class="axis">cumulative total (line) · new per ${period} (bars, max +${maxDelta})</text>
  <text x="${PILL_RIGHT}" y="284" text-anchor="end" class="axis">updated ${escapeXml(formatWallTime(updatedAt, offsetMinutes))}</text>
</svg>
`;
}
