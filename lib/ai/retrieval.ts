import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, KnowledgeDocument } from '@/lib/types/database';

export interface RetrievedDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  status: KnowledgeDocument['status'];
}

/**
 * Retrieves the knowledge documents most relevant to `query`, scoped
 * strictly to `businessId` (Section 7, Rule 1 — Business Isolation).
 *
 * Implementation: Postgres full-text search (tsvector/tsquery) against the
 * generated `search` column on knowledge_documents, which already indexes
 * title + content. This is intentionally lexical rather than embedding-based
 * for V1 — it needs no extra infrastructure, costs nothing beyond Postgres,
 * and is accurate enough for a founder-curated knowledge base. If the
 * knowledge base grows large enough that semantic recall matters more than
 * keyword recall, swap the query below for a pgvector similarity search
 * without changing this function's signature or any call site.
 *
 * Row Level Security still applies on top of this filter — a caller can
 * never retrieve documents from a business they are not a member of, even
 * if businessId were spoofed, because the underlying Supabase client is the
 * authenticated user's session client.
 */
export async function retrieveRelevantDocuments(
  supabase: SupabaseClient<Database>,
  businessId: string,
  query: string,
  limit = 5
): Promise<RetrievedDocument[]> {
  const cleanedQuery = sanitizeForTsQuery(query);

  if (!cleanedQuery) {
    return fallbackRecentDocuments(supabase, businessId, limit);
  }

  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('id, title, category, content, status')
    .eq('business_id', businessId)
    .neq('status', 'outdated')
    .textSearch('search', cleanedQuery, { type: 'websearch', config: 'english' })
    .limit(limit);

  if (error || !data || data.length === 0) {
    return fallbackRecentDocuments(supabase, businessId, limit);
  }

  return data as RetrievedDocument[];
}

/** If full-text search finds nothing, fall back to the most recently
 * approved/updated documents so the AI still has *some* grounded context
 * rather than none. */
async function fallbackRecentDocuments(
  supabase: SupabaseClient<Database>,
  businessId: string,
  limit: number
): Promise<RetrievedDocument[]> {
  const { data } = await supabase
    .from('knowledge_documents')
    .select('id, title, category, content, status')
    .eq('business_id', businessId)
    .neq('status', 'outdated')
    .order('updated_at', { ascending: false })
    .limit(limit);

  return (data as RetrievedDocument[]) || [];
}

/** websearch_to_tsquery is fairly tolerant, but strip characters that can
 * otherwise produce a malformed query. */
function sanitizeForTsQuery(input: string): string {
  return input
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .slice(0, 300);
}
