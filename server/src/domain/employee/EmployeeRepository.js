import { Repository } from "../Repository.js";

/**
 * Employee persistence contract. Everything is inherited from the generic
 * Repository; add employee-specific queries here (e.g. findByDepartment).
 * @extends {Repository<import("./Employee").Employee>}
 */
export class EmployeeRepository extends Repository {}
