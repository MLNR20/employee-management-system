import express from "express";
import { createCrudRouter } from "./crudRouter.js";

export const createInventoryRouter = ({ inventoryUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  return createCrudRouter({
    router,
    entityName: "Inventory item",
    useCases: {
      list: inventoryUseCases.listItems,
      listPage: inventoryUseCases.listItemsPage,
      get: inventoryUseCases.getItem,
      add: inventoryUseCases.addItem,
      update: inventoryUseCases.updateItem,
      remove: inventoryUseCases.deleteItem,
    },
  });
};
