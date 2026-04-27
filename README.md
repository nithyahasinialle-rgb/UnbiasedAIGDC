# Unbiased – AI Decision Audit Tool

Unbiased is a platform that helps identify and reduce bias in machine learning models. It allows users to upload a dataset, train a model, check if the model treats different groups fairly, understand why decisions are made, and apply methods to improve fairness.

The aim of this project is simple: **make fairness in AI understandable and actionable, not just theoretical.**

---

## Live Demo

You can try the application here:

🔗 https://solutionchallenge-27bf1.web.app/

The demo allows you to:
- Upload a dataset  
- Run a fairness audit  
- View explanations  
- Apply mitigation techniques  

**Note:** For smooth performance on the hosted version, datasets of up to ~2000 rows are recommended. (Threshold Optimization in Mitigation)

---

## Why This Project?

Machine learning models are widely used in decisions like hiring, lending, and risk assessment. However, these models can unintentionally learn biases from data.

Common problems include:
- Certain groups receiving unfair outcomes  
- Lack of transparency in how decisions are made  
- Difficulty in correcting biased predictions  

Unbiased was built to address these issues in a single, easy-to-use system.

---

## Design Approach

This project follows a user-centered design process:

### Empathize  
Many existing fairness tools are either too technical or fragmented. Developers often rely on multiple tools, while others struggle to interpret results.

### Define  
The problem was framed as:  
**How can bias in machine learning be detected, explained, and improved in a simple and practical way?**

### Ideate  
Different approaches were explored, and the final system integrates fairness evaluation, explainability, and mitigation into one workflow.

### Prototype  
A working system was built using:
- Flask backend for ML processing  
- React frontend for interaction  

Workflow:
**Upload → Audit → Explain → Mitigate → Review**

### Test & Iterate  
The system was tested across datasets and environments. Improvements were made for:
- Performance  
- Stability  
- Clearer output presentation  

---

## What the Platform Does

### 1. Bias Detection  
Measures fairness across groups using:
- Demographic Parity Difference and Ratio  
- Equalized Odds Difference  
- Group-wise selection rates  

---

### 2. Explainability  
Shows why the model makes decisions:
- SHAP-based feature importance  
- Feature-level insights  

---

### 3. Bias Mitigation  
Applies techniques to reduce bias:
- **Threshold Optimizer** (used in deployed version)  
- **Exponentiated Gradient** (for local execution)  

---

### 4. Reporting  
Provides summaries of:
- Model performance  
- Fairness metrics  
- Improvements after mitigation  

---

## Important Note on Mitigation Methods

The project supports two mitigation approaches:

- **Threshold Optimizer**
  - Fast and lightweight  
  - Used in the deployed version  

- **Exponentiated Gradient**
  - More computationally intensive  
  - Recommended for local execution  
  - May fail on hosted backend (Railway) due to memory and time limits  

---

## How It Works

1. Upload a dataset  
2. Train a model  
3. Evaluate fairness  
4. Generate explanations  
5. Apply mitigation  
6. Review updated results  

---

## Tech Stack

**Frontend** (Used Firebase for Hosting)
- React (Vite)  
- Tailwind CSS  
- Recharts  
- Framer Motion  

**Backend** (Used Railway for Deployment)
- Flask (Python)  
- Scikit-learn  
- Fairlearn  
- SHAP  

**AI Integration**
- Google Gemini API (for report generation)  

**Storage**
- Firebase Firestore and Storage  

---

## Running the Project Locally

### Requirements
- Python 3.9+  
- Node.js 18+  

---

### Setup
### Backend:
- cd backend
- python -m venv venv
- venv\Scripts\activate
- pip install -r requirements.txt
### Create .env file:
- GEMINI_API_KEY=your_key_here
- FIREBASE_PROJECT_ID=solutionchallenge-27bf1
- FIREBASE_STORAGE_BUCKET=solutionchallenge-27bf1.firebasestorage.app
- FLASK_PORT=5001

### Frontend
- cd frontend
- npm install
### Run the App:

### Backend:

python app.py

### Frontend:

npm run dev

### Open:
http://localhost:5173
### Project Structure
backend/
  ├── routes/
  ├── ml/
  ├── firebase_client.py

frontend/
  ├── src/components/
  ├── src/pages/

## Deployment Notes
The deployed version is optimized for performance and stability
Dataset size is limited for smooth execution
Threshold Optimizer is used in production
Exponentiated Gradient is recommended for local use
### License

This project is licensed under the MIT License.

### Final Note

Unbiased focuses on making fairness in machine learning understandable and usable in real-world scenarios. It combines analysis, explanation, and improvement into a single system that is both practical and accessible.


```bash
git clone <repository-url>
cd GoogleSolutionChallenge
