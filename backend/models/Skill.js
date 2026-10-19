const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Skill name is required'], unique: true, trim: true },
  category: { type: String, enum: ['Programming', 'Web', 'Database', 'Data & AI', 'Cloud & DevOps', 'Core'], default: 'Programming' },
  demandScore: { type: Number, min: 0, max: 100, default: 50 },
  description: { type: String, trim: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Skill', skillSchema);
