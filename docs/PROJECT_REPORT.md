# CampusIQ – Intelligent Student & Placement Analytics System

**Subject:** CSE494 – Intelligent NoSQL Databases · **Type:** Mini project
**Submitted by:** _(your name, roll number, section)_ · **Guide:** _(faculty name)_ · **Academic year:** 2026–27

---

## Abstract
Placement data in most colleges lives in spreadsheets: student marks in one file, company visits in another, results in a third. Nobody can easily ask "which branch is placed best?" or "which students need help before the next drive?". CampusIQ is a full-stack web application that stores this data in MongoDB and turns it into live analytics. Students, companies, job drives and applications are modelled with embedding and referencing. Dashboards are built from real aggregation pipelines. Indexes and `explain()` show query performance, and a Query Optimizer recommends indexes. A Python scikit-learn model predicts every student's placement probability, and an AI Insights page answers plain-English questions from real database results. The project uses MongoDB Atlas, Node.js, Express, Mongoose, React, FastAPI and scikit-learn.

## 1. Introduction
NoSQL databases store data as flexible documents instead of fixed rows and columns. MongoDB, the most popular document database, fits applications whose data is nested (a student with skills, projects and certifications) and changes shape over time. This mini project applies the concepts of CSE494 (data modelling, CRUD, indexing, aggregation, query optimisation, Node.js/Python access and AI-based analytics) to a real problem: campus placement management.

## 2. Problem Statement
Colleges need to manage students, companies, job drives and applications, and need answers to questions such as placement rate per branch, package statistics, skill demand and students at risk. Spreadsheets cannot join this data, cannot be queried quickly, and give no prediction. A system is required that stores the data in a scalable database, validates it, analyses it in real time and predicts placement outcomes.

## 3. Objectives
1. Design a document data model for students, companies, drives, applications, skills and predictions.
2. Demonstrate embedding, referencing and one-to-one, one-to-many and many-to-many relationships.
3. Provide complete CRUD with validation and constraints.
4. Create single, compound and text indexes and measure them with `explain("executionStats")`.
5. Build analytics with the aggregation framework (`$match`, `$group`, `$sort`, `$project`, `$lookup`, `$unwind`).
6. Integrate MongoDB with Node.js (Mongoose) and Python (PyMongo).
7. Predict placement probability with machine learning, and answer questions through an AI assistant that cannot invent data.
8. Deploy the database on MongoDB Atlas.

## 4. Existing System
Excel/Google Sheets files kept by the placement cell: no relationships between files, duplicate and inconsistent entries, manual counting for reports, no validation, no access control over the data, slow search, and no prediction or early warning for weak students.

## 5. Proposed System
CampusIQ keeps all data in one MongoDB database and exposes it through a REST API and a web dashboard. It validates every record, calculates statistics in the database itself (aggregation), shows index performance, predicts placement probability, and answers questions in plain English using the real results.

## 6. Technology Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Recharts, Lucide icons |
| Backend | Node.js, Express.js, Mongoose, express-mongo-sanitize, CORS |
| Database | MongoDB (Atlas cloud) |
| Machine learning | Python, pandas, NumPy, scikit-learn, joblib, PyMongo, FastAPI, Uvicorn |
| AI (optional) | Google Gemini API (falls back to built-in answers without a key) |
| Testing | Node test runner + Supertest, pytest |

## 7. System Architecture
```
React (Vite) ──Axios──> Express API ──Mongoose──> MongoDB Atlas
                            │
                            └──HTTP──> Python FastAPI ──> scikit-learn model
                                              │
                           prediction  <──────┘   (Node stores it in MongoDB)
```
* **Presentation layer:** React pages (Dashboard, Students, Companies, Job Drives, Applications, Analytics, Predictions, Query Lab, Database Performance, AI Insights, Settings).
* **Application layer:** Express routes → controllers → services. Services contain the aggregation pipelines, the performance/`explain` code, the Query Lab, the index advisor, the ML bridge and the AI assistant.
* **Data layer:** MongoDB with six collections.
* **ML layer:** a separate Python service, so the model can be retrained and replaced without touching the Node code.

## 8. Database Design
Six collections: `students`, `companies`, `jobDrives`, `applications`, `skills`, `predictions` (details and sample documents in `DATABASE_DESIGN.md`).

