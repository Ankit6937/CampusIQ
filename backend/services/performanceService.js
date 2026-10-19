// Index inspection and explain("executionStats") benchmarks (Unit IV). All numbers come from real explain() output.
const mongoose = require('mongoose');
const { Student, Application, JobDrive, Company, Skill, Prediction } = require('../models');

const find = (obj, key) => {
  if (!obj || typeof obj !== 'object') return undefined;
  if (key in obj) return obj[key];
  for (const v of Object.values(obj)) { const r = find(v, key); if (r !== undefined) return r; }
  return undefined;
};

function stageList(plan, out = []) {
  if (!plan || typeof plan !== 'object') return out;
  const node = plan.queryPlan || plan;
  if (node.stage) out.push({ stage: node.stage, indexName: node.indexName });
  [node.inputStage, ...(node.inputStages || [])].forEach((c) => stageList(c, out));
  return out;
}

/** Turns raw explain output into the fields the dashboard shows. */
function extractStats(explain) {
  const planner = find(explain, 'queryPlanner') || {};
  const es = find(explain, 'executionStats') || {};
  const stages = stageList(planner.winningPlan);
  const ix = stages.find((s) => /IXSCAN/.test(s.stage) || s.stage === 'TEXT_MATCH' || s.stage === 'IDHACK');
  return {
    indexUsed: ix ? (ix.indexName || ix.stage) : stages.some((s) => s.stage === 'COLLSCAN') ? 'COLLSCAN (no index)' : 'n/a',
    plan: stages.map((s) => s.stage).reverse().join(' -> '),
    executionTimeMs: es.executionTimeMillis ?? null,
    docsExamined: es.totalDocsExamined ?? null,
    keysExamined: es.totalKeysExamined ?? null,
    nReturned: es.nReturned ?? null
  };
}
exports.extractStats = extractStats;

const run = (Model, filter, sort, hint) => {
  let q = Model.find(filter); if (sort) q = q.sort(sort); if (hint) q = q.hint(hint);
  return q.explain('executionStats').then(extractStats);
};

async function avgLatency(Model, filter, sort, hint, n = 20) {
  const exec = () => { let q = Model.find(filter).lean(); if (sort) q = q.sort(sort); if (hint) q = q.hint(hint); return q; };
  await exec(); // warm-up
  const t = process.hrtime.bigint();
  for (let i = 0; i < n; i++) await exec();
  return Math.round(Number(process.hrtime.bigint() - t) / 1e6 / n * 100) / 100;
}

exports.indexes = async () => {
  const models = { students: Student, companies: Company, jobDrives: JobDrive, applications: Application, skills: Skill, predictions: Prediction };
  const out = [];
  for (const [name, Model] of Object.entries(models)) {
    let idx = [], usage = {};
    try { idx = await Model.collection.indexes(); } catch (e) { /* collection not created yet */ }
    try { (await Model.aggregate([{ $indexStats: {} }])).forEach((s) => { usage[s.name] = Number(s.accesses && s.accesses.ops) || 0; }); } catch (e) { /* $indexStats unavailable */ }
    out.push({
      collection: name, documents: await Model.estimatedDocumentCount().catch(() => 0),
      indexes: idx.map((i) => ({ name: i.name, key: i.key || i.weights, unique: !!i.unique, text: !!i.weights, uses: usage[i.name] ?? null }))
    });
  }
  return out;
};

exports.benchmarks = async () => {
  const [s, comp] = await Promise.all([Student.findOne().select('_id').lean(), Company.findOne().select('_id').lean()]);
  const sid = s && s._id, cid = comp && comp._id;
  const defs = [
    { id: 'cgpa-range', title: 'Students with CGPA >= 8.5', shell: 'db.students.find({ cgpa: { $gte: 8.5 } })', Model: Student, filter: { cgpa: { $gte: 8.5 } }, concept: 'Single-field index' },
    { id: 'branch-cgpa', title: 'CSE students with CGPA >= 8, best first', shell: "db.students.find({ branch: 'CSE', cgpa: { $gte: 8 } }).sort({ cgpa: -1 })", Model: Student, filter: { branch: 'CSE', cgpa: { $gte: 8 } }, sort: { cgpa: -1 }, concept: 'Compound index' },
    { id: 'grad-year', title: 'Students graduating in 2026', shell: 'db.students.find({ graduationYear: 2026 })', Model: Student, filter: { graduationYear: 2026 }, concept: 'Single-field index' },
    { id: 'app-status', title: "Applications with status 'Selected'", shell: "db.applications.find({ status: 'Selected' })", Model: Application, filter: { status: 'Selected' }, concept: 'Index on a low-cardinality field' },
    ...(sid ? [{ id: 'app-student', title: "All applications of one student", shell: 'db.applications.find({ studentId: ObjectId("...") })', Model: Application, filter: { studentId: sid }, concept: 'Reference lookup index' }] : []),
    ...(cid ? [{ id: 'drive-company', title: 'All drives of one company', shell: 'db.jobDrives.find({ companyId: ObjectId("...") })', Model: JobDrive, filter: { companyId: cid }, concept: 'Reference lookup index' }] : [])
  ];
  const rows = [];
  for (const d of defs) {
    // "with index": normal planner choice. "without index": hint({ $natural: 1 }) forces a full collection scan.
    // sequential on purpose, so the timings do not disturb each other
    const withIndex = await run(d.Model, d.filter, d.sort);
    const withoutIndex = await run(d.Model, d.filter, d.sort, { $natural: 1 });
    const idxMs = await avgLatency(d.Model, d.filter, d.sort);
    const scanMs = await avgLatency(d.Model, d.filter, d.sort, { $natural: 1 });
    const a = withIndex.docsExamined, b = withoutIndex.docsExamined;
    rows.push({
      id: d.id, title: d.title, query: d.shell, concept: d.concept,
      withIndex: { ...withIndex, avgLatencyMs: idxMs }, withoutIndex: { ...withoutIndex, avgLatencyMs: scanMs },
      docsExaminedReductionPercent: a != null && b ? Math.round((1 - a / b) * 1000) / 10 : null
    });
  }
  // text index search (no collection-scan variant exists for $text)
  rows.push({
    id: 'text-search', title: "Text search for 'python'", query: "db.students.find({ $text: { $search: 'python' } })", concept: 'Text index',
    withIndex: await run(Student, { $text: { $search: 'python' } }), withoutIndex: null, docsExaminedReductionPercent: null
  });
  return { note: 'Execution stats come from explain("executionStats"). Latency is averaged over 20 real runs and includes network time to the server.', data: rows };
};
