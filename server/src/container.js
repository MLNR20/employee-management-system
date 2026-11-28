// Composition root: the only place that picks concrete implementations.
import config from "./infrastructure/config/config.js";
import { MongoAdministratorRepository } from "./infrastructure/persistence/mongo/MongoAdministratorRepository.js";
import { MongoEmployeeRepository } from "./infrastructure/persistence/mongo/MongoEmployeeRepository.js";
import { MongoDepartmentRepository } from "./infrastructure/persistence/mongo/MongoDepartmentRepository.js";
import {
  MongoRoleRepository,
  MongoRoleAssignmentRepository,
} from "./infrastructure/persistence/mongo/MongoRoleRepository.js";
import { MongoInventoryRepository } from "./infrastructure/persistence/mongo/MongoInventoryRepository.js";
import { MongoAuditLogRepository } from "./infrastructure/persistence/mongo/MongoAuditLogRepository.js";
import { MongoNotificationRepository } from "./infrastructure/persistence/mongo/MongoNotificationRepository.js";
import { SocketIoNotificationPublisher } from "./infrastructure/realtime/SocketIoNotificationPublisher.js";
import { MongoLeaveTypeRepository } from "./infrastructure/persistence/mongo/MongoLeaveTypeRepository.js";
import {
  MongoLeaveBalanceRepository,
  MongoLeaveRequestRepository,
  MongoLeaveApprovalRepository,
} from "./infrastructure/persistence/mongo/MongoLeaveRepositories.js";
import { BcryptPasswordHasher } from "./infrastructure/security/BcryptPasswordHasher.js";
import { JwtTokenService } from "./infrastructure/security/JwtTokenService.js";
import { createAuthUseCases } from "./application/auth/authUseCases.js";
import { createAdministratorUseCases } from "./application/administrator/administratorUseCases.js";
import { createEmployeeUseCases } from "./application/employee/employeeUseCases.js";
import { createDepartmentUseCases } from "./application/department/departmentUseCases.js";
import { createEmploymentTypeUseCases } from "./application/employmentType/employmentTypeUseCases.js";
import { MongoEmploymentTypeRepository } from "./infrastructure/persistence/mongo/MongoEmploymentTypeRepository.js";
import {
  createRoleUseCases,
  createRoleAssignmentUseCases,
} from "./application/role/roleUseCases.js";
import { createLeaveTypeUseCases } from "./application/leave/leaveTypeUseCases.js";
import { createLeaveBalanceUseCases } from "./application/leave/leaveBalanceUseCases.js";
import { createLeaveRequestUseCases } from "./application/leave/leaveRequestUseCases.js";
import { createInventoryUseCases } from "./application/inventory/inventoryUseCases.js";
import { createBorrowingUseCases } from "./application/inventory/borrowingUseCases.js";
import { MongoBorrowingRepository } from "./infrastructure/persistence/mongo/MongoBorrowingRepository.js";
import { createDashboardUseCases } from "./application/dashboard/dashboardUseCases.js";
import { createEmployeeAuthUseCases } from "./application/employee/employeeAuthUseCases.js";
import { createAuditLogUseCases } from "./application/audit/auditLogUseCases.js";
import { createNotificationUseCases } from "./application/notification/notificationUseCases.js";
import { createEmergencyContactUseCases } from "./application/employee/emergencyContactUseCases.js";
import { MongoEmergencyContactRepository } from "./infrastructure/persistence/mongo/MongoEmergencyContactRepository.js";
import { createAttendanceUseCases } from "./application/attendance/attendanceUseCases.js";
import { MongoAttendanceRepository } from "./infrastructure/persistence/mongo/MongoAttendanceRepository.js";
import { createSalaryRateUseCases } from "./application/salary/salaryRateUseCases.js";
import { createPayrollUseCases } from "./application/payroll/payrollUseCases.js";
import { MongoSalaryRateRepository } from "./infrastructure/persistence/mongo/MongoSalaryRateRepository.js";
import { createAuthorizationUseCases } from "./application/role/authorizationUseCases.js";
import { createAccessUseCases } from "./application/role/accessUseCases.js";
import { createJobUseCases } from "./application/job/jobUseCases.js";
import { createJobApplicationUseCases } from "./application/job/jobApplicationUseCases.js";
import { MongoJobRepository } from "./infrastructure/persistence/mongo/MongoJobRepository.js";
import { MongoJobApplicationRepository } from "./infrastructure/persistence/mongo/MongoJobApplicationRepository.js";
import { createWorkShiftUseCases } from "./application/shift/workShiftUseCases.js";
import { createShiftAssignmentUseCases } from "./application/shift/shiftAssignmentUseCases.js";
import { MongoWorkShiftRepository, MongoShiftAssignmentRepository } from "./infrastructure/persistence/mongo/MongoShiftRepositories.js";
import { createOffboardingUseCases } from "./application/employee/offboardingUseCases.js";
import { createPositionUseCases } from "./application/position/positionUseCases.js";
import { MongoPositionRepository } from "./infrastructure/persistence/mongo/MongoPositionRepository.js";
import { createPayrollDeductionUseCases } from "./application/payroll/deductionUseCases.js";
import { MongoPayrollDeductionRepository } from "./infrastructure/persistence/mongo/MongoPayrollDeductionRepository.js";
import { createDocumentRequirementUseCases, createEmployeeDocumentUseCases } from "./application/document/documentUseCases.js";
import {
  MongoDocumentFileRepository,
  MongoDocumentRequirementRepository,
  MongoEmployeeDocumentRepository,
} from "./infrastructure/persistence/mongo/MongoDocumentRepositories.js";

