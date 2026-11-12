/**
 * CRUD use cases shared by every entity. They depend on the generic Repository
 * contract only.
 * @param {import("../../domain/Repository").Repository} repository
 */
export const createCrudUseCases = (repository) => ({
  list: () => repository.getAll(),
  listPage: (params) => repository.getPage(params),
  get: (id) => repository.getById(id),
  add: (data) => repository.create(data),
  update: (id, data) => repository.update(id, data),
  remove: (id) => repository.remove(id),
});
