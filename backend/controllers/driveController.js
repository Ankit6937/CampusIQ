const mongoose = require('mongoose');
const JobDrive = require('../models/JobDrive');
const Student = require('../models/Student');
const Application = require('../models/Application');
const crudFactory = require('../utils/crudFactory');
const asyncHandler = require('../utils/asyncHandler');

const Company = require('../models/Company');

const base = crudFactory(JobDrive, 'Job drive', {
  beforeSave: async (body) => {
    if (body.companyId && !mongoose.isValidObjectId(body.companyId)) throw crudFactory.refError('Invalid companyId');
    if (body.companyId && !(await Company.exists({ _id: body.companyId }))) throw crudFactory.refError('Company not found: companyId does not reference an existing company');
  },
  populate: { path: 'companyId', select: 'name industry location' },
  listFilter: (q) => ({ ...(q.status && { status: String(q.status) }), ...(q.companyId && mongoose.isValidObjectId(q.companyId) && { companyId: q.companyId }) })
});

/** Students eligible for a drive: CGPA, attendance, branch and required skills (all via one MongoDB query). */
const eligibleStudents = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid drive id' });
  const drive = await JobDrive.findById(req.params.id);
  if (!drive) return res.status(404).json({ success: false, message: 'Job drive not found' });

  const query = { cgpa: { $gte: drive.minimumCGPA }, attendance: { $gte: drive.minimumAttendance } };
  if (drive.eligibilityBranches.length) query.branch = { $in: drive.eligibilityBranches };
  if (drive.requiredSkills.length) query['skills.name'] = { $all: drive.requiredSkills };

  const students = await Student.find(query).sort({ cgpa: -1 }).limit(200);
  res.json({ success: true, count: students.length, criteria: query, data: students });
});

const remove = asyncHandler(async (req, res, next) => {
  const drive = mongoose.isValidObjectId(req.params.id) && await JobDrive.findByIdAndDelete(req.params.id);
  if (!drive) return base.remove(req, res, next); // reuses 400/404 handling
  await Application.deleteMany({ driveId: drive._id });
  res.json({ success: true, message: 'Job drive deleted' });
});

module.exports = { ...base, eligibleStudents, remove };
