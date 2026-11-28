export function readBudgetAmount(body: { unitPrice?: unknown; quantity?: unknown; plannedAmount?: unknown }) {
  const raw = String(body.unitPrice ?? body.plannedAmount ?? "").trim();
  const units = String(body.quantity ?? "1").trim();
  const quantity = /^\d{1,7}$/.test(units) ? Number(units) : 0;
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(raw) || quantity < 1 || quantity > 1_000_000) {
    return { plannedAmount: NaN, quantity };
  }
  const [whole, fractional = ""] = raw.split(".");
  const cents = (BigInt(whole) * BigInt(100) + BigInt(fractional.padEnd(2, "0"))) * BigInt(quantity);
  return { plannedAmount: cents <= BigInt(99_999_999_999_999) ? Number(cents) / 100 : NaN, quantity };
}
