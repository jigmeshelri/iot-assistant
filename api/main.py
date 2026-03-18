from __future__ import annotations

import base64
import io
import json
import re
from typing import Any

import anthropic
import httpx
import qrcode
from fastapi import Depends, FastAPI, File, HTTPException, Security, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

class Settings(BaseSettings):
    database_url: str = "postgresql://iot:iot_secret@localhost:5432/iot_assistant"
    anthropic_api_key: str = ""
    supabase_url: str = ""
    supabase_secret_key: str = ""  # Settings → API → secret key (sb_secret_...)
    frontend_url: str = "http://localhost:4321"
    ai_provider: str = "anthropic"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
app = FastAPI(
    title="IoT Assistant API",
    description="Microservicio para reconocimiento de componentes, generación de proyectos e ingesta de telemetría.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "https://iot-assistant.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

async def verify_jwt(credentials: HTTPAuthorizationCredentials | None = Security(security)) -> dict[str, Any]:
    """Validates a Bearer JWT by calling Supabase Auth /auth/v1/user."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if not settings.supabase_url or not settings.supabase_secret_key:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {credentials.credentials}",
                "apikey": settings.supabase_secret_key,
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return resp.json()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    version: str


class RecognizeResponse(BaseModel):
    name: str
    category: str
    confidence: float
    platform_family: str | None = None
    connectivity_caps: dict[str, Any] = {}
    technical_specs: dict[str, Any] = {}
    datasheet_url: str | None = None
    notes: str | None = None


class StockItem(BaseModel):
    component_id: str
    name: str
    category: str
    quantity: int
    platform_family: str | None = None
    connectivity_caps: dict[str, Any] = {}
    technical_specs: dict[str, Any] = {}


class BOMItem(BaseModel):
    component_name: str
    quantity_required: int
    state: str  # available | partial | missing | incompatible
    available_quantity: int = 0
    alternatives: list[str] = []
    notes: str | None = None


class ProjectSuggestion(BaseModel):
    title: str
    description: str
    viability_pct: int
    difficulty: str
    project_type: str
    bom: list[BOMItem]
    tags: list[str] = []


class DiscoverRequest(BaseModel):
    inventory: list[StockItem]


class DiscoverResponse(BaseModel):
    suggestions: list[ProjectSuggestion]


class RefinementOptions(BaseModel):
    preferred_controller: str | None = None
    difficulty: str | None = None
    constraints: list[str] = []


class PlanRequest(BaseModel):
    description: str
    inventory: list[StockItem]
    refinement: RefinementOptions | None = None


class PlanResponse(BaseModel):
    title: str
    description: str
    bom: list[BOMItem]
    notes: str | None = None


class CodeGenerateRequest(BaseModel):
    project_type: str  # diy | prototype | professional
    environment: str   # arduino | platformio | esp-idf | zephyr | rust | esphome | micropython
    bom: list[BOMItem]
    project_title: str
    mode: str = "skeleton"  # skeleton | complete


class CodeResource(BaseModel):
    filename: str
    language: str
    content: str
    explanation: str
    dependencies: list[str] = []


class CodeGenerateResponse(BaseModel):
    resources: list[CodeResource]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_json(text: str) -> str:
    """Strip markdown code fences if Claude wraps JSON in them."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    return match.group(1).strip() if match else text


def _anthropic_client() -> anthropic.Anthropic:
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="AI provider not configured")
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _inventory_to_text(inventory: list[StockItem]) -> str:
    lines = []
    for item in inventory:
        caps = ", ".join(k for k, v in item.connectivity_caps.items() if v)
        lines.append(
            f"- {item.name} (qty: {item.quantity}, category: {item.category}"
            f"{', platform: ' + item.platform_family if item.platform_family else ''}"
            f"{', connectivity: ' + caps if caps else ''})"
        )
    return "\n".join(lines) if lines else "(empty inventory)"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    """Verifica que la API está operativa."""
    return HealthResponse(status="ok", version=app.version)


