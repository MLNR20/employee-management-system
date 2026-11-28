import express from "express";
import { createCrudRouter, toDto } from "./crudRouter.js";
import { ValidationError } from "../../../domain/errors.js";
import { DEFAULT_FILE_LIMITS, inMegabytes } from "../../../domain/document/fileLimits.js";

/**
 * Reads an upload: the request body itself, whatever type it claims (the use case checks the content).
 * A body over the limit is refused without being read into memory.
 */
const createUploadReader = (maxBytes) => {
  const rawBody = express.raw({ type: () => true, limit: maxBytes });
  return (req, res, next) =>
    rawBody(req, res, (error) =>
      next(
        error?.type === "entity.too.large"
          ? new ValidationError(`The file is larger than ${inMegabytes(maxBytes)}`)
          : error
      )
    );
};

/** The lines of the checklists: the documents collected when an employee joins or leaves. */
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
  const readUpload = createUploadReader(
    employeeDocumentUseCases.fileLimits?.maxFileBytes ?? DEFAULT_FILE_LIMITS.maxFileBytes
  );

  // Registered before the CRUD routes so "checklist" is not read as a document id.
  router.get("/checklist/:employeeId", async (req, res) => {
    const { employeeId, stage, items, summary, files } = await employeeDocumentUseCases.checklist(
      req.params.employeeId,
      req.query.stage // "onboarding" (default) or "offboarding"
    );
    res.status(200).json({
      employeeId,
      stage,
      summary,
      files,
      data: items.map(({ requirement, document, state }) => ({
        requirement: toDto(requirement),
        document: document ? toDto(document) : null,
        state,
      })),
    });
  });

  // Always sent as a download, and never guessed to be anything other than the checked type.
  router.get("/files/:fileId", async (req, res) => {
    const file = await employeeDocumentUseCases.getFile(req.params.fileId);
    res.set({
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, "%27")}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });
    res.status(200).send(file.data);
  });

  // PUT the file's bytes; ?name= gives its name.
  router.put("/:id/file", readUpload, async (req, res) => {
    const upload = { name: req.query.name, data: req.body };
    res.status(200).json(toDto(await employeeDocumentUseCases.attachFile(req.params.id, upload, req.user.id)));
  });

  router.delete("/:id/file", async (req, res) => {
    res.status(200).json(toDto(await employeeDocumentUseCases.removeFile(req.params.id)));
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
