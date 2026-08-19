import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Plus, FileText, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, EmptyState, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'lime' | 'warning' | 'danger'> = {
  approved: 'lime',
  draft: 'warning',
  outdated: 'danger',
};

export default async function KnowledgeBasePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: business } = await supabase.from('businesses').select('id, name').eq('id', params.id).single();
  if (!business) notFound();

  let query = supabase
    .from('knowledge_documents')
    .select('id, title, category, status, updated_at')
    .eq('business_id', business.id)
    .order('updated_at', { ascending: false });

  if (searchParams.q) {
    query = query.textSearch('search', searchParams.q, { type: 'websearch', config: 'english' });
  }

  const { data: documents } = await query;

  return (
    <div>
      <Link href={`/businesses/${business.id}`} className="inline-flex items-center gap-1.5 text-sm text-offwhite/50 hover:text-offwhite mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> {business.name}
      </Link>

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-offwhite">Knowledge base</h1>
          <p className="text-sm text-offwhite/50 mt-1">Isolated to {business.name} only.</p>
        </div>
        <Link href={`/businesses/${business.id}/knowledge/new`}>
          <Button>
            <Plus className="w-4 h-4" /> New document
          </Button>
        </Link>
      </div>

      <form className="mb-6">
        <Input name="q" defaultValue={searchParams.q} placeholder="Search this business's knowledge base…" />
      </form>

      {!documents || documents.length === 0 ? (
        <EmptyState
          title={searchParams.q ? 'No matching documents' : 'No documents yet'}
          description={
            searchParams.q
              ? 'Try a different search term.'
              : 'Add company, product, pricing, policy and process documents. The AI will only ever draw from this business\u2019s own documents.'
          }
          action={
            !searchParams.q && (
              <Link href={`/businesses/${business.id}/knowledge/new`}>
                <Button>
                  <Plus className="w-4 h-4" /> Add first document
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-2.5">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/businesses/${business.id}/knowledge/${doc.id}`}>
              <Card className="flex items-center justify-between hover:border-lime/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-offwhite/30 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-offwhite truncate">{doc.title}</p>
                    <p className="text-xs text-offwhite/40 mt-0.5">Updated {formatDate(doc.updated_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Badge variant="outline">{doc.category}</Badge>
                  <Badge variant={statusVariant[doc.status] || 'default'}>{doc.status}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
