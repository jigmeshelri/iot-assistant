from fastapi import FastAPI
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://iot:iot_secret@localhost:5432/iot_assistant"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

app = FastAPI(
    title="IoT Assistant API",
    description="Microservicio para reconocimiento de componentes e ingesta de telemetría.",
    version="0.1.0",
)


class HealthResponse(BaseModel):
    status: str
    version: str


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    """Verifica que la API está operativa."""
    return HealthResponse(status="ok", version=app.version)
