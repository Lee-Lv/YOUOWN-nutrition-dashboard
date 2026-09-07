import { createHash, randomBytes } from "node:crypto";
import { access, chmod, copyFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_STATE_DIR = join(ROOT, ".youown");
export const STATE_FILE = "state.json";
export const SECRETS_FILE = "secrets.env";

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      args._.push(value);
      continue;
    }
    const [key, inline] = value.slice(2).split("=", 2);
    if (inline !== undefined) args[key] = inline;
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) args[key] = argv[++index];
    else args[key] = true;
  }
  return args;
}

export function stateDirectory(args = {}) {
  return resolve(args["state-dir"] || process.env.YOUOWN_STATE_DIR || DEFAULT_STATE_DIR);
}

export function statePath(args = {}) {
  return join(stateDirectory(args), STATE_FILE);
}

export function secretsPath(args = {}) {
  return join(stateDirectory(args), SECRETS_FILE);
}

export function appsScriptDirectory(args = {}) {
  return join(stateDirectory(args), "apps-script");
}

export async function pathExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensurePrivateDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  try { await chmod(path, 0o700); } catch { /* Windows does not expose POSIX modes. */ }
}

export function initialState() {
  return {
    version: 1,
    sheetId: "",
    appsScriptId: "",
    deploymentId: "",
    endpoint: "",
    readTokenFingerprint: "",
    writeTokenFingerprint: "",
    updatedAt: "",
  };
}

export async function loadState(args = {}) {
  const path = statePath(args);
  if (!(await pathExists(path))) return initialState();
  const value = JSON.parse(await readFile(path, "utf8"));
  return { ...initialState(), ...value };
}

function assertStateIsSafe(state) {
  const serialized = JSON.stringify(state);
  if (/"(?:READ_TOKEN|WRITE_TOKEN|GOOGLE_SHEET_TOKEN)"\s*:/i.test(serialized)) {
    throw new Error("Refusing to store a secret in installer state.");
  }
}

export async function saveState(state, args = {}) {
  assertStateIsSafe(state);
  const directory = stateDirectory(args);
  await ensurePrivateDirectory(directory);
  const path = statePath(args);
  const next = { ...initialState(), ...state, updatedAt: new Date().toISOString() };
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, path);
  try { await chmod(path, 0o600); } catch { /* Windows does not expose POSIX modes. */ }
  return next;
}

export function tokenFingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function maskSecret(value) {
  if (!value) return "missing";
  return value.length <= 4 ? "****" : `****${value.slice(-4)}`;
}

export function randomToken() {
  return randomBytes(32).toString("base64url");
}

function parseEnv(text) {
  return Object.fromEntries(
    text.split(/\r?\n/).flatMap((line) => {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      return match ? [[match[1], match[2]]] : [];
    }),
  );
}

export async function loadSecrets(args = {}) {
  const path = secretsPath(args);
  if (!(await pathExists(path))) return {};
  return parseEnv(await readFile(path, "utf8"));
}

export async function saveSecrets(secrets, args = {}) {
  const directory = stateDirectory(args);
  await ensurePrivateDirectory(directory);
  const path = secretsPath(args);
  const body = Object.entries(secrets)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${String(value).replace(/[\r\n]/g, "")}`)
    .join("\n");
  await writeFile(path, `${body}\n`, { mode: 0o600 });
  try { await chmod(path, 0o600); } catch { /* Windows does not expose POSIX modes. */ }
}

export async function updateDashboardEnv({ endpoint, readToken }, args = {}) {
  if (!endpoint || !readToken) throw new Error("Dashboard configuration needs an endpoint and read token.");
  const path = resolve(args["env-file"] || join(ROOT, ".env.local"));
  const existing = (await pathExists(path)) ? await readFile(path, "utf8") : "";
  const kept = existing.split(/\r?\n/).filter((line) => !/^(GOOGLE_SHEET_ENDPOINT|GOOGLE_SHEET_TOKEN)=/.test(line));
  const lines = [
    ...kept.filter(Boolean),
    `GOOGLE_SHEET_ENDPOINT=${endpoint}`,
    `GOOGLE_SHEET_TOKEN=${readToken}`,
    "",
  ];
  await writeFile(path, lines.join("\n"), { mode: 0o600 });
  try { await chmod(path, 0o600); } catch { /* Windows does not expose POSIX modes. */ }
}

export function commandAvailable(command, args = ["--version"], options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd || ROOT, env: options.env || process.env, stdio: "ignore" });
  return result.status === 0;
}

export function claspCommand(args = {}) {
  const candidate = resolve(args.clasp || join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "clasp.cmd" : "clasp"));
  return candidate;
}

export function claspEnvironment(args = {}) {
  const directory = stateDirectory(args);
  return {
    ...process.env,
    HOME: join(directory, "clasp-home"),
    USERPROFILE: join(directory, "clasp-home"),
  };
}

export async function run(command, commandArgs, options = {}) {
  const { cwd = ROOT, env = process.env, inherit = true } = options;
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, commandArgs, { cwd, env, stdio: inherit ? "inherit" : "pipe" });
    let stdout = "";
    let stderr = "";
    if (!inherit) {
      child.stdout?.on("data", (chunk) => { stdout += chunk; });
      child.stderr?.on("data", (chunk) => { stderr += chunk; });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise({ stdout, stderr });
      else reject(new Error(`${command} exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
    });
  });
}

export async function copyAppsScriptSource(destination) {
  await ensurePrivateDirectory(destination);
  for (const name of ["Code.gs", "Schema.gs", "appsscript.json"]) {
    await copyFile(join(ROOT, "apps-script", name), join(destination, name));
  }
}

export async function fileMode(path) {
  try { return (await stat(path)).mode & 0o777; } catch { return null; }
}

export function report(value, args = {}) {
  if (args.json) process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  else {
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === "object" && item && "status" in item) process.stdout.write(`${key}: ${item.status}${item.detail ? ` — ${item.detail}` : ""}\n`);
      else process.stdout.write(`${key}: ${typeof item === "string" ? item : JSON.stringify(item)}\n`);
    }
  }
}