const administratorRepository = new MongoAdministratorRepository();
const employeeRepository = new MongoEmployeeRepository();
const roleRepository = new MongoRoleRepository();
const roleAssignmentRepository = new MongoRoleAssignmentRepository();
const leaveTypeRepository = new MongoLeaveTypeRepository();
const leaveBalanceRepository = new MongoLeaveBalanceRepository();
const leaveRequestRepository = new MongoLeaveRequestRepository();
const leaveApprovalRepository = new MongoLeaveApprovalRepository();
const itemRepository = new MongoInventoryRepository();
const emergencyContactRepository = new MongoEmergencyContactRepository();
const passwordHasher = new BcryptPasswordHasher();

export const authorizationUseCases = createAuthorizationUseCases({ roleAssignmentRepository, roleRepository });

export const accessUseCases = createAccessUseCases({
  administratorRepository,
  roleRepository,
  roleAssignmentRepository,
  authorizationUseCases,
  preferred: config.seedAdministrator,
});

export const authUseCases = createAuthUseCases({
  administratorRepository,
  passwordHasher,
  accessResolver: authorizationUseCases,
  tokenService: new JwtTokenService({
    accessSecret: config.JWT_SECRET,
    refreshSecret: config.REFRESH_TOKEN_SECRET,
    accessTtl: config.ACCESS_TOKEN_TTL,
    refreshTtl: config.REFRESH_TOKEN_TTL,
  }),
  seedAdministrator: config.seedAdministrator,
  onSeeded: () => accessUseCases.ensureAccessManager(),
});

export const administratorUseCases = createAdministratorUseCases({ administratorRepository, passwordHasher });

const salaryRateRepository = new MongoSalaryRateRepository();

export const salaryRateUseCases = createSalaryRateUseCases({ salaryRateRepository, employeeRepository });

const workShiftRepository = new MongoWorkShiftRepository();
const shiftAssignmentRepository = new MongoShiftAssignmentRepository();
const utcOffsetMinutes = config.WORK_UTC_OFFSET_MINUTES;

export const workShiftUseCases = createWorkShiftUseCases({ workShiftRepository });

export const shiftAssignmentUseCases = createShiftAssignmentUseCases({
  shiftAssignmentRepository,
  workShiftRepository,
  employeeRepository,
  utcOffsetMinutes,
});

const attendanceRepository = new MongoAttendanceRepository();

export const attendanceUseCases = createAttendanceUseCases({
  attendanceRepository,
  employeeRepository,
  salaryRateRepository,
  shiftLookup: shiftAssignmentUseCases,
  utcOffsetMinutes,
});

const payrollDeductionRepository = new MongoPayrollDeductionRepository();

export const payrollDeductionUseCases = createPayrollDeductionUseCases({ payrollDeductionRepository });

export const payrollUseCases = createPayrollUseCases({
  employeeRepository,
  attendanceRepository,
  salaryRateRepository,
  payrollDeductionRepository,
  leaveBalanceRepository,
  leaveTypeRepository,
});

