'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Activity, Action, DemoState, Evidence, Kind, STORAGE_KEY, readSavedDemo, kinds, money, parseState, seed, totals, transition } from '../_lib/state';
import './demo.css';

type View = 'dashboard' | 'events' | 'activities' | 'reviews' | 'reimbursements' | 'reconciliation' | 'about';
const navigation: { view: View; label: string; href: string; icon: string }[] = [
  { view: 'dashboard', label: 'Overview', href: '/demo', icon: '◫' },
  { view: 'events', label: 'Events', href: '/demo/events', icon: '▦' },
  { view: 'activities', label: 'Financial activities', href: '/demo/financial-activities', icon: '↔' },
  { view: 'reviews', label: 'Document reviews', href: '/demo/document-reviews', icon: '▤' },
  { view: 'reimbursements', label: 'Reimbursements', href: '/demo/reimbursements', icon: '↗' },
  { view: 'reconciliation', label: 'Reconciliation', href: '/demo/reconciliation', icon: '✓' },
];
const descriptions: Record<View, string> = {
  dashboard: 'A clear view of your event’s money, documents, and next steps.', events: 'Keep every collection and expense connected to an event.',
  activities: 'Record what happened, who paid, and what still needs checking.', reviews: 'Check the document. Confirm the money separately.',
  reimbursements: 'Track volunteer claims from approval to repayment.', reconciliation: 'Match confirmed payments to a bank, cash, or event ledger.',
  about: 'An entrepreneurship prototype for clearer event finances.',
};
function Badge({ children, good = false }: { children: React.ReactNode; good?: boolean }) { return <span className={`rc-badge ${good ? 'good' : ''}`}>{children}</span>; }
function paymentLabel(r: Activity) { return r.paymentReference ? (r.kind === 'reimbursement' ? 'Volunteer payment confirmed' : 'Payment confirmed') : 'Payment not confirmed'; }

