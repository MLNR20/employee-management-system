// Creates 100 sample employees (EMP-1001 to EMP-1100) across the four departments, with the positions
// the employee form offers. Safe to run again: an employee whose email already exists is left alone.
// No portal password is set, so these records are for the admin screens only. Run from the server folder:
//   node scripts/seedEmployees.js            (MONGO_URI comes from .env)
import mongoose from "mongoose";
import config from "../src/infrastructure/config/config.js";
import { EmployeeModel } from "../src/infrastructure/persistence/mongo/models/employeeModel.js";

if (!config.dbConnection) {
  console.error("Set MONGO_URI to the database to seed.");
  process.exit(1);
}

const COUNT = 100;
const FIRST_NAMES = ["Aaron", "Bianca", "Carlo", "Daniela", "Elijah", "Fiona", "Gabriel", "Hannah", "Ian", "Julia", "Kevin", "Lara", "Marco", "Nina", "Oscar", "Patricia", "Quinn", "Rafael", "Sofia", "Tomas", "Uma", "Victor", "Wendy", "Xavier", "Yvonne", "Zach"];
const LAST_NAMES = ["Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza", "Torres", "Flores", "Ramos", "Aquino", "Castillo", "Villanueva", "Navarro", "Domingo", "Soriano", "Lim", "Tan", "Dizon", "Pascual"];
const DEPARTMENTS = {
  "Finance and Accounting": { positions: ["Accountant", "Financial Analyst", "Payroll Specialist"], salary: [28000, 55000] },
  "Human Resources": { positions: ["HR Manager", "Recruitment Specialist", "Training Coordinator"], salary: [26000, 60000] },
  "Information Technology": { positions: ["IT Support Specialist", "Network Administrator", "Systems Analyst"], salary: [30000, 75000] },
  Management: { positions: ["Operations Manager", "Project Manager", "Executive Assistant"], salary: [32000, 90000] },
};
const departmentNames = Object.keys(DEPARTMENTS);

try {
  await mongoose.connect(config.dbConnection);

  let created = 0;
  for (let i = 0; i < COUNT; i++) {
    // Deterministic, so a second run produces the same people and skips them.
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 7 + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length];
    const number = 1001 + i;
    const email = `${first}.${last}${number}@gallium31.test`.toLowerCase();
    if (await EmployeeModel.exists({ email })) continue;

    const department = departmentNames[i % departmentNames.length];
    const { positions, salary } = DEPARTMENTS[department];
    const hired = new Date(Date.UTC(2020 + (i % 6), (i * 5) % 12, 1 + ((i * 3) % 28)));

    await EmployeeModel.create({
      employmentCode: `EMP-${number}`,
      first_name: first,
      last_name: last,
      email,
      position: positions[Math.floor(i / departmentNames.length) % positions.length],
      department,
      salary: Math.round((salary[0] + ((i * 1237) % (salary[1] - salary[0]))) / 500) * 500,
      hireDate: hired,
    });
    created++;
  }

  console.log(`Employees: ${COUNT} wanted, ${created} created, ${COUNT - created} already existed`);
} finally {
  await mongoose.disconnect();
}
