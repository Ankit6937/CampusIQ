// Query Optimizer: bad query -> explain -> recommended index -> optimized query -> explain again.
// Runs on a throw-away copy of the students collection, so the real indexes are never touched.
const mongoose = require('mongoose');
const { Student } = require('../models');
const perf = require('./performanceService');
const advisor = require('./indexAdvisor');

const EXAMPLES = [
  { id: 'branch-cgpa', title: 'CSE students with CGPA >= 7, best first', filter: { branch: 'CSE', cgpa: { $gte: 7 } }, sort: { cgpa: -1 } },
  { id: 'location', title: 'Students from Pune', filter: { location: 'Pune' } },
  { id: 'year-branch', title: '2026 IT students, best CGPA first', filter: { graduationYear: 2026, branch: 'IT' }, sort: { cgpa: -1 } },
  { id: 'skill-cgpa', title: 'Python students with CGPA >= 7.5', filter: { 'skills.name': 'Python', cgpa: { $gte: 7.5 } } }
];

const shell = (ex) => `db.students.find(${JSON.stringify(ex.filter)})${ex.sort ? `.sort(${JSON.stringify(ex.sort)})` : ''}`;
const explain = (col, ex) => (ex.sort ? col.find(ex.filter).sort(ex.sort) : col.find(ex.filter)).explain('executionStats').then(perf.extractStats);

exports.list = () => EXAMPLES.map((e) => ({ id: e.id, title: e.title, query: shell(e) }));

exports.run = async (id) => {
  const ex = EXAMPLES.find((e) => e.id === id);
  if (!ex) { const e = new Error('Unknown optimizer example'); e.status = 404; throw e; }
  const col = mongoose.connection.db.collection(`lab_opt_${Date.now()}_${Math.floor(Math.random() * 1e6)}`);
  try {
    const docs = await Student.find().lean();
    if (docs.length) await col.insertMany(docs);
    const before = await explain(col, ex);
    const rec = advisor.analyze(ex.filter, ex.sort);
    await col.createIndex(rec.keys);
    const after = await explain(col, ex);
    const reduction = before.docsExamined ? Math.round((1 - after.docsExamined / before.docsExamined) * 1000) / 10 : null;
    return {
      id: ex.id, title: ex.title, collectionSize: docs.length,
      steps: [
        { step: 1, title: 'Slow query', query: shell(ex), stats: before },
        { step: 2, title: 'Recommended index', rule: rec.rule, createIndex: rec.createIndex, reasons: rec.reasons },
        { step: 3, title: 'Same query with the index', query: shell(ex), stats: after }
      ],
      improvement: {
        docsExaminedBefore: before.docsExamined, docsExaminedAfter: after.docsExamined, reductionPercent: reduction,
        sortStageBefore: /SORT/.test(before.plan), sortStageAfter: /SORT/.test(after.plan)
      }
    };
  } finally {
    await col.drop().catch(() => {});
  }
};
