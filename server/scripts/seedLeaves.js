// Fills the database with leave to look at: leave types, a balance per employee and type, and some
// filed leave (approved, pending and rejected) around today so the calendar has something to show.
// Safe to run again: anything that already exists is left alone. Run from the server folder:
//   MONGO_URI=mongodb://... node scripts/seedLeaves.js
// It uses the employees already in the database, and adds a few sample ones if there are none.
import mongoose from "mongoose";
import config from "../src/infrastructure/config/config.js";
import { EmployeeModel } from "../src/infrastructure/persistence/mongo/models/employeeModel.js";
import { AdministratorModel } from "../src/infrastructure/persistence/mongo/models/administratorModel.js";
import { LeaveTypeModel } from "../src/infrastructure/persistence/mongo/models/leaveTypeModel.js";
import {
  LeaveBalanceModel,
  LeaveRequestModel,
  LeaveApprovalModel,
} from "../src/infrastructure/persistence/mongo/models/leaveModels.js";
import { DEFAULT_ACCOUNTS } from "../src/domain/role/defaultAccounts.js";

if (!config.dbConnection) {
  console.error("Set MONGO_URI to the database to seed.");
  process.exit(1);
}

const LEAVE_TYPES = [
  { name: "Vacation Leave", isPaid: true, maxLeaves: 15 },
  { name: "Sick Leave", isPaid: true, maxLeaves: 10 },
  { name: "Emergency Leave", isPaid: false, maxLeaves: 5 },
];

const SAMPLE_EMPLOYEES = [
  { first_name: "Maria", last_name: "Santos", email: "maria.santos@ga31.com", position: "Accountant", department: "Finance" },
  { first_name: "Juan", last_name: "Dela Cruz", email: "juan.delacruz@ga31.com", position: "Developer", department: "Engineering" },
  { first_name: "Ana", last_name: "Reyes", email: "ana.reyes@ga31.com", position: "HR Officer", department: "Human Resources" },
];

// What each employee files, as day offsets from today (negative is in the past): [type, from, to, status, reason].
const REQUESTS = [
  ["Vacation Leave", -20, -18, "approved", "Family trip"],
  ["Sick Leave", -7, -6, "approved", "Flu"],
  ["Vacation Leave", 5, 9, "pending", "Rest and travel"],
  ["Emergency Leave", 14, 14, "pending", "Family matter"],
  ["Vacation Leave", -40, -40, "rejected", "Short notice during a deadline"],
];

const DAY_MS = 24 * 60 * 60 * 1000;
const dayFromToday = (offset) => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) + offset * DAY_MS);
};

try {
  await mongoose.connect(config.dbConnection);

  const types = {};
  for (const { name, isPaid } of LEAVE_TYPES) {
    types[name] = (await LeaveTypeModel.findOne({ name })) ?? (await LeaveTypeModel.create({ name, isPaid }));
  }

  if ((await EmployeeModel.countDocuments()) === 0) {
    await EmployeeModel.insertMany(SAMPLE_EMPLOYEES);
    console.log(`No employees found: added ${SAMPLE_EMPLOYEES.length} sample employees`);
  }
  const employees = await EmployeeModel.find();

  const approver = await AdministratorModel.findOne({ username: DEFAULT_ACCOUNTS[0].username });
  if (!approver) console.warn("No admin account found (run scripts/seed.js first): approved leave will have no approval record");

  let balances = 0;
  let requests = 0;
  for (const employee of employees) {
    for (const { name, maxLeaves } of LEAVE_TYPES) {
      const leaveTypeId = types[name]._id;
      const exists = await LeaveBalanceModel.exists({ employeeId: employee._id, leaveTypeId });
      if (!exists) {
        await LeaveBalanceModel.create({ employeeId: employee._id, leaveTypeId, maxLeaves, availableLeaves: maxLeaves });
        balances++;
      }
    }

    for (const [typeName, from, to, status, reason] of REQUESTS) {
      const leaveTypeId = types[typeName]._id;
      const startDate = dayFromToday(from);
      const endDate = dayFromToday(to);
      if (await LeaveRequestModel.exists({ employeeId: employee._id, leaveTypeId, startDate })) continue;

      const days = to - from + 1;
      const request = await LeaveRequestModel.create({ employeeId: employee._id, leaveTypeId, startDate, endDate, days, reason, status });
      requests++;

      // Approving takes the days off the balance, like the app does.
      if (status === "approved") {
        await LeaveBalanceModel.updateOne({ employeeId: employee._id, leaveTypeId }, { $inc: { availableLeaves: -days } });
      }
      if (approver && (status === "approved" || status === "rejected")) {
        await LeaveApprovalModel.create({
          leaveRequestId: request._id,
          approverId: approver._id,
          decision: status,
          remarks: status === "approved" ? "Approved" : "Not possible on those dates",
        });
      }
    }
  }

  console.log(`Leave types: ${LEAVE_TYPES.length}, employees: ${employees.length}, new balances: ${balances}, new leave requests: ${requests}`);
} finally {
  await mongoose.disconnect();
}
