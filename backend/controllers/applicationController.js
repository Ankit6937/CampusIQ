const mongoose = require('mongoose');
const Application = require('../models/Application');
const crudFactory = require('../utils/crudFactory');

const populate = [
  { path: 'studentId', select: 'name rollNumber branch cgpa' },
  { path: 'driveId', select: 'jobTitle package companyId', populate: { path: 'companyId', select: 'name' } }
];

const Student = require('../models/Student');
const JobDrive = require('../models/JobDrive');

module.exports = crudFactory(Application, 'Application', {
  populate,
  beforeSave: async (body) => {
    if (body.studentId && !mongoose.isValidObjectId(body.studentId)) throw crudFactory.refError('Invalid studentId');
    if (body.driveId && !mongoose.isValidObjectId(body.driveId)) throw crudFactory.refError('Invalid driveId');
    if (body.studentId && !(await Student.exists({ _id: body.studentId }))) throw crudFactory.refError('Student not found: studentId does not reference an existing student');
    if (body.driveId && !(await JobDrive.exists({ _id: body.driveId }))) throw crudFactory.refError('Job drive not found: driveId does not reference an existing drive');
  },
  listFilter: (q) => ({
    ...(q.status && { status: String(q.status) }),
    ...(q.studentId && mongoose.isValidObjectId(q.studentId) && { studentId: q.studentId }),
    ...(q.driveId && mongoose.isValidObjectId(q.driveId) && { driveId: q.driveId })
  })
});
