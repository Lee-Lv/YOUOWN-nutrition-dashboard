# Manual setup

This is the fallback for users who do not want to use Codex for installation. The recommended path is still:

> Install https://github.com/Lee-Lv/YOUOWN-nutrition-dashboard/tree/main for me.

## 1. Create the Apps Script bridge

1. In the Google Sheet, choose **Extensions → Apps Script**.
2. Copy [`apps-script/Code.gs`](../apps-script/Code.gs), [`apps-script/Schema.gs`](../apps-script/Schema.gs), and [`apps-script/appsscript.json`](../apps-script/appsscript.json) into the Apps Script project.
3. In **Project Settings → Script properties**, add:

   | Property | Value |
   | --- | --- |
   | `SPREADSHEET_ID` | The ID from the Google Sheet URL. |
   | `READ_TOKEN` | A long random secret for dashboard reads. |

4. Deploy as a **Web app**, running as the Sheet owner, with the narrowest access setting that works for the Dashboard.
5. Test `/exec?token=YOUR_READ_TOKEN`; it should return JSON with `ok: true`.

## 2. Configure the Dashboard

Create a local `.env.local` file:

```text
GOOGLE_SHEET_ENDPOINT=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GOOGLE_SHEET_TOKEN=YOUR_READ_TOKEN
```

Never commit these values. The repository's committed script contains no real IDs or tokens.

## 3. ChatGPT Prompt setup

The installer does not create or modify a user's GPT. After the data bridge is ready, create or open your own GPT/chat workflow and add the reusable instructions from [`docs/gpt-chat-prompt.md`](gpt-chat-prompt.md), or the [Chinese version](gpt-chat-prompt.zh-CN.md). Chat is the input surface; the Dashboard is the read-only review surface.
