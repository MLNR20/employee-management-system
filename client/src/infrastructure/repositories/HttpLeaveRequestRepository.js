import { HttpRepository } from "../http/HttpRepository";
import { LeaveRequest, LeaveApproval } from "../../domain/leave/Leave";

/** Leave requests are filed and then decided, so on top of the generic reads they have actions. */
export class HttpLeaveRequestRepository extends HttpRepository {
  constructor() {
    super({ resource: "leave-requests", fromApi: LeaveRequest.fromApi });
  }

  async approve(id, remarks) {
    const { data } = await this.client.post(`/${this.resource}/${id}/approve`, { remarks });
    return this.fromApi(data);
  }

  async reject(id, remarks) {
    const { data } = await this.client.post(`/${this.resource}/${id}/reject`, { remarks });
    return this.fromApi(data);
  }

  async cancel(id) {
    const { data } = await this.client.post(`/${this.resource}/${id}/cancel`);
    return this.fromApi(data);
  }

  async getApprovals(id) {
    const { data } = await this.client.get(`/${this.resource}/${id}/approvals`);
    return data.data.map(LeaveApproval.fromApi);
  }
}
