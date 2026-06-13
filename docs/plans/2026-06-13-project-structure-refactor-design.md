# Project Structure Refactor Design

## Goal

Eliminate duplicate frontend sources and separate HTTP routing, business services,
database access, configuration, and workflow integration without changing public APIs.

## Decision

Use a modular monolith. FastAPI remains the backend framework and the existing workflow
adapter remains independently deployable. A microservice split or frontend framework
migration would add operational cost without solving the current duplication problem.

## Boundaries

- `frontend/` is the only frontend source and the only directory served as static files.
- `backend/` owns platform configuration, authentication, persistence, business services,
  and API routes.
- `workflow_service/` owns the ComfyUI-facing generation API.
- Root `app.py` and `service.py` remain small compatibility entry points.
- Existing API paths, environment variable names, and database schema remain unchanged.

## Risks And Mitigations

- Frontend variants have diverged: retain the currently served root frontend as canonical.
- Imports may break deployment commands: keep `uvicorn app:app` and
  `uvicorn service:app` working.
- Behavior may drift while moving code: use compile/import checks and endpoint route
  assertions after each structural change.

