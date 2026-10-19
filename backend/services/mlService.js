// Node -> Python bridge: asks the FastAPI service (scikit-learn model) for placement predictions.
const mongoose = require('mongoose');
const { Student, Prediction } = require('../models');

const baseUrl = () => (process.env.PYTHON_API_URL || 'http://localhost:8000').replace(/\/$/, '');

class MlError extends Error { constructor(message, status = 503) { super(message); this.status = status; this.expose = true; } } // message is safe and useful for the user

async function call(path, body) {
  let res;
  try {
    res = await fetch(baseUrl() + path, {
      method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000)
    });
  } catch (e) {
    throw new MlError(`ML service is not reachable at ${baseUrl()}. Start it with: cd ml && uvicorn predict:app --port 8000`);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new MlError(res.status === 503 ? (json.detail || 'ML model is not trained. Run: cd ml && python train.py') : `ML service error: ${JSON.stringify(json.detail || json)}`, res.status === 422 ? 400 : 503);
  return json;
}

/** Turns a student document into the numbers the model expects. */
const featuresFromStudent = (s) => ({
  cgpa: s.cgpa, attendance: s.attendance, dsaScore: s.dsaScore || 0, aptitudeScore: s.aptitudeScore || 0, communicationScore: s.communicationScore || 0,
  projects: (s.projects || []).length, certifications: (s.certifications || []).length, internships: (s.internships || []).length, skills: (s.skills || []).length
});

const toPrediction = (studentId, r) => ({
  studentId, placementProbability: r.placementProbability, predictedPackage: r.predictedPackage ?? undefined,
  riskLevel: r.riskLevel, importantFactors: r.importantFactors, modelVersion: r.modelVersion
});

exports.featuresFromStudent = featuresFromStudent;
exports.call = call;
exports.modelInfo = () => call('/model-info');
exports.predictFeatures = (features) => call('/predict', features);

/** Predict for one student and store it (one prediction per student: upsert on the unique studentId). */
exports.predictAndStore = async (studentId) => {
  const student = await Student.findById(studentId);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }
  const result = await call('/predict', featuresFromStudent(student));
  return Prediction.findOneAndUpdate({ studentId: student._id }, toPrediction(student._id, result), { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
};

/** Recalculate every student's prediction with one batch call and one bulkWrite. */
exports.refreshAll = async () => {
  const students = await Student.find().lean();
  if (!students.length) return { updated: 0 };
  const { predictions } = await call('/predict-batch', { students: students.map(featuresFromStudent) });
  const now = new Date();
  await Prediction.bulkWrite(students.map((s, i) => ({
    updateOne: { filter: { studentId: s._id }, update: { $set: { ...toPrediction(s._id, predictions[i]), updatedAt: now }, $setOnInsert: { createdAt: now } }, upsert: true }
  })));
  return { updated: students.length, modelVersion: predictions[0].modelVersion };
};

exports.MlError = MlError;
