# CampusIQ ML service

Predicts the **probability that a student gets placed** from 9 features: CGPA, attendance, DSA / aptitude / communication scores,
number of projects, certifications, internships and skills. It also estimates the expected package (Ridge regression on placed students).

| File | Purpose |
|---|---|
| `dataset.csv` | 1080 labelled students (made with the same generator as the seed data: `npm run export-dataset` in `backend`) |
| `train.py` | load → clean → select features → split → train → evaluate → save `model.joblib` → print accuracy / precision / recall / F1 |
| `predict.py` | FastAPI service (`POST /predict`, `POST /predict-batch`, `GET /model-info`, `GET /health`) and a command line demo |
| `export_dataset.py` | exports REAL students from MongoDB with PyMongo into `dataset_db.csv` |
| `test_ml.py` | 10 pytest tests |

## Setup (Windows cmd)
```
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python train.py
uvicorn predict:app --port 8000
```
(`py` instead of `python` if `python` is not recognised.) Keep that terminal open. Check http://localhost:8000/health and http://localhost:8000/docs.

## Try it
```
python predict.py                      # demo student: CGPA 7.8, attendance 88, DSA 75, aptitude 80, communication 82, 3 projects, 4 certs, 1 internship
python -m pytest -q                    # run the tests
python export_dataset.py               # real data from Atlas -> dataset_db.csv
python train.py --data dataset_db.csv  # train on your own database
```

## How it works
1. **Logistic Regression** (with standardised features) gives `P(placed)`. It is simple and explainable: every feature has a weight.
2. A **Random Forest** is trained on the same split only for comparison (it scored lower on this data).
3. Risk level: probability ≥ 65% → **Low**, 35-65% → **Medium**, below 35% → **High**.
4. "Important factors" = each feature's contribution to the log-odds for that student (weight × standardised value).
5. The Node backend sends the student's numbers to `/predict` and stores the answer in the `predictions` collection (one document per student).

Flow: React → Node (Express) → Python FastAPI → scikit-learn → prediction → MongoDB.
