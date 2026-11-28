import { useState } from "react";
import ExportButtons from "./ExportButtons";
import { useFinalPay } from "../hooks/useEntities";
import { finalPayRows, money } from "../domain/payroll/finalPay";

const inputClass = "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5";

let nextLine = 1;
const blankLine = () => ({ key: nextLine++, label: "", amount: "" });

/**
 * What a leaving employee is still owed. HR can move where the unpaid salary starts, change the leave
 * days converted and add lines (a negative amount is deducted). Nothing is stored: export the result and
 * attach it to the "Final pay computation" document.
 */
export default function FinalPay({ employeeId, employeeName }) {
  const [from, setFrom] = useState("");
  const [leaveDays, setLeaveDays] = useState("");
  const [lines, setLines] = useState([]);
  const compute = useFinalPay();
  const result = compute.data;

  const setLine = (key, field, value) =>
    setLines((previous) => previous.map((line) => (line.key === key ? { ...line, [field]: value } : line)));

  const submit = (event) => {
    event.preventDefault();
    compute.mutate({
      employeeId,
      input: {
        ...(from && { from }),
        ...(leaveDays !== "" && { leaveDays: Number(leaveDays) }),
        adjustments: lines
          .filter((line) => line.label.trim() || line.amount !== "")
          .map(({ label, amount }) => ({ label, amount: Number(amount) })),
      },
    });
  };

  return (
    <div>
      <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="finalFrom" className="block mb-2 text-sm font-medium text-gray-900">
            Salary unpaid since
          </label>
          <input id="finalFrom" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          <p className="mt-1 text-xs text-gray-500">Blank: the start of the cut-off holding the last working day.</p>
        </div>
        <div>
          <label htmlFor="finalLeave" className="block mb-2 text-sm font-medium text-gray-900">
            Leave days to convert
          </label>
          <input id="finalLeave" type="number" min="0" step="any" value={leaveDays} onChange={(e) => setLeaveDays(e.target.value)} className={inputClass} />
          <p className="mt-1 text-xs text-gray-500">Blank: the unused days of every paid leave type.</p>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <p className="mb-2 text-sm font-medium text-gray-900">Other earnings and deductions</p>
          {lines.map((line) => (
            <div key={line.key} className="flex flex-row gap-2 mb-2">
              <input aria-label="Description" placeholder="Description" maxLength={100} value={line.label}
                onChange={(e) => setLine(line.key, "label", e.target.value)} className={inputClass} />
              <input aria-label="Amount, negative to deduct" type="number" step="any" placeholder="Amount (negative to deduct)"
                value={line.amount} onChange={(e) => setLine(line.key, "amount", e.target.value)} className={inputClass} />
              <button type="button" className="text-red-700 text-sm font-medium hover:underline"
                onClick={() => setLines((previous) => previous.filter((other) => other.key !== line.key))}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="text-blue-700 text-sm font-medium hover:underline"
            onClick={() => setLines((previous) => [...previous, blankLine()])}>
            + Add a line
          </button>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <button type="submit" disabled={compute.isPending}
            className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-4 py-2.5">
            {compute.isPending ? "Calculating..." : "Calculate final pay"}
          </button>
        </div>
      </form>

      {compute.error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {compute.error.response?.data?.message ?? "Could not calculate the final pay."}
        </p>
      )}

      {result && (
        <div className="mt-4">
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm text-left">
              <caption className="px-4 py-3 text-left text-gray-500">
                {result.from} to {result.lastWorkingDay}
              </caption>
              <tbody>
                {finalPayRows(result).map(({ label, amount, strong }) => (
                  <tr key={label} className="border-t border-gray-100">
                    <th scope="row" className={`px-4 py-2 text-gray-900 ${strong ? "font-semibold" : "font-normal"}`}>{label}</th>
                    <td className={`px-4 py-2 text-right text-gray-900 ${strong ? "font-semibold" : ""}`}>{money(amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.dailyRate === null && (
            <p className="mt-2 text-sm text-red-600">No hourly rate or salary is on file, so leave could not be valued.</p>
          )}
          {result.netPay < 0 && <p className="mt-2 text-sm text-red-600">A negative net pay is owed to the company.</p>}
          <div className="mt-3">
            <ExportButtons
              getTable={() => ({
                filename: `final-pay-${employeeName}`.replace(/[^\w-]+/g, "-"),
                title: `Final pay: ${employeeName} (${result.from} to ${result.lastWorkingDay})`,
                headers: ["Item", "Amount"],
                rows: finalPayRows(result).map(({ label, amount }) => [label, money(amount)]),
              })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
