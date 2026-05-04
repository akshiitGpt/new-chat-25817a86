# Event Specification Generation

Produce reviewable Mixpanel event specifications from ticket and code context.

Each required event must include:
- Event name, following repository convention when discoverable, such as `start_agent_chat`.
- Code constant or enum, such as `START_AGENT_CHAT`.
- Description of the captured behavior.
- Concrete trigger point.
- Properties with names, types, and descriptions.
- Source Linear ticket ID and URL.
- Target repository when known.
- Implementation notes.
- Uncertainty or reviewer-attention notes.

Rules:
- Generate zero, one, or multiple events as justified by the ticket.
- Mark `no_event_needed` when no new event is warranted.
- Mark `needs_human_input` rather than inventing event semantics.
