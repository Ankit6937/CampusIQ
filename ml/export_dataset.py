"""Export REAL students from MongoDB (PyMongo) into a training CSV.

  python export_dataset.py                 # writes dataset_db.csv
  python train.py --data dataset_db.csv    # train on your own database

Uses MONGODB_URI from the environment, or from ../backend/.env.
"""
import os
import re
from pathlib import Path

import pandas as pd
from pymongo import MongoClient

HERE = Path(__file__).parent


def mongo_uri() -> str:
    uri = os.environ.get("MONGODB_URI")
    if uri:
        return uri
    env = HERE.parent / "backend" / ".env"
    if env.exists():
        m = re.search(r"^MONGODB_URI=(.+)$", env.read_text(), re.M)
        if m:
            return m.group(1).strip()
    raise SystemExit("Set MONGODB_URI or create backend/.env")


def main() -> None:
    db = MongoClient(mongo_uri(), serverSelectionTimeoutMS=15000).get_default_database()
    # best package per placed student: Selected applications joined with their drive
    best = {d["_id"]: d["package"] for d in db.applications.aggregate([
        {"$match": {"status": "Selected"}},
        {"$lookup": {"from": "jobDrives", "localField": "driveId", "foreignField": "_id", "as": "drive"}}, {"$unwind": "$drive"},
        {"$group": {"_id": "$studentId", "package": {"$max": "$drive.package"}}},
    ])}
    rows = []
    for s in db.students.find():
        pkg = best.get(s["_id"])
        rows.append({
            "cgpa": s.get("cgpa"), "attendance": s.get("attendance"), "dsa_score": s.get("dsaScore"), "aptitude_score": s.get("aptitudeScore"),
            "communication_score": s.get("communicationScore"), "num_projects": len(s.get("projects", [])),
            "num_certifications": len(s.get("certifications", [])), "num_internships": len(s.get("internships", [])),
            "num_skills": len(s.get("skills", [])), "placed": 1 if pkg else 0, "package": pkg,
        })
    out = HERE / "dataset_db.csv"
    pd.DataFrame(rows).to_csv(out, index=False)
    print(f"Wrote {len(rows)} students to {out}")


if __name__ == "__main__":
    main()
