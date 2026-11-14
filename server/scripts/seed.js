// Creates the development accounts (see domain/role/defaultAccounts.js) in the database that
// MONGO_URI points at. Run from the server folder:  MONGO_URI=mongodb://... node scripts/seed.js
import mongoose from "mongoose";
import config from "../src/infrastructure/config/config.js";
import { MongoAdministratorRepository } from "../src/infrastructure/persistence/mongo/MongoAdministratorRepository.js";
import {
  MongoRoleRepository,
  MongoRoleAssignmentRepository,
} from "../src/infrastructure/persistence/mongo/MongoRoleRepository.js";
import { BcryptPasswordHasher } from "../src/infrastructure/security/BcryptPasswordHasher.js";
import { createSeedAccounts } from "../src/application/auth/seedAccountsUseCase.js";
import { DEFAULT_ACCOUNTS } from "../src/domain/role/defaultAccounts.js";

if (!config.dbConnection) {
  console.error("Set MONGO_URI to the database to seed.");
  process.exit(1);
}

try {
  await mongoose.connect(config.dbConnection);

  const seedAccounts = createSeedAccounts({
    administratorRepository: new MongoAdministratorRepository(),
    roleRepository: new MongoRoleRepository(),
    roleAssignmentRepository: new MongoRoleAssignmentRepository(),
    passwordHasher: new BcryptPasswordHasher(),
  });

  for (const row of await seedAccounts(DEFAULT_ACCOUNTS)) {
    console.log(
      `${row.username}: ${row.createdAccount ? "created" : "already existed (password unchanged)"}, role ${row.role} ${row.createdRole ? "created" : "already existed"}`
    );
  }
} finally {
  await mongoose.disconnect();
}
