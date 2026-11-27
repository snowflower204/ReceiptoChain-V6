import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import LogoutButton from "./_components/LogoutButton";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#f7f8f3] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/app/activities" className="flex items-center gap-3">
            <Image src="/logo.png" alt="ReceiptoChain" width={42} height={42} className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <p className="font-bold leading-tight text-emerald-950">ReceiptoChain</p>
              <p className="text-xs text-slate-500">Finance accountability workspace</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/app/my-events" className="text-sm font-semibold text-emerald-900">My Events</Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{session.user.email}</p>
              <p className="text-xs text-slate-500">Signed in securely</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
