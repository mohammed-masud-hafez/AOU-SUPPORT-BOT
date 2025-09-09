
# AOUSupportBot – Quickstart

## 1) Install requirements
```bash
pip install flask rapidfuzz pandas
```

## 2) Run backend
```bash
cd backend
python app.py
```

Visit: http://localhost:8000/health → should show "ok"

## 3) Test via curl
```bash
curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d '{"message":"كيف اسجل المقررات؟"}'
```

## 4) Knowledge Base
Edit file: data/kb.csv
