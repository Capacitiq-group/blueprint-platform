'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Copy, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, EmptyState } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Field';
import type { Business, Meeting, MeetingSummary } from '@/lib/types/database';
import { formatDateTime } from '@/lib/utils';

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-offwhite/50 uppercase tracking-wide mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-offwhite/85 flex gap-2">
            <span className="text-lime mt-1.5 w-1 h-1 rounded-full bg-lime shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SummaryView({
  meeting,
  business,
  summary: initialSummary,
}: {
  meeting: Meeting;
  business: Business;
  summary: MeetingSummary | null;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState(initialSummary?.follow_up_draft || '');
  const [copied, setCopied] = useState(false);

  async function regenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate summary');
      setSummary(data.summary);
      setFollowUp(data.summary.follow_up_draft || '');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  }

  async function copyFollowUp() {
    await navigator.clipboard.writeText(followUp);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="max-w-3xl">
      <Link href="/meetings" className="inline-flex items-center gap-1.5 text-sm text-offwhite/50 hover:text-offwhite mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Meetings
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-offwhite">{meeting.company_name || 'Meeting summary'}</h1>
          <p className="text-sm text-offwhite/50 mt-1">
            {business.name} · {(meeting.meeting_types || []).join(', ') || 'No type set'} · {formatDateTime(meeting.ended_at)}
          </p>
        </div>
        <Button variant="secondary" onClick={regenerate} loading={regenerating}>
          <RefreshCw className="w-4 h-4" /> {summary ? 'Regenerate' : 'Generate summary'}
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

      {!summary ? (
        <EmptyState
          title="No summary yet"
          description="Generate a summary from the recorded transcript — it will include key points, decisions, actions and a follow-up draft."
          action={
            <Button onClick={regenerate} loading={regenerating}>
              <RefreshCw className="w-4 h-4" /> Generate summary
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          <Card>
            <p className="text-xs font-medium text-offwhite/50 uppercase tracking-wide mb-2">Summary</p>
            <p className="text-sm text-offwhite/90 leading-relaxed">{summary.summary}</p>
          </Card>

          <div className="grid sm:grid-cols-2 gap-5">
            <Card>
              <ListSection title="Key points" items={summary.key_points} />
            </Card>
            <Card>
              <ListSection title="Decisions" items={summary.decisions} />
            </Card>
            <Card>
              <ListSection title="Actions" items={summary.actions} />
            </Card>
            <Card>
              <ListSection title="Next steps" items={summary.next_steps} />
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-offwhite/50 uppercase tracking-wide">Follow-up draft</p>
              <Button size="sm" variant="ghost" onClick={copyFollowUp}>
                {copied ? <Check className="w-3.5 h-3.5 text-lime" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <Textarea value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="min-h-[220px]" />
            <p className="text-xs text-offwhite/35 mt-2">
              Editable — nothing is sent automatically. Review before sending anywhere.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
