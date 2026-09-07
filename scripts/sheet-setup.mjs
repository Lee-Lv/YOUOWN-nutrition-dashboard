import { loadState, parseArgs, report, saveState } from "./install-lib.mjs";

const args = parseArgs();
const state = await loadState(args);
const sheetId = String(args["sheet-id"] || state.sheetId || "").trim();

if (!sheetId) {
  report({ sheet: { status: "needsSelection", detail: "Choose or create a Google Sheet with your authorized Google account, then run: npm run sheet:setup -- --sheet-id SHEET_ID" } }, args);
} else if (!/^[A-Za-z0-9_-]{20,}$/.test(sheetId)) {
  throw new Error("The supplied Google Sheet ID does not look valid.");
} else {
  if (!args["dry-run"]) await saveState({ ...state, sheetId }, args);
  report({ sheet: { status: args["dry-run"] ? "planned" : "configured", detail: "The Sheet ID is stored only in ignored installer state. Schema initialization happens through the authenticated Apps Script bridge during verification." } }, args);
}
