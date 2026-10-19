# Viva Questions – CampusIQ (CSE494)

Short, easy answers. Learn the ones marked ★ first.

## A. NoSQL and MongoDB basics
1. **★ What is NoSQL?** A group of non-relational databases (key-value, column, document, graph) that store data without fixed tables and are easy to scale out.
2. **★ SQL vs NoSQL?** SQL: tables, fixed schema, joins, vertical scaling. NoSQL (MongoDB): flexible documents, embedding instead of joins, horizontal scaling.
3. **Name the four types of NoSQL databases.** Key-value (Redis), column-oriented (Cassandra), document (MongoDB), graph (Neo4j).
4. **★ What is MongoDB?** An open-source document database that stores data as BSON documents inside collections.
5. **★ What is a document?** One record, like a JSON object with fields and values; it can hold arrays and nested documents.
6. **What is a collection?** A group of documents, like a table, but without a fixed schema.
7. **★ What is BSON?** Binary JSON: the storage format of MongoDB. It adds types such as Date, ObjectId, Int32 and Double.
8. **★ What is ObjectId?** A 12-byte unique `_id` made of a timestamp, random value and counter, created automatically.
9. **What is `_id`?** The primary key of every document; unique and indexed by default.
10. **What is schema-less design?** Documents in one collection may have different fields. In CampusIQ Mongoose still enforces a schema for safety.
11. **Explain MongoDB architecture.** Client → `mongod` server → storage engine (WiredTiger); data is kept in a replica set (primary + secondaries) and can be split across shards.
12. **What is a replica set?** Several copies of the data; one primary takes writes, secondaries copy them and take over if the primary fails.
13. **What is sharding?** Splitting a large collection across servers by a shard key to scale horizontally.
14. **★ What is the CAP theorem?** A distributed system can guarantee only two of Consistency, Availability and Partition tolerance. MongoDB favours consistency and partition tolerance (CP).
15. **★ What is MongoDB Atlas?** MongoDB's cloud service: hosted clusters with backup, security and monitoring; we use a free M0 cluster.

## B. Data modelling
16. **★ Embedding vs referencing?** Embedding nests related data inside one document (fast reads). Referencing stores another document's `_id` (no duplication).
17. **★ Where did you embed in CampusIQ?** Skills, projects, certifications and internships inside `students`.
18. **★ Where did you reference?** `jobDrives.companyId`, `applications.studentId` and `applications.driveId`.
19. **When should you not embed?** When the data is shared by many parents, grows without limit or is queried on its own.
20. **★ How did you model many-to-many?** Students and drives are linked through the `applications` collection (junction), with a unique `{studentId, driveId}` index.
21. **How did you model one-to-one?** `predictions.studentId` is unique, so a student has at most one prediction.
22. **How did you model one-to-many?** A company has many drives; each drive stores `companyId`.
23. **Does MongoDB have foreign keys?** No. We check references in code (drive needs an existing company) and delete dependent applications ourselves.

## C. CRUD and Mongoose
24. **★ What are the CRUD operations?** Create (`insertOne`, `insertMany`), Read (`find`, `findOne`), Update (`updateOne`, `updateMany`), Delete (`deleteOne`, `deleteMany`).
25. **`updateOne` vs `updateMany`?** `updateOne` changes the first matching document; `updateMany` changes all matches.
26. **What does `$set` do?** Changes only the given fields. `$inc` adds to a number, `$push` adds to an array.
27. **★ What is Mongoose?** A Node.js library (ODM) that gives MongoDB schemas, validation, models and query helpers.
28. **What is a schema and a model?** The schema defines fields, types and rules. The model is the class used to query a collection.
29. **★ How do you validate data?** In the Mongoose schema: `required`, `min`/`max`, `enum`, `match`, `unique` (an index). Errors return HTTP 400.
30. **What does `runValidators` do?** It makes Mongoose apply schema validation on updates too.
31. **What is `populate`?** It replaces a stored `_id` with the referenced document (a Mongoose join).
32. **What is PyMongo?** The official Python driver for MongoDB. We use it in `export_dataset.py`.
33. **How does the frontend reach MongoDB?** React → Axios → Express → Mongoose → MongoDB Atlas. The browser never talks to the database.

