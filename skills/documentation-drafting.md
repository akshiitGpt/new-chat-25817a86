# Documentation Drafting

Create concise Notion-ready event documentation grouped by Linear ticket ID.

The Notion entry must include:
- Linear ticket ID, title, and URL.
- Processing status.
- Event names and constants/enums.
- Descriptions and trigger points.
- Properties with types and descriptions.
- Target repositories.
- Implementation notes.
- Uncertainty notes.
- PR URLs and test summaries when available.

Idempotency:
- Search the configured Notion target by Linear ticket ID before writing.
- Update the existing ticket entry when present.
- Do not create duplicate pages or database rows for a processed ticket.
