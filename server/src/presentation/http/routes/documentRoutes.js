import express from "express";
import { createCrudRouter, toDto } from "./crudRouter.js";

/** The onboarding checklist itself: the documents every new hire must hand in. */
export const createDocumentRequirementRouter = ({ documentRequirementUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  return createCrudRouter({
    router,
    entityName: "Document requirement",
    useCases: {
      list: documentRequirementUseCases.listRequirements,
      listPage: documentRequirementUseCases.listRequirementsPage,
      get: documentRequirementUseCases.getRequirement,
      add: documentRequirementUseCases.addRequirement,
      update: documentRequirementUseCases.updateRequirement,
      remove: documentRequirementUseCases.deleteRequirement,
    },
  });
};

/**
 * What each employee has handed in, plus their checklist. Verifying or rejecting records the signed-in
 * administrator as the reviewer, never someone named in the body.
 */
export const createEmployeeDocumentRouter = ({ employeeDocumentUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  // Registered before the CRUD routes so "checklist" is not read as a document id.
  router.get("/checklist/:employeeId", async (req, res) => {
    const { employeeId, items, summary } = await employeeDocumentUseCases.checklist(req.params.employeeId);
    res.status(200).json({
      employeeId,
      summary,
      data: items.map(({ requirement, document, state }) => ({
        requirement: toDto(requirement),
        document: document ? toDto(document) : null,
        state,
      })),
    });
  });

  router.post("/:id/verify", async (req, res) => {
    res.status(200).json(toDto(await employeeDocumentUseCases.verifyDocument(req.params.id, req.user.id)));
  });

  router.post("/:id/reject", async (req, res) => {
    const document = await employeeDocumentUseCases.rejectDocument(req.params.id, req.user.id, req.body?.remarks);
    res.status(200).json(toDto(document));
  });

  return createCrudRouter({
    router,
    entityName: "Employee document",
    useCases: {
      list: employeeDocumentUseCases.listEmployeeDocuments,
      listPage: employeeDocumentUseCases.listEmployeeDocumentsPage,
      get: employeeDocumentUseCases.getEmployeeDocument,
      add: employeeDocumentUseCases.addEmployeeDocument,
      update: employeeDocumentUseCases.updateEmployeeDocument,
      remove: employeeDocumentUseCases.deleteEmployeeDocument,
    },
  });
};
