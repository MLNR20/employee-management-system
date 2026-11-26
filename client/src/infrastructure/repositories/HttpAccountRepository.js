import { apiClient } from "../http/apiClient";

/** Administrator accounts and passwords. Listing them goes through the ordinary "administrators" resource. */
export class HttpAccountRepository {
  constructor(client = apiClient) {
    this.client = client;
  }

  /** @param {{username: string, password: string, first_name: string, last_name: string, email: string}} account */
  async register(account) {
    await this.client.post("/admin/register", account);
  }

  async changePassword({ currentPassword, newPassword }) {
    await this.client.post("/admin/password", { currentPassword, newPassword });
  }

  async resetPassword(administratorId, newPassword) {
    await this.client.post(`/administrators/${administratorId}/password`, { newPassword });
  }
}
