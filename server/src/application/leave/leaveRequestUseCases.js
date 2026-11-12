import { InvalidStateError, NotFoundError, ValidationError } from "../../domain/errors.js";
import { LeaveStatus } from "../../domain/leave/LeaveRequest.js";
import { ApprovalDecision } from "../../domain/leave/LeaveApproval.js";
import { validateLeaveRequest } from "../../domain/leave/leaveRequestRules.js";
import { normalizePageQuery, toPage } from "../../domain/pagination.js";

/**
 * Filing and deciding leave. A request starts pending; an administrator then
 * approves or rejects it exactly once, and each decision is recorded as a
 * LeaveApproval naming who made it. Only approval touches the leave balance.
 *
 * @param {Object} deps
 * @param {import("../../domain/leave/LeaveRequestRepository").LeaveRequestRepository} deps.leaveRequestRepository
 * @param {import("../../domain/leave/LeaveApprovalRepository").LeaveApprovalRepository} deps.leaveApprovalRepository
 * @param {import("../../domain/leave/LeaveBalanceRepository").LeaveBalanceRepository} deps.leaveBalanceRepository
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {import("../../domain/leave/LeaveTypeRepository").LeaveTypeRepository} deps.leaveTypeRepository
 * @param {import("../../domain/administrator/AdministratorRepository").AdministratorRepository} deps.administratorRepository
 */
export const createLeaveRequestUseCases = ({
  leaveRequestRepository,
  leaveApprovalRepository,
  leaveBalanceRepository,
  employeeRepository,
  leaveTypeRepository,
  administratorRepository,
}) => {
  const getOrThrow = async (id) => {
    const request = await leaveRequestRepository.findById(id);
    if (!request) throw new NotFoundError("Leave request not found");
    return request;
  };

  const assertPending = (request, action) => {
    if (request.status !== LeaveStatus.PENDING) {
      throw new InvalidStateError(`Only pending requests can be ${action}; this one is ${request.status}`);
    }
  };

  const cleanRemarks = (remarks) => {
    if (remarks === undefined || remarks === null) return "";
    if (typeof remarks !== "string") throw new ValidationError("remarks must be text");
    return remarks.trim();
  };

  const assertApprover = async (approverId) => {
    if (!approverId || !(await administratorRepository.findById(approverId))) {
      throw new ValidationError("The approving administrator does not exist");
    }
  };

  return {
    listLeaveRequests: () => leaveRequestRepository.findAll(),

    async listLeaveRequestsPage(query) {
      const request = normalizePageQuery(query);
      return toPage(await leaveRequestRepository.findPage(request), request);
    },

    getLeaveRequest: getOrThrow,

    async listForEmployee(employeeId) {
      if (!(await employeeRepository.findById(employeeId))) {
        throw new NotFoundError("Employee not found");
      }
      return leaveRequestRepository.findByEmployeeId(employeeId);
    },

    /** An employee files leave. It needs a balance for that leave type with enough days left. */
    async fileLeave(input = {}) {
      const { startDate, endDate, days } = validateLeaveRequest(input);

      if (!(await employeeRepository.findById(input.employeeId))) {
        throw new ValidationError("That employee does not exist");
      }
      if (!(await leaveTypeRepository.findById(input.leaveTypeId))) {
        throw new ValidationError("That leave type does not exist");
      }

      const balance = await leaveBalanceRepository.findByEmployeeAndType(
        input.employeeId,
        input.leaveTypeId
      );
      if (!balance) {
        throw new ValidationError("This employee has no leave balance for that leave type");
      }
      if (balance.availableLeaves < days) {
        throw new ValidationError(
          `Not enough leave balance: ${days} day(s) requested, ${balance.availableLeaves} available`
        );
      }

      return leaveRequestRepository.create({
        employeeId: input.employeeId,
        leaveTypeId: input.leaveTypeId,
        startDate,
        endDate,
        days,
        reason: input.reason?.trim() ?? "",
        status: LeaveStatus.PENDING,
      });
    },

    /** Approves a pending request, deducts its days from the balance and records who approved. */
    async approveLeave(id, { approverId, remarks } = {}) {
      const request = await getOrThrow(id);
      assertPending(request, "approved");
      await assertApprover(approverId);
      const note = cleanRemarks(remarks);

      const balance = await leaveBalanceRepository.findByEmployeeAndType(
        request.employeeId,
        request.leaveTypeId
      );
      if (!balance) throw new ValidationError("The employee no longer has a balance for this leave type");

      // Deduct first, atomically and only if enough is left, so concurrent approvals cannot overspend.
      const deducted = await leaveBalanceRepository.deductAvailable(balance.id, request.days);
      if (!deducted) throw new ValidationError("Not enough leave balance to approve this request");

      const approved = await leaveRequestRepository.transitionStatus(
        id,
        LeaveStatus.PENDING,
        LeaveStatus.APPROVED
      );
      if (!approved) {
        // Someone else decided it between our check and now: give the days back.
        await leaveBalanceRepository.restoreAvailable(balance.id, request.days);
        throw new InvalidStateError("This request was already decided");
      }

      await leaveApprovalRepository.create({
        leaveRequestId: id,
        approverId,
        decision: ApprovalDecision.APPROVED,
        remarks: note,
      });
      return approved;
    },

    /** Rejects a pending request and records who rejected it. The balance is untouched. */
    async rejectLeave(id, { approverId, remarks } = {}) {
      const request = await getOrThrow(id);
      assertPending(request, "rejected");
      await assertApprover(approverId);
      const note = cleanRemarks(remarks);

      const rejected = await leaveRequestRepository.transitionStatus(
        id,
        LeaveStatus.PENDING,
        LeaveStatus.REJECTED
      );
      if (!rejected) throw new InvalidStateError("This request was already decided");

      await leaveApprovalRepository.create({
        leaveRequestId: id,
        approverId,
        decision: ApprovalDecision.REJECTED,
        remarks: note,
      });
      return rejected;
    },

    /** Withdraws a pending request. Decided requests are history and stay as they are. */
    async cancelLeave(id) {
      const request = await getOrThrow(id);
      assertPending(request, "cancelled");

      const cancelled = await leaveRequestRepository.transitionStatus(
        id,
        LeaveStatus.PENDING,
        LeaveStatus.CANCELLED
      );
      if (!cancelled) throw new InvalidStateError("This request was already decided");
      return cancelled;
    },

    /** The decisions made on a request: who, when and why. */
    async listApprovals(id) {
      await getOrThrow(id);
      return leaveApprovalRepository.findByLeaveRequestId(id);
    },
  };
};
