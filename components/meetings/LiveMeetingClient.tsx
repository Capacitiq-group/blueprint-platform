'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Send, Sparkles, Square, AlertTriangle, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { Card, Badge } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { AiSuggestion, Business, Meeting, TranscriptEntry } from '@/lib/types/database';

const confidenceVariant: Record<string, 'lime' | 'warning' | 'default'> = {
  confirmed: 'lime',
  inferred: 'warning',
  unknown: 'default',
};

export function LiveMeetingClient({
  meeting: initialMeeting,
  business,
  initialTranscript,
  initialSuggestions,
}: {
  meeting: Meeting;
  business: Business;
  initialTranscript: TranscriptEntry[];
  initialSuggestions: AiSuggestion[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [meeting, setMeeting] = useState(initialMeeting);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(initialTranscript);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>(initialSuggestions);
  const [speaker, setSpeaker] = useState<'user' | 'other'>('user');
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [manualEntry, setManualEntry] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const speakerRef = useRef(speaker);
  speakerRef.current = speaker;

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    // Ensure the meeting is marked live and has a started_at timestamp.
    if (meeting.status === 'setup') {
      supabase
        .from('meetings')
        .update({ status: 'live', started_at: new Date().toISOString() })
        .eq('id', meeting.id)
        .then();
      setMeeting((m) => ({ ...m, status: 'live' }));
    }

    const SpeechRecognition =
      typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const text = result[0].transcript.trim();
        if (text) addTranscriptEntry(text, speakerRef.current);
      }
    };

    recognition.onerror = () => {
      // Non-fatal — recognition can throw on brief silence in some browsers.
    };

    recognition.onend = () => {
      // Auto-restart while the operator intends to keep listening.
      if (recognitionRef.current?.__shouldListen) {
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.__shouldListen = false;
      recognition.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addTranscriptEntry(content: string, who: 'user' | 'other') {
    const optimistic: TranscriptEntry = {
      id: `temp-${Date.now()}`,
      meeting_id: meeting.id,
      speaker: who,
      content,
      is_final: true,
      spoken_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setTranscript((t) => [...t, optimistic]);

    const { data } = await supabase
      .from('meeting_transcript_entries')
      .insert({ meeting_id: meeting.id, speaker: who, content, is_final: true })
      .select('*')
      .single();

    if (data) {
      setTranscript((t) => t.map((entry) => (entry.id === optimistic.id ? data : entry)));
    }
  }

  function toggleListening() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.__shouldListen = false;
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.__shouldListen = true;
      try {
        recognitionRef.current.start();
      } catch {
        /* already started */
      }
      setListening(true);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualEntry.trim()) return;
    await addTranscriptEntry(manualEntry.trim(), speaker);
    setManualEntry('');
  }

  async function requestAiAssistance() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      setMeeting((m) => ({ ...m, current_stage: data.stage }));
      setSuggestions((s) => [...(data.suggestions || []), ...s]);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleEndMeeting() {
    if (!confirm('End this meeting? This will generate the post-meeting summary.')) return;
    setEnding(true);

    if (recognitionRef.current) {
      recognitionRef.current.__shouldListen = false;
      recognitionRef.current.stop();
    }

    await supabase.from('meetings').update({ ended_at: new Date().toISOString() }).eq('id', meeting.id);

    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate summary');
      }
    } catch (err) {
      // Even if summarization fails (e.g. empty transcript), still let the
      // operator reach the summary screen — it offers a manual regenerate.
    }

    router.push(`/meetings/${meeting.id}/summary`);
  }

  const scriptSuggestions = suggestions.filter((s) => s.type === 'script');
  const alertSuggestions = suggestions.filter((s) => s.type === 'alert');

  return (
    <div className="grid lg:grid-cols-[1fr,380px] gap-6">
      {/* Transcript column */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-offwhite">{meeting.company_name || 'Live meeting'}</h1>
            <p className="text-xs text-offwhite/40 mt-0.5">
              {business.name} · {(meeting.meeting_types || []).join(', ') || 'No type set'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {meeting.current_stage && <Badge variant="lime">{meeting.current_stage}</Badge>}
            <Button variant="danger" onClick={handleEndMeeting} loading={ending} size="sm">
              <Square className="w-3.5 h-3.5" /> End meeting
            </Button>
          </div>
        </div>

        <Card className="p-0 overflow-hidden flex flex-col h-[50vh] min-h-[340px]">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {transcript.length === 0 ? (
              <p className="text-sm text-offwhite/40 text-center py-10">
                Transcript will appear here as the conversation happens.
              </p>
            ) : (
              transcript.map((entry) => (
                <div key={entry.id} className={cn('flex flex-col', entry.speaker === 'user' ? 'items-end' : 'items-start')}>
                  <span className="text-[10px] uppercase tracking-wide text-offwhite/30 mb-1 px-1">
                    {entry.speaker === 'user' ? 'You' : entry.speaker === 'other' ? 'Other party' : 'Speaker'}
                  </span>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-xl px-3.5 py-2 text-sm leading-relaxed',
                      entry.speaker === 'user' ? 'bg-lime/10 text-offwhite' : 'bg-white/5 text-offwhite'
                    )}
                  >
                    {entry.content}
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>

          <div className="border-t border-white/8 p-3">
            {!speechSupported && (
              <p className="text-xs text-amber-400/90 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Voice capture isn&apos;t supported in this browser — type entries manually below.
              </p>
            )}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-offwhite/40">Speaking now:</span>
              <button
                type="button"
                onClick={() => setSpeaker('user')}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full border',
                  speaker === 'user' ? 'bg-lime/15 border-lime/40 text-lime' : 'border-white/10 text-offwhite/50'
                )}
              >
                You
              </button>
              <button
                type="button"
                onClick={() => setSpeaker('other')}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full border',
                  speaker === 'other' ? 'bg-lime/15 border-lime/40 text-lime' : 'border-white/10 text-offwhite/50'
                )}
              >
                Other party
              </button>
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={cn(
                    'ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors',
                    listening ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'border-white/10 text-offwhite/60 hover:border-lime/40'
                  )}
                >
                  {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {listening ? 'Stop listening' : 'Start listening'}
                </button>
              )}
            </div>
            <form onSubmit={handleManualSubmit} className="flex items-end gap-2">
              <Textarea
                value={manualEntry}
                onChange={(e) => setManualEntry(e.target.value)}
                placeholder="Type what was said…"
                className="min-h-[42px] py-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleManualSubmit(e as any);
                  }
                }}
              />
              <Button type="submit" size="md" variant="secondary">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* AI co-pilot column */}
      <div className="space-y-4">
        <Button onClick={requestAiAssistance} loading={aiLoading} className="w-full">
          <Sparkles className="w-4 h-4" /> Get AI assistance
        </Button>
        {aiError && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{aiError}</p>}

        {alertSuggestions.length > 0 && (
          <div className="space-y-2">
            {alertSuggestions.slice(0, 4).map((a) => (
              <Card key={a.id} className="border-amber-500/20 bg-amber-500/5 py-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    {a.headline && <p className="text-xs font-medium text-amber-400">{a.headline}</p>}
                    <p className="text-xs text-offwhite/70 mt-0.5">{a.content}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-offwhite/50 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Live script
          </p>
          <div className="space-y-3">
            {scriptSuggestions.length === 0 ? (
              <Card>
                <p className="text-sm text-offwhite/40">
                  Tap &quot;Get AI assistance&quot; any time — it reads the transcript so far plus {business.name}&apos;s knowledge
                  base and suggests what to say next.
                </p>
              </Card>
            ) : (
              scriptSuggestions.map((s) => (
                <Card key={s.id}>
                  <div className="flex items-center justify-between mb-2">
                    {s.stage && <Badge variant="outline">{s.stage}</Badge>}
                    <Badge variant={confidenceVariant[s.confidence]}>{s.confidence}</Badge>
                  </div>
                  {s.headline && <p className="text-sm font-medium text-offwhite mb-1">{s.headline}</p>}
                  <p className="text-sm text-offwhite/80 leading-relaxed">{s.content}</p>
                  {s.reasoning && <p className="text-xs text-offwhite/40 mt-2 italic">{s.reasoning}</p>}
                  {s.source_documents?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {s.source_documents.map((d) => (
                        <Badge key={d.id} variant="outline">
                          {d.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
