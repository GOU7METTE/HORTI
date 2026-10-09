"""Check tracked configuration syntax, local Markdown links, and task dependencies."""

import ast
import json
import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    for relative in ("backend/pyproject.toml", "backend/uv.lock", ".codex/config.toml"):
        with (ROOT / relative).open("rb") as file:
            tomllib.load(file)
    for relative in (
        "frontend/package.json",
        "frontend/package-lock.json",
        "frontend/tsconfig.json",
    ):
        json.loads((ROOT / relative).read_text(encoding="utf-8"))
    for file in (ROOT / "backend").rglob("*.py"):
        if ".venv" not in file.parts:
            ast.parse(file.read_text(encoding="utf-8"), filename=str(file))
    markdown = list(ROOT.glob("*.md")) + list((ROOT / "docs").glob("*.md"))
    for file in markdown:
        for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", file.read_text(encoding="utf-8")):
            if "://" not in target and not target.startswith("#"):
                assert (file.parent / target.split("#")[0]).exists(), (
                    file.name,
                    target,
                )
    tasks = (ROOT / "TASKS.md").read_text(encoding="utf-8")
    identifiers = re.findall(r"\| \[[ x]\] \| (P\d-\d{2}) \|", tasks)
    assert len(identifiers) == len(set(identifiers)), "Duplicate task IDs"
    assert set(re.findall(r"P\d-\d{2}", tasks)) == set(identifiers), "Unknown task dependency"
    print("Foundation syntax, local links, and task IDs validated.")


if __name__ == "__main__":
    main()
