import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAiProvider } from '@/lib/ai/provider';
import { retrieveRelevantDocuments } from '@/lib/ai/retrieval';
import { buildBusinessSystemPrompt, buildSummaryPrompt } from '@/lib/ai/prompts';
import type { TranscriptEntry } from '@/lib/types/database';

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { meetingId } = await request.json();
  if (!meetingId) {
    return NextResponse.json({ error: 'meetingId is required' }, { status: 400 });
  }

  const { data: meeting, error: meetingError } = await supabase.from('meetings').select('*').eq('id', meetingId).single();
  if (meetingError || !meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', meeting.business_id)
    .single();
  if (businessError || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const { data: allEntries } = await supabase
    .from('meeting_transcript_entries')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('spoken_at', { ascending: true });

  const transcript = (allEntries as TranscriptEntry[]) || [];

  if (transcript.length === 0) {
    return NextResponse.json({ error: 'This meeting has no transcript to summarize yet.' }, { status: 400 });
  }

  const query = [meeting.objective, ...transcript.map((t) => t.content)].filter(Boolean).join(' ').slice(0, 2000);
  const documents = await retrieveRelevantDocuments(supabase, business.id, query, 8);
  const systemPrompt = await buildBusinessSystemPrompt(business, documents);

  const provider = getAiProvider();

  try {
    const raw = await provider.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildSummaryPrompt(meeting, transcript) },
      ],
      { jsonMode: true, maxTokens: 1400, temperature: 0.4 }
    );

    const result = safeParseJson(raw, {
      summary: '',
      key_points: [] as string[],
      decisions: [] as string[],
      actions: [] as string[],
      next_steps: [] as string[],
      follow_up_draft: '',
    });

    const { data: summary, error: upsertError } = await supabase
      .from('meeting_summaries')
      .upsert(
        {
          meeting_id: meetingId,
          summary: result.summary,
          key_points: result.key_points,
          decisions: result.decisions,
          actions: result.actions,
          next_steps: result.next_steps,
          follow_up_draft: result.follow_up_draft,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'meeting_id' }
      )
      .select('*')
      .single();

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    await supabase
      .from('meetings')
      .update({ status: 'completed', ended_at: meeting.ended_at || new Date().toISOString() })
      .eq('id', meetingId);

    return NextResponse.json({ summary });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'AI request failed' }, { status: 502 });
  }
}
