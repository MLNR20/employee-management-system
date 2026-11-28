import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";
import { softDeletePlugin } from "./softDelete.js";
import { ApplicationStatus } from "../../../../domain/job/JobApplication.js";

const jobApplicationsSchema = createEntitySchema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "jobs", required: true },
  resumeLink: { type: String, required: true, trim: true },
  status: { type: String, enum: Object.values(ApplicationStatus), default: ApplicationStatus.SUBMITTED },
  dateSubmitted: { type: Date, default: Date.now },
});

// An employee applies to a job once. The database enforces it, so two simultaneous submits cannot both succeed.
jobApplicationsSchema.plugin(softDeletePlugin);
jobApplicationsSchema.index({ employeeId: 1, jobId: 1, deletedAt: 1 }, { unique: true });
jobApplicationsSchema.index({ jobId: 1 });

export const JobApplicationModel = mongoose.model("jobapplications", jobApplicationsSchema);
