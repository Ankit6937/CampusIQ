# Database Design – CampusIQ

Database: `campusiq` on MongoDB (Atlas or local). Six collections. Data is modelled around how the application reads it.

## 1. Collections at a glance

| Collection | Purpose | Key fields |
|---|---|---|
| `students` | One document per student, with skills, projects, certifications and internships **embedded** | name, email (unique), rollNumber (unique), branch, graduationYear, cgpa, attendance, scores, `skills[]`, `projects[]`, `certifications[]`, `internships[]` |
| `companies` | Recruiting companies | name (unique), industry, location, website, companySize |
| `jobDrives` | A job opening of a company | `companyId` → companies, jobTitle, package (LPA), minimumCGPA, minimumAttendance, requiredSkills[], eligibilityBranches[], driveDate, applicationDeadline, status |
| `applications` | A student applying to a drive | `studentId` → students, `driveId` → jobDrives, status, aptitude / technical / interview / final scores, remarks |
| `skills` | Skill master list | name (unique), category, demandScore |
| `predictions` | ML output | `studentId` → students (unique), placementProbability, predictedPackage, riskLevel, importantFactors[], modelVersion |

## 2. Relationships

```
companies 1 ───< jobDrives 1 ───< applications >─── 1 students 1 ─── 1 predictions
                                                       students >───< skills   (by skill name)
```

| Type | Where | How it is stored |
|---|---|---|
| One-to-one | student ↔ prediction | `predictions.studentId` has a **unique index**, so a student has at most one prediction |
| One-to-many | company → job drives | each drive stores `companyId` (reference) |
| One-to-many | student → applications, drive → applications | each application stores `studentId` and `driveId` |
| Many-to-many | students ↔ job drives | resolved by the `applications` collection (a junction collection). A unique compound index `{studentId, driveId}` stops duplicate applications |
| Many-to-many | students ↔ skills | the student embeds skill names; `skills` holds the master data (category, demand). They are joined by name with `$lookup` |

## 3. Embedding vs referencing – decisions

| Data | Choice | Reason |
|---|---|---|
| Student skills, projects, certifications, internships | **Embedded** arrays | They belong to one student, are always read with the student, and stay small. One read returns the whole profile and no join is needed. `skills.name` can still be indexed (multikey index). |
| Drive → company | **Referenced** (`companyId`) | A company is shared by many drives. Embedding would copy company data into every drive and make updates inconsistent. |
| Application → student and drive | **Referenced** | Applications are the fastest growing data and are queried alone (filter by status, by student, by drive). Embedding them would make student or drive documents grow without limit. |
| Prediction | **Separate collection** | It is produced by another system (the Python model) and is overwritten whenever the model runs. |

MongoDB has no foreign keys, so the API checks references in application code: a drive needs an existing company, an application needs an existing student and drive, deleting a student/drive removes its applications, and a company with drives cannot be deleted.

## 4. Validation and constraints

Enforced with Mongoose schemas (and unique indexes in MongoDB):

* `name`, `email`, `rollNumber`, `branch`, `graduationYear`, `cgpa`, `attendance` are required.
* `email` must match an email pattern and is **unique**; `rollNumber` is **unique**.
* `cgpa` between 0 and 10, `attendance` between 0 and 100, scores 0–100, `graduationYear` 2020–2035.
* `branch` in CSE, ECE, EEE, ME, CE, IT. Application `status` in Applied, Shortlisted, Interview, Selected, Rejected.
* `package` cannot be negative. A student can apply to a drive only once.
* The API returns HTTP 400 with a field-by-field `errors` object for validation errors and 409 for duplicates.
* `express-mongo-sanitize` removes `$` and `.` operators from request bodies (protection against NoSQL injection).

## 5. Indexes

