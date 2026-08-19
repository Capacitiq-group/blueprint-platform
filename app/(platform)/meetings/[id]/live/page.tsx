import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LiveMeetingClient } from '@/components/meetings/LiveMeetingClient';

export default async function LiveMeetingPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: meeting } = await supabase.from('meetings').select('*').eq('id', params.id).single();
  if (!meeting) notFound();

  if (meeting.status === 'completed') {
    redirect(`/meetings/${meeting.id}/summary`);
  }

  const { data: business } = await supabase.from('businesses').select('*').eq('id', meeting.business_id).single();
  if (!business) notFound();

  const { data: transcript } = await supabase
    .from('meeting_transcript_entries')
    .select('*')
    .eq('meeting_id', meeting.id)
    .order('spoken_at', { ascending: true });

  const { data: suggestions } = await supabase
    .from('ai_suggestions')
    .select('*')
    .eq('meeting_id', meeting.id)
    .order('created_at', { ascending: false });

  return (
    <LiveMeetingClient
      meeting={meeting}
      business={business}
      initialTranscript={transcript || []}
      initialSuggestions={suggestions || []}
    />
  );
}
