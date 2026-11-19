'use client';
import { usePathname } from 'next/navigation';
import Navbar from '@/app/navbar';
import Footer from '@/app/footer';

// Only /demo owns a separate shell. All real routes keep their original chrome.
export default function AppChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const demo = path === '/demo' || path.startsWith('/demo/');
  const workspace = path === '/app' || path.startsWith('/app/');
  return demo || workspace ? <>{children}</> : <><Navbar /><main className="pt-20 min-h-screen">{children}</main><Footer /></>;
}
