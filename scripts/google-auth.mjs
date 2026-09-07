import { ensurePrivateDirectory, claspCommand, claspEnvironment, parseArgs, report, run, stateDirectory } from "./install-lib.mjs";

const args = parseArgs();
const clasp = claspCommand(args);
const env = claspEnvironment(args);
await ensurePrivateDirectory(stateDirectory(args));
await ensurePrivateDirectory(env.HOME);

try {
  await run(clasp, ["show-authorized-user", "--json"], { env, inherit: false });
  report({ googleAuth: { status: "ok", detail: "Existing local clasp authorization will be reused." } }, args);
} catch {
  if (args["dry-run"]) {
    report({ googleAuth: { status: "needsAuthorization", detail: "Run clasp login; Google will open an OAuth consent flow." } }, args);
  } else {
    report({ googleAuth: { status: "needsAuthorization", detail: "Opening the official clasp OAuth flow. Approve it, then this command resumes." } }, args);
    await run(clasp, ["login"], { env });
    await run(clasp, ["show-authorized-user", "--json"], { env, inherit: false });
    report({ googleAuth: { status: "ok", detail: "Authorization is stored under ignored .youown/ state, not in your global home directory." } }, args);
  }
}
