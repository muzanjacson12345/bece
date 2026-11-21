// Only known consumables may be used through the power-up endpoint.
const POWERUP_USES = Object.freeze({
  p50: Object.freeze({ id: "p50", field: "p50" })
});

export function getPowerupUse(itemId) {
  if (typeof itemId !== "string") return null;
  return POWERUP_USES[itemId] || null;
}
