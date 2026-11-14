import { NotFoundError, ValidationError } from "../../domain/errors.js";
import { normalizePageQuery, toPage } from "../../domain/pagination.js";
import {
  assertValidEmergencyContact,
  assertValidEmergencyContactEmployee,
  pickEmergencyContactFields,
} from "../../domain/employee/emergencyContactRules.js";

/**
 * @param {Object} deps
 * @param {import("../../domain/employee/EmergencyContactRepository").EmergencyContactRepository} deps.emergencyContactRepository
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 */
export const createEmergencyContactUseCases = ({ emergencyContactRepository, employeeRepository }) => {
  const getOrThrow = async (id) => {
    const contact = await emergencyContactRepository.findById(id);
    if (!contact) throw new NotFoundError("Emergency contact not found");
    return contact;
  };

  return {
    listEmergencyContacts: () => emergencyContactRepository.findAll(),

    async listEmergencyContactsPage(query) {
      const request = normalizePageQuery(query);
      return toPage(await emergencyContactRepository.findPage(request), request);
    },

    getEmergencyContact: getOrThrow,

    /** All emergency contacts of one employee. */
    async listForEmployee(employeeId) {
      if (!(await employeeRepository.findById(employeeId))) {
        throw new NotFoundError("Employee not found");
      }
      return emergencyContactRepository.findByEmployeeId(employeeId);
    },

    async addEmergencyContact(input = {}) {
      assertValidEmergencyContactEmployee(input);
      assertValidEmergencyContact(input);

      if (!(await employeeRepository.findById(input.employeeId))) {
        throw new ValidationError("That employee does not exist");
      }

      return emergencyContactRepository.create({
        employeeId: input.employeeId,
        ...pickEmergencyContactFields(input),
      });
    },

    /** The employee of a contact is fixed; to move a contact, delete it and add another. */
    async updateEmergencyContact(id, input = {}) {
      assertValidEmergencyContact(input);
      const contact = await emergencyContactRepository.update(id, pickEmergencyContactFields(input));
      if (!contact) throw new NotFoundError("Emergency contact not found");
      return contact;
    },

    async deleteEmergencyContact(id) {
      const removed = await emergencyContactRepository.remove(id);
      if (!removed) throw new NotFoundError("Emergency contact not found");
    },
  };
};
