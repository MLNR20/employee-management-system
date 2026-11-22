import express from "express";
import { toDto } from "./crudRouter.js";

/**
 * The navbar bell's API. Notifications are shared by every administrator: reading one marks it read for all.
 * Routes with fixed names come before "/:id" so they are not taken for an id.
 */
export const createNotificationRouter = ({ notificationUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get("/", async (req, res) => {
    const { items, total, page, pageSize, totalPages } = await notificationUseCases.listNotificationsPage(req.query);
    res.status(200).json({ count: total, data: items.map(toDto), page, pageSize, totalPages });
  });

  router.get("/unread-count", async (req, res) => {
    res.status(200).json({ count: await notificationUseCases.countUnread() });
  });

  router.post("/", async (req, res) => {
    const { title, subtitle, body } = req.body ?? {};
    const notification = await notificationUseCases.createNotification({ title, subtitle, body });
    res.status(201).json(toDto(notification));
  });

  router.post("/read-all", async (req, res) => {
    res.status(200).json({ updated: await notificationUseCases.markAllAsRead() });
  });

  router.patch("/:id/read", async (req, res) => {
    res.status(200).json(toDto(await notificationUseCases.markAsRead(req.params.id)));
  });

  return router;
};
