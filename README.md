# Unbiased - AI Fairness & Governance Platform

Unbiased is an AI Fairness and Governance Platform designed to help developers, researchers, students, and organizations identify, understand, and mitigate bias in machine learning systems.

The platform enables users to upload datasets, evaluate fairness, understand model behavior through explainability techniques, apply bias mitigation strategies, and generate actionable audit reports.

Our goal is simple:

**Make responsible AI development practical, understandable, and accessible.**

---

# Live Demo

🔗 https://solutionchallenge-27bf1.web.app/

The platform currently supports:

* Dataset Upload
* Fairness Auditing
* Explainability Analysis
* Bias Mitigation
* Audit Reporting

**Note:** For optimal performance on the hosted version, datasets of up to approximately 2000 rows are recommended, especially when using mitigation techniques such as Threshold Optimization.

---

# Problem Statement

Machine learning systems increasingly influence decisions in:

* Hiring and Recruitment
* Lending and Credit Assessment
* Healthcare
* Insurance
* Education
* Risk Assessment

While these systems improve efficiency, they can unintentionally learn and amplify biases present in historical data.

Common challenges include:

* Unfair outcomes for specific demographic groups
* Lack of transparency in model decisions
* Difficulty identifying sources of bias
* Limited tools for improving fairness without sacrificing performance

Existing solutions often require multiple tools and significant expertise.

Unbiased was created to provide a unified workflow for fairness evaluation, explainability, mitigation, and reporting.

---

# Design Thinking Approach

## Empathize

Many fairness tools are fragmented, highly technical, or difficult to interpret.

Developers often need multiple frameworks to:

* Measure fairness
* Understand model decisions
* Apply mitigation techniques
* Generate reports

Non-technical stakeholders frequently struggle to understand fairness metrics and their implications.

---

## Define

The challenge was defined as:

**How can bias in machine learning systems be detected, explained, mitigated, and communicated through a single intuitive platform?**

---

## Ideate

Multiple approaches were explored before converging on a solution that integrates:

* Fairness Auditing
* Explainability
* Mitigation
* Reporting
* AI-Assisted Guidance

into a unified workflow.

---

## Prototype

A full-stack platform was developed using:

* React for user interaction
* Flask for ML processing
* Fairlearn for fairness evaluation
* SHAP for explainability
* Firebase for storage
* Gemini for intelligent guidance

Workflow:

**Upload → Audit → Explain → Mitigate → Review**

---

## Test & Iterate

The platform has been tested across multiple datasets and deployment environments.

Improvements focused on:

* Performance
* Reliability
* Scalability
* Explainability
* User Experience

---

# Core Features

## 1. Fairness Auditing

Evaluate whether machine learning models treat different groups fairly.

Metrics include:

* Demographic Parity Difference
* Demographic Parity Ratio
* Equalized Odds Difference
* Group Selection Rates

These metrics help identify disparities between protected and non-protected groups.

---

## 2. Explainability

Understanding *why* a model makes decisions is just as important as evaluating fairness.

Unbiased uses SHAP-based explainability to provide:

* Feature Importance Analysis
* Feature-Level Contributions
* Model Behavior Insights

This enables users to understand the factors driving predictions.

---

## 3. Bias Mitigation

Once bias is identified, the platform provides mitigation strategies to reduce unfair outcomes.

Supported techniques:

### Threshold Optimizer

* Lightweight
* Fast
* Production-friendly
* Used in deployed version

### Exponentiated Gradient

* More computationally intensive
* Often achieves stronger fairness improvements
* Recommended for local execution

---

## 4. Reporting

Generate audit reports containing:

* Performance Metrics
* Fairness Metrics
* Explainability Insights
* Mitigation Results

This supports documentation and transparency requirements.

---

# Round 2 Enhancements

To expand beyond basic auditing, the platform is being upgraded into a broader AI Governance solution.

---

## Multi-Model Fairness Evaluation

Instead of relying on a single model, the platform now supports comparative analysis across:

* Logistic Regression
* Random Forest
* XGBoost

Each model is evaluated using:

### Performance Metrics

* Accuracy
* Precision
* Recall
* F1 Score

### Fairness Metrics

