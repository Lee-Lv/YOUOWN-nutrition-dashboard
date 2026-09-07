# Installer troubleshooting

## `googleAuth: missing`

Run `npm run google:auth`. It uses project-local clasp state in `.youown/` and should open Google's official consent flow.

## Apps Script push succeeds but verify is unauthorized

Check that `SPREADSHEET_ID`, `READ_TOKEN`, and `WRITE_TOKEN` are Script Properties—not code constants—and that they match `.youown/secrets.env`. Do not paste their values into an issue or chat.

## Endpoint is unhealthy

Run `npm run doctor -- --network`. Confirm the deployed URL ends in `/exec`, the deployment is current, and its access setting is compatible with the Dashboard host. Rerun `npm run apps-script:setup -- --endpoint EXEC_URL` and then `npm run verify`.

## A previous install is partly configured

Do not delete resources first. Run doctor, keep the IDs that already work, and resume at the first missing status. The installer is designed for install, repair, resume, and verify.
