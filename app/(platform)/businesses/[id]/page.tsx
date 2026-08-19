import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BookOpen, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { BusinessForm } from '@/components/businesses/BusinessForm';
import { Card } from '@/components/ui/Card';

export default async function BusinessDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: business } = await supabase.from('businesses').select('*').eq('id', params.id).single();
  if (!business) notFound();

  const { count: docCount } = await supabase
    .from('knowledge_documents')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', business.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-offwhite">{business.name}</h1>
        <p className="text-sm text-offwhite/50 mt-1">Business profile — the AI&apos;s source of truth for this business.</p>
      </div>

      <Link href={`/businesses/${business.id}/knowledge`} className="block mb-8">
        <Card className="flex items-center justify-between hover:border-lime/40 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-forest/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-lime" />
            </div>
            <div>
              <p className="font-medium text-offwhite text-sm">Knowledge base</p>
              <p className="text-xs text-offwhite/50">{docCount || 0} document{docCount === 1 ? '' : 's'}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-offwhite/20 group-hover:text-lime transition-colors" />
        </Card>
      </Link>

      <BusinessForm business={business} ownerId={user.id} />
    </div>
  );
}
