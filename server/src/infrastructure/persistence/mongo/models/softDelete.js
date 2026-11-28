// Soft delete: a deleted document stays in its collection with `deletedAt` set, and every ordinary
// query behaves as if it were not there. For employees and the records about them.
//
//   schema.plugin(softDeletePlugin)       before the model is compiled
//   Model.softDelete(filter)              instead of deleteOne / deleteMany
//   Model.find(filter).setOptions({ withDeleted: true })   to see deleted ones too
//
// Aggregations are not filtered: they have to match `deletedAt: null` themselves.
//
// A unique index on such a model must end in `deletedAt`, so that a deleted document does not stop a
// new one with the same values (see softDeleteIndexes.js for replacing the older indexes).

const FILTERED = ["countDocuments", "distinct", "find", "findOne", "findOneAndUpdate", "updateMany", "updateOne"];

function onlyLive() {
  if (this.getOptions().withDeleted) return;
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
}

export const softDeletePlugin = (schema) => {
  schema.add({ deletedAt: { type: Date, default: null } });
  for (const operation of FILTERED) schema.pre(operation, onlyLive);

  /** Marks every live document matching `filter` as deleted. */
  schema.statics.softDelete = function softDelete(filter) {
    return this.updateMany(filter, { $set: { deletedAt: new Date() } });
  };
};
