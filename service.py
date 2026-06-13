"""Compatibility entry point for `uvicorn service:app`."""

from workflow_service.main import app


__all__ = ["app"]
