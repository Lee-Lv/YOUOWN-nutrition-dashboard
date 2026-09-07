# Google setup boundary

The installer can use local `clasp` to authenticate, create or reuse a Sheet-bound Apps Script project, copy the committed bridge files, and push them. Google deliberately keeps some sensitive setup flows interactive.

After the agent pushes the bridge, use the Apps Script UI to set Script Properties and publish the Web App. This is not a missing automation disguised as success: it is an explicit, user-approved Google boundary. The agent should navigate to the correct page, complete all non-sensitive work around it, then return to CLI verification.

Use a long random `READ_TOKEN` and keep it in Apps Script Script Properties and the local Dashboard environment. Treat it as a credential and never commit or paste it into public text.
