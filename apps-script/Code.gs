/**
 * Nutrition Dashboard — Google Apps Script bridge
 *
 * Required Script Properties:
 *   SPREADSHEET_ID  Google Sheet ID
 *   READ_TOKEN      secret used by the dashboard's GET request
 * Optional Script Properties:
 *   WRITE_TOKEN     secret used by a health-export POST request
 *
 * This file intentionally contains no real spreadsheet ID or token.
 */

const DEFAULTS = {
  logSheet: "食事日志",
  settingsSheet: "设置",
  weightSheet: "体重",
  timeZone: "Asia/Tokyo",
  targets: {
    calories: 2500,
    protein: 156.3,
    fat: 69.4,
    carbs: 312.5,
    fiber: 22,
    salt: 7.5,
  },
  metrics: {
    currentWeightKg: 90.8,
    basalMetabolicRate: 1796,
    baselineBurnCalories: 2155.2,
    activityFactor: 1.2,
    kcalPerKg: 7700,
  },
};

function doGet(e) {
  try {
    requireToken(e, "READ_TOKEN", "token");
    const spreadsheet = openSpreadsheet();
    const mealSheet = spreadsheet.getSheetByName(DEFAULTS.logSheet);
    if (!mealSheet) throw new Error("Missing sheet: " + DEFAULTS.logSheet);

    return json({
      ok: true,
      entries: readMealEntries(mealSheet),
      weights: readWeightHistory(spreadsheet.getSheetByName(DEFAULTS.weightSheet)),
      targets: readSettings(spreadsheet.getSheetByName(DEFAULTS.settingsSheet)).targets,
      metrics: readSettings(spreadsheet.getSheetByName(DEFAULTS.settingsSheet)).metrics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json({ ok: false, error: errorMessage(error) });
  }
}

function doPost(e) {
  try {
    // Query parameter is intentionally supported because some health-export
    // apps cannot reliably send custom headers to Apps Script web apps.
    requireToken(e, "WRITE_TOKEN", "writeKey");
    const body = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    const records = extractHealthRecords(JSON.parse(body));
    const result = appendHealthRecords(records);
    return json({
      ok: true,
      received: records.length,
      inserted: result.inserted,
      skipped: result.skipped,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json({ ok: false, error: errorMessage(error) });
  }
}

function openSpreadsheet() {
  const id = requiredProperty("SPREADSHEET_ID");
  return SpreadsheetApp.openById(id);
}

function requireToken(e, propertyName, parameterName) {
  const expected = requiredProperty(propertyName);
  const parameters = (e && e.parameter) || {};
  const headers = (e && e.headers) || {};
  const supplied = String(
    parameters[parameterName] ||
    parameters.token ||
    headers["x-nutrition-token"] ||
    headers["X-Nutrition-Token"] ||
    "",
  ).trim();
  if (!supplied || supplied !== expected) throw new Error("unauthorized");
}

function requiredProperty(name) {
  const value = String(PropertiesService.getScriptProperties().getProperty(name) || "").trim();
  if (!value) throw new Error("Missing Script Property: " + name);
  return value;
}

function readMealEntries(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const columns = columnMap(values[0]);
  const result = [];

  values.slice(1).forEach(function (row, index) {
    const entryDate = dateOnly(valueFor(row, columns, ["日期", "date", "entry_date"]));
    const foodName = textFor(row, columns, ["食物 / 菜名", "食物", "食物名称", "food", "food_name"]);
    const status = textFor(row, columns, ["记录状态", "状态", "status"]);
    if (!entryDate || !foodName || ["已删除", "删除", "作废", "deleted"].indexOf(status.toLowerCase()) >= 0) return;

    const recorded = valueFor(row, columns, ["记录时间", "recorded_at", "timestamp"]);
    result.push({
      id: textFor(row, columns, ["entry_id", "唯一id", "唯一编号"]) || "sheet-" + (index + 2),
      externalKey: textFor(row, columns, ["external_key", "entry_id", "唯一id", "唯一编号"]) || "sheet:" + (index + 2),
      entryDate: entryDate,
      meal: textFor(row, columns, ["餐次", "餐别", "meal"]) || "未分类",
      foodName: foodName,
      servingDescription: textFor(row, columns, ["整份描述", "分量", "份量", "serving", "serving_description"]),
      ratio: numberFor(valueFor(row, columns, ["摄入比例", "比例", "ratio"]), 1),
      calories: numberFor(valueFor(row, columns, ["实际热量 kcal", "热量", "kcal", "calories"]), 0),
      protein: numberFor(valueFor(row, columns, ["实际蛋白质 g", "蛋白质", "protein"]), 0),
      fat: numberFor(valueFor(row, columns, ["实际脂肪 g", "脂肪", "fat"]), 0),
      carbs: numberFor(valueFor(row, columns, ["实际碳水 g", "碳水", "碳水化合物", "carbs"]), 0),
      fiber: numberFor(valueFor(row, columns, ["实际纤维 g", "纤维", "膳食纤维", "fiber"]), 0),
      salt: numberFor(valueFor(row, columns, ["实际盐分 g", "盐分", "盐", "salt"]), 0),
      source: textFor(row, columns, ["来源", "source"]) || "Google Sheet",
      confidence: textFor(row, columns, ["估算依据 / 可信度", "可信度", "置信度", "confidence"]) || "中",
      notes: textFor(row, columns, ["备注", "说明", "notes"]),
      recordedAt: recordedAt(entryDate, recorded),
    });
  });

  return result.sort(function (a, b) {
    return (b.entryDate + b.recordedAt).localeCompare(a.entryDate + a.recordedAt);
  }).slice(0, 500);
}

function readWeightHistory(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const columns = columnMap(values[0]);
  return values.slice(1).map(function (row) {
    const date = dateOnly(valueFor(row, columns, ["日期", "date"]));
    const weightKg = numberFor(valueFor(row, columns, ["体重 kg", "体重kg", "体重", "weight"]), NaN);
    if (!date || !isFinite(weightKg) || weightKg <= 0) return null;
    const bodyFat = numberFor(valueFor(row, columns, ["体脂 %", "体脂率", "body fat percentage"]), NaN);
    return {
      date: date,
      time: timeOnly(valueFor(row, columns, ["时间", "time"])),
      weightKg: weightKg,
      bodyFatPercent: isFinite(bodyFat) ? bodyFat : null,
      source: textFor(row, columns, ["来源", "source"]) || "Google Sheet",
    };
  }).filter(Boolean).sort(function (a, b) {
    return (a.date + a.time).localeCompare(b.date + b.time);
  });
}

function readSettings(sheet) {
  const result = {
    targets: Object.assign({}, DEFAULTS.targets),
    metrics: Object.assign({}, DEFAULTS.metrics),
  };
  if (!sheet) return result;
  const values = sheet.getDataRange().getValues();
  const setting = function (row, fallback) {
    return numberFor(values[row - 1] && values[row - 1][1], fallback);
  };
  result.targets.calories = setting(2, result.targets.calories);
  result.targets.protein = setting(3, result.targets.protein);
  result.targets.fat = setting(4, result.targets.fat);
  result.targets.carbs = setting(5, result.targets.carbs);
  result.targets.fiber = setting(6, result.targets.fiber);
  result.targets.salt = setting(7, result.targets.salt);
  result.metrics.basalMetabolicRate = setting(16, result.metrics.basalMetabolicRate);
  result.metrics.baselineBurnCalories = setting(17, result.metrics.baselineBurnCalories);
  result.metrics.activityFactor = setting(18, result.metrics.activityFactor);
  result.metrics.kcalPerKg = setting(19, result.metrics.kcalPerKg);
  result.metrics.currentWeightKg = setting(20, result.metrics.currentWeightKg);
  return result;
}

function extractHealthRecords(payload) {
  const byTimestamp = {};
  const add = function (item, hint) {
    if (!item || typeof item !== "object") return;
    const type = String(item.type || item.name || item.identifier || item.quantityType || hint || "").toLowerCase();
    const kind = /weight|body.?mass|体重/.test(type) ? "weight" : (/body.?fat|fat.?percentage|^fat$|体脂/.test(type) ? "fat" : "");
    const timestamp = String(item.date || item.datetime || item.timestamp || item.startDate || item.start || item.time || "");
    let value = Number(item.value !== undefined ? item.value : (item.quantity !== undefined ? item.quantity : item.amount));
    if (!kind || !timestamp || !isFinite(value)) return;
    const unit = String(item.unit || item.units || "").toLowerCase();
    if (kind === "weight" && /lb|pound/.test(unit)) value *= 0.45359237;
    if (kind === "fat" && value > 1 && value <= 100) value /= 100;
    if (!byTimestamp[timestamp]) byTimestamp[timestamp] = { timestamp: timestamp };
    if (kind === "weight") byTimestamp[timestamp].weightKg = value;
    if (kind === "fat") byTimestamp[timestamp].bodyFatPercent = value * 100;
  };
  const walk = function (node, hint) {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(function (item) { walk(item, hint); });
    if (typeof node !== "object") return;
    add(node, hint);
    Object.keys(node).forEach(function (key) {
      const lower = key.toLowerCase();
      const nextHint = /weight|body.?mass|体重/.test(lower) ? "weight" : (/fat|体脂/.test(lower) ? "fat" : hint);
      if (typeof node[key] === "object") walk(node[key], nextHint);
    });
  };
  walk(payload, "");
  return Object.keys(byTimestamp).map(function (key) { return byTimestamp[key]; });
}

function appendHealthRecords(records) {
  const spreadsheet = openSpreadsheet();
  let sheet = spreadsheet.getSheetByName(DEFAULTS.weightSheet);
  const headers = ["日期", "时间", "体重 kg", "体脂 %", "腰围 cm", "来源", "原始时间戳", "去重键", "更新时间"];
  if (!sheet) sheet = spreadsheet.insertSheet(DEFAULTS.weightSheet);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const existing = sheet.getDataRange().getDisplayValues().slice(1).map(function (row) { return row[7]; });
  const seen = existing.reduce(function (set, key) { if (key) set[key] = true; return set; }, {});
  const now = new Date().toISOString();
  const rows = [];
  records.forEach(function (record) {
    const timestamp = new Date(record.timestamp);
    if (isNaN(timestamp.getTime())) return;
    const key = [timestamp.toISOString(), record.weightKg || "", record.bodyFatPercent || ""].join("|");
    if (seen[key]) return;
    rows.push([
      Utilities.formatDate(timestamp, DEFAULTS.timeZone, "yyyy-MM-dd"),
      Utilities.formatDate(timestamp, DEFAULTS.timeZone, "HH:mm:ss"),
      record.weightKg || "",
      record.bodyFatPercent || "",
      "",
      "Apple Health / Health Auto Export",
      timestamp.toISOString(),
      key,
      now,
    ]);
    seen[key] = true;
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  return { inserted: rows.length, skipped: records.length - rows.length };
}

function columnMap(headers) {
  const map = {};
  headers.forEach(function (header, index) { map[normalizeHeader(header)] = index; });
  return map;
}

function valueFor(row, columns, aliases) {
  for (let i = 0; i < aliases.length; i += 1) {
    const index = columns[normalizeHeader(aliases[i])];
    if (index !== undefined) return row[index];
  }
  return "";
}

function textFor(row, columns, aliases) { return String(valueFor(row, columns, aliases) || "").trim(); }
function normalizeHeader(value) { return String(value || "").trim().toLowerCase().replace(/\s+/g, ""); }
function numberFor(value, fallback) {
  const parsed = Number(String(value === null || value === undefined ? "" : value).replace(/,/g, ""));
  return isFinite(parsed) ? parsed : fallback;
}
function dateOnly(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") return Utilities.formatDate(value, DEFAULTS.timeZone, "yyyy-MM-dd");
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? "" : Utilities.formatDate(parsed, DEFAULTS.timeZone, "yyyy-MM-dd");
}
function timeOnly(value) {
  if (!value) return "";
  return Object.prototype.toString.call(value) === "[object Date]" ? Utilities.formatDate(value, DEFAULTS.timeZone, "HH:mm:ss") : String(value).trim();
}
function recordedAt(date, value) { return value ? String(value).trim() : date + "T00:00:00+09:00"; }
function errorMessage(error) { return String(error && error.message ? error.message : error); }
function json(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
