const mongoose = require('mongoose');
const Company = require('../models/Company');
const JobDrive = require('../models/JobDrive');
const crudFactory = require('../utils/crudFactory');
const asyncHandler = require('../utils/asyncHandler');

const base = crudFactory(Company, 'Company', {
  listFilter: (q) => (q.search ? { name: new RegExp(String(q.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } : {})
});

// Company details include its drives (one-to-many via reference)
const get = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid Company id' });
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
  const drives = await JobDrive.find({ companyId: company._id }).sort({ driveDate: -1 });
  res.json({ success: true, data: company, drives });
});

const remove = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid Company id' });
  const inUse = await JobDrive.countDocuments({ companyId: req.params.id });
  if (inUse) return res.status(409).json({ success: false, message: `Cannot delete: company has ${inUse} job drive(s). Delete them first.` });
  return base.remove(req, res);
});

module.exports = { ...base, get, remove };
