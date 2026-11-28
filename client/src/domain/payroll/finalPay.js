export const money = (value) =>
  value === undefined || value === null
    ? "-"
    : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The lines of a final pay computation as shown and exported; deductions are negative. */
export const finalPayRows = (result) => {
  const line = (label, amount, strong = false) => ({ label, amount, strong });
  return [
    line(`Unpaid salary (${result.daysWorked} days worked)`, result.unpaidSalary),
    line("13th month pay (pro-rated)", result.thirteenthMonth),
    line(`Leave conversion (${result.leaveDays} days)`, result.leaveConversion),
    ...result.adjustments.filter((a) => a.amount > 0).map((a) => line(a.label, a.amount)),
    line("Total earnings", result.totalEarnings, true),
    ...result.deductions.map((d) => line(d.name, -d.amount)),
    ...result.adjustments.filter((a) => a.amount < 0).map((a) => line(a.label, a.amount)),
    line("Total deductions", -result.totalDeductions, true),
    line("Net final pay", result.netPay, true),
  ];
};
