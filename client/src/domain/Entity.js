/**
 * Base class for every domain entity: identity, audit dates and an active flag.
 * Employee and Department inherit from it.
 */
export class Entity {
  constructor({ id, dateCreated, dateUpdated, isActive = true } = {}) {
    this.id = id;
    this.dateCreated = dateCreated;
    this.dateUpdated = dateUpdated;
    this.isActive = isActive;
  }
}

const toDate = (value) => (value ? new Date(value) : undefined);

/** Reads the base fields from an API payload (which names the id `_id`). */
export const baseProps = (raw = {}) => ({
  id: raw._id,
  dateCreated: toDate(raw.dateCreated),
  dateUpdated: toDate(raw.dateUpdated),
  isActive: raw.isActive,
});
