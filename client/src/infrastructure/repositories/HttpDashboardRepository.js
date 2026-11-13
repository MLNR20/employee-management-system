import { apiClient } from "../http/apiClient";

/** Read-only figures for the dashboard. */
export class HttpDashboardRepository {
  constructor(client = apiClient) {
    this.client = client;
  }

  /** { date, total, active, inactive, present, absent } for today. */
  async getSummary() {
    const { data } = await this.client.get("/dashboard/summary");
    return data;
  }

  /** [{ date: "YYYY-MM-DD", present, absent }] for the working days in the last `days` calendar days. */
  async getAttendance(days) {
    const { data } = await this.client.get("/dashboard/attendance", { params: { days } });
    return data.data;
  }
}
