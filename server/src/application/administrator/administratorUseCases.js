import { toPublicAdministrator } from "../../domain/administrator/Administrator.js";

/** Read-only view of administrators, e.g. to pick one when assigning a role. */
export const createAdministratorUseCases = ({ administratorRepository }) => ({
  async listAdministrators() {
    const administrators = await administratorRepository.findAll();
    return administrators.map(toPublicAdministrator);
  },
});
