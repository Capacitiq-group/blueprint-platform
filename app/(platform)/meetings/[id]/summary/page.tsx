import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SummaryView } from '@/components/meetings/SummaryView';

export default async function MeetingSummaryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: meeting } = await supabase.from('meetings').select('*').eq('id', params.id).single();
  if (!meeting) notFound();

  const { data: business } = await supabase.from('businesses').select('*').eq('id', meeting.business_id).single();
  if (!business) notFound();

  const { data: summary } = await supabase.from('meeting_summaries').select('*').eq('meeting_id', meeting.id).maybeSingle();

  return <SummaryView meeting={meeting} business={business} summary={summary} />;
}
