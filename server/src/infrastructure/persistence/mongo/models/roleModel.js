import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const rolesSchema = createEntitySchema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ""
  }
});

export const RoleModel = mongoose.model("roles", rolesSchema);

const roleAssignmentsSchema = createEntitySchema({
  administratorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "administrators",
    required: true
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "roles",
    required: true
  }
});

// An administrator can hold a role only once.
roleAssignmentsSchema.index({ administratorId: 1, roleId: 1 }, { unique: true });

export const RoleAssignmentModel = mongoose.model("roleassignments", roleAssignmentsSchema);
