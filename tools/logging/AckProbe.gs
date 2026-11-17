// Standalone R1a probe. This script does not read or write Google Drive.
function doPost(event) {
  const body = event?.postData?.contents;
  let eventId;
  if (typeof body === 'string' && body.length <= 200) {
    try {
      const data = JSON.parse(body);
      if (data?.type === 'hvac_ack_probe' &&
          typeof data.event_id === 'string' &&
          /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data.event_id)) {
        eventId = data.event_id;
      }
    } catch {
      // Invalid request bodies receive a negative acknowledgement.
    }
  }
  const response = eventId ? {ok: true, event_id: eventId} : {ok: false};
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
