'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea, Select } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { KNOWLEDGE_CATEGORIES, type KnowledgeDocument } from '@/lib/types/database';

export function DocumentForm({
  businessId,
  ownerId,
  document,
}: {
  businessId: string;
  ownerId: string;
  document?: KnowledgeDocument;
}) {
  const router = useRouter();
  const isEdit = !!document;
  const [title, setTitle] = useState(document?.title || '');
  const [category, setCategory] = useState(document?.category || 'general');
  const [status, setStatus] = useState(document?.status || 'draft');
  const [content, setContent] = useState(document?.content || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();

    if (isEdit) {
      const { error: updateError } = await supabase
        .from('knowledge_documents')
        .update({ title, category, status, content, version: (document!.version || 1) + 1 })
        .eq('id', document!.id);
      setSaving(false);
      if (updateError) return setError(updateError.message);
      router.refresh();
    } else {
      const { error: insertError } = await supabase.from('knowledge_documents').insert({
        business_id: businessId,
        owner_id: ownerId,
        title,
        category,
        status,
        content,
      });
      setSaving(false);
      if (insertError) return setError(insertError.message);
      router.push(`/businesses/${businessId}/knowledge`);
    }
  }

  async function handleDelete() {
    if (!document) return;
    if (!confirm('Delete this document permanently?')) return;
    setDeleting(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('knowledge_documents').delete().eq('id', document.id);
    setDeleting(false);
    if (deleteError) return setError(deleteError.message);
    router.push(`/businesses/${businessId}/knowledge`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <Label htmlFor="category">Category</Label>
            <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {KNOWLEDGE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-1">
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="outdated">Outdated</option>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Growth Package Pricing" />
        </div>
        <div>
          <Label htmlFor="content">Content (Markdown)</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[360px] font-mono text-[13px] leading-relaxed"
            placeholder={'# Heading\n\nWrite in Markdown. This is exactly what the AI will retrieve and read when relevant to a conversation.'}
          />
        </div>
      </Card>

      {error && <p className="mt-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

      <div className="mt-6 flex justify-between">
        {isEdit ? (
          <Button type="button" variant="danger" onClick={handleDelete} loading={deleting}>
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" loading={saving}>
          <Save className="w-4 h-4" /> {isEdit ? 'Save changes' : 'Create document'}
        </Button>
      </div>
    </form>
  );
}
