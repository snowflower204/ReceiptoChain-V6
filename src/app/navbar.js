'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20); // Scroll threshold for sticky effect
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`
        fixed top-0 left-0 w-full flex justify-between items-center px-8 py-4 z-50 transition-all duration-500
        ${scrolled ? 'bg-green-700/70 backdrop-blur-lg shadow-md border-b border-white/30' : 'bg-black/20 backdrop-blur-md border-b border-white/20'}
        animate-fadeIn
      `}
    >
      {/* Logo or System Name as Link */}
      <Link
        href="/" // Link to the home page
        className="text-2xl font-bold text-yellow-400 drop-shadow-lg cursor-pointer"
        style={{ fontFamily: 'Inknut Antiqua' }}
      >
        ReceiptoChain
      </Link>

      {/* Navbar Links */}
      <ul className="flex space-x-8 text-white font-semibold">
        <li>
          <Link href="/dashboard" className="hover:text-green-400 transition-colors duration-300">
            Home
          </Link>
        </li>
        <li>
          <Link href="/about" className="hover:text-green-400 transition-colors duration-300">
            About
          </Link>
        </li>
        <li>
          <Link href="/news" className="hover:text-green-400 transition-colors duration-300">
            News
          </Link>
        </li>
        <li>
          <Link href="/contact" className="hover:text-green-400 transition-colors duration-300">
            Contact
          </Link>
        </li>
      </ul>
    </nav>
  );
}
