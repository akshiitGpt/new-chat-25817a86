# Codebase Analysis

Find existing Mixpanel and analytics conventions before drafting or applying instrumentation.

Inputs:
- Linked PR diffs, repository files, existing Mixpanel calls, analytics helpers, constants/enums, package structure, and test structure.

Outputs:
- Existing event naming conventions.
- Existing property conventions.
- Candidate files and insertion points.
- Test commands and test strategy.

Safety:
- Prefer existing helpers and constants.
- Do not invent a new analytics layer when a repository already has one.
- Do not refactor unrelated code.
- Respect configured repository allowlists and allowed file globs.
