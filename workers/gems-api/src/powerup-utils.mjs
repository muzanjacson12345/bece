// Only known consumables may be used through the power-up endpoint.
const POWERUP_USES = Object.freeze({
  p50: Object.freeze({ id: "p50", field: "p50" })
});

export function getPowerupUse(itemId) {
  if (typeof itemId !== "string") return null;
  return POWERUP_USES[itemId] || null;
}

/**
 * A retry may reuse a receipt only for the same account, power-up, duel and
 * still-current question. This prevents one receipt from granting free
 * Second Chances in another duel or on a later question.
 */
export function validatePowerupUseReceiptRetry({ stored, uid, itemId, duelCode, duel, progress }) {
  if (!stored || stored.uid !== uid || stored.itemId !== itemId
      || stored.duelCode !== duelCode) {
    throw new Error("IDEMPOTENCY_KEY_REUSED");
  }
  if (!duel || duel.state !== "playing" || duel.settled === true
      || (duel.host !== uid && duel.guest !== uid)) {
    throw new Error("IDEMPOTENCY_KEY_REUSED");
  }
  const index = stored.questionIndex;
  const currentIndex = progress && progress.nextIndex;
  const usedIndexes = progress && progress.secondChanceIndexes;
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(currentIndex)
      || index !== currentIndex || !Array.isArray(usedIndexes)
      || !usedIndexes.includes(index)
      || !Number.isSafeInteger(progress.secondChancesUsed)
      || progress.secondChancesUsed < 1) {
    throw new Error("IDEMPOTENCY_KEY_REUSED");
  }
  return true;
}
