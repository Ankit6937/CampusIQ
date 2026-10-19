const mongoose = require('mongoose');
const { Schema } = mongoose;

const jobDriveSchema = new Schema({
  // REFERENCING: one company has many drives (one-to-many)
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: [true, 'Company is required'], index: true },
  jobTitle: { type: String, required: [true, 'Job title is required'], trim: true },
  description: { type: String, trim: true },
  package: { type: Number, required: [true, 'Package is required'], min: [0, 'Package cannot be negative'] }, // LPA
  jobType: { type: String, enum: ['Full-time', 'Internship', 'Contract'], default: 'Full-time' },
  location: { type: String, trim: true },
  minimumCGPA: { type: Number, min: 0, max: 10, default: 0 },
  minimumAttendance: { type: Number, min: 0, max: 100, default: 0 },
  requiredSkills: [{ type: String, trim: true }],
  eligibilityBranches: [{ type: String, enum: ['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT'] }],
  driveDate: { type: Date, required: [true, 'Drive date is required'] },
  applicationDeadline: { type: Date, required: [true, 'Application deadline is required'] },
  status: { type: String, enum: ['Upcoming', 'Active', 'Completed', 'Cancelled'], default: 'Upcoming' }
}, { timestamps: { createdAt: true, updatedAt: false } });

jobDriveSchema.index({ status: 1, driveDate: 1 });

module.exports = mongoose.model('JobDrive', jobDriveSchema, 'jobDrives');
