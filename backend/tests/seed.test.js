// Verifies the seed generator without a database: counts, references, constraints and schema validity.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../models');
const generate = require('../seed/generate');
const advisor = require('../services/indexAdvisor');

const now = new Date('2026-10-15T00:00:00Z');
const data = generate({ now });

describe('seed generator', () => {
  it('creates the required amount of data', () => {
    assert.ok(data.students.length >= 100);
    assert.equal(data.companies.length, 15);
    assert.equal(data.drives.length, 20);
    assert.equal(data.applications.length, 300);
    assert.equal(data.skills.length, 20);
    assert.ok(data.predictions.length >= 100);
  });
  it('is deterministic for the same seed', () => {
    const again = generate({ now });
    assert.deepEqual(again.students.map((s) => s.email), data.students.map((s) => s.email));
  });
  it('keeps every reference valid', () => {
    const ids = (a) => new Set(a.map((x) => String(x._id)));
    const S = ids(data.students), D = ids(data.drives), C = ids(data.companies);
    data.drives.forEach((d) => assert.ok(C.has(String(d.companyId))));
    data.applications.forEach((a) => { assert.ok(S.has(String(a.studentId))); assert.ok(D.has(String(a.driveId))); });
    data.predictions.forEach((p) => assert.ok(S.has(String(p.studentId))));
  });
  it('has no duplicate student-drive pairs, emails or roll numbers', () => {
    assert.equal(new Set(data.applications.map((a) => `${a.studentId}-${a.driveId}`)).size, data.applications.length);
    assert.equal(new Set(data.students.map((s) => s.email)).size, data.students.length);
    assert.equal(new Set(data.students.map((s) => s.rollNumber)).size, data.students.length);
  });
  it('selects each student at most once and has one prediction per student', () => {
    const sel = data.applications.filter((a) => a.status === 'Selected').map((a) => String(a.studentId));
    assert.equal(new Set(sel).size, sel.length);
    assert.equal(new Set(data.predictions.map((p) => String(p.studentId))).size, data.predictions.length);
  });
  it('produces varied, meaningful outcomes', () => {
    const rate = data.placedStudents / data.students.length;
    assert.ok(rate > 0.2 && rate < 0.6, `placement rate ${rate}`);
    const statuses = new Set(data.applications.map((a) => a.status));
    for (const s of ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected']) assert.ok(statuses.has(s), s);
    assert.equal(new Set(data.students.map((s) => s.branch)).size, 6);
    assert.ok(data.drives.some((d) => d.status === 'Active'));
  });
  it('every document passes its Mongoose schema', () => {
    const plan = [['Skill', 'skills'], ['Company', 'companies'], ['Student', 'students'], ['JobDrive', 'drives'], ['Application', 'applications'], ['Prediction', 'predictions']];
    for (const [model, key] of plan) for (const doc of data[key]) assert.equal(new M[model](doc).validateSync(), undefined, `${model} invalid`);
  });
});

describe('index advisor (ESR rule)', () => {
  it('puts equality, then sort, then range', () => {
    assert.deepEqual(advisor.analyze({ branch: 'CSE', cgpa: { $gte: 7 } }, { cgpa: -1 }).keys, { branch: 1, cgpa: -1 });
    assert.deepEqual(Object.keys(advisor.analyze({ graduationYear: 2026, branch: 'IT' }, { cgpa: -1 }).keys), ['graduationYear', 'branch', 'cgpa']);
    assert.deepEqual(Object.keys(advisor.analyze({ a: 1, b: { $gt: 3 } }, { c: 1 }).keys), ['a', 'c', 'b']);
  });
});
