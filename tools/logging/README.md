# R1a Apps Script acknowledgement test

Deploy `AckProbe.gs` as a standalone Apps Script web app. Use Execute as me and access Anyone. Copy the deployed URL ending in `/exec`.

On the Pixel in Chrome, open the [GitHub Pages test page](https://jeffcarp94.github.io/hvac-advisor/tools/logging/ack-probe.html), paste the URL and tap **Send test request**. The app sends a random event ID in a plain-text POST and checks the final JSON response for the same ID. The script has no Sheet or Drive access.

- **Confirmed** means Chrome read the matching JSON acknowledgement. Use that check when removing confirmed rows from the production queue.
- **Unconfirmed** means Chrome could not verify the event ID. If the endpoint is deployed correctly and reachable, use the attempted/unconfirmed queue design with manual Sheet confirmation.

If the browser cannot read the reply, verify the same deployment with a separate POST client following redirects before concluding that Chrome cannot read it. Avoid forcing POST on the redirect target.

Google references [Web apps](https://developers.google.com/apps-script/guides/web) and [Content Service](https://developers.google.com/apps-script/guides/content).
