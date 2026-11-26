import { InvalidStateError, NotFoundError } from "../../domain/errors.js";
import { isMissing, pickFields } from "../../domain/pickFields.js";
import { localDay } from "../../domain/attendance/localTime.js";
import { DocumentStage } from "../../domain/document/DocumentRequirement.js";
import { LeaveStatus } from "../../domain/leave/LeaveRequest.js";
import {
  OffboardingStatus,
  RehireStatus,
  SEPARATION_FIELDS,
  assertValidSeparation,
} from "../../domain/employee/separationRules.js";

/**
 * Offboarding an employee, in steps:
 *
 *   1. start:    records how and when they leave. They stay active (notice period) and their
 *                offboarding document checklist opens.
 *   2. complete: on or after the last working day, once they are tagged rehireable or non-rehireable.
 *                The employee becomes inactive. Documents can still be collected afterwards, because
 *                final pay, the quitclaim and the certificate of employment often come later.
 *
 * An offboarding in progress can be cancelled (a withdrawn resignation). A completed one can only be
 * undone by rehiring, which a non-rehireable tag forbids.
 *
 * @param {Object} deps
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {ReturnType<import("../document/documentUseCases.js").createEmployeeDocumentUseCases>} deps.employeeDocumentUseCases
 * @param {import("../../domain/inventory/ItemRepository").ItemRepository} [deps.itemRepository] when given, items still held are reported
 * @param {import("../../domain/leave/LeaveRequestRepository").LeaveRequestRepository} [deps.leaveRequestRepository] when given, undecided leave is reported
 * @param {number} [deps.utcOffsetMinutes] the workplace clock, used for "today"
 * @param {() => Date} [deps.now]
 */
