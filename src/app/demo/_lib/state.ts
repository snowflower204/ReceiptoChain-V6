export type Kind = 'participant' | 'reimbursement' | 'direct';
export type Review = 'Pending' | 'Accepted' | 'Changes requested' | 'Rejected';
export interface Evidence { name: string; data?: string; sample?: string }
export interface Activity {
  id: string; event: string; title: string; person: string; kind: Kind; amount: number;
  date: string; method: string; evidence?: Evidence; review: Review;
  paymentReference: string; approval: 'Pending' | 'Approved' | 'Rejected';
  repaymentReference: string; reconciliationReference: string;
  history: { at: string; message: string }[];
}
export interface DemoState { version: 1; events: string[]; activities: Activity[] }
export const STORAGE_KEY = 'receiptochain-demo-v1';
export const kinds: Record<Kind, string> = { participant: 'Participant payment', reimbursement: 'Volunteer reimbursement', direct: 'Organization expense' };
export const money = (cents: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
export function seed(): DemoState {
  const base = { event: 'Community Tech Summit', date: '2026-11-18', method: 'Bank transfer', review: 'Pending' as Review, paymentReference: '', approval: 'Pending' as const, repaymentReference: '', reconciliationReference: '', history: [] };
  return { version: 1, events: ['Community Tech Summit', 'Campus Makers Workshop'], activities: [
    { ...base, id: 'DEMO-001', title: 'Event registration', person: 'Alex Santos', kind: 'participant', amount: 50000, method: 'GCash', evidence: { name: 'Sample payment screenshot', sample: 'Alex Santos • GCash • ₱500.00 • DEMO-GC-001. Fictional screenshot details; receipt of funds has not been checked.' } },
    { ...base, id: 'DEMO-002', title: 'Volunteer round-trip flight', person: 'Jamie Cruz', kind: 'reimbursement', amount: 480000, review: 'Accepted', paymentReference: 'DEMO-AIR-002 · volunteer paid airline', evidence: { name: 'Sample flight receipt', sample: 'Jamie Cruz • Round-trip airfare • ₱4,800.00. Volunteer paid the airline from personal funds. Reimbursement still needs approval.' } },
    { ...base, id: 'DEMO-003', title: 'Volunteer accommodation', person: 'Harbor Inn (sample supplier)', kind: 'direct', amount: 720000, review: 'Accepted', paymentReference: 'DEMO-BANK-003 · organization paid hotel', evidence: { name: 'Sample accommodation invoice', sample: 'Harbor Inn • 3 rooms × 2 nights × ₱1,200.00 = ₱7,200.00. Paid directly by the organization; no volunteer reimbursement.' } },
  ] };
}
export function totals(rows: Activity[]) {
  const sum = (filter: (r: Activity) => boolean) => rows.filter(filter).reduce((a, r) => a + r.amount, 0);
  return {
    income: sum(r => r.kind === 'participant' && !!r.paymentReference),
    expenses: sum(r => r.kind === 'direct' || (r.kind === 'reimbursement' && r.approval === 'Approved')),
    claims: sum(r => r.kind === 'reimbursement' && r.approval === 'Pending'),
    owed: sum(r => r.kind === 'reimbursement' && r.approval === 'Approved' && !r.repaymentReference),
    outflow: sum(r => (r.kind === 'direct' && !!r.paymentReference) || (r.kind === 'reimbursement' && !!r.repaymentReference)),
    pendingReview: rows.filter(r => r.review === 'Pending' || r.review === 'Changes requested').length,
    unmatched: rows.filter(r => !r.reconciliationReference).length,
  };
}
export type Action = 'accept' | 'changes' | 'reject' | 'confirm' | 'approve' | 'decline' | 'repay' | 'reconcile' | 'attach';
export function transition(row: Activity, action: Action, note: string, evidence?: Evidence): Activity {
  if (!note.trim()) throw new Error('Enter a reason or reference before saving.');
  const next = { ...row, history: [...row.history] };
  if (action === 'attach') {
    if (!evidence) throw new Error('Choose a document first.');
    if (row.reconciliationReference || row.approval === 'Approved' || row.repaymentReference) throw new Error('Evidence is locked after approval or reconciliation.');
    next.evidence = evidence; next.review = 'Pending';
  } else if (['accept', 'changes', 'reject'].includes(action)) {
    if (!row.evidence) throw new Error('Add evidence before reviewing it.');
    if (row.reconciliationReference || row.approval === 'Approved') throw new Error('Document review is locked after approval or reconciliation.');
    next.review = action === 'accept' ? 'Accepted' : action === 'changes' ? 'Changes requested' : 'Rejected';
  } else if (action === 'confirm') {
    if (row.paymentReference) throw new Error('Payment is already confirmed.');
    next.paymentReference = note.trim();
  } else if (action === 'approve' || action === 'decline') {
    if (row.kind !== 'reimbursement' || row.approval !== 'Pending') throw new Error('This claim is not awaiting approval.');
    if (action === 'approve' && (row.review !== 'Accepted' || !row.paymentReference)) throw new Error('Accept the document and separately confirm the volunteer’s payment first.');
    next.approval = action === 'approve' ? 'Approved' : 'Rejected';
  } else if (action === 'repay') {
    if (row.kind !== 'reimbursement' || row.approval !== 'Approved' || row.repaymentReference) throw new Error('Approve the claim before recording its repayment once.');
    next.repaymentReference = note.trim();
  } else if (action === 'reconcile') {
    if (row.reconciliationReference) throw new Error('This activity is already reconciled.');
    if (row.review !== 'Accepted' || !row.paymentReference || (row.kind === 'reimbursement' && !row.repaymentReference)) throw new Error('Accept the document and confirm all applicable payments before reconciling.');
    next.reconciliationReference = note.trim();
  }
  const labels: Record<Action, string> = { accept: 'Document accepted', changes: 'Document changes requested', reject: 'Document rejected', confirm: 'Payment confirmed separately', approve: 'Reimbursement approved', decline: 'Reimbursement rejected', repay: 'Volunteer repaid', reconcile: 'Reconciled with ledger', attach: 'Document attached; review pending' };
  next.history.push({ at: new Date().toISOString(), message: `${labels[action]}: ${note.trim()}` });
  return next;
}
export function parseState(raw: string): DemoState {
  const state = JSON.parse(raw);
  const string = (v: unknown) => typeof v === 'string';
  if (state?.version !== 1 || !Array.isArray(state.events) || !state.events.every(string) || new Set(state.events).size !== state.events.length || !Array.isArray(state.activities)) throw new Error('Saved demo data is invalid.');
  const ids = new Set();
  for (const r of state.activities) {
    if (!r || !['participant','reimbursement','direct'].includes(r.kind) || !['Pending','Accepted','Changes requested','Rejected'].includes(r.review) || !['Pending','Approved','Rejected'].includes(r.approval) || !Number.isSafeInteger(r.amount) || r.amount <= 0 || !['id','event','title','person','date','method','paymentReference','repaymentReference','reconciliationReference'].every(k => string(r[k])) || !state.events.includes(r.event) || ids.has(r.id) || !Array.isArray(r.history) || !r.history.every((h: {at: unknown; message: unknown}) => h && string(h.at) && string(h.message))) throw new Error('Saved demo data is invalid.');
    if (r.evidence && (!string(r.evidence.name) || (r.evidence.data && !/^data:(image\/(png|jpeg)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(r.evidence.data)) || (!r.evidence.data && !string(r.evidence.sample)))) throw new Error('Saved evidence is invalid.');
    if ((r.review === 'Accepted' && !r.evidence) || (r.repaymentReference && (r.kind !== 'reimbursement' || r.approval !== 'Approved' || !r.paymentReference)) || (r.kind === 'reimbursement' && r.approval === 'Approved' && (r.review !== 'Accepted' || !r.paymentReference)) || (r.reconciliationReference && (r.review !== 'Accepted' || !r.paymentReference || (r.kind === 'reimbursement' && !r.repaymentReference)))) throw new Error('Saved workflow states are inconsistent.');
    ids.add(r.id);
  }
  return state;
}

// Read only our previous prototype key; never touch application/auth storage.
export function readSavedDemo(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): string | null {
  const saved = storage.getItem(STORAGE_KEY);
  if (saved !== null) return saved;
  const legacyKey = 'receiptochain-entrep-demo-v1';
  const legacy = storage.getItem(legacyKey);
  if (legacy === null) return null;
  parseState(legacy); // Invalid data stays untouched for explicit recovery.
  storage.setItem(STORAGE_KEY, legacy); // Only remove the old copy after a successful save.
  storage.removeItem(legacyKey);
  return legacy;
}
