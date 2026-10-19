const mongoose = require('mongoose');
const { Schema } = mongoose;

const STATUSES = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];
const score = { type: Number, min: 0, max: 100 };

// Junction collection: Students <-> JobDrives (many-to-many)
const applicationSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: [true, 'Student is required'], index: true },
  driveId: { type: Schema.Types.ObjectId, ref: 'JobDrive', required: [true, 'Drive is required'], index: true },
  status: { type: String, enum: { values: STATUSES, message: 'Status must be one of ' + STATUSES.join(', ') }, default: 'Applied', index: true },
  appliedAt: { type: Date, default: Date.now },
  aptitudeScore: score,
  technicalScore: score,
  interviewScore: score,
  finalScore: score,
  remarks: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

// A student can apply to a drive only once (constraint)
applicationSchema.index({ studentId: 1, driveId: 1 }, { unique: true });

applicationSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Application', applicationSchema);
