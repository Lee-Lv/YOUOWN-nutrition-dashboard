import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  appsScriptDirectory, claspCommand, claspEnvironment, copyAppsScriptSource,
  loadSecrets, loadState, parseArgs, pathExists, report, run, saveState, updateDashboardEnv,
} from "./install-lib.mjs";

const args = parseArgs();
const state = await loadState(args);
const secrets = await loadSecrets(args);
const endpoint = String(args.endpoint || state.endpoint || "").trim();
const deploymentId = String(args["deployment-id"] || state.deploymentId || "").trim();

if (!state.sheetId) {
  report({ appsScript: { status: "needsSheet", detail: "Configure a Google Sheet first: npm run sheet:setup -- --sheet-id SHEET_ID" } }, args);
  process.exitCode = 2;
} else if (args["dry-run"]) {
  report({ appsScript: { status: "planned", detail: "Would create or reuse a Sheet-bound Apps Script project, copy Code.gs + Schema.gs, and push without forcing remote files." } }, args);
} else {
  const sourceDir = appsScriptDirectory(args);
  const clasp = claspCommand(args);
  const env = claspEnvironment(args);
  let next = { ...state };
  const claspFile = join(sourceDir, ".clasp.json");
  await copyAppsScriptSource(sourceDir);

  if (!next.appsScriptId) {
    await run(clasp, ["create", "--title", "YOUOWN Nutrition Bridge", "--parentId", next.sheetId, "--rootDir", "."], { cwd: sourceDir, env });
    next.appsScriptId = JSON.parse(await readFile(claspFile, "utf8")).scriptId;
  } else if (!(await pathExists(claspFile))) {
    await writeFile(claspFile, `${JSON.stringify({ scriptId: next.appsScriptId, rootDir: "." }, null, 2)}\n`, { mode: 0o600 });
  }

  await run(clasp, ["push"], { cwd: sourceDir, env });
  if (endpoint && secrets.READ_TOKEN) {
    next.endpoint = endpoint;
    next.deploymentId = deploymentId;
    await updateDashboardEnv({ endpoint, readToken: secrets.READ_TOKEN }, args);
  }
  await saveState(next, args);
  report({
    appsScript: { status: "pushed", detail: "Code.gs, Schema.gs, and appsscript.json were pushed without force-overwriting remote files." },
    browserFallback: {
      status: endpoint ? "configured" : "required",
      detail: endpoint
        ? "Endpoint saved locally; run npm run verify to initialize and test the chain."
        : "In Apps Script, set SPREADSHEET_ID, READ_TOKEN and WRITE_TOKEN in Script Properties; deploy a Web app, then rerun with --endpoint EXEC_URL [--deployment-id ID].",
    },
  }, args);
}
