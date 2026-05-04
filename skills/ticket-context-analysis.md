# Ticket Context Analysis

Interpret each completed Linear ticket to identify product behavior relevant to analytics.

Inputs:
- Linear title, description, state, labels, project/team metadata, comments, attachments, links, and linked PR/design-doc references.

Outputs:
- Structured ticket summary.
- Affected user flows.
- Candidate analytics moments.
- Candidate repositories.
- Ambiguity and reviewer-attention notes.

Safety:
- Mark `needs_human_input` when user behavior, event semantics, or repository target cannot be inferred safely.
- Do not use unauthorized links or private credential files as context.
