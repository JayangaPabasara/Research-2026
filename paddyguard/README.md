# PaddyGuard AI
Multimodal Intelligent System for Rice Disease and Pest Management
Research Project ID: R26-SE-015 | SLIIT

## Services
| Service | Port | Tech | Owner |
|---|---|---|---|
| frontend | 5173 | React + Vite + TypeScript | All |
| gateway | 8000 | FastAPI | All |
| voice_nlp | 8001 | FastAPI + SVM + Whisper | Jayonga IT22273680 |
| leaf_disease_detection | 8002 | FastAPI + PyTorch CNN | Lasiru IT22168740 |
| pest_detection | 8003 | FastAPI + YOLOv8 | Kalhara IT22065858 |
| treatment_advisory_chatbot | 8004 | Node.js + Express + RAG | Keshan IT22303820 |
| user_management | 8005 | FastAPI + PostgreSQL | All |

## Quick Start (local dev)
```bash
docker-compose up --build
```

## Deployment
- Frontend: Vercel (auto-deploy on push to main)
- All backend services: GCP Cloud Run / AWS ECS / Azure Container Apps
