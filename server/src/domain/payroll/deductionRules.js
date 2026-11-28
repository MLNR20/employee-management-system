import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";

// Deductions are set up by HR; none are built in, because government rates and tax tables change.
//
//   method "fixed":    `amount` each cut-off
//   method "percent":  `percent` of the base, kept between `minAmount` and `maxAmount` when given
//   method "brackets": a table, one bracket per row { from, base, percent }: for the highest `from`
//                      below the base pay, `base` plus `percent` of what is above `from`
//
//   base "gross":            worked out on gross pay
//   base "after_deductions": worked out on gross pay less all the "gross" deductions (e.g. income tax)

export const DeductionMethod = Object.freeze({ FIXED: "fixed", PERCENT: "percent", BRACKETS: "brackets" });
export const DeductionBase = Object.freeze({ GROSS: "gross", AFTER_DEDUCTIONS: "after_deductions" });
export const MAX_BRACKETS = 30;

const ALLOWED = ["name", "method", "base", "amount", "percent", "minAmount", "maxAmount", "brackets", "isActive"];

const round2 = (number) => Math.round((number + Number.EPSILON) * 100) / 100;

const number = (value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = isMissing(value) ? NaN : Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new ValidationError(`${label} must be a number from ${min}${max < Number.MAX_SAFE_INTEGER ? ` to ${max}` : " up"}`);
  }
  return parsed;
};

/** Brackets arrive as a list, or as text with one "from, base, percent" line each. Sorted by `from`. */
export function parseBrackets(input) {
  if (isMissing(input)) return [];
  let rows = input;
  if (typeof input === "string") {
    rows = input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",").map((part) => part.trim());
        if (parts.length !== 3) throw new ValidationError(`Each bracket line needs "from, base, percent": "${line}"`);
        return { from: parts[0], base: parts[1], percent: parts[2] };
      });
  }
  if (!Array.isArray(rows) || rows.length > MAX_BRACKETS) {
    throw new ValidationError(`Send at most ${MAX_BRACKETS} brackets`);
  }
  const brackets = rows
    .map((row) => ({
      from: number(row?.from, "A bracket's from"),
      base: number(row?.base, "A bracket's base amount"),
      percent: number(row?.percent, "A bracket's percent", { max: 100 }),
    }))
    .sort((a, b) => a.from - b.from);
  if (new Set(brackets.map((b) => b.from)).size !== brackets.length) {
    throw new ValidationError("Two brackets start from the same amount");
  }
  return brackets;
}

export function assertValidDeduction(input) {
  if (isMissing(input.name) || String(input.name).trim() === "" || isMissing(input.method)) {
    throw new ValidationError("Send all required fields: name, method");
  }
  if (!Object.values(DeductionMethod).includes(input.method)) {
    throw new ValidationError(`method must be one of: ${Object.values(DeductionMethod).join(", ")}`);
  }
  if (!isMissing(input.base) && !Object.values(DeductionBase).includes(input.base)) {
    throw new ValidationError(`base must be one of: ${Object.values(DeductionBase).join(", ")}`);
  }
  if (input.method === DeductionMethod.FIXED) number(input.amount, "amount", { min: 0.01 });
  if (input.method === DeductionMethod.PERCENT) {
    number(input.percent, "percent", { min: 0.01, max: 100 });
    const min = isMissing(input.minAmount) ? 0 : number(input.minAmount, "minAmount");
    if (!isMissing(input.maxAmount) && number(input.maxAmount, "maxAmount") < min) {
      throw new ValidationError("maxAmount cannot be less than minAmount");
    }
  }
  if (input.method === DeductionMethod.BRACKETS && parseBrackets(input.brackets).length === 0) {
    throw new ValidationError("Add at least one bracket");
  }
}

/** Whitelists the writable fields and stores only the numbers the chosen method uses. */
export function pickDeductionFields(input) {
  const picked = pickFields(input, ALLOWED);
  const uses = (method) => picked.method === method;
  const optional = (value) => (isMissing(value) ? null : Number(value));

  return {
    ...picked,
    name: String(picked.name).trim(),
    base: picked.base || DeductionBase.GROSS,
    amount: uses(DeductionMethod.FIXED) ? Number(picked.amount) : null,
    percent: uses(DeductionMethod.PERCENT) ? Number(picked.percent) : null,
    minAmount: uses(DeductionMethod.PERCENT) ? optional(picked.minAmount) : null,
    maxAmount: uses(DeductionMethod.PERCENT) ? optional(picked.maxAmount) : null,
    brackets: uses(DeductionMethod.BRACKETS) ? parseBrackets(picked.brackets) : [],
  };
}

/** What one rule takes from a base pay, before it is limited to what is left to pay. */
export function deductionAmount(rule, basePay) {
  if (basePay <= 0) return 0;
  if (rule.method === DeductionMethod.FIXED) return round2(rule.amount);
  if (rule.method === DeductionMethod.PERCENT) {
    let amount = (basePay * rule.percent) / 100;
    if (rule.minAmount !== null && rule.minAmount !== undefined) amount = Math.max(amount, rule.minAmount);
    if (rule.maxAmount !== null && rule.maxAmount !== undefined) amount = Math.min(amount, rule.maxAmount);
    return round2(amount);
  }
  const bracket = [...rule.brackets].reverse().find((b) => basePay > b.from);
  return bracket ? round2(bracket.base + ((basePay - bracket.from) * bracket.percent) / 100) : 0;
}

/**
 * The deductions from one gross pay: every active rule, "gross" ones first. Together they never take
 * more than the pay, and nothing is taken from a pay of zero.
 * @returns {{deductions: Array<{name: string, amount: number}>, totalDeductions: number, netPay: number}}
 */
export function applyDeductions(gross, rules = []) {
  const active = rules.filter((rule) => rule.isActive !== false);
  const deductions = [];
  let left = round2(gross);

  const take = (group, basePay) => {
    for (const rule of group) {
      const amount = Math.min(deductionAmount(rule, basePay), left);
      if (amount <= 0) continue;
      deductions.push({ name: rule.name, amount: round2(amount) });
      left = round2(left - amount);
    }
  };

  if (left > 0) {
    take(active.filter((rule) => rule.base !== DeductionBase.AFTER_DEDUCTIONS), left);
    take(active.filter((rule) => rule.base === DeductionBase.AFTER_DEDUCTIONS), left);
  }

  return { deductions, totalDeductions: round2(round2(gross) - left), netPay: left };
}
