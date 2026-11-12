import { Entity } from "../Entity.js";

/** A kind of leave an employee can take, e.g. "Annual Leave" (paid) or "Unpaid Leave". */
export class LeaveType extends Entity {
  constructor({ name, isPaid = false, ...base } = {}) {
    super(base);
    this.name = name;
    this.isPaid = isPaid;
  }
}
