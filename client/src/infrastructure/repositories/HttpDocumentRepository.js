import { apiClient } from "../http/apiClient";
import { DocumentRequirement, EmployeeDocument } from "../../domain/document/Document";

/** The per-employee checklist and HR's review of a document. Plain CRUD goes through HttpRepository. */
export class HttpDocumentRepository {
  constructor(client = apiClient) {
    this.client = client;
  }

  /** @returns {{summary: object, items: Array<{requirement: DocumentRequirement, document: EmployeeDocument | null, state: string}>}} */
  async getChecklist(employeeId, stage = "onboarding") {
    const { data } = await this.client.get(`/employee-documents/checklist/${employeeId}`, { params: { stage } });
    return {
      summary: data.summary,
      files: data.files ?? null, // the file limits and how much of them is used
      items: data.data.map(({ requirement, document, state }) => ({
        requirement: DocumentRequirement.fromApi(requirement),
        document: document ? EmployeeDocument.fromApi(document) : null,
        state,
      })),
    };
  }

  /** Sends the file's bytes as the request body. */
  async upload(documentId, file) {
    await this.client.put(`/employee-documents/${documentId}/file`, file, {
      params: { name: file.name },
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
  }

  async removeFile(documentId) {
    await this.client.delete(`/employee-documents/${documentId}/file`);
  }

  /** @returns {Promise<Blob>} the contents of an uploaded copy */
  async getFile(fileId) {
    const { data } = await this.client.get(`/employee-documents/files/${fileId}`, { responseType: "blob" });
    return data;
  }

  async verify(documentId) {
    await this.client.post(`/employee-documents/${documentId}/verify`);
  }

  async reject(documentId, remarks) {
    await this.client.post(`/employee-documents/${documentId}/reject`, { remarks });
  }
}
