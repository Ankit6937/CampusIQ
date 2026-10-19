# CampusIQ – Intelligent Student & Placement Analytics System (CSE494)

Done so far: backend (models, validation, CRUD APIs), seed data, aggregation analytics, index/explain performance API, Query Optimizer, Query Lab, backend tests.
React web app: Dashboard, Students, Companies, Job Drives (with eligible students), Applications, Analytics, Predictions, Query Lab, Database Performance.
Python ML service (scikit-learn + FastAPI) with Node integration and ML buttons in the UI.
AI Insights (question -> MongoDB aggregation -> explanation), Settings page, full documentation and a PowerPoint presentation.
Everything in the project brief is now built.

## Run it
1. Database: Atlas (put the URI in `backend/.env`) or local: `docker compose up -d`
2. `cp .env.example backend/.env`   (Windows cmd: `copy .env.example backend\.env`) and set `MONGODB_URI`
3. `cd backend && npm install`
4. Fill the database with demo data: `npm run seed`
   (120 students, 15 companies, 20 drives, 300 applications, 20 skills, 120 predictions)
5. Start the API: `npm run dev`

## Run the web app (frontend)
Keep the backend running in one terminal, then open a SECOND terminal:
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 (all pages except AI Insights and Settings).
The frontend talks to http://localhost:5000/api (change it in `frontend/.env`: `VITE_API_URL=...`).

## Run the Python ML service (third terminal)
```
cd ml
python -m venv .venv
.venv\Scripts\activate          (Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
python train.py                  (prints accuracy / precision / recall / F1)
uvicorn predict:app --port 8000
```
Then open the **Predictions** page and press **Recalculate all with ML**, or open a student and press **Run ML prediction**.
More details: `ml/README.md`.

## Open in the browser (raw JSON from the API)
- http://localhost:5000/api/health
- http://localhost:5000/api/students?branch=CSE&minCgpa=8
- http://localhost:5000/api/analytics/dashboard   (all dashboard numbers, from aggregation pipelines)
- http://localhost:5000/api/analytics/summary
- http://localhost:5000/api/analytics/branches    (students, avg CGPA, placement % per branch)
- http://localhost:5000/api/analytics/companies   (hires by company)
- http://localhost:5000/api/analytics/skills
- http://localhost:5000/api/analytics/funnel
- http://localhost:5000/api/analytics/predictions/top
- http://localhost:5000/api/performance/indexes     (all indexes per collection)
- http://localhost:5000/api/performance/benchmarks  (explain("executionStats"): index vs collection scan)

- http://localhost:5000/api/query-lab                   (20 predefined safe queries; run one with POST /api/query-lab/run {"id":"idx-vs-scan"})
- http://localhost:5000/api/performance/optimizer       (Query Optimizer examples; run with POST /api/performance/optimizer/run {"id":"branch-cgpa"})

## Other API routes
`/api/students`, `/api/companies`, `/api/drives` (+ `/api/drives/:id/eligible-students`), `/api/applications`, `/api/skills`
Students support `?search=&branch=&minCgpa=&minAttendance=&skills=&graduationYear=&placementStatus=&page=&limit=`.

## mongosh scripts
`mongosh "<your uri>" mongodb/indexes.js` and `mongodb/crud.js`

## Tests
```
cd backend
npm run test:nodb      # 30 tests, no database needed (validation, ids, seed generator, index advisor)
npm test               # everything, including CRUD / relationships / aggregations / explain / Query Lab
```
`npm test` needs a MongoDB. Either:
- let it download a temporary MongoDB automatically (needs internet on first run), or
- point it to a TEST database (the name MUST contain "test"; all data in it is deleted):
  - Windows cmd: `set "TEST_MONGODB_URI=mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/campusiq_test?retryWrites=true&w=majority" && npm test`
  - Mac/Linux: `TEST_MONGODB_URI="..." npm test`

Without any database, the database tests are skipped with a clear message (they do not fail).

## Documentation (folder `docs`)
| File | Content |
|---|---|
| `PROJECT_REPORT.md` | Full college report (abstract to references) |
| `DATABASE_DESIGN.md` | Collections, relationships, embedding vs referencing, indexes, BSON types, sample documents |
| `API_DOCUMENTATION.md` | Every endpoint: method, URL, purpose, request, response, errors |
| `MONGODB_QUERIES.md` | Practical file: 10 sections from creating a database to Node.js / PyMongo |
| `VIVA_QUESTIONS.md` | 70 viva questions with short answers |
| `DEMO_GUIDE.md` | 10-minute demonstration script |
| `CampusIQ_Presentation.pptx` | 13-slide presentation with speaker notes |

## AI Insights (optional Gemini key)
Works without any key (built-in answers from real data). To let Gemini write the explanations, add `AI_API_KEY=...` to `backend/.env` and restart the backend.
The AI never creates numbers: it only explains rows returned by MongoDB.

## All tests
```
cd backend && npm run test:nodb     # 56 tests, no database needed
cd backend && npm test              # all backend tests (needs MongoDB, see Tests section)
cd ml && python -m pytest -q        # 10 ML tests
```
