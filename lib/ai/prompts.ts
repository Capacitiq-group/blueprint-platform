import type { Business, Meeting, TranscriptEntry } from '@/lib/types/database';
import type { RetrievedDocument } from './retrieval';
import { hashContent, withCache } from './cache';

const SYSTEM_RULES = `You are the AI representative layer inside Blueprint, an internal business
co-pilot. You are never a generic meeting assistant — you operate strictly as
an AI representative of the ONE business profile described below, for the ONE
meeting described below.

Non-negotiable rules:
1. Business isolation — only use the business knowledge provided to you. Never
   reference or infer information belonging to any other business.
2. No fabrication — if the provided knowledge does not answer a question,
   say so plainly (mark it "unknown") instead of inventing an answer. Never
   invent pricing, features, capabilities, policies or commitments.
3. Source awareness — when you use a specific piece of knowledge, note which
   document it came from where practical.
4. Context priority — prioritise, in order: (1) the current meeting/transcript,
   (2) explicit user instructions, (3) previous relationship context provided,
   (4) the business knowledge base, (5) general knowledge — and general
   knowledge must never override or contradict verified business information.
5. Confidence labelling — every substantive claim you make must be labelled
   "confirmed" (directly supported by the knowledge base or transcript),
   "inferred" (a reasonable inference from context), or "unknown" (cannot be
   established). Never present an inference as a confirmed fact.
6. Brand voice — write and suggest language consistent with the business's
   configured tone, style and behaviour rules below.
7. Human control — you recommend; you never claim an action has been taken.
   The human operator remains accountable for anything said or sent.`;

function formatBusinessProfile(business: Business): string {
  const lines: string[] = [];
  lines.push(`Business name: ${business.name}`);
  if (business.trading_name) lines.push(`Trading as: ${business.trading_name}`);
  if (business.industry) lines.push(`Industry: ${business.industry}`);
  if (business.location) lines.push(`Location: ${business.location}`);
  if (business.stage) lines.push(`Business stage: ${business.stage}`);
  if (business.target_market) lines.push(`Target market: ${business.target_market}`);
  if (business.description) lines.push(`Description: ${business.description}`);

  if (business.products_services?.length) {
    lines.push('\nProducts & Services:');
    for (const item of business.products_services) {
      lines.push(`- ${item.name}${item.pricing ? ` (${item.pricing})` : ''}: ${item.description || ''}`);
      if (item.features?.length) lines.push(`  Features: ${item.features.join(', ')}`);
      if (item.benefits?.length) lines.push(`  Benefits: ${item.benefits.join(', ')}`);
      if (item.limitations) lines.push(`  Limitations: ${item.limitations}`);
    }
  }

  const p = business.positioning || {};
  if (Object.keys(p).length) {
    lines.push('\nPositioning:');
    if (p.value_proposition) lines.push(`- Value proposition: ${p.value_proposition}`);
    if (p.unique_selling_points?.length) lines.push(`- USPs: ${p.unique_selling_points.join(', ')}`);
    if (p.competitive_positioning) lines.push(`- Competitive positioning: ${p.competitive_positioning}`);
    if (p.ideal_customer_profile) lines.push(`- ICP: ${p.ideal_customer_profile}`);
    if (p.pain_points?.length) lines.push(`- Customer pain points addressed: ${p.pain_points.join(', ')}`);
    if (p.differentiators?.length) lines.push(`- Differentiators: ${p.differentiators.join(', ')}`);
  }

  const c = business.commercial || {};
  if (Object.keys(c).length) {
    lines.push('\nCommercial rules (do not deviate from these without human approval):');
    if (c.pricing_rules) lines.push(`- Pricing rules: ${c.pricing_rules}`);
    if (c.discount_rules) lines.push(`- Discount rules: ${c.discount_rules}`);
    if (c.negotiation_boundaries) lines.push(`- Negotiation boundaries: ${c.negotiation_boundaries}`);
    if (c.payment_terms) lines.push(`- Payment terms: ${c.payment_terms}`);
    if (c.approval_requirements) lines.push(`- Approval requirements: ${c.approval_requirements}`);
  }

  const bv = business.brand_voice || {};
  if (Object.keys(bv).length) {
    lines.push('\nBrand voice:');
    if (bv.tone?.length) lines.push(`- Tone: ${bv.tone.join(', ')}`);
    if (bv.style?.length) lines.push(`- Style: ${bv.style.join(', ')}`);
    if (bv.behaviour?.length) lines.push(`- Behaviour rules: ${bv.behaviour.join(', ')}`);
    if (bv.words_to_use) lines.push(`- Preferred language: ${bv.words_to_use}`);
    if (bv.words_to_avoid) lines.push(`- Avoid: ${bv.words_to_avoid}`);
  }

  return lines.join('\n');
}

function formatKnowledge(documents: RetrievedDocument[]): string {
  if (documents.length === 0) {
    return 'No matching knowledge base documents were found for this context. Treat unanswered questions as "unknown" rather than guessing.';
  }
  return documents
    .map((doc) => `### [${doc.category}] ${doc.title} (id: ${doc.id}, status: ${doc.status})\n${doc.content}`)
    .join('\n\n');
}

