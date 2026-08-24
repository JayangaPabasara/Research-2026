"""Routes ALL leaf disease requests to C2 leaf_disease_detection Flask service."""
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
import httpx, os

router = APIRouter()
LEAF_URL = os.getenv("LEAF_DISEASE_URL", "http://leaf_disease_detection:8002")
TIMEOUT = httpx.Timeout(120.0)


async def _forward(request: Request, method: str, path: str,
                    files=None, json=None, params=None):
    headers = {}
    auth = request.headers.get("Authorization")
    if auth:
        headers["Authorization"] = auth
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.request(
                method, f"{LEAF_URL}{path}",
                headers=headers, files=files,
                json=json, params=params
            )
        try:
            content = resp.json()
        except ValueError:
            content = {"detail": resp.text}
        return JSONResponse(status_code=resp.status_code, content=content)
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Leaf disease service unavailable")


# Analyze endpoint (file upload)
@router.post("/classify")
async def classify_leaf(request: Request, image: UploadFile = File(...)):
    content = await image.read()
    files = {"file": (image.filename, content, image.content_type)}
    form = await request.form()
    for k, v in form.items():
        if k != "image":
            files[k] = (None, str(v))
    return await _forward(request, "POST", "/api/analyze", files=files)


# Cases / history
@router.get("/cases")
async def get_cases(request: Request):
    return await _forward(request, "GET", "/api/cases", params=dict(request.query_params))


@router.delete("/cases/{case_id}")
async def delete_case(request: Request, case_id: str):
    return await _forward(request, "DELETE", f"/api/cases/{case_id}")


@router.patch("/cases/{case_id}/feedback")
async def case_feedback(request: Request, case_id: str):
    body = await request.json()
    return await _forward(request, "PATCH", f"/api/cases/{case_id}/feedback", json=body)


@router.post("/cases/{case_id}/refresh-weather")
async def refresh_weather(request: Request, case_id: str):
    return await _forward(request, "POST", f"/api/cases/{case_id}/refresh-weather")


@router.get("/user/history")
async def user_history(request: Request):
    return await _forward(request, "GET", "/api/user/history")


@router.get("/user/me")
async def leaf_user_me(request: Request):
    return await _forward(request, "GET", "/api/user/me")


# Expert routes
@router.get("/expert/review-queue")
async def review_queue(request: Request):
    return await _forward(request, "GET", "/api/expert/review-queue")


@router.get("/expert/review-queue/{case_id}")
async def review_case_detail(request: Request, case_id: str):
    return await _forward(request, "GET", f"/api/expert/review-queue/{case_id}")


@router.post("/expert/review-queue/{case_id}/verify")
async def verify_case(request: Request, case_id: str):
    body = await request.json()
    return await _forward(request, "POST", f"/api/expert/review-queue/{case_id}/verify", json=body)


@router.get("/expert/dashboard-stats")
async def dashboard_stats(request: Request):
    return await _forward(request, "GET", "/api/expert/dashboard-stats")


@router.get("/expert/active-learning/batches")
async def get_batches(request: Request):
    return await _forward(request, "GET", "/api/expert/active-learning/batches")

@router.get("/expert/active-learning/batches/{batch_id}")
async def get_batch(request: Request, batch_id: str):
    return await _forward(request, "GET", f"/api/expert/active-learning/batches/{batch_id}")


@router.post("/expert/active-learning/prepare-batch")
async def prepare_batch(request: Request):
    return await _forward(request, "POST", "/api/expert/active-learning/prepare-batch")


@router.post("/expert/active-learning/batches/{batch_id}/start")
async def start_batch(request: Request, batch_id: str):
    return await _forward(request, "POST", f"/api/expert/active-learning/batches/{batch_id}/start")


# Fine-tuning
@router.get("/expert/fine-tune/readiness")
async def finetune_readiness(request: Request):
    return await _forward(request, "GET", "/api/expert/fine-tune/readiness")


@router.post("/expert/fine-tune/start")
async def finetune_start(request: Request):
    body = await request.json()
    return await _forward(request, "POST", "/api/expert/fine-tune/start", json=body)


@router.get("/expert/fine-tune/status/{job_id}")
async def finetune_status(request: Request, job_id: str):
    return await _forward(request, "GET", f"/api/expert/fine-tune/status/{job_id}")


@router.get("/expert/fine-tune/jobs")
async def finetune_jobs(request: Request):
    return await _forward(request, "GET", "/api/expert/fine-tune/jobs")


@router.get("/expert/deployed-model")
async def deployed_model(request: Request):
    return await _forward(request, "GET", "/api/expert/deployed-model")


# Expert management
@router.get("/expert-management")
async def get_experts(request: Request):
    return await _forward(request, "GET", "/api/expert-management")


@router.post("/expert-management")
async def create_expert(request: Request):
    body = await request.json()
    return await _forward(request, "POST", "/api/expert-management", json=body)


@router.post("/expert-management/{expert_id}/toggle-status")
async def toggle_expert(request: Request, expert_id: str):
    return await _forward(request, "POST", f"/api/expert-management/{expert_id}/toggle-status")


# Admin
@router.get("/admin/users")
async def admin_users(request: Request):
    return await _forward(request, "GET", "/api/admin/users")


@router.get("/admin/users/{user_id}")
async def admin_get_user(request: Request, user_id: str):
    return await _forward(request, "GET", f"/api/admin/users/{user_id}")


@router.put("/admin/users/{user_id}")
async def admin_update_user(request: Request, user_id: str):
    body = await request.json()
    return await _forward(request, "PUT", f"/api/admin/users/{user_id}", json=body)


@router.delete("/admin/users/{user_id}")
async def admin_delete_user(request: Request, user_id: str):
    return await _forward(request, "DELETE", f"/api/admin/users/{user_id}")


# Leaf auth (staff login — separate token system from main user auth)
@router.post("/leaf-auth/login")
async def leaf_login(request: Request):
    body = await request.json()
    return await _forward(request, "POST", "/api/auth/login", json=body)


@router.post("/leaf-auth/register")
async def leaf_register(request: Request):
    body = await request.json()
    return await _forward(request, "POST", "/api/auth/register", json=body)
