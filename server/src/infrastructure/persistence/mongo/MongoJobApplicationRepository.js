import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { JobApplication } from "../../../domain/job/JobApplication.js";
import { DuplicateJobApplicationError } from "../../../domain/errors.js";
import { JobApplicationModel } from "./models/jobApplicationModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toJobApplication = (doc) =>
  new JobApplication({
    ...toBaseProps(doc),
    employeeId: String(doc.employeeId),
    jobId: String(doc.jobId),
    resumeLink: doc.resumeLink,
    status: doc.status,
    dateSubmitted: doc.dateSubmitted,
  });

export class MongoJobApplicationRepository extends MongoRepository {
  constructor() {
    super({
      model: JobApplicationModel,
      toEntity: toJobApplication,
      duplicateError: () => new DuplicateJobApplicationError(),
      searchFields: ["status", "resumeLink"],
    });
  }

  async findByEmployeeId(employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) return [];
    const docs = await JobApplicationModel.find({ employeeId }).sort({ dateSubmitted: -1 }).lean();
    return docs.map(toJobApplication);
  }

  async findByJobId(jobId) {
    if (!mongoose.isValidObjectId(jobId)) return [];
    const docs = await JobApplicationModel.find({ jobId }).sort({ dateSubmitted: -1 }).lean();
    return docs.map(toJobApplication);
  }

  async removeForEmployee(employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) return;
    await JobApplicationModel.deleteMany({ employeeId });
  }

  async existsForJob(jobId) {
    if (!mongoose.isValidObjectId(jobId)) return false;
    return Boolean(await JobApplicationModel.exists({ jobId }));
  }
}
