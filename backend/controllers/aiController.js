const asyncHandler = require('../utils/asyncHandler');
const ai = require('../services/aiService');

exports.suggestions = (req, res) => res.json({ success: true, data: ai.suggestions() });

exports.ask = asyncHandler(async (req, res) => {
  const q = req.body && req.body.question;
  if (typeof q !== 'string' || q.trim().length < 3 || q.length > 300) {
    return res.status(400).json({ success: false, message: 'Please send a "question" between 3 and 300 characters.' });
  }
  res.json({ success: true, data: await ai.ask(q.trim()) });
});
