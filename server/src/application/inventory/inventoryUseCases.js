import { createCrudUseCases } from "../shared/crudUseCases.js";
import { ValidationError } from "../../domain/errors.js";
import { assertValidItem, pickItemFields } from "../../domain/inventory/itemRules.js";

/**
 * @param {Object} deps
 * @param {import("../../domain/inventory/ItemRepository").ItemRepository} deps.itemRepository
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 */
export const createInventoryUseCases = ({ itemRepository, employeeRepository }) => {
  const crud = createCrudUseCases({
    repository: itemRepository,
    entityName: "Inventory item",
    validate: assertValidItem,
    pickFields: pickItemFields,
  });

  /** An item can only be handed to an employee who exists. */
  const assertAssigneeExists = async ({ assignedEmployeeId } = {}) => {
    if (assignedEmployeeId && !(await employeeRepository.findById(assignedEmployeeId))) {
      throw new ValidationError("That employee does not exist");
    }
  };

  return {
    listItems: crud.list,
    listItemsPage: crud.listPage,
    getItem: crud.get,

    async addItem(input = {}) {
      assertValidItem(input);
      await assertAssigneeExists(input);
      return crud.add(input);
    },

    async updateItem(id, input = {}) {
      assertValidItem(input);
      await assertAssigneeExists(input);
      return crud.update(id, input);
    },

    deleteItem: crud.remove,
  };
};
