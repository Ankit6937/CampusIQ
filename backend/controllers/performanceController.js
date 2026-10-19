const svc = require('../services/performanceService');
const asyncHandler = require('../utils/asyncHandler');

exports.indexes = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.indexes() }));
exports.benchmarks = asyncHandler(async (req, res) => res.json({ success: true, ...(await svc.benchmarks()) }));
