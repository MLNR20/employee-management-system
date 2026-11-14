import { Entity, baseProps } from "../Entity";

/**
 * An hourly rate HR assigned to an employee from a day on. Rates are never edited: a new
 * assignment supersedes the old one, so the pay history stays intact. HR only.
 */
export class SalaryRate extends Entity {
  constructor({ employeeId, hourlyRate, effectiveFrom, assignedBy, remarks, ...base } = {}) {
    super(base);
    this.employeeId = employeeId;
    this.hourlyRate = hourlyRate;
    this.effectiveFrom = effectiveFrom;
    this.assignedBy = assignedBy;
    this.remarks = remarks;
  }

  static fromApi(raw = {}) {
    return new SalaryRate({
      ...baseProps(raw),
      employeeId: raw.employeeId,
      hourlyRate: raw.hourlyRate,
      effectiveFrom: raw.effectiveFrom ? String(raw.effectiveFrom).slice(0, 10) : undefined,
      assignedBy: raw.assignedBy,
      remarks: raw.remarks,
    });
  }
}
