# API Documentation

Base URL: `http://localhost:5000/api` · All bodies are JSON · Every response has `"success": true|false`.

**Error format**
```json
{ "success": false, "message": "Validation failed", "errors": { "cgpa": "CGPA must be between 0 and 10" } }
```
| Status | Meaning |
|---|---|
| 400 | Validation error, invalid id, malformed JSON, missing reference |
| 404 | Document or route not found |
| 409 | Duplicate value (email, roll number, company name, student-drive pair) or a company that still has drives |
| 503 | Python ML service not reachable / model not trained |
| 500 | Unexpected server error (message hidden, details in server log) |

## Health
| Method | URL | Purpose | Response |
|---|---|---|---|
| GET | `/health` | API and database status | `{ "status": "ok", "db": "connected" }` |

## Students
| Method | URL | Purpose | Request | Response | Errors |
|---|---|---|---|---|---|
| GET | `/students` | List with search, filters, pagination | Query: `search`, `branch`, `graduationYear`, `minCgpa`, `minAttendance`, `skills` (comma list), `placementStatus` (Placed / Unplaced), `page`, `limit` (max 100), `sortBy` (name, cgpa, attendance, createdAt), `order` (asc/desc) | `{ data: [students], pagination: { page, limit, total, pages } }` | – |
| GET | `/students/:id` | Student with application history and prediction | – | `{ data: { student, applications: [...with drive and company], prediction } }` | 400 bad id, 404 |
| POST | `/students` | Create | `{ name, email, rollNumber, branch, graduationYear, cgpa, attendance, phone?, gender?, location?, dsaScore?, aptitudeScore?, communicationScore?, resumeScore?, skills?: [{name, level}], projects?, certifications?, internships? }` | 201 `{ data: student }` | 400 validation, 409 duplicate email / roll number |
| PUT | `/students/:id` | Update (validators run) | any student fields | `{ data: student }` | 400, 404 |
| DELETE | `/students/:id` | Delete student and their applications and prediction | – | `{ message }` | 400, 404 |

## Companies
| Method | URL | Purpose | Request | Response | Errors |
|---|---|---|---|---|---|
| GET | `/companies` | List, `?search=` by name | – | `{ count, data }` | – |
| GET | `/companies/:id` | Company with its drives | – | `{ data: company, drives: [...] }` | 400, 404 |
| POST | `/companies` | Create | `{ name, industry, location?, website? (http/https), companySize?, description? }` | 201 `{ data }` | 400, 409 duplicate name |
| PUT | `/companies/:id` | Update | any fields | `{ data }` | 400, 404 |
| DELETE | `/companies/:id` | Delete (blocked while drives exist) | – | `{ message }` | 400, 404, 409 |

## Job drives
| Method | URL | Purpose | Request | Response | Errors |
|---|---|---|---|---|---|
| GET | `/drives` | List with company populated, `?status=`, `?companyId=` | – | `{ count, data }` | – |
| GET | `/drives/:id` | One drive | – | `{ data }` | 400, 404 |
| GET | `/drives/:id/eligible-students` | Students meeting CGPA, attendance, branch and required skills (MongoDB query) | – | `{ count, criteria, data: [students] }` (max 200) | 400, 404 |
| POST | `/drives` | Create | `{ companyId, jobTitle, package, driveDate, applicationDeadline, description?, jobType?, location?, minimumCGPA?, minimumAttendance?, requiredSkills?: [], eligibilityBranches?: [], status? }` | 201 `{ data }` | 400 (also when `companyId` does not exist), validation |
| PUT | `/drives/:id` | Update | any fields | `{ data }` | 400, 404 |
| DELETE | `/drives/:id` | Delete drive and its applications | – | `{ message }` | 400, 404 |

## Applications
| Method | URL | Purpose | Request | Response | Errors |
|---|---|---|---|---|---|
| GET | `/applications` | List with student, drive and company populated; `?status=`, `?studentId=`, `?driveId=` | – | `{ count, data }` | – |
| GET | `/applications/:id` | One application | – | `{ data }` | 400, 404 |
| POST | `/applications` | Create | `{ studentId, driveId, status?, aptitudeScore?, technicalScore?, interviewScore?, finalScore?, remarks? }` | 201 `{ data }` | 400 (unknown student/drive, invalid status), 409 already applied |
| PUT | `/applications/:id` | Update, e.g. change status | `{ "status": "Selected" }` | `{ data }` | 400, 404 |
| DELETE | `/applications/:id` | Delete | – | `{ message }` | 400, 404 |

