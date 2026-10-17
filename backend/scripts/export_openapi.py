import argparse
import json
from pathlib import Path

from app.main import app

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    path = Path(__file__).resolve().parents[1] / "openapi.json"
    schema = json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n"
    if args.check:
        if not path.exists() or path.read_text() != schema:
            raise SystemExit(
                "OpenAPI export differs; run python -m scripts.export_openapi"
            )
    else:
        path.write_text(schema)
