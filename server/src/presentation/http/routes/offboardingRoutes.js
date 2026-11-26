import express from "express";
import { toDto } from "./crudRouter.js";

const toView = ({ clearance, ...offboarding }) => ({
  ...offboarding,
  clearance: {
    ...clearance,
    heldItems: clearance.heldItems.map(toDto),
    directReports: clearance.directReports.map(toDto),
  },
});

/**
 * One employee's offboarding: how and when they leave, their rehire tag, and what is still outstanding.
 * Who started, completed or rehired is always the signed-in administrator, never taken from the body.
 * The offboarding document checklist itself is under /employee-documents/checklist/:id?stage=offboarding.
 */
export const createOffboardingRouter = ({ offboardingUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  const respond = (action) => async (req, res) => {
    res.status(200).json(toView(await action(req)));
  };
  const id = (req) => req.params.employeeId;

  router.get("/:employeeId", respond((req) => offboardingUseCases.getOffboarding(id(req))));
  router.post("/:employeeId", respond((req) => offboardingUseCases.start(id(req), req.body, req.user.id)));
  router.put("/:employeeId", respond((req) => offboardingUseCases.update(id(req), req.body, req.user.id)));
  router.delete("/:employeeId", respond((req) => offboardingUseCases.cancel(id(req))));
  router.post("/:employeeId/complete", respond((req) => offboardingUseCases.complete(id(req), req.body, req.user.id)));
  router.post("/:employeeId/rehire", respond((req) => offboardingUseCases.rehire(id(req), req.user.id)));

  return router;
};
