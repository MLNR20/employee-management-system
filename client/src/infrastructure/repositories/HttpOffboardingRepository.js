import { apiClient } from "../http/apiClient";

/**
 * One employee's offboarding. Every call resolves to the same shape:
 * { employeeId, isActive, rehireStatus, separation, history, clearance }.
 */
export class HttpOffboardingRepository {
  constructor(client = apiClient) {
    this.client = client;
  }

  async get(employeeId) {
    const { data } = await this.client.get(`/offboarding/${employeeId}`);
    return data;
  }

  async start(employeeId, details) {
    const { data } = await this.client.post(`/offboarding/${employeeId}`, details);
    return data;
  }

  async update(employeeId, changes) {
    const { data } = await this.client.put(`/offboarding/${employeeId}`, changes);
    return data;
  }

  async complete(employeeId) {
    const { data } = await this.client.post(`/offboarding/${employeeId}/complete`, {});
    return data;
  }

  async cancel(employeeId) {
    const { data } = await this.client.delete(`/offboarding/${employeeId}`);
    return data;
  }

  async rehire(employeeId) {
    const { data } = await this.client.post(`/offboarding/${employeeId}/rehire`, {});
    return data;
  }
}