@app.post("/ai/recognize", response_model=RecognizeResponse, tags=["ai"])
async def recognize_component(
    file: UploadFile = File(...),
    _claims: dict = Depends(verify_jwt),
) -> RecognizeResponse:
    """Recibe una imagen y devuelve el componente electrónico identificado."""
    client = _anthropic_client()
    image_bytes = await file.read()
    b64 = base64.standard_b64encode(image_bytes).decode()
    media_type = file.content_type or "image/jpeg"

    prompt = (
        "You are an expert electronics engineer. Analyze this image of an electronic component.\n"
        "Respond ONLY with a valid JSON object (no markdown) with these fields:\n"
        "{\n"
        '  "name": "exact component name or model",\n'
        '  "category": one of ["Microcontrolador","Sensor","Alimentación","Actuador","Módulo","Pasivo"],\n'
        '  "confidence": float 0-1,\n'
        '  "platform_family": one of ["ESP32","ESP8266","RP2040","STM32","AVR","nRF52","SAMD","Other"] or null,\n'
        '  "connectivity_caps": {"wifi":bool,"bluetooth":bool,"ble":bool,"lora":bool,"zigbee":bool,"thread":bool,"ethernet":bool},\n'
        '  "technical_specs": {key:value pairs of relevant specs},\n'
        '  "datasheet_url": "url or null",\n'
        '  "notes": "brief note or null"\n'
        "}"
    )

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                {"type": "text", "text": prompt},
            ],
        }],
    )

    try:
        data = json.loads(_extract_json(message.content[0].text))
        return RecognizeResponse(**data)
    except (json.JSONDecodeError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=f"AI response parse error: {exc}") from exc


@app.post("/ai/projects/discover", response_model=DiscoverResponse, tags=["ai"])
async def discover_projects(
    req: DiscoverRequest,
    _claims: dict = Depends(verify_jwt),
) -> DiscoverResponse:
    """Sugiere hasta 5 proyectos realizables con el inventario disponible."""
    client = _anthropic_client()
    inventory_text = _inventory_to_text(req.inventory)

    prompt = (
        "You are an IoT project advisor. Given this user's electronics inventory, suggest 5 interesting projects.\n\n"
        f"INVENTORY:\n{inventory_text}\n\n"
        "For each project compute viability_pct (0-100) based on how many required components are available.\n"
        "Respond ONLY with a valid JSON object (no markdown):\n"
        '{"suggestions": [\n'
        '  {\n'
        '    "title": "Project title",\n'
        '    "description": "2-3 sentence description",\n'
        '    "viability_pct": 85,\n'
        '    "difficulty": "beginner|intermediate|advanced",\n'
        '    "project_type": "diy|prototype|professional",\n'
        '    "tags": ["tag1","tag2"],\n'
        '    "bom": [\n'
        '      {"component_name":"ESP32","quantity_required":1,"state":"available","available_quantity":2,"alternatives":[],"notes":null}\n'
        "    ]\n"
        "  }\n"
        "]}"
    )

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        data = json.loads(_extract_json(message.content[0].text))
        suggestions = [ProjectSuggestion(**s) for s in data["suggestions"]]
        suggestions.sort(key=lambda s: s.viability_pct, reverse=True)
        return DiscoverResponse(suggestions=suggestions[:5])
    except (json.JSONDecodeError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=f"AI response parse error: {exc}") from exc


