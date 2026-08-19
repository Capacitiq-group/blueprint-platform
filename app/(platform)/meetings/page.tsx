import Link from 'next/link';
import { Plus, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, EmptyState, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/utils';

const statusVariant: Record<string, 'lime' | 'warning' | 'default'> = {
  live: 'lime',
  setup: 'warning',
  completed: 'default',
};

export default async function MeetingsPage() {
  const supabase = createClient();
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, company_name, meeting_types, status, created_at, businesses(name)')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-offwhite">Meetings</h1>
          <p className="text-sm text-offwhite/50 mt-1">Every conversation, prepared, live and completed.</p>
        </div>
        <Link href="/meetings/new">
          <Button>
            <Plus className="w-4 h-4" /> New meeting
          </Button>
        </Link>
      </div>

      {!meetings || meetings.length === 0 ? (
        <EmptyState
          title="No meetings yet"
          description="Set up a meeting to give the AI the context it needs before you start talking."
          action={
            <Link href="/meetings/new">
              <Button>
                <Plus className="w-4 h-4" /> Set up a meeting
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
                    {m.businesses?.name} · {(m.meeting_types || []).join(', ') || 'No type set'} · {formatDateTime(m.created_at)}
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