| Collection | Index | Type | Used for |
|---|---|---|---|
| students | `{ cgpa: 1 }` | single | CGPA range queries |
| students | `{ branch: 1, cgpa: -1 }` | compound | filter by branch and sort by CGPA |
| students | `{ name: "text", "skills.name": "text" }` | text | text search on name and skills |
| students | `{ graduationYear: 1 }` | single | filter by year |
| students | `{ email: 1 }`, `{ rollNumber: 1 }` | unique | constraints |
| applications | `{ studentId: 1 }`, `{ driveId: 1 }`, `{ status: 1 }` | single | reference look-ups and status filter |
| applications | `{ studentId: 1, driveId: 1 }` | unique compound | one application per student per drive |
| jobDrives | `{ companyId: 1 }`, `{ status: 1, driveDate: 1 }` | single / compound | company drives, active drives |
| predictions | `{ studentId: 1 }` unique, `{ placementProbability: -1 }` | unique / single | one-to-one, top-N ranking |

The **Database Performance** page and `GET /api/performance/benchmarks` show real `explain("executionStats")` output for these indexes.

## 6. BSON types used

MongoDB stores documents as BSON (binary JSON). Types used in CampusIQ:

| BSON type | Example field | Example value |
|---|---|---|
| String | `students.name` | `"Ananya Sharma"` |
| Double (Number) | `students.cgpa` | `8.45` |
| Int32 | `students.attendance`, `graduationYear` | `88`, `2026` |
| Boolean | `placed` (computed in aggregation) | `true` |
| Array | `students.skills`, `jobDrives.requiredSkills` | `["Python", "SQL"]` |
| Embedded document (Object) | `students.skills[0]` | `{ name: "Python", level: "Advanced" }` |
| ObjectId | `_id`, `jobDrives.companyId` | `ObjectId("6523f1c2a1b2c3d4e5f60718")` |
| Date | `applications.appliedAt` | `ISODate("2026-03-14T09:30:00Z")` |
| Null | `skills.demandScore` from `$ifNull` when a skill is missing | `null` |

Sample documents:

```js
// students (embedding)
{
  _id: ObjectId("..."), name: "Ananya Sharma", email: "ananya.sharma1@campusiq.edu.in", rollNumber: "22CSE001",
  branch: "CSE", graduationYear: 2026, cgpa: 8.45, attendance: 88,
  skills: [ { name: "Python", level: "Advanced" }, { name: "SQL", level: "Intermediate" } ],
  projects: [ { title: "Chat Application", techStack: ["Node.js", "MongoDB"] } ],
  certifications: [ { name: "MongoDB Associate Developer", issuer: "MongoDB University", issuedOn: ISODate("2025-08-01") } ],
  internships: [ { company: "CodeNest Studio", role: "Software Intern", durationMonths: 3 } ],
  dsaScore: 75, aptitudeScore: 80, communicationScore: 82, resumeScore: 70
}

// jobDrives (reference to companies)
{ _id: ObjectId("..."), companyId: ObjectId("<company id>"), jobTitle: "Backend Developer", package: 12.0,
  minimumCGPA: 7.5, requiredSkills: ["Node.js", "MongoDB", "SQL"], eligibilityBranches: ["CSE", "IT"],
  driveDate: ISODate("2026-01-10"), status: "Completed" }

// applications (junction collection)
{ _id: ObjectId("..."), studentId: ObjectId("<student id>"), driveId: ObjectId("<drive id>"),
  status: "Selected", appliedAt: ISODate("2025-12-28"), aptitudeScore: 78, technicalScore: 81, interviewScore: 74, finalScore: 78 }

// predictions (one per student)
{ _id: ObjectId("..."), studentId: ObjectId("<student id>"), placementProbability: 0.83, predictedPackage: 6.0,
  riskLevel: "Low", importantFactors: [ { feature: "Aptitude score", impact: 0.71 } ], modelVersion: "logreg-v1" }
```

## 7. CAP theorem and Atlas

MongoDB is a CP system in the CAP theorem: with a replica set, all writes go to the primary; if the primary is lost, the set elects a new one and writes pause briefly (consistency over availability). Atlas runs every cluster as a 3-node replica set, which also gives high availability and automatic failover.
