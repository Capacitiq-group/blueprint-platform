import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAiProvider } from '@/lib/ai/provider';
import { retrieveRelevantDocuments } from '@/lib/ai/retrieval';
import { buildBusinessSystemPrompt, buildLiveSuggestionPrompt, buildStageDetectionPrompt } from '@/lib/ai/prompts';
import type { TranscriptEntry } from '@/lib/types/database';

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    // Models occasionally wrap JSON in markdown fences despite instructions — strip defensively.
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

  // RLS ensures this returns null if the user isn't a member of the owning business.
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

  const { data: recentEntries } = await supabase
    .from('meeting_transcript_entries')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('spoken_at', { ascending: false })
    .limit(24);

  const transcript = ((recentEntries as TranscriptEntry[]) || []).reverse();
  const transcriptQuery = [meeting.objective, ...transcript.slice(-6).map((t) => t.content)].filter(Boolean).join(' ');

  const documents = await retrieveRelevantDocuments(supabase, business.id, transcriptQuery || business.name);
  const systemPrompt = await buildBusinessSystemPrompt(business, documents);

  const provider = getAiProvider();

  try {
    const [stageRaw, suggestionRaw] = await Promise.all([
      provider.complete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildStageDetectionPrompt(meeting, transcript) },
        ],
        { jsonMode: true, maxTokens: 200, temperature: 0.2 }
      ),
      provider.complete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildLiveSuggestionPrompt(meeting, transcript) },
        ],
        { jsonMode: true, maxTokens: 700, temperature: 0.4 }
      ),
    ]);

    const stageResult = safeParseJson(stageRaw, { stage: meeting.current_stage || 'Opening', reasoning: '' });
    const suggestionResult = safeParseJson(suggestionRaw, {
      script: { headline: '', content: '', reasoning: '', confidence: 'unknown' as const },
      alerts: [] as { headline: string; content: string; confidence: string }[],
    });

    const sourceDocuments = documents.map((d) => ({ id: d.id, title: d.title }));

    await supabase.from('meetings').update({ current_stage: stageResult.stage }).eq('id', meetingId);

    const rowsToInsert = [
      {
        meeting_id: meetingId,
        type: 'stage' as const,
        stage: stageResult.stage,
        content: stageResult.reasoning || '',
        confidence: 'inferred' as const,
        source_documents: [],
      },
      {
        meeting_id: meetingId,
        type: 'script' as const,
        stage: stageResult.stage,
        headline: suggestionResult.script?.headline || null,
        content: suggestionResult.script?.content || '',
        reasoning: suggestionResult.script?.reasoning || null,
        confidence: suggestionResult.script?.confidence || 'unknown',
        source_documents: sourceDocuments,
      },
      ...((suggestionResult.alerts || []).map((a) => ({
        meeting_id: meetingId,
        type: 'alert' as const,
        stage: stageResult.stage,
        headline: a.headline,
        content: a.content,
        confidence: (a.confidence as 'confirmed' | 'inferred' | 'unknown') || 'unknown',
        source_documents: sourceDocuments,
      }))),
    ];

    const { data: inserted } = await supabase.from('ai_suggestions').insert(rowsToInsert).select('*');

    return NextResponse.json({ stage: stageResult.stage, suggestions: inserted || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'AI request failed' }, { status: 502 });
  }
}
