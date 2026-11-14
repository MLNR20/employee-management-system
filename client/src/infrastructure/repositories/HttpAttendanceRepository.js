import { HttpRepository } from "../http/HttpRepository";
import { ATTENDANCE_TIMES, Attendance, fromLocalInput } from "../../domain/attendance/Attendance";

// The form edits times as local "YYYY-MM-DDTHH:mm" text; the server stores real instants.
const toServerTimes = (payload) => {
  const converted = { ...payload };
  for (const field of ATTENDANCE_TIMES) {
    if (field in converted) converted[field] = fromLocalInput(converted[field]);
  }
  return converted;
};

export class HttpAttendanceRepository extends HttpRepository {
  constructor(options = {}) {
    super({ resource: "attendance", fromApi: Attendance.fromApi, ...options });
  }

  create(payload) {
    return super.create(toServerTimes(payload));
  }

  update(id, payload) {
    return super.update(id, toServerTimes(payload));
  }
}
