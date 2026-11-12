import express from "express";

/** Thin HTTP adapter: parse the request, call a use case, shape the response. */
export const createAdminRouter = ({ authUseCases }) => {
  const router = express.Router();

  // Called by the login/register pages on load to seed the first administrator.
  router.get("/", async (req, res) => {
    const { created } = await authUseCases.ensureAdministratorsExist();
    res.json({ message: created ? "Newly created!" : "Ready" });
  });

  router.post("/login", async (req, res) => {
    const { accessToken, refreshToken } = await authUseCases.login(req.body);
    res.status(200).json({
      message: "Login successful",
      token: accessToken,
      refreshToken,
    });
  });

  router.post("/refresh", async (req, res) => {
    const { accessToken, refreshToken } = await authUseCases.refreshSession(req.body);
    res.status(200).json({ token: accessToken, refreshToken });
  });

  router.post("/logout", async (req, res) => {
    await authUseCases.logout(req.body);
    res.status(204).end();
  });

  router.post("/register", async (req, res) => {
    const administrator = await authUseCases.register(req.body);
    res.status(200).json(administrator);
  });

  return router;
};
