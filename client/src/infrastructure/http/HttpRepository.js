import { Repository } from "../../domain/Repository";
import { apiClient } from "./apiClient";

/**
 * Generic REST implementation of the Repository contract: any resource that
 * exposes GET/POST /<resource>/ and GET/PUT/DELETE /<resource>/:id. A concrete
 * repository only names the resource and how a payload becomes an entity.
 */
export class HttpRepository extends Repository {
  /**
   * @param {Object} options
   * @param {string} options.resource path segment, e.g. "employees"
   * @param {(raw: object) => import("../../domain/Entity").Entity} options.fromApi
   * @param {import("axios").AxiosInstance} [options.client]
   */
  constructor({ resource, fromApi, client = apiClient }) {
    super();
    this.resource = resource;
    this.fromApi = fromApi;
    this.client = client;
  }

  async getAll() {
    const { data } = await this.client.get(`/${this.resource}/`);
    return data.data.map(this.fromApi);
  }

  async getById(id) {
    const { data } = await this.client.get(`/${this.resource}/${id}`);
    return this.fromApi(data);
  }

  async create(payload) {
    const { data } = await this.client.post(`/${this.resource}/`, payload);
    return this.fromApi(data);
  }

  async update(id, payload) {
    await this.client.put(`/${this.resource}/${id}`, payload);
  }

  async remove(id) {
    await this.client.delete(`/${this.resource}/${id}`);
  }
}
