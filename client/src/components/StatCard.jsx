import Card from "./Card";
import SidebarIcon from "./SidebarIcon";

const accents = {
  default: { value: "text-gray-900", badge: "bg-blue-100 text-blue-700" },
  green: { value: "text-green-700", badge: "bg-green-100 text-green-700" },
  red: { value: "text-red-700", badge: "bg-red-100 text-red-700" },
};

/**
 * A small icon Card showing one number under a label, with the icon in a rounded-corner badge:
 * <StatCard label="Active" value={12} icon="checkCircle" accent="green" />
 * icon is a name from SidebarIcon.
 */
export default function StatCard({ label, value, icon, accent = "default" }) {
  const colors = accents[accent] ?? accents.default;

  return (
    <Card compact>
      <div className="flex items-center gap-4">
        {icon && (
          <span className={`flex items-center justify-center w-12 h-12 rounded-lg ${colors.badge}`}>
            <SidebarIcon name={icon} />
          </span>
        )}
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-3xl font-bold ${colors.value}`}>{value}</p>
        </div>
      </div>
    </Card>
  );
}
