import { Entity, baseProps } from "../Entity";

export const DEDUCTION_METHODS = [
  { value: "fixed", label: "Fixed amount" },
  { value: "percent", label: "Percent of pay" },
  { value: "brackets", label: "Bracket table" },
];

export const DEDUCTION_BASES = [
  { value: "gross", label: "Gross pay" },
  { value: "after_deductions", label: "Pay left after the gross deductions" },
];

/** A table as the form edits it: one "from, base, percent" line per bracket. */
export const bracketText = (brackets = []) => brackets.map((b) => `${b.from}, ${b.base}, ${b.percent}`).join("\n");

/** How much a rule takes, in words, for the list. */
export const describeDeduction = ({ method, amount, percent, minAmount, maxAmount, brackets }) => {
  if (method === "fixed") return `${amount} per cut-off`;
  if (method === "percent") {
    const limits = [minAmount !== null && `at least ${minAmount}`, maxAmount !== null && `at most ${maxAmount}`].filter(Boolean);
    return `${percent}%${limits.length ? ` (${limits.join(", ")})` : ""}`;
  }
  const count = String(brackets ?? "").split("\n").filter(Boolean).length;
  return `${count} bracket${count === 1 ? "" : "s"}`;
};

export class PayrollDeduction extends Entity {
  constructor({ name, method, base: appliedTo = "gross", amount, percent, minAmount, maxAmount, brackets = "", ...entity } = {}) {
    super(entity);
    this.name = name;
    this.method = method;
    this.base = appliedTo;
    this.amount = amount;
    this.percent = percent;
    this.minAmount = minAmount;
    this.maxAmount = maxAmount;
    this.brackets = brackets; // text, see bracketText
  }

  static fromApi(raw = {}) {
    return new PayrollDeduction({
      ...baseProps(raw),
      name: raw.name,
      method: raw.method,
      base: raw.base,
      amount: raw.amount ?? null,
      percent: raw.percent ?? null,
      minAmount: raw.minAmount ?? null,
      maxAmount: raw.maxAmount ?? null,
      brackets: bracketText(raw.brackets),
    });
  }
}
