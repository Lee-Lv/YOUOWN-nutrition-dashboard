# Nutrition Dashboard

> A small private nutrition dashboard built around **your own Google Sheet**.

**Language:** [中文 README](README.zh-CN.md)

---

## English

### Why this exists

I made this because I kept looking at paid health apps and thinking: I am paying for all of this, but I still do not get quite the workflow I want. Some features are things I never use, and the AI recognition is often nowhere near as useful to me as the GPT subscription I already have. This project keeps the data in a Google Sheet I control and turns that data into a private web dashboard.

I also did not want to spend weeks making a native app just to get a personal tool working. A web app is enough for this. Nutrition is just the first use case; the same idea works for trackers, household logs, training journals, collections, and small CRM tools.

### What it does

- Reads meal logs, nutrition targets, and optional weight records from Google Sheets.
- Shows calories, macros, fiber, salt, estimate ranges, alerts, trends, and expandable meal details.
- Forecasts the next seven days using the history already in the Sheet.
- Has English and Chinese UI, with the choice saved in the browser.
- Uses a private Google Apps Script JSON bridge instead of making the Sheet public.
- Can optionally accept Apple Health / Health Auto Export measurements.
- Keeps the code and data model open, so I can ask an AI coding assistant to change the project when I want.

### The idea and some UI examples

The dashboard is intentionally simple. It is mainly for looking at the data, not entering it. There are no meal, calorie, or health-input forms here. I describe or correct something in an AI conversation, the authorized workflow updates the Sheet, and this page shows the result.

When everything is normal, the page stays quiet and readable. The uncertainty band says “this is an estimate”, and the green focus card gives a small suggestion without getting in the way.

![Normal dashboard state](docs/images/dashboard-normal-top.jpg)

*Normal state: daily calorie progress, estimate range, today’s focus, and the three macro cards.*

The lower section stays compact. The chart shows actual and forecast values, records are grouped by day, and each meal opens when I want to see the details.

![Trend and recent records](docs/images/dashboard-normal-lower.jpg)

*History/forecast trend, daily navigation, expandable recent records, and the language selector.*

When something goes over the limit, the page becomes more direct: it says what went over, how much it went over by, and shows the 100% line plus the 120% warning zone.

![Over-target alert state](docs/images/dashboard-over-alert.jpg)

*Over-target state: the warning card and macro meters make the amount over target explicit.*

These are examples of the interface. The Sheet is still the source of truth. This page is here to make the data easier to understand, not to become a second database.

### Why I think this is worth doing

```text
Chat with an AI → review/correct a meal estimate → update your Sheet → refresh dashboard
                                                          │
Apple Health export ─────────────────────────────────────┘
                                                          ↓
                                              Your private web dashboard
```

| Layer | Role | Why it is useful |
| --- | --- | --- |
| Google Sheet | Source of truth | Easy to inspect, edit, export, and own. |
| AI chat workflow | Estimation and daily updates | Natural-language corrections are faster than forms for every edge case. |
| Google Apps Script | Small read/write bridge | Connects Sheets to the dashboard and optional health exports. |
| This web app | Presentation and interaction | Responsive dashboard, without a native-app release cycle. |
| ChatGPT Sites or another host | Private publishing | Makes a personal tool available as a web application. |

### A quick note about cost and platforms

The short version: I already pay for a GPT subscription, so I would rather use the AI tool I actually like for my own updates than pay another health app for features I do not need. But there is an important boundary here: this project does **not** make paid APIs universally free.

- A ChatGPT subscription may include the chat, agent, connector, or web-app features available in that plan. If the everyday update happens inside ChatGPT, I may not need a separate API integration for that step.
- A ChatGPT subscription is **not** the same thing as OpenAI API credits. OpenAI API calls, other AI providers, automation services, and connectors may cost extra and have separate limits.
- Google Sheets and Apps Script have their own quotas and account requirements.
- Verify current product capabilities and limits before relying on this cost model.

So the benefit is pretty simple: if you already pay for an AI chat product and it can handle your personal workflow, you may not need another nutrition-recognition subscription or a custom paid AI pipeline. Check the current plan, limits, and terms before relying on it.

### How the pieces fit together

```text
AI chat / assistant ── authorized update ──► Google Sheet
                                              食事日志 / 设置 / 体重
Apple Health export ── optional POST ──────► Google Apps Script bridge
                                                       │ authenticated JSON
                                                       ▼
                                            private Nutrition Dashboard
```

The dashboard fetches the Apps Script `doGet()` endpoint server-side. If that bridge is unavailable, the app may fall back to its configured local cache/database layer.

