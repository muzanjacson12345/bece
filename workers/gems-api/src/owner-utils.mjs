/**
 * Validate the same Owner session model used by BECE Hub Firestore rules.
 * Firestore REST document shape is expected:
 * { fields: { role: { stringValue }, at: { timestampValue }, ... } }.
 */
export function hasValidOwnerSession(roster, session, config, now = Date.now()) {
  if (!roster || !session || !config) return false;

  const rosterFields = roster.fields || {};
  const sessionFields = session.fields || {};
  const configFields = config.fields || {};

  if (!rosterFields.role || rosterFields.role.stringValue !== "owner") return false;

  const atValue = sessionFields.at && sessionFields.at.timestampValue;
  const startedAt = typeof atValue === "string" ? Date.parse(atValue) : NaN;
  if (!Number.isFinite(startedAt)
      || startedAt > now + 60_000
      || startedAt + (30 * 60 * 1000) <= now) return false;

  const sessionPw1 = sessionFields.pw1 && sessionFields.pw1.stringValue;
  const sessionPw2 = sessionFields.pw2 && sessionFields.pw2.stringValue;
  const configPw1 = configFields.pw1 && configFields.pw1.stringValue;
  const configPw2 = configFields.pw2 && configFields.pw2.stringValue;

  return typeof sessionPw1 === "string"
    && typeof sessionPw2 === "string"
    && sessionPw1.length > 0
    && sessionPw2.length > 0
    && sessionPw1 === configPw1
    && sessionPw2 === configPw2;
}
