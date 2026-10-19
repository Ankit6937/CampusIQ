// CRUD + relationship tests (need MongoDB: see tests/helpers/db.js).
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const db = require('./helpers/db');
const app = require('../app')();

const state = { ok: false };
const dbIt = db.dbTest(state, it);
let n = 0;
const uid = () => `${Date.now().toString(36)}${n++}`;
const student = (o = {}) => ({ name: 'Test Student', email: `t${uid()}@x.edu`, rollNumber: `R${uid()}`, branch: 'CSE', graduationYear: 2026, cgpa: 8, attendance: 85, skills: [{ name: 'Python', level: 'Advanced' }], ...o });
const company = (o = {}) => ({ name: `Company ${uid()}`, industry: 'IT Services', location: 'Pune', ...o });
const drive = (companyId, o = {}) => ({ companyId, jobTitle: 'Engineer', package: 8, driveDate: '2026-12-01', applicationDeadline: '2026-11-25', minimumCGPA: 7, minimumAttendance: 75, requiredSkills: ['Python'], eligibilityBranches: ['CSE', 'IT'], ...o });
const post = async (path, body, status = 201) => { const r = await request(app).post(path).send(body); assert.equal(r.status, status, JSON.stringify(r.body)); return r.body.data; };

before(async () => { Object.assign(state, await db.start()); });
after(db.stop);
beforeEach(async () => { if (state.ok) await db.clear(); });

describe('students', () => {
  dbIt('create, read, update, delete', async () => {
    const s = await post('/api/students', student({ name: 'Asha Rao' }));
    assert.ok(s._id);
    assert.equal((await request(app).get(`/api/students/${s._id}`)).body.data.student.name, 'Asha Rao');
    const upd = await request(app).put(`/api/students/${s._id}`).send({ cgpa: 9.1 });
    assert.equal(upd.status, 200);
    assert.equal(upd.body.data.cgpa, 9.1);
    assert.equal((await request(app).delete(`/api/students/${s._id}`)).status, 200);
    assert.equal((await request(app).get(`/api/students/${s._id}`)).status, 404);
  });
  dbIt('rejects duplicate email and roll number with 409', async () => {
    const s = await post('/api/students', student());
    assert.equal((await request(app).post('/api/students').send(student({ email: s.email }))).status, 409);
    assert.equal((await request(app).post('/api/students').send(student({ rollNumber: s.rollNumber }))).status, 409);
  });
  dbIt('update runs validators (invalid CGPA -> 400) and unknown id -> 404', async () => {
    const s = await post('/api/students', student());
    assert.equal((await request(app).put(`/api/students/${s._id}`).send({ cgpa: 12 })).status, 400);
    assert.equal((await request(app).put('/api/students/507f1f77bcf86cd799439011').send({ cgpa: 8 })).status, 404);
  });
  dbIt('lists with search, filters and pagination', async () => {
    await post('/api/students', student({ name: 'Priya Nair', branch: 'IT', cgpa: 9.2 }));
    await post('/api/students', student({ name: 'Rohan Das', branch: 'CSE', cgpa: 6.5, skills: [{ name: 'Java' }] }));
    await post('/api/students', student({ name: 'Kavya Iyer', branch: 'CSE', cgpa: 8.8 }));
    const q = async (qs) => (await request(app).get(`/api/students?${qs}`)).body;
    assert.equal((await q('search=priya')).data.length, 1);
    assert.equal((await q('branch=CSE')).data.length, 2);
    assert.equal((await q('minCgpa=8.5')).data.length, 2);
    assert.equal((await q('skills=Java')).data.length, 1);
    const page = await q('limit=2&page=2');
    assert.equal(page.data.length, 1);
    assert.equal(page.pagination.total, 3);
    assert.equal(page.pagination.pages, 2);
  });
  dbIt('deleting a student also deletes their applications', async () => {
    const s = await post('/api/students', student());
    const d = await post('/api/drives', drive((await post('/api/companies', company()))._id));
    await post('/api/applications', { studentId: s._id, driveId: d._id });
    await request(app).delete(`/api/students/${s._id}`);
    assert.equal((await request(app).get('/api/applications')).body.count, 0);
  });
});

describe('companies', () => {
  dbIt('create, read, update, delete and search', async () => {
    const c = await post('/api/companies', company({ name: 'Zeta Corp' }));
    assert.equal((await request(app).get(`/api/companies/${c._id}`)).body.data.name, 'Zeta Corp');
    assert.equal((await request(app).get('/api/companies?search=zeta')).body.count, 1);
    assert.equal((await request(app).put(`/api/companies/${c._id}`).send({ industry: 'FinTech' })).body.data.industry, 'FinTech');
    assert.equal((await request(app).delete(`/api/companies/${c._id}`)).status, 200);
    assert.equal((await request(app).get(`/api/companies/${c._id}`)).status, 404);
  });
  dbIt('duplicate name -> 409; company with drives cannot be deleted', async () => {
    const c = await post('/api/companies', company({ name: 'Dup Inc' }));
    assert.equal((await request(app).post('/api/companies').send(company({ name: 'Dup Inc' }))).status, 409);
    await post('/api/drives', drive(c._id));
    assert.equal((await request(app).delete(`/api/companies/${c._id}`)).status, 409);
  });
  dbIt('company details include its drives (one-to-many)', async () => {
    const c = await post('/api/companies', company());
    await post('/api/drives', drive(c._id));
    await post('/api/drives', drive(c._id, { jobTitle: 'Analyst' }));
    assert.equal((await request(app).get(`/api/companies/${c._id}`)).body.drives.length, 2);
  });
});

