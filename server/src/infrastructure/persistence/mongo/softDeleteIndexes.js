import { EmployeeModel } from "./models/employeeModel.js";
import { EmployeeDocumentModel } from "./models/documentModels.js";
import { LeaveBalanceModel } from "./models/leaveModels.js";
import { JobApplicationModel } from "./models/jobApplicationModel.js";

/** The soft-deleting models that have a unique index. */
export const UNIQUE_SOFT_DELETE_MODELS = [EmployeeModel, EmployeeDocumentModel, LeaveBalanceModel, JobApplicationModel];

const keyList = (keys) => Object.keys(keys).join(",");

/**
 * Databases created before soft delete have unique indexes without `deletedAt`, which would let a
 * deleted document block a new one (an email could never be used again). This creates the new indexes
 * and then drops exactly the old ones they replace. Safe to run at every start-up.
 *
 * @param {Array<import("mongoose").Model>} [models]
 * @returns {Promise<string[]>} what was dropped, as "collection.index"
 */
export const replaceLegacyUniqueIndexes = async (models = UNIQUE_SOFT_DELETE_MODELS) => {
  const dropped = [];
  for (const model of models) {
    const replacements = model.schema
      .indexes()
      .filter(([keys, options]) => options?.unique && "deletedAt" in keys)
      .map(([keys]) => keyList(keys).replace(/,deletedAt$/, ""));
    if (replacements.length === 0) continue;

    await model.createIndexes(); // the new rule is in force before the old one goes
    for (const index of await model.collection.indexes()) {
      if (index.unique && replacements.includes(keyList(index.key))) {
        await model.collection.dropIndex(index.name);
        dropped.push(`${model.collection.collectionName}.${index.name}`);
      }
    }
  }
  return dropped;
};
