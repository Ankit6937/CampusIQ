// Aggregation / analytics / performance / Query Lab tests against a small hand-computed dataset (need MongoDB).
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const db = require('./helpers/db');
const M = require('../models');
const app = require('../app')();

const state = { ok: false };
const dbIt = db.dbTest(state, it);
const get = async (p) => { const r = await request(app).get(p); assert.equal(r.status, 200, p + ' ' + JSON.stringify(r.body)); return r.body.data; };
const post = (p, b) => request(app).post(p).send(b);

// Dataset (expected numbers were calculated by hand):
//  S1 CSE 9.0 (2026) S2 CSE 8.0 (2026) S3 ECE 7.0 (2025) S4 ME 6.5 (2025)
//  D1 Alpha 10 LPA (Active) D2 Alpha 20 LPA (Completed) D3 Beta 5 LPA (Completed)
//  Selected: S1->D2 (20), S2->D1 (10), S3->D3 (5)  => 3 placed students, average 11.67, highest 20
before(async () => {
  Object.assign(state, await db.start());
  if (!state.ok) return;
  await db.clear();
  const base = { graduationYear: 2026, attendance: 90, phone: '9876543210' };
  const [s1, s2, s3, s4] = await M.Student.create([
    { ...base, name: 'Student One', email: 'one@x.edu', rollNumber: 'A1', branch: 'CSE', cgpa: 9.0, skills: [{ name: 'Python' }, { name: 'DSA' }] },
    { ...base, name: 'Student Two', email: 'two@x.edu', rollNumber: 'A2', branch: 'CSE', cgpa: 8.0, skills: [{ name: 'Python' }] },
    { ...base, graduationYear: 2025, name: 'Student Three', email: 'three@x.edu', rollNumber: 'A3', branch: 'ECE', cgpa: 7.0, skills: [{ name: 'Embedded C' }] },
    { ...base, graduationYear: 2025, name: 'Student Four', email: 'four@x.edu', rollNumber: 'A4', branch: 'ME', cgpa: 6.5, skills: [{ name: 'AutoCAD' }] }
  ]);
  await M.Skill.create({ name: 'Python', category: 'Programming', demandScore: 88 });
  const [alpha, beta] = await M.Company.create([{ name: 'Alpha', industry: 'IT' }, { name: 'Beta', industry: 'Manufacturing' }]);
  const d = { driveDate: new Date('2026-12-01'), applicationDeadline: new Date('2026-11-20') };
  const [d1, d2, d3] = await M.JobDrive.create([
    { ...d, companyId: alpha._id, jobTitle: 'Dev', package: 10, status: 'Active', requiredSkills: ['Python'] },
    { ...d, companyId: alpha._id, jobTitle: 'SDE', package: 20, status: 'Completed', requiredSkills: ['Python', 'DSA'] },
    { ...d, companyId: beta._id, jobTitle: 'Eng', package: 5, status: 'Completed', requiredSkills: ['AutoCAD'] }
  ]);
  const at = (day, m) => new Date(`2026-0${m}-${day}T12:00:00Z`);
  const full = { aptitudeScore: 70, technicalScore: 70, interviewScore: 70, finalScore: 70 };
  await M.Application.create([
    { studentId: s1._id, driveId: d2._id, status: 'Selected', appliedAt: at(10, 1), ...full },
    { studentId: s2._id, driveId: d1._id, status: 'Selected', appliedAt: at(11, 1), ...full },
    { studentId: s3._id, driveId: d3._id, status: 'Selected', appliedAt: at(12, 1), ...full },
    { studentId: s1._id, driveId: d1._id, status: 'Rejected', appliedAt: at(10, 2), aptitudeScore: 40 },
    { studentId: s4._id, driveId: d3._id, status: 'Rejected', appliedAt: at(11, 2) },
    { studentId: s2._id, driveId: d2._id, status: 'Shortlisted', appliedAt: at(12, 2) }
  ]);
  await M.Prediction.create([
    { studentId: s1._id, placementProbability: 0.9, riskLevel: 'Low' }, { studentId: s2._id, placementProbability: 0.6, riskLevel: 'Medium' },
    { studentId: s3._id, placementProbability: 0.3, riskLevel: 'High' }, { studentId: s4._id, placementProbability: 0.1, riskLevel: 'High' }
  ]);
});
after(db.stop);

