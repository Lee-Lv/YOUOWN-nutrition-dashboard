# YOUOWN 饮食 Dashboard

> **别再造一个 AI App。让你本来就在用的 AI，写入本来就属于你的数据。**

用 ChatGPT 和你自己的 Google Sheets 驱动的 AI-first 个人饮食追踪器。

**语言：** [English README](README.md)

---

## 中文

![正常状态 Dashboard](docs/images/dashboard-normal-top.jpg)

*今天的数据一眼就能看懂：热量进度、估算范围、今日重点和三张营养素卡片。*

![Chat 记录饮食示意](docs/images/chat-meal-log.jpg)

*Chat 输入：一句自然语言的饮食记录，变成一条可以复核的热量和营养素摘要。*

### 它和普通 App 不一样的三件事

- **Chat 就是输入入口。** 直接告诉 AI 吃了什么，先看估算，再确认写入；不必再填另一套表单。
- **Sheet 就是你的数据库。** 数据随时能查看、修改、导出，始终在你自己手里。
- **Dashboard 只做它该做的事。** 把 Sheet 变成进度、误差、提醒、预测和明细，不再偷偷造第二套数据库。

### 架构

```text
ChatGPT / 其他 AI ── 已授权的数据更新 ──► Google Sheet
                                           饮食 / 目标
                                               │ Apps Script 桥接
                                                    │ 带鉴权 JSON
                                                    ▼
                                          YOUOWN Nutrition Dashboard
```

### AI 协助安装（推荐）

用 Codex 打开项目，然后只要说：

> 帮我装好 https://github.com/Lee-Lv/YOUOWN-nutrition-dashboard/tree/main

Agent 会先检查当前状态，复用已有资源，只补齐缺的配置，并验证 Dashboard → Apps Script → Google Sheet 整条链路。

详细说明看 [AI 安装](docs/AI_INSTALL.md)、[手动安装](docs/MANUAL_SETUP.zh-CN.md) 或 [排错说明](docs/TROUBLESHOOTING.md)。

### 为什么做这个项目

我做这个项目，其实是因为我越来越不想给那些健康管理 App 交订阅费了。付了钱以后，它们给的功能不一定是我需要的，食物识别和 AI 服务有时候也没有我自己订阅的 GPT 好。说实话，钱花了，效果却没有达到预期，有些时候我就觉得好蛋疼，不如我上。

所以就上啊！数据放在我自己的 Google Sheet 里，平时直接跟 GPT 对话，让它帮我记录、估算、修改，再用一个私有的 Web Dashboard 把结果显示出来。

我也不想为了一个自己用的东西，先花很多时间做 iOS/Android 原生 App，或者搭一套很复杂的后端。能快速上线、自己能改、数据自己掌握，对我来说就够了。饮食只是第一个例子，个人追踪、家庭日志、训练记录、收藏管理，甚至小型 CRM，也都可以这么做。

### 项目定位

**用 AI 对话驱动的个人数据应用模板。**

饮食只是第一个例子。同样的方式也可以用来做家庭日志、训练记录、用药记录、收藏管理、个人财务，甚至小型 CRM：通过 AI 对话更新结构化数据，再用一个简单的网页 Dashboard 把数据看清楚。

### GPT Chat 的 Prompt 和工作流方针

Dashboard 故意只负责看数据：记录和修正发生在对话里，经过确认的数据再写进 Sheet。可直接复用的 Prompt、建议的回复格式，以及安全修改 Sheet 的规则，都放在 [GPT Chat 工作流说明](docs/gpt-chat-prompt.zh-CN.md)；英文版在 [这里](docs/gpt-chat-prompt.md)。

页面应该是你安静看今天数据的地方；对话才是你随手描述、修正、确认一条记录的地方。

### 更多界面示意

助手也可以通过已授权的 Google Drive / Google Sheets 连接访问数据源。具体能使用哪些连接器，要看当前账号和产品能力。

![Google Drive 连接示意](docs/images/chat-google-drive.jpg)

*连接示例：选择 Google Drive，作为个人数据所在的位置。*

下面的区域也尽量不做得复杂：图表看实际和预测，最近记录按天排列，每条记录点开就能看明细。

![趋势和最近记录](docs/images/dashboard-normal-lower.jpg)

*历史/预测趋势、按日切换、可展开的最近记录和语言选择器。*

如果哪一项真的超了，界面就会直接告诉你是哪一项、超了多少、超过了百分之多少。进度条里也会标出 100% 目标线和 120% 警戒区，不让你只看到一条已经顶满、但不知道超了多少的条。

