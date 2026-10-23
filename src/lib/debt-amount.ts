/** Exact monetary arithmetic for collection: amounts in cents. */
export function outstandingCents(original: bigint, paid: bigint): bigint {
  if (original < 0n || paid < 0n || paid > original) throw new Error("Invalid debt/payment amounts");
  return original - paid;
}
export function requireOutstandingCents(balance: bigint): bigint {
  if (balance <= 0n) throw new Error("No collectible outstanding balance");
  return balance;
}
export function parseFrenchCents(value: string): bigint {
  const s = value.trim().replace(/[\s\u00a0\u202f€]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error("Invalid EUR amount");
  const [euros, decimals = ""] = s.split(".");
  return BigInt(euros) * 100n + BigInt(decimals.padEnd(2, "0"));
}
