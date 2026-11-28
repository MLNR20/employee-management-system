import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { EmergencyContact } from "../../../domain/employee/EmergencyContact.js";
import { EmergencyContactModel } from "./models/emergencyContactModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toEmergencyContact = (doc) =>
  new EmergencyContact({
    ...toBaseProps(doc),
    employeeId: String(doc.employeeId),
    firstName: doc.firstName,
    lastName: doc.lastName,
    relationship: doc.relationship,
    email: doc.email,
    address: doc.address,
    phoneNumber: doc.phoneNumber,
  });

export class MongoEmergencyContactRepository extends MongoRepository {
  constructor() {
    super({
      model: EmergencyContactModel,
      toEntity: toEmergencyContact,
      searchFields: ["firstName", "lastName", "relationship", "email", "phoneNumber"],
    });
  }

  async findByEmployeeId(employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) return [];
    const docs = await EmergencyContactModel.find({ employeeId }).sort({ createdAt: 1 }).lean();
    return docs.map(toEmergencyContact);
  }

  async removeForEmployee(employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) return;
    await EmergencyContactModel.softDelete({ employeeId });
  }
}
