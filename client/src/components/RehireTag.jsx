import { rehireTagLabel } from "../domain/employee/separation";

const tones = {
  Rehireable: "bg-green-100 text-green-700",
  "Non-rehireable": "bg-red-100 text-red-700",
  "Not tagged": "bg-yellow-100 text-yellow-700",
};

/** The employee's rehire tag. A current employee has none and shows a dash. */
export default function RehireTag({ employee }) {
  const label = rehireTagLabel(employee);
  if (!label) return <span className="text-gray-400">—</span>;
  return <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${tones[label]}`}>{label}</span>;
}