@app.post("/ai/projects/plan", response_model=PlanResponse, tags=["ai"])
async def plan_project(
    req: PlanRequest,
    _claims: dict = Depends(verify_jwt),
) -> PlanResponse:
    """Genera un BOM cruzado con el inventario a partir de una descripción en lenguaje natural."""
    client = _anthropic_client()
    inventory_text = _inventory_to_text(req.inventory)
    refinement_text = ""
    if req.refinement:
        r = req.refinement
        parts = []
        if r.preferred_controller:
            parts.append(f"preferred controller: {r.preferred_controller}")
        if r.difficulty:
            parts.append(f"target difficulty: {r.difficulty}")
        if r.constraints:
            parts.append(f"constraints: {', '.join(r.constraints)}")
        if parts:
            refinement_text = "\nREFINEMENT:\n" + "\n".join(f"- {p}" for p in parts)

    prompt = (
        f"You are an IoT project planner. The user wants to build:\n\"{req.description}\"\n\n"
        f"USER INVENTORY:\n{inventory_text}{refinement_text}\n\n"
        "Generate a complete BOM (bill of materials). For each item set state:\n"
        "- available: user has enough quantity\n"
        "- partial: user has some but not enough\n"
        "- missing: user doesn't have it\n"
        "- incompatible: user has it but wrong voltage/protocol\n"
        "Respond ONLY with valid JSON (no markdown):\n"
        '{"title":"Project title","description":"brief description","notes":"optional note or null","bom":['
        '{"component_name":"name","quantity_required":1,"state":"available","available_quantity":1,"alternatives":[],"notes":null}'
        "]}"
    )

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        data = json.loads(_extract_json(message.content[0].text))
        return PlanResponse(**data)
    except (json.JSONDecodeError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=f"AI response parse error: {exc}") from exc


@app.post("/ai/code/generate", response_model=CodeGenerateResponse, tags=["ai"])
async def generate_code(
    req: CodeGenerateRequest,
    _claims: dict = Depends(verify_jwt),
) -> CodeGenerateResponse:
    """Genera código de firmware para el proyecto según el entorno y tipo."""
    client = _anthropic_client()
    bom_text = "\n".join(
        f"- {item.component_name} (qty: {item.quantity_required})" for item in req.bom
    )
    mode_desc = "a complete working implementation" if req.mode == "complete" else "a well-structured skeleton with TODOs"

    prompt = (
        f"You are an embedded systems engineer. Generate {mode_desc} for:\n"
        f"Project: {req.project_title}\n"
        f"Type: {req.project_type}\n"
        f"Environment: {req.environment}\n"
        f"Components:\n{bom_text}\n\n"
        "Respond ONLY with valid JSON (no markdown):\n"
        '{"resources":['
        '{"filename":"main.ino","language":"cpp","content":"...full code...","explanation":"...","dependencies":["lib1"]}'
        "]}"
    )

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=8192,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        data = json.loads(_extract_json(message.content[0].text))
        return CodeGenerateResponse(resources=[CodeResource(**r) for r in data["resources"]])
    except (json.JSONDecodeError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=f"AI response parse error: {exc}") from exc


@app.get("/qr/{qr_code}", tags=["qr"])
async def get_qr_image(qr_code: str) -> Response:
    """Genera un PNG 400×200 con el QR code y texto de la ubicación."""
    from PIL import Image, ImageDraw, ImageFont

    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=6, border=2)
    qr.add_data(f"{settings.frontend_url}/l/{qr_code}")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0f766e", back_color="white").convert("RGB")

    canvas = Image.new("RGB", (400, 200), "#f8fafc")
    qr_size = 160
    qr_img = qr_img.resize((qr_size, qr_size), Image.LANCZOS)
    canvas.paste(qr_img, (20, 20))

    draw = ImageDraw.Draw(canvas)
    try:
        font_label = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
        font_code = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 10)
    except OSError:
        font_label = ImageFont.load_default()
        font_code = font_label

    draw.text((200, 30), "IoT Assistant", font=font_label, fill="#0f766e")
    draw.text((200, 60), "Escanea para ver", font=font_code, fill="#64748b")
    draw.text((200, 80), "el inventario de", font=font_code, fill="#64748b")
    draw.text((200, 100), "esta ubicación", font=font_code, fill="#64748b")
    draw.text((200, 140), f"ID: {qr_code[:20]}", font=font_code, fill="#94a3b8")

    buf = io.BytesIO()
    canvas.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.read(), media_type="image/png")
