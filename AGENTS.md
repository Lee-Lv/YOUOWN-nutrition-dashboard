# YOUOWN agent instructions

If a user asks to install, set up, configure, repair, deploy, or start this project:

1. Read [`docs/AI_INSTALL.md`](docs/AI_INSTALL.md).
2. Run `npm run doctor -- --json` before changing anything.
3. Inspect and reuse the existing `.youown/` installation state; do not recreate a working Google Sheet, Apps Script project, deployment, or configuration.
4. Prefer the project scripts and official CLI/API paths. Use a browser only when OAuth consent, Script Properties, or Web App access settings cannot be completed by the official CLI.
5. Ask the user only for authentication approval, a required resource choice, or an irreversible permission change.
6. Never print, commit, upload, or paste credentials. Secrets live only in ignored local files.
7. Finish with `npm run verify`; never report a successful installation unless it passes.
