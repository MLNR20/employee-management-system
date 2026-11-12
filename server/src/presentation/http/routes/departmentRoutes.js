import express from "express";
import { createCrudRouter } from "./crudRouter.js";

export const createDepartmentRouter = ({ departmentUseCases, requireAuth }) => {
  const router = express.Router();

  router.use(requireAuth);

  return createCrudRouter({
    router,
    entityName: "Department",
    useCases: {
      list: departmentUseCases.listDepartments,
      listPage: departmentUseCases.listDepartmentsPage,
      get: departmentUseCases.getDepartment,
      add: departmentUseCases.addDepartment,
      update: departmentUseCases.updateDepartment,
      remove: departmentUseCases.deleteDepartment,
    },
  });
};
