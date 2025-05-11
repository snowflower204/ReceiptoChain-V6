'use client';
import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`min-h-screen fixed top-16 left-0 bg-green-700 backdrop-blur-md border-r border-white/20 text-white transition-all duration-300 z-50 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4">
        {/* Logo */}
        {!collapsed && (
          <div className="flex flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Logo"
              width={140}
              height={30}
              className="dark:invert"
            />
          </div>
        )}

        {/* Toggle collapsed state (Button for 'x') */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-white flex items-center justify-center"
        >
          {collapsed ? '☰' : '✕'}
        </button>
      </div>

      <nav className="flex flex-col gap-4 mt-8 px-4 text-sm font-medium">
        <Link href="/dashboard" className="hover:text-yellow-400 flex items-center gap-2">
          {!collapsed && 'Dashboard'}
        </Link>

        <Link href="/student-records" className="hover:text-yellow-400 flex items-center gap-2">
          {!collapsed && 'Student Records'}
        </Link>
        <Link href="/student-records/add" className="hover:text-yellow-400 flex items-center gap-2">
          {!collapsed && 'Import Students'}
        </Link>
        <Link href="/events" className="hover:text-yellow-400 flex items-center gap-2">
          {!collapsed && 'Manage Events'}
        </Link>
        <Link href="/transactions" className="hover:text-yellow-400 flex items-center gap-2">
          {!collapsed && 'Transactions'}
        </Link>
        <Link href="/receipt" className="hover:text-yellow-400 flex items-center gap-2">
          {!collapsed && 'Print Receipt'}
        </Link>
      </nav>
    </aside>
  );
}
