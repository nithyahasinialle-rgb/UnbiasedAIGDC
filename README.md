Unbiased – AI Decision Audit Tool

Unbiased is a platform that helps identify and reduce bias in machine learning models. It allows users to upload a dataset, train a model, check if the model treats different groups fairly, understand why decisions are made, and apply methods to improve fairness.

The aim of this project is simple:
make fairness in AI understandable and actionable, not just theoretical.

Live Demo

You can try the application here:

https://solutionchallenge-27bf1.web.app/

The demo allows you to:

Upload a dataset
Run a fairness audit
View explanations
Apply mitigation techniques

Note: For smooth performance on the hosted version, datasets of up to ~2000 rows are recommended. (Threshold Optimization)

Why This Project?

Machine learning models are widely used in decisions like hiring, lending, and risk assessment. However, these models can unintentionally learn biases from data.

Common problems include:

Certain groups receiving unfair outcomes
Lack of transparency in how decisions are made
Difficulty in correcting biased predictions

Unbiased was built to address these issues in a single, easy-to-use system.

Design Approach:

The project was developed with a focus on real user needs:

Understanding the Problem

Many existing tools are either too technical or require combining multiple libraries. This makes fairness analysis difficult for most users.

Defining the Goal

Create a system that can:

Detect bias
Explain model behavior
Suggest and apply improvements
Building the Solution

Instead of separate tools, everything was combined into one workflow:

Upload → Audit → Explain → Mitigate → Review Results

Improving Through Testing

The system was tested with different datasets and deployment setups. Adjustments were made to:

Improve performance
Reduce resource usage
Present results clearly
What the Platform Does
1. Bias Detection

The system checks whether different groups (for example, based on gender or category) are treated equally.

It measures:

Demographic Parity (are outcomes similar across groups?)
Equalized Odds (are errors similar across groups?)
Selection rates for each group
2. Explainability

The platform shows why the model is making certain decisions.

Uses SHAP values
Highlights which features influence predictions the most
3. Bias Mitigation

If bias is detected, the system can try to reduce it.

Threshold Optimizer (used in deployed version)
Exponentiated Gradient (available for local execution)
4. Reporting

The system provides clear summaries of:

Model performance
Fairness metrics
Improvements after mitigation
Important Note on Mitigation Methods

The project supports two mitigation approaches:

Threshold Optimizer
Fast and lightweight
Used in the deployed version
Exponentiated Gradient
More advanced and computationally intensive
Works best when running locally
May fail on hosted backend due to memory and time limits

This design ensures that the deployed system remains stable while still supporting advanced methods offline.

How It Works (Simple Flow)
Upload a dataset
The system trains a model
It checks fairness across groups
It explains model decisions
It applies mitigation (if needed)
Results are updated and displayed
Tech Stack

Frontend (Used Firebase Hosting)

React (Vite)
Tailwind CSS
Recharts
Framer Motion

Backend (Used Railway to deploy)

Flask (Python)
Scikit-learn
Fairlearn
SHAP

AI Integration

Google Gemini API (for report generation)

Storage

Firebase Firestore and Storage
Running the Project Locally
Requirements
Python 3.9+
Node.js 18+
Setup

Clone the repository:

git clone <repository-url>
cd GoogleSolutionChallenge
Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

Create a .env file:

GEMINI_API_KEY=your_key_here
FIREBASE_PROJECT_ID=solutionchallenge-27bf1
FIREBASE_STORAGE_BUCKET=solutionchallenge-27bf1.firebasestorage.app
FLASK_PORT=5001
Frontend
cd frontend
npm install
Run the App

Backend:

python app.py

Frontend:

npm run dev

Open:
http://localhost:5173

Project Structure
backend/
  ├── routes/        # API endpoints
  ├── ml/            # ML pipeline, fairness, explainability
  ├── firebase_client.py

frontend/
  ├── src/components/
  ├── src/pages/
Deployment Notes
The deployed version is optimized for performance and stability
Dataset size is limited to ensure smooth execution
Threshold Optimizer is used for mitigation in production
Exponentiated Gradient is recommended for local use
License

This project is licensed under the MIT License.

Final Note: Unbiased is designed to bridge the gap between fairness theory and practical implementation. It focuses on clarity, usability, and real-world constraints, making it easier to understand and improve the behavior of machine learning models.

Unbiased is designed to bridge the gap between fairness theory and practical implementation. It focuses on clarity, usability, and real-world constraints, making it easier to understand and improve the behavior of machine learning models.
