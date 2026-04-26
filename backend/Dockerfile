FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpng-dev \
    libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5001

# --workers 1 is required: the app stores uploaded files and job results
# in process-local memory (_file_store, _jobs dicts). Multiple workers
# are separate processes with separate memory — a file uploaded to worker 1
# is invisible to worker 2, causing "file_id not found" on every audit.
# --timeout 300 gives the ML pipeline enough time to finish.
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "1", "--timeout", "300", "app:create_app()"]
