import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { DocumentForm } from '@/components/knowledge/DocumentForm';

export default async function NewDocumentPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: business } = await supabase.from('businesses').select('id, name').eq('id', params.id).single();
  if (!business) notFound();

  return (
    <div>
      <Link href={`/businesses/${business.id}/knowledge`} className="inline-flex items-center gap-1.5 text-sm text-offwhite/50 hover:text-offwhite mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Knowledge base
      </Link>
      <h1 className="text-xl font-semibold text-offwhite mb-6">New document</h1>
      <DocumentForm businessId={business.id} ownerId={user.id} />
    </div>
  );
}
