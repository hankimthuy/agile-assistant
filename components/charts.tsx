// Small, dependency-free chart primitives — plain SVG, sized from real
// data (no hardcoded pixel-perfect mockup values). Kept in one file since
// each is used on exactly one or two screens.

export function CompletionDonut({
  pct,
  size = 120,
  strokeWidth = 13,
  centerLabel,
  segments,
}: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  /** Optional multi-segment ring (Doc Linker coverage) instead of a single pct. */
  segments?: { value: number; color: string }[];
}) {
  const r = (size - strokeWidth * 2) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;

  let offset = 0;
  const arcs =
    segments?.map((seg, i) => {
      const len = (seg.value / 100) * c;
      const el = (
        <circle
          key={i}
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${len} ${c}`}
          strokeDashoffset={-offset}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      );
      offset += len;
      return el;
    }) ?? null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="color-mix(in srgb, var(--color-text) 12%, transparent)" strokeWidth={strokeWidth} />
      {segments ? (
        arcs
      ) : (
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      )}
      <text x={cx} y={cx - 3} textAnchor="middle" fontFamily="var(--font-heading)" fontWeight={600} fontSize={size * 0.26} fill="var(--color-text)">
        {Math.round(pct)}%
      </text>
      {centerLabel && (
        <text x={cx} y={cx + size * 0.13} textAnchor="middle" fontFamily="var(--font-body)" fontSize={size * 0.086} letterSpacing="1" fill="color-mix(in srgb, var(--color-text) 55%, transparent)">
          {centerLabel}
        </text>
      )}
    </svg>
  );
}

/** Grouped planned-vs-done bars, one group per category. */
export function PlannedVsDoneChart({ data }: { data: { label: string; planned: number; done: number }[] }) {
  const width = 520;
  const height = 196;
  const padLeft = 46;
  const padRight = 10;
  const padTop = 10;
  const axisY = 168;
  const max = Math.max(1, ...data.map((d) => d.planned));
  const niceMax = Math.ceil(max / 3) * 3 || 3;
  const groupWidth = (width - padLeft - padRight) / data.length;
  const barWidth = Math.min(52, groupWidth * 0.42);

  const yFor = (v: number) => axisY - (v / niceMax) * (axisY - padTop);
  const ticks = [0, 1, 2, 3].map((i) => Math.round((niceMax / 3) * i));

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <g stroke="color-mix(in srgb, var(--color-text) 12%, transparent)" strokeWidth="1">
        {ticks.map((t) => (
          <line key={t} x1={padLeft} y1={yFor(t)} x2={width - padRight} y2={yFor(t)} stroke={t === 0 ? 'color-mix(in srgb, var(--color-text) 35%, transparent)' : undefined} />
        ))}
      </g>
      <g fontFamily="var(--font-body)" fontSize="10" fill="color-mix(in srgb, var(--color-text) 55%, transparent)" textAnchor="end">
        {ticks.map((t) => (
          <text key={t} x={padLeft - 8} y={yFor(t) + 3}>
            {t}
          </text>
        ))}
      </g>
      {data.map((d, i) => {
        const groupX = padLeft + i * groupWidth + (groupWidth - barWidth) / 2;
        const plannedY = yFor(d.planned);
        const doneY = yFor(d.done);
        return (
          <g key={d.label}>
            <rect x={groupX} y={plannedY} width={barWidth} height={axisY - plannedY} fill="none" stroke="var(--color-accent)" strokeDasharray="3 3" />
            <rect x={groupX} y={doneY} width={barWidth} height={axisY - doneY} fill="var(--color-accent)" />
            <text x={groupX + barWidth / 2} y={doneY - 6} textAnchor="middle" fontFamily="var(--font-body)" fontSize="11" fill="var(--color-text)">
              {d.done}
            </text>
            <text
              x={groupX + barWidth / 2}
              y={axisY + 18}
              textAnchor="middle"
              fontFamily="var(--font-heading)"
              fontWeight={600}
              fontSize="13"
              fill="var(--color-text)"
              style={{ textTransform: 'uppercase' }}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Simple column chart (Performance Import velocity-by-type). */
export function ColumnChart({ data }: { data: { label: string; value: number }[] }) {
  const width = 240;
  const height = 74;
  const axisY = 64;
  const max = Math.max(1, ...data.map((d) => d.value));
  const gap = 12;
  const barWidth = (width - gap * (data.length + 1)) / data.length;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <line x1={0} y1={axisY} x2={width} y2={axisY} stroke="color-mix(in srgb, var(--color-text) 25%, transparent)" />
      {data.map((d, i) => {
        const h = (d.value / max) * (axisY - 10);
        const x = gap + i * (barWidth + gap);
        const isLast = i === data.length - 1;
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={axisY - h}
              width={barWidth}
              height={h}
              fill={isLast ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-accent) 35%, transparent)'}
            />
            <text x={x + barWidth / 2} y={height - 1} textAnchor="middle" fontFamily="var(--font-body)" fontSize="9" fill="color-mix(in srgb, var(--color-text) 55%, transparent)">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
