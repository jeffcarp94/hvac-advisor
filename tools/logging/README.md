# R1a Apps Script acknowledgement test

Deploy `AckProbe.gs` as a standalone Apps Script web app. Use Execute as me and access Anyone. Copy the deployed URL ending in `/exec`.

On the Pixel in Chrome, open the [GitHub Pages test page](https://jeffcarp94.github.io/hvac-advisor/tools/logging/ack-probe.html), paste the URL and tap **Send test request**. The app sends a random event ID in a plain-text POST and checks the final JSON response for the same ID. The script has no Sheet or Drive access.

- **Confirmed** means Chrome read the matching JSON acknowledgement. Use that check when removing confirmed rows from the production queue.
- **Unconfirmed** means Chrome could not verify the event ID. If the endpoint is deployed correctly and reachable, use the attempted/unconfirmed queue design with manual Sheet confirmation.

If the browser cannot read the reply, verify the same deployment with a separate POST client following redirects before concluding that Chrome cannot read it. Avoid forcing POST on the redirect target.

Google references [Web apps](https://developers.google.com/apps-script/guides/web) and [Content Service](https://developers.google.com/apps-script/guides/content).

## Production receiver

The R1a Pixel test returned Confirmed. The production receiver therefore acknowledges the event ID and row number after the Sheet write completes.

Install `Code.gs` in the dedicated spreadsheet’s bound script project. Save it and run `initializeHvacLogging` once from the editor. Set `HVAC_LOG_TOKEN` in Script Properties to a private random token between 32 and 256 characters. Deploy as a web app that executes as the owner with access set to Anyone. The logging client uses the deployment's `/exec` URL and the same token.

The request is a plain-text POST with a JSON object containing `token` and `event`. The event uses the column names in `Code.gs` and schema version 1. Set fields ending in `_json` to JSON strings. The receiver creates the HVAC Run Log tab and writes headers. It preserves existing rows and returns the existing row number on replay.

For token rotation, keep the retiring token in `HVAC_LOG_PREVIOUS_TOKEN` and set `HVAC_LOG_PREVIOUS_TOKEN_UNTIL_UTC` to its ISO UTC expiration. Replace `HVAC_LOG_TOKEN` with the new value.
