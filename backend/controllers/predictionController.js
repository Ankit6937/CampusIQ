const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ml = require('../services/mlService');

exports.predictStudent = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid student id' });
  res.json({ success: true, data: await ml.predictAndStore(req.params.id) });
});
exports.refreshAll = asyncHandler(async (req, res) => res.json({ success: true, data: await ml.refreshAll() }));
exports.modelInfo = asyncHandler(async (req, res) => res.json({ success: true, data: await ml.modelInfo() }));
