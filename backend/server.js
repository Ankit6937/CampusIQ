require('./config/env');
const createApp = require('./app');
const connectDB = require('./config/db');
const models = require('./models');

const PORT = process.env.PORT || 5000;
const app = createApp();

app.listen(PORT, () => console.log(`CampusIQ API running on http://localhost:${PORT}`));

// Server stays up even if DB is unreachable; /api/health reports the state.
connectDB()
  .then(() => Promise.all(Object.values(models).map((m) => m.init()))) // make sure all indexes exist
  .then(() => console.log('Indexes verified'))
  .catch((err) => console.error('MongoDB connection failed:', err.message));

process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));
