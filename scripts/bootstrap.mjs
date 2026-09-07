import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT,
  ensurePrivateDirectory,
  loadState,
  loadSecrets,
  parseArgs,
  randomToken,
  report,
  run,
  saveSecrets,
  saveState,
  stateDirectory,
  tokenFingerprint,
} from "./install-lib.mjs";

const args = parseArgs();
const dryRun = Boolean(args["dry-run"]);
const stateDir = stateDirectory(args);
const secrets = await loadSecrets(args);
const nextSecrets = {
  ...secrets,
  READ_TOKEN: secrets.READ_TOKEN || randomToken(),
};

if (!dryRun) {
  await ensurePrivateDirectory(stateDir);
  await ensurePrivateDirectory(join(stateDir, "clasp-home"));
  await ensurePrivateDirectory(join(stateDir, "apps-script"));
  await saveSecrets(nextSecrets, args);
  const state = await loadState(args);
  await saveState({
    ...state,
    readTokenFingerprint: tokenFingerprint(nextSecrets.READ_TOKEN),
  }, args);

  if (!args["skip-install"] && !existsSync(join(ROOT, "node_modules"))) {
    await run("npm", ["ci"], { cwd: ROOT });
  }
}

report({
  bootstrap: {
    status: dryRun ? "planned" : "ok",
    detail: dryRun ? "No files or tokens were created." : "Local state and separate read/write tokens are ready.",
  },
  dependencies: {
    status: existsSync(join(ROOT, "node_modules")) || args["skip-install"] ? "ready" : "installed",
    detail: args["skip-install"] ? "Dependency installation was intentionally skipped." : undefined,
  },
  secrets: {
    status: "configured",
    detail: "Stored only in ignored local state; values are never printed.",
  },
}, args);
