const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Company name is required'], unique: true, trim: true },
  industry: { type: String, required: [true, 'Industry is required'], trim: true },
  location: { type: String, trim: true },
  website: { type: String, trim: true, match: [/^https?:\/\/.+/, 'Website must start with http:// or https://'] },
  companySize: { type: String, enum: ['Startup', 'Small', 'Medium', 'Large', 'Enterprise'], default: 'Medium' },
  description: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: { createdAt: true, updatedAt: false } });

companySchema.index({ name: 'text', industry: 'text' });

module.exports = mongoose.model('Company', companySchema);
