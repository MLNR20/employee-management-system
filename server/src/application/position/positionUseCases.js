import { createCrudUseCases } from "../shared/crudUseCases.js";
import { ValidationError } from "../../domain/errors.js";
import { assertValidPosition, pickPositionFields } from "../../domain/position/positionRules.js";
import { DEFAULT_ORGANIZATION } from "../../domain/department/defaultOrganization.js";

/**
 * The positions offered in each department. A title is unique within its department.
 *
 * @param {Object} deps
 * @param {import("../../domain/position/PositionRepository").PositionRepository} deps.positionRepository
 * @param {import("../../domain/department/DepartmentRepository").DepartmentRepository} deps.departmentRepository
 */
export const createPositionUseCases = ({ positionRepository, departmentRepository }) => {
  const crud = createCrudUseCases({
    repository: positionRepository,
    entityName: "Position",
    validate: assertValidPosition,
    pickFields: pickPositionFields,
  });

  const assertDepartmentExists = async (departmentId) => {
    if (!(await departmentRepository.findById(departmentId))) {
      throw new ValidationError("That department does not exist");
    }
  };

  return {
    listPositions: crud.list,
    listPositionsPage: crud.listPage,
    getPosition: crud.get,
    deletePosition: crud.remove,

    async addPosition(input = {}) {
      assertValidPosition(input);
      await assertDepartmentExists(input.departmentId);
      return crud.add(input);
    },

    async updatePosition(id, input = {}) {
      assertValidPosition(input);
      await assertDepartmentExists(input.departmentId);
      return crud.update(id, input);
    },

    /**
     * Fills an empty organization: the standard departments when there are none, and the standard
     * positions of those departments (matched by name) when there are no positions.
     */
    async ensureDefaultOrganization() {
      const created = { departments: 0, positions: 0 };
      if ((await departmentRepository.findAll()).length === 0) {
        for (const { positions, ...department } of DEFAULT_ORGANIZATION) {
          await departmentRepository.create(department);
          created.departments++;
        }
      }
      if ((await positionRepository.findAll()).length > 0) return created;

      const departments = await departmentRepository.findAll();
      for (const { name, positions } of DEFAULT_ORGANIZATION) {
        const department = departments.find((d) => d.name.toLowerCase() === name.toLowerCase());
        if (!department) continue;
        for (const position of positions) {
          await positionRepository.create({ name: position, departmentId: department.id });
          created.positions++;
        }
      }
      return created;
    },
  };
};
