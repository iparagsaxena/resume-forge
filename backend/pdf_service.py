"""Generate PDF documents from plain text using reportlab."""
import io
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib import colors


def _styles():
    base = getSampleStyleSheet()
    title = ParagraphStyle(
        "Title", parent=base["Heading1"], fontName="Helvetica-Bold",
        fontSize=18, leading=22, textColor=colors.HexColor("#0a0a0a"),
        spaceBefore=0, spaceAfter=4, alignment=TA_LEFT,
    )
    heading = ParagraphStyle(
        "Heading", parent=base["Heading2"], fontName="Helvetica-Bold",
        fontSize=11, leading=14, textColor=colors.HexColor("#0a0a0a"),
        spaceBefore=10, spaceAfter=4,
    )
    body = ParagraphStyle(
        "Body", parent=base["BodyText"], fontName="Helvetica",
        fontSize=10, leading=14, textColor=colors.HexColor("#1f1f1f"),
        spaceAfter=2,
    )
    bullet = ParagraphStyle(
        "Bullet", parent=body, leftIndent=12, bulletIndent=0, firstLineIndent=0,
    )
    return title, heading, body, bullet


def text_to_pdf(content: str, filename_hint: str = "document") -> bytes:
    """Convert a plain-text document (resume or cover letter) into a PDF."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        leftMargin=0.7 * inch, rightMargin=0.7 * inch,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        title=filename_hint,
    )
    title_style, heading_style, body_style, bullet_style = _styles()
    story = []
    lines = (content or "").replace("\r", "").split("\n")

    # Treat the first non-empty line as the title (name)
    first_content_seen = False
    for raw in lines:
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped:
            story.append(Spacer(1, 6))
            continue
        safe = _escape(stripped)
        if not first_content_seen:
            story.append(Paragraph(safe, title_style))
            first_content_seen = True
            continue
        # Detect all-caps section headers (SUMMARY, EXPERIENCE, ...)
        if _is_section_header(stripped):
            story.append(Paragraph(safe, heading_style))
            continue
        if stripped.startswith(("- ", "• ", "* ")):
            story.append(Paragraph(safe[2:].lstrip(), bullet_style, bulletText="•"))
            continue
        story.append(Paragraph(safe, body_style))

    doc.build(story)
    return buf.getvalue()


def _is_section_header(s: str) -> bool:
    if len(s) > 60:
        return False
    letters = [c for c in s if c.isalpha()]
    if not letters:
        return False
    upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
    return upper_ratio > 0.85


def _escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
