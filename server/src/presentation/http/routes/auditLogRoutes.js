import express from "express";
import { createCrudRouter } from "./crudRouter.js";

/** Audit logs are read-only over HTTP: list (paged) and get one. No create, update or delete routes exist. */
export const createAuditLogRouter = ({ auditLogUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  return createCrudRouter({
    router,
    entityName: "Audit log",
    operations: ["list", "get"],
    useCases: {
      list: auditLogUseCases.listAuditLogs,
      listPage: auditLogUseCases.listAuditLogsPage,
      get: auditLogUseCases.getAuditLog,
    },
  });
};
