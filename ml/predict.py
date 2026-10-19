"""Prediction service (FastAPI) + command line.

  uvicorn predict:app --port 8000          # start the service (run inside the ml folder)
  python predict.py                        # prints a demo prediction
  python predict.py --cgpa 7.8 --attendance 88 --dsa 75 --aptitude 80 --communication 82 --projects 3 --certifications 4 --internships 1 --skills 6
"""
import argparse
from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from features import FEATURES, LABELS, MODEL_VERSION, risk_level

MODEL_PATH = Path(__file__).parent / "model.joblib"
_bundle = None


def load_bundle():
    """Loads model.joblib once. Raises a clear error if train.py has not been run."""
    global _bundle
    if _bundle is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError("Model not trained yet. Run: python train.py")
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


def predict_many(rows: List[dict]) -> List[dict]:
    """rows use the column names from features.FEATURES. Returns one result per row."""
    b = load_bundle()
    pipe = b["model"]
    X = pd.DataFrame(rows)[FEATURES].astype(float)
    probs = pipe.predict_proba(X)[:, 1]
    scaler, clf = pipe.named_steps["standardscaler"], pipe.named_steps["logisticregression"]
    z = (X.values - scaler.mean_) / scaler.scale_          # standardised values
    contrib = z * clf.coef_[0]                              # per-feature contribution to the log-odds
    pkg = None
    if b.get("package_model") is not None:
        pkg = np.clip(b["package_model"].predict(X), 3.0, None)
    out = []
    for i, p in enumerate(probs):
        top = np.argsort(-np.abs(contrib[i]))[:3]
        out.append({
            "placementProbability": round(float(p), 4),
            "riskLevel": risk_level(float(p)),
            "predictedPackage": round(float(pkg[i]), 1) if pkg is not None else None,
            "importantFactors": [{"feature": LABELS[FEATURES[j]], "impact": round(float(contrib[i][j]), 2)} for j in top],
            "modelVersion": MODEL_VERSION,
        })
    return out


# ---------------------------------------------------------------- API
app = FastAPI(title="CampusIQ ML service", version="1.0")


class Student(BaseModel):
    cgpa: float = Field(ge=0, le=10)
    attendance: float = Field(ge=0, le=100)
    dsaScore: float = Field(ge=0, le=100)
    aptitudeScore: float = Field(ge=0, le=100)
    communicationScore: float = Field(ge=0, le=100)
    projects: int = Field(ge=0, le=50)
    certifications: int = Field(ge=0, le=50)
    internships: int = Field(ge=0, le=20)
    skills: int = Field(ge=0, le=100)


class Batch(BaseModel):
    students: List[Student] = Field(max_length=2000)


def to_row(s: Student) -> dict:
    return {"cgpa": s.cgpa, "attendance": s.attendance, "dsa_score": s.dsaScore, "aptitude_score": s.aptitudeScore,
            "communication_score": s.communicationScore, "num_projects": s.projects, "num_certifications": s.certifications,
            "num_internships": s.internships, "num_skills": s.skills}


def guarded(fn):
    try:
        return fn()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok", "modelTrained": MODEL_PATH.exists()}


@app.get("/model-info")
def model_info():
    return guarded(lambda: load_bundle()["info"])


@app.post("/predict")
def predict(student: Student):
    return guarded(lambda: predict_many([to_row(student)])[0])


@app.post("/predict-batch")
def predict_batch(batch: Batch):
    return {"predictions": guarded(lambda: predict_many([to_row(s) for s in batch.students]))}


# ---------------------------------------------------------------- command line
if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Predict placement probability for one student")
    for name, default in [("cgpa", 7.8), ("attendance", 88), ("dsa", 75), ("aptitude", 80), ("communication", 82), ("projects", 3), ("certifications", 4), ("internships", 1), ("skills", 6)]:
        ap.add_argument(f"--{name}", type=float, default=default)
    a = ap.parse_args()
    row = {"cgpa": a.cgpa, "attendance": a.attendance, "dsa_score": a.dsa, "aptitude_score": a.aptitude, "communication_score": a.communication,
           "num_projects": a.projects, "num_certifications": a.certifications, "num_internships": a.internships, "num_skills": a.skills}
    try:
        r = predict_many([row])[0]
    except FileNotFoundError as e:
        raise SystemExit(str(e))
    print("Student:", {k: v for k, v in row.items()})
    print(f"Placement probability: {r['placementProbability']:.0%}")
    print(f"Risk level: {r['riskLevel']}")
    print(f"Expected package: {r['predictedPackage']} LPA")
    print("Key factors:", ", ".join(f"{f['feature']} ({f['impact']:+})" for f in r["importantFactors"]))
