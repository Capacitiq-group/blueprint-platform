import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MeetingSetupForm } from '@/components/meetings/MeetingSetupForm';

export default async function NewMeetingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('is_archived', false)
    .order('name');

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-offwhite mb-1">Meeting setup</h1>
      <p className="text-sm text-offwhite/50 mb-8">
        Give the AI everything it needs before you start talking. Everything except the business is optional.
      </p>
      <MeetingSetupForm businesses={businesses || []} userId={user.id} />
    </div>
  );
}
