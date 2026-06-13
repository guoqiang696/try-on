from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import FRONTEND_DIR, settings
from backend.database import init_db
from backend.routers import auth, credits, gallery, health, profile, tryon


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="OPC 智能试衣平台",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allow_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def no_cache_frontend_assets(request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path == "/" or path.endswith((".html", ".css", ".js")):
            response.headers["Cache-Control"] = "no-store, max-age=0"
        return response

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(auth.me_router)
    app.include_router(profile.router)
    app.include_router(tryon.router)
    app.include_router(gallery.router)
    app.include_router(credits.router)

    @app.get("/", include_in_schema=False)
    async def index() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "index.html")

    app.mount(
        "/shared",
        StaticFiles(directory=FRONTEND_DIR / "shared"),
        name="shared",
    )
    return app


app = create_app()