export const createOffboardingUseCases = ({
  employeeRepository,
  employeeDocumentUseCases,
  itemRepository,
  leaveRequestRepository,
  utcOffsetMinutes = 0,
  now = () => new Date(),
}) => {
  const findEmployee = async (employeeId) => {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) throw new NotFoundError("Employee not found");
    return employee;
  };

  const findOffboarding = async (employeeId) => {
    const employee = await findEmployee(employeeId);
    if (!employee.separation) throw new InvalidStateError("This employee is not being offboarded");
    return employee;
  };

  const activeReports = async (employeeId) =>
    (await employeeRepository.findByManagerId(employeeId)).filter((report) => report.isActive !== false);

  /** The hand-set fields of a separation, trimmed, with blanks as empty text. */
  const cleanFields = (input) => ({
    separationType: input.separationType,
    lastWorkingDay: input.lastWorkingDay,
    reason: String(input.reason ?? "").trim(),
    rehireNotes: String(input.rehireNotes ?? "").trim(),
  });

  /** Everything that is still owed by, or to be sorted out for, a leaving employee. */
  const clearanceFor = async (employee) => {
    const [checklist, items, reports, leave] = await Promise.all([
      employee.separation ? employeeDocumentUseCases.checklist(employee.id, DocumentStage.OFFBOARDING) : null,
      itemRepository ? itemRepository.findHeldBy(employee.id) : [],
      activeReports(employee.id),
      leaveRequestRepository ? leaveRequestRepository.findByEmployeeId(employee.id) : [],
    ]);

    const documents = checklist?.summary ?? null;
    const heldItems = items.map(({ id, name, serialNumber }) => ({ id, name, serialNumber }));
    const directReports = reports.map(({ id, first_name, last_name }) => ({ id, name: `${first_name} ${last_name}`.trim() }));
    const pendingLeave = leave.filter((request) => request.status === LeaveStatus.PENDING).length;

    return {
      documents,
      heldItems,
      directReports,
      pendingLeave,
      // A checklist with no required lines has nothing outstanding.
      cleared:
        Boolean(documents) &&
        documents.requiredVerified === documents.required &&
        heldItems.length === 0 &&
        directReports.length === 0 &&
        pendingLeave === 0,
    };
  };

  const view = async (employee) => ({
    employeeId: employee.id,
    isActive: employee.isActive !== false,
    rehireStatus: employee.rehireStatus,
    separation: employee.separation,
    history: employee.separationHistory,
    clearance: await clearanceFor(employee),
  });

  return {
    async getOffboarding(employeeId) {
      return view(await findEmployee(employeeId));
    },

    /** Opens an offboarding. Also how an employee who is already inactive gets their rehire tag. */
    async start(employeeId, input = {}, administratorId) {
      const employee = await findEmployee(employeeId);
      if (employee.separation) throw new InvalidStateError("This employee already has an offboarding");
      assertValidSeparation(input);

      const updated = await employeeRepository.update(employeeId, {
        rehireStatus: input.rehireStatus || "",
        separation: {
          ...cleanFields(input),
          status: OffboardingStatus.IN_PROGRESS,
          startedBy: administratorId,
          startedAt: now(),
          completedBy: null,
          completedAt: null,
        },
      });
      return view(updated);
    },

    /** Corrects the details or the rehire tag. Fields that are left out keep their stored value. */
    async update(employeeId, input = {}, administratorId) {
      const employee = await findOffboarding(employeeId);
      const changes = pickFields(input, SEPARATION_FIELDS);
      const merged = { ...employee.separation, rehireStatus: employee.rehireStatus, ...changes };
      assertValidSeparation(merged);

      const completed = employee.separation.status === OffboardingStatus.COMPLETED;
      if (completed && isMissing(merged.rehireStatus)) {
        throw new InvalidStateError("A completed offboarding must keep a rehire tag");
      }
      if (completed && merged.lastWorkingDay > localDay(now(), utcOffsetMinutes)) {
        throw new InvalidStateError("A completed offboarding cannot have a last working day in the future");
      }

      const updated = await employeeRepository.update(employeeId, {
        rehireStatus: merged.rehireStatus || "",
        separation: {
          ...employee.separation,
          ...cleanFields(merged),
          updatedBy: administratorId,
          updatedAt: now(),
        },
      });
      return view(updated);
    },

    /** The employee has left: needs a rehire tag, and nobody still reporting to them. */
    async complete(employeeId, input = {}, administratorId) {
      const employee = await findOffboarding(employeeId);
      if (employee.separation.status === OffboardingStatus.COMPLETED) {
        throw new InvalidStateError("This offboarding is already completed");
      }

      const changes = pickFields(input, ["rehireStatus", "rehireNotes"]);
      const merged = { ...employee.separation, rehireStatus: employee.rehireStatus, ...changes };
      assertValidSeparation(merged);
      if (isMissing(merged.rehireStatus)) {
        throw new InvalidStateError("Tag this employee rehireable or non-rehireable before completing the offboarding");
      }
      if (merged.lastWorkingDay > localDay(now(), utcOffsetMinutes)) {
        throw new InvalidStateError(
          `Their last working day is ${merged.lastWorkingDay}. Complete the offboarding on or after that day.`
        );
      }
      const reports = await activeReports(employeeId);
      if (reports.length > 0) {
        throw new InvalidStateError(
          `${reports.length} employee${reports.length === 1 ? " still reports" : "s still report"} to this one. Give them another manager first.`
        );
      }

      const updated = await employeeRepository.update(employeeId, {
        isActive: false,
        rehireStatus: merged.rehireStatus,
        separation: {
          ...employee.separation,
          ...cleanFields(merged),
          status: OffboardingStatus.COMPLETED,
          completedBy: administratorId,
          completedAt: now(),
        },
      });
      return view(updated);
    },

    /** Withdraws an offboarding that has not completed, along with the documents recorded for it. */
    async cancel(employeeId) {
      const employee = await findOffboarding(employeeId);
      if (employee.separation.status === OffboardingStatus.COMPLETED) {
        throw new InvalidStateError("A completed offboarding cannot be cancelled. Rehire the employee instead.");
      }
      const updated = await employeeRepository.update(employeeId, { rehireStatus: "", separation: null });
      await employeeDocumentUseCases.removeStageDocuments(employeeId, DocumentStage.OFFBOARDING);
      return view(updated);
    },

    /**
     * Brings back a rehireable employee. The offboarding, with the state of its documents, moves to
     * their history, and the checklist starts empty if they ever leave again.
     */
    async rehire(employeeId, administratorId) {
      const employee = await findOffboarding(employeeId);
      if (employee.separation.status !== OffboardingStatus.COMPLETED) {
        throw new InvalidStateError("Only an employee whose offboarding is completed can be rehired");
      }
      if (employee.rehireStatus !== RehireStatus.REHIREABLE) {
        throw new InvalidStateError("This employee is tagged non-rehireable and cannot be rehired");
      }

      const documents = await employeeDocumentUseCases.snapshotStageDocuments(employeeId, DocumentStage.OFFBOARDING);
      const updated = await employeeRepository.update(employeeId, {
        isActive: true,
        rehireStatus: "",
        separation: null,
        separationHistory: [
          ...employee.separationHistory,
          {
            ...employee.separation,
            rehireStatus: employee.rehireStatus,
            documents,
            rehiredBy: administratorId,
            rehiredAt: now(),
          },
        ],
      });
      await employeeDocumentUseCases.removeStageDocuments(employeeId, DocumentStage.OFFBOARDING);
      return view(updated);
    },
  };
};
