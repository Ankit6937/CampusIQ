// Test database helper.
//  1) If TEST_MONGODB_URI is set, that database is used (its name MUST contain "test": tests delete all data).
//  2) Otherwise mongodb-memory-server starts a temporary MongoDB (downloads the binary on first run).
//  3) If neither works, database tests are skipped with a clear message instead of failing.
const mongoose = require('mongoose');
const models = require('../../models');

let server = null;
let usedUri = false;

exports.start = async () => {
  const uri = process.env.TEST_MONGODB_URI;
  if (uri) {
    const m = uri.match(/\/([^/?]+)(\?|$)/);
    if (!m || !/test/i.test(m[1])) throw new Error('TEST_MONGODB_URI must point to a database whose name contains "test" (e.g. campusiq_test). Tests wipe the database.');
  }
  try {
    let target = uri;
    if (uri) usedUri = true;
    else {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      server = await MongoMemoryServer.create();
      target = server.getUri('campusiq_test');
    }
    await mongoose.connect(target, { serverSelectionTimeoutMS: 20000 });
    await Promise.all(Object.values(models).map((m) => m.init())); // build unique indexes before tests
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `No test database available (${e.message.split('\n')[0]}). Set TEST_MONGODB_URI or allow mongodb-memory-server to download MongoDB.` };
  }
};

exports.clear = () => Promise.all(Object.values(models).map((m) => m.deleteMany({})));

exports.stop = async () => {
  try { if (usedUri && mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); } catch (e) { /* ignore */ }
  await mongoose.disconnect();
  if (server) await server.stop();
};

// Runs a test only when the database is ready; otherwise marks it as skipped.
exports.dbTest = (state, it) => (name, fn) => it(name, async (t) => {
  if (!state.ok) return t.skip(state.reason);
  await fn(t);
});
