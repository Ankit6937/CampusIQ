"""Shared constants for training and prediction, so both always use the same feature order."""

FEATURES = [
    "cgpa", "attendance", "dsa_score", "aptitude_score", "communication_score",
    "num_projects", "num_certifications", "num_internships", "num_skills",
]

# Friendly names shown in the UI ("important factors")
LABELS = {
    "cgpa": "CGPA", "attendance": "Attendance", "dsa_score": "DSA score", "aptitude_score": "Aptitude score",
    "communication_score": "Communication score", "num_projects": "Projects", "num_certifications": "Certifications",
    "num_internships": "Internships", "num_skills": "Skills",
}

# Valid ranges used when cleaning the dataset
RANGES = {
    "cgpa": (0, 10), "attendance": (0, 100), "dsa_score": (0, 100), "aptitude_score": (0, 100), "communication_score": (0, 100),
    "num_projects": (0, 50), "num_certifications": (0, 50), "num_internships": (0, 20), "num_skills": (0, 100),
}

MODEL_VERSION = "logreg-v1"


def risk_level(probability: float) -> str:
    """Low risk = high chance of placement."""
    if probability >= 0.65:
        return "Low"
    if probability >= 0.35:
        return "Medium"
    return "High"
