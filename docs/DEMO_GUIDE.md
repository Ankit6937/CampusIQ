# 10-minute Demo Guide

**Before you start (5 minutes earlier):** Atlas cluster running and your IP allowed · three terminals open and running:
1. `D:\campusiq\backend` → `npm run dev`
2. `D:\campusiq\frontend` → `npm run dev`
3. `D:\campusiq\ml` → `.venv\Scripts\activate` then `uvicorn predict:app --port 8000`

Open `http://localhost:5173`. Check Settings: all rows green. Keep Atlas "Browse Collections" open in a second tab.

| Time | Show | Say |
|---|---|---|
| 0:00 | Title slide, then the sidebar | "CampusIQ analyses student and placement data using MongoDB. Stack: React, Node/Express/Mongoose, MongoDB Atlas, Python scikit-learn." |
| 1:00 | **Dashboard** | "Every number comes from aggregation pipelines, nothing is hard-coded: 120 students, 35% placement rate, package statistics." Point at branch chart and funnel. |
| 2:00 | **Students**: search a name, filter CSE and CGPA ≥ 8, open **Add student**, enter CGPA `15`, press Save | "Mongoose validation rejects it with a clear message. Email and roll number are unique." Open one student: skills, projects, certifications are **embedded** documents. |
| 3:00 | **Job Drives** → **Eligible students** on one drive | "This is a real MongoDB query on CGPA, attendance, branch and `$all` skills. The filter is shown." Mention drives **reference** companies. |
| 4:00 | **Applications**: change one status to Selected | "Applications link students and drives, the many-to-many relationship, with a unique `{studentId, driveId}` index." |
| 5:00 | **Atlas** → Browse Collections | Show the 6 collections and one student document: strings, numbers, arrays, embedded objects, ObjectId, dates (BSON). |
| 6:00 | **Database Performance** → Benchmarks, then Query Optimizer → run `CSE students with CGPA >= 7` | "Same query with and without index. Documents examined drops and the in-memory SORT disappears. The advisor applies the ESR rule." |
| 7:00 | **Query Lab** → Aggregation → *Branch overview*, then Lookup → *Applications with student, drive and company* | "20 predefined safe queries. The browser only sends an id, so no command can be injected." |
| 8:00 | **Predictions** → model card → **Recalculate all with ML**; open a student → **Run ML prediction** | "Logistic Regression, about 84% test accuracy. Flow: Node → FastAPI → scikit-learn → saved back in MongoDB. Key factors explain each prediction." |
| 9:00 | **AI Insights** → click "Which branch has the highest placement rate?" and "What is the average package for CSE?" | "Question → intent → MongoDB aggregation → real rows → explanation. The model cannot invent numbers; without an API key the built-in answers are used." |
| 9:40 | Back to the slides: units covered, limitations, future scope | "Covers Units I–VI. Future: login roles, resume parsing, more ML models." |

## If something fails
* **Dashboard shows an error:** backend terminal not running. Restart `npm run dev`.
* **`MongoDB connection failed`:** Atlas → Network Access → allow your current IP (or `0.0.0.0/0`).
* **ML buttons show "not reachable":** start the ML terminal; the rest of the app still works.
* **Numbers are all 0:** `cd backend` then `npm run seed`.
* **Last resort:** show screenshots of each page (take them beforehand).

## Likely questions
Why embed skills but reference companies? · What does `explain()` show? · What is a compound index and why is the field order important? · How does `$lookup` differ from a SQL join? · Why logistic regression? · How do you stop injection in Query Lab? (See `VIVA_QUESTIONS.md`.)
