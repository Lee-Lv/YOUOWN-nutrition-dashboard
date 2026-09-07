# AI-assisted installation

When a user says “Install YOUOWN for me”, treat the repository as an agent-installable project—not as a list of manual chores.

## Contract

1. Start with `npm run doctor -- --json` and inspect `.youown/state.json` before creating anything.
2. Reuse a healthy Sheet, Apps Script project, deployment, and configuration whenever they are already present.
3. Prefer project-local `clasp` and official Google authorization. The installer keeps its clasp home under ignored `.youown/`; do not use or overwrite the user's global clasp login.
4. Ask only for an account choice, interactive authorization, a resource choice, or an irreversible permission. Never ask the user to copy a token, URL, header, or source file by hand when the agent can do it.
5. Use browser fallback only for Google steps that do not have a stable CLI/API path: Script Properties and Web App access/deployment settings. Open the exact Google page, let the user approve, then resume from the CLI.
6. Never print, commit, upload, screenshot, or paste a full secret. State stores only token fingerprints; secrets live in ignored `.youown/secrets.env` with owner-only permissions where supported.
7. Do not claim completion until `npm run verify` passes.

## Happy path

```text
npm run install:ai
npm run google:auth                 # only if doctor reports missing auth
# Create/select the user's Sheet through an authorized Google workflow.
npm run sheet:setup -- --sheet-id SHEET_ID
npm run apps-script:setup
# Browser fallback: set Script Properties, deploy Web App, approve Google prompts.
npm run apps-script:setup -- --endpoint EXEC_URL --deployment-id DEPLOYMENT_ID
npm run verify
```

The browser fallback must set the two Apps Script Script Properties below using local values without exposing them to chat output:

```text
SPREADSHEET_ID = selected Sheet ID
READ_TOKEN     = .youown/secrets.env READ_TOKEN
```

Then deploy the Web App as the Sheet owner with the narrowest access setting that still permits the configured dashboard to read it. Resume with its `/exec` URL and run verification.

## Recovery behavior

- **A Sheet exists, Apps Script does not:** bind the existing Sheet and run `apps-script:setup`.
- **Apps Script exists but the local `.clasp.json` is absent:** record/reuse its script ID in `.youown/state.json`; do not create another project.
- **Endpoint becomes unhealthy:** run doctor with `--network`, repair only the failed Script Property/deployment setting, then rerun verify.
- **Authorization is missing:** run `google:auth`; wait for the official OAuth completion instead of asking the user to report back.
- **Verification fails:** keep the existing Sheet data untouched, fix the failed read link, then rerun verification.

## Scope

v1.1 verifies the local Dashboard + Google Sheet + Apps Script path. It intentionally does not automate a specific hosting provider, create an OAuth server, or introduce a different database.
