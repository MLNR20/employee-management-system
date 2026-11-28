import { MongoRepository } from "./MongoRepository.js";
import { PayrollDeduction } from "../../../domain/payroll/PayrollDeduction.js";
import { DuplicateDeductionError } from "../../../domain/errors.js";
import { PayrollDeductionModel } from "./models/payrollDeductionModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toDeduction = (doc) =>
  new PayrollDeduction({
    ...toBaseProps(doc),
    name: doc.name,
    method: doc.method,
    base: doc.base,
    amount: doc.amount ?? null,
    percent: doc.percent ?? null,
    minAmount: doc.minAmount ?? null,
    maxAmount: doc.maxAmount ?? null,
    brackets: (doc.brackets ?? []).map(({ from, base, percent }) => ({ from, base, percent })),
  });

export class MongoPayrollDeductionRepository extends MongoRepository {
  constructor() {
    super({
      model: PayrollDeductionModel,
      toEntity: toDeduction,
      searchFields: ["name", "method"],
      duplicateError: () => new DuplicateDeductionError(),
    });
  }

  /** Oldest first: deductions are taken in the order they were set up. */
  async findAll() {
    const docs = await PayrollDeductionModel.find({}).sort({ createdAt: 1, _id: 1 }).lean();
    return docs.map(toDeduction);
  }
}
