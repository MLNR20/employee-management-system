// Gives one administrator the full-access "Administrator" role: the way back in when the right person
// cannot manage roles. Run from the server folder, against the database in MONGO_URI:
//   node scripts/grantFullAccess.js <username>
// The change reaches a signed-in administrator when their access token renews (up to 15 minutes), or
// at once if they sign in again.
import mongoose from "mongoose";
import config from "../src/infrastructure/config/config.js";
import { MongoAdministratorRepository } from "../src/infrastructure/persistence/mongo/MongoAdministratorRepository.js";
import {
  MongoRoleRepository,
  MongoRoleAssignmentRepository,
} from "../src/infrastructure/persistence/mongo/MongoRoleRepository.js";
import { createAuthorizationUseCases } from "../src/application/role/authorizationUseCases.js";
import { createAccessUseCases, FULL_ACCESS_ROLE } from "../src/application/role/accessUseCases.js";

const username = process.argv[2];
if (!config.dbConnection || !username) {
  console.error("Usage: node scripts/grantFullAccess.js <username>   (with MONGO_URI set)");
  process.exit(1);
}

try {
  await mongoose.connect(config.dbConnection);

  const roleRepository = new MongoRoleRepository();
  const roleAssignmentRepository = new MongoRoleAssignmentRepository();
  const access = createAccessUseCases({
    administratorRepository: new MongoAdministratorRepository(),
    roleRepository,
    roleAssignmentRepository,
    authorizationUseCases: createAuthorizationUseCases({ roleAssignmentRepository, roleRepository }),
  });

  await access.grantFullAccess(username);
  console.log(`${username} now holds the "${FULL_ACCESS_ROLE}" role with every permission.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
