'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Rocket } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea, Select } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { MEETING_TYPE_OPTIONS, type Business } from '@/lib/types/database';
import { useActiveBusiness } from '@/lib/store/activeBusiness';

export function MeetingSetupForm({ businesses, userId }: { businesses: Pick<Business, 'id' | 'name'>[]; userId: string }) {
  const router = useRouter();
  const { activeBusinessId, setActiveBusinessId } = useActiveBusiness();

  const [businessId, setBusinessId] = useState(
    (activeBusinessId && businesses.some((b) => b.id === activeBusinessId) ? activeBusinessId : businesses[0]?.id) || ''
  );
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactLinkedin, setContactLinkedin] = useState('');
  const [contactWebsite, setContactWebsite] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [objective, setObjective] = useState('');
  const [preContext, setPreContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (businessId) setActiveBusinessId(businessId);
  }, [businessId, setActiveBusinessId]);

  function toggleType(type: string) {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) {
      setError('Select a business to represent in this meeting.');
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    let contactId: string | null = null;

    if (contactName.trim() || contactEmail.trim()) {
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          business_id: businessId,
          name: contactName || null,
          company: companyName || null,
          email: contactEmail || null,
          phone: contactPhone || null,
          linkedin: contactLinkedin || null,
          website: contactWebsite || null,
          notes: companyDescription || null,
        })
        .select('id')
        .single();

      if (contactError) {
        setSaving(false);
        setError(contactError.message);
        return;
      }
      contactId = contact.id;
    }

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        business_id: businessId,
        contact_id: contactId,
        company_name: companyName || null,
        meeting_types: selectedTypes,
        objective: objective || null,
        pre_context: preContext || null,
        status: 'setup',
        created_by: userId,
      })
      .select('id')
      .single();

    setSaving(false);

    if (meetingError) {
      setError(meetingError.message);
      return;
    }

    router.push(`/meetings/${meeting.id}/live`);
  }

  if (businesses.length === 0) {
    return (
      <Card>
        <p className="text-sm text-offwhite/70">
          You need at least one business profile before you can set up a meeting.{' '}
          <a href="/businesses/new" className="text-lime hover:underline">
            Create one now
          </a>
          .
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="space-y-4">
        <div>
          <Label htmlFor="business">Business *</Label>
          <Select id="business" required value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="companyName">Company / organisation being engaged</Label>
            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contactName">Contact person (optional)</Label>
            <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactEmail">Email</Label>
            <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contactPhone">Phone</Label>
            <Input id="contactPhone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contactLinkedin">LinkedIn</Label>
            <Input id="contactLinkedin" value={contactLinkedin} onChange={(e) => setContactLinkedin(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contactWebsite">Website</Label>
            <Input id="contactWebsite" value={contactWebsite} onChange={(e) => setContactWebsite(e.target.value)} />
          </div>
        </div>

        <div>
          <Label htmlFor="companyDescription">Company description</Label>
          <Textarea id="companyDescription" value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} />
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <Label>Meeting purpose (select all that apply)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {MEETING_TYPE_OPTIONS.map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => toggleType(type)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  selectedTypes.includes(type)
                    ? 'bg-lime/15 border-lime/40 text-lime'
                    : 'border-white/10 text-offwhite/60 hover:border-white/25'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="objective">Meeting objective</Label>
          <Textarea
            id="objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="What are you trying to achieve from this conversation?"
          />
        </div>

        <div>
          <Label htmlFor="preContext">Pre-context / previous knowledge (optional)</Label>
          <Textarea
            id="preContext"
            value={preContext}
            onChange={(e) => setPreContext(e.target.value)}
            placeholder="Anything the AI needs to know before the conversation begins — previous emails, calls, or context from outside the platform."
          />
        </div>
      </Card>

      {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" loading={saving} size="lg">
          <Rocket className="w-4 h-4" /> Start meeting
        </Button>
      </div>
    </form>
  );
}
