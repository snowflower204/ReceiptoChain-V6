import Image from "next/image";
import Link from 'next/link';

export default function Home() {
  return (
    <div className="md:animated-bg flex flex-col min-h-screen items-center justify-between p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      
      <section id="home" className="w-full">
        <main className="flex flex-col items-center sm:items-start gap-8 sm:flex-row sm:justify-between w-full">
          <Image
            className="dark:invert"
            src="/logo.png" 
            alt="ReceiptoChain.js logo"
            width={250}
            height={120}
            priority
          />

          <div className="md:pl-8 flex flex-col items-center sm:items-start gap-6">
            <h1 className="text-2xl sm:text-4xl text-white font-semibold text-glow">
              Smart, Secure and Real-Time Receipt Verification
            </h1>

            <ol className="md:text-base text-black sm:text-left text-center sm:text-start">
              <li>Experience the power of blockchain-inspired technology to monitor transactions with QR.</li>
            </ol>

            <Link
              href="/login"
              className="md:rounded-full py-3 px-12 bg-black/20 backdrop-blur-md border border-white/20 text-white text-xl font-semibold transition-all duration-300 ease-in-out hover:shadow-[0_0_10px_2px_rgba(255,255,0,0.8)] focus:ring-2 focus:ring-yellow-500 focus:outline-none"
            >
              Get Started
            </Link>
          </div>
        </main>
      </section>

      <footer className="md:flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4 bg-black/30 backdrop-blur-md border-white/20 text-white text-xl font-semibold py-2 px-6 transition-all duration-300 ease-in-out hover:shadow-[0_0_15px_2px_rgba(255,255,255,0.8)] focus:ring-2 focus:ring-yellow-400 focus:outline-none"
          href="/about"
          target="_blank"
          rel="noopener noreferrer"
        >
          How ReceiptoChain Works →
        </a>
      </footer>
    </div>
  );
}
