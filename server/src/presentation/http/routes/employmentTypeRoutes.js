import express from "express";
import { createCrudRouter } from "./crudRouter.js";

export const createEmploymentTypeRouter = ({ employmentTypeUseCases, requireAuth }) => {
  const router = express.Router();

  router.use(requireAuth);

  return createCrudRouter({
    router,
    entityName: "Employment type",
    useCases: {
      list: employmentTypeUseCases.listEmploymentTypes,
      listPage: employmentTypeUseCases.listEmploymentTypesPage,
      get: employmentTypeUseCases.getEmploymentType,
      add: employmentTypeUseCases.addEmploymentType,
      update: employmentTypeUseCases.updateEmploymentType,
      remove: employmentTypeUseCases.deleteEmploymentType,
    },
  });
};
