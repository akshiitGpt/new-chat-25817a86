# Configuration

`openclaw.json` contains non-secret runtime configuration for the Linear-to-Mixpanel Agent. Environment variables contain credentials and are loaded from `.env` at runtime.

Before deployment, configure:

- Linear scope type, scope ID, and Done/completed workflow state IDs.
- Notion RUH AI target type and target ID.
- GitHub auth type, organizations, repository allowlist, base branch, branch template, and test commands.
- Persistence driver and `DATABASE_URL`.
- Anthropic, Linear, Notion, GitHub, and database secrets in `.env`.

Secrets must remain outside `SOUL.md`, `openclaw.json`, Notion docs, PR bodies, logs, commits, and model prompts.
