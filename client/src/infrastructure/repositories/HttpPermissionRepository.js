import { apiClient } from "../http/apiClient";

/** The catalog of permissions a role can hold: [{ key, label, actions: ["view", ...] }]. */
export class HttpPermissionRepository {
  constructor(client = apiClient) {
    this.client = client;
  }

  async getCatalog() {
    const { data } = await this.client.get("/roles/permissions");
    return data.data;
  }
}
