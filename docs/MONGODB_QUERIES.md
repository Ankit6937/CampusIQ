# MongoDB Practical File – CampusIQ

All queries run in `mongosh` on the `campusiq` database (`mongosh "<your connection string>"`, then `use campusiq`). Ready-to-run scripts: `mongodb/crud.js`, `mongodb/indexes.js`. After `npm run seed` the collections contain demo data.

## 1. Create a NoSQL database
```js
use campusiq                          // switches to (and lazily creates) the database
db.createCollection("skills")         // explicit creation
db.getCollectionNames()               // lists collections
db.students.countDocuments()          // 120 after seeding
```
With Mongoose the collections are created from the models in `backend/models`, and `npm run seed` fills them.

## 2. SQL vs NoSQL (same task in both)
| Task | SQL | MongoDB |
|---|---|---|
| Insert | `INSERT INTO students (name, cgpa) VALUES ('Asha', 8.2);` | `db.students.insertOne({ name: "Asha", cgpa: 8.2 })` |
| Select | `SELECT name, cgpa FROM students WHERE cgpa >= 8 ORDER BY cgpa DESC LIMIT 5;` | `db.students.find({ cgpa: { $gte: 8 } }, { name: 1, cgpa: 1 }).sort({ cgpa: -1 }).limit(5)` |
| Update | `UPDATE students SET branch='IT' WHERE rollNumber='22CSE001';` | `db.students.updateOne({ rollNumber: "22CSE001" }, { $set: { branch: "IT" } })` |
| Delete | `DELETE FROM students WHERE cgpa < 5;` | `db.students.deleteMany({ cgpa: { $lt: 5 } })` |
| Group | `SELECT branch, AVG(cgpa) FROM students GROUP BY branch;` | `db.students.aggregate([{ $group: { _id: "$branch", avg: { $avg: "$cgpa" } } }])` |
| Join | `... JOIN applications ON ...` | `$lookup` stage (see section 9) |
| Skills of a student | separate `student_skills` table + join | embedded array `skills: [...]`, one read |

Differences: tables with fixed columns vs flexible documents; joins vs embedding; vertical scaling vs sharding; ACID on rows vs document-level atomicity (plus multi-document transactions).

## 3. CRUD
```js
// CREATE
db.skills.insertOne({ name: "Rust", category: "Programming", demandScore: 55 })
db.skills.insertMany([{ name: "Go", demandScore: 60 }, { name: "Kotlin", demandScore: 50 }])
// READ
db.students.find({ branch: "CSE", cgpa: { $gte: 8.5 } }, { name: 1, cgpa: 1, _id: 0 }).sort({ cgpa: -1 }).limit(5)
db.students.findOne({ rollNumber: "22CSE001" })
db.students.find({ "skills.name": { $all: ["Python", "SQL"] } })       // array query
db.students.find({ $or: [{ branch: "ECE" }, { cgpa: { $gte: 9 } }] })   // $or
// UPDATE
db.skills.updateOne({ name: "Rust" }, { $set: { demandScore: 65 } })
db.skills.updateMany({ demandScore: { $lt: 55 } }, { $inc: { demandScore: 5 } })
db.students.updateOne({ rollNumber: "22CSE001" }, { $push: { skills: { name: "Docker", level: "Beginner" } } })
// DELETE
db.skills.deleteOne({ name: "Rust" })
db.skills.deleteMany({ name: { $in: ["Go", "Kotlin"] } })
```

## 4. BSON
```js
db.students.findOne({}, { cgpa: 1, name: 1, skills: 1, graduationYear: 1 })
typeof db.students.findOne().cgpa                                   // number
db.students.find({ cgpa: { $type: "double" } }).limit(1)            // BSON type check
db.students.find({ graduationYear: { $type: "int" } }).limit(1)
db.applications.find({ appliedAt: { $type: "date" } }).limit(1)
db.jobDrives.find({ companyId: { $type: "objectId" } }).limit(1)
db.students.find({ skills: { $type: "array" } }).limit(1)
ObjectId().getTimestamp()                                           // an ObjectId contains its creation time
```
BSON types used: String, Double, Int32, Boolean, Array, Object (embedded document), ObjectId, Date, Null – see `DATABASE_DESIGN.md`.

## 5. Relationships
```js
// one-to-many: all drives of one company (reference)
const c = db.companies.findOne({ name: "NexaByte Technologies" })
db.jobDrives.find({ companyId: c._id }, { jobTitle: 1, package: 1 })

// many-to-many: drives a student applied to, through the junction collection
const s = db.students.findOne({ rollNumber: "22CSE001" })
db.applications.aggregate([
  { $match: { studentId: s._id } },
  { $lookup: { from: "jobDrives", localField: "driveId", foreignField: "_id", as: "drive" } }, { $unwind: "$drive" },
  { $project: { _id: 0, status: 1, job: "$drive.jobTitle", package: "$drive.package" } }
])

// one-to-one: the prediction of a student
db.predictions.findOne({ studentId: s._id })

// embedding: no join needed for skills
db.students.findOne({ _id: s._id }, { name: 1, skills: 1, projects: 1 })
```

