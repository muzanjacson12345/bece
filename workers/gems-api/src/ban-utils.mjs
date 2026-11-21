/**
 * Interpret the BECE Hub ban document exactly as the app stores it.
 *
 * Current schema: bans/{uid}.until is an integer Unix timestamp in
 * milliseconds; 0 means permanent. Missing/null values are legacy
 * permanent bans. Invalid values fail closed so malformed ban records
 * cannot silently grant access.
 */
export function isFirestoreBanActive(document, now = Date.now()) {
  if (!document) return false;

  const fields = document.fields || {};
  if (!Object.prototype.hasOwnProperty.call(fields, "until")) return true;

  const field = fields.until;
  if (!field || Object.prototype.hasOwnProperty.call(field, "nullValue")) return true;

  if (field.integerValue === undefined) return true;

  const until = Number(field.integerValue);
  if (!Number.isSafeInteger(until) || until < 0) return true;

  return until === 0 || until > now;
}