## D. Indexing and optimisation
34. **★ What is an index?** A sorted structure that lets MongoDB find documents without scanning the whole collection.
35. **Which indexes did you create?** Single (`cgpa`), compound (`branch`, `cgpa`), text (`name`, `skills.name`), and indexes on `studentId`, `driveId`, `status`.
36. **★ What is a compound index?** An index on several fields. The order matters: it supports queries on a prefix of its fields.
37. **Why is `branch` before `cgpa` in `{branch:1, cgpa:-1}`?** Branch is an equality filter and cgpa is the sort/range field (the ESR rule).
38. **★ What is a text index?** An index for word search; queried with `$text` and `$search`.
39. **What is a multikey index?** An index on an array field; one entry per array element (`skills.name`).
40. **What is a unique index?** It rejects duplicates, e.g. `email`. A duplicate gives error E11000 (HTTP 409 in our API).
41. **★ What does `explain("executionStats")` show?** The query plan and real numbers: stage (IXSCAN/COLLSCAN), keys examined, documents examined, documents returned, execution time.
42. **★ COLLSCAN vs IXSCAN?** COLLSCAN reads every document. IXSCAN reads only index entries that match.
43. **What is a good `explain` result?** Documents examined close to documents returned, and no in-memory SORT.
44. **★ What does the Query Optimizer page do?** Shows a slow query, recommends an index with the ESR rule, creates it on a temporary copy and shows `explain` again.
45. **What is the ESR rule?** Index order: Equality fields, then Sort fields, then Range fields.
46. **Do indexes have a cost?** Yes: extra storage and slower writes, so only index fields that queries use.
47. **How do you force a collection scan to compare?** `.hint({ $natural: 1 })`.

## E. Aggregation
48. **★ What is the aggregation framework?** A pipeline of stages where each stage transforms documents, used for grouping, joining and statistics.
49. **★ Explain `$match`, `$group`, `$sort`, `$project`.** `$match` filters; `$group` groups and calculates (`$sum`, `$avg`); `$sort` orders; `$project` chooses and reshapes fields.
50. **★ What is `$lookup`?** A left outer join with another collection (`from`, `localField`, `foreignField`, `as`).
51. **What is `$unwind`?** It splits an array into one document per element (e.g. each student skill).
52. **Why put `$match` early?** It reduces documents for later stages and can use an index.
53. **What is `$facet`?** Runs several sub-pipelines on the same input in one pass (hiring funnel).
54. **Give two aggregations from the project.** Placement % per branch (`$lookup` + `$group`); company-wise hiring (`$match`, `$lookup`, `$unwind`, `$group`, `$sort`).
55. **Why aggregation instead of calculating in JavaScript?** The database does the work next to the data, so less data travels and it is faster.

## F. Machine learning and AI
56. **★ What does the ML model predict?** The probability that a student gets placed.
57. **Which features are used?** CGPA, attendance, DSA, aptitude, communication, number of projects, certifications, internships and skills.
58. **★ Why logistic regression?** Simple, fast and explainable: every feature has a weight. It also scored better than Random Forest on our data.
59. **How did you evaluate it?** 80/20 train-test split; accuracy, precision, recall, F1 and ROC-AUC on the test set (accuracy about 84%).
60. **What do precision and recall mean here?** Precision: of students predicted "placed", how many really were. Recall: of students really placed, how many were found.
61. **How does Node talk to Python?** Node sends a POST request to the FastAPI service `/predict`; the result is saved in the `predictions` collection.
62. **What is the risk level?** Probability ≥ 65% Low risk, 35–65% Medium, below 35% High.
63. **★ How does AI Insights avoid inventing data?** It detects the question's intent, runs a real MongoDB query, and only then writes the answer from the returned rows. The language model never produces the numbers.
64. **What happens without an AI key?** Built-in template answers are used; the page still works.
65. **★ How is Query Lab kept safe?** Only predefined queries exist; the browser sends just an id. Writes happen on temporary scratch collections.

## G. Project and security
66. **Why separate frontend, backend and ML service?** Each part can change independently, and Python is the best language for ML.
67. **How do you protect secrets?** In `.env`, which is listed in `.gitignore`; the API never returns the database URI or keys.
68. **What is NoSQL injection and how do you prevent it?** An attacker sends operators like `{"$gt": ""}` in input. `express-mongo-sanitize` removes them and Mongoose casts types.
69. **How are errors handled?** Central error middleware returns clean JSON for validation (400), duplicates (409), missing items (404); the server does not crash.
70. **What are the limitations?** Synthetic demo data, no login, fixed AI question types.
