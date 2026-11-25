import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { seed, totals, transition, parseState } from '../src/app/demo/_lib/state';

test('accepting a screenshot never confirms payment or reconciles it', () => {
 const row = transition(seed().activities[0], 'accept', 'Screenshot is legible');
 assert.equal(row.review, 'Accepted'); assert.equal(row.paymentReference, ''); assert.equal(row.reconciliationReference, '');
 assert.equal(totals([row]).income, 0);
 assert.throws(() => transition(row, 'reconcile', 'Ledger 1'), /confirm/);
 const paid = transition(row, 'confirm', 'Wallet statement 001');
 assert.equal(totals([paid]).income, 50000); assert.equal(paid.reconciliationReference, '');
 assert.equal(transition(paid, 'reconcile', 'Ledger 1').reconciliationReference, 'Ledger 1');
});
test('flight approval and repayment are separate and expense is counted once', () => {
 const row = seed().activities[1];
 assert.equal(totals([row]).expenses, 0); assert.equal(totals([row]).claims, 480000);
 assert.throws(() => transition(row, 'repay', 'Bank transfer'), /Approve/);
 const approved = transition(row, 'approve', 'Travel authorized');
 assert.equal(approved.repaymentReference, '');
 assert.deepEqual([totals([approved]).expenses, totals([approved]).owed, totals([approved]).outflow], [480000,480000,0]);
 assert.throws(() => transition(approved, 'reconcile', 'Ledger'), /confirm/);
 const repaid = transition(approved, 'repay', 'Bank transfer 02');
 assert.deepEqual([totals([repaid]).expenses, totals([repaid]).owed, totals([repaid]).outflow], [480000,0,480000]);
 assert.throws(() => transition(repaid, 'repay', 'Duplicate'), /once/);
 assert.equal(transition(repaid, 'reconcile', 'Ledger 02').reconciliationReference, 'Ledger 02');
});
test('direct hotel payment is not a reimbursement', () => {
 const hotel = seed().activities[2]; const t = totals([hotel]);
 assert.equal(t.expenses,720000); assert.equal(t.outflow,720000); assert.equal(t.owed,0); assert.equal(t.claims,0);
 assert.throws(() => transition(hotel,'approve','Approve'), /claim/);
 assert.throws(() => transition(hotel,'repay','Repay'), /Approve/);
});
test('document replacement resets review but not independent payment', () => {
 const row = transition(seed().activities[2], 'attach', 'Replacement', { name:'Sample', sample:'New sample' });
 assert.equal(row.review, 'Pending'); assert.equal(row.paymentReference, seed().activities[2].paymentReference);
});
test('approval prerequisites, rejection, notes, and duplicate confirmation are enforced', () => {
 const flight = { ...seed().activities[1], paymentReference: '' };
 assert.throws(() => transition(flight,'approve','Travel'), /separately confirm/);
 assert.throws(() => transition(flight,'confirm','  '), /reason/);
 const rejected = transition(seed().activities[1],'decline','Not covered');
 assert.equal(totals([rejected]).expenses,0); assert.equal(totals([rejected]).owed,0);
 assert.throws(() => transition(rejected,'repay','Transfer'), /Approve/);
 assert.throws(() => transition(seed().activities[2],'confirm','Again'), /already/);
});
test('stored data is validated and unsafe or inconsistent data is rejected', () => {
 assert.deepEqual(parseState(JSON.stringify(seed())),seed());
 assert.throws(() => parseState('{broken'));
 const invalid = seed(); invalid.activities[0].amount = -1;
 assert.throws(() => parseState(JSON.stringify(invalid)), /invalid/);
 const unsafe = seed(); unsafe.activities[0].evidence = {name:'x',data:'javascript:alert(1)'};
 assert.throws(() => parseState(JSON.stringify(unsafe)), /evidence/);
 const inconsistent = seed(); inconsistent.activities[1].repaymentReference = 'Unapproved transfer';
 assert.throws(() => parseState(JSON.stringify(inconsistent)), /inconsistent/);
});
test('all three scenarios produce consistent aggregate totals across repayment', () => {
 const s = seed();
 s.activities[0] = transition(transition(s.activities[0], 'accept', 'Readable'), 'confirm', 'GCash received');
 s.activities[1] = transition(s.activities[1], 'approve', 'Travel approved');
 let t = totals(s.activities);
 assert.deepEqual([t.income,t.expenses,t.owed,t.outflow], [50000,1200000,480000,720000]);
 s.activities[1] = transition(s.activities[1], 'repay', 'Bank repaid');
 t = totals(s.activities);
 assert.deepEqual([t.income,t.expenses,t.owed,t.outflow], [50000,1200000,0,1200000]);
 assert.equal(t.income-t.outflow, -1150000);
 assert.deepEqual(parseState(JSON.stringify(s)),s);
});
test('approved or reconciled evidence cannot be silently replaced or rejected', () => {
 const approved = transition(seed().activities[1],'approve','Approved');
 assert.throws(() => transition(approved,'attach','Replace',{name:'new',sample:'new'}), /locked/);
 assert.throws(() => transition(approved,'reject','Reject later'), /locked/);
 const matched = transition(seed().activities[2],'reconcile','Ledger');
 assert.throws(() => transition(matched,'reconcile','Again'), /already/);
});
