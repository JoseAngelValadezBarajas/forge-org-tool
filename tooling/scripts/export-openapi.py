"""Export or verify the backend-owned OpenAPI contract."""
import json
import sys
from pathlib import Path

from forge_org.main import create_app

out = Path(__file__).resolve().parents[2] / "contracts" / "openapi" / "forge-org-v1.json"
content = json.dumps(create_app().openapi(), sort_keys=True, indent=2) + "\n"
if "--check" in sys.argv:
    if not out.is_file() or out.read_text(encoding="utf-8") != content:
        raise SystemExit("OpenAPI contract drift; regenerate with export-openapi.py")
    print("OpenAPI contract matches backend")
else:
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(content, encoding="utf-8")
    print(out)
