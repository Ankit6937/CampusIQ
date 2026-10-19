const asyncHandler = require('../utils/asyncHandler');
const queryLab = require('../services/queryLab');
const optimizer = require('../services/optimizerService');

const needId = (req) => {
  const id = req.body && req.body.id;
  if (typeof id !== 'string' || !id) { const e = new Error('Body must contain a query "id" string'); e.status = 400; throw e; }
  return id;
};

exports.listQueries = (req, res) => res.json({ success: true, data: queryLab.list() });
exports.runQuery = asyncHandler(async (req, res) => res.json({ success: true, data: await queryLab.run(needId(req)) }));
exports.listOptimizer = (req, res) => res.json({ success: true, data: optimizer.list() });
exports.runOptimizer = asyncHandler(async (req, res) => res.json({ success: true, data: await optimizer.run(needId(req)) }));
