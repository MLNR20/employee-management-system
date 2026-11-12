// Composition root: the only place that picks concrete implementations.
import config from "./infrastructure/config/config.js";
import { MongoAdministratorRepository } from "./infrastructure/persistence/mongo/MongoAdministratorRepository.js";
import { MongoEmployeeRepository } from "./infrastructure/persistence/mongo/MongoEmployeeRepository.js";
import { MongoDepartmentRepository } from "./infrastructure/persistence/mongo/MongoDepartmentRepository.js";
import {
  MongoRoleRepository,
  MongoRoleAssignmentRepository,
} from "./infrastructure/persistence/mongo/MongoRoleRepository.js";
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
import {
  createRoleUseCases,
  createRoleAssignmentUseCases,
} from "./application/role/roleUseCases.js";
import { createLeaveTypeUseCases } from "./application/leave/leaveTypeUseCases.js";
import { createLeaveBalanceUseCases } from "./application/leave/leaveBalanceUseCases.js";
import { createLeaveRequestUseCases } from "./application/leave/leaveRequestUseCases.js";

const administratorRepository = new MongoAdministratorRepository();
const employeeRepository = new MongoEmployeeRepository();
const roleRepository = new MongoRoleRepository();
const roleAssignmentRepository = new MongoRoleAssignmentRepository();
const leaveTypeRepository = new MongoLeaveTypeRepository();
const leaveBalanceRepository = new MongoLeaveBalanceRepository();
const leaveRequestRepository = new MongoLeaveRequestRepository();
const leaveApprovalRepository = new MongoLeaveApprovalRepository();

export const authUseCases = createAuthUseCases({
  administratorRepository,
  passwordHasher: new BcryptPasswordHasher(),
  tokenService: new JwtTokenService({
    accessSecret: config.JWT_SECRET,
    refreshSecret: config.REFRESH_TOKEN_SECRET,
    accessTtl: config.ACCESS_TOKEN_TTL,
    refreshTtl: config.REFRESH_TOKEN_TTL,
  }),
  seedAdministrator: config.seedAdministrator,
});

export const administratorUseCases = createAdministratorUseCases({ administratorRepository });

export const employeeUseCases = createEmployeeUseCases({
  employeeRepository,
  leaveBalanceRepository,
  leaveRequestRepository,
});

export const departmentUseCases = createDepartmentUseCases({
  departmentRepository: new MongoDepartmentRepository(),
});

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

export const leaveRequestUseCases = createLeaveRequestUseCases({
  leaveRequestRepository,
  leaveApprovalRepository,
  leaveBalanceRepository,
  employeeRepository,
  leaveTypeRepository,
  administratorRepository,
});