## 6. Validation and constraints
```js
// MongoDB-side validation (the app uses Mongoose validation; this is the native equivalent)
db.createCollection("labStudents", {
  validator: { $jsonSchema: {
    bsonType: "object", required: ["name", "email", "cgpa"],
    properties: {
      name: { bsonType: "string", minLength: 2 },
      email: { bsonType: "string", pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" },
      cgpa: { bsonType: ["double", "int"], minimum: 0, maximum: 10 }
    } } }
})
db.labStudents.insertOne({ name: "A", email: "bad", cgpa: 11 })     // fails: Document failed validation
db.labStudents.createIndex({ email: 1 }, { unique: true })          // unique constraint
db.labStudents.insertOne({ name: "Asha", email: "a@x.in", cgpa: 8 })
db.labStudents.insertOne({ name: "Asha 2", email: "a@x.in", cgpa: 8 }) // fails: E11000 duplicate key
db.labStudents.drop()
```
In the app: `cgpa` 0–10, unique `email` and `rollNumber`, enum `status`, unique `{studentId, driveId}`. Try `POST /api/students` with `cgpa: 15` to see the 400 response.

## 7. Indexing
```js
db.students.getIndexes()
db.students.createIndex({ cgpa: 1 })                              // single
db.students.createIndex({ branch: 1, cgpa: -1 })                  // compound (equality field first)
db.students.createIndex({ name: "text", "skills.name": "text" })  // text
db.students.createIndex({ "skills.name": 1 })                     // multikey (array field)
db.students.find({ $text: { $search: "python" } }, { score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" } })
db.students.dropIndex("skills.name_1")
```

## 8. explain()
```js
db.students.find({ cgpa: { $gte: 8.5 } }).explain("executionStats")
// look at: winningPlan.stage (IXSCAN / COLLSCAN), totalKeysExamined, totalDocsExamined, nReturned, executionTimeMillis

db.students.find({ cgpa: { $gte: 8.5 } }).hint({ $natural: 1 }).explain("executionStats")   // forces COLLSCAN
db.students.find({ location: "Pune" }).explain("executionStats")                             // no index: COLLSCAN
db.students.createIndex({ location: 1 })
db.students.find({ location: "Pune" }).explain("executionStats")                             // now IXSCAN, fewer docs examined
db.students.dropIndex("location_1")
```
Good plan: `IXSCAN → FETCH`, `totalDocsExamined` close to `nReturned`. Bad plan: `COLLSCAN`, or an in-memory `SORT` stage. Rule used by the Query Optimizer: **ESR** (Equality, Sort, Range).

## 9. Aggregation
```js
// $match + $group + $sort + $project
db.students.aggregate([
  { $match: { cgpa: { $gte: 6 } } },
  { $group: { _id: "$branch", students: { $sum: 1 }, avgCgpa: { $avg: "$cgpa" } } },
  { $sort: { avgCgpa: -1 } },
  { $project: { _id: 0, branch: "$_id", students: 1, avgCgpa: { $round: ["$avgCgpa", 2] } } }
])

// $unwind: most common student skills
db.students.aggregate([{ $unwind: "$skills" }, { $group: { _id: "$skills.name", students: { $sum: 1 } } }, { $sort: { students: -1 } }, { $limit: 5 }])

// $lookup x2: company-wise hiring
db.applications.aggregate([
  { $match: { status: "Selected" } },
  { $lookup: { from: "jobDrives", localField: "driveId", foreignField: "_id", as: "drive" } }, { $unwind: "$drive" },
  { $lookup: { from: "companies", localField: "drive.companyId", foreignField: "_id", as: "company" } }, { $unwind: "$company" },
  { $group: { _id: "$company.name", hires: { $sum: 1 }, avgPackage: { $avg: "$drive.package" } } },
  { $sort: { hires: -1 } }
])

// $count and $group by date: monthly applications
db.applications.countDocuments({ status: "Selected" })
db.applications.aggregate([{ $group: { _id: { $dateToString: { format: "%Y-%m", date: "$appliedAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }])

// $facet: hiring funnel in one pass
db.applications.aggregate([{ $facet: {
  applied:   [{ $count: "n" }],
  technical: [{ $match: { technicalScore: { $exists: true, $ne: null } } }, { $count: "n" }],
  selected:  [{ $match: { status: "Selected" } }, { $count: "n" }]
} }])
```
The full set (placement rate, package statistics, branch-wise placement %, funnel) is in `backend/services/analyticsService.js`.

## 10. Node.js integration (Mongoose) and Python (PyMongo)
```js
// Mongoose (backend/models/Student.js, controllers/studentController.js)
const Student = require("../models/Student");
await Student.create({ name: "Asha", email: "asha@x.in", rollNumber: "R1", branch: "CSE", graduationYear: 2026, cgpa: 8.2, attendance: 90 });
await Student.find({ branch: "CSE", cgpa: { $gte: 8 } }).sort({ cgpa: -1 }).limit(10);
await Student.findByIdAndUpdate(id, { cgpa: 9 }, { new: true, runValidators: true });
await Student.findByIdAndDelete(id);
await Student.aggregate([{ $group: { _id: "$branch", n: { $sum: 1 } } }]);
```
```python
# PyMongo (ml/export_dataset.py)
from pymongo import MongoClient
db = MongoClient(uri).get_default_database()
for s in db.students.find({"cgpa": {"$gte": 8}}).limit(3):
    print(s["name"], s["cgpa"])
db.applications.aggregate([{"$match": {"status": "Selected"}}, {"$group": {"_id": "$studentId"}}])
```
REST flow: React → Axios → Express → Mongoose → MongoDB Atlas. ML flow: React → Node → FastAPI → scikit-learn → MongoDB.
