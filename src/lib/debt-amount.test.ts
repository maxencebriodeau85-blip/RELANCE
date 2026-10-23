import { describe, expect, it } from "vitest";
import { outstandingCents, parseFrenchCents, requireOutstandingCents } from "./debt-amount";
describe("collection balance", () => {
  it("deducts partial payments", () => {
    expect(outstandingCents(parseFrenchCents("2 869,66"), parseFrenchCents("506,51"))).toBe(236315n);
  });
  it("blocks paid and overpaid invoices", () => {
    expect(() => requireOutstandingCents(outstandingCents(100n, 100n))).toThrow();
    expect(() => outstandingCents(100n, 101n)).toThrow();
  });
  it("rejects ambiguous decimals", () => {
    expect(() => parseFrenchCents("1,234")).toThrow();
  });
});
