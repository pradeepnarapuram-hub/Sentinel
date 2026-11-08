import React from 'react';

export type HighlightCategory =
  | 'compliance_verified'
  | 'compliance_risk'
  | 'clinical_emergency'
  | 'patient_distress'
  | 'patient_relief'
  | 'ai_moment';

export interface HighlightMarker {
  phrase: string;
  category: HighlightCategory;
  label: string;
  explanation: string;
  severity?: 'high' | 'medium' | 'info';
}

// Built-in healthcare contact center compliance & critical sentiment knowledge base
export const KNOWN_HIGHLIGHT_MARKERS: HighlightMarker[] = [
  // HIPAA & Patient Identity Verification (Compliance Passed)
  {
    phrase: 'full legal name and date of birth',
    category: 'compliance_verified',
    label: 'HIPAA 2-Factor ID Check',
    explanation: 'Standard protocol: Agent requests 2 distinct identifiers before accessing clinical records.',
    severity: 'info',
  },
  {
    phrase: 'date of birth to verify',
    category: 'compliance_verified',
    label: 'HIPAA Verification Prompt',
    explanation: 'Mandatory identity verification phrase.',
    severity: 'info',
  },
  {
    phrase: 'first line of your mailing address',
    category: 'compliance_verified',
    label: 'Secondary Identifier Check',
    explanation: 'Secondary confirmation to prevent misdirected health disclosures.',
    severity: 'info',
  },
  {
    phrase: 'confirm your privacy',
    category: 'compliance_verified',
    label: 'Privacy Confirmation',
    explanation: 'Consent and privacy safeguard acknowledgment.',
    severity: 'info',
  },
  {
    phrase: 'para confirmar su privacidad',
    category: 'compliance_verified',
    label: 'Bilingual Privacy Check',
    explanation: 'Spanish language privacy and identity verification standard.',
    severity: 'info',
  },
  {
    phrase: 'su fecha de nacimiento',
    category: 'compliance_verified',
    label: 'DOB Verification (ES)',
    explanation: 'Patient date of birth confirmation in Spanish.',
    severity: 'info',
  },
  {
    phrase: 'verify your full name, date of birth, and home address',
    category: 'compliance_verified',
    label: '3-Point Verification',
    explanation: 'Comprehensive clinical scheduling identification protocol.',
    severity: 'info',
  },
  {
    phrase: 'may i have your name and date of birth',
    category: 'compliance_verified',
    label: 'Identity Inquiry',
    explanation: 'Identification step initiated at call onset.',
    severity: 'info',
  },
  {
    phrase: 'as a patient access representative, i am not licensed to advise',
    category: 'compliance_verified',
    label: 'Scope of Practice Disclaimer',
    explanation: 'Crucial clinical compliance: Non-clinical agent appropriately disclaims medication adjustment advice.',
    severity: 'info',
  },

  // Compliance Risks & Billing Grievances
  {
    phrase: 'who am i speaking with',
    category: 'compliance_risk',
    label: 'Inadequate Verification Greeting',
    explanation: 'Failure to request standard 2-identifier verification before accessing records.',
    severity: 'high',
  },
  {
    phrase: 'looking at your file, yes, the billing code',
    category: 'compliance_risk',
    label: 'Premature PHI Disclosure',
    explanation: 'Critical Risk: Disclosing account balances and CPT billing codes without prior DOB or address authentication.',
    severity: 'high',
  },
  {
    phrase: 'out-of-network coinsurance',
    category: 'compliance_risk',
    label: 'Network Coverage Dispute',
    explanation: 'Subject to No Surprises Act compliance review for unexpected facility provider billing.',
    severity: 'high',
  },
  {
    phrase: 'hospital policy states it is the patients responsibility',
    category: 'compliance_risk',
    label: 'Defensive Grievance Language',
    explanation: 'Risk of escalation; fails patient advocacy and de-escalation standards.',
    severity: 'medium',
  },
  {
    phrase: 'no surprises act',
    category: 'compliance_risk',
    label: 'Federal Billing Rights Invocation',
    explanation: 'Patient invoked the federal No Surprises Act; requires formal dispute log and ombudsman review.',
    severity: 'high',
  },

  // Critical Clinical Emergency / Triage Risk Markers
  {
    phrase: 'burning and heaviness in my chest',
    category: 'clinical_emergency',
    label: 'Cardiac Emergency Symptom',
    explanation: 'Acute post-procedure chest symptoms requiring immediate triage hand-off.',
    severity: 'high',
  },
  {
    phrase: 'radiates down my left shoulder',
    category: 'clinical_emergency',
    label: 'Radiating Pain Alert',
    explanation: 'Classic ischemic cardiac marker requiring emergency protocol.',
    severity: 'high',
  },
  {
    phrase: 'shortness of breath, dizziness, or cold sweating',
    category: 'clinical_emergency',
    label: 'Cardiac Risk Screening',
    explanation: 'Agent screening for critical associated symptoms.',
    severity: 'high',
  },
  {
    phrase: 'dial 911 immediately',
    category: 'clinical_emergency',
    label: 'Emergency 911 Directive',
    explanation: 'Appropriate emergency guidance provided to symptomatic caller.',
    severity: 'high',
  },
  {
    phrase: 'clinical triage protocol',
    category: 'clinical_emergency',
    label: 'RN Warm-Transfer Protocol',
    explanation: 'Initiation of emergency registered nurse transfer.',
    severity: 'high',
  },
  {
    phrase: 'inr result came in at 3.4',
    category: 'clinical_emergency',
    label: 'Elevated Lab Critical Value',
    explanation: 'Warfarin anticoagulation INR above therapeutic target (2.0-3.0); elevated bleed risk.',
    severity: 'high',
  },
  {
    phrase: 'should i skip tonight’s dose',
    category: 'clinical_emergency',
    label: 'Medication Safety Hazard',
    explanation: 'Patient inquiring about self-adjusting high-risk anticoagulant medication.',
    severity: 'high',
  },
  {
    phrase: 'urgent clinical callback flag',
    category: 'clinical_emergency',
    label: 'Stat Physician Escalation',
    explanation: 'Stat notification to clinic triage nurse for same-morning physician orders.',
    severity: 'high',
  },

  // Patient Distress / Emotional Volatility Markers
  {
    phrase: 'getting quite nervous about running out',
    category: 'patient_distress',
    label: 'Medication Delay Anxiety',
    explanation: 'Patient distress regarding lapse of essential maintenance therapy.',
    severity: 'medium',
  },
  {
    phrase: 'this is outrageous',
    category: 'patient_distress',
    label: 'Patient Grievance / Outrage',
    explanation: 'Severe dissatisfaction regarding unexpected surprise medical bill.',
    severity: 'high',
  },
  {
    phrase: 'i live on a fixed pension, i can\'t pay this',
    category: 'patient_distress',
    label: 'Financial Hardship Distress',
    explanation: 'Inability to pay medical balance; triggers charity care or hardship application protocol.',
    severity: 'high',
  },
  {
    phrase: 'getting nervous',
    category: 'patient_distress',
    label: 'Anxiety Marker',
    explanation: 'Caller experiencing emotional distress.',
    severity: 'medium',
  },

  // Positive Relief / Reassurance Markers
  {
    phrase: 'please don\'t worry—let me look directly',
    category: 'patient_relief',
    label: 'Empathy & De-escalation',
    explanation: 'Exemplary reassuring phrase validating patient anxiety.',
    severity: 'info',
  },
  {
    phrase: 'thank goodness. thank you',
    category: 'patient_relief',
    label: 'Patient Relief',
    explanation: 'Emotional transition from distress to relief.',
    severity: 'info',
  },
  {
    phrase: 'that is such a relief',
    category: 'patient_relief',
    label: 'Reassurance Confirmed',
    explanation: 'Successful resolution acknowledged by patient.',
    severity: 'info',
  },
  {
    phrase: 'que bendicion',
    category: 'patient_relief',
    label: 'Bilingual Relief (Blessing)',
    explanation: 'Patient expresses immense emotional relief upon prior-authorization approval.',
    severity: 'info',
  },
  {
    phrase: 'super quick and easy. thanks marcus',
    category: 'patient_relief',
    label: 'High Patient Satisfaction',
    explanation: 'Seamless scheduling experience praised by caller.',
    severity: 'info',
  },
  {
    phrase: 'muchisimas gracias por avisarme',
    category: 'patient_relief',
    label: 'Patient Gratitude',
    explanation: 'Patient relief regarding zero out-of-pocket cost.',
    severity: 'info',
  },
];

