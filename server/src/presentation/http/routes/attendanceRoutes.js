import express from "express";
import { createCrudRouter, toDto } from "./crudRouter.js";

/**
 * Attendance records. The clock actions take the employee in the body; the standard routes let an
 * administrator list, enter, correct and delete records. All require a signed-in administrator.
 */
export const createAttendanceRouter = ({ attendanceUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

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
