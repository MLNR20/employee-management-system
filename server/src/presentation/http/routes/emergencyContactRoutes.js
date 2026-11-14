import express from "express";
import { createCrudRouter } from "./crudRouter.js";
import { validateEmergencyContactNames } from "../validation/personName.js";

export const createEmergencyContactRouter = ({ emergencyContactUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  // Checked before the CRUD handlers: names are letters only, at least 2 characters.
  router.post("/", validateEmergencyContactNames);
  router.put("/:id", validateEmergencyContactNames);

  return createCrudRouter({
    router,
    entityName: "Emergency contact",
    useCases: {
      list: emergencyContactUseCases.listEmergencyContacts,
      listPage: emergencyContactUseCases.listEmergencyContactsPage,
      get: emergencyContactUseCases.getEmergencyContact,
      add: emergencyContactUseCases.addEmergencyContact,
      update: emergencyContactUseCases.updateEmergencyContact,
      remove: emergencyContactUseCases.deleteEmergencyContact,
    },
  });
};
