export type Slice = { label: string; value: number; color: string };

export type Series = { label: string; color: string; values: number[] };

const FONT = 'font-family="system-ui, sans-serif"';

const PIE = { width: 360, height: 220, cx: 110, cy: 110, radius: 90, legendX: 225, legendY: 80 };

const BAR = { width: 480, height: 260, left: 36, right: 12, top: 34, bottom: 36 };

const MAX_AXIS_LABELS = 8;

const DISPLAY_SCALE = 2;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function escapeXml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function toDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

function toSvg(width: number, height: number, body: string): string {
  const displayWidth = width * DISPLAY_SCALE;
  const displayHeight = height * DISPLAY_SCALE;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${displayWidth}" height="${displayHeight}" ` +
    `viewBox="0 0 ${width} ${height}" ${FONT}>` +
    `<rect width="${width}" height="${height}" fill="#ffffff"/>${body}</svg>`
  );
}

function toLegendEntry(label: string, color: string, x: number, y: number): string {
  const text = escapeXml(label);
  const textX = x + 18;
  const textY = y + 10;
  return (
    `<rect x="${x}" y="${y}" width="12" height="12" rx="2" fill="${color}"/>` +
    `<text x="${textX}" y="${textY}" font-size="12" fill="#1c2640">${text}</text>`
  );
}

function toPiePoint(fraction: number): string {
  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  const x = round(PIE.cx + PIE.radius * Math.cos(angle));
  const y = round(PIE.cy + PIE.radius * Math.sin(angle));
  return `${x} ${y}`;
}

function toPieSlice(start: number, end: number, color: string): string {
  if (end - start >= 1) {
    return `<circle cx="${PIE.cx}" cy="${PIE.cy}" r="${PIE.radius}" fill="${color}"/>`;
  }
  const from = toPiePoint(start);
  const to = toPiePoint(end);
  const largeArc = end - start > 0.5 ? 1 : 0;
  return (
    `<path d="M ${PIE.cx} ${PIE.cy} L ${from} ` +
    `A ${PIE.radius} ${PIE.radius} 0 ${largeArc} 1 ${to} Z" fill="${color}"/>`
  );
}

function toPieLegend(slices: Slice[], total: number): string {
  const entries = slices.map((slice, index) => {
    const percent = total === 0 ? 0 : Math.round((slice.value / total) * 100);
    const label = `${slice.label}: ${slice.value} (${percent}%)`;
    const y = PIE.legendY + index * 24;
    return toLegendEntry(label, slice.color, PIE.legendX, y);
  });
  return entries.join('');
}

export function renderPieChart(slices: Slice[]): string {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const shapes: string[] = [];
  let start = 0;

  for (const slice of slices) {
    if (slice.value === 0) {
      continue;
    }
    const end = start + slice.value / total;
    const shape = toPieSlice(start, end, slice.color);
    shapes.push(shape);
    start = end;
  }

  if (shapes.length === 0) {
    shapes.push(`<circle cx="${PIE.cx}" cy="${PIE.cy}" r="${PIE.radius}" fill="#e2e8f0"/>`);
  }

  const legend = toPieLegend(slices, total);
  const body = shapes.join('') + legend;
  const svg = toSvg(PIE.width, PIE.height, body);
  return toDataUrl(svg);
}

function toBars(groups: string[], series: Series[], max: number): string {
  const plotWidth = BAR.width - BAR.left - BAR.right;
  const plotHeight = BAR.height - BAR.top - BAR.bottom;
  const groupWidth = plotWidth / groups.length;
  const barWidth = (groupWidth * 0.8) / series.length;
  const bars: string[] = [];

  groups.forEach((_group, groupIndex) => {
    series.forEach((entry, seriesIndex) => {
      const value = entry.values[groupIndex] ?? 0;
      const height = round((value / max) * plotHeight);
      const x = round(BAR.left + groupIndex * groupWidth + groupWidth * 0.1 + seriesIndex * barWidth);
      const y = round(BAR.top + plotHeight - height);
      const width = round(barWidth);
      bars.push(
        `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${entry.color}"/>`,
      );
    });
  });

  return bars.join('');
}

function toAxis(groups: string[], max: number): string {
  const plotWidth = BAR.width - BAR.left - BAR.right;
  const baseline = BAR.height - BAR.bottom;
  const groupWidth = plotWidth / groups.length;
  const step = Math.ceil(groups.length / MAX_AXIS_LABELS);
  const right = BAR.width - BAR.right;
  const labelY = baseline + 16;
  const maxLabelX = BAR.left - 6;
  const maxLabelY = BAR.top + 4;

  const labels = groups.map((group, index) => {
    if (index % step !== 0) {
      return '';
    }
    const x = round(BAR.left + index * groupWidth + groupWidth / 2);
    const text = escapeXml(group);
    return `<text x="${x}" y="${labelY}" font-size="10" text-anchor="middle" fill="#475569">${text}</text>`;
  });

  return (
    `<line x1="${BAR.left}" y1="${baseline}" x2="${right}" y2="${baseline}" stroke="#94a3b8"/>` +
    `<line x1="${BAR.left}" y1="${BAR.top}" x2="${BAR.left}" y2="${baseline}" stroke="#94a3b8"/>` +
    `<text x="${maxLabelX}" y="${maxLabelY}" font-size="10" text-anchor="end" fill="#475569">${max}</text>` +
    `<text x="${maxLabelX}" y="${baseline}" font-size="10" text-anchor="end" fill="#475569">0</text>` +
    labels.join('')
  );
}

function toBarLegend(series: Series[]): string {
  const entries = series.map((entry, index) => {
    const x = BAR.left + index * 110;
    return toLegendEntry(entry.label, entry.color, x, 8);
  });
  return entries.join('');
}

export function renderBarChart(groups: string[], series: Series[]): string {
  const values = series.flatMap((entry) => entry.values);
  const max = Math.max(1, ...values);
  const safeGroups = groups.length === 0 ? ['no flights'] : groups;

  const legend = toBarLegend(series);
  const axis = toAxis(safeGroups, max);
  const bars = toBars(safeGroups, series, max);
  const svg = toSvg(BAR.width, BAR.height, legend + axis + bars);
  return toDataUrl(svg);
}
