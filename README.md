# Unbiased – AI Decision Audit Tool

Unbiased is a comprehensive platform designed to detect, explain, and mitigate bias in AI models and datasets. It provides a complete workflow from data upload to executive report generation, leveraging state-of-the-art fairness metrics and explainability techniques.

## Features

- **Bias Detection**: Measure selection rates, demographic parity, and equalized odds across protected groups.
- **Explainability**: Use SHAP values to identify features driving biased predictions.
- **Mitigation**: Apply `ExponentiatedGradient` or `ThresholdOptimizer` to reduce disparities.
- **AI Reports**: Generate plain-English executive summaries using the Google Gemini API.
- **Interactive Dashboard**: Visualize fairness-accuracy trade-offs with dynamic charts.

## Tech Stack

- **Frontend**: React.js (Vite), Tailwind CSS, Recharts, Framer Motion, Axios
- **Backend**: Flask (Python), Fairlearn, SHAP, Scikit-learn
- **AI/ML**: Google Gemini API (for reporting), Scikit-learn (for modeling)
- **Database/Storage**: Firebase Firestore & Storage (optional for local dev)

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- Gemini API Key (Optional, but required for AI reports)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd GoogleSolutionChallenge
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
   Create a `.env` file in the `backend` folder:
   ```env
   GEMINI_API_KEY=your_key_here
   FIREBASE_PROJECT_ID=solutionchallenge-27bf1
   FIREBASE_STORAGE_BUCKET=solutionchallenge-27bf1.firebasestorage.app
   FLASK_PORT=5001
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the Backend**:
   ```bash
   cd backend
   python app.py
   ```

2. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser.

## Project Structure

- `backend/`: Flask API and ML pipeline.
  - `ml/`: Fairness metrics, SHAP explainer, and mitigation logic.
  - `routes/`: API endpoints for upload, audit, mitigation, and reporting.
- `frontend/`: React application.
  - `src/components/`: Reusable UI components and charts.
  - `src/pages/`: Main application screens (Home, Upload, Results, Mitigation, Report).

## License

This project is licensed under the MIT License.
