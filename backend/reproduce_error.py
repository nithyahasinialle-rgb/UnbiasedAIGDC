
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from fairlearn.reductions import ExponentiatedGradient, DemographicParity

# Create dummy data
X = np.random.rand(100, 5)
y = np.random.randint(0, 2, 100)
s = np.random.choice(['A', 'B'], 100)

base_classifier = LogisticRegression(max_iter=1000, random_state=42)
mitigator = ExponentiatedGradient(
    estimator=base_classifier,
    constraints=DemographicParity(),
    eps=0.02,
    max_iter=50,
    nu=1e-6,
)

print("Fitting...")
try:
    mitigator.fit(X, y, sensitive_features=s)
    print("Fit successful")
    y_pred = mitigator.predict(X)
    print("Predict successful")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