// Helper styles for categories
export const CATEGORY_CONFIG: Record<
  HighlightCategory,
  {
    name: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    badgeBg: string;
    badgeText: string;
    icon: string;
  }
> = {
  compliance_verified: {
    name: 'HIPAA & Compliance Verified',
    bgClass: 'bg-teal-100/90 text-teal-950 font-medium',
    textClass: 'text-teal-950',
    borderClass: 'border-b-2 border-teal-500',
    badgeBg: 'bg-teal-700',
    badgeText: 'text-white',
    icon: '🛡️',
  },
  compliance_risk: {
    name: 'Compliance / HIPAA Risk',
    bgClass: 'bg-rose-100/95 text-rose-950 font-medium',
    textClass: 'text-rose-950',
    borderClass: 'border-b-2 border-rose-600',
    badgeBg: 'bg-rose-700',
    badgeText: 'text-white',
    icon: '⚠️',
  },
  clinical_emergency: {
    name: 'Clinical Escalation / Safety',
    bgClass: 'bg-red-100/95 text-red-950 font-medium',
    textClass: 'text-red-950',
    borderClass: 'border-b-2 border-red-600',
    badgeBg: 'bg-red-700',
    badgeText: 'text-white',
    icon: '🚨',
  },
  patient_distress: {
    name: 'Patient Anxiety / Distress',
    bgClass: 'bg-amber-100/95 text-amber-950 font-medium',
    textClass: 'text-amber-950',
    borderClass: 'border-b-2 border-amber-600',
    badgeBg: 'bg-amber-700',
    badgeText: 'text-white',
    icon: '⚡',
  },
  patient_relief: {
    name: 'Reassurance / Relief',
    bgClass: 'bg-sky-100/90 text-sky-950 font-medium',
    textClass: 'text-sky-950',
    borderClass: 'border-b-2 border-sky-500',
    badgeBg: 'bg-sky-700',
    badgeText: 'text-white',
    icon: '✨',
  },
  ai_moment: {
    name: 'AI-Identified Critical Moment',
    bgClass: 'bg-indigo-100/90 text-indigo-950 font-medium',
    textClass: 'text-indigo-950',
    borderClass: 'border-b-2 border-indigo-500',
    badgeBg: 'bg-indigo-700',
    badgeText: 'text-white',
    icon: '🤖',
  },
};

