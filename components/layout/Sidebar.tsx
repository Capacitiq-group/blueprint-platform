'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutGrid, Building2, Video, LogOut, Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/businesses', label: 'Businesses', icon: Building2 },
  { href: '/meetings', label: 'Meetings', icon: Video },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const content = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-lime shrink-0" />
        <span className="font-semibold text-offwhite tracking-tight">
          {process.env.NEXT_PUBLIC_APP_NAME || 'Blueprint'}
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-lime/10 text-lime font-medium'
                  : 'text-offwhite/60 hover:text-offwhite hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/8">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs text-offwhite/40 truncate">{userEmail}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-offwhite/60 hover:text-offwhite hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-white/8 bg-charcoal sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-lime" />
          <span className="font-semibold text-sm">{process.env.NEXT_PUBLIC_APP_NAME || 'Blueprint'}</span>
        </div>
        <button onClick={() => setMobileOpen((o) => !o)} className="p-2 text-offwhite/70">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-charcoal pt-14">
          {content}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-white/8 bg-charcoal">
        {content}
      </aside>
    </>
  );
}
