"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, getStats, signOut, fetchUser, type User as UserT, type Stats } from "@/lib/store";
import { Home, Hammer, Languages, User, LogOut, Menu, X } from "@/components/Icons";
import { Logo } from "@/components/Logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/build", label: "Yap to Build", icon: Hammer },
  { href: "/dashboard/dub", label: "Voice Dubbing", icon: Languages },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUserState] = useState<UserT | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const sync = () => { setUserState(getUser()); setStats(getStats()); };
    sync();
    window.addEventListener("yap:user-changed", sync);
    window.addEventListener("yap:activity-changed", sync);
    return () => {
      window.removeEventListener("yap:user-changed", sync);
      window.removeEventListener("yap:activity-changed", sync);
    };
  }, []);

  // Verify session against server on every dashboard mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await fetchUser();
      if (cancelled) return;
      if (!u) { router.replace("/login"); return; }
      if (!u.username) { router.replace("/onboarding"); return; }
    })();
    return () => { cancelled = true; };
  }, [router]);

  // Close drawer whenever the route changes
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [drawerOpen]);

  const SidebarContent = (
    <>
      <Link href="/" className="flex items-center gap-2.5 px-2 mb-5 cursor-pointer group">
        <Logo animated className="w-8 h-8 drop-shadow-[0_0_16px_rgba(255,94,58,0.4)] group-hover:scale-110 transition-transform duration-300" />
        <div className="text-lg font-extrabold tracking-tight">Yap</div>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                active ? "bg-white/[0.06] text-white" : "text-muted hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </nav>

      {stats && user && (
        <Link
          href="/dashboard/profile"
          className="mt-auto rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-transparent p-3 cursor-pointer hover:border-white/10 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/30 to-accent-2/30 border border-accent/30 flex items-center justify-center text-lg">
              {stats.level.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[9px] text-muted truncate">{user.username ? `@${user.username}` : user.email}</div>
              <div className="text-xs font-bold truncate">{stats.level.title}</div>
            </div>
          </div>
          {stats.progress.next && (
            <div className="mt-2">
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${stats.progress.pct}%` }} />
              </div>
              <div className="font-mono text-[9px] text-muted mt-1 flex justify-between">
                <span>{stats.xp} xp</span>
                <span>{stats.progress.next.minXp} xp</span>
              </div>
            </div>
          )}
        </Link>
      )}

      <button
        onClick={async () => { await signOut(); router.replace("/"); }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:text-white hover:bg-white/[0.03] transition-all cursor-pointer mt-2"
      >
        <LogOut className="w-3.5 h-3.5" /> Sign out
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-bg text-white lg:flex">
      {/* MOBILE TOP BAR */}
      <header className="lg:hidden sticky top-0 z-40 backdrop-blur-xl bg-bg/80 border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
          <Logo animated className="w-7 h-7 drop-shadow-[0_0_14px_rgba(255,94,58,0.4)]" />
          <span className="text-base font-extrabold tracking-tight">Yap</span>
        </Link>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/5 hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-60 shrink-0 border-r border-white/5 px-4 py-5 flex-col gap-2 sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* MOBILE DRAWER */}
      {drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade"
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[85vw] bg-bg border-r border-white/5 px-4 py-5 flex flex-col gap-2 page-enter shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <div className="font-mono text-[10px] text-muted uppercase tracking-wider px-1">Menu</div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {SidebarContent}
          </aside>
        </>
      )}

      <main key={pathname} className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 page-enter">{children}</main>
    </div>
  );
}
