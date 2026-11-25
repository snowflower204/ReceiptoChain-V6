# ReceiptoChain — entrepreneurship prototype

The `entrep-101` branch demonstrates event financial activities using **fictional data and browser-local persistence**. It retains the original green-and-yellow identity, `public/logo.png`, receipt brand assets, and favicon.

## Run locally

Use Node.js 20.19+ (or a supported newer LTS) and npm.

```sh
npm ci --ignore-scripts
npm run dev
```

Open `http://localhost:3000/demo`. The real landing page is at `/`; Exit Demo returns there. The demo UI works without database credentials. `--ignore-scripts` avoids the existing Prisma postinstall requirement for this UI-only review. Legacy database screens are not part of the demo; do not use them for this walkthrough.

## Demo pages

- `/demo`: automatic totals, next steps, financial activities.
- `/demo/events`: event totals and local event creation.
- `/demo/financial-activities`: add activities, attach evidence, and open all workflow controls.
- `/demo/document-reviews`: document review queue.
- `/demo/reimbursements`: approval and repayment tracking.
- `/demo/reconciliation`: separate ledger matching.
- `/demo/about`: explanation, limitations, and original brand assets.
- `/transaction-history` and `/receipt` are real routes again; they are not prototype aliases.

The original real pages were restored exactly from `57f9639`. Real navigation and footer appear on all routes outside `/demo`. API routes, Prisma schema/migrations, and student/login pages are unchanged. The new demo never calls an API, connects to Neon, moves money, or uploads documents to a server.

## Walkthrough: three scenarios

All names, references, and sample documents are fictional. `Community Tech Summit` starts with three activities; `Campus Makers Workshop` demonstrates an empty event.

1. **Participant event payment — ₱500.00.** Open Event registration. Enter a review reason, then accept its sample screenshot. Payment must still read **Not confirmed**, and collections stay at ₱0.00. Enter an independent wallet/bank/cash reference and confirm payment separately. Collections become ₱500.00. Enter a ledger reference and reconcile separately.
2. **Volunteer flight reimbursement — ₱4,800.00.** The sample starts with an accepted airline receipt and independently confirmed volunteer-to-airline payment. Enter a reason and approve reimbursement. The expense is recorded once and ₱4,800.00 is owed; repayment remains **Not repaid**. Enter the organization's transfer reference and record repayment. The amount owed becomes zero; cash outflow increases, but recorded expenses do not increase again. Reconcile using the ledger reference.
3. **Accommodation paid directly — ₱7,200.00.** The organization paid the hotel directly. The sample starts with an accepted invoice and separately confirmed organization-to-hotel payment. It counts as a direct expense and organization cash outflow. It has no reimbursement approval or repayment workflow. Enter a ledger reference to reconcile.

After confirming the participant payment, approving and repaying the flight, the totals are:

| Metric | Amount |
| --- | ---: |
| Confirmed collections | ₱500.00 |
| Recorded expenses | ₱12,000.00 |
| Approved, awaiting repayment | ₱0.00 |
| Organization cash outflow | ₱12,000.00 |
| Net cash movement | −₱11,500.00 |

Net cash movement excludes opening balances; it is not a bank balance. Direct expenses count when recorded. Volunteer claims count as expenses only when approved; pending and rejected claims are excluded. Full payments only are modeled (no partial payments/refunds).

## Independent status rules

- Document acceptance only changes document review. It never confirms payment or reconciles the record.
- Payment confirmation requires its own reason/reference. It does not approve a reimbursement.
- Reimbursement approval requires accepted evidence and confirmation that the volunteer paid the supplier.
- Repayment requires approval, settles the outstanding claim, and cannot be recorded twice.
- Reconciliation requires accepted evidence and confirmed payment; volunteer claims must also be repaid.
- Evidence replacement resets review to Pending, preserving the independent payment confirmation. Evidence/review is locked after approval or reconciliation.
- Every action requires a note/reference and adds a local history entry. No real authorization or banking verification is performed.

## Local storage and files

Records and PNG/JPEG/PDF evidence (maximum 1 MB per file) are saved in `localStorage`, key `receiptochain-demo-v1`. Uploads stay in this browser, are not synced, and are removed by resetting the demo or clearing browser data. Use sample files only. Browser storage limits can still reject a save; the UI reports the error and keeps the previous saved state. Conflicting edits from another tab require a reload. Invalid saved data is not silently overwritten; explicit reset restores the samples.

## Checks

```sh
node --import tsx --test tests/demo*.test.ts
```

For a full type check/build, the unchanged API routes require generated Prisma code and a database URL at module initialization. Use a **dummy localhost URL**, not Neon. Generation does not migrate, seed, or query a database:

```sh
DATABASE_URL_UNPOOLED=postgresql://demo:demo@127.0.0.1:1/demo npx prisma generate
npx tsc --noEmit
npm rebuild bcrypt
DATABASE_URL=postgresql://demo:demo@127.0.0.1:1/demo npm run build
```

The tests cover independent document/payment/reconciliation transitions, reimbursement prerequisites, repayment without double counting, aggregate totals, duplicate actions, evidence locks, and invalid saved data.

## Verification in this workspace

All 13 workflow/isolation tests, TypeScript, and the production build passed using the dummy localhost URL above. The managed browser preview could not start because its launcher injects Vite-style `--host` and `--strictPort` flags into `next dev`. Built HTML checks confirm the restored real landing content, seven demo links, Exit Demo, and stylesheet separation. Browser testing of `/` and `/demo` remains blocked; rendered desktop/mobile behavior and file-picker interactions still need a local browser walkthrough in VS Code.

## No deployment

`vercel.json` disables automatic Git deployments specifically for `entrep-101`. No merge or deployment is part of this prototype review. Database code and Neon configuration are unchanged.

## Namespace separation

All prototype page entry points, components, styles, and state code live in `src/app/demo`. Next.js private folders `_components` and `_lib` are not public routes. Demo navigation never links to the real workflows; only Exit Demo leaves the namespace. A validated one-time migration copies the old prototype storage key to `receiptochain-demo-v1`, removing only the old prototype key after a successful write. It never reads or clears auth or real application storage. Existing browser-local records and uploads are preserved.
