"""Run with: pytest -q   (inside the ml folder). Trains the model first if model.joblib does not exist."""
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

HERE = Path(__file__).parent


@pytest.fixture(scope="session")
def client():
    if not (HERE / "model.joblib").exists():
        subprocess.run([sys.executable, "train.py"], cwd=HERE, check=True)
    import predict
    return TestClient(predict.app)


GOOD = {"cgpa": 9.0, "attendance": 95, "dsaScore": 90, "aptitudeScore": 90, "communicationScore": 88, "projects": 4, "certifications": 4, "internships": 2, "skills": 8}
WEAK = {"cgpa": 5.8, "attendance": 62, "dsaScore": 30, "aptitudeScore": 35, "communicationScore": 40, "projects": 0, "certifications": 0, "internships": 0, "skills": 2}
DEMO = {"cgpa": 7.8, "attendance": 88, "dsaScore": 75, "aptitudeScore": 80, "communicationScore": 82, "projects": 3, "certifications": 4, "internships": 1, "skills": 6}


def test_health(client):
    r = client.get("/health").json()
    assert r["status"] == "ok" and r["modelTrained"] is True


def test_prediction_shape_and_ranges(client):
    r = client.post("/predict", json=DEMO)
    assert r.status_code == 200
    d = r.json()
    assert 0 <= d["placementProbability"] <= 1
    assert d["riskLevel"] in ("Low", "Medium", "High")
    assert d["predictedPackage"] >= 3
    assert len(d["importantFactors"]) == 3 and {"feature", "impact"} <= set(d["importantFactors"][0])


def test_strong_student_beats_weak_student(client):
    good = client.post("/predict", json=GOOD).json()
    weak = client.post("/predict", json=WEAK).json()
    assert good["placementProbability"] > 0.8 and good["riskLevel"] == "Low"
    assert weak["placementProbability"] < 0.2 and weak["riskLevel"] == "High"


def test_more_cgpa_never_lowers_probability(client):
    low = client.post("/predict", json={**DEMO, "cgpa": 6.5}).json()["placementProbability"]
    high = client.post("/predict", json={**DEMO, "cgpa": 9.0}).json()["placementProbability"]
    assert high > low


def test_batch_matches_single(client):
    batch = client.post("/predict-batch", json={"students": [GOOD, WEAK, DEMO]}).json()["predictions"]
    singles = [client.post("/predict", json=s).json() for s in (GOOD, WEAK, DEMO)]
    assert [b["placementProbability"] for b in batch] == [s["placementProbability"] for s in singles]


@pytest.mark.parametrize("bad", [{**DEMO, "cgpa": 11}, {**DEMO, "attendance": -5}, {**DEMO, "projects": 1.5}, {k: v for k, v in DEMO.items() if k != "cgpa"}])
def test_invalid_input_is_rejected(client, bad):
    assert client.post("/predict", json=bad).status_code == 422


def test_model_info_has_metrics(client):
    info = client.get("/model-info").json()
    assert info["model"] == "Logistic Regression"
    assert info["test_metrics"]["logistic_regression"]["accuracy"] > 0.7
