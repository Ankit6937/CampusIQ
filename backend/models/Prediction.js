const mongoose = require('mongoose');
const { Schema } = mongoose;

// ONE-TO-ONE: at most one current prediction per student (unique index on studentId)
const predictionSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  placementProbability: { type: Number, required: true, min: 0, max: 1 },
  predictedPackage: { type: Number, min: 0 },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  importantFactors: [{ feature: String, impact: Number }],
  modelVersion: { type: String, default: 'logreg-v1' }
}, { timestamps: true }); // updatedAt shows when the prediction was last recalculated

predictionSchema.index({ placementProbability: -1 });

module.exports = mongoose.model('Prediction', predictionSchema);
