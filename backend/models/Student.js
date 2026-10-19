const mongoose = require('mongoose');
const { Schema } = mongoose;

const BRANCHES = ['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT'];

// EMBEDDED sub-documents: always read together with the student, so no join is needed.
const skillSchema = new Schema({
  name: { type: String, required: true, trim: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' }
}, { _id: false });

const projectSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  techStack: [String],
  link: { type: String, trim: true }
}, { _id: false });

const certificationSchema = new Schema({
  name: { type: String, required: true, trim: true },
  issuer: { type: String, trim: true },
  issuedOn: Date
}, { _id: false });

const internshipSchema = new Schema({
  company: { type: String, required: true, trim: true },
  role: { type: String, trim: true },
  durationMonths: { type: Number, min: 0, max: 24 }
}, { _id: false });

const score = (label) => ({
  type: Number, min: [0, `${label} cannot be below 0`], max: [100, `${label} cannot exceed 100`], default: 0
});

const studentSchema = new Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 80 },
  email: {
    type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  phone: { type: String, trim: true, match: [/^[0-9+\-\s]{10,15}$/, 'Phone must be 10-15 digits'] },
  rollNumber: { type: String, required: [true, 'Roll number is required'], unique: true, trim: true },
  branch: { type: String, required: [true, 'Branch is required'], enum: { values: BRANCHES, message: 'Branch must be one of ' + BRANCHES.join(', ') } },
  graduationYear: {
    type: Number, required: [true, 'Graduation year is required'],
    min: [2020, 'Graduation year must be 2020 or later'], max: [2035, 'Graduation year must be 2035 or earlier']
  },
  cgpa: { type: Number, required: [true, 'CGPA is required'], min: [0, 'CGPA must be between 0 and 10'], max: [10, 'CGPA must be between 0 and 10'] },
  attendance: { type: Number, required: [true, 'Attendance is required'], min: [0, 'Attendance must be between 0 and 100'], max: [100, 'Attendance must be between 0 and 100'] },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  location: { type: String, trim: true },
  skills: [skillSchema],
  projects: [projectSchema],
  certifications: [certificationSchema],
  internships: [internshipSchema],
  dsaScore: score('DSA score'),
  communicationScore: score('Communication score'),
  aptitudeScore: score('Aptitude score'),
  resumeScore: score('Resume score')
}, { timestamps: true });

// ---- Indexes (Unit IV) ----
studentSchema.index({ cgpa: 1 });                             // single-field index
studentSchema.index({ branch: 1, cgpa: -1 });                 // compound index (equality field first, then range/sort)
studentSchema.index({ name: 'text', 'skills.name': 'text' }); // text index
studentSchema.index({ graduationYear: 1 });

studentSchema.statics.BRANCHES = BRANCHES;

module.exports = mongoose.model('Student', studentSchema);
