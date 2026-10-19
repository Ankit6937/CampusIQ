// Run with:  mongosh "mongodb://127.0.0.1:27017/campusiq" mongodb/indexes.js
// Creates the same indexes that the Mongoose models define (Unit IV).
const d = db.getSiblingDB('campusiq');

// 1. Single-field index on CGPA (speeds up range queries like cgpa >= 8)
d.students.createIndex({ cgpa: 1 });

// 2. Compound index: equality field (branch) first, then CGPA (descending for top-N sorts)
d.students.createIndex({ branch: 1, cgpa: -1 });

// 3. Text index for searching by name and skill
d.students.createIndex({ name: 'text', 'skills.name': 'text' });

// 4. Unique constraints
d.students.createIndex({ email: 1 }, { unique: true });
d.students.createIndex({ rollNumber: 1 }, { unique: true });

// 5. Application indexes (reference lookups + status filter)
d.applications.createIndex({ studentId: 1 });
d.applications.createIndex({ driveId: 1 });
d.applications.createIndex({ status: 1 });
d.applications.createIndex({ studentId: 1, driveId: 1 }, { unique: true }); // one application per student per drive

// 6. Other collections
d.jobDrives.createIndex({ companyId: 1 });
d.predictions.createIndex({ studentId: 1 }, { unique: true });   // one-to-one with student
d.predictions.createIndex({ placementProbability: -1 });

// Compare indexed vs collection scan with explain():
printjson(d.students.find({ cgpa: { $gte: 8 } }).explain('executionStats').executionStats);
printjson(d.students.find({ cgpa: { $gte: 8 } }).hint({ $natural: 1 }).explain('executionStats').executionStats);
