# Code Change Generation

Apply safe, scoped Mixpanel instrumentation changes.

Allowed changes:
- Add or update event constants/enums.
- Add Mixpanel tracking calls at validated trigger points.
- Add or update tests directly related to the generated event specs.

Requirements:
- Follow existing analytics helpers, code style, and naming conventions.
- Keep one PR per ticket per repository unless configured otherwise.
- Use the configured branch name and commit message templates.
- Run configured tests where available and capture a concise summary.

Disallowed changes:
- Broad refactors.
- New analytics frameworks.
- Secret or credential edits.
- Speculative code changes when context is insufficient.
