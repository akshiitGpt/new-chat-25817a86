# Error Classification and Retry Decisioning

Classify connector, validation, git, test, and persistence errors.

Retryable:
- Rate limits.
- Network timeouts.
- 5xx responses from Linear, Notion, GitHub, Anthropic, or database services.

Non-retryable:
- Missing required configuration.
- Forbidden repository.
- Missing repository target.
- Ambiguous event semantics.
- Invalid generated event spec.
- Safety validation failure.

Requirements:
- Use bounded exponential backoff with jitter for retryable connector failures.
- Persist concise, redacted errors at ticket granularity.
- Continue remaining tickets when safe.
- Finalize runs as `completed`, `completed_with_errors`, or `failed`.