### ER-style relationship explanation
* **One company → many job drives** (each drive stores `companyId`).
* **One student → many applications** and **one drive → many applications**.
* **Students ↔ job drives is many-to-many**, resolved by the `applications` collection (junction), with a unique `{studentId, driveId}` index.
* **Students ↔ skills is many-to-many:** students embed skill names, the `skills` collection stores category and demand score; they are joined with `$lookup`.
* **Student ↔ prediction is one-to-one** (unique index on `predictions.studentId`).

## 9. MongoDB Data Model
Data is modelled around the queries the application runs. A student is read together with skills, projects, certifications and internships, so these are embedded. Applications grow quickly and are queried on their own, so they are separate documents. BSON types used: String, Double, Int32, Boolean, Array, embedded Object, ObjectId, Date and Null.

## 10. Embedding vs Referencing
| | Embedding | Referencing |
|---|---|---|
| Used for | skills, projects, certifications, internships in a student | companyId in a drive, studentId/driveId in an application |
| Benefit | one read, no join, atomic update of the document | no duplication, documents stay small, data can be queried independently |
| Cost | document grows, data duplicated if shared | needs `$lookup`/`populate`, integrity must be checked in code |
| Rule followed | "data that is read together and belongs to one parent stays together" | "shared or fast-growing data is referenced" |

Because MongoDB has no foreign keys, the API checks that referenced documents exist, removes applications when a student or drive is deleted, and refuses to delete a company that still has drives.

## 11. CRUD Operations
REST endpoints for students, companies, job drives, applications and skills (`API_DOCUMENTATION.md`). Mongoose runs validators on create and update. Students support text search, filters (branch, CGPA, attendance, skills, year, placement status) and pagination. Example mapping: `POST` → `insertOne`, `GET` → `find`, `PUT` → `updateOne` (with validators), `DELETE` → `deleteOne`. `mongodb/crud.js` also demonstrates `insertMany`, `updateMany` and `deleteMany`.

## 12. Indexing
Single index `cgpa`; compound index `{branch, cgpa}`; text index on `name` and `skills.name`; indexes on `studentId`, `driveId`, `status`; unique indexes on `email`, `rollNumber` and `{studentId, driveId}`. The **Database Performance** page runs each query twice, with the normal plan and with `hint({ $natural: 1 })` (forced collection scan), and shows plan, index used, execution time, keys examined, documents examined and documents returned from real `explain("executionStats")` output. Nothing is simulated.

## 13. Aggregation
Pipelines (in `analyticsService.js`) compute: total students, students and average CGPA per branch, placement rate, branch-wise placement percentage and by graduation year, average and highest package, package by branch, company-wise hiring, most common and most demanded skills, applications by status, monthly application trend, hiring funnel (`$facet`), and the top and lowest placement probabilities. Stages used: `$match`, `$group`, `$sort`, `$project`, `$lookup` (simple and with `let`/`pipeline`), `$unwind`, `$count`, `$facet`, `$addFields`; accumulators `$sum`, `$avg`, `$max`. The dashboard shows only values returned by these pipelines.

## 14. Query Optimization
The **Query Optimizer** takes a slow query (for example `{branch: "CSE", cgpa: {$gte: 7}}` sorted by CGPA), shows its `explain()` (collection scan and in-memory sort), recommends an index with the **ESR rule** (Equality fields, then Sort fields, then Range fields), creates it on a temporary copy of the collection, and runs `explain()` again. The result shows how many fewer documents are examined and that the sort stage disappears. The real indexes are never changed. The **Query Lab** offers 20 predefined, read-only or scratch-collection queries in six categories; the browser sends only a query id, so arbitrary or destructive commands cannot run.

## 15. AI / Predictive Analytics
**Prediction model.** Features: CGPA, attendance, DSA score, aptitude score, communication score, number of projects, certifications, internships and skills. Algorithm: Logistic Regression with standardised features (simple and interpretable), compared with a Random Forest. A Ridge regression estimates the expected package of placed students. Steps in `train.py`: load → clean → select features → stratified 80/20 split → train → evaluate → save. Risk level: probability ≥ 65% Low, 35–65% Medium, below 35% High. Each prediction lists the three features that contributed most.

**AI Insights.** Question → intent detection (rule based) → MongoDB aggregation → real rows → explanation. A language model (Gemini) is optional and only receives the real rows and is told to use nothing else; without an API key the system writes the explanation from templates. Unknown questions get a polite "cannot answer", never a guess.

