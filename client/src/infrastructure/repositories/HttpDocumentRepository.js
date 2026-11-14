import { apiClient } from "../http/apiClient";
import { DocumentRequirement, EmployeeDocument } from "../../domain/document/Document";

/** The per-employee checklist and HR's review of a document. Plain CRUD goes through HttpRepository. */
export class HttpDocumentRepository {
  constructor(client = apiClient) {
    this.client = client;
  }

  /** @returns {{summary: object, items: Array<{requirement: DocumentRequirement, document: EmployeeDocument | null, state: string}>}} */
  async getChecklist(employeeId) {
    const { data } = await this.client.get(`/employee-documents/checklist/${employeeId}`);
    return {
      summary: data.summary,
      items: data.data.map(({ requirement, document, state }) => ({
        requirement: DocumentRequirement.fromApi(requirement),
        document: document ? EmployeeDocument.fromApi(document) : null,
        state,
      })),
    };
  }

  async verify(documentId) {
    await this.client.post(`/employee-documents/${documentId}/verify`);
  }

  async reject(documentId, remarks) {
    await this.client.post(`/employee-documents/${documentId}/reject`, { remarks });
  }
}