describe('job drives', () => {
  dbIt('create, read (company populated), update, delete', async () => {
    const c = await post('/api/companies', company({ name: 'Orbit Labs' }));
    const d = await post('/api/drives', drive(c._id));
    const got = (await request(app).get(`/api/drives/${d._id}`)).body.data;
    assert.equal(got.companyId.name, 'Orbit Labs');
    assert.equal((await request(app).put(`/api/drives/${d._id}`).send({ package: 12 })).body.data.package, 12);
    assert.equal((await request(app).put(`/api/drives/${d._id}`).send({ package: -1 })).status, 400);
    assert.equal((await request(app).delete(`/api/drives/${d._id}`)).status, 200);
    assert.equal((await request(app).get(`/api/drives/${d._id}`)).status, 404);
  });
  dbIt('rejects a drive for a company that does not exist', async () => {
    const r = await request(app).post('/api/drives').send(drive('507f1f77bcf86cd799439011'));
    assert.equal(r.status, 400);
    assert.match(r.body.message, /Company not found/);
  });
  dbIt('eligible-students applies CGPA, attendance, branch and skills', async () => {
    const c = await post('/api/companies', company());
    const d = await post('/api/drives', drive(c._id));
    const ok = await post('/api/students', student({ name: 'Eligible' }));
    await post('/api/students', student({ cgpa: 6 }));                                // CGPA too low
    await post('/api/students', student({ attendance: 60 }));                         // attendance too low
    await post('/api/students', student({ branch: 'ME' }));                           // branch not allowed
    await post('/api/students', student({ skills: [{ name: 'Java' }] }));             // missing skill
    const r = await request(app).get(`/api/drives/${d._id}/eligible-students`);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.map((s) => s._id), [ok._id]);
  });
});

describe('applications and relationships', () => {
  dbIt('create, read, update status, delete', async () => {
    const s = await post('/api/students', student());
    const d = await post('/api/drives', drive((await post('/api/companies', company()))._id));
    const a = await post('/api/applications', { studentId: s._id, driveId: d._id });
    assert.equal(a.status, 'Applied');
    const upd = await request(app).put(`/api/applications/${a._id}`).send({ status: 'Selected', finalScore: 88 });
    assert.equal(upd.body.data.status, 'Selected');
    assert.equal((await request(app).get('/api/applications?status=Selected')).body.count, 1);
    assert.equal((await request(app).delete(`/api/applications/${a._id}`)).status, 200);
    assert.equal((await request(app).get(`/api/applications/${a._id}`)).status, 404);
  });
  dbIt('rejects duplicate student-drive pair (409), bad status (400) and missing references (400)', async () => {
    const s = await post('/api/students', student());
    const d = await post('/api/drives', drive((await post('/api/companies', company()))._id));
    await post('/api/applications', { studentId: s._id, driveId: d._id });
    assert.equal((await request(app).post('/api/applications').send({ studentId: s._id, driveId: d._id })).status, 409);
    assert.equal((await request(app).put('/api/applications/507f1f77bcf86cd799439011').send({ status: 'Hired' })).status, 400);
    assert.equal((await request(app).post('/api/applications').send({ studentId: '507f1f77bcf86cd799439011', driveId: d._id })).status, 400);
    assert.equal((await request(app).post('/api/applications').send({ studentId: s._id, driveId: '507f1f77bcf86cd799439011' })).status, 400);
  });
  dbIt('student -> applications -> drive -> company chain (many-to-many via applications)', async () => {
    const c = await post('/api/companies', company({ name: 'Chain Co' }));
    const d1 = await post('/api/drives', drive(c._id, { jobTitle: 'Dev' }));
    const d2 = await post('/api/drives', drive(c._id, { jobTitle: 'QA' }));
    const s = await post('/api/students', student());
    await post('/api/applications', { studentId: s._id, driveId: d1._id });
    await post('/api/applications', { studentId: s._id, driveId: d2._id });
    const r = (await request(app).get(`/api/students/${s._id}`)).body.data;
    assert.equal(r.applications.length, 2);
    assert.equal(r.applications[0].driveId.companyId.name, 'Chain Co');
    assert.equal((await request(app).get(`/api/applications?driveId=${d1._id}`)).body.count, 1);
  });
  dbIt('deleting a drive also deletes its applications', async () => {
    const s = await post('/api/students', student());
    const d = await post('/api/drives', drive((await post('/api/companies', company()))._id));
    await post('/api/applications', { studentId: s._id, driveId: d._id });
    await request(app).delete(`/api/drives/${d._id}`);
    assert.equal((await request(app).get('/api/applications')).body.count, 0);
  });
});

describe('skills', () => {
  dbIt('create, read, update, delete and duplicate name', async () => {
    const k = await post('/api/skills', { name: 'Rust', category: 'Programming', demandScore: 55 });
    assert.equal((await request(app).post('/api/skills').send({ name: 'Rust' })).status, 409);
    assert.equal((await request(app).put(`/api/skills/${k._id}`).send({ demandScore: 70 })).body.data.demandScore, 70);
    assert.equal((await request(app).put(`/api/skills/${k._id}`).send({ demandScore: 500 })).status, 400);
    assert.equal((await request(app).delete(`/api/skills/${k._id}`)).status, 200);
    assert.equal((await request(app).get(`/api/skills/${k._id}`)).status, 404);
  });
});
