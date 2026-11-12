import { MongoRepository } from "./MongoRepository.js";
import { LeaveType } from "../../../domain/leave/LeaveType.js";
import { DuplicateLeaveTypeError } from "../../../domain/errors.js";
import { LeaveTypeModel } from "./models/leaveTypeModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toLeaveType = (doc) =>
  new LeaveType({
    ...toBaseProps(doc),
    name: doc.name,
    isPaid: doc.isPaid,
  });

export class MongoLeaveTypeRepository extends MongoRepository {
  constructor() {
    super({
      model: LeaveTypeModel,
      toEntity: toLeaveType,
      duplicateError: () => new DuplicateLeaveTypeError(),
    });
  }
}
