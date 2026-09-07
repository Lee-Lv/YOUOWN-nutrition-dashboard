import { readFile } from "node:fs/promises";
import { ROOT, loadSecrets, loadState, parseArgs, pathExists, report, run } from "./install-lib.mjs";

const args = parseArgs();
const state = await loadState(args);
const secrets = await loadSecrets(args);
const requirements = {
  state: Boolean(state.sheetId && state.appsScriptId && state.endpoint),
  tokens: Boolean(secrets.READ_TOKEN && secrets.WRITE_TOKEN),
};

if (!requirements.state || !requirements.tokens) {
  report({ verify: { status: "incomplete", detail: "Needs Sheet ID, Apps Script ID, Web App endpoint, and local read/write tokens before a live verification can run." } }, args);
  process.exitCode = 2;
} else if (args["dry-run"]) {
  report({ verify: { status: "planned", detail: "Would initialize schema, make an authenticated read, append a disposable test record, confirm it is readable, remove it, and build the dashboard." } }, args);
} else {
  const readUrl = new URL(state.endpoint);
  readUrl.searchParams.set("token", secrets.READ_TOKEN);
  readUrl.searchParams.set("setup", "1");
  const initial = await fetch(readUrl, { signal: AbortSignal.timeout(20_000) });
  const initialData = await initial.json();
  if (!initial.ok || !initialData.ok) throw new Error(`Apps Script read failed: ${initialData.error || initial.status}`);

  const probeId = `youown-install-${crypto.randomUUID().replace(/-/g, "")}`;
  const writeUrl = new URL(state.endpoint);
  writeUrl.searchParams.set("writeKey", secrets.WRITE_TOKEN);
  const post = async (action) => {
    const response = await fetch(writeUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ youownInstaller: { action, probeId } }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(`Apps Script probe ${action} failed: ${body.error || response.status}`);
  };

  try {
    await post("append");
    const readAfter = await fetch(readUrl, { signal: AbortSignal.timeout(20_000) });
    const dataAfter = await readAfter.json();
    const observed = (dataAfter.weights || []).some((row) => String(row.source || "").includes(probeId));
    if (!readAfter.ok || !dataAfter.ok || !observed) throw new Error("Disposable test record did not complete the Sheet → Apps Script read round trip.");
  } finally {
    await post("remove");
  }

  const envFile = `${ROOT}/.env.local`;
  if (!(await pathExists(envFile))) throw new Error("Dashboard .env.local was not generated.");
  const env = await readFile(envFile, "utf8");
  if (!env.includes("GOOGLE_SHEET_ENDPOINT=") || !env.includes("GOOGLE_SHEET_TOKEN=")) throw new Error("Dashboard environment is incomplete.");
  if (!args["skip-build"]) await run("npm", ["exec", "vite", "build"], { cwd: ROOT });
  report({ verify: { status: "passed", detail: "Schema, authenticated read, disposable round trip, cleanup, dashboard environment, and build all passed." } }, args);
}