## 16. Implementation
Folders: `backend` (models, controllers, routes, services, middleware, seed, tests), `frontend` (pages, components, layouts, services, hooks), `ml` (dataset, train, predict, export, tests), `mongodb` (mongosh scripts), `docs`. The seed script generates 120 students, 15 fictional companies, 20 job drives, 300 applications, 20 skills and 120 predictions with realistic Indian college data. A hidden "ability" value drives marks and outcomes, so aggregations and the ML model show meaningful patterns. Security: `.env` for secrets, input validation and sanitising, CORS, no arbitrary MongoDB commands from the browser. Errors are handled by middleware (validation, duplicate key, invalid id, 404, database connection) so a normal error never crashes the server.

## 17. Testing
* **Backend (Node test runner + Supertest):** validation errors, invalid ids, 404 and malformed JSON, Query Lab safety, seed generator (counts, references, uniqueness, schema validity), index advisor, ML bridge (with a fake ML service), AI intent detection and explanations: **56 tests that need no database**. Additional tests cover CRUD for all five resources, relationships (student → application → drive → company), duplicate and reference rules, every analytics pipeline against a small data set with hand-calculated answers, `explain` output, the Query Optimizer and all Query Lab queries; they run against a test database (`TEST_MONGODB_URI`) or mongodb-memory-server.
* **ML (pytest):** 10 tests: response shape, strong student beats weak student, monotonic effect of CGPA, batch equals single, input validation.
* **Manual:** all pages tested against a seeded MongoDB Atlas cluster.

## 18. Results
* Data loaded: 120 students, 15 companies, 20 drives, 300 applications, 20 skills, 120 predictions; about 35% of students placed (42 of 120).
* Dashboard cards and all charts are produced by aggregation pipelines on the live database.
* Indexed queries examine far fewer documents than collection scans, and the Query Optimizer removes the in-memory sort (exact numbers are shown on the Database Performance page for your data).
* ML model on the 20% test set (216 students): accuracy 83.8%, precision 80.9%, recall 71.4%, F1 75.9%, ROC-AUC 0.91; Logistic Regression outperformed the Random Forest (accuracy 79.6%).
* The demo student (CGPA 7.8, attendance 88, DSA 75, aptitude 80, communication 82, 3 projects, 4 certifications, 1 internship) gets about 83% placement probability, Low risk.

## 19. Advantages
Flexible schema; one read returns a complete student profile; real-time analytics inside the database; measurable query performance; explainable predictions; works without an AI key; clear separation of Node and Python; safe Query Lab; easy to run locally or on Atlas.

## 20. Limitations
* Demo data is synthetic (the model learns from the generated data; real colleges should retrain with their own records using `export_dataset.py`).
* No user login or roles (a single admin is assumed to keep the project simple).
* The AI assistant understands a fixed set of question types.
* Index timings on small data sets are very small; the number of documents examined is the better indicator.
* Predictions are statistical estimates, not guarantees.

## 21. Future Scope
Role-based login (admin, student, company); resume upload and parsing; email notifications for drives; more ML models and automatic retraining; sharding and replica-set monitoring for large colleges; charts exportable as PDF reports; mobile app.

## 22. Conclusion
CampusIQ shows that a document database is a good fit for placement data. Embedding keeps student profiles in one read, references keep shared data consistent, indexes and the aggregation framework deliver fast analytics, and the Node–Python design adds prediction without complicating the main application. The project covers all six units of CSE494 in one working system.

## 23. References
1. MongoDB Documentation – https://www.mongodb.com/docs/
2. MongoDB Atlas Documentation – https://www.mongodb.com/docs/atlas/
3. Mongoose Documentation – https://mongoosejs.com/docs/
4. Express.js – https://expressjs.com/
5. Node.js Documentation – https://nodejs.org/docs/latest/api/
6. scikit-learn User Guide – https://scikit-learn.org/stable/user_guide.html
7. FastAPI Documentation – https://fastapi.tiangolo.com/
8. PyMongo Documentation – https://pymongo.readthedocs.io/
9. React Documentation – https://react.dev/
10. Recharts – https://recharts.org/
11. Chodorow, K. *MongoDB: The Definitive Guide*, O'Reilly Media.
