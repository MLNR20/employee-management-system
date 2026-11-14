import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { Attendance } from "../../../domain/attendance/Attendance.js";
import { InvalidStateError } from "../../../domain/errors.js";
import { AttendanceModel } from "./models/attendanceModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toAttendance = (doc) =>
  new Attendance({
    ...toBaseProps(doc),
    employeeId: String(doc.employeeId),
    date: doc.date,
    timeIn: doc.timeIn,
    lunchOut: doc.lunchOut ?? null,
    lunchIn: doc.lunchIn ?? null,
    timeOut: doc.timeOut ?? null,
    hourlyRate: doc.hourlyRate,
    hoursWorked: doc.hoursWorked ?? null,
  });

export class MongoAttendanceRepository extends MongoRepository {
  constructor() {
    super({
      model: AttendanceModel,
      toEntity: toAttendance,
      searchFields: ["date"],
      duplicateError: () => new InvalidStateError("This employee already has an attendance record for that day"),
    });
  }

  async findByEmployeeAndDate(employeeId, date) {
    if (!mongoose.isValidObjectId(employeeId)) return null;
    const doc = await AttendanceModel.findOne({ employeeId, date }).lean();
    return doc ? toAttendance(doc) : null;
  }

  async findOpenByEmployeeId(employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) return null;
    const doc = await AttendanceModel.findOne({ employeeId, timeOut: null }).sort({ timeIn: -1 }).lean();
    return doc ? toAttendance(doc) : null;
  }
}
