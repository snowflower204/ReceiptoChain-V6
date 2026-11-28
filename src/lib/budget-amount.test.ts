import assert from "node:assert/strict";
import test from "node:test";
import { readBudgetAmount } from "./budget-amount";

test("multiplies unit price by quantity in cents", () => {
  assert.deepEqual(readBudgetAmount({ unitPrice: "400", quantity: "40" }), { plannedAmount: 16000, quantity: 40 });
  assert.equal(readBudgetAmount({ unitPrice: "0.29", quantity: "3" }).plannedAmount, 0.87);
});

test("keeps old one-unit budget items compatible", () => {
  assert.deepEqual(readBudgetAmount({ plannedAmount: 20.5 }), { plannedAmount: 20.5, quantity: 1 });
});

test("rejects invalid quantities, sub-cent prices, and overflow", () => {
  for (const input of [{ unitPrice: "1", quantity: "0" }, { unitPrice: "1", quantity: "1.5" }, { unitPrice: "0.001" }, { unitPrice: "999999999999.99", quantity: "2" }]) {
    assert.ok(Number.isNaN(readBudgetAmount(input).plannedAmount));
  }
});
