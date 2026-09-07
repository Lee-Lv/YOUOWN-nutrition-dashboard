# 手动安装

这是不想使用 Codex 自动安装时的备用方案。推荐的安装方式仍然是：

> 帮我装好 https://github.com/Lee-Lv/YOUOWN-nutrition-dashboard/tree/main

## 1. 创建 Apps Script 桥接

1. 在 Google Sheet 中选择 **扩展程序 → Apps Script**。
2. 将 [`apps-script/Code.gs`](../apps-script/Code.gs)、[`apps-script/Schema.gs`](../apps-script/Schema.gs) 和 [`apps-script/appsscript.json`](../apps-script/appsscript.json) 复制进 Apps Script 项目。
3. 在 **项目设置 → 脚本属性（Script properties）** 中添加：

   | 属性名 | 填写内容 |
   | --- | --- |
   | `SPREADSHEET_ID` | Google Sheet URL 中的 ID。 |
   | `READ_TOKEN` | 供 Dashboard 读取的一段长随机密钥。 |

4. 部署为 **Web app**，执行身份选择 Sheet 所有者，访问范围使用能正常工作的最小范围。
5. 用 `/exec?token=YOUR_READ_TOKEN` 测试；正常时应返回含 `ok: true` 的 JSON。

## 2. 配置 Dashboard

创建本地 `.env.local` 文件：

```text
GOOGLE_SHEET_ENDPOINT=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GOOGLE_SHEET_TOKEN=YOUR_READ_TOKEN
```

不要提交这些值。仓库里的脚本不包含真实 ID 或 Token。

## 3. GPT Chat Prompt 设置

安装器不会替用户创建或修改 GPT。数据桥接准备好以后，你仍然需要在自己的 GPT 或 Chat 工作流中，加入 [`docs/gpt-chat-prompt.zh-CN.md`](gpt-chat-prompt.zh-CN.md) 里的可复用说明；英文版在 [这里](gpt-chat-prompt.md)。Chat 是输入入口，Dashboard 负责只读查看。
