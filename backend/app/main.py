from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="LCP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_methods=["GET"],
)

PLANS = [
    {
        "id": "basic",
        "name": "Basic",
        "price": 999,
        "devices": 2,
        "bypass": False,
    },
    {
        "id": "plus",
        "name": "Plus",
        "price": 599,
        "devices": 5,
        "bypass": True,
    },
    {
        "id": "premium",
        "name": "Premium",
        "price": 1199,
        "devices": 10,
        "bypass": True,
    },
]


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/plans")
async def get_plans():
    return PLANS
