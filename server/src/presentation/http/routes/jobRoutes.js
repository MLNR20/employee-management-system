import express from "express";
import { createCrudRouter, toDto } from "./crudRouter.js";

/** Job postings: administrators create, edit, close and delete them. */
export const createJobRouter = ({ jobUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  return createCrudRouter({
    router,
    entityName: "Job",
    useCases: {
      list: jobUseCases.listJobs,
      listPage: jobUseCases.listJobsPage,
      get: jobUseCases.getJob,
      add: jobUseCases.addJob,
      update: jobUseCases.updateJob,
      remove: jobUseCases.deleteJob,
    },
  });
};

/**
 * Applications as administrators see them. They are filed by employees through the employee portal,
 * so here they can only be read, and moved to a new status with PUT /:id/status.
 */
export const createJobApplicationRouter = ({ jobApplicationUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get("/job/:jobId", async (req, res) => {
    const applications = await jobApplicationUseCases.listForJob(req.params.jobId);
    res.status(200).json({ count: applications.length, data: applications.map(toDto) });
  });

  router.put("/:id/status", async (req, res) => {
    const application = await jobApplicationUseCases.updateStatus(req.params.id, req.body?.status);
    res.status(200).json(toDto(application));
  });

  return createCrudRouter({
    router,
    entityName: "Job application",
    operations: ["list", "get"],
    useCases: {
      list: jobApplicationUseCases.listApplications,
      listPage: jobApplicationUseCases.listApplicationsPage,
      get: jobApplicationUseCases.getApplication,
    },
  });
};
