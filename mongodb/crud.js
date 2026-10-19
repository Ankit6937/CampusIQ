// Run with:  mongosh "mongodb://127.0.0.1:27017/campusiq" mongodb/crud.js
// CRUD examples on a scratch collection (does not touch real data).
const c = db.getSiblingDB('campusiq').lab_scratch;
c.drop();

// CREATE
c.insertOne({ name: 'Test Student', branch: 'CSE', cgpa: 8.2, skills: [{ name: 'Python', level: 'Advanced' }] });
c.insertMany([
  { name: 'A', branch: 'IT', cgpa: 7.1 },
  { name: 'B', branch: 'ECE', cgpa: 6.4 },
  { name: 'C', branch: 'CSE', cgpa: 9.0 }
]);

// READ
printjson(c.find({ cgpa: { $gte: 7 } }, { name: 1, cgpa: 1, _id: 0 }).sort({ cgpa: -1 }).toArray());
printjson(c.findOne({ name: 'C' }));

// UPDATE
c.updateOne({ name: 'A' }, { $set: { branch: 'CSE' }, $inc: { cgpa: 0.1 } });
c.updateMany({ branch: 'CSE' }, { $set: { eligible: true } });

// DELETE
c.deleteOne({ name: 'B' });
c.deleteMany({ branch: 'CSE' });

c.drop(); // clean up
