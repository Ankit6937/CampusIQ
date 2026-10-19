const svc = require('../services/analyticsService');
const asyncHandler = require('../utils/asyncHandler');

const wrap = (fn) => asyncHandler(async (req, res) => res.json({ success: true, data: await fn(req.query.limit) }));

module.exports = {
  dashboard: wrap(svc.dashboard), summary: wrap(svc.summary), studentsByBranch: wrap(svc.studentsByBranch),
  avgCgpaByBranch: wrap(svc.avgCgpaByBranch), branches: wrap(svc.branchOverview), packageByBranch: wrap(svc.packageByBranch),
  years: wrap(svc.placementByYear), companies: wrap(svc.companyHiring), skills: wrap(svc.skills), status: wrap(svc.applicationsByStatus),
  monthly: wrap(svc.monthlyApplications), funnel: wrap(svc.funnel), topPredictions: wrap(svc.topPredictions),
  highRisk: wrap(svc.highRisk), risk: wrap(svc.riskDistribution)
};