export interface MatchSpan {
  start: number;
  end: number;
  marker: HighlightMarker;
}

/**
 * Finds all matches of highlight markers in a given text string.
 * Resolves overlapping spans by keeping the longest match.
 */
export function findHighlightMatches(
  text: string,
  extraMarkers: HighlightMarker[] = [],
  activeFilter: HighlightCategory | 'all' = 'all'
): MatchSpan[] {
  const allMarkers = [...extraMarkers, ...KNOWN_HIGHLIGHT_MARKERS];
  const lowerText = text.toLowerCase();
  const rawSpans: MatchSpan[] = [];

  for (const marker of allMarkers) {
    if (activeFilter !== 'all' && marker.category !== activeFilter) {
      continue;
    }

    const phraseLower = marker.phrase.toLowerCase().trim();
    if (!phraseLower) continue;

    let searchIndex = 0;
    while ((searchIndex = lowerText.indexOf(phraseLower, searchIndex)) !== -1) {
      rawSpans.push({
        start: searchIndex,
        end: searchIndex + phraseLower.length,
        marker,
      });
      searchIndex += phraseLower.length;
    }
  }

  // Sort by start position asc, then by length desc
  rawSpans.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

  // Filter overlapping spans
  const nonOverlapping: MatchSpan[] = [];
  let currentEnd = -1;

  for (const span of rawSpans) {
    if (span.start >= currentEnd) {
      nonOverlapping.push(span);
      currentEnd = span.end;
    }
  }

  return nonOverlapping;
}
