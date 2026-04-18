from pathlib import Path


INPUT = Path("/home/rahul/project/backend/backend_explanation.txt")
OUTPUT = Path("/home/rahul/project/backend/backend_explanation.ps")

PAGE_BOTTOM = 50
PAGE_TOP = 780
LEFT_MARGIN = 50
LINE_HEIGHT = 14
FONT_NAME = "Courier"
FONT_SIZE = 10
MAX_COLS = 90


def escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap_line(text: str) -> list[str]:
    if text == "":
        return [""]

    words = text.split(" ")
    lines = []
    current = ""

    for word in words:
        if current == "":
            current = word
            continue

        candidate = f"{current} {word}"
        if len(candidate) <= MAX_COLS:
            current = candidate
        else:
            lines.append(current)
            current = word

    if current:
        lines.append(current)

    return lines


def build_pages(text: str) -> list[list[str]]:
    wrapped_lines = []
    for line in text.splitlines():
        wrapped_lines.extend(wrap_line(line))

    lines_per_page = (PAGE_TOP - PAGE_BOTTOM) // LINE_HEIGHT
    return [
        wrapped_lines[i : i + lines_per_page]
        for i in range(0, len(wrapped_lines), lines_per_page)
    ]


def main() -> None:
    text = INPUT.read_text()
    pages = build_pages(text)

    output = [
        "%!PS-Adobe-3.0",
        f"%%Pages: {len(pages)}",
        f"/{FONT_NAME} findfont {FONT_SIZE} scalefont setfont",
    ]

    for page_number, page in enumerate(pages, start=1):
        output.append(f"%%Page: {page_number} {page_number}")
        y = PAGE_TOP
        for line in page:
            output.append(f"{LEFT_MARGIN} {y} moveto ({escape(line)}) show")
            y -= LINE_HEIGHT
        output.append("showpage")

    OUTPUT.write_text("\n".join(output) + "\n")


if __name__ == "__main__":
    main()
