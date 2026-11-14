import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";
import { JobStatus } from "../../../../domain/job/Job.js";

const jobsSchema = createEntitySchema({
  jobTitle: { type: String, required: true, trim: true },
  jobDescription: { type: String, required: true, trim: true },
  status: { type: String, enum: Object.values(JobStatus), default: JobStatus.OPEN },
});

export const JobModel = mongoose.model("jobs", jobsSchema);
