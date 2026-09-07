import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { spawn } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;

function invoke(script, args, stateDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(root, "scripts", script), ...args, "--state-dir", stateDir, "--json"], {
      cwd: root,
      env: { ...process.env, HOME: join(stateDir, "outside-home") },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("bootstrap is repeatable and stores no plaintext token in state", async () => {
  const stateDir = await mkdtemp(join(tmpdir(), "youown-installer-"));
  try {
    const first = await invoke("bootstrap.mjs", ["--skip-install"], stateDir);
    assert.equal(first.code, 0, first.stderr);
    const stateBefore = JSON.parse(await readFile(join(stateDir, "state.json"), "utf8"));
    const secrets = await readFile(join(stateDir, "secrets.env"), "utf8");
    assert.match(secrets, /^READ_TOKEN=.+/m);
    assert.ok(!JSON.stringify(stateBefore).includes("READ_TOKEN"));

    const bind = await invoke("sheet-setup.mjs", ["--sheet-id", "abcdefghijklmnopqrstuvwxyz0123456789"], stateDir);
    assert.equal(bind.code, 0, bind.stderr);
    const second = await invoke("bootstrap.mjs", ["--skip-install"], stateDir);
    assert.equal(second.code, 0, second.stderr);
    const stateAfter = JSON.parse(await readFile(join(stateDir, "state.json"), "utf8"));
    assert.equal(stateAfter.sheetId, "abcdefghijklmnopqrstuvwxyz0123456789");
  } finally {
    await rm(stateDir, { recursive: true, force: true });
  }
});

test("doctor reports partial configuration without exiting early", async () => {
  const stateDir = await mkdtemp(join(tmpdir(), "youown-installer-"));
  try {
    const result = await invoke("doctor.mjs", [], stateDir);
    assert.equal(result.code, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.sheet.status, "missing");
    assert.equal(report.appsScript.status, "missing");
    assert.ok(report.googleAuth.status === "missing" || report.googleAuth.status === "ok");
  } finally {
    await rm(stateDir, { recursive: true, force: true });
  }
});
