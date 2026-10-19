const express = require('express');
const router = express.Router();

const student = require('../controllers/studentController');
const company = require('../controllers/companyController');
const drive = require('../controllers/driveController');
const application = require('../controllers/applicationController');
const skill = require('../controllers/skillController');
const analytics = require('../controllers/analyticsController');
const performance = require('../controllers/performanceController');
const lab = require('../controllers/labController');
const prediction = require('../controllers/predictionController');
const aiCtl = require('../controllers/aiController');
const settings = require('../controllers/settingsController');

const crud = (c) => {
  const r = express.Router();
  r.route('/').get(c.list).post(c.create);
  r.route('/:id').get(c.get).put(c.update).delete(c.remove);
  return r;
};

router.use('/students', crud(student));
router.use('/companies', crud(company));
router.get('/drives/:id/eligible-students', drive.eligibleStudents); // must come before /drives/:id
router.use('/drives', crud(drive));
router.use('/applications', crud(application));
router.use('/skills', crud(skill));

// ---- Analytics (MongoDB aggregation pipelines) ----
const a = express.Router();
a.get('/dashboard', analytics.dashboard);
a.get('/summary', analytics.summary);
a.get('/branches', analytics.branches);
a.get('/branches/count', analytics.studentsByBranch);
a.get('/branches/cgpa', analytics.avgCgpaByBranch);
a.get('/branches/packages', analytics.packageByBranch);
a.get('/years', analytics.years);
a.get('/companies', analytics.companies);
a.get('/skills', analytics.skills);
a.get('/status', analytics.status);
a.get('/monthly', analytics.monthly);
a.get('/funnel', analytics.funnel);
a.get('/predictions/top', analytics.topPredictions);
a.get('/predictions/high-risk', analytics.highRisk);
a.get('/predictions/risk', analytics.risk);
router.use('/analytics', a);

// ---- Database performance (indexes + explain) ----
router.get('/performance/indexes', performance.indexes);
router.get('/performance/benchmarks', performance.benchmarks);

router.get('/performance/optimizer', lab.listOptimizer);
router.post('/performance/optimizer/run', lab.runOptimizer);

// ---- Query Lab: predefined safe queries only (client sends an id, never a query) ----
router.get('/query-lab', lab.listQueries);
router.post('/query-lab/run', lab.runQuery);

// ---- ML predictions (Node -> Python FastAPI -> scikit-learn -> MongoDB) ----
router.get('/predictions/model', prediction.modelInfo);
router.post('/predictions/refresh-all', prediction.refreshAll);
router.post('/predictions/student/:id', prediction.predictStudent);

// ---- AI Insights and Settings ----
router.get('/ai/suggestions', aiCtl.suggestions);
router.post('/ai/ask', aiCtl.ask);
router.get('/settings/status', settings.status);

module.exports = router;
