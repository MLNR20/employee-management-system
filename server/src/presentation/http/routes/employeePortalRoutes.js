import express from "express";

/** POST /employee-auth/login: email and portal password in, an employee access token out. */
export const createEmployeeAuthRouter = ({ employeeAuthUseCases }) => {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    const { accessToken } = await employeeAuthUseCases.login(req.body);
    res.status(200).json({ message: "Login successful", token: accessToken });
  });

  return router;
};

/** What the signed-in employee may see about themselves. Everything here needs an employee token. */
export const createEmployeePortalRouter = ({ employeeUseCases, requireEmployeeAuth }) => {
  const router = express.Router();
  router.use(requireEmployeeAuth);

  router.get("/me", async (req, res) => {
    const employee = await employeeUseCases.getEmployee(req.user.id);
    const { id, first_name, last_name, email, position, department } = employee;
    res.status(200).json({ _id: id, first_name, last_name, email, position, department });
  });

  return router;
};
