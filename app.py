"""Compatibility entry point for `uvicorn app:app`."""

from backend.main import app


__all__ = ["app"]
