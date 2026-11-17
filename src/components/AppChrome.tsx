'use client';
import { usePathname } from 'next/navigation';
import Navbar from '@/app/navbar';
import Footer from '@/app/footer';

// Keep legacy screens available without putting database-backed actions in the demo navigation.
export default function AppChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const legacy = ['/login', '/student-records', '/qr-scanner'].some(p => path === p || path.startsWith(`${p}/`));
  return legacy ? <><Navbar /><main className="pt-20 min-h-screen">{children}</main><Footer /></> : <>{children}</>;
}
