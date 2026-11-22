const HVAC_LOG_TAB = 'HVAC Run Log';
const HVAC_LOG_SCHEMA = 1;

const HVAC_LOG_COLUMNS = [
  'schema_version', 'event_id', 'event_utc', 'event_local', 'tz', 'app_version',
  'event_type', 'run_status', 'zip', 'lat', 'lon', 'place', 'elevation_m',
  'heading', 'heading_confirmed', 'tree_front', 'tree_rear', 'tree_driver',
  'tree_entry', 'tree_overhead', 'nws_issue_utc', 'nws_fetch_utc',
  'forecast_hourly_json', 'forecast_at_reading_json', 'reading_utc',
  'bed_temp_f', 'bed_rh', 'bed_last_updated', 'front_temp_f', 'front_rh',
  'front_last_updated', 'easytouch_display_f', 'easytouch_time',
  'easytouch_adjustment', 'bias_obs_f', 'easytouch_outdoor_f',
  'actual_mode', 'actual_heat_to', 'actual_cool_to', 'actual_fan', 'active_call',
  'transition', 'minutes_since_transition', 'windows_vents_json', 'dehumidifier',
  'occupancy', 'recommended_setup_json', 'prediction_30min_json',
  'prediction_2h_json', 'prediction_next_action_json', 'ensemble_pass_count',
  'coil_advisory', 'vote_bedroom', 'vote_front', 'vote_context', 'vote_time',
  'comfort_metric_json',
  // v6.8.0: checkpoints (predicted vs measured) and the owner's simulation flag.
  'data_source', 'plan_event_id', 'planned_setup_json', 'settings_match',
  'predicted_json', 'forecast_at_checkpoint_json', 'observed_weather_json',
  'checkpoint_tags', 'checkpoint_notes', 'checkpoint_source', 'built_plan_event_id'
];

function initializeHvacLogging() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book) throw new Error('Run initialization from the spreadsheet-bound script editor.');
  const properties = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existing = properties.getProperty('HVAC_LOG_SPREADSHEET_ID');
    if (existing && existing !== book.getId()) throw new Error('This script points to a different spreadsheet.');
    prepareHvacLog_(book);
    SpreadsheetApp.flush();
    properties.setProperty('HVAC_LOG_SPREADSHEET_ID', book.getId());
  } finally {
    lock.releaseLock();
  }
}

function doPost(request) {
  const body = request?.postData?.contents;
  if (typeof body !== 'string' || body.length > 48000) return hvacLogReply_({ok: false, code: 'invalid_body'});

  let input;
  try {
    input = JSON.parse(body);
  } catch {
    return hvacLogReply_({ok: false, code: 'invalid_json'});
  }
  const properties = PropertiesService.getScriptProperties().getProperties();
  const token = input?.token;
  const priorValid = properties.HVAC_LOG_PREVIOUS_TOKEN &&
    Date.now() < Date.parse(properties.HVAC_LOG_PREVIOUS_TOKEN_UNTIL_UTC);
  if (typeof token !== 'string' || token.length < 32 || token.length > 256 ||
      (token !== properties.HVAC_LOG_TOKEN && !(priorValid && token === properties.HVAC_LOG_PREVIOUS_TOKEN))) {
    return hvacLogReply_({ok: false, code: 'unauthorized'});
  }
  const event = input.event;
  if (!event || event.schema_version !== HVAC_LOG_SCHEMA ||
      typeof event.event_id !== 'string' ||
      !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(event.event_id) ||
      !['plan', 'readings_only', 'checkpoint'].includes(event.event_type) ||
      typeof event.event_utc !== 'string' || !Number.isFinite(Date.parse(event.event_utc)) ||
      (event.event_type === 'plan' && !['qualified', 'partial', 'none', 'error'].includes(event.run_status))) {
    return hvacLogReply_({ok: false, code: 'invalid_event'});
  }

  let row;
  try {
    row = HVAC_LOG_COLUMNS.map(column => hvacLogCell_(event[column]));
  } catch {
    return hvacLogReply_({ok: false, code: 'invalid_field'});
  }

  if (!properties.HVAC_LOG_SPREADSHEET_ID) return hvacLogReply_({ok: false, code: 'not_initialized'});
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return hvacLogReply_({ok: false, code: 'busy'});
  try {
    const sheet = prepareHvacLog_(SpreadsheetApp.openById(properties.HVAC_LOG_SPREADSHEET_ID));
    const last = sheet.getLastRow();
    const match = last > 1 ? sheet.getRange(2, 2, last - 1, 1).createTextFinder(event.event_id)
      .matchEntireCell(true).matchCase(false).findNext() : null;
    if (match) return hvacLogReply_({ok: true, event_id: event.event_id, row: match.getRow()});
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return hvacLogReply_({ok: true, event_id: event.event_id, row: last + 1});
  } catch {
    return hvacLogReply_({ok: false, code: 'write_failed'});
  } finally {
    lock.releaseLock();
  }
}

function prepareHvacLog_(book) {
  const sheet = book.getSheetByName(HVAC_LOG_TAB) || book.insertSheet(HVAC_LOG_TAB);
  const width = HVAC_LOG_COLUMNS.length;
  const columns = sheet.getMaxColumns();
  if (columns < width) sheet.insertColumnsAfter(columns, width - columns);
  const header = sheet.getRange(1, 1, 1, width);
  if (!sheet.getLastRow()) {
    header.setValues([HVAC_LOG_COLUMNS]);
    sheet.setFrozenRows(1);
  } else {
    // New columns are only ever appended (v6.6.22: comfort_metric_json). A header that matches the start of the
    // current list, with blank cells after it, is extended in place; older rows keep blank new cells.
    const existing = header.getValues()[0];
    const blank = value => value === '' || value == null;
    const first = existing.findIndex(blank), used = first < 0 ? existing.length : first;
    if (!used || existing.slice(0, used).some((value, index) => value !== HVAC_LOG_COLUMNS[index]) ||
        existing.slice(used).some(value => !blank(value))) {
      throw new Error('Unexpected HVAC Run Log columns.');
    }
    if (used < width) header.setValues([HVAC_LOG_COLUMNS]);
  }
  return sheet;
}

function hvacLogCell_(value) {
  if (value == null) return 'missing';
  if (Number.isFinite(value) || typeof value === 'boolean') return value;
  if (typeof value !== 'string' || value.length > 32000) throw new Error('Invalid field.');
  return /^[=+@-]/.test(value) ? "'" + value : value;
}

function hvacLogReply_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
