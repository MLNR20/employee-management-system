import express from "express";
import { createCrudRouter } from "./crudRouter.js";

/** The positions offered in each department. */
export const createPositionRouter = ({ positionUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  return createCrudRouter({
    router,
    entityName: "Position",
    useCases: {
      list: positionUseCases.listPositions,
      listPage: positionUseCases.listPositionsPage,
      get: positionUseCases.getPosition,
      add: positionUseCases.addPosition,
      update: positionUseCases.updatePosition,
      remove: positionUseCases.deletePosition,
    },
  });
};