function createLocalActivityId() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return `LOCAL-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  }

  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `LOCAL-${timestamp}-${random}`;
}

export default function DemoApp({ view = 'dashboard' }: { view?: View }) {
  const [state, setState] = useState<DemoState | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [menu, setMenu] = useState(false);
  const [event, setEvent] = useState('all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [newEvent, setNewEvent] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [uploading, setUploading] = useState(false);
  const detail = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLDialogElement>(null);
  const reset = useRef<HTMLDialogElement>(null);
  const latest = useRef<DemoState | null>(null);
  const rawSaved = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = readSavedDemo(localStorage);
      const initial = raw ? parseState(raw) : seed();
      rawSaved.current = raw; latest.current = initial; setState(initial);
    } catch { setError('Saved demo data could not be loaded. Reset the demo to start again. Existing data has not been overwritten.'); }
  }, []);
  useEffect(() => { if (selected && !detail.current?.open) detail.current?.showModal(); }, [selected]);
  useEffect(() => { if (adding || newEvent) form.current?.showModal(); }, [adding, newEvent]);
  useEffect(() => { if (confirmReset) reset.current?.showModal(); }, [confirmReset]);

  function save(next: DemoState, message: string, force = false) {
    try {
      if (!force && localStorage.getItem(STORAGE_KEY) !== rawSaved.current) throw new Error('This demo changed in another tab. Reload this page before saving.');
      const raw = JSON.stringify(next);
      localStorage.setItem(STORAGE_KEY, raw);
      rawSaved.current = raw; latest.current = next; setState(next); setError(''); setNotice(message);
      return true;
    } catch (e) {
      setError(e instanceof Error && e.message.includes('another tab') ? e.message : 'Could not save locally. Browser storage may be full or unavailable. No changes were saved. Try a smaller file or free browser storage.');
      return false;
    }
  }
  function act(action: Action, evidence?: Evidence, explicitNote?: string) {
    const current = latest.current;
    const row = current?.activities.find(r => r.id === selected);
    if (!current || !row) return;
    try {
      const next = transition(row, action, explicitNote ?? note, evidence);
      if (save({ ...current, activities: current.activities.map(r => r.id === row.id ? next : r) }, 'Saved in this browser.')) setNote('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update this activity.'); }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (!['image/png','image/jpeg','application/pdf'].includes(file.type) || file.size > 1024 * 1024 || file.size === 0) { setError('Choose a PNG, JPEG, or PDF between 1 byte and 1 MB.'); return; }
    setUploading(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read this file. Try another document.')); reader.readAsDataURL(file);
      });
      act('attach', { name: file.name, data }, file.name);
    } catch { setError('Could not read this file. Try another document.'); }
    finally { setUploading(false); }
  }
  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!state) return;
    const data = new FormData(e.currentTarget);
    const text = (key: string) => String(data.get(key) ?? '').trim();
    if (newEvent) {
      const name = text('eventName');
      if (!name || state.events.some(n => n.toLowerCase() === name.toLowerCase())) { setError('Enter a unique event name.'); return; }
      if (save({ ...state, events: [...state.events, name] }, 'Event added locally.')) { setNewEvent(false); form.current?.close(); }
      return;
    }
    const amountText = text('amount');
    const amount = Math.round(Number(amountText) * 100);
    if (!/^\d+(\.\d{1,2})?$/.test(amountText) || !Number.isSafeInteger(amount) || amount <= 0 || amount > 999999999 || !text('title') || !text('person') || !state.events.includes(text('event'))) { setError('Enter a title, person, event, and amount from ₱0.01 to ₱9,999,999.99 (up to two decimals).'); return; }
    const row: Activity = { id: createLocalActivityId(), event: text('event'), title: text('title'), person: text('person'), kind: text('kind') as Kind, amount, date: text('date'), method: text('method'), review: 'Pending', paymentReference: '', approval: 'Pending', repaymentReference: '', reconciliationReference: '', history: [{ at: new Date().toISOString(), message: 'Demo activity created locally.' }] };
    if (save({ ...state, activities: [row, ...state.activities] }, 'Activity added. Attach a document and check each status separately.')) { setAdding(false); form.current?.close(); setSelected(row.id); }
  }
  const rows = state?.activities.filter(r => event === 'all' || r.event === event) ?? [];
  const stats = totals(rows);
  const filtered = rows.filter(r => (view !== 'reimbursements' || r.kind === 'reimbursement') && (filter !== 'pending' || (view === 'reviews' ? ['Pending','Changes requested'].includes(r.review) : view === 'reimbursements' ? !r.repaymentReference && r.approval !== 'Rejected' : !r.reconciliationReference)) && `${r.title} ${r.person} ${r.id} ${r.event}`.toLowerCase().includes(search.toLowerCase()));
  const row = state?.activities.find(r => r.id === selected);
  const locked = !!row && (!!row.reconciliationReference || row.approval === 'Approved');
  const title = view === 'about' ? 'About this prototype' : navigation.find(n => n.view === view)?.label;
  const alerts = <>{error && <div className="rc-alert error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}{notice && <p className="rc-alert" role="status">{notice}</p>}</>;
  function openRow(id: string) { setSelected(id); setNote(''); setNotice(''); setError(''); }

  return <div className="rc-app">
    <a className="rc-skip" href="#main">Skip to content</a>
    <aside className="rc-sidebar">
      <Link href="/demo" className="rc-brand"><Image src="/logo.png" alt="ReceiptoChain logo" width={52} height={52} priority /><span>ReceiptoChain<small>EVENT FINANCE</small></span></Link>
      <button className="rc-menu" aria-expanded={menu} aria-controls="rc-navigation" onClick={() => setMenu(!menu)}>☰ Menu</button>
      <nav id="rc-navigation" className={menu ? 'open' : ''} aria-label="Main navigation"><p className="rc-nav-label">YOUR WORKSPACE</p>{navigation.map(n => <Link key={n.view} href={n.href} aria-current={view === n.view ? 'page' : undefined}><span aria-hidden="true">{n.icon}</span>{n.label}{n.view === 'reviews' && stats.pendingReview > 0 && <b>{stats.pendingReview}</b>}</Link>)}<Link href="/demo/about" aria-current={view === 'about' ? 'page' : undefined}><span aria-hidden="true">ⓘ</span>About the demo</Link></nav>
      <div className="rc-sidebar-bottom"><span className="rc-demo-dot" /> ENTREPRENEURSHIP PROTOTYPE<p>Clear records.<br />Confident next steps.</p><small>By Hannah A. Hontiveros</small></div>
    </aside>
    <div className="rc-workspace">
      <header className="rc-topbar"><span>Workspace <span className="rc-slash">/</span> <strong>{title}</strong></span><div className="rc-demo-controls"><Badge>Demo – Local Only</Badge><Link href="/" className="rc-exit" prefetch={false}>Exit Demo ↗</Link></div></header>
      <main id="main" className="rc-main">
        <div className="rc-heading"><div><p className="rc-eyebrow">RECEIPTOCHAIN / EVENT FINANCES</p><h1>{title}</h1><p>{descriptions[view]}</p></div>{view !== 'about' && <button className="rc-primary" disabled={!state} onClick={() => { setAdding(true); setError(''); }}>+ Add activity</button>}</div>
        <div className="rc-demo-banner"><strong>Demo workspace</strong><span>Fictional records. No money is moved. Changes and uploads stay in this browser and are not sent to a server.</span><button onClick={() => setConfirmReset(true)}>Reset demo</button></div>
        {!selected && !adding && !newEvent && alerts}
        {!state ? <section className="rc-panel rc-empty"><h2>{error ? 'Demo unavailable' : 'Loading your demo…'}</h2><p>{error ? 'Use Reset demo to restore the sample scenarios, or reload to retry.' : 'Reading this browser’s saved records.'}</p></section> : <>
        {view !== 'about' && <div className="rc-scope"><label htmlFor="event-filter">Event</label><select id="event-filter" value={event} onChange={e => setEvent(e.target.value)}><option value="all">All events</option>{state.events.map(n => <option key={n}>{n}</option>)}</select><span>{rows.length} activities · PHP</span></div>}
        {view === 'dashboard' && <>
          <section className="rc-metrics" aria-label="Financial totals">{[
            ['Confirmed collections', money(stats.income), 'Participant funds confirmed received'],
            ['Recorded expenses', money(stats.expenses), 'Direct expenses + approved claims'],
            ['Approved, awaiting repayment', money(stats.owed), 'Still owed to volunteers'],
            ['Net cash movement', money(stats.income - stats.outflow), 'Confirmed collections − organization payouts'],
          ].map(([label,value,caption]) => <article className="rc-metric" key={label}><p>{label}</p><strong>{value}</strong><small>{caption}</small></article>)}</section>
          <div className="rc-overview-grid"><section className="rc-panel rc-next"><div className="rc-section-title"><h2>What needs attention</h2><span className="rc-muted">Keep things moving</span></div><Link href="/demo/document-reviews"><span><b>Review supporting documents</b><small>Accept, request changes, or reject</small></span><strong>{stats.pendingReview} →</strong></Link><Link href="/demo/reimbursements"><span><b>Review volunteer claims</b><small>{money(stats.claims)} requested, not yet approved</small></span><strong>→</strong></Link><Link href="/demo/reconciliation"><span><b>Match records to your ledger</b><small>Reconciliation is a separate final check</small></span><strong>{stats.unmatched} →</strong></Link></section>
          <section className="rc-principle"><span className="rc-eyebrow">EVERY STEP HAS A PURPOSE</span><h2>A document tells a story.<br />A payment needs a check.</h2><p>Accepting a screenshot only accepts the document. Confirm receipt of funds separately, then match the transaction to your ledger.</p><Link href="/demo/about">How the demo works →</Link></section></div>
        </>}
        {view === 'events' ? <section className="rc-event-grid">{state.events.filter(n => event === 'all' || n === event).map(n => { const items = state.activities.filter(r => r.event === n); const t = totals(items); return <article className="rc-panel" key={n}><Badge>DEMO EVENT</Badge><h2>{n}</h2><p>{items.length ? `${items.length} financial activities` : 'No financial activities yet'}</p><dl><div><dt>Confirmed collections</dt><dd>{money(t.income)}</dd></div><div><dt>Recorded expenses</dt><dd>{money(t.expenses)}</dd></div><div><dt>Awaiting repayment</dt><dd>{money(t.owed)}</dd></div></dl><button className="rc-secondary" onClick={() => { setEvent(n); setAdding(true); }}>+ Add activity to event</button></article>; })}<button className="rc-add-event" onClick={() => { setNewEvent(true); setError(''); }}>+ Create demo event</button></section> : view === 'about' ? <section className="rc-panel rc-guide"><Image src="/logo.png" alt="Original ReceiptoChain logo" width={100} height={100} /><h2>ReceiptoChain</h2><p>Organize event financial activities, payment evidence, reviews, and reimbursements in one place.</p><h3>Three separate checks</h3><ol><li><strong>Document review:</strong> assess whether the evidence is usable. Acceptance does not prove that money arrived.</li><li><strong>Payment confirmation:</strong> independently check the bank, wallet, or cash record and enter a reference.</li><li><strong>Reconciliation:</strong> match the confirmed movement against the event ledger and enter its reference.</li></ol><h3>Reimbursements without duplicate expenses</h3><p>A volunteer’s flight claim enters recorded expenses once it is approved. Repayment reduces the outstanding amount and increases cash paid out; it does not add a second expense. Accommodation paid directly by the organization is a direct expense, not a volunteer claim.</p><h3>Your demo files stay local</h3><p>PNG, JPEG, and PDF uploads (up to 1 MB each) are stored only in this browser’s local storage. They are not uploaded to Neon or any server, shared with reviewers, or synced across devices. Clearing browser data or resetting the demo removes them. Use sample files, not sensitive documents.</p><p>All roles are simulated by one person. This prototype has no real payment processing, bank verification, access control, or tamper-proof audit trail. The activity history is a local demonstration.</p><h3>Brand assets</h3><p>The original ReceiptoChain logo, favicon, receipt imagery, and green-and-yellow identity are preserved.</p><Image src="/Template.png" alt="Original ReceiptoChain receipt header" width={736} height={75} className="rc-brand-template" /><p className="rc-muted">Founder & developer: Hannah A. Hontiveros</p></section> : <>
          {view === 'reimbursements' && <div className="rc-inline-summary"><b>{money(stats.claims)} requested</b><b>{money(stats.owed)} approved, unpaid</b><span>Repayment settles the claim; the expense is counted once.</span></div>}
          {view === 'reviews' && <p className="rc-explainer">Document acceptance never changes payment confirmation or reconciliation. Open an activity to preview its evidence and record a review.</p>}
          {view === 'reconciliation' && <p className="rc-explainer">Match each confirmed movement to a ledger entry. Volunteer claims must also be repaid before their final reconciliation.</p>}
          <section className="rc-panel rc-activity-panel"><div className="rc-section-title"><h2>{view === 'dashboard' ? 'Recent financial activities' : title}</h2><span className="rc-muted">{filtered.length} records</span></div>
            <div className="rc-tools"><label className="rc-search"><span className="sr-only">Search activities</span><input type="search" placeholder="Search activity, person, or reference…" value={search} onChange={e => setSearch(e.target.value)} /></label>{['reviews','reimbursements','reconciliation'].includes(view) && <label><span className="sr-only">Status filter</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All statuses</option><option value="pending">Needs attention</option></select></label>}</div>
            {!filtered.length ? <div className="rc-empty"><span aria-hidden="true">▤</span><h3>No activities to show</h3><p>Try a different event or search, or add the first activity.</p><button className="rc-secondary" onClick={() => { setSearch(''); setFilter('all'); setEvent('all'); }}>Clear filters</button></div> : <div className="rc-table-wrap"><table><caption className="sr-only">Demo financial activities and their independent statuses</caption><thead><tr><th>Activity / person</th><th>Amount</th><th>Document</th><th>{view === 'reimbursements' ? 'Approval / repayment' : 'Payment'}</th><th>Reconciliation</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{filtered.map(r => <tr key={r.id}><td><span className="rc-record-type">{kinds[r.kind]}</span><strong>{r.title}</strong><small>{r.person} · {r.id}</small></td><td className="rc-amount">{money(r.amount)}<small>{r.kind === 'participant' ? 'Incoming' : 'Expense'}</small></td><td><Badge good={r.review === 'Accepted'}>{r.review}</Badge><small>{r.evidence ? 'Evidence attached' : 'No document'}</small></td><td>{view === 'reimbursements' ? <><Badge good={r.approval === 'Approved'}>{r.approval}</Badge><small>{r.repaymentReference ? 'Repaid' : 'Not repaid'}</small></> : <Badge good={!!r.paymentReference}>{paymentLabel(r)}</Badge>}</td><td><Badge good={!!r.reconciliationReference}>{r.reconciliationReference ? 'Matched' : 'Not matched'}</Badge></td><td><button className="rc-open" onClick={() => openRow(r.id)} aria-label={`Open ${r.title}`}>Open →</button></td></tr>)}</tbody></table></div>}
          </section><p className="rc-footnote">Automatic totals use confirmed money movements. Recorded expenses include direct expenses and approved volunteer claims; pending claims are shown separately.</p>
        </>}
        </>}
      </main><footer className="rc-footer">ReceiptoChain <span>Entrepreneurship demo · Stored on this browser</span></footer>
    </div>

    <dialog ref={detail} aria-labelledby="activity-title" className="rc-dialog" onCancel={() => setSelected(null)} onClose={() => setSelected(null)}>
      {row && <><div className="rc-dialog-heading"><div><p className="rc-eyebrow">{row.id} · DEMO ACTIVITY</p><h2 id="activity-title">{row.title}</h2><p>{row.person} · {row.event}</p></div><button className="rc-close" onClick={() => detail.current?.close()} aria-label="Close activity">×</button></div>
        <div className="rc-dialog-body">{alerts}<div className="rc-detail-summary"><strong>{money(row.amount)}</strong><span>{kinds[row.kind]}<br />{row.date} · {row.method}</span></div>
        <div className="rc-detail-grid"><section className="rc-evidence"><h3>Supporting document</h3>{row.evidence ? <><p>{row.evidence.name}</p>{row.evidence.sample ? <div className="rc-sample"><Badge>FICTIONAL SAMPLE</Badge><p>{row.evidence.sample}</p></div> : row.evidence.data?.startsWith('data:image/') ? <img src={row.evidence.data} alt={`Uploaded evidence: ${row.evidence.name}`} /> : <object data={row.evidence.data} type="application/pdf" width="100%" height="300"><p>PDF preview is unavailable in this browser. Download the local copy below.</p></object>}{row.evidence.data && <a className="rc-file-link" href={row.evidence.data} download={row.evidence.name}>Download local copy</a>}</> : <div className="rc-empty"><p>No document attached yet.</p></div>}
        <label className="rc-upload">{uploading ? 'Reading file…' : 'Attach / replace document'}<input type="file" accept="image/png,image/jpeg,application/pdf" disabled={locked || uploading} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label><small>PNG, JPEG, PDF · max 1 MB. Files stay in this browser, never on a server. Replacement requires a fresh document review.{locked && ' Evidence is locked after approval or reconciliation.'}</small></section>
        <section className="rc-workflow"><label className="rc-note">Reason or reference<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Enter a review reason, independent payment reference, or ledger reference…" maxLength={500} /></label><small>Required for each action. Demo role: organizer / reviewer.</small>
          <div className="rc-step"><h3>1. Document review <Badge good={row.review === 'Accepted'}>{row.review}</Badge></h3><p>Acceptance means the document is usable. It does not confirm payment.</p><div className="rc-actions"><button disabled={locked || !row.evidence || uploading} onClick={() => act('accept')}>Accept document</button><button disabled={locked || !row.evidence || uploading} onClick={() => act('changes')}>Request changes</button><button disabled={locked || !row.evidence || uploading} onClick={() => act('reject')}>Reject document</button></div></div>
          <div className="rc-step"><h3>2. Payment confirmation <Badge good={!!row.paymentReference}>{row.paymentReference ? 'Confirmed' : 'Not confirmed'}</Badge></h3><p>{row.kind === 'participant' ? 'Check that the organization received the funds.' : row.kind === 'reimbursement' ? 'Check that the volunteer paid the airline or supplier. This does not repay the volunteer.' : 'Check the organization’s payment directly to the supplier.'}</p>{row.paymentReference ? <p className="rc-reference">{row.paymentReference}</p> : <button onClick={() => act('confirm')}>Confirm payment separately</button>}</div>
          {row.kind === 'reimbursement' && <><div className="rc-step"><h3>3. Reimbursement approval <Badge good={row.approval === 'Approved'}>{row.approval}</Badge></h3><p>Approval records this expense once and the amount owed to the volunteer. It does not move money.</p><div className="rc-actions"><button disabled={row.approval !== 'Pending'} onClick={() => act('approve')}>Approve reimbursement</button><button disabled={row.approval !== 'Pending'} onClick={() => act('decline')}>Reject reimbursement</button></div></div><div className="rc-step"><h3>4. Repayment <Badge good={!!row.repaymentReference}>{row.repaymentReference ? 'Repaid' : 'Not repaid'}</Badge></h3><p>After the organization repays the volunteer, record the transfer reference. The expense is not counted again.</p>{row.repaymentReference ? <p className="rc-reference">{row.repaymentReference}</p> : <button disabled={row.approval !== 'Approved'} onClick={() => act('repay')}>Record repayment</button>}</div></>}
          <div className="rc-step"><h3>{row.kind === 'reimbursement' ? '5' : '3'}. Reconciliation <Badge good={!!row.reconciliationReference}>{row.reconciliationReference ? 'Matched' : 'Not matched'}</Badge></h3><p>Match the confirmed movement to your event ledger. Enter the ledger or statement reference.</p>{row.reconciliationReference ? <p className="rc-reference">{row.reconciliationReference}</p> : <button onClick={() => act('reconcile')}>Mark as reconciled</button>}</div>
        </section></div><section className="rc-history"><h3>Local activity history</h3>{row.history.length ? <ol>{row.history.map((h,i) => <li key={i}><time>{new Date(h.at).toLocaleString()}</time><span>{h.message}</span></li>)}</ol> : <p>Sample starting state. New actions will appear here.</p>}</section></div></>}
    </dialog>
    <dialog ref={form} aria-labelledby="form-title" className="rc-dialog rc-small-dialog" onCancel={() => { setAdding(false); setNewEvent(false); }} onClose={() => { setAdding(false); setNewEvent(false); }}><div className="rc-dialog-heading"><h2 id="form-title">{newEvent ? 'Create demo event' : 'Add financial activity'}</h2><button className="rc-close" onClick={() => form.current?.close()} aria-label="Close form">×</button></div><form onSubmit={add} className="rc-dialog-body rc-form" key={`${adding}-${newEvent}-${event}`}>{alerts}{newEvent ? <label>Event name<input name="eventName" required maxLength={100} /></label> : <><label>Scenario<select name="kind">{Object.entries(kinds).map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label><label>Event<select name="event" defaultValue={event === 'all' ? state?.events[0] : event}>{state?.events.map(n => <option key={n}>{n}</option>)}</select></label><label>Activity title<input name="title" required maxLength={100} placeholder="e.g. Volunteer flight to Cebu" /></label><label>Participant, volunteer, or supplier<input name="person" required maxLength={100} /></label><div className="rc-form-row"><label>Amount (PHP)<input name="amount" type="number" min="0.01" max="9999999.99" step="0.01" required placeholder="0.00" /></label><label>Date<input name="date" type="date" required defaultValue={new Date().toLocaleDateString('en-CA')} /></label></div><label>Payment method<select name="method"><option>GCash</option><option>Bank transfer</option><option>Cash</option><option>Card</option><option>Other</option></select></label><p className="rc-muted">Starts with no document review, payment confirmation, or reconciliation. Attach evidence after creating the activity.</p></>}<button className="rc-primary" type="submit">{newEvent ? 'Create event' : 'Save activity locally'}</button></form></dialog>
    <dialog ref={reset} aria-labelledby="reset-title" className="rc-dialog rc-small-dialog" onCancel={() => setConfirmReset(false)} onClose={() => setConfirmReset(false)}><div className="rc-dialog-body"><h2 id="reset-title">Reset this browser’s demo?</h2><p>This removes local activities, uploads, and history, and restores the three fictional scenarios. It cannot be undone.</p><div className="rc-actions"><button onClick={() => reset.current?.close()}>Keep my data</button><button className="rc-primary" onClick={() => { if (save(seed(), 'Sample scenarios restored.', true)) { setEvent('all'); setFilter('all'); setSearch(''); reset.current?.close(); } }}>Reset demo data</button></div>{error && <p role="alert">{error}</p>}</div></dialog>
  </div>;
}
