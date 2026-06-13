import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
load_dotenv(PROJECT_ROOT / ".env")


@dataclass(frozen=True)
class Settings:
    tryon_service_url: str
    secret_key: str
    token_ttl_seconds: int
    mock_tryon: bool
    postgres_host: str
    postgres_port: str
    postgres_db: str
    database_url: str
    allow_origins: tuple[str, ...]


def load_settings() -> Settings:
    postgres_host = os.getenv("POSTGRES_HOST", "42.192.112.233")
    postgres_port = os.getenv("POSTGRES_PORT", "5432")
    postgres_db = os.getenv("POSTGRES_DB", "opc_tryon")
    postgres_user = os.getenv("POSTGRES_USER", "opc")
    postgres_password = os.getenv("POSTGRES_PASSWORD", "opc_change_me")
    default_database_url = (
        f"postgresql://{quote_plus(postgres_user)}:{quote_plus(postgres_password)}"
        f"@{postgres_host}:{postgres_port}/{postgres_db}"
    )
    origins = tuple(
        origin.strip()
        for origin in os.getenv("ALLOW_ORIGINS", "*").split(",")
        if origin.strip()
    )
    return Settings(
        tryon_service_url=os.getenv(
            "TRYON_SERVICE_URL", "http://42.192.112.233:8008"
        ).rstrip("/"),
        secret_key=os.getenv("OPC_SECRET_KEY", "dev-opc-change-me"),
        token_ttl_seconds=int(
            os.getenv("OPC_TOKEN_TTL_SECONDS", str(7 * 24 * 3600))
        ),
        mock_tryon=os.getenv("OPC_MOCK_TRYON", "false").lower() == "true",
        postgres_host=postgres_host,
        postgres_port=postgres_port,
        postgres_db=postgres_db,
        database_url=os.getenv("DATABASE_URL", default_database_url),
        allow_origins=origins or ("*",),
    )


settings = load_settings()
