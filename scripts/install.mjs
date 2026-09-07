import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, loadState, parseArgs, report, run } from "./install-lib.mjs";

const args = parseArgs();
const state = await loadState(args);
const sharedArgs = [
  ...(args["state-dir"] ? ["--state-dir", args["state-dir"]] : []),
  ...(args.json ? ["--json"] : []),
];
if (!existsSync(join(ROOT, "node_modules")) || !state.readTokenFingerprint || !state.writeTokenFingerprint) {
  await run(process.execPath, [join(ROOT, "scripts", "bootstrap.mjs"), ...sharedArgs, ...(args["dry-run"] ? ["--dry-run"] : [])]);
}
await run(process.execPath, [join(ROOT, "scripts", "doctor.mjs"), ...sharedArgs, "--json", ...(args.network ? ["--network"] : [])]);
const next = await loadState(args);
report({
  nextStep: {
    status: !next.sheetId ? "sheet" : !next.appsScriptId ? "appsScript" : !next.endpoint ? "browserFallback" : "verify",
    detail: !next.sheetId
      ? "Agent: create or select the user's Google Sheet, then bind it with npm run sheet:setup -- --sheet-id SHEET_ID."
      : !next.appsScriptId
        ? "Agent: run npm run google:auth then npm run apps-script:setup."
        : !next.endpoint
          ? "Agent: open the Apps Script settings/deployment UI for the user-approved Script Properties and Web App access step."
          : "Run npm run verify to prove the data path.",
  },
}, args);
