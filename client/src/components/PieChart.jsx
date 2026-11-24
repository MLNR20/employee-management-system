import { useState } from "react";

const SIZE = 220;
const RADIUS = SIZE / 2 - 4;
const CENTER = SIZE / 2;
const SURFACE = "#ffffff";
const INK = "#1f2937";

/** The SVG path for one wedge, starting and ending at the given angles (radians, 0 = 12 o'clock). */
function wedge(start, end) {
  const point = (angle) => [CENTER + RADIUS * Math.sin(angle), CENTER - RADIUS * Math.cos(angle)];
  const [x1, y1] = point(start);
  const [x2, y2] = point(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M${CENTER},${CENTER} L${x1},${y1} A${RADIUS},${RADIUS} 0 ${large} 1 ${x2},${y2} Z`;
}

/**
 * Pie chart drawn as plain SVG (no chart library), with a legend that carries each count and share.
 *
 * slices: [{ key, label, value, color }]   zero-value slices are left out of the pie but kept in the legend
 *
 * Hovering a wedge or a legend row highlights it and shows its figures in the middle caption.
 */
export default function PieChart({ slices, title }) {
  const [active, setActive] = useState(null);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total === 0) return <p className="text-sm text-gray-500 p-4">Nothing to show yet.</p>;

  const share = (slice) => Math.round((slice.value / total) * 100);

  let angle = 0;
  const wedges = slices
    .filter((slice) => slice.value > 0)
    .map((slice) => {
      const start = angle;
      angle += (slice.value / total) * Math.PI * 2;
      return { slice, start, end: angle };
    });

  const focused = slices.find((slice) => slice.key === active);
  const summary = `${title ?? "Pie chart"}: ${slices.map((s) => `${s.label} ${s.value}`).join(", ")}`;

  return (
    <figure className="m-0 flex flex-wrap items-center justify-center gap-8">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={summary} style={{ width: 220, height: 220 }}>
        {wedges.length === 1 ? (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill={wedges[0].slice.color}
            onMouseEnter={() => setActive(wedges[0].slice.key)}
            onMouseLeave={() => setActive(null)}
          />
        ) : (
          wedges.map(({ slice, start, end }) => (
            <path
              key={slice.key}
              d={wedge(start, end)}
              fill={slice.color}
              stroke={SURFACE}
              strokeWidth="2"
              opacity={active && active !== slice.key ? 0.45 : 1}
              onMouseEnter={() => setActive(slice.key)}
              onMouseLeave={() => setActive(null)}
            />
          ))
        )}
      </svg>

      <div>
        <ul className="list-none p-0 m-0 text-sm text-gray-700">
          {slices.map((slice) => (
            <li
              key={slice.key}
              className="flex items-center gap-2 py-1"
              onMouseEnter={() => setActive(slice.key)}
              onMouseLeave={() => setActive(null)}
              style={{ fontWeight: active === slice.key ? 600 : 400 }}
            >
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: slice.color, display: "inline-block" }} />
              <span style={{ minWidth: 90 }}>{slice.label}</span>
              <span style={{ color: INK }}>
                {slice.value} <span className="text-gray-400">({share(slice)}%)</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-gray-500" aria-live="polite">
          {focused ? `${focused.label}: ${focused.value} of ${total}` : `${total} in total`}
        </p>
      </div>
    </figure>
  );
}
