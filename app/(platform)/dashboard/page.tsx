import Link from 'next/link';
import { Plus, Building2, Video, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, EmptyState, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/utils';

const statusVariant: Record<string, 'lime' | 'warning' | 'default'> = {
  live: 'lime',
  setup: 'warning',
  completed: 'default',
};

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: businesses }, { data: meetings }] = await Promise.all([
    supabase.from('businesses').select('id, name, industry').eq('is_archived', false).order('created_at', { ascending: false }).limit(4),
    supabase
      .from('meetings')
      .select('id, company_name, meeting_types, status, current_stage, created_at, businesses(name)')
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-offwhite">Dashboard</h1>
          <p className="text-sm text-offwhite/50 mt-1">Your operating layer across every business.</p>
        </div>
        <Link href="/meetings/new">
          <Button>
            <Plus className="w-4 h-4" /> New meeting
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-offwhite/70">Businesses</h2>
        <Link href="/businesses" className="text-xs text-lime hover:underline">
          View all
        </Link>
      </div>

      {!businesses || businesses.length === 0 ? (
        <EmptyState
          title="No businesses yet"
          description="Create a business profile to give the AI something to represent."
          action={
            <Link href="/businesses/new">
              <Button>
                <Plus className="w-4 h-4" /> Create a business
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {businesses.map((b) => (
            <Link key={b.id} href={`/businesses/${b.id}`}>
              <Card className="hover:border-lime/40 transition-colors">
                <Building2 className="w-4 h-4 text-lime mb-3" />
                <p className="text-sm font-medium text-offwhite truncate">{b.name}</p>
                {b.industry && <p className="text-xs text-offwhite/40 mt-0.5 truncate">{b.industry}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-offwhite/70">Recent meetings</h2>
        <Link href="/meetings" className="text-xs text-lime hover:underline">
          View all
        </Link>
      </div>

      {!meetings || meetings.length === 0 ? (
        <EmptyState
          title="No meetings yet"
          description="Set up your first meeting — select a business, add context, and start."
          action={
            <Link href="/meetings/new">
              <Button>
                <Video className="w-4 h-4" /> Start a meeting
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {meetings.map((m: any) => (
            <Link key={m.id} href={m.status === 'completed' ? `/meetings/${m.id}/summary` : `/meetings/${m.id}/live`}>
              <Card className="flex items-center justify-between hover:border-lime/40 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-offwhite truncate">{m.company_name || 'Untitled meeting'}</p>
                  <p className="text-xs text-offwhite/40 mt-0.5">
                    {m.businesses?.name} · {formatDateTime(m.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Badge variant={statusVariant[m.status] || 'default'}>{m.status}</Badge>
                  <ArrowRight className="w-4 h-4 text-offwhite/20" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
