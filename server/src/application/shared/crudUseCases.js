import { NotFoundError } from "../../domain/errors.js";

/**
 * The CRUD use cases shared by every entity. Per-entity use cases supply the
 * repository, the validation rule and the allowed fields.
 *
 * @param {Object} deps
 * @param {import("../../domain/Repository").Repository} deps.repository
 * @param {string} deps.entityName used in error messages
 * @param {(input: object) => void} deps.validate throws ValidationError when input is invalid
 * @param {(input: object) => object} deps.pickFields whitelist of writable fields
 */
export const createCrudUseCases = ({ repository, entityName, validate, pickFields }) => ({
  list: () => repository.findAll(),

  async get(id) {
    const entity = await repository.findById(id);
    if (!entity) throw new NotFoundError(`${entityName} not found`);
    return entity;
  },

  async add(input = {}) {
    validate(input);
    return repository.create(pickFields(input));
  },

  async update(id, input = {}) {
    validate(input);
    const entity = await repository.update(id, pickFields(input));
    if (!entity) throw new NotFoundError(`${entityName} not found`);
    return entity;
  },

  async remove(id) {
    const removed = await repository.remove(id);
    if (!removed) throw new NotFoundError(`${entityName} not found`);
  },
});
