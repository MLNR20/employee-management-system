import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { Role } from "../../../domain/role/Role.js";
import { RoleAssignment } from "../../../domain/role/RoleAssignment.js";
import { DuplicateRoleError, DuplicateRoleAssignmentError } from "../../../domain/errors.js";
import { RoleModel, RoleAssignmentModel } from "./models/roleModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toRole = (doc) =>
  new Role({
    ...toBaseProps(doc),
    name: doc.name,
    description: doc.description,
  });

const toRoleAssignment = (doc) =>
  new RoleAssignment({
    ...toBaseProps(doc),
    administratorId: String(doc.administratorId),
    roleId: String(doc.roleId),
  });

export class MongoRoleRepository extends MongoRepository {
  constructor() {
    super({
      model: RoleModel,
      toEntity: toRole,
      duplicateError: () => new DuplicateRoleError(),
    });
  }
}

export class MongoRoleAssignmentRepository extends MongoRepository {
  constructor() {
    super({
      model: RoleAssignmentModel,
      toEntity: toRoleAssignment,
      duplicateError: () => new DuplicateRoleAssignmentError(),
    });
  }

  async existsForRole(roleId) {
    if (!mongoose.isValidObjectId(roleId)) return false;
    return Boolean(await RoleAssignmentModel.exists({ roleId }));
  }
}
