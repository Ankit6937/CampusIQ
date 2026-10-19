"""Train the placement model.

Steps: 1 load dataset, 2 clean, 3 select features, 4 train/test split, 5 train, 6 evaluate, 7 save, 8 print metrics.

  python train.py                          # uses dataset.csv
  python train.py --data dataset_db.csv    # a file created by export_dataset.py (real data from MongoDB)
"""
import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from features import FEATURES, MODEL_VERSION, RANGES

HERE = Path(__file__).parent


def load_and_clean(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)                                   # 1. load
    missing = [c for c in FEATURES + ["placed"] if c not in df.columns]
    if missing:
        raise SystemExit(f"{path} is missing columns: {missing}")
    before = len(df)
    df = df.drop_duplicates().copy()                         # 2. clean: duplicates ...
    for col in FEATURES:                                     # ... missing values ...
        df[col] = pd.to_numeric(df[col], errors="coerce")
        df[col] = df[col].fillna(df[col].median())
        lo, hi = RANGES[col]
        df[col] = df[col].clip(lo, hi)                       # ... and impossible values
    df["placed"] = df["placed"].astype(int)
    print(f"Loaded {before} rows, kept {len(df)} after cleaning. Placed rate: {df['placed'].mean():.1%}")
    return df


def metrics(y_true, y_pred, y_prob) -> dict:
    return {
        "accuracy": round(accuracy_score(y_true, y_pred), 4), "precision": round(precision_score(y_true, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_true, y_pred, zero_division=0), 4), "f1": round(f1_score(y_true, y_pred, zero_division=0), 4),
        "roc_auc": round(roc_auc_score(y_true, y_prob), 4), "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(HERE / "dataset.csv"))
    args = ap.parse_args()

    df = load_and_clean(Path(args.data))
    X, y = df[FEATURES], df["placed"]                        # 3. select features
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)  # 4. split
    print(f"Train rows: {len(X_tr)}, test rows: {len(X_te)}")

    # 5. train: Logistic Regression (simple and interpretable) and Random Forest for comparison
    logreg = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)).fit(X_tr, y_tr)
    forest = RandomForestClassifier(n_estimators=200, random_state=42).fit(X_tr, y_tr)

    # 6. evaluate on data the models have never seen
    results = {}
    for name, model in [("logistic_regression", logreg), ("random_forest", forest)]:
        results[name] = metrics(y_te, model.predict(X_te), model.predict_proba(X_te)[:, 1])
    print("\nTest-set results")
    print(f"{'model':<22}{'accuracy':>10}{'precision':>11}{'recall':>9}{'f1':>8}{'roc_auc':>9}")
    for name, m in results.items():
        print(f"{name:<22}{m['accuracy']:>10.3f}{m['precision']:>11.3f}{m['recall']:>9.3f}{m['f1']:>8.3f}{m['roc_auc']:>9.3f}")
    print("Logistic Regression confusion matrix [[TN, FP], [FN, TP]]:", results["logistic_regression"]["confusion_matrix"])

    # extra model: expected package for students who got placed (Ridge regression)
    package_model, package_info = None, None
    placed = df[(df["placed"] == 1) & df["package"].notna()] if "package" in df.columns else df.iloc[0:0]
    if len(placed) >= 30:
        package_model = make_pipeline(StandardScaler(), Ridge(alpha=1.0)).fit(placed[FEATURES], placed["package"])
        package_info = {"rows": int(len(placed)), "mean_package_lpa": round(float(placed["package"].mean()), 2)}
        print(f"Package model trained on {len(placed)} placed students (mean package {package_info['mean_package_lpa']} LPA)")

    # final model: Logistic Regression, refit on all data so the service uses every labelled row
    final = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)).fit(X, y)
    coefs = dict(zip(FEATURES, final.named_steps["logisticregression"].coef_[0].round(3).tolist()))
    info = {
        "model": "Logistic Regression", "version": MODEL_VERSION, "trained_rows": int(len(df)), "placed_rate": round(float(y.mean()), 4),
        "features": FEATURES, "test_metrics": results, "coefficients_standardised": coefs, "package_model": package_info,
    }
    joblib.dump({"model": final, "package_model": package_model, "info": info}, HERE / "model.joblib")   # 7. save
    (HERE / "metrics.json").write_text(json.dumps(info, indent=2))
    print("\nStandardised coefficients (bigger = stronger effect on placement):")
    for k, v in sorted(coefs.items(), key=lambda kv: -abs(kv[1])):
        print(f"  {k:<22}{v:>7.3f}")
    print(f"\nSaved {HERE / 'model.joblib'} and metrics.json")                                           # 8. done


if __name__ == "__main__":
    np.random.seed(42)
    main()
