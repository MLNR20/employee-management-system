import { createCrudUseCases } from "../shared/crudUseCases";

/**
 * Leave requests: file one, then an administrator approves or rejects it.
 * Who approved is decided by the server from the signed-in session.
 * @param {import("../../infrastructure/repositories/HttpLeaveRequestRepository").HttpLeaveRequestRepository} repository
 */
export const createLeaveRequestUseCases = (repository) => ({
  ...createCrudUseCases(repository),
  approve: (id, remarks) => repository.approve(id, remarks),
  reject: (id, remarks) => repository.reject(id, remarks),
  cancel: (id) => repository.cancel(id),
  approvals: (id) => repository.getApprovals(id),
});