* Statistical Parity Difference
* Disparate Impact
* Equal Opportunity Difference

This allows users to evaluate fairness-performance trade-offs before deployment.

---

## Intelligent Model Recommendation

Choosing the most accurate model is not always the most responsible choice.

The platform automatically identifies:

* Best Accuracy Model
* Fairest Model
* Best Balanced Model

Recommendations are generated using transparent evaluation criteria rather than black-box scoring.

---

## Gemini Fairness Advisor

Fairness metrics can be difficult to interpret, particularly for non-technical stakeholders.

Gemini is integrated as an AI Fairness Advisor capable of explaining:

* What bias was detected
* Which groups are affected
* Why bias may have occurred
* Business implications
* Ethical implications
* Recommended mitigation strategies
* Expected trade-offs

The advisor transforms technical outputs into actionable insights.

---

## Audit History

Users can optionally sign in using Google Authentication to save and manage previous audits.

Features include:

* Audit History
* Report Storage
* Audit Reopening
* Result Tracking

Importantly:

**Authentication remains optional.**

Users can continue using all core functionality without creating an account.

---

## Model Export

Trained models can be exported for downstream experimentation and deployment.

Supported exports:

* Logistic Regression
* Random Forest
* XGBoost

Export format:

* Pickle (.pkl)

---

## Professional Analytics Dashboard

The upgraded dashboard provides:

* Fairness Summary Cards
* Bias Severity Indicators
* Model Comparison Tables
* Feature Importance Visualizations
* Recommendation Panels
* Gemini Advisor Insights

The objective is to present fairness analysis in a way that is understandable to both technical and non-technical audiences.

---

# How It Works

### Step 1

Upload a dataset.

### Step 2

Select:

* Target Column
* Protected Attribute

### Step 3

Run a fairness audit.

### Step 4

Review:

* Performance Metrics
* Fairness Metrics
* Explainability Results

### Step 5

Apply mitigation techniques.

### Step 6

Analyze improvements and generate reports.

---

# System Architecture

## Frontend

Hosted on Firebase Hosting.

Technologies:

* React (Vite)
* Tailwind CSS
* Recharts
* Framer Motion

---

## Backend

Hosted on Railway.

Technologies:

* Flask
* Scikit-learn
* Fairlearn
* SHAP
* XGBoost

---

## AI Integration

* Google Gemini API

Used for:

* Fairness Explanations
* Audit Guidance
* Insight Generation

---

## Storage

Firebase:

* Firestore
* Storage
* Authentication

---

# Running Locally

## Requirements

* Python 3.9+
* Node.js 18+

---

## Backend Setup

```bash
cd backend

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt
```

Create a `.env` file:

```env
GEMINI_API_KEY=your_key_here
FIREBASE_PROJECT_ID=solutionchallenge-27bf1
FIREBASE_STORAGE_BUCKET=solutionchallenge-27bf1.firebasestorage.app
FLASK_PORT=5001
```

Start backend:

```bash
python app.py
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Open:

```text
http://localhost:5173
```

---

# Project Structure

```text
backend/
│
├── routes/
├── ml/
├── firebase_client.py
├── app.py
│
frontend/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── api/
│
└── public/
```

---

# Deployment

Frontend:

* Firebase Hosting

Backend:

* Railway

Database & Storage:

* Firebase

The deployed version is optimized for stability and responsiveness while maintaining fairness auditing capabilities.

---

# Future Roadmap

* Advanced Fairness Metrics
* Continuous Model Monitoring
* Drift Detection
* Regulatory Compliance Checks
* Explainability Benchmarking
* Enterprise Audit Workflows
* Responsible AI Governance Toolkit

---

# Vision

The long-term vision of Unbiased is to evolve beyond fairness measurement into a practical AI Governance Platform.

Rather than simply reporting bias, the platform aims to help users:

* Detect Bias
* Understand Bias
* Mitigate Bias
* Document Decisions
* Build More Responsible AI Systems

By combining fairness auditing, explainability, mitigation, reporting, and AI-assisted guidance into a single workflow, Unbiased lowers the barrier to developing trustworthy machine learning systems.

---

# License

This project is licensed under the MIT License.
