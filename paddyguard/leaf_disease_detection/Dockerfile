FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY models ./models
COPY data ./data
EXPOSE 8000
CMD ["sh", "-c", "gunicorn -w 1 -b 0.0.0.0:${PORT:-8000} app.main:app --timeout 300"]
