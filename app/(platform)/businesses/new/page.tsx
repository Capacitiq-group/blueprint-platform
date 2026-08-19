import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BusinessForm } from '@/components/businesses/BusinessForm';

export default async function NewBusinessPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div>
      <h1 className="text-xl font-semibold text-offwhite mb-1">New business</h1>
      <p className="text-sm text-offwhite/50 mb-8">
        This profile becomes the AI&apos;s source of truth whenever this business is selected for a meeting.
      </p>
      <BusinessForm ownerId={user.id} />
    </div>
  );
}
