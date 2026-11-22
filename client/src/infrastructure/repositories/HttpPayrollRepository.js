import { apiClient } from "../http/apiClient";

/** The HR payroll report. The server refuses it for anyone without salary-rates:view. */
export class HttpPayrollRepository {
  constructor(client = apiClient) {
    this.client = client;
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
