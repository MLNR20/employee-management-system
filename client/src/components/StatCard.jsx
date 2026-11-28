import Card from "./Card";
import SidebarIcon from "./SidebarIcon";
import { SkeletonBar } from "./Skeleton";

const accents = {
  default: { value: "text-gray-900", badge: "bg-blue-100 text-blue-700" },
  green: { value: "text-green-700", badge: "bg-green-100 text-green-700" },
  red: { value: "text-red-700", badge: "bg-red-100 text-red-700" },
};

/**
 * A small icon Card showing one number under a label, with the icon in a rounded-corner badge:
 * <StatCard label="Active" value={12} icon="checkCircle" accent="green" />
 * icon is a name from SidebarIcon. While `loading`, a placeholder stands in for the number.
 */
export default function StatCard({ label, value, icon, accent = "default", loading = false }) {
  const colors = accents[accent] ?? accents.default;

  return (
    <Card compact>
      <div className="flex items-center gap-4">
        {icon && (
          <span className={`flex items-center justify-center w-12 h-12 rounded-lg ${colors.badge}`}>
            <SidebarIcon name={icon} />
          </span>
        )}
        <div aria-busy={loading}>
          <p className="text-sm text-gray-500">{label}</p>
          {/* The placeholder is as tall as the number, so the card does not grow when it arrives. */}
          <p className={`text-3xl font-bold ${colors.value}`}>
            {loading ? <SkeletonBar width="4rem" style={{ height: "2.25rem" }} /> : value}
          </p>
        </div>
      </div>
    </Card>
  );
}
