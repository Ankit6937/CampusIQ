// Usage: npm run seed        (clears the 6 collections and refills them with demo data)
require('../config/env');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const M = require('../models');
const generate = require('./generate');

(async () => {
  try {
    await connectDB();
    const data = generate();
    const plan = [['Skill', 'skills'], ['Company', 'companies'], ['Student', 'students'], ['JobDrive', 'drives'], ['Application', 'applications'], ['Prediction', 'predictions']];

    // validate every document with the Mongoose schema before touching the database
    for (const [model, key] of plan) {
      for (const doc of data[key]) {
        const err = new M[model](doc).validateSync();
        if (err) throw new Error(`${model} validation failed: ${err.message}`);
      }
    }
    await Promise.all(Object.values(M).map((m) => m.init())); // make sure indexes exist first
    for (const [model, key] of plan) {
      await M[model].deleteMany({});
      // native driver insert keeps our createdAt/updatedAt values and is fast
      await M[model].collection.insertMany(data[key]);
      console.log(`  ${model.padEnd(12)} ${String(data[key].length).padStart(4)} documents`);
    }
    console.log(`\nPlaced students (at least one Selected application): ${data.placedStudents} of ${data.students.length}`);
    console.log('Seed complete. Start the API with: npm run dev');
  } catch (e) {
    console.error('Seed failed:', e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
