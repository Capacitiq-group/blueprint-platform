'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import type { Business, ProductServiceItem } from '@/lib/types/database';

type FormState = {
  name: string;
  legal_name: string;
  trading_name: string;
  website: string;
  industry: string;
  location: string;
  description: string;
  stage: string;
  target_market: string;
  products_services: ProductServiceItem[];
  positioning: {
    value_proposition: string;
    unique_selling_points: string;
    competitive_positioning: string;
    ideal_customer_profile: string;
    target_industries: string;
    pain_points: string;
    differentiators: string;
  };
  commercial: {
    pricing_rules: string;
    discount_rules: string;
    negotiation_boundaries: string;
    payment_terms: string;
    contract_information: string;
    sales_policies: string;
    approval_requirements: string;
  };
  operations: {
    internal_processes: string;
    sops: string;
    escalation_procedures: string;
    delivery_procedures: string;
    onboarding_procedures: string;
    offboarding_procedures: string;
    internal_responsibilities: string;
  };
  brand_voice: {
    tone: string;
    style: string;
    behaviour: string;
    words_to_use: string;
    words_to_avoid: string;
  };
};

function toCsv(arr?: string[]) {
  return arr?.join(', ') || '';
}
function fromCsv(str: string): string[] {
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function emptyState(): FormState {
  return {
    name: '',
    legal_name: '',
    trading_name: '',
    website: '',
    industry: '',
    location: '',
    description: '',
    stage: '',
    target_market: '',
    products_services: [],
    positioning: {
      value_proposition: '',
      unique_selling_points: '',
      competitive_positioning: '',
      ideal_customer_profile: '',
      target_industries: '',
      pain_points: '',
      differentiators: '',
    },
    commercial: {
      pricing_rules: '',
      discount_rules: '',
      negotiation_boundaries: '',
      payment_terms: '',
      contract_information: '',
      sales_policies: '',
      approval_requirements: '',
    },
    operations: {
      internal_processes: '',
      sops: '',
      escalation_procedures: '',
      delivery_procedures: '',
      onboarding_procedures: '',
      offboarding_procedures: '',
      internal_responsibilities: '',
    },
    brand_voice: {
      tone: '',
      style: '',
      behaviour: '',
      words_to_use: '',
      words_to_avoid: '',
    },
  };
}

function stateFromBusiness(b: Business): FormState {
  return {
    name: b.name || '',
    legal_name: b.legal_name || '',
    trading_name: b.trading_name || '',
    website: b.website || '',
    industry: b.industry || '',
    location: b.location || '',
    description: b.description || '',
    stage: b.stage || '',
    target_market: b.target_market || '',
    products_services: b.products_services?.length ? b.products_services : [],
    positioning: {
      value_proposition: b.positioning?.value_proposition || '',
      unique_selling_points: toCsv(b.positioning?.unique_selling_points),
      competitive_positioning: b.positioning?.competitive_positioning || '',
      ideal_customer_profile: b.positioning?.ideal_customer_profile || '',
      target_industries: toCsv(b.positioning?.target_industries),
      pain_points: toCsv(b.positioning?.pain_points),
      differentiators: toCsv(b.positioning?.differentiators),
    },
    commercial: {
      pricing_rules: b.commercial?.pricing_rules || '',
      discount_rules: b.commercial?.discount_rules || '',
      negotiation_boundaries: b.commercial?.negotiation_boundaries || '',
      payment_terms: b.commercial?.payment_terms || '',
      contract_information: b.commercial?.contract_information || '',
      sales_policies: b.commercial?.sales_policies || '',
      approval_requirements: b.commercial?.approval_requirements || '',
    },
    operations: {
      internal_processes: b.operations?.internal_processes || '',
      sops: b.operations?.sops || '',
      escalation_procedures: b.operations?.escalation_procedures || '',
      delivery_procedures: b.operations?.delivery_procedures || '',
      onboarding_procedures: b.operations?.onboarding_procedures || '',
      offboarding_procedures: b.operations?.offboarding_procedures || '',
      internal_responsibilities: b.operations?.internal_responsibilities || '',
    },
    brand_voice: {
      tone: toCsv(b.brand_voice?.tone),
      style: toCsv(b.brand_voice?.style),
      behaviour: toCsv(b.brand_voice?.behaviour),
      words_to_use: b.brand_voice?.words_to_use || '',
      words_to_avoid: b.brand_voice?.words_to_avoid || '',
    },
  };
}

const SECTIONS = ['Identity', 'Products & Services', 'Positioning', 'Commercial', 'Operations', 'Brand Voice'] as const;

export function BusinessForm({ business, ownerId }: { business?: Business; ownerId: string }) {
  const router = useRouter();
  const isEdit = !!business;
  const [form, setForm] = useState<FormState>(business ? stateFromBusiness(business) : emptyState());
  const [section, setSection] = useState<(typeof SECTIONS)[number]>('Identity');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateProduct(index: number, patch: Partial<ProductServiceItem>) {
    setForm((f) => {
      const next = [...f.products_services];
      next[index] = { ...next[index], ...patch };
      return { ...f, products_services: next };
    });
  }

  function addProduct() {
    setForm((f) => ({
      ...f,
      products_services: [...f.products_services, { name: '', description: '', pricing: '' }],
    }));
  }

  function removeProduct(index: number) {
    setForm((f) => ({ ...f, products_services: f.products_services.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Business name is required.');
      setSection('Identity');
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();

    const payload = {
      name: form.name.trim(),
      legal_name: form.legal_name || null,
      trading_name: form.trading_name || null,
      website: form.website || null,
      industry: form.industry || null,
      location: form.location || null,
      description: form.description || null,
      stage: form.stage || null,
      target_market: form.target_market || null,
      products_services: form.products_services.filter((p) => p.name.trim()),
      positioning: {
        value_proposition: form.positioning.value_proposition || undefined,
        unique_selling_points: fromCsv(form.positioning.unique_selling_points),
        competitive_positioning: form.positioning.competitive_positioning || undefined,
        ideal_customer_profile: form.positioning.ideal_customer_profile || undefined,
        target_industries: fromCsv(form.positioning.target_industries),
        pain_points: fromCsv(form.positioning.pain_points),
        differentiators: fromCsv(form.positioning.differentiators),
      },
      commercial: { ...form.commercial },
      operations: { ...form.operations },
      brand_voice: {
        tone: fromCsv(form.brand_voice.tone),
        style: fromCsv(form.brand_voice.style),
        behaviour: fromCsv(form.brand_voice.behaviour),
        words_to_use: form.brand_voice.words_to_use || undefined,
        words_to_avoid: form.brand_voice.words_to_avoid || undefined,
      },
    };

    if (isEdit) {
      const { error: updateError } = await supabase.from('businesses').update(payload).eq('id', business!.id);
      setSaving(false);
      if (updateError) return setError(updateError.message);
      router.refresh();
    } else {
      const { data, error: insertError } = await supabase
        .from('businesses')
        .insert({ ...payload, owner_id: ownerId })
        .select('id')
        .single();
      setSaving(false);
      if (insertError) return setError(insertError.message);
      router.push(`/businesses/${data.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 -mx-1 px-1">
        {SECTIONS.map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => setSection(s)}
            className={`shrink-0 px-3.5 py-2 rounded-lg text-sm transition-colors ${
              section === s ? 'bg-lime/15 text-lime font-medium' : 'text-offwhite/50 hover:text-offwhite hover:bg-white/5'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {section === 'Identity' && (
        <Card className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Business name *</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="trading_name">Trading name</Label>
              <Input id="trading_name" value={form.trading_name} onChange={(e) => setForm({ ...form, trading_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="legal_name">Legal name</Label>
              <Input id="legal_name" value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="stage">Business stage</Label>
              <Input id="stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} placeholder="e.g. Early, Growth" />
            </div>
            <div>
              <Label htmlFor="target_market">Target market</Label>
              <Input id="target_market" value={form.target_market} onChange={(e) => setForm({ ...form, target_market: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </Card>
      )}

      {section === 'Products & Services' && (
        <div className="space-y-4">
          {form.products_services.map((p, i) => (
            <Card key={i} className="space-y-3">
              <div className="flex justify-between items-start gap-3">
                <div className="grid sm:grid-cols-2 gap-3 flex-1">
                  <div>
                    <Label>Name</Label>
                    <Input value={p.name} onChange={(e) => updateProduct(i, { name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Pricing</Label>
                    <Input value={p.pricing || ''} onChange={(e) => updateProduct(i, { pricing: e.target.value })} />
                  </div>
                </div>
                <button type="button" onClick={() => removeProduct(i)} className="text-offwhite/30 hover:text-red-400 mt-6">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={p.description || ''} onChange={(e) => updateProduct(i, { description: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Features (comma separated)</Label>
                  <Input value={toCsv(p.features)} onChange={(e) => updateProduct(i, { features: fromCsv(e.target.value) })} />
                </div>
                <div>
                  <Label>Benefits (comma separated)</Label>
                  <Input value={toCsv(p.benefits)} onChange={(e) => updateProduct(i, { benefits: fromCsv(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Limitations</Label>
                <Input value={p.limitations || ''} onChange={(e) => updateProduct(i, { limitations: e.target.value })} />
              </div>
            </Card>
          ))}
          <Button type="button" variant="secondary" onClick={addProduct}>
            <Plus className="w-4 h-4" /> Add product or service
          </Button>
        </div>
      )}

      {section === 'Positioning' && (
        <Card className="space-y-4">
          <div>
            <Label>Value proposition</Label>
            <Textarea
              value={form.positioning.value_proposition}
              onChange={(e) => setForm({ ...form, positioning: { ...form.positioning, value_proposition: e.target.value } })}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Unique selling points (comma separated)</Label>
              <Input
                value={form.positioning.unique_selling_points}
                onChange={(e) => setForm({ ...form, positioning: { ...form.positioning, unique_selling_points: e.target.value } })}
              />
            </div>
            <div>
              <Label>Target industries (comma separated)</Label>
              <Input
                value={form.positioning.target_industries}
                onChange={(e) => setForm({ ...form, positioning: { ...form.positioning, target_industries: e.target.value } })}
              />
            </div>
          </div>
          <div>
            <Label>Competitive positioning</Label>
            <Textarea
              value={form.positioning.competitive_positioning}
              onChange={(e) => setForm({ ...form, positioning: { ...form.positioning, competitive_positioning: e.target.value } })}
            />
          </div>
          <div>
            <Label>Ideal customer profile</Label>
            <Textarea
              value={form.positioning.ideal_customer_profile}
              onChange={(e) => setForm({ ...form, positioning: { ...form.positioning, ideal_customer_profile: e.target.value } })}
            />
          </div>
          <div>
            <Label>Customer pain points (comma separated)</Label>
            <Input
              value={form.positioning.pain_points}
              onChange={(e) => setForm({ ...form, positioning: { ...form.positioning, pain_points: e.target.value } })}
            />
          </div>
          <div>
            <Label>Differentiators (comma separated)</Label>
            <Input
              value={form.positioning.differentiators}
              onChange={(e) => setForm({ ...form, positioning: { ...form.positioning, differentiators: e.target.value } })}
            />
          </div>
        </Card>
      )}

      {section === 'Commercial' && (
        <Card className="space-y-4">
          {(
            [
              ['pricing_rules', 'Pricing rules'],
              ['discount_rules', 'Discount rules'],
              ['negotiation_boundaries', 'Negotiation boundaries'],
              ['payment_terms', 'Payment terms'],
              ['contract_information', 'Contract information'],
              ['sales_policies', 'Sales policies'],
              ['approval_requirements', 'Approval requirements'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <Label>{label}</Label>
              <Textarea
                value={form.commercial[key]}
                onChange={(e) => setForm({ ...form, commercial: { ...form.commercial, [key]: e.target.value } })}
              />
            </div>
          ))}
        </Card>
      )}

      {section === 'Operations' && (
        <Card className="space-y-4">
          {(
            [
              ['internal_processes', 'Internal processes'],
              ['sops', 'SOPs'],
              ['escalation_procedures', 'Escalation procedures'],
              ['delivery_procedures', 'Delivery procedures'],
              ['onboarding_procedures', 'Client onboarding procedures'],
              ['offboarding_procedures', 'Client offboarding procedures'],
              ['internal_responsibilities', 'Internal responsibilities'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <Label>{label}</Label>
              <Textarea
                value={form.operations[key]}
                onChange={(e) => setForm({ ...form, operations: { ...form.operations, [key]: e.target.value } })}
              />
            </div>
          ))}
        </Card>
      )}

      {section === 'Brand Voice' && (
        <Card className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Tone (comma separated)</Label>
              <Input
                placeholder="Professional, Direct, Warm"
                value={form.brand_voice.tone}
                onChange={(e) => setForm({ ...form, brand_voice: { ...form.brand_voice, tone: e.target.value } })}
              />
            </div>
            <div>
              <Label>Style (comma separated)</Label>
              <Input
                placeholder="Concise, Conversational"
                value={form.brand_voice.style}
                onChange={(e) => setForm({ ...form, brand_voice: { ...form.brand_voice, style: e.target.value } })}
              />
            </div>
            <div>
              <Label>Behaviour rules (comma separated)</Label>
              <Input
                placeholder="Never aggressive, Ask before recommending"
                value={form.brand_voice.behaviour}
                onChange={(e) => setForm({ ...form, brand_voice: { ...form.brand_voice, behaviour: e.target.value } })}
              />
            </div>
          </div>
          <div>
            <Label>Words / phrases to use</Label>
            <Textarea
              value={form.brand_voice.words_to_use}
              onChange={(e) => setForm({ ...form, brand_voice: { ...form.brand_voice, words_to_use: e.target.value } })}
            />
          </div>
          <div>
            <Label>Words / phrases to avoid</Label>
            <Textarea
              value={form.brand_voice.words_to_avoid}
              onChange={(e) => setForm({ ...form, brand_voice: { ...form.brand_voice, words_to_avoid: e.target.value } })}
            />
          </div>
        </Card>
      )}

      {error && <p className="mt-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

      <div className="mt-6 flex justify-end">
        <Button type="submit" loading={saving}>
          <Save className="w-4 h-4" /> {isEdit ? 'Save changes' : 'Create business'}
        </Button>
      </div>
    </form>
  );
}
