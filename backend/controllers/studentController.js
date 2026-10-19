const mongoose = require('mongoose');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Prediction = require('../models/Prediction');
const asyncHandler = require('../utils/asyncHandler');

const httpError = (status, message) => Object.assign(new Error(message), { status });
const checkId = (id) => { if (!mongoose.isValidObjectId(id)) throw httpError(400, 'Invalid student id'); };
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Builds a MongoDB filter from query-string params (search + filters). */
function buildFilter(q) {
  const f = {};
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    f.$or = [{ name: rx }, { email: rx }, { rollNumber: rx }];
  }
  if (q.branch) f.branch = String(q.branch);
  if (q.graduationYear) f.graduationYear = Number(q.graduationYear);
  if (q.minCgpa) f.cgpa = { $gte: Number(q.minCgpa) };
  if (q.minAttendance) f.attendance = { $gte: Number(q.minAttendance) };
  if (q.skills) {
    const list = String(q.skills).split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length) f['skills.name'] = { $in: list };
  }
  return f;
}

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  let filter = buildFilter(req.query);

  // placement status filter: Placed = has a Selected application
  if (req.query.placementStatus) {
    const placedIds = await Application.distinct('studentId', { status: 'Selected' });
    filter._id = req.query.placementStatus === 'Placed' ? { $in: placedIds } : { $nin: placedIds };
  }

  const sortField = ['name', 'cgpa', 'attendance', 'createdAt'].includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
  const sortDir = req.query.order === 'asc' ? 1 : -1;

  const [data, total] = await Promise.all([
    Student.find(filter).sort({ [sortField]: sortDir }).skip((page - 1) * limit).limit(limit),
    Student.countDocuments(filter)
  ]);
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.get = asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const student = await Student.findById(req.params.id);
  if (!student) throw httpError(404, 'Student not found');
  // REFERENCING in action: applications live in their own collection, joined via populate
  const [applications, prediction] = await Promise.all([
    Application.find({ studentId: student._id })
      .populate({ path: 'driveId', populate: { path: 'companyId', select: 'name industry' } })
      .sort({ appliedAt: -1 }),
    Prediction.findOne({ studentId: student._id })
  ]);
  res.json({ success: true, data: { student, applications, prediction } });
});

exports.create = asyncHandler(async (req, res) => {
  const student = await Student.create(req.body);
  res.status(201).json({ success: true, data: student });
});

exports.update = asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!student) throw httpError(404, 'Student not found');
  res.json({ success: true, data: student });
});

exports.remove = asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) throw httpError(404, 'Student not found');
  // keep referenced collections consistent (MongoDB has no foreign-key cascade)
  await Promise.all([Application.deleteMany({ studentId: student._id }), Prediction.deleteOne({ studentId: student._id })]);
  res.json({ success: true, message: 'Student deleted' });
});