/**
 * Builds (and caches) the full system prompt for a given business + set of
 * retrieved documents. This is the expensive, mostly-static part of every AI
 * call, so it is cached by lib/ai/cache.ts and re-sent as a byte-identical
 * prefix across calls within the same meeting — see lib/ai/cache.ts for why
 * that matters for both our own cost and provider-side prompt caching.
 */
export async function buildBusinessSystemPrompt(
  business: Business,
  documents: RetrievedDocument[]
): Promise<string> {
  const docIds = documents.map((d) => d.id).sort().join(',');
  const cacheKey = `system-prompt:${business.id}:${hashContent(docIds + business.updated_at)}`;

  return withCache(cacheKey, () => {
    return [
      SYSTEM_RULES,
      '\n---\nACTIVE BUSINESS PROFILE\n---',
      formatBusinessProfile(business),
      '\n---\nRELEVANT BUSINESS KNOWLEDGE\n---',
      formatKnowledge(documents),
    ].join('\n');
  });
}

function formatMeetingContext(meeting: Meeting): string {
  const lines: string[] = [];
  lines.push(`Meeting type(s): ${meeting.meeting_types?.join(', ') || 'Not specified'}`);
  if (meeting.company_name) lines.push(`Other party (company): ${meeting.company_name}`);
  if (meeting.objective) lines.push(`Objective for this meeting: ${meeting.objective}`);
  if (meeting.pre_context) lines.push(`Prior context / relationship history: ${meeting.pre_context}`);
  if (meeting.current_stage) lines.push(`Last detected stage: ${meeting.current_stage}`);
  return lines.join('\n');
}

function formatTranscript(entries: TranscriptEntry[]): string {
  if (entries.length === 0) return '(No transcript yet.)';
  return entries
    .map((e) => `${e.speaker === 'user' ? 'YOU' : e.speaker === 'other' ? 'OTHER PARTY' : 'SPEAKER'}: ${e.content}`)
    .join('\n');
}

/** Prompt for live stage detection — Section 17. */
export function buildStageDetectionPrompt(meeting: Meeting, recentTranscript: TranscriptEntry[]): string {
  return `MEETING CONTEXT\n${formatMeetingContext(meeting)}\n\nRECENT TRANSCRIPT\n${formatTranscript(recentTranscript)}\n\nTASK\nBased on the meeting type and the recent transcript, determine the current conversation stage. Choose a short stage label appropriate to this meeting type (for a sales-style meeting, stages like Opening, Rapport, Discovery, Problem Identification, Qualification, Solution Discussion, Objection Handling, Pricing, Negotiation, Commitment, Next Steps; for other meeting types use an equivalent appropriate stage name). Stages can move backward as well as forward — judge only from the transcript given.\n\nRespond ONLY with JSON in this exact shape:\n{"stage": "string", "reasoning": "one short sentence"}`;
}

/** Prompt for the live script/co-pilot panel — Section 18, 21, 22. */
export function buildLiveSuggestionPrompt(meeting: Meeting, recentTranscript: TranscriptEntry[]): string {
  return `MEETING CONTEXT\n${formatMeetingContext(meeting)}\n\nRECENT TRANSCRIPT\n${formatTranscript(recentTranscript)}\n\nTASK\nAct as the live co-pilot for the human operator in this conversation, right now. Using ONLY the active business profile and knowledge above, and the transcript, produce:\n\n1. "script" — what the operator should say or ask next, and briefly why it matters, grounded in the business knowledge above.\n2. "alerts" — an array (0 to 3 items) of short, discreet alerts for things like a detected objection, a question that requires business knowledge, a detected commitment, or an unresolved question. Omit if nothing notable happened in the recent transcript.\n\nEvery item must include a confidence field: "confirmed", "inferred", or "unknown". Do not fabricate pricing, features or policy — if the knowledge base does not cover something, say it is unknown and suggest the operator answer directly or note it as a follow-up.\n\nRespond ONLY with JSON in this exact shape:\n{\n  "script": {"headline": "string", "content": "string", "reasoning": "string", "confidence": "confirmed|inferred|unknown"},\n  "alerts": [{"headline": "string", "content": "string", "confidence": "confirmed|inferred|unknown"}]\n}`;
}

/** Prompt for post-meeting summary + actions + follow-up draft — Section 58. */
export function buildSummaryPrompt(meeting: Meeting, fullTranscript: TranscriptEntry[]): string {
  return `MEETING CONTEXT\n${formatMeetingContext(meeting)}\n\nFULL TRANSCRIPT\n${formatTranscript(fullTranscript)}\n\nTASK\nProduce a structured post-meeting record for the operator, grounded strictly in the transcript and the active business knowledge above. Do not invent anything that was not said or does not appear in the business knowledge.\n\nRespond ONLY with JSON in this exact shape:\n{\n  "summary": "2-4 sentence plain-language summary of the meeting",\n  "key_points": ["string", ...],\n  "decisions": ["string", ...],\n  "actions": ["string — what the operator committed to do", ...],\n  "next_steps": ["string", ...],\n  "follow_up_draft": "a complete, ready-to-edit follow-up email in the business's configured brand voice, addressed to the other party, referencing what was actually discussed"\n}`;
}
