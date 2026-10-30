from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.predictions import router as predictions_router
from app.core.config import Settings
from app.core.errors import RequestIdMiddleware, UnexpectedErrorMiddleware, register_error_handlers


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings if settings is not None else Settings()
    application = FastAPI(title="Smart Agriculture API", version="0.1.0")
    register_error_handlers(application)
    application.add_middleware(UnexpectedErrorMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
        expose_headers=["X-Request-ID"],
    )
    application.add_middleware(RequestIdMiddleware)
    application.include_router(health_router)
    application.include_router(predictions_router)
    return application


app = create_app()