const documentRequirementRepository = new MongoDocumentRequirementRepository();
const employeeDocumentRepository = new MongoEmployeeDocumentRepository();
const documentFileRepository = new MongoDocumentFileRepository();
const borrowingRepository = new MongoBorrowingRepository();
const jobApplicationRepository = new MongoJobApplicationRepository();
const notificationRepository = new MongoNotificationRepository();

export const documentRequirementUseCases = createDocumentRequirementUseCases({
  documentRequirementRepository,
  employeeDocumentRepository,
});

export const employeeDocumentUseCases = createEmployeeDocumentUseCases({
  employeeDocumentRepository,
  documentRequirementRepository,
  documentFileRepository,
  fileLimits: config.DOCUMENT_FILE_LIMITS,
  employeeRepository,
  utcOffsetMinutes,
});

export const offboardingUseCases = createOffboardingUseCases({
  employeeRepository,
  employeeDocumentUseCases,
  itemRepository,
  leaveRequestRepository,
  utcOffsetMinutes,
});

const employmentTypeRepository = new MongoEmploymentTypeRepository();

export const employeeUseCases = createEmployeeUseCases({
  employeeRepository,
  leaveBalanceRepository,
  leaveRequestRepository,
  itemRepository,
  emergencyContactRepository,
  employmentTypeRepository,
  attendanceRepository,
  salaryRateRepository,
  borrowingRepository,
  employeeRecords: [
    shiftAssignmentRepository,
    employeeDocumentRepository,
    documentFileRepository,
    jobApplicationRepository,
    notificationRepository,
  ],
  passwordHasher,
});

export const employmentTypeUseCases = createEmploymentTypeUseCases({ employmentTypeRepository });

export const emergencyContactUseCases = createEmergencyContactUseCases({
  emergencyContactRepository,
  employeeRepository,
});

const departmentRepository = new MongoDepartmentRepository();
const positionRepository = new MongoPositionRepository();

export const departmentUseCases = createDepartmentUseCases({ departmentRepository, positionRepository });

export const positionUseCases = createPositionUseCases({ positionRepository, departmentRepository });

export const roleUseCases = createRoleUseCases({ roleRepository, roleAssignmentRepository });

export const roleAssignmentUseCases = createRoleAssignmentUseCases({
  roleAssignmentRepository,
  roleRepository,
  administratorRepository,
});

export const leaveTypeUseCases = createLeaveTypeUseCases({
  leaveTypeRepository,
  leaveBalanceRepository,
  leaveRequestRepository,
});

export const leaveBalanceUseCases = createLeaveBalanceUseCases({
  leaveBalanceRepository,
  employeeRepository,
  leaveTypeRepository,
});

// index.js attaches the Socket.IO server to this once the HTTP server exists.
export const notificationPublisher = new SocketIoNotificationPublisher();
export const notificationUseCases = createNotificationUseCases({
  notificationRepository,
  notificationPublisher,
});

export const leaveRequestUseCases = createLeaveRequestUseCases({
  leaveRequestRepository,
  leaveApprovalRepository,
  leaveBalanceRepository,
  employeeRepository,
  leaveTypeRepository,
  administratorRepository,
  notificationUseCases,
});

export const auditLogUseCases = createAuditLogUseCases({
  auditLogRepository: new MongoAuditLogRepository(),
});

export const inventoryUseCases = createInventoryUseCases({ itemRepository, employeeRepository });

export const dashboardUseCases = createDashboardUseCases({ employeeRepository, leaveRequestRepository });

export const borrowingUseCases = createBorrowingUseCases({
  itemRepository,
  borrowingRepository,
  employeeRepository,
});

const jobRepository = new MongoJobRepository();

export const jobUseCases = createJobUseCases({ jobRepository, jobApplicationRepository });

export const jobApplicationUseCases = createJobApplicationUseCases({
  jobApplicationRepository,
  jobRepository,
  employeeRepository,
});

export const employeeAuthUseCases =createEmployeeAuthUseCases({
  employeeRepository,
  passwordHasher,
  tokenService: new JwtTokenService({
    accessSecret: config.EMPLOYEE_JWT_SECRET,
    refreshSecret: config.EMPLOYEE_JWT_SECRET, // unused: the portal has no refresh tokens
    accessTtl: config.EMPLOYEE_TOKEN_TTL,
    refreshTtl: config.EMPLOYEE_TOKEN_TTL,
  }),
});
