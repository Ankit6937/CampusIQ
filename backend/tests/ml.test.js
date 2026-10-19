// ML bridge tests. No database needed: they use a fake Python service started inside the test.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const request = require('supertest');
const ml = require('../services/mlService');
const app = require('../app')();

let server;
const seen = [];

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      seen.push({ url: req.url, body: body ? JSON.parse(body) : null });
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/predict') res.end(JSON.stringify({ placementProbability: 0.81, riskLevel: 'Low', predictedPackage: 6.4, importantFactors: [], modelVersion: 'test' }));
      else if (req.url === '/model-info') res.end(JSON.stringify({ model: 'Logistic Regression' }));
      else { res.statusCode = 503; res.end(JSON.stringify({ detail: 'Model not trained yet. Run: python train.py' })); }
    });
  });
  await new Promise((r) => server.listen(0, r));
  process.env.PYTHON_API_URL = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

describe('ML service bridge', () => {
  it('maps a student document to model features', () => {
    const f = ml.featuresFromStudent({ cgpa: 7.8, attendance: 88, dsaScore: 75, aptitudeScore: 80, communicationScore: 82, projects: [1, 2, 3], certifications: [1, 2, 3, 4], internships: [1], skills: [1, 2] });
    assert.deepEqual(f, { cgpa: 7.8, attendance: 88, dsaScore: 75, aptitudeScore: 80, communicationScore: 82, projects: 3, certifications: 4, internships: 1, skills: 2 });
  });
  it('sends features to /predict and returns the prediction', async () => {
    const r = await ml.predictFeatures({ cgpa: 8 });
    assert.equal(r.placementProbability, 0.81);
    assert.equal(seen.at(-1).url, '/predict');
  });
  it('GET /api/predictions/model proxies the model info', async () => {
    const r = await request(app).get('/api/predictions/model');
    assert.equal(r.status, 200);
    assert.equal(r.body.data.model, 'Logistic Regression');
  });
  it('an untrained model is reported as 503 with the training command', async () => {
    await assert.rejects(() => ml.call('/predict-batch', {}), (e) => e.status === 503 && /python train\.py/.test(e.message));
  });
  it('invalid student id -> 400', async () => {
    assert.equal((await request(app).post('/api/predictions/student/nope')).status, 400);
  });
  it('unreachable Python service -> 503 with start instructions', async () => {
    const keep = process.env.PYTHON_API_URL;
    process.env.PYTHON_API_URL = 'http://127.0.0.1:1';
    const r = await request(app).get('/api/predictions/model');
    process.env.PYTHON_API_URL = keep;
    assert.equal(r.status, 503);
    assert.match(r.body.message, /uvicorn predict:app/);
  });
});
