import Link from 'next/link';
import { Plus, Building2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, EmptyState, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default async function BusinessesPage() {
  const supabase = createClient();
  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-offwhite">Businesses</h1>
          <p className="text-sm text-offwhite/50 mt-1">Every business profile the AI can represent.</p>
        </div>
        <Link href="/businesses/new">
          <Button>
            <Plus className="w-4 h-4" /> New business
          </Button>
        </Link>
      </div>

      {!businesses || businesses.length === 0 ? (
        <EmptyState
          title="No businesses yet"
          description="Create your first business profile — its identity, knowledge base and brand voice are what the AI uses to represent it in every meeting."
          action={
            <Link href="/businesses/new">
              <Button>
                <Plus className="w-4 h-4" /> Create a business
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {businesses.map((b) => (
            <Link key={b.id} href={`/businesses/${b.id}`}>
              <Card className="h-full hover:border-lime/40 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-forest/20 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-lime" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-offwhite/20 group-hover:text-lime transition-colors" />
                </div>
                <p className="mt-4 font-medium text-offwhite">{b.name}</p>
                {b.industry && <p className="text-sm text-offwhite/50 mt-0.5">{b.industry}</p>}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {b.stage && <Badge variant="outline">{b.stage}</Badge>}
                  {Array.isArray(b.products_services) && b.products_services.length > 0 && (
                    <Badge variant="lime">{b.products_services.length} product{b.products_services.length === 1 ? '' : 's'}</Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