## Skills
`GET /skills`, `GET /skills/:id`, `POST /skills` (`{ name, category?, demandScore?, description? }`), `PUT /skills/:id`, `DELETE /skills/:id` – same pattern. Errors: 400 validation (demandScore 0–100), 404, 409 duplicate name.

## Analytics (aggregation pipelines, all GET)
| URL | Result |
|---|---|
| `/analytics/dashboard` | summary, branches, packagesByBranch, status, skills, companies, monthly, funnel in one call |
| `/analytics/summary` | totalStudents, totalCompanies, activeDrives, totalApplications, selectedStudents, placementRate, averagePackage, highestPackage |
| `/analytics/branches` | per branch: students, avgCgpa, placed, placementPercentage |
| `/analytics/branches/count`, `/analytics/branches/cgpa` | students per branch; average CGPA per branch |
| `/analytics/branches/packages` | per branch: placedStudents, avgPackage, maxPackage |
| `/analytics/years` | per graduation year: students, placed, placementPercentage |
| `/analytics/companies` | per company: hires, avgPackage, maxPackage (`?limit=`) |
| `/analytics/skills` | `{ amongStudents: [{skill, students, category, demandScore}], inDrives: [{skill, drives}] }` |
| `/analytics/status` | applications per status (zero filled) |
| `/analytics/monthly` | applications per month (`YYYY-MM`) |
| `/analytics/funnel` | applications reaching Applied, Aptitude, Technical, Interview, Selected |
| `/analytics/predictions/top`, `/predictions/high-risk`, `/predictions/risk` | top probabilities, lowest probabilities, count per risk level |

## Database performance and Query Lab
| Method | URL | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/performance/indexes` | Indexes of every collection with usage counters | – | `[{ collection, documents, indexes: [{ name, key, unique, text, uses }] }]` |
| GET | `/performance/benchmarks` | Each query with and without index, from `explain("executionStats")` | – | `{ data: [{ title, query, withIndex: {indexUsed, plan, executionTimeMs, docsExamined, keysExamined, nReturned, avgLatencyMs}, withoutIndex: {...}, docsExaminedReductionPercent }] }` |
| GET | `/performance/optimizer` | Optimizer examples | – | `[{ id, title, query }]` |
| POST | `/performance/optimizer/run` | Slow query → recommended index → optimized query (on a temporary copy) | `{ "id": "branch-cgpa" }` | `{ steps: [...], improvement: { docsExaminedBefore, docsExaminedAfter, reductionPercent } }` (404 unknown id) |
| GET | `/query-lab` | List of 20 predefined safe queries | – | `[{ id, category, title, description, shell }]` |
| POST | `/query-lab/run` | Run one predefined query | `{ "id": "idx-vs-scan" }` | `{ result, stats, elapsedMs }` (400 no id, 404 unknown id) |

## ML predictions
| Method | URL | Purpose | Response / errors |
|---|---|---|---|
| GET | `/predictions/model` | Model information and test metrics from the Python service | `{ model, test_metrics, coefficients_standardised, ... }` · 503 if the service is down |
| POST | `/predictions/student/:id` | Predict for one student and save (upsert) | `{ data: prediction }` · 400 bad id, 404, 503 |
| POST | `/predictions/refresh-all` | Re-predict every student (one batch call, one `bulkWrite`) | `{ data: { updated, modelVersion } }` · 503 |

## AI Insights and settings
| Method | URL | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/ai/suggestions` | Example questions | – | `{ aiConfigured, questions: [...] }` |
| POST | `/ai/ask` | Question → intent → aggregation → answer | `{ "question": "Which branch has the highest placement rate?" }` (3–300 chars) | `{ question, intent, answer, explainedBy: "gemini"\|"template"\|"none", rows, source }` · 400 invalid question |
| GET | `/settings/status` | Service status and collection counts (no secrets) | – | `{ api, database, ml, ai }` |

## Python ML service (port 8000)
| Method | URL | Request | Response |
|---|---|---|---|
| GET | `/health` | – | `{ status, modelTrained }` |
| GET | `/model-info` | – | metrics and weights |
| POST | `/predict` | `{ cgpa, attendance, dsaScore, aptitudeScore, communicationScore, projects, certifications, internships, skills }` | `{ placementProbability: 0.83, riskLevel: "Low", predictedPackage: 6.0, importantFactors: [...], modelVersion }` |
| POST | `/predict-batch` | `{ students: [ ... ] }` | `{ predictions: [ ... ] }` |

Invalid input (for example `cgpa: 11`) returns 422; an untrained model returns 503.
