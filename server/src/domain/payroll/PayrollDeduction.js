import { Entity } from "../Entity.js";

/**
 * A deduction HR has set up, taken from every employee's pay each cut-off. See deductionRules for what
 * the fields mean.
 */
export class PayrollDeduction extends Entity {
  constructor({
    name,
    method,
    base: appliedTo = "gross",
    amount = null,
    percent = null,
    minAmount = null,
    maxAmount = null,
    brackets = [],
    ...entity
  } = {}) {
    super(entity);
    this.name = name;
    this.method = method;
    this.base = appliedTo;
    this.amount = amount;
    this.percent = percent;
    this.minAmount = minAmount;
    this.maxAmount = maxAmount;
    this.brackets = brackets;
  }
}
