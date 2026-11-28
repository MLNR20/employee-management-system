import { apiClient } from "../http/apiClient";

/** The HR payroll report. The server refuses it for anyone without salary-rates:view. */
export class HttpPayrollRepository {
  constructor(client = apiClient) {
    this.client = client;
  }

  /**
   * What a leaving employee is still owed (see the server's finalPayRules). Nothing is stored.
   * @param {string} employeeId
   * @param {{from?: string, leaveDays?: number, adjustments?: Array<{label: string, amount: number}>}} input
   */
  async getFinalPay(employeeId, input) {
    const { data } = await this.client.post(`/payroll/final-pay/${employeeId}`, input);
    return data;
  }

  /**
   * Gross pay per employee for the days from `from` to `to` ("YYYY-MM-DD", both included):
   * { from, to, totals: { employees, hoursWorked, grossPay }, data: [{ employeeName, email, hourlyRate, daysWorked, hoursWorked, grossPay, days: [...] }] }
   */
  async getReport({ from, to }) {
    const { data } = await this.client.get("/payroll", { params: { from, to } });
    return data;
  }
}
