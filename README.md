# Real application and isolated demo

The original ReceiptoChain website is restored at `/`. Existing real application routes remain available with their original implementation.

The entrepreneurship prototype is preserved separately at **`/demo`**. Its pages, components, styles, and browser-local state code live in `src/app/demo`. See [the demo guide](src/app/demo/README.md) for setup, scenarios, storage migration, and tests. Demo actions never call the real APIs.

No Neon or Prisma changes are included. Vercel automatic Git deployment remains disabled for `entrep-101`; this branch is for review.

---

# ReceiptoChain

ReceiptoChain is a secure, real-time receipt monitoring system built for students and institutions. It ensures transparent and verifiable transactions by integrating QR code verification and blockchain-like receipt chaining.

## 🚀 Features

- 🔒 Secure and real-time receipt logging
- 📄 Receipt chaining with blockchain-like structure
- 📊 Dynamic student and transaction data display
- 📷 QR Code verification system
- 🌐 Admin dashboard with real-time insights

## 🛠️ Tech Stack

- **Frontend:** React, Next.js, Tailwind CSS
- **Backend:** Express.js
- **Database:** MySQL
- **Tools:** Vercel (for deployment), Git, Figma (for design)
- **Security:** Blockchain-style verification

## 📁 Project Structure

/ReceiptoChain

├── app/ # Frontend pages and components

├── public/ # Static files

├── styles/ # CSS and Tailwind configurations

├── .next/ # Build artifacts (should be .gitignored)

├── pages/api/ # API routes for events, transactions, etc.

├── lib/ # Database utilities

└── README.md


## ⚙️ Getting Started

### Prerequisites
- Node.js and npm
- MySQL server
