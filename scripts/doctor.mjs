import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT,
  claspCommand,
  claspEnvironment,
  commandAvailable,
  loadSecrets,
  loadState,
  parseArgs,
  pathExists,
  report,
  secretsPath,
  statePath,
} from "./install-lib.mjs";

const args = parseArgs();
const state = await loadState(args);
const secrets = await loadSecrets(args);
const clasp = claspCommand(args);
const claspInstalled = commandAvailable(clasp, ["--version"], { env: claspEnvironment(args) });
let googleAuth = "missing";
if (claspInstalled) {
  try {
    const { run } = await import("./install-lib.mjs");
    await run(clasp, ["show-authorized-user", "--json"], { env: claspEnvironment(args), inherit: false });
    googleAuth = "ok";
  } catch {
    googleAuth = "missing";
  }
}

let endpoint = "missing";
if (args.network && state.endpoint && secrets.READ_TOKEN) {
  try {
    const url = new URL(state.endpoint);
    url.searchParams.set("token", secrets.READ_TOKEN);
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const payload = await response.json();
    endpoint = response.ok && payload.ok === true ? "ok" : "unhealthy";
  } catch {
    endpoint = "unreachable";
  }
} else if (state.endpoint) {
  endpoint = "notChecked";
}

const result = {
  node: { status: Number(process.versions.node.split(".")[0]) >= 22 ? "ok" : "unsupported", detail: process.version },
  git: { status: commandAvailable("git") ? "ok" : "missing" },
  dependencies: { status: existsSync(join(ROOT, "node_modules")) ? "ok" : "missing" },
  clasp: { status: claspInstalled ? "ok" : "missing", detail: claspInstalled ? undefined : "Run npm run bootstrap to install project dependencies." },
  googleAuth: { status: googleAuth },
  installerState: { status: (await pathExists(statePath(args))) ? "ok" : "missing" },
  localSecrets: { status: (await pathExists(secretsPath(args))) && secrets.READ_TOKEN && secrets.WRITE_TOKEN ? "ok" : "missing" },
  sheet: { status: state.sheetId ? "configured" : "missing" },
  appsScript: { status: state.appsScriptId ? "configured" : "missing" },
  deployment: { status: state.deploymentId ? "configured" : "missing" },
  endpoint: { status: endpoint },
  dashboard: { status: state.endpoint && secrets.READ_TOKEN ? "configured" : "notConfigured" },
};

report(result, args);
process.exitCode = result.node.status === "ok" ? 0 : 1;
