// Sample payroll data to look at: gives the portal user (user@gallium31.com) an hourly rate of 25,000
// and a time record for every working day from 2026-10-01 to 2026-11-22, which fills the semi-monthly
// payroll periods (1-15 and 16-end of the month) of October and November. Only that one employee is
// touched. Safe to run again: a rate or a day's record that already exists is left alone. Run from
// the server folder:
//   node scripts/seedPayroll.js            (MONGO_URI comes from .env)
import mongoose from "mongoose";
import config from "../src/infrastructure/config/config.js";
import { EmployeeModel } from "../src/infrastructure/persistence/mongo/models/employeeModel.js";
import { AdministratorModel } from "../src/infrastructure/persistence/mongo/models/administratorModel.js";
import { SalaryRateModel } from "../src/infrastructure/persistence/mongo/models/salaryRateModel.js";
import { AttendanceModel } from "../src/infrastructure/persistence/mongo/models/attendanceModel.js";
import { DEFAULT_ACCOUNTS } from "../src/domain/role/defaultAccounts.js";
import { computeHoursWorked } from "../src/domain/attendance/attendanceRules.js";
import { localDay } from "../src/domain/attendance/localTime.js";

const EMAIL = "user@gallium31.com";
const HOURLY_RATE = 25000;
const FROM = "2026-10-01";
const TO = "2026-11-22";
const UTC_OFFSET = config.WORK_UTC_OFFSET_MINUTES;

if (!config.dbConnection) {
  console.error("Set MONGO_URI to the database to seed.");
  process.exit(1);
}

// Workplace-clock time on a day, as the UTC instant that is stored: "08:05" on 2026-11-02 at UTC+8 is 00:05Z.
const at = (day, hhmm) => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + (hours * 60 + minutes - UTC_OFFSET) * 60 * 1000);
};

// A shift of 08:00-17:00 with an hour's lunch, with a few days that start late or run over.
// [time in, lunch out, lunch in, time out]
const DEFAULT_DAY = ["08:00", "12:00", "13:00", "17:00"];
const VARIATIONS = {
  "2026-10-02": ["08:07", "12:00", "13:00", "17:00"],
  "2026-10-08": ["08:00", "12:00", "13:00", "17:45"],
  "2026-10-14": ["08:15", "12:10", "13:10", "17:00"],
  "2026-10-19": ["08:00", "12:00", "13:00", "16:30"],
  "2026-10-23": ["08:25", "12:00", "13:00", "17:00"],
  "2026-10-28": ["08:00", "12:00", "13:00", "18:15"],
  "2026-11-17": ["08:10", "12:00", "13:00", "17:00"],
  "2026-11-19": ["08:00", "12:00", "13:00", "17:30"],
  "2026-11-04": ["08:12", "12:00", "13:00", "17:00"],
  "2026-11-06": ["08:00", "12:00", "13:00", "18:30"],
  "2026-11-10": ["08:20", "12:05", "13:05", "17:00"],
  "2026-11-13": ["08:00", "12:00", "13:00", "16:00"],
};

const days = [];
for (let ms = Date.parse(`${FROM}T00:00:00.000Z`); ms <= Date.parse(`${TO}T00:00:00.000Z`); ms += 24 * 60 * 60 * 1000) {
  const day = new Date(ms).toISOString().slice(0, 10);
  const weekday = new Date(ms).getUTCDay();
  if (weekday !== 0 && weekday !== 6) days.push(day);
}

try {
  await mongoose.connect(config.dbConnection);

  const employee = await EmployeeModel.findOne({ email: EMAIL });
  if (!employee) {
    console.error(`No employee with the email ${EMAIL} was found.`);
    process.exitCode = 1;
  } else {
    const hr = await AdministratorModel.findOne({ username: DEFAULT_ACCOUNTS[0].username });
    if (!hr) {
      console.error("No admin account found (run scripts/seed.js first): a rate needs someone who assigned it.");
      process.exitCode = 1;
    } else {
      const rateExists = await SalaryRateModel.exists({ employeeId: employee._id, hourlyRate: HOURLY_RATE, effectiveFrom: FROM });
      if (!rateExists) {
        await SalaryRateModel.create({
          employeeId: employee._id,
          hourlyRate: HOURLY_RATE,
          effectiveFrom: FROM,
          assignedBy: hr._id,
          remarks: "Sample payroll data",
        });
      }

      let added = 0;
      for (const day of days) {
        if (await AttendanceModel.exists({ employeeId: employee._id, date: day })) continue;

        const [timeIn, lunchOut, lunchIn, timeOut] = (VARIATIONS[day] ?? DEFAULT_DAY).map((time) => at(day, time));
        await AttendanceModel.create({
          employeeId: employee._id,
          date: localDay(timeIn, UTC_OFFSET),
          timeIn,
          lunchOut,
          lunchIn,
          timeOut,
          hourlyRate: HOURLY_RATE,
          hoursWorked: computeHoursWorked({ timeIn, lunchOut, lunchIn, timeOut }),
        });
        added++;
      }

      console.log(
        `${EMAIL}: rate ${HOURLY_RATE} from ${FROM} ${rateExists ? "already existed" : "assigned"}, ` +
          `${added} new attendance records (${days.length} working days from ${FROM} to ${TO})`
      );
    }
  }
} finally {
  await mongoose.disconnect();
}
