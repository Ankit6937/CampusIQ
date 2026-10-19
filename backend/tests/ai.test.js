// AI Insights tests: intent detection and explanations, with no database and no AI key needed.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const ai = require('../services/aiService');
const app = require('../app')();

const intentOf = (q) => (ai.detectIntent(q) || {}).id || null;

describe('intent detection', () => {
  const cases = [
    ['Which branch has the highest placement rate?', 'best_branch_placement'],
    ['Which skills are most demanded?', 'top_skills'],
    ['Which students are at high placement risk?', 'high_risk'],
    ['What is the average package for CSE?', 'avg_package'],
    ['Which company hired the most students?', 'top_company'],
    ['What is the overall placement rate?', 'placement_rate'],
    ['What is the highest package offered?', 'highest_package'],
    ['What is the average CGPA of each branch?', 'avg_cgpa'],
    ['How many applications are selected or rejected?', 'application_status'],
    ['Which students have the highest placement probability?', 'top_predicted'],
    ['who has the best chance of getting placed', 'top_predicted']
  ];
  for (const [q, id] of cases) it(`"${q}" -> ${id}`, () => assert.equal(intentOf(q), id));
  it('returns null for unrelated questions (no guessing)', () => {
    assert.equal(intentOf('tell me a joke'), null);
    assert.equal(intentOf('what is the weather today'), null);
  });
  it('every suggested example maps to its own intent', () => {
    for (const i of ai.INTENTS) assert.equal(intentOf(i.example), i.id, i.example);
  });
});

describe('branch detection', () => {
  it('finds branches without mistaking "it" or "me"', () => {
    assert.equal(ai.findBranch('average package for CSE'), 'CSE');
    assert.equal(ai.findBranch('average package for cse students'), 'CSE');
    assert.equal(ai.findBranch('IT branch placement'), 'IT');
    assert.equal(ai.findBranch('tell me what it is and give me the number'), null);
    assert.equal(ai.findBranch('mechanical students'), 'ME');
  });
});

describe('explanations are built only from the data rows', () => {
  const get = (id) => ai.INTENTS.find((i) => i.id === id);
  it('best branch', () => {
    const text = get('best_branch_placement').describe({ rows: [{ branch: 'IT', placementPercentage: 50, placed: 10, students: 20 }, { branch: 'CSE', placementPercentage: 40, placed: 8, students: 20 }, { branch: 'ME', placementPercentage: 10, placed: 1, students: 10 }] });
    assert.match(text, /IT has the highest placement rate: 50%/);
    assert.match(text, /ME has the lowest at 10%/);
  });
  it('average package for one branch', () => {
    const text = get('avg_package').describe({ rows: [{ branch: 'CSE', avgPackage: 7.5, maxPackage: 18, placedStudents: 12 }], meta: { branch: 'CSE' } });
    assert.match(text, /CSE students get an average package of ₹7.5 LPA/);
  });
  it('empty result for a branch has its own honest message', () => {
    assert.match(get('avg_package').emptyText({ meta: { branch: 'CE' } }), /No CE student has been placed/);
  });
});

describe('POST /api/ai/ask', () => {
  it('rejects a missing or too short question', async () => {
    assert.equal((await request(app).post('/api/ai/ask').send({})).status, 400);
    assert.equal((await request(app).post('/api/ai/ask').send({ question: 'hi' })).status, 400);
    assert.equal((await request(app).post('/api/ai/ask').send({ question: 'x'.repeat(301) })).status, 400);
  });
  it('answers an unknown question without calling the database', async () => {
    const r = await request(app).post('/api/ai/ask').send({ question: 'tell me a joke please' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.intent, null);
    assert.equal(r.body.data.explainedBy, 'none');
  });
  it('lists suggestions and says whether an AI key is configured', async () => {
    const r = await request(app).get('/api/ai/suggestions');
    assert.equal(r.status, 200);
    assert.ok(r.body.data.questions.length >= 10);
    assert.equal(typeof r.body.data.aiConfigured, 'boolean');
  });
});
