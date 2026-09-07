# Nutrition Dashboard / 饮食 Dashboard

> A private, AI-assisted nutrition dashboard built around **your own Google Sheet**.
> 基于**你自己的 Google Sheet**构建的私有 AI 辅助饮食 Dashboard。

**Languages / 语言：** [English](#english) · [中文](#中文)

---

<a id="english"></a>

## English

### Why this exists

Many nutrition apps charge recurring fees while food recognition, corrections, historical context, and personal workflows remain constrained. This project takes another path: keep the data in a Google Sheet you control, use an AI chat workflow to estimate or correct entries, and render the result as a polished private web application.

It is for people who want a useful personal application quickly without first building a native iOS/Android app, operating a bespoke backend, or accepting a fixed feature set from a subscription app. Nutrition is only the example: the same pattern also works for trackers, household logs, training journals, collections, and lightweight CRM tools.

### What it does

- Reads meal logs, nutrition targets, and optional weight records from Google Sheets.
- Shows calories, macro targets, fiber, salt, uncertainty ranges, alerts, trends, and expandable meal details.
- Forecasts the next seven days from historical weekly totals and weekday patterns.
- Supports English and Chinese UI; the selected language is saved in the browser.
- Uses a private Google Apps Script JSON bridge so the dashboard can read the Sheet without making the Sheet public.
- Optionally accepts Apple Health / Health Auto Export weight and body-fat records.
- Keeps source and data model under the owner's control, so an AI coding assistant can implement new features instead of waiting for an app vendor.

### The practical value

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

### Cost and platform boundaries — important

This repository reduces operational friction; it does **not** make paid APIs universally free.

- A ChatGPT subscription may include supported chat, agent, connector, or web-app workflows within that plan's limits. When ordinary personal updates are done inside ChatGPT, that can avoid a separate API integration.
- A ChatGPT subscription is **not** an API credit balance. OpenAI API calls, other AI providers, external automation services, and third-party connectors may have separate pricing, quotas, and terms.
- Google Sheets and Apps Script have their own quotas and account requirements.
- Verify current product capabilities and limits before relying on this cost model.

The benefit is specific: if you already pay for an AI chat product and use its included capabilities for personal updates, you may avoid another nutrition-recognition subscription or a custom paid AI API pipeline. This is legitimate use of the products you subscribe to, subject to their current terms and limits.

### Architecture

```text
AI chat / assistant ── authorized update ──► Google Sheet
                                              食事日志 / 设置 / 体重
Apple Health export ── optional POST ──────► Google Apps Script bridge
                                                       │ authenticated JSON
                                                       ▼
                                            private Nutrition Dashboard
```

The dashboard fetches the Apps Script `doGet()` endpoint server-side. If that bridge is unavailable, the app may fall back to its configured local cache/database layer.

### Repository map

| Path | Purpose |
| --- | --- |
| `app/` | Dashboard routes, layout, language, and theme controls. |
| `components/` | Cards, charts, animated meters, meal accordion, and background effects. |
| `db/dashboard.ts` | Validates and normalizes the Apps Script payload. |
| `lib/` | Forecasting, calorie uncertainty, and localization. |
| `apps-script/Code.gs` | Google Apps Script bridge template. Copy it into your Apps Script project. |
| `tests/` | Forecast, uncertainty, and meal-detail checks. |

### Google Sheet contract

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

### Setup

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

### Extending the pattern

The backing store does not have to be Google Sheets, and the assistant does not have to be ChatGPT. Any authorized combination works if it can safely update structured data and the app can read it:

- Another LLM, OCR service, or manual form can write to a Sheet/table.
- A database, Notion, Airtable, or another authorized system can replace Sheets.
- Email, iMessage, WhatsApp, WeChat, Facebook Messenger, or another messaging surface can become an input channel when an official integration path, your authorization, privacy settings, and security model are appropriate.

Do not automate account logins or scrape private services unless explicitly permitted. Prefer official APIs, exports, webhooks, or user-approved integrations.

### Security

- Keep the repository private unless every secret and personal-data path has been reviewed.
- Never commit Sheet IDs, read/write tokens, health records, or exported logs.
- Use separate read and write tokens; rotate either one after accidental disclosure.
- Restrict Apps Script deployment access and use only systems/accounts you are authorized to automate.

### Version

`v1.0.0` is the first private release.

---

<a id="中文"></a>

## 中文

### 为什么做这个项目

很多饮食 App 收取持续订阅费，但食物识别、纠错、历史语境和个人工作流仍然受限。这个项目换了一条路线：数据始终放在你可检查、可导出、可控制的 Google Sheet 里；日常记录和估算可以通过 AI 对话辅助完成；最后把结果呈现为一个精致的私有 Web Application。

它适合希望快速做出真正能用的个人应用、但不想先做 iOS/Android 原生 App、不想维护复杂后端、也不想被付费 App 的固定功能绑住的人。饮食记录只是示例；个人追踪、家庭日志、训练日记、收藏管理、轻量 CRM 也可以采用同样模式。

### 现在能做什么

- 从 Google Sheet 读取饮食记录、营养目标和可选体重记录。
- 展示热量、三大营养素、纤维、盐分、估算误差区间、提醒、趋势和可展开的饮食明细。
- 依据历史周总量和周内波动预测未来 7 天摄入热量。
- 支持中英文界面，语言选择会保存在浏览器中。
- 通过私有 Google Apps Script JSON 桥接读取 Sheet，不需要公开整个 Sheet。
- 可选接入 Apple Health / Health Auto Export，写入体重与体脂记录。
- 源码和数据模型由自己掌握；需要新功能时，可让 AI 编程助手实现，而不是等待 App 厂商更新。

### 项目的实际利益

```text
与 AI 对话 → 审核/修正一餐的估算 → 更新 Google Sheet → 刷新 Dashboard
                                               │
Apple Health 自动导出 ────────────────────────┘
                                               ↓
                                      你自己的私有 Web App
```

| 层级 | 做什么 | 为什么有价值 |
| --- | --- | --- |
| Google Sheet | 数据唯一来源 | 随时查看、修改、导出，数据归你。 |
| AI 对话工作流 | 估算与日常更新 | 用自然语言修正记录，比为每个边缘情况做表单更快。 |
| Google Apps Script | 小型读写桥接 | 把 Sheet、网页和可选健康导出连接起来。 |
| 本 Web App | 展示与交互 | 不需要原生 App 的发布周期，也能有完整 Dashboard 体验。 |
| ChatGPT Sites 或其他托管 | 私有发布 | 把个人工具直接作为网页应用使用。 |

### 成本和平台边界：这一点很重要

这个项目减少的是运维和重复订阅摩擦，并不代表“所有付费 API 都免费”。

- 如果你已经订阅了 ChatGPT，并且你的套餐包含相应的对话、代理、连接器或 Web Application 能力，那么日常在 ChatGPT 里完成的个人记录工作流可以在该套餐限额内进行，不必另搭一条 API 调用链。
- **ChatGPT 订阅不等于 OpenAI API 额度。** OpenAI API、其他 AI 提供商、外部自动化服务及第三方连接器都可能有独立费用、限额与条款。
- Google Sheets 与 Apps Script 也有自己的账号要求和配额。
- 使用前应确认当前产品能力、条款和限额。

所以它的经济意义是明确而有限的：如果你本来就在为 AI 对话产品付费，并在套餐已包含的能力范围内做日常更新，通常可以避免再订一份识别质量不满足需求的饮食 App，或维护一条独立付费的 AI API 管线。这是对已订阅产品的正常利用，但必须服从当前条款与限额。

### 系统结构

```text
AI 对话 / 助手 ── 已授权的数据更新 ──► Google Sheet
                                      食事日志 / 设置 / 体重
Apple Health 导出 ── 可选 POST ─────► Google Apps Script 桥接
                                               │ 带鉴权 JSON
                                               ▼
                                     私有 Nutrition Dashboard
```

Dashboard 在服务端读取 Apps Script 的 `doGet()`。桥接不可用时，如果托管环境配置了缓存/数据库层，项目会尝试该层回退。

### 仓库结构

| 路径 | 作用 |
| --- | --- |
| `app/` | 页面、布局、语言与主题切换。 |
| `components/` | 卡片、图表、动态进度条、饮食明细与背景效果。 |
| `db/dashboard.ts` | 校验并规范化 Apps Script 返回的数据。 |
| `lib/` | 热量预测、估算误差和多语言逻辑。 |
| `apps-script/Code.gs` | Google Apps Script 桥接模板；复制到 Apps Script 项目中。 |
| `tests/` | 预测、误差和饮食明细测试。 |

### Google Sheet 数据约定

桥接支持常见中英文表头别名。当前 `食事日志` 的主要字段如下：

| 字段 | 示例表头 | 用途 |
| --- | --- | --- |
| 日期 | `日期` | 每日汇总和趋势图 |
| 餐次 | `餐次` | 早/中/晚排序 |
| 食物名称 | `食物 / 菜名` | 最近记录 |
| 份量 | `整份描述` | 展开的饮食明细 |
| 摄入比例 | `摄入比例` | 实际摄入量 |
| 实际营养 | `实际热量 kcal` … `实际盐分 g` | 每日合计和进度条 |
| 可信度 | `估算依据 / 可信度` | 热量误差区间 |
| 备注 | `备注` | 展开的估算说明 |
| 稳定 ID | `entry_id` | 跨系统识别 |
| 状态 | `记录状态` | 标为删除的行不会显示 |

`设置` 使用 B 列：`B2:B7` 是热量/蛋白质/脂肪/碳水/纤维/盐分目标；`B16:B20` 可存放代谢相关可选指标。`体重` 表是可选的，支持日期、时间、体重 kg、体脂 %、来源、原始时间戳和去重键。

### 配置方式

#### 1. 创建 Google Apps Script 桥接

1. 在 Google Sheet 中选择 **扩展程序 → Apps Script**。
2. 将 [`apps-script/Code.gs`](apps-script/Code.gs) 复制进 Apps Script 编辑器。
3. 在 **项目设置 → 脚本属性（Script properties）** 中添加：

   | 属性名 | 填写内容 |
   | --- | --- |
   | `SPREADSHEET_ID` | Google Sheet URL 中的 ID。 |
   | `READ_TOKEN` | 供 Dashboard 读取的一段长随机密钥。 |
   | `WRITE_TOKEN` | 启用健康数据 POST 时填写另一段不同的长随机密钥。 |

4. 部署为 **Web app**。执行身份选择 Sheet 所有者；访问范围尽量收紧。
5. 用 `/exec?token=YOUR_READ_TOKEN` 测试；正常时应返回含 `ok: true` 的 JSON。

> 仓库脚本不含任何真实 ID 或 Token。真实凭据只能保存在 Script Properties 和托管平台的秘密环境变量中，不能提交到 Git。

#### 2. 配置 Dashboard 运行时

| 变量 | 内容 |
| --- | --- |
| `GOOGLE_SHEET_ENDPOINT` | Apps Script Web app 的 `/exec` URL |
| `GOOGLE_SHEET_TOKEN` | 与 `READ_TOKEN` 相同的值 |

不要把这些值提交到 `.env`、代码、截图或公开聊天记录中。

#### 3. 可选：Apple Health / Health Auto Export

将导出地址设为 `/exec?writeKey=YOUR_WRITE_TOKEN`，发送包含时间戳、体重/身体质量类型、数值及可选单位的 JSON。模板识别 kg、lb，以及小数或百分比形式的体脂。先做小范围测试，再启用大范围历史导出。

部分健康导出 App 无法稳定把自定义 Header 转发给 Apps Script Web app，因此模板支持 query 中的 `writeKey`。这会让 URL 本身成为秘密：不要分享它；一旦泄露，请立即轮换 `WRITE_TOKEN`。

### 本地检查

```bash
npm run lint
npm exec vite build
node --test tests/meal-accordion.test.mjs tests/calorie-uncertainty.test.mjs tests/calorie-forecast.test.mjs
```

### 可以如何继续扩展

数据源不一定非要是 Google Sheet，AI 也不一定非要是 ChatGPT。只要某个系统能安全更新结构化数据，而应用可以读取它，下面的组合都成立：

- 其他 LLM、OCR 服务或手动表单写入 Sheet/数据表。
- Google Sheet 换成数据库、Notion、Airtable 或其他有授权的数据源。
- 邮件、iMessage、WhatsApp、微信、Facebook Messenger 等聊天入口可作为输入渠道，但前提是有官方可用的集成方式、你拥有授权、隐私设置和安全模型都合适。

不要在未获服务明确允许的情况下自动化登录账户或抓取私有服务。优先使用官方 API、导出、Webhook 或用户明确授权的集成方式。

### 安全

- 仓库保持 private，直到所有秘密与个人数据路径都经过审查。
- 不要提交 Sheet ID、读写 Token、健康记录或导出日志。
- 读取和写入使用不同 Token；任一泄露后立即轮换。
- 收紧 Apps Script 的部署访问范围，并只自动化你有权限操作的系统和账户。

### 版本

`v1.0.0` 是首个私有发布版本。
