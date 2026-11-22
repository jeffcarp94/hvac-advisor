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

Columns are only ever appended. v6.6.22 adds `comfort_metric_json` (the WP12 Phase A comfort metric, observation only); since v6.6.27 the app no longer fills it (comfort metric removed, owner decision), so it logs "missing" and the receiver needs no change. After pasting the new `Code.gs` and deploying a new version, the next write extends an existing tab's header in place; older rows keep a blank cell. A header that is not the start of the current list still stops the write. Until the new version is deployed, the old receiver ignores the field.

v6.8.0 appends eleven columns for checkpoints and the owner's simulation flag: `data_source` (`real` or `simulation`, plan and checkpoint rows), `plan_event_id`, `planned_setup_json`, `settings_match` (`match`, `differs` or `no plan`), `predicted_json` (the plan's nominal bedroom and front temperature and RH at the checkpoint time, with the range across the tested conditions), `forecast_at_checkpoint_json` (the weather the plan assumed at that time), `observed_weather_json` (the latest observation from the nearest NWS station at save time, or an `error`), `checkpoint_tags`, `checkpoint_notes`, `checkpoint_source` (`manual` from the Checkpoints tab, `plan_build` when a new plan's readings are compared with the previous plan) and `built_plan_event_id` (for `plan_build`, the plan row built from the same readings). `predicted_json` includes `minutes_after_prediction` (non-zero only for a reading up to 30 minutes after the plan's last prediction). It also accepts the new `checkpoint` event type. **Deploy the v6.8.0 `Code.gs` before saving the first checkpoint:** the older receiver rejects the `checkpoint` type, and a rejected entry holds the queue until the receiver accepts it. `readings_only` is still accepted for entries queued by older releases.

For token rotation, keep the retiring token in `HVAC_LOG_PREVIOUS_TOKEN` and set `HVAC_LOG_PREVIOUS_TOKEN_UNTIL_UTC` to its ISO UTC expiration. Replace `HVAC_LOG_TOKEN` with the new value.

## Enable the app client

In HVAC Advisor, expand **Run logging**, enter the deployed /exec URL and the same private token, check **Log runs to Google Sheets**, then save. A checkpoint (Checkpoints tab, v6.8.0; it replaces **Log readings only**) tests the authenticated path independently of the planner; tick **Log as simulation (test)** for a test entry. The box is never saved and clears after each entry. The confirmation shows the Sheet row number. Queued items retry on the next run, a settings save, or when the device comes online. Items stay associated with their original receiver URL.
