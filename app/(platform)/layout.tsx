import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex bg-charcoal">
      <Sidebar userEmail={user.email || ''} />
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
