# Installer architecture

```text
Agent
  │ state-aware orchestration and user-approved OAuth
  ▼
scripts/doctor.mjs ──► .youown/state.json (IDs + token fingerprints only)
  │
  ├── bootstrap.mjs ──► .youown/secrets.env (ignored, private local file)
  ├── sheet-setup.mjs ──► records an existing/new Sheet ID
  ├── apps-script-setup.mjs ──► project-local clasp push
  └── verify.mjs ──► Sheet → Apps Script → Dashboard proof
```

`config/sheet-schema.json` is the human-maintained schema source. `apps-script/Schema.gs` is generated from it for Apps Script. The bridge adds missing tabs, headers, and default settings during the authenticated setup request; it does not overwrite existing values.

The state directory is configurable with `YOUOWN_STATE_DIR` or `--state-dir`. This makes testing and repair possible without touching another installation or the user's global home directory.
