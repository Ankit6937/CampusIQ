// Query Lab: a fixed list of safe, predefined MongoDB queries. The frontend can only pick an id -
// it can never send its own query, so no arbitrary or destructive command can be executed.
const mongoose = require('mongoose');
const { Student, Application } = require('../models');
const analytics = require('./analyticsService');
const perf = require('./performanceService');
const optimizer = require('./optimizerService');

const cut = (r) => (Array.isArray(r) ? r.slice(0, 25) : r);
const statsOf = (p) => p.then(perf.extractStats).catch(() => null);

async function findQ(Model, filter, { sort, limit, select, projection } = {}) {
  const make = () => { let q = Model.find(filter, projection); if (sort) q = q.sort(sort); if (limit) q = q.limit(limit); if (select) q = q.select(select); return q; };
  return { result: await make().lean(), stats: await statsOf(make().explain('executionStats')) };
}
async function aggQ(Model, pipeline) {
  return { result: await Model.aggregate(pipeline), stats: await statsOf(Model.aggregate(pipeline).explain('executionStats')) };
}
const scratch = () => mongoose.connection.db.collection(`lab_scratch_${Date.now()}_${Math.floor(Math.random() * 1e6)}`);

const QUERIES = [
  // ---------- CRUD ----------
  { id: 'crud-find', category: 'CRUD', title: 'find() with filter, projection, sort and limit', description: 'Top 5 students with CGPA >= 9.',
    shell: 'db.students.find({ cgpa: { $gte: 9 } }, { name: 1, branch: 1, cgpa: 1, _id: 0 }).sort({ cgpa: -1 }).limit(5)',
    run: () => findQ(Student, { cgpa: { $gte: 9 } }, { sort: { cgpa: -1 }, limit: 5, select: 'name branch cgpa -_id' }) },
  { id: 'crud-findone', category: 'CRUD', title: 'findOne()', description: 'The single student with the highest CGPA.',
    shell: 'db.students.findOne({}, {}, { sort: { cgpa: -1 } })',
    run: async () => ({ result: await Student.findOne().sort({ cgpa: -1 }).select('name email branch cgpa').lean() }) },
  { id: 'crud-count-distinct', category: 'CRUD', title: 'countDocuments() and distinct()', description: 'How many CSE students, and which branches exist.',
    shell: "db.students.countDocuments({ branch: 'CSE' }); db.students.distinct('branch')",
    run: async () => ({ result: { cseStudents: await Student.countDocuments({ branch: 'CSE' }), branches: (await Student.distinct('branch')).sort() } }) },
  { id: 'crud-single-lifecycle', category: 'CRUD', title: 'insertOne -> updateOne -> deleteOne', description: 'Runs on a temporary scratch collection which is dropped afterwards. Real data is not touched.',
    shell: "col.insertOne({...}); col.updateOne({ name: 'Demo' }, { $set: {...}, $inc: {...} }); col.deleteOne({ name: 'Demo' })",
    run: async () => {
      const col = scratch();
      try {
        const ins = await col.insertOne({ name: 'Demo Student', branch: 'CSE', cgpa: 7.5 });
        const upd = await col.updateOne({ name: 'Demo Student' }, { $set: { branch: 'IT' }, $inc: { cgpa: 0.5 } });
        const doc = await col.findOne({ name: 'Demo Student' });
        const del = await col.deleteOne({ name: 'Demo Student' });
        return { result: { insertedId: ins.insertedId, matched: upd.matchedCount, modified: upd.modifiedCount, documentAfterUpdate: doc, deleted: del.deletedCount } };
      } finally { await col.drop().catch(() => {}); }
    } },
  { id: 'crud-bulk-lifecycle', category: 'CRUD', title: 'insertMany -> updateMany -> deleteMany', description: 'Bulk operations on a temporary scratch collection (dropped afterwards).',
    shell: 'col.insertMany([...5 docs]); col.updateMany({ branch: "CSE" }, { $set: { eligible: true } }); col.deleteMany({ branch: "CSE" })',
    run: async () => {
      const col = scratch();
      try {
        const ins = await col.insertMany(['CSE', 'CSE', 'IT', 'ECE', 'CSE'].map((branch, i) => ({ name: `Demo ${i}`, branch })));
        const upd = await col.updateMany({ branch: 'CSE' }, { $set: { eligible: true } });
        const del = await col.deleteMany({ branch: 'CSE' });
        return { result: { inserted: ins.insertedCount, matched: upd.matchedCount, modified: upd.modifiedCount, deleted: del.deletedCount, remaining: await col.countDocuments() } };
      } finally { await col.drop().catch(() => {}); }
    } },

  // ---------- Indexing ----------
  { id: 'idx-list', category: 'Indexing', title: 'List indexes of the students collection', description: 'getIndexes(): single, compound, text and unique indexes.',
    shell: 'db.students.getIndexes()', run: async () => ({ result: await Student.collection.indexes() }) },
  { id: 'idx-single', category: 'Indexing', title: 'Single-field index (cgpa)', description: 'Range query served by the cgpa_1 index.',
    shell: 'db.students.find({ cgpa: { $gte: 8.5 } }).explain("executionStats")', run: () => findQ(Student, { cgpa: { $gte: 8.5 } }, { select: 'name branch cgpa' }) },
  { id: 'idx-compound', category: 'Indexing', title: 'Compound index (branch + cgpa)', description: 'Equality on branch, sort by cgpa: no in-memory sort needed.',
    shell: "db.students.find({ branch: 'CSE', cgpa: { $gte: 8 } }).sort({ cgpa: -1 })", run: () => findQ(Student, { branch: 'CSE', cgpa: { $gte: 8 } }, { sort: { cgpa: -1 }, select: 'name branch cgpa' }) },
  { id: 'idx-vs-scan', category: 'Indexing', title: 'Index scan vs collection scan', description: 'Same query twice: once with the index, once forced to scan every document with hint({ $natural: 1 }).',
    shell: 'db.students.find({ cgpa: { $gte: 8.5 } }).hint({ $natural: 1 }).explain("executionStats")',
    run: async () => ({ result: {
      withIndex: await statsOf(Student.find({ cgpa: { $gte: 8.5 } }).explain('executionStats')),
      withoutIndex: await statsOf(Student.find({ cgpa: { $gte: 8.5 } }).hint({ $natural: 1 }).explain('executionStats'))
    } }) },

  // ---------- Aggregation ----------
  { id: 'agg-branch', category: 'Aggregation', title: 'Branch overview ($lookup, $group, $project)', description: 'Students, average CGPA and placement % per branch.',
    shell: 'db.students.aggregate([ { $lookup: {...applications Selected...} }, { $group: { _id: "$branch", ... } }, { $project: {...} }, { $sort: { branch: 1 } } ])',
    run: async () => ({ result: await analytics.branchOverview() }) },
  { id: 'agg-monthly', category: 'Aggregation', title: 'Monthly application trend', description: '$group by month using $dateToString, then $sort.',
    shell: "db.applications.aggregate([ { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$appliedAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } } ])",
    run: async () => ({ result: await analytics.monthlyApplications() }) },
  { id: 'agg-package-branch', category: 'Aggregation', title: 'Average package by branch', description: '$match Selected, $lookup drives, $group per student, $lookup students, $group per branch.',
    shell: 'db.applications.aggregate([ { $match: { status: "Selected" } }, { $lookup: ... }, { $unwind: ... }, { $group: ... }, ... ])',
    run: async () => ({ result: await analytics.packageByBranch() }) },
  { id: 'agg-funnel', category: 'Aggregation', title: 'Hiring funnel ($facet)', description: 'Several counts computed in one pass with $facet.',
    shell: 'db.applications.aggregate([ { $facet: { applied: [...], aptitude: [...], technical: [...], interview: [...], selected: [...] } } ])',
    run: async () => ({ result: await analytics.funnel() }) },

  // ---------- Lookup ----------
  { id: 'lookup-applications', category: 'Lookup', title: 'Applications with student, drive and company', description: 'Three $lookup + $unwind stages join four collections.',
    shell: 'db.applications.aggregate([ { $sort: { appliedAt: -1 } }, { $limit: 5 }, { $lookup: students }, { $unwind }, { $lookup: jobDrives }, { $unwind }, { $lookup: companies }, { $unwind }, { $project } ])',
    run: () => aggQ(Application, [
      { $sort: { appliedAt: -1 } }, { $limit: 5 },
      { $lookup: { from: Student.collection.name, localField: 'studentId', foreignField: '_id', as: 'student' } }, { $unwind: '$student' },
      { $lookup: { from: 'jobDrives', localField: 'driveId', foreignField: '_id', as: 'drive' } }, { $unwind: '$drive' },
      { $lookup: { from: 'companies', localField: 'drive.companyId', foreignField: '_id', as: 'company' } }, { $unwind: '$company' },
      { $project: { _id: 0, student: '$student.name', branch: '$student.branch', company: '$company.name', job: '$drive.jobTitle', status: 1, appliedAt: 1 } }
    ]) },
  { id: 'lookup-company-hiring', category: 'Lookup', title: 'Company-wise hiring', description: 'Selected applications joined to drives and companies, grouped by company.',
    shell: 'db.applications.aggregate([ { $match: { status: "Selected" } }, { $lookup: jobDrives }, { $unwind }, { $lookup: companies }, { $unwind }, { $group }, { $sort } ])',
    run: async () => ({ result: await analytics.companyHiring(10) }) },

  // ---------- Search ----------
  { id: 'search-text', category: 'Search', title: 'Text index search', description: "Full-text search on name and skills with relevance score.",
    shell: "db.students.find({ $text: { $search: 'python' } }, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).limit(5)",
    run: async () => ({ result: await Student.find({ $text: { $search: 'python' } }, { score: { $meta: 'textScore' }, name: 1, branch: 1 }).sort({ score: { $meta: 'textScore' } }).limit(5).lean(),
      stats: await statsOf(Student.find({ $text: { $search: 'python' } }).explain('executionStats')) }) },
  { id: 'search-regex', category: 'Search', title: 'Regex search on name', description: 'A regex cannot use an index efficiently; compare docsExamined with the text search.',
    shell: "db.students.find({ name: /sh/i }).limit(10)", run: () => findQ(Student, { name: /sh/i }, { limit: 10, select: 'name branch' }) },
  { id: 'search-skills', category: 'Search', title: 'Students having all required skills', description: '$all on the embedded skills array.',
    shell: "db.students.find({ 'skills.name': { $all: ['Python', 'SQL'] } })", run: () => findQ(Student, { 'skills.name': { $all: ['Python', 'SQL'] } }, { limit: 10, select: 'name branch skills.name' }) },

  // ---------- Optimization ----------
  { id: 'opt-no-index', category: 'Optimization', title: 'Query with no supporting index', description: "location has no index, so MongoDB scans every document (COLLSCAN).",
    shell: "db.students.find({ location: 'Pune' }).explain('executionStats')", run: () => findQ(Student, { location: 'Pune' }, { select: 'name location' }) },
  { id: 'opt-esr', category: 'Optimization', title: 'Query Optimizer: apply the ESR rule', description: 'Runs the full bad query -> index -> optimized query demo on a temporary copy.',
    shell: "db.students.createIndex({ branch: 1, cgpa: -1 })", run: async () => ({ result: await optimizer.run('branch-cgpa') }) }
];

exports.list = () => QUERIES.map(({ id, category, title, description, shell }) => ({ id, category, title, description, shell }));

exports.run = async (id) => {
  const q = QUERIES.find((x) => x.id === id);
  if (!q) { const e = new Error('Unknown query id'); e.status = 404; throw e; }
  const t = Date.now();
  const out = await q.run();
  return { id: q.id, category: q.category, title: q.title, description: q.description, shell: q.shell, result: cut(out.result), resultCount: Array.isArray(out.result) ? out.result.length : null, stats: out.stats || null, elapsedMs: Date.now() - t };
};
