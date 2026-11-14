import express from "express";
import { createCrudRouter, toDto } from "./crudRouter.js";

const RATE_FIELD = "hourlyRate";

/** A copy of an attendance response with the hourly rate removed, whether it is one record, a list or a page. */
const withoutRates = (body) => {
  if (Array.isArray(body)) return body.map(withoutRates);
  if (!body || typeof body !== "object") return body;
  const { [RATE_FIELD]: hidden, ...rest } = body;
  return Array.isArray(rest.data) ? { ...rest, data: rest.data.map(withoutRates) } : rest;
};

/**
 * Attendance records. The clock actions take the employee in the body; the standard routes let an
 * administrator list, enter, correct and delete records. All require a signed-in administrator.
 *
 * The hourly rate is salary information: it only appears in responses for administrators for whom
 * `canViewRates(req)` is true (HR, via "salary-rates:view"). Without that check nobody sees it.
 */
export const createAttendanceRouter = ({ attendanceUseCases, requireAuth, canViewRates = async () => false }) => {
  const router = express.Router();
  router.use(requireAuth);

  router.use(async (req, res, next) => {
    try {
      if (await canViewRates(req)) return next();
    } catch (error) {
      return next(error);
    }
    const send = res.json.bind(res);
    res.json = (body) => send(withoutRates(body));
    next();
  });

  // Registered before the CRUD routes so none of these is read as a record id.
  const clock = (path, action) =>
    router.post(path, async (req, res) => {
      const record = await attendanceUseCases[action](req.body?.employeeId);
      res.status(200).json(toDto(record));
    });

  clock("/time-in", "timeIn"); // the hourly rate is taken from what HR assigned, never from the request
  clock("/lunch-out", "lunchOut");
  clock("/lunch-in", "lunchIn");
  clock("/time-out", "timeOut");

  return createCrudRouter({
    router,
    entityName: "Attendance record",
    useCases: {
      list: attendanceUseCases.listAttendance,
      listPage: attendanceUseCases.listAttendancePage,
      get: attendanceUseCases.getAttendance,
      add: attendanceUseCases.addAttendance,
      update: attendanceUseCases.updateAttendance,
      remove: attendanceUseCases.deleteAttendance,
    },
  });
};
