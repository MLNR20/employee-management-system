import express from "express";

/** Wire format: the client expects `_id`, not `id`. */
export const toDto = ({ id, ...rest }) => ({ _id: id, ...rest });

/**
 * Standard REST routes for one entity, built on top of its use cases.
 *
 * @param {Object} options
 * @param {string} options.entityName used in response messages
 * @param {{list: Function, get: Function, add: Function, update: Function, remove: Function}} options.useCases
 * @param {(body: object) => object} [options.toInput] reshapes a request body before it reaches the use case
 * @param {express.Router} [options.router] reuse a router that already has extra routes registered
 * @param {Array<"create"|"list"|"get"|"update"|"delete">} [options.operations] routes to expose (default: all)
 */
export const createCrudRouter = ({
  entityName,
  useCases,
  toInput = (body) => body,
  router = express.Router(),
  operations = ["create", "list", "get", "update", "delete"],
}) => {
  const has = (operation) => operations.includes(operation);

  if (has("create")) {
    router.post("/", async (req, res) => {
      const entity = await useCases.add(toInput(req.body));
      res.status(200).json(toDto(entity));
    });
  }

  if (has("list")) {
    router.get("/", async (req, res) => {
      const entities = await useCases.list();
      res.status(200).json({ count: entities.length, data: entities.map(toDto) });
    });
  }

  if (has("get")) {
    router.get("/:id", async (req, res) => {
      const entity = await useCases.get(req.params.id);
      res.status(200).json(toDto(entity));
    });
  }

  if (has("update")) {
    router.put("/:id", async (req, res) => {
      await useCases.update(req.params.id, toInput(req.body));
      res.status(200).json({ message: `${entityName} is successfully updated!` });
    });
  }

  if (has("delete")) {
    router.delete("/:id", async (req, res) => {
      await useCases.remove(req.params.id);
      res.status(200).json({ message: `${entityName} is successfully deleted.` });
    });
  }

  return router;
};
