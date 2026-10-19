const mongoose = require('mongoose');
const models = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// Safe system overview for the Settings page. It never exposes the database URI or API keys.
exports.status = asyncHandler(async (req, res) => {
  const collections = {};
  for (const M of Object.values(models)) collections[M.collection.name] = await M.estimatedDocumentCount().catch(() => null);

  const mlUrl = (process.env.PYTHON_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  let ml = { reachable: false, modelTrained: false };
  try {
    const r = await fetch(`${mlUrl}/health`, { signal: AbortSignal.timeout(3000) });
    const j = await r.json();
    ml = { reachable: true, modelTrained: Boolean(j.modelTrained) };
  } catch (e) { /* ML service not running */ }

  res.json({ success: true, data: {
    api: { status: 'ok', node: process.version, uptimeSeconds: Math.round(process.uptime()) },
    database: { state: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', name: mongoose.connection.name || null, collections },
    ml, ai: { configured: Boolean(process.env.AI_API_KEY), provider: 'Google Gemini', model: process.env.AI_MODEL || 'gemini-2.0-flash' }
  } });
});
