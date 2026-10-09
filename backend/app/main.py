from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router
from app.core.config import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings if settings is not None else Settings()
    application = FastAPI(title="Smart Agriculture API", version="0.1.0")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["Content-Type"],
    )
    application.include_router(router)
    return application


app = create_app()
