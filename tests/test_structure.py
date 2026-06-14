import re
import unittest
from pathlib import Path

from app import app
from backend.config import FRONTEND_DIR, PROJECT_ROOT
from backend.security import create_token, verify_token
from service import app as workflow_app


class ProjectStructureTests(unittest.TestCase):
    def test_compatibility_entry_points_export_fastapi_apps(self):
        self.assertEqual(app.title, "OPC 智能试衣平台")
        self.assertTrue(workflow_app.title)

    def test_platform_routes_are_registered(self):
        paths = {route.path for route in app.routes}
        expected = {
            "/",
            "/api/health",
            "/api/auth/register",
            "/api/auth/login",
            "/api/me",
            "/api/profile",
            "/api/tryon/jobs",
            "/api/tryon/jobs/{job_id}",
            "/api/gallery",
            "/api/gallery/{result_id}/favorite",
            "/api/models",
            "/api/models/{model_id}",
            "/api/square",
            "/api/square/{post_id}",
            "/api/square/{post_id}/like",
            "/api/square/{post_id}/save",
            "/api/square/{post_id}/comments",
            "/api/square/{post_id}/save-model",
            "/api/credits/transactions",
            "/api/credits/recharge",
        }
        self.assertTrue(expected.issubset(paths))

    def test_workflow_routes_are_registered(self):
        paths = {route.path for route in workflow_app.routes}
        expected = {
            "/health",
            "/upload",
            "/try-on",
            "/try-on/async",
            "/try-on/result/{prompt_id}",
            "/image-edit/single",
            "/image-edit/single/async",
            "/image-edit/result/{prompt_id}",
        }
        self.assertTrue(expected.issubset(paths))

    def test_frontend_has_single_source(self):
        self.assertTrue((FRONTEND_DIR / "index.html").is_file())
        self.assertFalse((PROJECT_ROOT / "Ui").exists())
        self.assertFalse((PROJECT_ROOT / "shared").exists())
        self.assertFalse((PROJECT_ROOT / "index.html").exists())

    def test_local_frontend_assets_exist(self):
        html = (FRONTEND_DIR / "index.html").read_text(encoding="utf-8")
        references = re.findall(r'(?:src|href)="([^"]+)"', html)
        local_assets = [
            reference.split("?", 1)[0]
            for reference in references
            if reference.startswith("shared/")
        ]
        self.assertTrue(local_assets)
        missing = [
            asset
            for asset in local_assets
            if not (FRONTEND_DIR / Path(asset)).is_file()
        ]
        self.assertEqual(missing, [])

    def test_token_round_trip(self):
        user = {"id": 7, "email": "test@example.com"}
        payload = verify_token(create_token(user))
        self.assertEqual(payload["sub"], 7)
        self.assertEqual(payload["email"], "test@example.com")


if __name__ == "__main__":
    unittest.main()
