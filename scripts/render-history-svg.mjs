// 把聚合後的下載歷史畫成統計卡片：左欄是總下載量，右側折線是各期累積量、柱狀是各期新增。
// 限制：GitHub 以 <img> 呈現，SVG 內不能有腳本、不能外連字型或圖檔（icon 必須內嵌），
// 深淺色只能靠 prefers-color-scheme 由讀者端決定。
const WIDTH = 760;
const HEIGHT = 300;

const PANEL_X = 28;
const PANEL_RIGHT = 232;
const DIVIDER_X = 262;
const ICON_SIZE = 34;

const PLOT_LEFT = 306;
const PLOT_RIGHT = 724;
const PLOT_TOP = 78;
const BASELINE = 232;
const CARD_RIGHT = 732;
// 柱狀只佔繪圖區下半，避免蓋掉折線。
const BAR_ZONE = (BASELINE - PLOT_TOP) * 0.35;

const PERIOD_TEXT = {
  day: { adverb: 'Daily', unit: 'days', one: 'day' },
  week: { adverb: 'Weekly', unit: 'weeks', one: 'week' },
  month: { adverb: 'Monthly', unit: 'months', one: 'month' },
  year: { adverb: 'Yearly', unit: 'years', one: 'year' },
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

/** 千分位，總下載量是卡片主角，位數多時要讀得出來。 */
function formatTotal(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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

/**
 * 內嵌外部 icon：外層 <svg> 換成有座標的巢狀 <svg> 才能套尺寸，
 * 並把所有 id 前綴，避免和卡片自己的漸層 id 相撞。
 */
function embedIcon(markup, x, yTop, size) {
  if (!markup) return '';
  const viewBox = /<svg[^>]*\sviewBox="([^"]+)"/.exec(markup)?.[1];
  const open = markup.indexOf('<svg');
  const close = markup.lastIndexOf('</svg>');
  if (!viewBox || open < 0 || close < 0) return '';
  const inner = markup
    .slice(markup.indexOf('>', open) + 1, close)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/id="([^"]+)"/g, 'id="icon-$1"')
    .replace(/url\(#([^)]+)\)/g, 'url(#icon-$1)');
  return `<svg x="${x}" y="${yTop}" width="${size}" height="${size}" viewBox="${viewBox}" overflow="hidden">${inner}</svg>`;
}

export function renderHistorySvg(newestFirst, {
  title = 'downloads',
  period = 'day',
  updatedAt,
  offsetMinutes = 0,
  accent = '3B82F6',
  grandTotal,
  icon = '',
} = {}) {
  const rows = [...newestFirst].reverse();
  if (rows.length === 0) return '';

  const totals = rows.map((row) => row.total);
  const scale = axisScale(Math.min(...totals), Math.max(...totals));
  const maxDelta = Math.max(1, ...rows.map((row) => row.delta ?? 0));
  const known = rows.filter((row) => row.delta !== null);
  const periodSum = known.reduce((sum, row) => sum + row.delta, 0);
  const average = known.length > 0 ? Math.round(periodSum / known.length) : 0;
  const latest = rows[rows.length - 1].delta ?? 0;
  const total = grandTotal ?? totals[totals.length - 1];
  const text = PERIOD_TEXT[period] ?? PERIOD_TEXT.day;

  const x = (index) => (rows.length === 1
    ? (PLOT_LEFT + PLOT_RIGHT) / 2
    : PLOT_LEFT + (index * (PLOT_RIGHT - PLOT_LEFT)) / (rows.length - 1));
  const y = (value) => BASELINE - ((value - scale.from) / (scale.to - scale.from)) * (BASELINE - PLOT_TOP);

  const slot = rows.length > 1 ? (PLOT_RIGHT - PLOT_LEFT) / (rows.length - 1) : 60;
  const barWidth = Math.max(3, Math.min(18, slot * 0.5));

  const grid = scale.ticks.map((tick) => {
    const ty = y(tick);
    return `<line x1="${PLOT_LEFT}" y1="${ty.toFixed(1)}" x2="${PLOT_RIGHT}" y2="${ty.toFixed(1)}" class="grid"/>`
      + `<text x="${PLOT_LEFT - 8}" y="${(ty + 3.5).toFixed(1)}" text-anchor="end" class="axis">${tick}</text>`;
  }).join('\n  ');

  const peak = rows.findIndex((row) => row.delta === maxDelta);
  const bars = rows.map((row, index) => {
    if (!row.delta) return '';
    const height = (row.delta / maxDelta) * BAR_ZONE;
    // 頭尾兩根的中心就在繪圖區邊界上，不夾住會凸出格線之外。
    const left = Math.min(Math.max(x(index) - barWidth / 2, PLOT_LEFT), PLOT_RIGHT - barWidth);
    const bar = `<rect x="${left.toFixed(1)}" y="${(BASELINE - height).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${height.toFixed(1)}" rx="2" class="bar"/>`;
    if (index !== peak) return bar;
    return `${bar}<text x="${(left + barWidth / 2).toFixed(1)}" y="${(BASELINE - height - 6).toFixed(1)}" text-anchor="middle" class="axis">+${row.delta}</text>`;
  }).join('');

  const line = rows.map((row, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(row.total).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(rows.length - 1).toFixed(1)} ${BASELINE} L ${x(0).toFixed(1)} ${BASELINE} Z`;
  const dots = rows.map((row, index) => `<circle cx="${x(index).toFixed(1)}" cy="${y(row.total).toFixed(1)}" r="2.4" class="dot"/>`).join('');

  // 標籤太密會疊在一起，抽稀後一定保留最舊與最新兩期。
  const stride = Math.max(1, Math.ceil(rows.length / 7));
  const labels = rows.map((row, index) => {
    const last = index === rows.length - 1;
    const keep = index === 0 || last || (index % stride === 0 && rows.length - 1 - index >= stride / 2);
    if (!keep) return '';
    return `<text x="${x(index).toFixed(1)}" y="254" text-anchor="middle" class="axis">${escapeXml(row.label)}</text>`;
  }).join('\n  ');

  const stats = [
    [`Latest ${text.one}`, `+${latest}`, 'accent'],
    [`Last ${rows.length} ${text.unit}`, `+${periodSum}`, ''],
    [`Average / ${text.one}`, `+${average}`, ''],
  ].map(([label, value, cls], index) => {
    const baseline = 188 + index * 26;
    const rule = index === 0 ? '' : `<line x1="${PANEL_X}" y1="${baseline - 17}" x2="${PANEL_RIGHT}" y2="${baseline - 17}" class="grid"/>`;
    return `${rule}<text x="${PANEL_X}" y="${baseline}" class="stat-label">${escapeXml(label)}</text>`
      + `<text x="${PANEL_RIGHT}" y="${baseline}" text-anchor="end" class="stat-value ${cls}">${escapeXml(value)}</text>`;
  }).join('\n  ');

  const hasIcon = Boolean(icon);
  const accentDark = lighten(`#${accent}`, 0.3);
  const dotDark = lighten(`#${accent}`, 0.55);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(title)}: ${total} downloads">
  <defs>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="var(--card-from)"/>
      <stop offset="1" stop-color="var(--card-to)"/>
    </linearGradient>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--accent)" stop-opacity=".32"/>
      <stop offset="1" stop-color="var(--accent)" stop-opacity=".02"/>
    </linearGradient>
  </defs>
  <style>
    svg {
      --card-from:#ffffff; --card-to:#f2f5f9; --frame:#d0d7de; --fg:#1f2328; --muted:#656d76;
      --grid:#e4e8ee; --accent:#${accent}; --dot:#${accent};
    }
    @media (prefers-color-scheme: dark) {
      svg {
        --card-from:#111827; --card-to:#0b1020; --frame:#263244; --fg:#e6edf3; --muted:#8b949e;
        --grid:#2b3546; --accent:${accentDark}; --dot:${dotDark};
      }
    }
    text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Arial, sans-serif; }
    .name { font-size: 15px; font-weight: 650; fill: var(--fg); }
    .total { font-size: 54px; font-weight: 750; fill: var(--fg); letter-spacing: -1px; }
    .total-label { font-size: 11px; font-weight: 600; fill: var(--muted); letter-spacing: 1.4px; }
    .stat-label { font-size: 11px; fill: var(--muted); }
    .stat-value { font-size: 13px; font-weight: 650; fill: var(--fg); }
    .accent { fill: var(--accent); }
    .caption { font-size: 11px; fill: var(--muted); }
    .axis { font-size: 10px; fill: var(--muted); }
    .grid { stroke: var(--grid); stroke-width: 1; }
    .bar { fill: var(--accent); opacity: .24; }
    .line { fill: none; stroke: var(--accent); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .dot { fill: var(--dot); }
  </style>
  <rect x=".5" y=".5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="18" fill="url(#card)" stroke="var(--frame)"/>

  ${embedIcon(icon, PANEL_X, 24, ICON_SIZE)}
  <text x="${hasIcon ? PANEL_X + ICON_SIZE + 12 : PANEL_X}" y="46" class="name">${escapeXml(title)}</text>

  <text x="${PANEL_X}" y="132" class="total">${formatTotal(total)}</text>
  <text x="${PANEL_X}" y="154" class="total-label">TOTAL DOWNLOADS</text>

  ${stats}

  <line x1="${DIVIDER_X}" y1="26" x2="${DIVIDER_X}" y2="274" class="grid"/>

  <text x="${PLOT_LEFT - 8}" y="46" class="caption">${text.adverb} cumulative · last ${rows.length} ${text.unit}</text>
  <text x="${CARD_RIGHT}" y="46" text-anchor="end" class="caption">bars = new per ${text.one}</text>
  <g opacity=".75">
  ${grid}
  </g>
  ${bars}
  <path d="${area}" fill="url(#area)"/>
  <path d="${line}" class="line"/>
  ${dots}
  ${labels}
  <text x="${CARD_RIGHT}" y="276" text-anchor="end" class="axis">updated ${escapeXml(formatWallTime(updatedAt, offsetMinutes))}</text>
</svg>
`;
}
