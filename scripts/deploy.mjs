import { ROOT, parseArgs, report, run } from "./install-lib.mjs";

const args = parseArgs();
if (!args.local) throw new Error("Only local deployment is implemented in v1.1. Use: npm run deploy:local");
if (!args["dry-run"]) await run("npm", ["exec", "vite", "build"], { cwd: ROOT });
report({ dashboard: { status: args["dry-run"] ? "planned" : "built", detail: "Local production build complete. Hosting adapters are intentionally out of scope for v1.1." } }, args);