describe('analytics aggregation pipelines', () => {
  dbIt('summary numbers', async () => {
    assert.deepEqual(await get('/api/analytics/summary'), {
      totalStudents: 4, totalCompanies: 2, activeDrives: 1, totalApplications: 6, selectedStudents: 3,
      placementRate: 75, averagePackage: 11.67, highestPackage: 20
    });
  });
  dbIt('branch overview ($lookup + $group)', async () => {
    const rows = await get('/api/analytics/branches');
    const by = Object.fromEntries(rows.map((r) => [r.branch, r]));
    assert.deepEqual([by.CSE.students, by.CSE.avgCgpa, by.CSE.placed, by.CSE.placementPercentage], [2, 8.5, 2, 100]);
    assert.equal(by.ECE.placementPercentage, 100);
    assert.equal(by.ME.placed, 0);
    assert.equal(by.ME.placementPercentage, 0);
  });
  dbIt('students per branch and average CGPA', async () => {
    assert.equal((await get('/api/analytics/branches/count')).find((r) => r.branch === 'CSE').students, 2);
    assert.equal((await get('/api/analytics/branches/cgpa')).find((r) => r.branch === 'CSE').avgCgpa, 8.5);
  });
  dbIt('average package by branch', async () => {
    const by = Object.fromEntries((await get('/api/analytics/branches/packages')).map((r) => [r.branch, r]));
    assert.deepEqual([by.CSE.avgPackage, by.CSE.maxPackage, by.CSE.placedStudents], [15, 20, 2]);
    assert.equal(by.ECE.avgPackage, 5);
  });
  dbIt('placement by graduation year', async () => {
    const by = Object.fromEntries((await get('/api/analytics/years')).map((r) => [r.year, r]));
    assert.deepEqual([by[2025].students, by[2025].placed, by[2025].placementPercentage], [2, 1, 50]);
    assert.equal(by[2026].placementPercentage, 100);
  });
  dbIt('company-wise hiring sorted by hires', async () => {
    const rows = await get('/api/analytics/companies');
    assert.deepEqual(rows.map((r) => [r.company, r.hires, r.avgPackage]), [['Alpha', 2, 15], ['Beta', 1, 5]]);
  });
  dbIt('skills among students and in drives', async () => {
    const s = await get('/api/analytics/skills');
    const python = s.amongStudents.find((x) => x.skill === 'Python');
    assert.deepEqual([python.students, python.demandScore], [2, 88]);
    assert.equal(s.inDrives.find((x) => x.skill === 'Python').drives, 2);
  });
  dbIt('applications by status (zero-filled) and monthly trend', async () => {
    const st = Object.fromEntries((await get('/api/analytics/status')).map((r) => [r.status, r.count]));
    assert.deepEqual(st, { Applied: 0, Shortlisted: 1, Interview: 0, Selected: 3, Rejected: 2 });
    assert.deepEqual(await get('/api/analytics/monthly'), [{ month: '2026-01', count: 3 }, { month: '2026-02', count: 3 }]);
  });
  dbIt('hiring funnel ($facet)', async () => {
    assert.deepEqual((await get('/api/analytics/funnel')).map((r) => r.count), [6, 4, 3, 3, 3]);
  });
  dbIt('predictions: top, high risk, distribution', async () => {
    assert.equal((await get('/api/analytics/predictions/top'))[0].name, 'Student One');
    const high = await get('/api/analytics/predictions/high-risk');
    assert.deepEqual(high.map((r) => r.probability), [0.1, 0.3]);
    assert.deepEqual(Object.fromEntries((await get('/api/analytics/predictions/risk')).map((r) => [r.riskLevel, r.count])), { High: 2, Low: 1, Medium: 1 });
  });
  dbIt('dashboard bundles every section', async () => {
    const d = await get('/api/analytics/dashboard');
    for (const k of ['summary', 'branches', 'packagesByBranch', 'status', 'skills', 'companies', 'monthly', 'funnel']) assert.ok(d[k], k);
  });
});

describe('performance (explain)', () => {
  dbIt('lists indexes including single, compound and text', async () => {
    const students = (await get('/api/performance/indexes')).find((c) => c.collection === 'students');
    const names = students.indexes.map((i) => i.name);
    assert.ok(names.includes('cgpa_1') && names.includes('branch_1_cgpa_-1'));
    assert.ok(students.indexes.some((i) => i.text));
  });
  dbIt('benchmarks return real explain stats for indexed and non-indexed runs', async () => {
    const r = await request(app).get('/api/performance/benchmarks');
    assert.equal(r.status, 200);
    const cgpa = r.body.data.find((x) => x.id === 'cgpa-range');
    assert.equal(cgpa.withIndex.indexUsed, 'cgpa_1');
    assert.match(cgpa.withoutIndex.indexUsed, /COLLSCAN/);
    assert.equal(cgpa.withoutIndex.docsExamined, 4);
  });
  dbIt('optimizer: slow query -> recommended index -> fewer documents examined', async () => {
    const r = await post('/api/performance/optimizer/run', { id: 'branch-cgpa' });
    assert.equal(r.status, 200);
    const { steps, improvement } = r.body.data;
    assert.match(steps[0].stats.indexUsed, /COLLSCAN/);
    assert.equal(steps[1].createIndex, 'db.students.createIndex({"branch":1,"cgpa":-1})');
    assert.equal(steps[2].stats.indexUsed, 'branch_1_cgpa_-1');
    assert.ok(improvement.docsExaminedAfter <= improvement.docsExaminedBefore);
    assert.equal(improvement.sortStageAfter, false);
  });
});

describe('Query Lab with data', () => {
  dbIt('every predefined query runs and returns a result', async () => {
    const list = (await get('/api/query-lab'));
    assert.ok(list.length >= 15);
    for (const q of list) {
      const r = await post('/api/query-lab/run', { id: q.id });
      assert.equal(r.status, 200, `${q.id}: ${JSON.stringify(r.body)}`);
      assert.ok('result' in r.body.data, q.id);
    }
  });
  dbIt('scratch CRUD demos leave real data untouched', async () => {
    const before = await M.Student.countDocuments();
    await post('/api/query-lab/run', { id: 'crud-single-lifecycle' });
    await post('/api/query-lab/run', { id: 'crud-bulk-lifecycle' });
    assert.equal(await M.Student.countDocuments(), before);
  });
});
