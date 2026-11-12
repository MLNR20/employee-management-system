import { createCrudUseCases } from "../shared/crudUseCases.js";
import { RoleInUseError, ValidationError } from "../../domain/errors.js";
import { assertValidRole, pickRoleFields } from "../../domain/role/roleRules.js";
import {
  assertValidRoleAssignment,
  pickRoleAssignmentFields,
} from "../../domain/role/roleAssignmentRules.js";

/** @param {{roleRepository: import("../../domain/role/RoleRepository").RoleRepository, roleAssignmentRepository: import("../../domain/role/RoleAssignmentRepository").RoleAssignmentRepository}} deps */
export const createRoleUseCases = ({ roleRepository, roleAssignmentRepository }) => {
  const crud = createCrudUseCases({
    repository: roleRepository,
    entityName: "Role",
    validate: assertValidRole,
    pickFields: pickRoleFields,
  });

  return {
    listRoles: crud.list,
    listRolesPage: crud.listPage,
    getRole: crud.get,
    addRole: crud.add,
    updateRole: crud.update,

    /** A role someone still holds cannot be deleted; that would leave dangling assignments. */
    async deleteRole(id) {
      if (await roleAssignmentRepository.existsForRole(id)) throw new RoleInUseError();
      return crud.remove(id);
    },
  };
};

/**
 * Role assignments link an administrator to a role. They are created and
 * deleted, never edited: to change a role, remove the assignment and add another.
 */
export const createRoleAssignmentUseCases = ({
  roleAssignmentRepository,
  roleRepository,
  administratorRepository,
}) => {
  const crud = createCrudUseCases({
    repository: roleAssignmentRepository,
    entityName: "Role assignment",
    validate: assertValidRoleAssignment,
    pickFields: pickRoleAssignmentFields,
  });

  return {
    listRoleAssignments: crud.list,
    listRoleAssignmentsPage: crud.listPage,
    getRoleAssignment: crud.get,
    deleteRoleAssignment: crud.remove,

    async assignRole(input = {}) {
      assertValidRoleAssignment(input);

      if (!(await administratorRepository.findById(input.administratorId))) {
        throw new ValidationError("That administrator does not exist");
      }
      if (!(await roleRepository.findById(input.roleId))) {
        throw new ValidationError("That role does not exist");
      }

      return crud.add(input);
    },
  };
};
