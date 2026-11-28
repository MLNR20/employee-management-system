import {
  usePayrollDeductions,
  usePayrollDeductionsPage,
  usePayrollDeduction,
  useCreatePayrollDeduction,
  useUpdatePayrollDeduction,
  useRemovePayrollDeduction,
} from "../hooks/useEntities";
import { DEDUCTION_BASES, DEDUCTION_METHODS, describeDeduction } from "../domain/payroll/PayrollDeduction";
import { statusColumn } from "./shared";

const labelOf = (options, value) => options.find((option) => option.value === value)?.label ?? value;

// What payroll takes from pay. None are built in: government rates and tax tables change, so HR enters
// the current ones. HR only, like salary rates.
export const payrollDeductionResource = {
  key: "payroll-deductions",
  title: "Deductions",
  singular: "Deduction",
  basePath: "/payroll-deductions",
  permission: "salary-rates:view",
  access: { create: "salary-rates:assign", edit: "salary-rates:assign", remove: "salary-rates:assign" },
  deleteNote: "Payroll stops taking it, including when you reopen earlier periods.",
  hooks: {
    useList: usePayrollDeductions,
    usePage: usePayrollDeductionsPage,
    useOne: usePayrollDeduction,
    useCreate: useCreatePayrollDeduction,
    useUpdate: useUpdatePayrollDeduction,
    useRemove: useRemovePayrollDeduction,
  },
  columns: () => [
    { key: "name", header: "Deduction", sortKey: "name" },
    { key: "method", header: "Method", sortKey: "method", accessor: (d) => labelOf(DEDUCTION_METHODS, d.method) },
    { key: "takes", header: "Takes", accessor: describeDeduction },
    { key: "base", header: "Worked out on", accessor: (d) => labelOf(DEDUCTION_BASES, d.base) },
    statusColumn(),
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true, hint: "Every deduction name is unique." },
    { name: "method", label: "Method", type: "select", required: true, options: DEDUCTION_METHODS },
    {
      name: "base",
      label: "Worked out on",
      type: "select",
      required: true,
      default: "gross",
      options: DEDUCTION_BASES,
      hint: "Income tax is usually worked out on what is left after contributions.",
    },
    { name: "amount", label: "Amount per cut-off", type: "number", min: 0, hint: "For a fixed amount." },
    { name: "percent", label: "Percent", type: "number", min: 0, max: 100, hint: "For a percent of pay." },
    { name: "minAmount", label: "Take at least", type: "number", min: 0, hint: "Optional, for a percent of pay." },
    { name: "maxAmount", label: "Take at most", type: "number", min: 0, hint: "Optional, for a percent of pay." },
    {
      name: "brackets",
      label: "Brackets",
      type: "textarea",
      height: "8rem",
      hint: "For a bracket table. One line each: from, base amount, percent. The highest 'from' below the pay applies: base amount plus that percent of the pay above 'from'. Amounts are per cut-off.",
    },
    { name: "isActive", label: "Active (taken from pay)", type: "checkbox", default: true },
  ],
};
