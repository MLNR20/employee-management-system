import { InvalidStateError, NotFoundError, ValidationError } from "../../domain/errors.js";

/**
 * Employees borrowing company equipment. An item that is available can be borrowed; borrowing
 * marks it "in_use" and records who holds it, so it drops out of everyone else's list until it
 * is returned. Each borrow and return is also kept as a Borrowing record.
 *
 * @param {Object} deps
 * @param {import("../../domain/inventory/ItemRepository").ItemRepository} deps.itemRepository
 * @param {import("../../domain/inventory/BorrowingRepository").BorrowingRepository} deps.borrowingRepository
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 */
export const createBorrowingUseCases = ({ itemRepository, borrowingRepository, employeeRepository }) => {
  const assertActiveEmployee = async (employeeId) => {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee || employee.isActive === false) throw new NotFoundError("Employee not found");
  };

  return {
    /** What this employee can borrow now, and what they hold. Items held by others are not in either. */
    async listForEmployee(employeeId) {
      await assertActiveEmployee(employeeId);
      const [available, borrowed] = await Promise.all([
        itemRepository.findAvailable(),
        itemRepository.findHeldBy(employeeId),
      ]);
      return { available, borrowed };
    },

    /** The employee's borrowing history, newest first. */
    async listHistory(employeeId) {
      await assertActiveEmployee(employeeId);
      return borrowingRepository.findByEmployeeId(employeeId);
    },

    async borrow(employeeId, itemId) {
      if (typeof itemId !== "string" || itemId === "") throw new ValidationError("Send the itemId to borrow");
      await assertActiveEmployee(employeeId);

      const item = await itemRepository.claim(itemId, employeeId);
      if (!item) {
        // Someone else got there first, or it is under maintenance or retired. Say what we know.
        if (!(await itemRepository.findById(itemId))) throw new NotFoundError("Item not found");
        throw new InvalidStateError("That item is not available to borrow");
      }

      try {
        await borrowingRepository.create({ itemId, employeeId, borrowedAt: new Date() });
      } catch (error) {
        await itemRepository.release(itemId, employeeId); // do not leave it held with no record
        throw error;
      }
      return item;
    },

    /** Returns an item the employee holds. An item held by someone else is reported as not found. */
    async giveBack(employeeId, itemId) {
      await assertActiveEmployee(employeeId);

      const item = await itemRepository.release(itemId, employeeId);
      if (!item) throw new NotFoundError("You are not borrowing that item");

      await borrowingRepository.markReturned(itemId, employeeId);
      return item;
    },
  };
};
