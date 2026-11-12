import mongoose from "mongoose";

/**
 * Creates a schema carrying the fields every Entity has: the active flag and
 * the audit dates (stored as createdAt/updatedAt, exposed as dateCreated/dateUpdated).
 */
export const createEntitySchema = (definition, options = {}) =>
  new mongoose.Schema(
    {
      ...definition,
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true, ...options }
  );

/** Maps the base fields of a stored document onto the domain Entity's props. */
export const toBaseProps = (doc) => ({
  id: String(doc._id),
  dateCreated: doc.createdAt,
  dateUpdated: doc.updatedAt,
  isActive: doc.isActive, // undefined on documents saved before the flag existed: Entity defaults it to true
});
