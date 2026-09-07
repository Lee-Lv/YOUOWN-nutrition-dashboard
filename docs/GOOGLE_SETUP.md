# Google setup boundary

The installer can use local `clasp` to authenticate, create or reuse a Sheet-bound Apps Script project, copy the committed bridge files, and push them. Google deliberately keeps some sensitive setup flows interactive.

After the agent pushes the bridge, use the Apps Script UI to set Script Properties and publish the Web App. This is not a missing automation disguised as success: it is an explicit, user-approved Google boundary. The agent should navigate to the correct page, complete all non-sensitive work around it, then return to CLI verification.

Use separate random `READ_TOKEN` and `WRITE_TOKEN` values. Treat both as credentials; the write URL is also a secret because it carries `writeKey` as a query parameter for compatibility with Health export tools.