![超额提醒状态](docs/images/dashboard-over-alert.jpg)

*超额状态：提醒卡片和营养素进度条把“超出了多少”明确显示出来。*

### 关于费用，我想先说清楚

我最看重的就是这一点：我已经在订阅 GPT 了，平时也更愿意用自己熟悉、觉得好用的 GPT。既然日常记录可以通过对话完成，我就不想再给一个自己觉得不好用的健康管理 App 持续交钱。

但这里要说清楚，这不代表“所有付费 API 都免费”。

- 如果你已经订阅了 ChatGPT，而且你的套餐包含对应的对话、代理、连接器或 Web Application 能力，那么日常个人记录可以在套餐限额内直接完成，不一定要另外搭一条 API 调用链。
- **ChatGPT 订阅不等于 OpenAI API 额度。** OpenAI API、其他 AI 提供商、自动化服务和第三方连接器，都可能有单独的费用、限额和条款。
- Google Sheets 与 Apps Script 也有自己的账号要求和配额。

具体能不能这样用，要看当前套餐、平台能力、配额和条款，不能把订阅当成无限 API 额度。

### 仓库里各部分放在哪里

| 路径 | 作用 |
| --- | --- |
| `app/` | 页面、布局、语言与主题切换。 |
| `components/` | 卡片、图表、动态进度条、饮食明细与背景效果。 |
| `db/dashboard.ts` | 校验并规范化 Apps Script 返回的数据。 |
| `lib/` | 热量预测、估算误差和多语言逻辑。 |
| `apps-script/` | Google Apps Script 桥接模板：`Code.gs`、生成的 `Schema.gs` 和项目 manifest。 |
| `scripts/` | 可重复执行的本地安装、诊断、clasp 配置、构建和全链路验证。 |
| `config/sheet-schema.json` | 安装器与 Apps Script 共用的声明式 Sheet schema。 |
| `tests/` | 预测、误差和饮食明细测试。 |

### Sheet 里需要哪些字段

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

`设置` 使用 B 列：`B2:B7` 是热量/蛋白质/脂肪/碳水/纤维/盐分目标；`B16:B19` 可存放代谢相关可选指标。

### 本地检查

```bash
npm run lint
npm exec vite build
node --test tests/meal-accordion.test.mjs tests/calorie-uncertainty.test.mjs tests/calorie-forecast.test.mjs
```

### 安装器检查

```bash
npm run doctor -- --json
npm run install:ai
```

安装状态、OAuth 状态和读取 Token 都在被 Git 忽略的 `.youown/` 里。状态文件只保存 ID 和 Token 指纹，真正的 Token 不会提交。`npm run verify` 会补齐缺少的 Sheet tab/表头但不会覆盖已有内容；随后进行一次鉴权读取检查，并构建本地 Dashboard。

### 以后还能怎么扩展

数据源不一定非要是 Google Sheet，AI 也不一定非要是 ChatGPT。只要某个系统能安全更新结构化数据，而应用可以读取它，下面的组合都成立：

- 其他 LLM、OCR 服务或手动表单写入 Sheet/数据表。
- Google Sheet 换成数据库、Notion、Airtable 或其他有授权的数据源。
- 邮件、iMessage、WhatsApp、微信、Facebook Messenger 等聊天入口可作为输入渠道，但前提是有官方可用的集成方式、你拥有授权、隐私设置和安全模型都合适。

不要在未获服务明确允许的情况下自动化登录账户或抓取私有服务。优先使用官方 API、导出、Webhook 或用户明确授权的集成方式。

### 公开仓库前的检查清单

- 这个仓库只能以“模板”的形式公开：其中不包含真实 Sheet ID、Apps Script 地址、Token、健康记录或导出日志。
- 不要提交 Sheet ID、读取 Token、健康记录或导出日志。
- 收紧 Apps Script 的部署访问范围，并只自动化你有权限操作的系统和账户。
- 不要把凭据写进 AI 对话 Prompt、GitHub Issue、截图或公开的部署配置中。

### 版本

`v1.1.0` 加入第一版 Agent-installable 本地路径：状态诊断、可重复的本地密钥、Sheet / Apps Script 复用、隔离的本地 clasp、明确的 Google 浏览器回退，以及全链路验证；不包含任何个人凭据或健康数据。

### License

本项目采用 [Apache License 2.0](LICENSE) 授权。
