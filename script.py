from pathlib import Path
import re

# Match lines like:
## ── Extraction prompt
DECORATED_COMMENT_REGEX = re.compile(
    r'^(?P<indent>\s*#\s*)(?P<body>[─\-_=]{2,}\s*)(?P<text>.*?)(?P<trail>[─\-_=]*)\s*$'
)

# Fallback: lines that are mostly decorative but still contain text
ALT_REGEX = re.compile(
    r'^(?P<indent>\s*#\s*)([─\-_=]+\s*)?(?P<text>[^─\-_=#].*?)(\s*[─\-_=]+)?\s*$'
)

def clean_comment(line: str) -> str:
    for regex in (DECORATED_COMMENT_REGEX, ALT_REGEX):
        match = regex.match(line)
        if match:
            text = match.group("text").strip()
            if text:  # only transform if real text exists
                return f"{match.group('indent')}{text}\n"
    return line

def process_file(file_path: Path):
    original = file_path.read_text(encoding="utf-8").splitlines(keepends=True)
    updated = [clean_comment(line) for line in original]

    if original != updated:
        file_path.write_text("".join(updated), encoding="utf-8")
        print(f"Updated: {file_path}")

def main():
    root = Path(".")  # change if needed
    for py_file in root.rglob("*.py"):
        process_file(py_file)

if __name__ == "__main__":
    main()