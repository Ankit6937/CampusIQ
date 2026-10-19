// These tests need NO database: validation and id checks fail before any query is sent.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../app')();

const ID = '507f1f77bcf86cd799439011';

describe('health and routing', () => {
  it('GET /api/health responds ok', async () => {
    const r = await request(app).get('/api/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'ok');
  });
  it('unknown route returns JSON 404', async () => {
    const r = await request(app).get('/api/does-not-exist');
    assert.equal(r.status, 404);
    assert.equal(r.body.success, false);
  });
  it('malformed JSON body returns 400', async () => {
    const r = await request(app).post('/api/students').set('Content-Type', 'application/json').send('{bad');
    assert.equal(r.status, 400);
  });
});

describe('invalid ids return 400', () => {
  for (const res of ['students', 'companies', 'drives', 'applications', 'skills']) {
    it(`/api/${res}/:id with a bad id`, async () => {
      for (const method of ['get', 'put', 'delete']) {
        const r = await request(app)[method](`/api/${res}/not-an-id`).send({});
        assert.equal(r.status, 400, `${method.toUpperCase()} /api/${res}/not-an-id`);
        assert.equal(r.body.success, false);
      }
    });
  }
  it('eligible-students with a bad drive id', async () => {
    assert.equal((await request(app).get('/api/drives/xyz/eligible-students')).status, 400);
  });
});

describe('validation errors', () => {
  it('student: required fields, email format, ranges and enum', async () => {
    const r = await request(app).post('/api/students').send({ name: 'A', email: 'bad', cgpa: 11, attendance: 120, branch: 'XX' });
    assert.equal(r.status, 400);
    assert.equal(r.body.message, 'Validation failed');
    for (const f of ['name', 'email', 'cgpa', 'attendance', 'branch', 'rollNumber', 'graduationYear']) assert.ok(r.body.errors[f], `missing error for ${f}`);
  });
  it('student: negative CGPA and bad graduation year', async () => {
    const r = await request(app).post('/api/students').send({ name: 'Test', email: 'a@b.co', rollNumber: 'R1', branch: 'CSE', cgpa: -1, attendance: 80, graduationYear: 1999 });
    assert.equal(r.status, 400);
    assert.ok(r.body.errors.cgpa && r.body.errors.graduationYear);
  });
  it('student: NoSQL injection operators are sanitised, not executed', async () => {
    const r = await request(app).post('/api/students').send({ name: 'Test', email: { $gt: '' }, rollNumber: 'R1', branch: 'CSE', cgpa: 8, attendance: 80, graduationYear: 2026 });
    assert.equal(r.status, 400);
  });
  it('company: name and industry are required, website must be a URL', async () => {
    const r = await request(app).post('/api/companies').send({ website: 'ftp://x' });
    assert.equal(r.status, 400);
    assert.ok(r.body.errors.name && r.body.errors.industry && r.body.errors.website);
  });
  it('drive: required fields and negative package', async () => {
    const r = await request(app).post('/api/drives').send({ package: -4 });
    assert.equal(r.status, 400);
    for (const f of ['companyId', 'jobTitle', 'package', 'driveDate', 'applicationDeadline']) assert.ok(r.body.errors[f], `missing error for ${f}`);
  });
  it('drive: malformed companyId is rejected', async () => {
    const r = await request(app).post('/api/drives').send({ companyId: 'abc', jobTitle: 'x', package: 5 });
    assert.equal(r.status, 400);
  });
  it('application: required references and invalid status', async () => {
    const r = await request(app).post('/api/applications').send({ status: 'Hired' });
    assert.equal(r.status, 400);
    assert.ok(r.body.errors.studentId && r.body.errors.driveId && r.body.errors.status);
  });
  it('application: malformed studentId is rejected', async () => {
    const r = await request(app).post('/api/applications').send({ studentId: 'abc', driveId: ID });
    assert.equal(r.status, 400);
  });
  it('skill: name required and demandScore range', async () => {
    const r = await request(app).post('/api/skills').send({ demandScore: 500 });
    assert.equal(r.status, 400);
    assert.ok(r.body.errors.name && r.body.errors.demandScore);
  });
});

describe('Query Lab safety', () => {
  it('rejects a request without an id', async () => {
    assert.equal((await request(app).post('/api/query-lab/run').send({})).status, 400);
  });
  it('rejects arbitrary query text (only predefined ids are accepted)', async () => {
    const r = await request(app).post('/api/query-lab/run').send({ id: 'db.students.deleteMany({})' });
    assert.equal(r.status, 404);
  });
  it('lists the predefined queries with all six categories', async () => {
    const r = await request(app).get('/api/query-lab');
    assert.equal(r.status, 200);
    const cats = new Set(r.body.data.map((q) => q.category));
    for (const c of ['CRUD', 'Indexing', 'Aggregation', 'Lookup', 'Search', 'Optimization']) assert.ok(cats.has(c), c);
  });
  it('optimizer rejects unknown examples', async () => {
    assert.equal((await request(app).post('/api/performance/optimizer/run').send({ id: 'nope' })).status, 404);
  });
});
