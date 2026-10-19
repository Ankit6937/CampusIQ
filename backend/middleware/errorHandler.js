const mongoose = require('mongoose');

function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler: turns Mongoose / MongoDB errors into clean JSON responses.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ');
    return res.status(409).json({ success: false, message: `Duplicate value for: ${field}`, errors: err.keyValue });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  const status = err.status || 500;
  if (status >= 500 && !err.expose) console.error(err);
  // 5xx messages are hidden from clients unless the error is marked safe to show (err.expose)
  res.status(status).json({ success: false, message: status >= 500 && !err.expose ? 'Internal server error' : err.message });
}

module.exports = { notFound, errorHandler };
