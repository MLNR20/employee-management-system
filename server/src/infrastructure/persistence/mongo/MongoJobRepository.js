import { MongoRepository } from "./MongoRepository.js";
import { Job, JobStatus } from "../../../domain/job/Job.js";
import { JobModel } from "./models/jobModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toJob = (doc) =>
  new Job({
    ...toBaseProps(doc),
    jobTitle: doc.jobTitle,
    jobDescription: doc.jobDescription,
    status: doc.status,
  });

export class MongoJobRepository extends MongoRepository {
  constructor() {
    super({ model: JobModel, toEntity: toJob, searchFields: ["jobTitle", "jobDescription", "status"] });
  }

  async findOpen() {
    const docs = await JobModel.find({ status: JobStatus.OPEN, isActive: { $ne: false } })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toJob);
  }
}
