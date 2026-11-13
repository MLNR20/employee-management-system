import express from "express";

export const createDashboardRouter = ({ dashboardUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get("/summary", async (req, res) => {
    res.status(200).json(await dashboardUseCases.summary());
  });

  router.get("/attendance", async (req, res) => {
    const data = await dashboardUseCases.attendance({ days: req.query.days });
    res.status(200).json({ count: data.length, data });
  });

  return router;
};
