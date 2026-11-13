import { useMemo, useState } from "react";

const WIDTH = 800;
const HEIGHT = 320;
const PAD = { top: 16, right: 96, bottom: 36, left: 44 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

const SURFACE = "#ffffff";
const GRID = "#e5e7eb";
const AXIS_TEXT = "#6b7280";
const INK = "#1f2937";

/** A "nice" axis maximum and tick step so the gridlines land on round numbers. */
function niceScale(max) {
  const target = Math.max(max, 1);
  const rough = target / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough);
  return { step, top: Math.ceil(target / step) * step };
}

const dayLabel = (day) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Line chart on one shared axis, drawn as plain SVG (no chart library).
 *
 * series: [{ key, label, color }]   one line each; keys read from every point
 * points: [{ date: "YYYY-MM-DD", <key>: number, ... }]   oldest first
 *
 * Two or more series always get a legend and a direct label at the line end. Hovering (or
 * moving the pointer across) the chart shows a crosshair and a tooltip with every value, and
 * "Show table" swaps the plot for the same numbers as a table.
 */
export default function LineChart({ series, points, title, valueLabel = "employees" }) {
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);

  const { scale, x, y } = useMemo(() => {
    const max = Math.max(0, ...points.flatMap((p) => series.map((s) => p[s.key] ?? 0)));
    const scale = niceScale(max);
    return {
      scale,
      x: (i) => PAD.left + (points.length <= 1 ? PLOT_W / 2 : (i / (points.length - 1)) * PLOT_W),
      y: (value) => PAD.top + PLOT_H - (value / scale.top) * PLOT_H,
    };
  }, [points, series]);

  if (points.length === 0) return <p className="text-sm text-gray-500 p-4">No data for this period.</p>;

  const ticks = Array.from({ length: Math.round(scale.top / scale.step) + 1 }, (_, i) => i * scale.step);
  const labelEvery = Math.ceil(points.length / 7);
  const showMarkers = points.length <= 16;

  // Direct labels sit at the right end of each line; if two would collide, the lower one steps down.
  const endLabels = series
    .map((s) => ({ ...s, value: points.at(-1)[s.key] ?? 0, y: y(points.at(-1)[s.key] ?? 0) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < endLabels.length; i++) {
    if (endLabels[i].y - endLabels[i - 1].y < 16) endLabels[i].y = endLabels[i - 1].y + 16;
  }

  const onMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * WIDTH;
    const index = Math.round(((px - PAD.left) / PLOT_W) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, index)));
  };

  const summary = `${title ?? "Line chart"}: ${series
    .map((s) => `${s.label} ${points.at(-1)[s.key] ?? 0}`)
    .join(", ")} on ${dayLabel(points.at(-1).date)}`;

  const hovered = hover === null ? null : points[hover];

  return (
    <figure className="m-0">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <ul className="flex flex-wrap gap-4 text-sm text-gray-700 list-none p-0 m-0">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: s.color, display: "inline-block" }} />
              {s.label}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setAsTable((value) => !value)}
          className="text-sm text-gray-600 underline hover:text-gray-900"
        >
          {asTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {asTable ? (
        <table className="text-sm w-full text-left text-gray-500">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">Date</th>
              {series.map((s) => (
                <th key={s.key} className="px-4 py-2">{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.date} className="odd:bg-white even:bg-gray-50">
                <td className="px-4 py-2">{dayLabel(p.date)}</td>
                {series.map((s) => (
                  <td key={s.key} className="px-4 py-2">{p[s.key] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ position: "relative" }}>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={summary}
            style={{ width: "100%", height: "auto", display: "block" }}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth="1" />
                <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill={AXIS_TEXT}>
                  {tick}
                </text>
              </g>
            ))}

            {points.map((p, i) =>
              i % labelEvery === 0 || i === points.length - 1 ? (
                <text key={p.date} x={x(i)} y={HEIGHT - 12} textAnchor="middle" fontSize="11" fill={AXIS_TEXT}>
                  {dayLabel(p.date)}
                </text>
              ) : null
            )}

            {hover !== null && (
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + PLOT_H} stroke={AXIS_TEXT} strokeWidth="1" />
            )}

            {series.map((s) => (
              <g key={s.key}>
                <path
                  d={points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p[s.key] ?? 0)}`).join(" ")}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {points.map((p, i) =>
                  showMarkers || i === hover || i === points.length - 1 ? (
                    <circle key={p.date} cx={x(i)} cy={y(p[s.key] ?? 0)} r="4" fill={s.color} stroke={SURFACE} strokeWidth="2" />
                  ) : null
                )}
              </g>
            ))}

            {endLabels.map((label) => (
              <text key={label.key} x={WIDTH - PAD.right + 12} y={label.y + 4} fontSize="12" fill={INK}>
                {label.label} {label.value}
              </text>
            ))}

            <rect
              x={PAD.left}
              y={PAD.top}
              width={PLOT_W}
              height={PLOT_H}
              fill="transparent"
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
            />
          </svg>

          {hovered && (
            <div
              role="tooltip"
              style={{
                position: "absolute",
                top: 8,
                left: `${(x(hover) / WIDTH) * 100}%`,
                transform: hover > points.length / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
                background: SURFACE,
                border: `1px solid ${GRID}`,
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
                color: INK,
                pointerEvents: "none",
                boxShadow: "none",
                whiteSpace: "nowrap",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{dayLabel(hovered.date)}</div>
              {series.map((s) => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: s.color, display: "inline-block" }} />
                  {s.label}: {hovered[s.key] ?? 0} {valueLabel}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
