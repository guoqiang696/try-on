# Project Structure Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicate frontend code and reorganize the FastAPI applications around clear frontend, platform backend, and workflow service responsibilities.

**Architecture:** Keep a modular FastAPI monolith for the platform and a separately deployable workflow adapter. Preserve root compatibility modules while moving implementation into packages.

**Tech Stack:** Python 3, FastAPI, psycopg, httpx, static HTML/CSS/JavaScript

---

### Task 1: Consolidate frontend assets

**Files:**
- Create: `frontend/index.html`
- Create: `frontend/shared/`
- Delete: `Ui/`
- Delete: root `index.html` and `shared/`

Move the currently served frontend into `frontend/`, update static serving paths, and
verify every HTML asset reference resolves.

### Task 2: Split platform backend

**Files:**
- Create: `backend/config.py`
- Create: `backend/database.py`
- Create: `backend/security.py`
- Create: `backend/schemas.py`
- Create: `backend/services/`
- Create: `backend/routers/`
- Create: `backend/main.py`
- Modify: `app.py`

Move configuration, database setup, authentication, workflow client logic, business
services, and route groups into dedicated modules while preserving API behavior.

### Task 3: Split workflow service

**Files:**
- Create: `workflow_service/main.py`
- Modify: `service.py`

Move the implementation into its package and retain the root module as a compatibility
entry point.

### Task 4: Verify and document

Run Python compilation, import both compatibility applications, assert expected routes,
check frontend references, and update startup documentation.