### Where things live

| Path | Purpose |
| --- | --- |
| `app/` | Dashboard routes, layout, language, and theme controls. |
| `components/` | Cards, charts, animated meters, meal accordion, and background effects. |
| `db/dashboard.ts` | Validates and normalizes the Apps Script payload. |
| `lib/` | Forecasting, calorie uncertainty, and localization. |
| `apps-script/Code.gs` | Google Apps Script bridge template. Copy it into your Apps Script project. |
| `tests/` | Forecast, uncertainty, and meal-detail checks. |

### What the Sheet needs to look like

The bridge recognizes common Chinese and English header aliases. The important `食事日志` fields are:

| Field | Example header | Used for |
| --- | --- | --- |
| Date | `日期` | Daily grouping and trend chart |
| Meal | `餐次` | Breakfast/lunch/dinner ordering |
| Food name | `食物 / 菜名` | Recent log |
| Serving | `整份描述` | Meal detail |
| Ratio | `摄入比例` | Actual consumed amount |
| Actual nutrients | `实际热量 kcal` … `实际盐分 g` | Totals and progress meters |
| Confidence | `估算依据 / 可信度` | Uncertainty range |
| Notes | `备注` | Expandable explanation |
| Stable ID | `entry_id` | Cross-system identity |
| Status | `记录状态` | Deleted rows are ignored |

`设置` uses column B: `B2:B7` for calorie/protein/fat/carbs/fiber/salt targets. `B16:B20` are optional metabolic metrics. `体重` is optional and supports date, time, weight (kg), body fat (%), source, raw timestamp, and a deduplication key.

### Getting it running

#### 1. Create the Apps Script bridge

1. In the Google Sheet, choose **Extensions → Apps Script**.
2. Copy [`apps-script/Code.gs`](apps-script/Code.gs) into the editor.
3. In **Project Settings → Script properties**, add:

   | Property | Value |
   | --- | --- |
   | `SPREADSHEET_ID` | The ID from the Google Sheet URL. |
   | `READ_TOKEN` | A long random secret for dashboard reads. |
   | `WRITE_TOKEN` | A different long random secret if health-export POST is enabled. |

4. Deploy as a **Web app**. Run as the Sheet owner and keep access as narrow as possible.
5. Test the `/exec` URL with `?token=YOUR_READ_TOKEN`; it should return JSON with `ok: true`.

> The committed script contains no real IDs or tokens. Keep real credentials in Apps Script Script Properties and the hosting platform's secret environment variables, never in Git.

#### 2. Configure dashboard runtime

| Variable | Value |
| --- | --- |
| `GOOGLE_SHEET_ENDPOINT` | Apps Script web-app `/exec` URL |
| `GOOGLE_SHEET_TOKEN` | Same value as `READ_TOKEN` |

Do not commit these values to `.env`, source files, screenshots, or prompts.

#### 3. Optional Apple Health export

Point the exporter at `/exec?writeKey=YOUR_WRITE_TOKEN` and send JSON with a timestamp, a weight/body-mass type, a value, and optionally a unit. The bridge recognizes kg/lb and fractional or percent body-fat values. Test a small range first.

The query key exists because custom headers are not consistently forwarded by Apps Script web apps. Treat the full URL as a secret and rotate `WRITE_TOKEN` if it leaks.

### Local checks

```bash
npm run lint
npm exec vite build
node --test tests/meal-accordion.test.mjs tests/calorie-uncertainty.test.mjs tests/calorie-forecast.test.mjs
```

### Where this can go next

The backing store does not have to be Google Sheets, and the assistant does not have to be ChatGPT. Any authorized combination works if it can safely update structured data and the app can read it:

- Another LLM, OCR service, or manual form can write to a Sheet/table.
- A database, Notion, Airtable, or another authorized system can replace Sheets.
- Email, iMessage, WhatsApp, WeChat, Facebook Messenger, or another messaging surface can become an input channel when an official integration path, your authorization, privacy settings, and security model are appropriate.

Do not automate account logins or scrape private services unless explicitly permitted. Prefer official APIs, exports, webhooks, or user-approved integrations.

### A few security basics

- Keep the repository private unless every secret and personal-data path has been reviewed.
- Never commit Sheet IDs, read/write tokens, health records, or exported logs.
- Use separate read and write tokens; rotate either one after accidental disclosure.
- Restrict Apps Script deployment access and use only systems/accounts you are authorized to automate.

### Version

`v1.0.0` is the first private release.
